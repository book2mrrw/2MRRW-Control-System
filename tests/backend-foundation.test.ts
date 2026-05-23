import assert from "node:assert/strict";
import {
  ADMIN_SESSION_MAX_AGE_MS,
  ADMIN_SESSION_COOKIE,
  isAdminSessionExpired,
  parseAdminSessionStartedAt
} from "@/server/auth/adminSession";
import {
  createAudioVisual,
  listAudioVisuals,
  parseYouTubeAudioVisualUrl,
  publishAudioVisual
} from "@/server/audio-visuals/audioVisualService";
import { getAccountState, saveLibraryItem } from "@/server/account/accountStateService";
import { getStreamingAnalyticsSummary, recordStreamAnalytics } from "@/server/analytics/analyticsService";
import {
  circleEventLabels,
  createCircleEvent,
  listCircleEvents,
  triggerCircleHighlightedComment,
  triggerCircleLive,
  triggerCircleReacted,
  triggerCircleReplied
} from "@/server/community/circleEventService";
import { resolveEntitlements } from "@/server/entitlements/entitlementResolver";
import { getMediaObjectReadiness } from "@/server/media/mediaAssetService";
import { createSignedMediaUrl } from "@/server/media/signedUrlService";
import { professionalAudioQualityTarget } from "@/services/media/audioSupport";
import { resolveContentDestinations, storefrontSectionForReleaseType } from "@/services/sync/contentRouting";
import { computeReleaseLiveStatus } from "@/lib/catalog/releaseLiveStatus";
import { buildReleasePrimaryAsset, resolveDisplayPrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { localScheduleToUtcIso, scheduleIsInFuture, utcIsoToScheduleParts } from "@/lib/scheduling/releaseScheduleTime";
import { buildSchedulePayload } from "@/server/releases/scheduledPublishService";
import { resolveMediaSyncRoute, sectionForAssetRole } from "@/services/sync/mediaSyncContract";
import {
  buildMediaUploadPath,
  confirmMediaUpload,
  createMediaUploadIntent,
  getMediaUploadPolicy,
  listConfirmedMediaAssets,
  validateMediaUploadIntent
} from "@/server/media/uploadIntentService";
import {
  getPlaybackSummary,
  markRecentlyPlayed,
  replaceQueue,
  updatePlaybackProgress
} from "@/server/playback/playbackService";
import { getRadioFeed } from "@/server/radio/radioFeedService";
import {
  attachTrackContribution,
  createReleaseDraft,
  getReadinessSummary,
  getReleaseDraft,
  listReleaseDrafts,
  updateReleaseMetadata,
  updateTrackInformation,
  validateReleaseStructure,
  validateTrackSplits
} from "@/server/release-management/releaseManagementService";
import { validateDraftCommerceFields } from "@/server/commerce/releaseCommerceService";
import {
  validateCollectorCardPriceInCents,
  validateVaultCategory,
  validateVaultItemPriceInCents
} from "@/server/commerce/pricingValidation";
import { resolveAudioQualityBadge } from "@/lib/media/audioQualityBadge";
import { mapVaultItemToStorefrontContent } from "@/server/sync/frontendCatalogSyncService";
import { validateReleasePriceInCents } from "@/server/commerce/pricingValidation";
import { ingestFrontendReleaseEcosystem } from "@/server/release-management/frontendReleaseIngestionService";
import {
  createOrSelectContributor,
  getPreviousReleaseSettingsSuggestion,
  listContributorProfiles,
  listMetadataSuggestions,
  searchContributorProfiles,
  upsertContributorProfile
} from "@/server/release-management/contributorDirectoryService";
import { buildFrontendReleaseMetadataContract } from "@/server/release-management/frontendMetadataContractService";
import { searchControlSystem } from "@/server/release-management/globalSearchService";
import {
  buildAdaptiveWorkflow,
  buildFanPreviewTargets,
  buildGracefulDegradationPlan,
  buildComponentGovernanceContracts,
  buildDesignGovernanceContract,
  buildMediaIntelligenceProfile,
  buildMediaStorageStrategy,
  buildProductionHealthStatus,
  buildRollbackPlan,
  evaluateRateLimit,
  getEnvironmentSafety,
  getContentGovernanceRules,
  getPlatformBoundaries,
  indexSearchDocument,
  recordMediaRightsAttribution,
  recordObservabilityEvent,
  searchIndexedDocuments,
  setFeatureFlag,
  isFeatureEnabled,
  validateContentGovernance,
  validateReleaseStateGovernance,
  buildSmartProgress,
  restoreDraftSession,
  saveDraftSessionSnapshot
} from "@/server/release-management/releaseLifecycleService";
import { contributorRoleGroups, genreTaxonomy, lyricLanguages } from "@/server/release-management/taxonomies";
import {
  getLatestReleases,
  getReleaseBySlug,
  getUserLibrary,
  trackPlaybackEvent
} from "@/server/releases/releaseReadService";
import { createRelease, publishRelease } from "@/server/releases/releaseWriteService";
import { getSupabaseServerKey } from "@/server/supabase/client";
import { listInbox } from "@/server/notifications/notificationService";
import { listActiveSignals, updateSignalState } from "@/server/signal/signalDeliveryService";
import { handleStripeWebhook } from "@/server/stripe/stripeWebhookService";
import { getVaultContentMedia, listVaultContent } from "@/server/vault/vaultService";

async function testAccountState() {
  const state = getAccountState("user_demo");
  assert.equal(state.profile?.id, "user_demo");
  assert.deepEqual(state.permissions.canStreamTrackIds, []);
  assert.deepEqual(state.library.purchasedProductIds, []);
}

function testEntitlementResolution() {
  const grants = resolveEntitlements("admin_demo");
  assert.deepEqual(grants, []);
}

async function testWebhookIdempotency() {
  const event = {
    id: "evt_test_idempotent",
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: {
          userId: "user_demo",
          productId: "prod_media_upload"
        }
      }
    }
  };

  const request = () =>
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify(event)
    });

  const first = await handleStripeWebhook(request());
  const second = await handleStripeWebhook(request());
  assert.equal(first.processed, true);
  assert.deepEqual(first.grantedProductIds, []);
  assert.equal(second.processed, false);
  assert.deepEqual(second.grantedProductIds, []);
}

async function testSignedMediaAccess() {
  const signed = await createSignedMediaUrl("user_demo", "asset_audio_signal");
  assert.equal(signed.ok, false);

  const publicPreview = await createSignedMediaUrl(null, "asset_preview_signal", { publicKinds: ["preview", "artwork", "loop"] });
  assert.equal(publicPreview.ok, false);

  const anonymousFullAudio = await createSignedMediaUrl(null, "asset_audio_signal", { publicKinds: ["preview", "artwork", "loop"] });
  assert.equal(anonymousFullAudio.ok, false);
  if (!anonymousFullAudio.ok) {
    assert.equal(anonymousFullAudio.status, 404);
  }
}

function testVaultPublicPreviewContract() {
  const anonymousContent = listVaultContent("anon_contract_user");
  assert.deepEqual(anonymousContent, []);
  assert.equal(getVaultContentMedia("anon_contract_user", "session-notes"), null);

  const entitledContent = listVaultContent("admin_demo");
  assert.deepEqual(entitledContent, []);
  assert.equal(getVaultContentMedia("admin_demo", "session-notes"), null);
}

function testSignalSuppression() {
  assert.deepEqual(listActiveSignals("signal_test_user"), []);
  updateSignalState("signal_test_user", "sig_release_window", "dismissed");
  assert.equal(listActiveSignals("signal_test_user").some((signal) => signal.id === "sig_release_window"), false);
}

function testRadioIndependence() {
  updateSignalState("radio_test_user", "sig_release_window", "dismissed");
  const feed = getRadioFeed("main");
  assert.equal(feed, null);
}

function testPlaybackPersistence() {
  updatePlaybackProgress("playback_test_user", {
    trackId: "trk_signal",
    positionSeconds: 42,
    sessionId: "session_test"
  });
  const summary = getPlaybackSummary("playback_test_user");
  assert.equal(summary.progressByTrackId.trk_signal.positionSeconds, 42);
  assert.ok(summary.activeSessionIds.includes("session_test"));
}

function testPlaybackQueueAndRecentlyPlayed() {
  const queue = replaceQueue("queue_test_user", ["trk_signal", "trk_radio"], { shuffle: true });
  assert.deepEqual(queue, ["trk_signal", "trk_radio"].sort((a, b) => a.localeCompare(b)).reverse());
  const recent = markRecentlyPlayed("queue_test_user", "trk_radio");
  assert.deepEqual(recent, ["trk_radio"]);
}

function testSupabaseServerKeyFallback() {
  assert.equal(getSupabaseServerKey({ SUPABASE_SECRET_KEY: "fallback-test-key" }), "fallback-test-key");
  assert.equal(
    getSupabaseServerKey({
      SUPABASE_SERVICE_ROLE_KEY: "primary-test-key",
      SUPABASE_SECRET_KEY: "fallback-test-key"
    }),
    "primary-test-key"
  );
}

function testYouTubeAudioVisualUrlParser() {
  assert.deepEqual(parseYouTubeAudioVisualUrl("https://www.youtube.com/watch?v=tv_aS-hJ880"), {
    youtubeUrl: "https://www.youtube.com/watch?v=tv_aS-hJ880",
    youtubeVideoId: "tv_aS-hJ880",
    embedUrl: "https://www.youtube.com/embed/tv_aS-hJ880",
    thumbnailUrl: "https://img.youtube.com/vi/tv_aS-hJ880/hqdefault.jpg"
  });
  assert.equal(parseYouTubeAudioVisualUrl("https://youtu.be/kPITYHMVeXM?si=test").youtubeVideoId, "kPITYHMVeXM");
  assert.equal(parseYouTubeAudioVisualUrl("https://www.youtube.com/embed/jsrA1SL3_GU").embedUrl, "https://www.youtube.com/embed/jsrA1SL3_GU");
  assert.equal(parseYouTubeAudioVisualUrl("https://www.youtube.com/shorts/tv_aS-hJ880").youtubeVideoId, "tv_aS-hJ880");
  assert.equal(parseYouTubeAudioVisualUrl('<iframe src="https://www.youtube.com/embed/kPITYHMVeXM"></iframe>').youtubeVideoId, "kPITYHMVeXM");
  assert.throws(() => parseYouTubeAudioVisualUrl("https://example.com/watch?v=tv_aS-hJ880"), /valid YouTube video ID/);
}

async function testAudioVisualPublishedFiltering() {
  const draft = await createAudioVisual({
    title: "Draft Visual",
    youtubeUrl: "https://www.youtube.com/watch?v=tv_aS-hJ880",
    status: "draft"
  });
  const published = await createAudioVisual({
    title: "Published Visual",
    youtubeUrl: "https://youtu.be/kPITYHMVeXM",
    status: "published",
    metadata: { description: "Official Music Video" }
  });

  const publicVisuals = await listAudioVisuals({ publicOnly: true });
  assert.equal(publicVisuals.some((visual) => visual.id === draft.id), false);
  assert.ok(publicVisuals.some((visual) => visual.id === published.id));
  assert.equal(publicVisuals.find((visual) => visual.id === published.id)?.embedUrl, "https://www.youtube.com/embed/kPITYHMVeXM");

  const nowPublished = await publishAudioVisual(draft.id);
  assert.equal(nowPublished?.status, "published");
  assert.ok((await listAudioVisuals({ publicOnly: true })).some((visual) => visual.id === draft.id));
}

function testReleaseTypeValidation() {
  assert.throws(() => createReleaseDraft({ releaseType: "single", title: "Invalid Single", trackCount: 2 }), /exactly 1/);
  assert.throws(() => createReleaseDraft({ releaseType: "ep", title: "Invalid EP", trackCount: 7 }), /up to 6/);
  const single = createReleaseDraft({ releaseType: "single", title: "Validated Single", trackCount: 1 });
  assert.equal(single.tracks.length, 1);
  const ep = createReleaseDraft({ releaseType: "ep", title: "Empty EP" });
  const album = createReleaseDraft({ releaseType: "album", title: "Empty Album" });
  const deluxe = createReleaseDraft({ releaseType: "deluxe", title: "Validated Deluxe" });
  const remixPack = createReleaseDraft({ releaseType: "remix_pack", title: "Validated Remix Pack" });
  assert.equal(ep.tracks.length, 0);
  assert.equal(album.tracks.length, 0);
  assert.equal(deluxe.tracks.length, 0);
  assert.equal(remixPack.tracks.length, 0);
}

function testContributorSplitValidation() {
  const release = createReleaseDraft({ releaseType: "single", title: "Split Test", trackCount: 1 });
  const track = release.tracks[0];
  assert.ok(track);
  attachTrackContribution(release.id, track.id, {
    contributorName: "Writer One",
    contributionType: "both",
    isPublisher: false,
    ownershipSplit: 75
  });
  assert.equal(validateTrackSplits(track.id).passed, false);
  attachTrackContribution(release.id, track.id, {
    contributorName: "Writer Two",
    contributionType: "lyrics",
    isPublisher: false,
    ownershipSplit: 25
  });
  assert.equal(validateTrackSplits(track.id).passed, true);
}

function testContributorDirectoryMemory() {
  const frequent = upsertContributorProfile({
    displayName: "Frequent Producer",
    kind: "producer",
    roles: ["producer"]
  });
  upsertContributorProfile({
    displayName: "Frequent Producer",
    kind: "producer",
    roles: ["mixing_engineer"]
  });
  const selected = createOrSelectContributor({ displayName: "Frequent Producer", role: "producer" });
  assert.equal(selected.id, frequent.id);
  assert.ok(selected.usageCount >= 3);
  assert.equal(searchContributorProfiles("frequent")[0]?.displayName, "Frequent Producer");

  updateReleaseMetadata(createReleaseDraft({ releaseType: "single", title: "Memory Test", trackCount: 1 }).id, {
    recordLabel: "2MRRW",
    copyrightOwner: "2MRRW",
    publisherName: "2MRRW Publishing",
    recordingLocation: "2MRRW Studio"
  });
  assert.equal(listMetadataSuggestions("label")[0]?.value, "2MRRW");
  assert.equal(getPreviousReleaseSettingsSuggestion()?.prompt, "Use previous release settings?");
}

function testTaxonomyCompleteness() {
  assert.ok(lyricLanguages.some((language) => language.label === "Mandarin"));
  assert.ok(lyricLanguages.some((language) => language.label === "Hindi"));
  assert.ok(genreTaxonomy.some((genre) => genre.label === "Hip-Hop/Rap" && genre.subgenres.some((subgenre) => subgenre.label === "Drill")));
  assert.ok(genreTaxonomy.some((genre) => genre.label === "Electronic" && genre.subgenres.some((subgenre) => subgenre.label === "Synthwave")));
  assert.ok(contributorRoleGroups.some((group) => group.label === "Engineering" && group.roles.some((role) => role.label === "Mastering Engineer")));
  assert.ok(contributorRoleGroups.some((group) => group.label === "Creative" && group.roles.some((role) => role.label === "Creative Director")));
}

function testGlobalSearchAndFrontendMetadataContract() {
  const release = createReleaseDraft({ releaseType: "single", title: "Searchable Release", trackCount: 1 });
  const track = release.tracks[0];
  assert.ok(track);
  updateTrackInformation(release.id, track.id, { title: "Searchable Track", producerNames: ["Search Producer"] });
  attachTrackContribution(release.id, track.id, {
    contributorName: "Search Writer",
    contributionType: "songwriter",
    isPublisher: false,
    ownershipSplit: 100
  });
  attachTrackContribution(release.id, track.id, {
    contributorName: "Search Mastering",
    contributionType: "mastering_engineer",
    isPublisher: false,
    ownershipSplit: 0
  });

  assert.ok(searchControlSystem("Searchable").some((result) => result.type === "release"));
  assert.ok(searchControlSystem("Search Producer").some((result) => result.type === "contributor"));

  const contract = buildFrontendReleaseMetadataContract(release);
  assert.equal(contract.title, "Searchable Release");
  assert.ok(contract.tracks[0]?.producers.includes("Search Producer"));
  assert.ok(contract.tracks[0]?.songwriters.includes("Search Writer"));
  assert.ok(contract.tracks[0]?.fullCredits.engineering.some((credit) => credit.name === "Search Mastering"));
}

function testReleaseReadinessGates() {
  const release = createReleaseDraft({ releaseType: "single", title: "Readiness Test", trackCount: 1 });
  const track = release.tracks[0];
  assert.ok(track);
  assert.equal(getReadinessSummary(release.id).ready, false);
  updateReleaseMetadata(release.id, {
    coverArtState: "uploaded",
    originalReleaseDate: "2026-05-22",
    producer: "2MRRW",
    recordLabel: "2MRRW",
    mixingEngineer: "Mix Engineer"
  });
  updateTrackInformation(release.id, track.id, {
    title: "Ready Track",
    audioState: "uploaded",
    producerNames: ["Producer"],
    credits: "Writer"
  });
  assert.equal(getReadinessSummary(release.id).ready, true);

  const deluxe = createReleaseDraft({ releaseType: "deluxe", title: "Deluxe Gate", trackCount: 6 });
  assert.equal(getReadinessSummary(deluxe.id).checks.find((check) => check.key === "track_count")?.passed, false);
}

function testStorefrontSectionRouting() {
  assert.equal(storefrontSectionForReleaseType("single").section, "singles");
  assert.equal(storefrontSectionForReleaseType("ep").tabLabel, "Albums & EPs");
  assert.equal(storefrontSectionForReleaseType("deluxe").badge, "Deluxe");
}

function testCreatorSessionContinuityAndFlowIntelligence() {
  const release = createReleaseDraft({ releaseType: "single", title: "Continuity Test", trackCount: 1 });
  const snapshot = saveDraftSessionSnapshot({
    releaseId: release.id,
    reason: "mobile_background",
    step: "uploads",
    activeTab: "artwork",
    openSections: ["cover-art"],
    scrollPosition: 420,
    metadata: { title: release.title },
    uploads: [{ uploadId: "upload_artwork", state: "retry_available", fileName: "cover.jpg" }],
    cloudSynced: false
  });
  assert.equal(snapshot.recoveryMessage, "Restoring Draft");
  const restored = restoreDraftSession({ releaseId: release.id });
  assert.equal(restored.session.currentStep, "uploads");
  assert.equal(restored.session.activeTab, "artwork");
  assert.deepEqual(restored.session.pendingUploadIds, ["upload_artwork"]);

  assert.equal(buildAdaptiveWorkflow({ releaseType: "single", lyricsEnabled: false }).find((rule) => rule.id === "track_count")?.visible, false);
  assert.ok(buildFanPreviewTargets({ releaseId: release.id, slug: release.slug }).some((target) => target.surface === "mobile_frontend"));
  assert.equal(buildMediaIntelligenceProfile({ assetId: "asset_test", width: 1920, height: 1080, sizeBytes: 80 * 1024 * 1024 }).responsiveStatus, "needs_mobile_crop");
  assert.ok(buildSmartProgress(release.contentReadiness).some((item) => item.label === "Metadata Complete"));
}

function testRelationalLifecycleContracts() {
  const release = createReleaseDraft({ releaseType: "single", title: "Lifecycle Test", trackCount: 1 });
  const readiness = getReadinessSummary(release.id);
  assert.ok(readiness.creatorConfidence.some((item) => item.label === "Audio Synced"));
  assert.ok(readiness.conflicts.some((warning) => warning.key.startsWith("readiness_")));
}

function testProductionResilienceContracts() {
  assert.equal(getEnvironmentSafety({ NODE_ENV: "production" }).requiresDryRun, true);
  setFeatureFlag({ key: "publish-engine-v2", enabled: true, environment: "staging", description: "Safe publish testing" });
  assert.equal(isFeatureEnabled("publish-engine-v2", "staging"), true);

  recordObservabilityEvent({ area: "sync", severity: "error", message: "Frontend sync retry queued", releaseId: "rel_test" });
  assert.equal(buildProductionHealthStatus("staging").ok, false);

  const first = evaluateRateLimit({ key: "upload:user", limit: 1, windowMs: 1000 });
  const second = evaluateRateLimit({ key: "upload:user", limit: 1, windowMs: 1000 });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);

  const strategy = buildMediaStorageStrategy({
    assetId: "asset_strategy",
    storagePlan: {
      bucket: "2mrrw-media",
      canonicalPath: "masters/release/track/audio.wav",
      originalFileName: "Audio.wav",
      canonicalFileName: "audio.wav",
      ownerFolder: "masters/release/track",
      variants: [{ label: "desktop", path: "masters/release/track/audio.desktop.mp3" }]
    }
  });
  assert.equal(strategy.cdnCacheTag, "asset:asset_strategy");

  const rollback = buildRollbackPlan({ releaseId: "rel_test", reason: "failed_frontend_sync", restorePointId: "restore_1" });
  assert.ok(rollback.actions.some((action) => action.label === "Keep draft editing available"));

  assert.equal(recordMediaRightsAttribution({ assetId: "asset_rights", owner: "2MRRW", contributors: [], usage: "artwork", verified: true }).verified, true);
  indexSearchDocument({ id: "doc_release", type: "release", title: "Indexed Release", body: "lyrics metadata visual", tags: ["release"] });
  assert.equal(searchIndexedDocuments("visual")[0]?.id, "doc_release");

  assert.equal(buildGracefulDegradationPlan("processing").canContinueEditing, true);
  assert.equal(validateReleaseStateGovernance({ status: "scheduled", visibilityState: "scheduled", readiness: { metadata: "ready", audio: "ready", artwork: "ready", credits: "ready", visuals: "ready", publishing: "ready" } }).ok, false);
}

function testPlatformGovernanceContracts() {
  const design = buildDesignGovernanceContract();
  assert.equal(design.philosophy, "cinematic_creator_os");
  assert.equal(design.accessibility.reducedMotion, true);
  assert.ok(buildComponentGovernanceContracts().every((contract) => contract.reusable));
  assert.ok(getContentGovernanceRules().some((rule) => rule.key === "api_first"));
  assert.equal(validateContentGovernance({ slug: "Bad Slug", fileName: "Cover Final!!.JPG", priorityCount: 2 }).ok, false);
  assert.ok(getPlatformBoundaries().some((boundary) => boundary.domain === "media" && boundary.owns.includes("derivatives")));
}

function testMediaReadinessAndStreamAnalytics() {
  const readiness = getMediaObjectReadiness({
    coverArtState: "uploaded",
    audioAssetsState: "approved",
    lyricsState: "not_required"
  });
  assert.deepEqual(readiness, { coverArtReady: true, audioReady: true, lyricsReady: true });
  recordStreamAnalytics("analytics_user", { trackId: "trk_signal", listenedSeconds: 31, countryCode: "US" });
  recordStreamAnalytics("analytics_user", { trackId: "trk_signal", listenedSeconds: 12, countryCode: "US" });
  const summary = getStreamingAnalyticsSummary();
  assert.equal(summary.validStreams, 1);
  assert.equal(summary.thresholdSeconds, 30);
}

function testCircleEventFoundation() {
  const active = createCircleEvent({
    type: "active",
    targetUserId: "user_demo",
    payload: { surface: "circle" }
  });
  assert.equal(active.label, circleEventLabels.active);
  assert.equal(active.actorDisplayName, "2MRRW");
  assert.equal(active.audience, "public");
  assert.equal(listInbox("user_demo")[0]?.title, "2MRRW active");

  assert.equal(triggerCircleReplied({ commentId: "comment_1" }).label, "2MRRW replied");
  assert.equal(triggerCircleLive({ payload: { room: "circle" } }).label, "2MRRW is live");
  assert.equal(triggerCircleHighlightedComment({ commentId: "comment_2" }).label, "2MRRW highlighted a comment");
  assert.equal(triggerCircleReacted({ postId: "post_1" }).label, "2MRRW reacted");
  assert.equal(listCircleEvents({ limit: 5 }).length, 5);
  assert.throws(() => createCircleEvent({ type: "invalid" as never }), /Unsupported Circle event type/);
}

async function testMediaUploadIntentFoundation() {
  const { release, track } = makeReadyRelease("Upload Intent Test");

  const masterIntent = await createMediaUploadIntent({
    category: "audio_full_song",
    releaseId: release.id,
    trackId: track.id,
    fileName: "full-song.wav",
    mimeType: "audio/wav",
    sizeBytes: 80 * 1024 * 1024
  });
  assert.equal(masterIntent.bucket, process.env.CLOUDFLARE_R2_BUCKET_NAME || "2mrrw-media");
  assert.equal(masterIntent.uploadMethod, "direct-to-storage");
  assert.match(masterIntent.path, new RegExp(`^masters/${release.id}/${track.id}/`));
  assert.deepEqual(masterIntent.audioQualityTarget, professionalAudioQualityTarget);

  const singleCoverJpgPath = buildMediaUploadPath({
    category: "single_cover_art",
    releaseId: release.id,
    fileName: "cover.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 10 * 1024 * 1024
  });
  assert.match(singleCoverJpgPath, new RegExp(`^singles/${release.id}/cover/`));

  const albumCoverMp4Path = buildMediaUploadPath({
    category: "album_cover_art",
    releaseId: release.id,
    fileName: "cover-loop.mp4",
    mimeType: "video/mp4",
    sizeBytes: 60 * 1024 * 1024
  });
  assert.match(albumCoverMp4Path, new RegExp(`^albums/${release.id}/cover/`));

  const coverPolicy = getMediaUploadPolicy("single_cover_art");
  assert.deepEqual(coverPolicy.extensions, ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "webm"]);
  assert.deepEqual(masterIntent.audioQualityTarget, professionalAudioQualityTarget);

  const coverIntent = await createMediaUploadIntent({
    category: "single_cover_art",
    releaseId: release.id,
    fileName: "cover.webp",
    mimeType: "image/webp",
    sizeBytes: 1024
  });
  assert.equal(coverIntent.category, "single_cover_art");

  const motionCoverIntent = await createMediaUploadIntent({
    category: "single_cover_art",
    releaseId: release.id,
    fileName: "motion-cover.mov",
    mimeType: "video/quicktime",
    sizeBytes: 20 * 1024 * 1024
  });
  assert.deepEqual(motionCoverIntent.artworkQualityTarget, {
    minimumDimensions: { width: 1400, height: 1400 },
    recommendedDimensions: { width: 3000, height: 3000 },
    aspectRatio: "1:1",
    validation: "metadata_required",
    helperText: "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000."
  });

  const finalizedMotionCover = confirmMediaUpload({
    category: "single_cover_art",
    releaseId: release.id,
    path: `singles/${release.id}/cover/motion-cover.mp4`,
    destination: "release_media",
    mediaType: "video"
  });
  assert.equal(finalizedMotionCover.frontendDestinations.includes("latest_singles"), true);
  assert.equal(release.motionArtworkPath, `singles/${release.id}/cover/motion-cover.mp4`);

  const epRelease = createRelease({ releaseType: "ep", title: "EP Routing Test", trackCount: 2 });
  const epRouting = resolveContentDestinations({
    releaseType: epRelease.releaseType,
    destination: "release_media",
    mediaType: "image",
    relatedReleaseId: epRelease.id
  });
  assert.deepEqual(epRouting.frontendDestinations, ["eps", "music_eps"]);

  const coverRoute = resolveMediaSyncRoute({
    relatedReleaseId: release.id,
    releaseType: "album",
    assetRole: "cover_art",
    destination: "cover_art",
    mediaType: "image"
  });
  assert.equal(coverRoute.mediaSection, "cover");
  assert.equal(sectionForAssetRole("cover_art", "album"), "cover");
  assert.equal(coverRoute.cacheInvalidationTargets.includes("/api/admin/catalog"), true);

  const heroRoute = resolveMediaSyncRoute({
    uploadCategory: "hero_media",
    destination: "hero",
    mediaType: "video"
  });
  assert.equal(heroRoute.mediaSection, "hero");
  assert.equal(heroRoute.callbackGroup, "media_sync_hero");

  assert.throws(
    () =>
      validateMediaUploadIntent({
        category: "single_cover_art",
        releaseId: release.id,
        fileName: "cover.svg",
        mimeType: "image/svg+xml",
        sizeBytes: 1024
      }),
    /Unsupported file extension/
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "single_cover_art",
      releaseId: release.id,
      fileName: "cover-loop.webm",
      mimeType: "video/webm",
      sizeBytes: 1024
    })
  );
  assert.throws(
    () =>
      validateMediaUploadIntent({
        category: "audio_full_song",
        releaseId: release.id,
        trackId: track.id,
        fileName: "song.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024
      }),
    /Unsupported file extension/
  );
  assert.throws(
    () =>
      validateMediaUploadIntent({
        category: "audio_full_song",
        releaseId: release.id,
        trackId: track.id,
        fileName: "song.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024
      }),
    /Unsupported file extension/
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_full_song",
      releaseId: release.id,
      trackId: track.id,
      fileName: "song.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1024
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_full_song",
      releaseId: release.id,
      trackId: track.id,
      fileName: "song.m4a",
      mimeType: "audio/mp4",
      sizeBytes: 1024,
      audioMetadata: { format: "m4a", bitDepth: "unknown", sampleRateHz: "unknown", channels: "unknown" }
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_full_song",
      releaseId: release.id,
      trackId: track.id,
      fileName: "hi-res-master.aiff",
      mimeType: "application/octet-stream",
      sizeBytes: 1024,
      audioMetadata: { format: "aiff", bitDepth: "32_float", sampleRateHz: 96000, channels: 2 }
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_full_song",
      releaseId: release.id,
      trackId: track.id,
      fileName: "song.flac",
      mimeType: "audio/flac",
      sizeBytes: 1024
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_full_song",
      releaseId: release.id,
      trackId: track.id,
      fileName: "song.aiff",
      mimeType: "audio/aiff",
      sizeBytes: 1024
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_preview",
      releaseId: release.id,
      trackId: track.id,
      fileName: "preview.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1024
    })
  );
  assert.doesNotThrow(() =>
    validateMediaUploadIntent({
      category: "audio_preview",
      releaseId: release.id,
      trackId: track.id,
      fileName: "preview.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024
    })
  );

  const categories = [
    ["signal_asset", { signalId: "sig_release_window" }, "signal/sig_release_window/", "signal.mp3", "audio/mpeg"],
    ["radio_asset", { radioId: "radio_main" }, "radio/radio_main/", "radio-bumper.mp4", "video/mp4"],
    ["collector_card_asset", { collectorId: "card_hologram" }, "collectors/card_hologram/", "card-loop.mp4", "video/mp4"],
    ["vault_asset", { vaultContentId: "vault_demo" }, "vault/vault_demo/", "session-notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
  ] as const;

  for (const [category, owner, prefix, fileName, mimeType] of categories) {
    const path = buildMediaUploadPath({
      category,
      ...owner,
      fileName,
      mimeType,
      sizeBytes: 1024 * 1024
    });
    assert.match(path, new RegExp(`^${prefix}`));
  }

  const finalized = confirmMediaUpload({
    category: "audio_preview",
    releaseId: release.id,
    trackId: track.id,
    path: `previews/${release.id}/${track.id}/preview.mp3`,
    audioMetadata: { bitDepth: 16, sampleRateHz: 44100, channels: 2 }
  });
  assert.equal(finalized.ownerType, "track");
  assert.equal(finalized.access, "public");
  assert.equal(finalized.audioAssetRole, "preview_audio");
  assert.equal(finalized.previewGeneration?.state, "ready");
  assert.equal(finalized.audioMetadata?.format, "mp3");
  assert.equal(getReleaseBySlug(release.slug), null);

  const masterFinalized = confirmMediaUpload({
    category: "audio_full_song",
    releaseId: release.id,
    trackId: track.id,
    path: `masters/${release.id}/${track.id}/master.m4a`,
    retryOfAssetId: finalized.id,
    audioMetadata: { format: "m4a", bitDepth: 24, sampleRateHz: 48000, channels: 2 }
  });
  assert.equal(masterFinalized.audioAssetRole, "master_audio");
  assert.equal(masterFinalized.previewGeneration?.state, "pending");
  assert.equal(masterFinalized.transcodingCompatibility?.originalMasterPreserved, true);
  assert.equal(masterFinalized.playbackHandling?.frontendPerformance, "do_not_inline_master");
  assert.throws(
    () =>
      confirmMediaUpload({
        category: "audio_preview",
        releaseId: release.id,
        trackId: track.id,
        path: `masters/${release.id}/${track.id}/preview.mp3`
      }),
    /Completed upload path must start/
  );
  assert.throws(
    () =>
      confirmMediaUpload({
        category: "single_cover_art",
        releaseId: release.id,
        path: `singles/${release.id}/cover/cover.svg`
      }),
    /Unsupported completed file extension/
  );
  assert.throws(
    () =>
      confirmMediaUpload({
        category: "vault_asset",
        vaultContentId: "vault_demo",
        path: "../vault/vault_demo/session-notes.pdf"
      }),
    /Invalid storage path/
  );
}

async function testFrontendReleaseIngestion() {
  const first = await ingestFrontendReleaseEcosystem();
  assert.equal(first.frontendPath, "/Users/recharge/artist-platform");
  assert.deepEqual(first.sources, {
    singles: 4,
    albums: 3,
    features: 2,
    audioVisuals: 3
  });
  assert.equal(first.imported.releases, 9);
  assert.ok(first.imported.mediaAssets >= 20);
  assert.equal(listReleaseDrafts().filter((release) => release.tags.includes("frontend-import")).length >= 9, true);
  assert.ok(listReleaseDrafts().some((release) => release.slug === "hour-glass" && release.tracks.length === 1));
  assert.ok(listReleaseDrafts().some((release) => release.tags.includes("frontend-import") && release.frontendSyncTargets.length > 0));
  assert.ok(listConfirmedMediaAssets().some((asset) => asset.path.endsWith(".mp4") && asset.frontendDestinations.includes("audio_visuals")));

  const importedReleaseCount = listReleaseDrafts().filter((release) => release.tags.includes("frontend-import")).length;
  const importedAssetCount = listConfirmedMediaAssets().length;
  const second = await ingestFrontendReleaseEcosystem();
  assert.equal(second.imported.releases, 9);
  assert.equal(listReleaseDrafts().filter((release) => release.tags.includes("frontend-import")).length, importedReleaseCount);
  assert.equal(listConfirmedMediaAssets().length, importedAssetCount);
}

function makeReadyRelease(title: string, releaseType: "single" | "album" | "ep" = "single") {
  const release = createRelease({ releaseType, title, trackCount: releaseType === "single" ? 1 : releaseType === "album" ? 7 : 2 });
  updateReleaseMetadata(release.id, {
    coverArtState: "approved",
    originalReleaseDate: "2026-05-22",
    producer: "2MRRW",
    recordLabel: "2MRRW",
    mixingEngineer: "Mix Engineer"
  });

  release.tracks.forEach((track, index) => {
    updateTrackInformation(release.id, track.id, {
      title: release.tracks.length === 1 ? `${title} Track` : `${title} Track ${index + 1}`,
      audioState: "approved",
      producerNames: ["Track Producer"],
      credits: `Writer ${index + 1}`
    });
  });

  const track = release.tracks[0];
  assert.ok(track);
  return { release, track };
}

function testPublishPropagatesToExperienceReads() {
  const { release } = makeReadyRelease("Experience Sync Test");
  assert.equal(getReleaseBySlug(release.slug), null);

  const published = publishRelease(release.id);
  assert.ok(published?.ok);

  const bySlug = getReleaseBySlug(release.slug);
  assert.equal(bySlug?.id, release.id);
  assert.equal(bySlug?.tracks.length, 1);
  assert.equal(bySlug?.tracks[0]?.assets.full, undefined);
  assert.equal(bySlug?.tracks[0]?.assets.preview, undefined);
  assert.equal(bySlug?.artwork, undefined);
  assert.equal(bySlug?.artworkAssetId, undefined);
  assert.equal(bySlug?.tracks[0]?.previewAssetId, undefined);
  assert.ok(getLatestReleases().some((item) => item.id === release.id));
}

function testNotReadyReleaseDoesNotPublish() {
  const release = createRelease({ releaseType: "single", title: "Blocked Release", trackCount: 1 });
  const result = publishRelease(release.id);
  assert.equal(result?.ok, false);
  assert.equal(getReleaseBySlug(release.slug), null);
}

function testLibraryUsesSharedMediaContract() {
  const { release } = makeReadyRelease("Library Contract Test");
  const published = publishRelease(release.id);
  assert.ok(published?.ok);
  saveLibraryItem("library_contract_user", { releaseId: release.id });

  const library = getUserLibrary("library_contract_user");
  assert.ok(library.releases.some((item) => item.id === release.id));
  assert.equal(library.releases.find((item) => item.id === release.id)?.playback.saved, true);
}

function testPlaybackEventContract() {
  const { release, track } = makeReadyRelease("Playback Contract Test");
  assert.ok(publishRelease(release.id)?.ok);
  const event = trackPlaybackEvent("playback_contract_user", {
    trackId: track.id,
    releaseId: release.id,
    eventType: "progress",
    positionSeconds: 64,
    listenedSeconds: 31,
    sessionId: "session_contract"
  });
  assert.equal(event.progress?.positionSeconds, 64);
  assert.equal(event.analytics?.properties.validStream, true);
  assert.equal(getReleaseBySlug(release.slug, { userId: "playback_contract_user" })?.tracks[0]?.playback.positionSeconds, 64);
}

function testAnimatedSinglePrimaryAssetsPreferVideoLoop() {
  const base = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.ARTIST_PLATFORM_PUBLIC_URL ||
    "https://artist-platform-silk.vercel.app"
  ).replace(/\/$/, "");
  const animatedSingles = [
    { slug: "hour-glass", mp4: "hourglass.mp4", poster: "hourglass.jpg" },
    { slug: "artificial", mp4: "artificial.mp4", poster: "artificial.jpg" },
    { slug: "w2d", mp4: "w2d.mp4", poster: "w2d.jpg" },
    { slug: "turnt-me-2-dis", mp4: "turntme2dis.mp4", poster: "turnt.jpg" }
  ] as const;

  for (const single of animatedSingles) {
    const asset = buildReleasePrimaryAsset({
      slug: single.slug,
      releaseType: "single",
      releaseCategory: "single",
      coverUrl: `${base}/images/singles/${single.poster}`,
      loopUrl: `${base}/videos/singles/${single.mp4}`
    });
    assert.equal(asset?.type, "mp4", single.slug);
    assert.ok(asset?.src.includes(single.mp4), single.slug);
  }

  const turntFromSlugOnly = buildReleasePrimaryAsset({
    slug: "turnt-me-2-dis",
    releaseType: "single",
    releaseCategory: "single",
    coverUrl: `${base}/images/singles/turnt.jpg`
  });
  assert.equal(turntFromSlugOnly?.type, "mp4");
  assert.ok(turntFromSlugOnly?.src.includes("turntme2dis.mp4"));

  const featureStatic = buildReleasePrimaryAsset({
    slug: "i-dont-believe-you",
    releaseType: "feature",
    releaseCategory: "feature",
    coverUrl: `${base}/images/features/idbu.jpg`
  });
  assert.equal(featureStatic?.type, "jpg");
  assert.equal(featureStatic?.src.includes(".mp4"), false);

  const staleJpegPrimary = {
    type: "jpg" as const,
    src: `${base}/images/singles/hourglass.jpg`,
    loop: false,
    muted: true,
    autoplay: false
  };
  const fixed = resolveDisplayPrimaryAsset({
    primaryAsset: staleJpegPrimary,
    slug: "hour-glass",
    releaseType: "single",
    coverUrl: staleJpegPrimary.src,
    loopUrl: `${base}/videos/singles/hourglass.mp4`
  });
  assert.equal(fixed?.type, "mp4");
}

function testSchedulePastDateRejectedByApiPayload() {
  assert.throws(
    () =>
      buildSchedulePayload({
        year: 2020,
        month: 1,
        day: 1,
        hour12: 12,
        minute: 0,
        meridiem: "AM",
        timezone: "America/Chicago"
      }),
    /future/i
  );
}

function testReleaseScheduleUtcConversion() {
  const utc = localScheduleToUtcIso({
    year: 2026,
    month: 5,
    day: 28,
    hour12: 11,
    minute: 30,
    meridiem: "PM",
    timezone: "America/Chicago"
  });
  assert.ok(utc.endsWith("Z") || utc.includes("+00:00"));
  const parts = utcIsoToScheduleParts(utc, "America/Chicago");
  assert.equal(parts?.day, 28);
  assert.equal(parts?.hour12, 11);
  assert.equal(parts?.minute, 30);
  assert.equal(parts?.meridiem, "PM");
  assert.equal(scheduleIsInFuture(localScheduleToUtcIso({
    year: 2030,
    month: 1,
    day: 1,
    hour12: 12,
    minute: 0,
    meridiem: "AM",
    timezone: "UTC"
  })), true);
}

function testReleaseLiveStatusEngine() {
  const base = {
    id: "rel-live-1",
    slug: "love-hz",
    status: "published",
    releaseType: "single",
    coverUrl: "https://cdn.example/cover.jpg",
    coverAssetId: "asset-cover",
    tracks: [{ audioAssetId: "asset-audio", audioState: "uploaded" }],
    releaseMedia: [
      {
        assetRole: "cover_art",
        frontendRoute: "/music/singles/love-hz",
        syncTarget: "release:rel-live-1:singles",
        frontendDestinations: ["music_tab_singles"]
      }
    ]
  };

  const live = computeReleaseLiveStatus(base, []);
  assert.equal(live.liveStatus, "live");

  const scheduled = computeReleaseLiveStatus(
    { ...base, status: "scheduled", scheduledPublishAt: new Date(Date.now() + 86_400_000).toISOString() },
    []
  );
  assert.equal(scheduled.liveStatus, "scheduled");

  const draft = computeReleaseLiveStatus({ ...base, status: "draft" }, []);
  assert.equal(draft.liveStatus, "draft");

  const syncError = computeReleaseLiveStatus(
    { ...base, coverUrl: null, coverAssetId: null, releaseMedia: [] },
    [{ key: "release:rel-live-1", dirty: true, metadata: { failed: true } }]
  );
  assert.equal(syncError.liveStatus, "sync_error");
  assert.ok(syncError.liveStatusReasons.some((reason) => reason.includes("cover")));
}

function testUniversalCommerceValidation() {
  assert.equal(validateCollectorCardPriceInCents(8999).ok, true);
  assert.equal(validateCollectorCardPriceInCents(null).ok, false);
  assert.equal(validateVaultItemPriceInCents(7000).ok, true);
  assert.equal(validateVaultCategory("Audio Diaries"), true);
  assert.equal(validateVaultCategory("Collector Cards"), false);
}

function testReleaseCommerceValidation() {
  const singleBand = validateReleasePriceInCents(499, "single");
  assert.equal(singleBand.ok, true);
  const outOfBand = validateReleasePriceInCents(150, "single");
  assert.equal(outOfBand.ok, false);

  const draft = createReleaseDraft({ releaseType: "single", title: "Priced Single" });
  updateReleaseMetadata(draft.id, { priceInCents: 499, pricingTier: "single", giftingEnabled: true });
  const checks = validateReleaseStructure(getReleaseDraft(draft.id)!);
  assert.ok(checks.find((check) => check.key === "pricing")?.passed);

  const giftingBlocked = validateDraftCommerceFields({
    priceInCents: null,
    pricingTier: "single",
    releaseType: "single",
    giftingEnabled: true
  });
  assert.equal(giftingBlocked.ok, false);
}

function testReleaseTypeFiltering() {
  const { release: singleRelease } = makeReadyRelease("Filtered Single", "single");
  const { release: albumRelease } = makeReadyRelease("Filtered Album", "album");

  assert.ok(publishRelease(singleRelease.id)?.ok);
  assert.ok(publishRelease(albumRelease.id)?.ok);

  const singles = getLatestReleases({ releaseType: "single" });
  const albums = getLatestReleases({ releaseType: "album" });
  const features = getLatestReleases({ releaseType: "feature" });

  assert.ok(singles.some((item) => item.id === singleRelease.id));
  assert.equal(singles.some((item) => item.id === albumRelease.id), false);
  assert.ok(albums.some((item) => item.id === albumRelease.id));
  assert.equal(albums.some((item) => item.id === singleRelease.id), false);
  assert.ok(features.some((item) => item.slug === "i-dont-believe-you"));
}

function testPhase2CatalogSyncMapping() {
  const mapped = mapVaultItemToStorefrontContent({
    id: "vault-1",
    slug: "test-diaries",
    category: "Audio Diaries",
    title: "Test Diary",
    description: "desc",
    accessTier: "inner_circle",
    mediaType: "audio",
    shelfUrl: "/shelf.jpg",
    contentUrl: "/audio.wav",
    priceInCents: null,
    giftingEnabled: false,
    sortOrder: 10,
    featured: true,
    visibility: "published",
    isDropItem: false,
    tierVisibility: [],
    claimCount: 0,
    notificationSent: false,
    glowEffect: false,
    metadata: { audioQuality: { format: "wav", bitDepth: 24, sampleRateHz: 48000 } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  assert.equal(mapped.slug, "test-diaries");
  assert.equal(mapped.thumbnail_url, "/shelf.jpg");
  assert.equal(mapped.metadata.audioQualityBadge, "premium");
  assert.equal(resolveAudioQualityBadge({ format: "mp3" }), "mp3");
}

await testAccountState();
testPhase2CatalogSyncMapping();
testEntitlementResolution();
await testWebhookIdempotency();
await testSignedMediaAccess();
testVaultPublicPreviewContract();
testSignalSuppression();
testRadioIndependence();
testPlaybackPersistence();
testPlaybackQueueAndRecentlyPlayed();
testSupabaseServerKeyFallback();
testYouTubeAudioVisualUrlParser();
testReleaseTypeValidation();
testContributorSplitValidation();
testContributorDirectoryMemory();
testTaxonomyCompleteness();
testGlobalSearchAndFrontendMetadataContract();
testReleaseReadinessGates();
testStorefrontSectionRouting();
testCreatorSessionContinuityAndFlowIntelligence();
testRelationalLifecycleContracts();
testProductionResilienceContracts();
testPlatformGovernanceContracts();
testMediaReadinessAndStreamAnalytics();
testCircleEventFoundation();
await testMediaUploadIntentFoundation();
await testFrontendReleaseIngestion();
testPublishPropagatesToExperienceReads();
testNotReadyReleaseDoesNotPublish();
testLibraryUsesSharedMediaContract();
testPlaybackEventContract();
testAnimatedSinglePrimaryAssetsPreferVideoLoop();
testSchedulePastDateRejectedByApiPayload();
testReleaseScheduleUtcConversion();
testReleaseLiveStatusEngine();
testUniversalCommerceValidation();
testReleaseCommerceValidation();
testReleaseTypeFiltering();
await testAudioVisualPublishedFiltering();

function testAdminSessionPersistence() {
  const startedAt = Date.now() - ADMIN_SESSION_MAX_AGE_MS - 1000;
  const cookie = `${ADMIN_SESSION_COOKIE}=${startedAt}`;
  assert.equal(parseAdminSessionStartedAt(cookie), startedAt);
  assert.equal(isAdminSessionExpired(startedAt), false);
  assert.equal(isAdminSessionExpired(null), true);
}

testAdminSessionPersistence();

console.log("backend foundation verification passed");

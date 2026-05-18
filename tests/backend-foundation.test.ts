import assert from "node:assert/strict";
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
import {
  buildMediaUploadPath,
  confirmMediaUpload,
  createMediaUploadIntent,
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
  updateReleaseMetadata,
  updateTrackInformation,
  validateTrackSplits
} from "@/server/release-management/releaseManagementService";
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

async function testAccountState() {
  const state = getAccountState("user_demo");
  assert.equal(state.profile?.id, "user_demo");
  assert.ok(state.permissions.canStreamTrackIds.includes("trk_signal"));
  assert.ok(state.library.purchasedProductIds.includes("prod_afterhours_digital"));
}

function testEntitlementResolution() {
  const grants = resolveEntitlements("admin_demo");
  assert.ok(grants.some((grant) => grant.type === "membership" && grant.tier === "founder"));
  assert.ok(grants.some((grant) => grant.type === "vault_collection"));
}

async function testWebhookIdempotency() {
  const event = {
    id: "evt_test_idempotent",
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: {
          userId: "user_demo",
          productId: "prod_founder_membership"
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
  assert.deepEqual(first.grantedProductIds, ["prod_founder_membership"]);
  assert.equal(second.processed, false);
  assert.deepEqual(second.grantedProductIds, []);
}

async function testSignedMediaAccess() {
  const signed = await createSignedMediaUrl("user_demo", "asset_audio_signal");
  assert.equal(signed.ok, true);
  if (signed.ok) {
    assert.match(signed.url, /signed\.local|supabase/);
  }

  const publicPreview = await createSignedMediaUrl(null, "asset_preview_signal", { publicKinds: ["preview", "artwork", "loop"] });
  assert.equal(publicPreview.ok, true);

  const anonymousFullAudio = await createSignedMediaUrl(null, "asset_audio_signal", { publicKinds: ["preview", "artwork", "loop"] });
  assert.equal(anonymousFullAudio.ok, false);
  if (!anonymousFullAudio.ok) {
    assert.equal(anonymousFullAudio.status, 403);
  }
}

function testSignalSuppression() {
  assert.ok(listActiveSignals("signal_test_user").some((signal) => signal.id === "sig_release_window"));
  updateSignalState("signal_test_user", "sig_release_window", "dismissed");
  assert.equal(listActiveSignals("signal_test_user").some((signal) => signal.id === "sig_release_window"), false);
}

function testRadioIndependence() {
  updateSignalState("radio_test_user", "sig_release_window", "dismissed");
  const feed = getRadioFeed("main");
  assert.ok(feed);
  assert.equal(feed?.items[0]?.trackId, "trk_radio");
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
  assert.throws(() => createReleaseDraft({ releaseType: "album", title: "Invalid Album", trackCount: 1 }), /at least 2/);
  const single = createReleaseDraft({ releaseType: "single", title: "Validated Single", trackCount: 1 });
  assert.equal(single.tracks.length, 1);
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

function testReleaseReadinessGates() {
  const release = createReleaseDraft({ releaseType: "single", title: "Readiness Test", trackCount: 1 });
  const track = release.tracks[0];
  assert.ok(track);
  assert.equal(getReadinessSummary(release.id).ready, false);
  updateReleaseMetadata(release.id, {
    copyrightOwner: "2MRRW",
    primaryGenre: { category: "hip-hop-rap", subgenre: "alternative-rap" },
    coverArtState: "uploaded"
  });
  updateTrackInformation(release.id, track.id, { title: "Ready Track", audioState: "uploaded" });
  attachTrackContribution(release.id, track.id, {
    contributorName: "Writer",
    contributionType: "both",
    isPublisher: false,
    ownershipSplit: 100
  });
  assert.equal(getReadinessSummary(release.id).ready, true);
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
  assert.equal(masterIntent.bucket, "protected-media");
  assert.equal(masterIntent.uploadMethod, "direct-to-storage");
  assert.match(masterIntent.path, new RegExp(`^masters/${release.id}/${track.id}/`));
  assert.deepEqual(masterIntent.audioQualityTarget, {
    bitDepth: 24,
    sampleRateHz: 44100,
    validation: "metadata_required"
  });

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
  assert.throws(
    () =>
      validateMediaUploadIntent({
        category: "single_cover_art",
        releaseId: release.id,
        fileName: "cover-loop.mov",
        mimeType: "video/quicktime",
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
    path: `previews/${release.id}/${track.id}/preview.mp3`
  });
  assert.equal(finalized.ownerType, "track");
  assert.equal(finalized.access, "public");
  assert.equal(getReleaseBySlug(release.slug), null);
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

function makeReadyRelease(title: string, releaseType: "single" | "album" | "ep" = "single") {
  const release = createRelease({ releaseType, title, trackCount: releaseType === "single" ? 1 : 2 });
  updateReleaseMetadata(release.id, {
    copyrightOwner: "2MRRW",
    primaryGenre: { category: "hip-hop-rap", subgenre: "alternative-rap" },
    coverArtState: "approved"
  });

  release.tracks.forEach((track, index) => {
    updateTrackInformation(release.id, track.id, {
      title: release.tracks.length === 1 ? `${title} Track` : `${title} Track ${index + 1}`,
      audioState: "approved",
      lyricsState: "uploaded"
    });
    attachTrackContribution(release.id, track.id, {
      contributorName: "Writer",
      contributionType: "both",
      isPublisher: false,
      ownershipSplit: 100
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
  assert.equal(bySlug?.tracks[0]?.assets.full?.kind, "full_audio");
  assert.equal(bySlug?.tracks[0]?.assets.preview?.kind, "preview");
  assert.equal(bySlug?.artwork?.signedUrlRequired, true);
  assert.equal(bySlug?.artworkAssetId, bySlug?.artwork?.assetId);
  assert.equal(bySlug?.tracks[0]?.previewAssetId, bySlug?.tracks[0]?.assets.preview?.assetId);
  assert.match(bySlug?.tracks[0]?.assets.preview?.signedUrlEndpoint ?? "", /^\/api\/media\/asset_preview_/);
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
  const event = trackPlaybackEvent("playback_contract_user", {
    trackId: "trk_signal",
    releaseId: "rel_afterhours",
    eventType: "progress",
    positionSeconds: 64,
    listenedSeconds: 31,
    sessionId: "session_contract"
  });
  assert.equal(event.progress?.positionSeconds, 64);
  assert.equal(event.analytics?.properties.validStream, true);
  assert.equal(getReleaseBySlug("afterhours-control", { userId: "playback_contract_user" })?.tracks[0]?.playback.positionSeconds, 64);
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
  assert.deepEqual(features, []);
}

await testAccountState();
testEntitlementResolution();
await testWebhookIdempotency();
await testSignedMediaAccess();
testSignalSuppression();
testRadioIndependence();
testPlaybackPersistence();
testPlaybackQueueAndRecentlyPlayed();
testSupabaseServerKeyFallback();
testYouTubeAudioVisualUrlParser();
testReleaseTypeValidation();
testContributorSplitValidation();
testReleaseReadinessGates();
testMediaReadinessAndStreamAnalytics();
testCircleEventFoundation();
await testMediaUploadIntentFoundation();
testPublishPropagatesToExperienceReads();
testNotReadyReleaseDoesNotPublish();
testLibraryUsesSharedMediaContract();
testPlaybackEventContract();
testReleaseTypeFiltering();
await testAudioVisualPublishedFiltering();

console.log("backend foundation verification passed");

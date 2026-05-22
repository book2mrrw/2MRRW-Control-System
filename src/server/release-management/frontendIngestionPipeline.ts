import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildFrontendEcosystemPersistencePlan,
  type FrontendReleaseIngestionResult
} from "@/server/release-management/frontendReleaseIngestionService";
import { assetRoleFromStoragePath, linkReleaseMediaFromPlan } from "@/server/release-management/releaseMediaLinkService";
import { createAudioVisual, listAudioVisuals, updateAudioVisual } from "@/server/audio-visuals/audioVisualService";
import { persistSyncEvent } from "@/server/events/syncEventPersistenceService";
import { hydrateReleaseManagementFromSupabase } from "@/server/release-management/releaseCatalogHydrationService";
import { getServerSupabase } from "@/server/supabase/client";
import { markSyncDirty, upsertSyncState } from "@/server/sync/syncStateService";

export type IngestionPhase =
  | "scanner"
  | "normalizer"
  | "uploader"
  | "constructor"
  | "linker"
  | "validator"
  | "activator";

export type IngestionPipelineOptions = {
  scanOnly?: boolean;
  dryRun?: boolean;
  validate?: boolean;
  activate?: boolean;
  ingestionRef?: string;
  reportDir?: string;
};

export type IngestionPipelineReport = {
  ingestionRef: string;
  ok: boolean;
  phases: Record<IngestionPhase, { status: string; detail?: string; counts?: Record<string, number> }>;
  counts: {
    releases: number;
    tracks: number;
    mediaAssets: number;
    releaseMedia: number;
    audioVisuals: number;
    syncEvents: number;
  };
  validation: {
    errors: string[];
    warnings: string[];
  };
  messages: string[];
  reportPath?: string;
};

function ingestionRefValue() {
  return `ingest_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

async function logIngestionPhase(input: {
  ingestionRef: string;
  phase: IngestionPhase;
  status: "started" | "completed" | "failed" | "skipped";
  report?: Record<string, unknown>;
}) {
  const supabase = getServerSupabase();
  if (!supabase) return;
  await supabase.from("ingestion_log").insert({
    ingestion_ref: input.ingestionRef,
    phase: input.phase,
    status: input.status,
    report: input.report ?? {}
  });
}

async function activateCatalog(ingestionRef: string, plan: NonNullable<Awaited<ReturnType<typeof buildFrontendEcosystemPersistencePlan>>>) {
  let syncEvents = 0;
  for (const event of plan.syncEvents) {
    const persisted = await persistSyncEvent({
      type: event.type,
      entityId: event.entityId,
      timestamp: Date.parse(event.createdAt),
      data: event.payload.data as Record<string, unknown>
    });
    if (persisted.persisted) syncEvents += 1;
  }

  const existingVisuals = await listAudioVisuals({ publicOnly: false, limit: 200 });
  for (const visual of plan.audioVisuals) {
    const existing = existingVisuals.find((item) => item.slug === visual.slug || item.youtubeVideoId === visual.youtubeVideoId);
    const payload = {
      title: visual.title,
      slug: visual.slug,
      youtubeUrl: visual.youtubeUrl,
      status: visual.status,
      sortOrder: visual.sortOrder,
      metadata: visual.metadata
    };
    if (existing) await updateAudioVisual(existing.id, payload);
    else await createAudioVisual(payload);
  }

  await markSyncDirty("catalog", { ingestionRef, reason: "ingestion.activate" });
  await upsertSyncState({
    key: "frontend_ingestion",
    dirty: false,
    lastIngestionRef: ingestionRef,
    metadata: { releases: plan.releases.length, activatedAt: new Date().toISOString() }
  });

  await persistSyncEvent({
    type: "release_published",
    entityId: "catalog",
    timestamp: Date.now(),
    data: { source: "ingestion_complete", ingestionRef, releaseCount: plan.releases.length }
  });

  return syncEvents;
}

function validatePlan(plan: NonNullable<Awaited<ReturnType<typeof buildFrontendEcosystemPersistencePlan>>>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slugs = plan.releases.map((release) => release.slug);
  const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicateSlugs.length) errors.push(`Duplicate slugs: ${[...new Set(duplicateSlugs)].join(", ")}`);
  if (plan.releases.length !== 9) warnings.push(`Expected 9 releases, found ${plan.releases.length}`);
  if (plan.mediaAssets.length < 20) warnings.push(`Low media asset count: ${plan.mediaAssets.length}`);
  for (const release of plan.releases) {
    const tracks = plan.tracks.filter((track) => track.releaseId === release.id);
    if (!tracks.length) errors.push(`Release ${release.slug} has no tracks`);
    const media = plan.mediaAssets.filter((asset) => asset.ownerId === release.id || tracks.some((track) => track.id === asset.ownerId));
    if (!media.some((asset) => {
      const role = assetRoleFromStoragePath(asset.storagePath);
      return role === "cover_art" || role === "background_loop";
    })) {
      warnings.push(`Release ${release.slug} missing cover relationship`);
    }
  }
  return { errors, warnings, ok: errors.length === 0 };
}

export async function runFrontendIngestionPipeline(
  options: IngestionPipelineOptions = {}
): Promise<IngestionPipelineReport> {
  const ingestionRef = options.ingestionRef ?? ingestionRefValue();
  const cwd = process.cwd();
  const reportDir = (() => {
    const custom =
      typeof options.reportDir === "string" ? options.reportDir.trim() : "";
    return custom.length > 0 ? custom : path.join(cwd, "ingestion-reports");
  })();
  const phases: IngestionPipelineReport["phases"] = {
    scanner: { status: "pending" },
    normalizer: { status: "pending" },
    uploader: { status: "pending" },
    constructor: { status: "pending" },
    linker: { status: "pending" },
    validator: { status: "pending" },
    activator: { status: "pending" }
  };
  const messages: string[] = [];

  await logIngestionPhase({ ingestionRef, phase: "scanner", status: "started" });
  const plan = await buildFrontendEcosystemPersistencePlan();
  if (!plan) {
    phases.scanner = { status: "failed", detail: "No frontend repository found" };
    await logIngestionPhase({ ingestionRef, phase: "scanner", status: "failed", report: { detail: phases.scanner.detail } });
    return {
      ingestionRef,
      ok: false,
      phases,
      counts: { releases: 0, tracks: 0, mediaAssets: 0, releaseMedia: 0, audioVisuals: 0, syncEvents: 0 },
      validation: { errors: ["Frontend source not found"], warnings: [] },
      messages: ["No readable frontend repository was found."]
    };
  }

  phases.scanner = {
    status: "completed",
    counts: {
      singles: plan.sources.singles,
      albums: plan.sources.albums,
      features: plan.sources.features,
      audioVisuals: plan.sources.audioVisuals
    }
  };
  await logIngestionPhase({ ingestionRef, phase: "scanner", status: "completed", report: phases.scanner });

  if (options.scanOnly) {
    phases.normalizer = { status: "skipped" };
    phases.uploader = { status: "skipped" };
    phases.constructor = { status: "skipped" };
    phases.linker = { status: "skipped" };
    phases.validator = { status: "skipped" };
    phases.activator = { status: "skipped" };
    return {
      ingestionRef,
      ok: true,
      phases,
      counts: {
        releases: plan.releases.length,
        tracks: plan.tracks.length,
        mediaAssets: plan.mediaAssets.length,
        releaseMedia: 0,
        audioVisuals: plan.audioVisuals.length,
        syncEvents: 0
      },
      validation: { errors: [], warnings: [] },
      messages: [`Scanned ${plan.frontendPath}`]
    };
  }

  phases.normalizer = { status: "completed", counts: { releases: plan.releases.length, tracks: plan.tracks.length } };
  await logIngestionPhase({ ingestionRef, phase: "normalizer", status: "completed", report: phases.normalizer });

  let persisted = { releases: 0, tracks: 0, mediaAssets: 0 };
  if (!options.dryRun) {
    const { ingestFrontendReleaseEcosystem } = await import("@/server/release-management/frontendReleaseIngestionService");
    const legacy = await ingestFrontendReleaseEcosystem();
    persisted = {
      releases: legacy.persisted.releases,
      tracks: legacy.persisted.tracks,
      mediaAssets: legacy.persisted.mediaAssets
    };
    messages.push(...legacy.messages);
  } else {
    persisted = { releases: plan.releases.length, tracks: plan.tracks.length, mediaAssets: plan.mediaAssets.length };
  }

  phases.uploader = { status: options.dryRun ? "skipped" : "completed", counts: { mediaAssets: persisted.mediaAssets } };
  phases.constructor = {
    status: options.dryRun ? "skipped" : "completed",
    counts: { releases: persisted.releases, tracks: persisted.tracks }
  };

  let releaseMedia = 0;
  if (!options.dryRun) {
    try {
      releaseMedia = await linkReleaseMediaFromPlan(plan, ingestionRef);
      phases.linker = { status: "completed", counts: { releaseMedia } };
    } catch (error) {
      phases.linker = { status: "failed", detail: error instanceof Error ? error.message : "link failed" };
    }
  } else {
    phases.linker = { status: "skipped" };
  }

  const validation = validatePlan(plan);
  phases.validator = {
    status: options.validate || !options.dryRun ? (validation.ok ? "completed" : "failed") : "skipped",
    detail: validation.errors.join("; ") || undefined
  };

  let syncEvents = 0;
  if (options.activate !== false && !options.dryRun && !options.scanOnly) {
    syncEvents = await activateCatalog(ingestionRef, plan);
    phases.activator = { status: "completed", counts: { syncEvents } };
    await hydrateReleaseManagementFromSupabase();
    messages.push("Catalog hydrated from Supabase after activation.");
  } else {
    phases.activator = { status: "skipped" };
  }

  const report: IngestionPipelineReport = {
    ingestionRef,
    ok: validation.ok && phases.linker.status !== "failed",
    phases,
    counts: {
      releases: plan.releases.length,
      tracks: plan.tracks.length,
      mediaAssets: plan.mediaAssets.length,
      releaseMedia,
      audioVisuals: plan.audioVisuals.length,
      syncEvents
    },
    validation,
    messages
  };

  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "ingestion_report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  report.reportPath = reportPath;

  await logIngestionPhase({ ingestionRef, phase: "activator", status: report.ok ? "completed" : "failed", report: report as unknown as Record<string, unknown> });

  return report;
}

export type { FrontendReleaseIngestionResult };

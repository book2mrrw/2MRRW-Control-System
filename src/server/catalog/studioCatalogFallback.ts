import "server-only";

import { buildReleasePrimaryAsset } from "@/lib/media/releasePrimaryAsset";
import { frontendPublicBase } from "@/lib/media/frontendMediaFallbacks";
import type { DurableCatalogRelease } from "@/services/catalog/controlCatalogClient";

type FallbackSeed = {
  slug: string;
  title: string;
  releaseType: "single" | "feature" | "album" | "ep";
  releaseCategory: "single" | "feature" | "album";
  posterFile?: string;
};

/** Artist-platform ingestion set (9 releases) — used when Supabase is unreachable. */
const FALLBACK_RELEASES: FallbackSeed[] = [
  { slug: "hour-glass", title: "Hour Glass", releaseType: "single", releaseCategory: "single", posterFile: "hourglass.jpg" },
  { slug: "artificial", title: "Artificial", releaseType: "single", releaseCategory: "single", posterFile: "artificial.jpg" },
  { slug: "w2d", title: "W.2.D", releaseType: "single", releaseCategory: "single", posterFile: "w2d.jpg" },
  { slug: "turnt-me-2-dis", title: "Turnt Me 2 Dis", releaseType: "single", releaseCategory: "single", posterFile: "turnt.jpg" },
  { slug: "2-heavy", title: "2 Heavy", releaseType: "feature", releaseCategory: "feature", posterFile: "2heavy.jpg" },
  { slug: "i-dont-believe-you", title: "I Don't Believe You", releaseType: "feature", releaseCategory: "feature", posterFile: "idbu.jpg" },
  { slug: "ad", title: "A.D.", releaseType: "album", releaseCategory: "album", posterFile: "ad.jpg" },
  { slug: "tbh", title: "TBH", releaseType: "album", releaseCategory: "album", posterFile: "tbh.jpg" },
  { slug: "love-hz", title: "Love Hz", releaseType: "album", releaseCategory: "album", posterFile: "lovehz.jpg" }
];

function stableId(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `fallback-${hex.slice(0, 8)}-${slug}`;
}

function posterUrlFor(seed: FallbackSeed) {
  const base = frontendPublicBase();
  if (seed.releaseCategory === "single" && seed.posterFile) {
    return `${base}/images/singles/${seed.posterFile}`;
  }
  if (seed.releaseCategory === "feature" && seed.posterFile) {
    return `${base}/images/features/${seed.posterFile}`;
  }
  if (seed.posterFile) {
    return `${base}/images/albums/${seed.posterFile}`;
  }
  return null;
}

/** Emergency studio catalog when durable Supabase reads fail (matches edge-verify 9-release set). */
export function buildStudioCatalogFallback(): DurableCatalogRelease[] {
  return FALLBACK_RELEASES.map((seed) => {
    const posterUrl = posterUrlFor(seed);
    const primaryAsset = buildReleasePrimaryAsset({
      slug: seed.slug,
      releaseType: seed.releaseType,
      releaseCategory: seed.releaseCategory,
      coverUrl: posterUrl,
      posterUrl
    });
    const motionUrl = primaryAsset?.type === "mp4" ? primaryAsset.src : null;
    return {
      id: stableId(seed.slug),
      slug: seed.slug,
      title: seed.title,
      artistName: "2MRRW",
      releaseDate: "2026-01-01",
      releaseType: seed.releaseType,
      releaseCategory: seed.releaseCategory,
      status: "published",
      liveStatus: "live",
      liveStatusReasons: ["fallback_catalog"],
      coverUrl: posterUrl,
      loopUrl: motionUrl,
      motionUrl,
      posterUrl,
      primaryAsset,
      tracks: [],
      releaseMedia: []
    } satisfies DurableCatalogRelease;
  });
}

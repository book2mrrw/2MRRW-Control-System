import { fail, ok, requireAdmin } from "@/server/http";
import {
  compositionTypes,
  contributionTypes,
  countryRegions,
  coverArtPolicy,
  genreTaxonomy,
  lyricLanguages,
  moodStyleOptions,
  releaseTypes
} from "@/server/release-management/taxonomies";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    return ok({
      releaseTypes,
      genreTaxonomy,
      moodStyleOptions,
      compositionTypes,
      contributionTypes,
      lyricLanguages,
      countryRegions,
      coverArtPolicy
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid taxonomy request", 403);
  }
}

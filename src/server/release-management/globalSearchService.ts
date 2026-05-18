import { listContributorProfiles, listMetadataSuggestions } from "@/server/release-management/contributorDirectoryService";
import { listReleaseDrafts, listTrackContributions } from "@/server/release-management/releaseManagementService";

export type GlobalSearchResult = {
  id: string;
  type: "release" | "track" | "contributor" | "metadata" | "command" | "media";
  title: string;
  detail: string;
  href: string;
  score: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreText(query: string, values: string[]) {
  const normalized = normalize(query);
  if (!normalized) return 1;
  return values.reduce((score, value) => {
    const target = normalize(value);
    if (target === normalized) return Math.max(score, 100);
    if (target.startsWith(normalized)) return Math.max(score, 75);
    if (target.includes(normalized)) return Math.max(score, 45);
    return score;
  }, 0);
}

export function searchControlSystem(query = "", limit = 8): GlobalSearchResult[] {
  const releases = listReleaseDrafts();
  const allCommandResults: GlobalSearchResult[] = [
    { id: "create-release", type: "command", title: "Create release", detail: "Start a connected release draft", href: "/releases/new", score: scoreText(query, ["create release", "new release", "add release"]) + 20 },
    { id: "upload-media", type: "command", title: "Upload media", detail: "Add audio, artwork, visuals, or vault media", href: "/media", score: scoreText(query, ["upload media", "add audio", "add artwork", "media"]) + 20 },
    { id: "bulk-actions", type: "command", title: "Bulk actions", detail: "Archive, tag, publish, or recover release groups", href: "/releases", score: scoreText(query, ["bulk actions", "archive releases", "tag releases"]) + 20 },
    { id: "archived-releases", type: "command", title: "Recover archived releases", detail: "Review releases that can be restored", href: "/releases/archived", score: scoreText(query, ["archive", "recover", "deleted"]) + 20 }
  ];
  const commandResults = allCommandResults.filter((result) => result.score > 20 || !query.trim());
  const results: GlobalSearchResult[] = [...commandResults];

  releases.forEach((release) => {
    const releaseScore = scoreText(query, [release.title, release.releaseType, release.status, release.visibilityState, release.artistName, ...release.tags]);
    if (releaseScore) {
      results.push({
        id: release.id,
        type: "release",
        title: release.title,
        detail: `${release.releaseType.replaceAll("_", " ")} / ${release.status.replaceAll("_", " ")} / ${release.visibilityState.replaceAll("_", " ")} / ${release.tracks.length} track(s)`,
        href: `/releases/${release.id}`,
        score: releaseScore + 10
      });
    }

    release.tracks.forEach((track) => {
      const trackContributors = listTrackContributions(track.id).map((contribution) => contribution.contributorName);
      const trackScore = scoreText(query, [track.title, release.title, ...track.producerNames, ...trackContributors]);
      if (trackScore) {
        results.push({
          id: track.id,
          type: "track",
          title: track.title,
          detail: `${release.title} / Track ${track.position}`,
          href: `/tracks/${track.id}/information`,
          score: trackScore
        });
      }
    });
  });

  listContributorProfiles().forEach((profile) => {
    const contributorScore = scoreText(query, [profile.displayName, profile.legalName ?? "", profile.kind, ...profile.roles, ...profile.aliases]);
    if (contributorScore) {
      results.push({
        id: profile.id,
        type: "contributor",
        title: profile.displayName,
        detail: `${profile.kind.replaceAll("_", " ")} / ${profile.roles.join(", ").replaceAll("_", " ")}`,
        href: "/releases/new/tracks",
        score: contributorScore + profile.usageCount
      });
    }
  });

  listMetadataSuggestions().forEach((suggestion) => {
    const metadataScore = scoreText(query, [suggestion.value, suggestion.kind]);
    if (metadataScore) {
      results.push({
        id: suggestion.id,
        type: "metadata",
        title: suggestion.value,
        detail: suggestion.kind.replaceAll("_", " "),
        href: "/releases/new",
        score: metadataScore + suggestion.usageCount
      });
    }
  });

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

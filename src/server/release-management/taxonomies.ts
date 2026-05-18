export const releaseTypes = ["single", "album", "ep"] as const;
export type ReleaseType = (typeof releaseTypes)[number];

export const releaseStatuses = [
  "draft",
  "metadata_incomplete",
  "assets_pending",
  "rights_pending",
  "ready_for_review",
  "scheduled",
  "published",
  "archived"
] as const;
export type ReleaseManagementStatus = (typeof releaseStatuses)[number];

export const uploadReadinessStates = ["missing", "partial", "uploaded", "approved", "rejected"] as const;
export type UploadReadinessState = (typeof uploadReadinessStates)[number];

export const lyricReadinessStates = ["not_required", ...uploadReadinessStates] as const;
export type LyricReadinessState = (typeof lyricReadinessStates)[number];

export const compositionTypes = ["original", "cover", "remix", "public_domain"] as const;
export type CompositionType = (typeof compositionTypes)[number];

export const contributionTypes = ["music", "lyrics", "both", "producer"] as const;
export type ContributionType = (typeof contributionTypes)[number];

export const genreTaxonomy = [
  {
    category: "hip-hop-rap",
    label: "Hip-Hop/Rap",
    subgenres: [
      { value: "alternative-rap", label: "Alternative Rap" },
      { value: "trap", label: "Trap" },
      { value: "boom-bap", label: "Boom Bap" }
    ]
  },
  {
    category: "r-and-b-soul",
    label: "R&B/Soul",
    subgenres: [
      { value: "alternative-r-and-b", label: "Alternative R&B" },
      { value: "neo-soul", label: "Neo Soul" },
      { value: "contemporary-r-and-b", label: "Contemporary R&B" }
    ]
  },
  {
    category: "electronic",
    label: "Electronic",
    subgenres: [
      { value: "ambient", label: "Ambient" },
      { value: "downtempo", label: "Downtempo" },
      { value: "experimental-electronic", label: "Experimental Electronic" }
    ]
  },
  {
    category: "pop",
    label: "Pop",
    subgenres: [
      { value: "alternative-pop", label: "Alternative Pop" },
      { value: "synth-pop", label: "Synth Pop" },
      { value: "indie-pop", label: "Indie Pop" }
    ]
  }
] as const;

export const moodStyleOptions = [
  "cinematic",
  "nocturnal",
  "atmospheric",
  "high-energy",
  "melancholic",
  "experimental",
  "club",
  "introspective"
] as const;

export const lyricLanguages = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" }
] as const;

export const countryRegions = [
  { code: "US", label: "United States", region: "North America" },
  { code: "CA", label: "Canada", region: "North America" },
  { code: "GB", label: "United Kingdom", region: "Europe" },
  { code: "FR", label: "France", region: "Europe" },
  { code: "DE", label: "Germany", region: "Europe" },
  { code: "BR", label: "Brazil", region: "South America" },
  { code: "JP", label: "Japan", region: "Asia" },
  { code: "KR", label: "South Korea", region: "Asia" },
  { code: "NG", label: "Nigeria", region: "Africa" },
  { code: "ZA", label: "South Africa", region: "Africa" },
  { code: "AU", label: "Australia", region: "Oceania" }
] as const;

export const coverArtPolicy = {
  allowedExtensions: ["png", "jpg", "jpeg", "gif", "mp4"],
  targetSizeMb: { min: 60, max: 70 },
  minimumDimensions: { width: 3000, height: 3000 },
  preferredDimensions: { width: 3000, height: 3000 }
} as const;

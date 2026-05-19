export const releaseTypes = ["single", "album", "ep", "feature", "deluxe", "remix_pack"] as const;
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

export const releaseVisibilityStates = ["draft", "private", "scheduled", "public", "unlisted", "vault_exclusive"] as const;
export type ReleaseVisibilityState = (typeof releaseVisibilityStates)[number];

export const releaseReadinessAreas = ["metadata", "audio", "artwork", "credits", "visuals", "publishing"] as const;
export type ReleaseReadinessArea = (typeof releaseReadinessAreas)[number];

export const contentReadinessStates = ["not_started", "needs_attention", "in_progress", "ready", "approved", "blocked"] as const;
export type ContentReadinessState = (typeof contentReadinessStates)[number];

export const uploadReadinessStates = ["missing", "partial", "uploaded", "approved", "rejected"] as const;
export type UploadReadinessState = (typeof uploadReadinessStates)[number];

export const lyricReadinessStates = ["not_required", ...uploadReadinessStates] as const;
export type LyricReadinessState = (typeof lyricReadinessStates)[number];

export const backgroundProcessStates = [
  "queued",
  "uploading",
  "processing_audio",
  "optimizing_artwork",
  "generating_waveforms",
  "publishing_release",
  "ready",
  "failed",
  "retry_available"
] as const;
export type BackgroundProcessState = (typeof backgroundProcessStates)[number];

export const publishingStages = ["draft", "ready", "scheduled", "publishing", "published", "syncing", "live"] as const;
export type PublishingStage = (typeof publishingStages)[number];

export const creatorConfidenceStates = [
  "audio_synced",
  "frontend_updated",
  "artwork_optimized",
  "lyrics_published",
  "vault_updated",
  "storage_connected",
  "upload_pipeline_healthy",
  "processing_operational"
] as const;
export type CreatorConfidenceState = (typeof creatorConfidenceStates)[number];

export const mediaOptimizationJobTypes = [
  "thumbnail",
  "responsive_image",
  "optimized_preview",
  "waveform_preview",
  "compressed_delivery",
  "image_optimization",
  "video_optimization"
] as const;
export type MediaOptimizationJobType = (typeof mediaOptimizationJobTypes)[number];

export const mediaDependencySurfaceTypes = [
  "release",
  "track",
  "frontend_page",
  "vault_section",
  "hero_section",
  "audio_visual",
  "background_loop"
] as const;
export type MediaDependencySurfaceType = (typeof mediaDependencySurfaceTypes)[number];

export const systemTagScopes = ["release", "track", "media", "vault", "frontend", "global"] as const;
export type SystemTagScope = (typeof systemTagScopes)[number];

export const futureRoleTypes = ["owner", "admin", "manager", "label", "collaborator", "viewer"] as const;
export type FutureRoleType = (typeof futureRoleTypes)[number];

export const compositionTypes = ["original", "cover", "remix", "public_domain"] as const;
export type CompositionType = (typeof compositionTypes)[number];

export const contributionTypes = [
  "main_artist",
  "primary_artist",
  "featured_artist",
  "remix_artist",
  "vocal_performer",
  "background_vocalist",
  "songwriter",
  "composer",
  "lyricist",
  "producer",
  "co_producer",
  "executive_producer",
  "mixing_engineer",
  "mastering_engineer",
  "recording_engineer",
  "assistant_engineer",
  "graphic_designer",
  "creative_director",
  "visual_designer",
  "label",
  "copyright_owner",
  "publisher",
  "collaborator",
  "engineer",
  "background_vocals",
  "vocal_engineer",
  "music",
  "lyrics",
  "both"
] as const;
export type ContributionType = (typeof contributionTypes)[number];

export const contributorRoleGroups = [
  {
    category: "artist",
    label: "Artist",
    roles: [
      { value: "main_artist", label: "Main Artist" },
      { value: "featured_artist", label: "Featured Artist" },
      { value: "primary_artist", label: "Primary Artist" },
      { value: "remix_artist", label: "Remix Artist" },
      { value: "vocal_performer", label: "Vocal Performer" },
      { value: "background_vocalist", label: "Background Vocalist" }
    ]
  },
  {
    category: "writing",
    label: "Writing",
    roles: [
      { value: "songwriter", label: "Songwriter" },
      { value: "composer", label: "Composer" },
      { value: "lyricist", label: "Lyricist" }
    ]
  },
  {
    category: "production",
    label: "Production",
    roles: [
      { value: "producer", label: "Producer" },
      { value: "co_producer", label: "Co-Producer" },
      { value: "executive_producer", label: "Executive Producer" }
    ]
  },
  {
    category: "engineering",
    label: "Engineering",
    roles: [
      { value: "mixing_engineer", label: "Mixing Engineer" },
      { value: "mastering_engineer", label: "Mastering Engineer" },
      { value: "recording_engineer", label: "Recording Engineer" },
      { value: "assistant_engineer", label: "Assistant Engineer" }
    ]
  },
  {
    category: "creative",
    label: "Creative",
    roles: [
      { value: "graphic_designer", label: "Graphic Designer" },
      { value: "creative_director", label: "Creative Director" },
      { value: "visual_designer", label: "Visual Designer" }
    ]
  }
] as const satisfies ReadonlyArray<{
  category: string;
  label: string;
  roles: ReadonlyArray<{ value: ContributionType; label: string }>;
}>;

export const legacyContributionTypes = [
  "producer",
  "engineer",
  "vocal_engineer",
  "background_vocals",
  "music",
  "lyrics",
  "both"
] as const;

export const genreTaxonomy = [
  {
    category: "hip-hop-rap",
    label: "Hip-Hop/Rap",
    subgenres: [
      { value: "alternative-rap", label: "Alternative Rap" },
      { value: "trap", label: "Trap" },
      { value: "drill", label: "Drill" },
      { value: "boom-bap", label: "Boom Bap" },
      { value: "melodic-rap", label: "Melodic Rap" }
    ]
  },
  {
    category: "r-and-b-soul",
    label: "R&B/Soul",
    subgenres: [
      { value: "alternative-r-and-b", label: "Alternative R&B" },
      { value: "neo-soul", label: "Neo Soul" },
      { value: "contemporary-r-and-b", label: "Contemporary R&B" },
      { value: "soul", label: "Soul" }
    ]
  },
  {
    category: "electronic",
    label: "Electronic",
    subgenres: [
      { value: "ambient", label: "Ambient" },
      { value: "downtempo", label: "Downtempo" },
      { value: "synthwave", label: "Synthwave" },
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
  },
  {
    category: "rock",
    label: "Rock",
    subgenres: [
      { value: "alternative-rock", label: "Alternative Rock" },
      { value: "indie-rock", label: "Indie Rock" },
      { value: "psychedelic-rock", label: "Psychedelic Rock" }
    ]
  },
  {
    category: "latin",
    label: "Latin",
    subgenres: [
      { value: "reggaeton", label: "Reggaeton" },
      { value: "latin-pop", label: "Latin Pop" },
      { value: "urbano-latino", label: "Urbano Latino" }
    ]
  },
  {
    category: "world",
    label: "World",
    subgenres: [
      { value: "afrobeats", label: "Afrobeats" },
      { value: "k-pop", label: "K-Pop" },
      { value: "j-pop", label: "J-Pop" }
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
  { code: "de", label: "German" },
  { code: "nl", label: "Dutch" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "no", label: "Norwegian" },
  { code: "sv", label: "Swedish" },
  { code: "zh", label: "Mandarin" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" }
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
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "mp4", "mov", "webm"],
  helperText: "Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000.",
  targetSizeMb: { min: 0, max: 70 },
  minimumDimensions: { width: 1400, height: 1400 },
  preferredDimensions: { width: 3000, height: 3000 }
} as const;

# Frontend Integration Compatibility

This records the current contract between the public protected experience at `/Users/recharge/artist-platform` and the Control System backend/CMS at `/Users/recharge/2MRRW-Control-System`.

## Current Integration

- The public frontend reads latest releases through `src/lib/control-system/releases.js` using `NEXT_PUBLIC_CONTROL_SYSTEM_API_URL` with the deployed Control System URL as a fallback.
- `src/app/page.js` renders Control System releases in the latest singles/home rail and singles carousel, while retaining hardcoded local singles as fallback content.
- The frontend adapter exposes latest release, singles, albums, and features read functions. Albums/features currently fall back unless backend records include a matching release type.
- The frontend now has a release detail adapter for `GET /api/releases/[slug]`. It enriches modal/player metadata from the backend but keeps existing local media fallback for playable audio/video.
- Backend public release list and detail routes support CORS for the deployed public frontend, Vercel preview URLs, localhost, and `127.0.0.1`. The list route accepts `type=single|album|ep|feature`.
- Target conceptual module mapping is documented in `src/db/schema-docs/target-ecosystem-layout.md`; no disruptive frontend or backend folder moves are recommended yet.

## Frontend Updates Needed

- Release/latest/singles: the frontend can already consume `slug`, `title`, `artist.name`, `releaseDate`, `artwork`, `tracks`, and release playback metadata. The backend should keep returning normalized `ReleaseMediaObject` rows from public release routes.
- Release detail/player: the frontend can read detail metadata and request backend signed media URLs for asset-backed artwork/previews when present, while preserving local preview/audio/video fallback. Keep the AudioContext stable until live storage rows and auth identity are production-aligned.
- Albums/EPs: the frontend has an adapter for album-shaped release objects and safely keeps hardcoded album cards when the backend does not return `releaseType=album|ep` records.
- Media access: backend media objects expose `assetId`, `signedUrlRequired`, `signedUrlEndpoint`, `bucket`, `path`, `kind`, `access`, and `id`; the frontend should not construct Supabase Storage URLs from those fields. It should request signed URLs through backend routes after public-preview or entitlement checks.
- Account/auth/session: the frontend uses guest identity cookies and Supabase-backed account routes; the backend demo routes currently infer `x-user-id` with `user_demo` fallback. A shared session/auth handoff is required before library, vault, or analytics writes are routed to the Control System in production.
- Library/entitlements: frontend library state is slug/product based today. Backend library routes are release/track id based. Add a slug-to-release/product mapping contract or return product slugs alongside release ids before switching the public library UI.
- Vault content: the frontend already supports section-shaped vault content. Backend vault content is currently collection/content/media-object based. Add frontend-facing fields (`category`, `description`, `accessTier`, `cover`, `behavior`, ordering) before swapping the public Vault feed.
- Playback analytics/events: frontend posts `/api/media/playback` with product slug and media type. Backend expects `/api/playback/events` with `trackId`, optional `releaseId`, event type, position, duration, and session id. Add a frontend adapter only after the player always knows backend track ids.
- Storage buckets: legacy frontend downloads use `digital-assets`; the Control System standard is private `protected-media`. Do not add a second release bucket. Migrate downloadable products through backend signed URL routes and keep `digital-assets` only as legacy frontend compatibility until replaced.
- Upload management: Control System admin now owns upload intent cards for singles cover art, albums cover art, audio previews, audio full songs, 2MRRW Signal media/assets, collector card assets, and retained Radio assets. Cover cards accept JPG/JPEG/PNG/GIF/MP4 and reject MOV; previews/full songs accept MP3/WAV. Full songs target 24-bit / 44.1kHz and carry a metadata-probe validation requirement until media probing/transcoding is added. Phone/computer clients request server-created signed upload intents and upload directly to Storage; the public frontend remains read/playback only.
- Circle/community: Control System admin owns Circle operational events for `2MRRW active`, `2MRRW replied`, `2MRRW is live`, `2MRRW highlighted a comment`, and `2MRRW reacted`. The backend exposes admin creation through `/api/admin/circle/events` and safe public read state through `/api/circle/events` so the protected experience can later subscribe/read without becoming the write layer.
- Audio Visuals: Control System admin owns YouTube-based Audio Visual records through `/api/admin/audio-visuals`. Operators paste a YouTube watch, short, youtu.be, embed URL, or iframe source; the backend stores the canonical YouTube URL, stable video id, embed URL, thumbnail URL, optional release/track links, status, publish time, sort order, and metadata. Public frontend reads only published visuals from `/api/audio-visuals` and renders them as YouTube embeds. The protected frontend keeps hardcoded `musicVideos` as fallback when no backend visuals are published or the backend is unavailable.

## Do Not Change Yet

- Do not remove hardcoded public frontend fallback data until backend media URL, release type, product slug, and entitlement contracts are complete.
- Do not redesign the protected experience UI as part of backend integration.
- Do not expose Supabase service keys or storage object paths as durable browser grants.
- Do not move AudioContext to backend playback events until release detail/player metadata includes stable track ids and signed stream URLs.

## Backend Contract Gaps

- Apply live Supabase `protected-media` bucket policies and migration `0004` so signed upload/read flows persist against real media asset rows instead of the current testable service boundary.
- Continue enriching public release objects with price/product slug, purchase/download availability, feature/collaboration metadata, and optional display metadata.
- Define a production auth/session bridge so backend account, library, vault, and playback routes identify the same user as the protected frontend.
- Return frontend-friendly Vault content shape or provide a dedicated public vault adapter route.
- Apply the Circle events migration and connect `/api/circle/events` to persisted rows/realtime dispatch instead of the current in-memory service boundary.
- Persist release-management publishes to Supabase instead of in-memory state before relying on the Control System as the source of truth.
- Apply local migration `0006_audio_visuals_foundation.sql` to the intended Supabase project before relying on persisted Audio Visual records in production. Until then, the route/service boundary and frontend adapter are safe, but live records will not survive serverless/runtime restarts unless the database table exists.

## Recommended Integration Order

1. Keep latest singles and release detail reads behind frontend adapters with local fallback.
2. Add backend signed URL endpoints for public previews and entitled full audio, then teach the frontend player adapter to request them.
3. Add product slug/price and feature/collaboration fields, then let albums/EP/features replace fallback rails through the existing adapter pattern.
4. Align account/session identity, then migrate library and entitlement reads.
5. Move admin upload finalization from in-memory records to live `media_assets` rows, then migrate Vault content and playback analytics after identity and signed media URLs are stable.

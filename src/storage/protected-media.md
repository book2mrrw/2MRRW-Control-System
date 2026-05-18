# Protected Media Storage

Create a private Supabase Storage bucket named `protected-media`. This bucket architecture is shared by both
interfaces: the Control CMS writes/uploads and the public experience reads through service-backed media objects.
Do not create a separate frontend media bucket or hardcode release asset paths in UI components.

Recommended policy posture:

- Do not make the bucket public.
- Browser clients should not receive direct storage object paths as durable access grants.
- Server routes validate entitlement and generate short-lived signed URLs through `src/server/media/signedUrlService.ts`.
- Uploads, replacements, and deletes should happen from admin/server flows. If browser uploads are later introduced, remember Supabase upsert needs `INSERT`, `SELECT`, and `UPDATE` storage policies.
- Log every signed URL decision to `media_access_logs` when wired to the live database.

Required object prefixes:

- `masters/<release-slug>/<track-position>.wav` for full-quality source audio.
- `previews/<release-slug>/<track-position>.mp3` for public-safe preview audio.
- `artwork/<release-slug>/cover.*` for square release artwork and motion covers.
- `loops/<release-slug>/<asset-name>.*` for visualizer loops and short motion assets.
- `vault/<collection-slug>/<asset-name>.*` for membership or collector-gated files.
- `lyrics/<release-slug>/<track-position>.txt` for lyrics/transcript assets.

Current upload intent prefixes use stable backend owner ids so phone, tablet, and desktop uploads can be
created before final public slugs are locked:

- `singles/{releaseId}/cover/...` for singles cover cards. Accepted files: JPG/JPEG/PNG, plus GIF/MP4/MOV when animated or motion covers are enabled.
- `albums/{releaseId}/cover/...` for albums cover cards. Accepted files: JPG/JPEG/PNG, plus GIF/MP4/MOV when animated or motion covers are enabled.
- `previews/{releaseId}/{trackId}/...` for audio previews. Accepted files: MP3/WAV.
- `masters/{releaseId}/{trackId}/...` for full songs. Accepted files: MP3/WAV. Target quality is up to 24-bit with 44.1kHz minimum review; until server-side media probing/transcoding is added, the upload flow enforces extension/MIME and returns a metadata validation requirement.
- `lyrics/{releaseId}/{trackId}/...` for pasted/exported TXT and uploadable PDF/DOCX lyric documents.
- `signal/{signalId}/...` for 2MRRW Signal media/assets while text payloads remain database-backed.
- `radio/{channelId or sessionId}/...` for retained 2MRRW Radio snippets, beds, bumpers, and visual assets.
- `collectors/{collectorId}/...` for collector card artwork/media. Accepted files: JPG/JPEG/PNG/GIF/MP4.
- `vault/{contentId}/...` for protected Vault content assets.

Upload flow:

1. Admin/mobile clients call `POST /api/admin/media/upload-intent` with a category, owner id, filename,
   MIME type, and size. The server validates category-specific limits and creates a short-lived signed
   upload URL for the private bucket.
2. The client uploads bytes directly to Supabase Storage from the phone/computer. Large release assets do
   not proxy through Next.js route handlers.
3. The admin client calls `POST /api/admin/media/upload-complete` with the category and path. The backend
   records the media asset boundary and updates release readiness for cover art, audio, and lyrics when
   applicable.
4. Live deployment still requires the `protected-media` bucket and Storage policies to be applied. Service
   role credentials remain server-only; public clients only receive signed upload/read URLs.

Cover artwork validation policy:

- Helper text must display exactly: “Upload square cover artwork. Minimum size: 1400x1400. Recommended size: 3000x3000.”
- Artwork must be perfectly square.
- Minimum accepted resolution is 1400x1400.
- 3000x3000 is recommended for the highest-quality 2MRRW presentation.
- Accepted cover formats are JPG, PNG, GIF, MP4, MOV, and WEBM. Unsupported formats are rejected before processing.
- File size must be validated against the active upload policy maximum.
- Client upload flows should show live resolution validation, file-size validation, corrupted-file detection via media preview load failure, replace/remove actions, animated previews, motion cover previews, and a fullscreen preview modal.
- Server-side image/video probing is not wired yet. Upload intents return explicit metadata validation requirements, and final review must not claim server probing is complete until a durable probing service records dimensions, square validation, and corruption status.

Read contract:

- Public APIs return normalized media objects from `src/server/media/mediaObjects.ts`.
- Experience-layer clients should render from those objects and request signed URLs when needed.
- Admin write flows should update release rows, track rows, media asset rows, and storage objects in one publish pipeline so new content appears platform-wide without frontend edits.

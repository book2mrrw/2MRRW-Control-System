# Frontend Integration Master Plan

This plan audits the current 2MRRW Control System backend release-management ecosystem and defines a frontend-safe integration path for a separate cinematic public experience. The goal is one shared backend ecosystem with two distinct interfaces: the Control System remains the write, governance, upload, publishing, and operations lane; the public frontend remains the immersive read, playback, Vault, media, and emotional interaction lane.

The frontend must not become a generic dashboard, a CMS clone, or a raw Supabase client. It should consume stable contracts, keep local fallback data during migration, preserve its cinematic identity, and let backend publication replace manual frontend edits only after media, identity, entitlement, and cache contracts are production-aligned.

## Backend Ecosystem Audit

### What Exists

The backend already has a broad release-management foundation:

- Release draft creation, release type validation, track scaffolding, metadata editing, track editing, songwriter profiles, contributor split rows, readiness checks, publish dry-runs, archive/recover/delete-marking, bulk actions, stable slugs, preview links, lifecycle activity, revisions, restore points, content relationships, and frontend metadata contracts.
- Public release read contracts that return normalized release media objects through `/api/releases`, `/api/releases/[slug]`, and `/api/releases/[slug]/media`.
- Admin release-management routes under `/api/admin/releases/manage` for draft lists, draft detail, metadata, tracks, contributions, songwriters, readiness, taxonomies, lifecycle actions, bulk actions, and session continuity.
- Upload intent and upload completion services for direct-to-storage flows into the private `protected-media` bucket, including release artwork, audio previews, full songs, lyrics, Signal assets, Radio assets, collector assets, and Vault assets.
- Media relationship and dependency modeling, delete warnings, media processing job models, structured storage plans, cache invalidation plans, media intelligence profiles, media rights attribution, and cleanup candidate contracts.
- Creator session continuity, draft snapshots, restore messages, mobile background recovery, pending upload recovery, save/sync state, local/cloud persistence state, and calm recovery copy.
- Contributor directory memory, metadata suggestions, previous release settings prompts, seeded 2MRRW contributor profiles, and frontend-facing metadata/credit contracts.
- Audio Visuals management for YouTube embeds, including admin writes, public reads, publish status, release/track links, sort order, thumbnails, and Supabase persistence fallback.
- Circle/community event foundations, Signal state, Radio sessions/feed/interactions, notifications, library state, account state, memberships, Stripe entitlement grants, playback progress, playback events, and analytics events.
- Supabase migrations for base catalog, RLS hardening, release management, Circle events, Audio Visuals, and Creator OS hardening.
- Health and safety checks for required environment variables, Supabase server key availability, expected tables, production dry-run posture, observability events, feature flags, rate limits, graceful degradation, rollback plans, and platform boundaries.

### What Is Incomplete

Several systems are contract-complete but not yet durable enough for the cinematic frontend to fully depend on:

- Release-management drafts, lifecycle records, upload queue state, session continuity, contributor memory, analytics, playback state, library state, and some community/radio/signal flows are still in memory or seed-backed in service code.
- Local migrations define durable tables, but the docs explicitly treat key migrations as local-only until applied to the intended Supabase project.
- Publish currently propagates draft data into an in-memory shared catalog and synthesizes artwork/audio asset paths rather than persisting full release, track, media, product, and cache state in Supabase.
- Upload completion records managed media assets in a service boundary and updates readiness, but it does not yet write durable `media_assets`, `media_variants`, processing job output, or media probe results across all categories.
- Server-side media probing/transcoding is not wired. Artwork square validation, dimensions, corruption checks, waveform extraction, preview generation, responsive derivatives, and audio quality validation are modeled but not completed.
- Frontend metadata contracts include credits, genres, readiness, tags, and tracks, but lyrics text, engineered credits, creative credits, price/product slugs, release detail display fields, Vault card fields, and final playback URLs need more complete contracts before full replacement of local frontend data.
- Auth/session alignment is temporary. Routes infer `x-user-id` with a demo fallback, and admin writes use an `x-admin` header. Production needs shared identity, role checks, session validation, and route-level authorization.
- CORS and public read origin rules exist for specific read routes, but every frontend-consumed endpoint needs a consistent public origin policy, cache policy, and error shape.

### What Is Missing

The following pieces are needed before the frontend can safely become fully backend-driven:

- A durable publish transaction that writes release rows, track rows, contributor rows, media asset rows, product mappings, release relationships, search documents, cache tags, and publish events together.
- A frontend contract route that returns the complete release page shape in one request: hero, artwork, motion cover, audio preview, full audio entitlement state, tracklist, lyrics state, credits, contributors, producer notes, related releases, Vault links, visuals, scheduling state, analytics counters, and graceful fallback instructions.
- A dedicated Vault public adapter shape with category, description, access tier, cover/media object, behavior, ordering, cinematic display hints, and entitlement messaging.
- Product slug and price mapping on release/media contracts so library, purchase, collector, and entitlement UI can connect without slug guessing.
- Signed URL read flows for previews, entitled full audio, lyrics, Vault media, artwork, loop videos, and derivatives that are consistent across desktop, tablet, and app clients.
- A real async processing worker or queue for media derivatives, probes, waveform JSON, image crops, mobile/desktop variants, cache invalidation, search indexing, and publish propagation.
- Realtime or polling contracts for draft save state, upload progress, processing progress, publish state, and frontend sync status.
- A state version or ETag model for release contracts so the frontend can preserve animation continuity while detecting stale content.
- A migration and seed verification checklist for Supabase environments, including RLS policy confirmation and storage bucket policy confirmation.

### Redundancies And Conflicts

- Release type support is broader in TypeScript than in the release-management migration check. Service code supports `single`, `album`, `ep`, `deluxe`, and `remix_pack`; one migration constrains releases to `single`, `album`, and `ep`. Align the database with the service taxonomy before persisting deluxe/remix workflows.
- Cover artwork policy differs by document and service in places. The upload service accepts JPG, JPEG, PNG, GIF, MP4, MOV, and WEBM; older docs mention a narrower set. The canonical policy should be the upload service plus storage documentation.
- Public release read routes already support a `feature` filter, but core database release type constraints do not yet support feature as a persisted release type. Treat `feature` as reserved until collaboration metadata exists.
- Public media contracts require signed URLs even for public-safe previews/artwork. That is a good security posture, but frontend adapters must not assume `access: public` means direct storage URL access.
- Current catalog publication generates canonical media paths from release slug and track position, while upload intent paths use release and track IDs. A publish promotion step must reconcile draft upload paths into public canonical paths or store both source and delivery variants explicitly.
- Health checks reference some legacy or future table names that do not all match the current migrations. Use the health route as an operational checklist, but align table names before enforcing it as a deployment gate.

### Scalable Foundations

The strongest existing foundations are the service boundaries:

- Thin HTTP route handlers delegate to typed server services.
- Public read services and admin write services share release/media/account/playback contracts.
- Media object contracts isolate the frontend from raw Supabase paths.
- Lifecycle services already model readiness, previews, relationships, restore points, cache invalidation, observability, rollback, platform boundaries, design governance, and graceful degradation.
- Upload intent flows avoid proxying large media through Next.js route handlers.
- Supabase RLS is enabled broadly, with server-only writes for sensitive systems.

These should be preserved and hardened rather than replaced.

## Relationship Map

The ecosystem should treat every content object as a typed node with explicit relationships:

- Release nodes: single, album, EP, deluxe, remix pack, feature/collaboration, archive, scheduled release, published release.
- Track nodes: ordered under releases, linked to preview audio, full audio, lyrics, loop visuals, contributors, producers, playback analytics, and entitlement state.
- Contributor nodes: primary artist, featured artist, producer, engineer, songwriter, publisher, label, creative director, visual designer, background vocalist, collaborator.
- Media nodes: artwork, motion cover, hero image/video, audio preview, full audio master, waveform, lyrics file/text, visual loop, Vault asset, collector asset, Signal asset, Radio asset, YouTube Audio Visual.
- Surface nodes: home hero, release page, track page, lyrics page, Vault section, player modal, audio visual section, carousel rail, library item, preview page, mobile card, tablet immersive panel.
- Governance nodes: readiness state, visibility state, publishing stage, scheduled publish time, timezone, restore point, revision, activity, cache invalidation plan, rollback plan, observability event.
- Engagement nodes: playback progress, stream analytics, valid stream count, library save, entitlement grant, Vault progress, Circle event, Signal interaction, Radio session.

Recommended relationship edges:

- Single to album: single is a child or lead track of a later album, preserving the single page while linking the album moment.
- Deluxe parent: deluxe release inherits base album context but owns its own track ordering, artwork variants, Vault bonuses, and hero timing.
- Alternate version/remaster: alternate tracks link to source tracks without overwriting analytics or saved-library state.
- Visual for: Audio Visual records, loop videos, and hero visuals can attach to release or track nodes.
- Vault bonus for: Vault content links to release or track nodes while retaining entitlement gating.
- Hero priority: one content node per frontend surface should own lead priority to avoid competing hero states.

## Frontend Integration Architecture

Use an adapter-first architecture with three layers:

1. Backend contract layer: Control System routes return stable JSON contracts with media objects, signed URL endpoints, relationship graphs, readiness states, and sync metadata.
2. Frontend adapter layer: the cinematic frontend maps backend contracts into its existing local component props, player model, Vault model, hero sections, rails, and animation states.
3. Experience layer: existing cinematic components render the same visual rhythm, hover behavior, blur language, transitions, and immersive pacing whether data is local fallback or backend-sourced.

Do not let backend contracts dictate visual structure. The backend should describe content and media state; the frontend should decide pacing, composition, motion, and emotional hierarchy.

## API Relationship Mapping

Current public-safe routes:

- `GET /api/releases`: latest releases, optional release type filter, normalized release media objects.
- `GET /api/releases/[slug]`: release detail media object.
- `GET /api/releases/[slug]/media`: media assets for a release.
- `GET|POST /api/media/[assetId]/signed-url`: short-lived media access.
- `GET /api/audio-visuals`: published YouTube visual records.
- `GET /api/audio-visuals/[slug]`: published visual detail.
- `GET /api/account/state`: profile, entitlements, library, playback, notifications, permissions.
- `GET|POST /api/library`: saved release/track reads and writes.
- `POST /api/playback/events`: playback event, progress, and valid-stream analytics.
- `POST /api/playback/progress`: progress updates.
- `GET /api/playback/player-state`: queue, progress, active sessions, recently played.
- `GET /api/vault/content`: entitlement-filtered Vault items.
- `POST /api/vault/content/[id]/media`: gated Vault media lookup.
- `POST /api/analytics/events`: generic event ingestion.
- `GET /api/circle/events`, `GET /api/signal/active`, `POST /api/signal/state`, and Radio routes for adjacent experience systems.

Current admin/control routes:

- `/api/admin/releases/manage` for draft list/create.
- `/api/admin/releases/manage/[id]` for draft detail.
- `/api/admin/releases/manage/[id]/metadata` for metadata patching.
- `/api/admin/releases/manage/[id]/tracks/[trackId]` for track patching.
- `/api/admin/releases/manage/[id]/contributions` and `/songwriters` for rights/credits.
- `/api/admin/releases/manage/[id]/readiness` for publish readiness.
- `/api/admin/releases/manage/[id]/session` for session continuity and restore.
- `/api/admin/releases/manage/[id]/actions` for archive, recover, undo, dry-run, deletion mark, visibility.
- `/api/admin/releases/manage/bulk` for multi-release operations.
- `/api/admin/media/upload-intent` and `/api/admin/media/upload-complete` for direct upload flows.
- `/api/admin/media/[assetId]/relationships` for dependency graph and delete warnings.
- `/api/admin/audio-visuals` and publish/detail routes for YouTube visual records.
- `/api/release-management/health` for environment and database readiness.

Required new or expanded frontend contract routes:

- `GET /api/frontend/releases/[slug]/experience`: complete release page contract with hero, artwork, audio, tracks, credits, lyrics, visuals, Vault links, related content, entitlement, animation hints, and cache metadata.
- `GET /api/frontend/home`: home hero, latest singles, albums, EPs, features, Vault highlights, Audio Visuals, and fallback flags.
- `GET /api/frontend/vault`: Vault card contract with access tier, cover object, behavior, ordering, cinematic display metadata, and signed media request links.
- `GET /api/frontend/player/track/[trackId]`: player-ready track contract with signed preview/full URL eligibility, artwork, waveform, lyrics state, adjacent tracks, and analytics IDs.
- `POST /api/frontend/sync/events`: cache-safe frontend sync acknowledgement and client-side rendering telemetry.

## Synchronization Blueprint

Publish must become a staged sync pipeline:

1. Draft save: metadata, tracks, credits, uploads, scheduling, relationships, and session state persist independently.
2. Readiness: backend computes readiness vectors and blocks publish when metadata, artwork, audio, credits, lyrics, or scheduling are incomplete.
3. Dry-run: route checks, entitlement checks, media dependency checks, cache plan, search plan, preview links, and rollback plan are generated.
4. Publish transaction: release, tracks, contributors, media assets, products, relationships, visibility state, scheduled publish time, and activity events are written together.
5. Processing: media probes, derivatives, waveform, thumbnails, mobile crops, desktop crops, previews, and cache tags move through async job states.
6. Frontend sync: cache invalidation, search indexing, route revalidation, preview verification, and live contract versioning complete.
7. Confirmation: Control System shows a calm synced state, and frontend adapters read the updated contract without manual code edits.

Each release contract should expose:

- `contractVersion`
- `updatedAt`
- `publishedAt`
- `scheduledPublishAt`
- `visibilityState`
- `readiness`
- `syncState`
- `cacheTags`
- `mediaVersion`
- `fallbackPolicy`
- `signedUrlRequired`

## Shared State Blueprint

Shared state should be split by ownership:

- Backend-owned: release metadata, release relationships, publishing state, media paths, signed URL authorization, entitlements, products, library grants, contributor credits, readiness, upload progress, processing state, Vault access, analytics ingestion.
- Frontend-owned: animation state, hover state, viewport choreography, reduced motion preferences, local player UI state, modal visibility, immersive scroll timing, route transition pacing, client-side fallback selection.
- Shared but mediated: playback progress, library saves, active session IDs, recently played, preview selection, analytics event IDs, signed URL expiration, cache freshness.

The frontend should keep a local state machine that can render backend contracts without jarring transitions:

- `fallback`: local hardcoded content is active.
- `hydrating`: backend contract is loading behind existing visuals.
- `contract-ready`: backend content is ready but animations keep current layout stable.
- `media-resolving`: signed URLs are requested lazily.
- `playing`: audio or visual media is active.
- `stale`: cached content remains visible while a newer contract is fetched.
- `degraded`: backend route failed, local fallback remains polished.

## Frontend Rendering Blueprint

Backend data should map into cinematic surfaces rather than generic cards:

- Home hero: one priority release or visual, motion cover or artwork, short metadata, slow reveal timing, blur-backed depth, and signed preview readiness.
- Latest singles rail: release media objects adapted into existing single tiles with current hover, scale, focus, and audio preview behavior.
- Album/EP rail: release type filters feed existing album layouts only when backend records include complete artwork, track counts, and product mapping.
- Release detail: backend title, artist, release date, track list, credits, artwork, media availability, and related visuals hydrate the current modal/page structure.
- Player modal: uses stable track IDs, preview/full asset IDs, signed URL endpoints, waveform derivatives when ready, and local fallback audio until full backend stream URLs are trustworthy.
- Lyrics page: renders lyrics contract or gated lyric asset state; does not depend on raw storage paths.
- Vault: uses backend entitlement and media objects, but keeps the Vault experience immersive: locked states should feel like cinematic permissions, not SaaS upsell boxes.
- Audio Visuals: YouTube embeds remain visually integrated with frontend pacing; backend only supplies canonical embed metadata and publish order.
- Hero sections: `homepage_hero` priority can choose lead content, but frontend owns layout, transition, blur, and scroll choreography.

## Cross-Platform Continuity Blueprint

Desktop, tablet, mobile web, and future app clients should consume the same content contracts with device-specific rendering:

- Desktop: full hero media, hover previews, wide metadata panels, right-side context, richer waveform and related media.
- Tablet: larger touch targets, fewer simultaneous panels, swipe-friendly rails, preserved blur depth, simplified hover substitutes.
- Mobile web: immediate load, compact hero, signed preview on tap, reduced panel density, mobile artwork crops, resilient draft/session recovery for admin mobile uploads.
- App: same API contracts, stricter offline cache, native media session integration, background playback state, push notifications, and resumable uploads only for admin tools.

Contracts should include responsive media variants but not layout instructions that override the frontend’s visual identity.

## Media Orchestration Blueprint

The `protected-media` bucket should remain the only durable media bucket for the integrated ecosystem. The frontend should never construct public Supabase URLs.

Media lifecycle:

1. Admin requests upload intent.
2. Client uploads directly to private storage.
3. Admin confirms upload completion.
4. Backend records managed asset, dependency, rights, processing jobs, and cache plan.
5. Processing creates derivatives and records probe metadata.
6. Public contract exposes media objects and signed URL endpoints.
7. Frontend requests signed URLs just-in-time.
8. Player or visual component renders while tracking playback and analytics.

Required derivative lanes:

- Artwork: source, mobile crop, desktop crop, thumbnail, color/contrast metadata, square validation, motion cover preview.
- Audio: source master, preview, waveform JSON, loudness/quality metadata, duration, corruption state.
- Lyrics: text contract, document asset, language, sync timing when available.
- Visuals: loop source, thumbnail, mobile variant, desktop variant, Audio Visual embed metadata.
- Vault: cover media, protected asset, preview state, entitlement reason, ordering, behavior.

## Release Workflow Blueprint

Recommended release flow:

1. Create release draft by type: single, album, EP, deluxe, remix pack, or future feature.
2. Enter core metadata: title, slug, language, label, copyright, publisher, genres, mood, references, tags, timezone.
3. Add tracks and contributors: titles, explicit state, ISRC, producers, songwriters, engineers, split totals, publishing metadata.
4. Upload media: cover/motion cover, previews, full audio, lyrics, loops, Vault assets, collector assets if applicable.
5. Link relationships: single-to-album, deluxe parent, visual-for, Vault bonus, alternate version, hero priority.
6. Review readiness and frontend previews across desktop, mobile, lyrics, Vault, and cinematic transition targets.
7. Run publish dry-run and resolve warnings.
8. Schedule or publish.
9. Process derivatives and sync frontend contracts.
10. Monitor analytics, media access, cache health, and rollback availability.

## Analytics Integration Blueprint

Frontend analytics should be meaningful without becoming noisy:

- Playback events: play, pause, progress, complete, skip, position, listened seconds, duration, country, session ID.
- Valid stream analytics: backend threshold currently models valid streams at 30 seconds.
- Release interactions: hero reveal, preview play, artwork expand, track select, lyrics open, Vault entry, Audio Visual play, related release click.
- Library events: save release, save track, entitlement unlock, download request.
- Media health: signed URL failures, media load errors, fallback used, stale contract rendered, player recovery.
- Motion performance: route transition duration, dropped interaction frames, reduced motion use, media load timing.

Analytics should feed Control System insight surfaces without changing the frontend’s emotional pacing. Instrumentation must be quiet, batched where reasonable, and resilient to offline or degraded states.

## Mobile, Tablet, And App Optimization Blueprint

- Prioritize signed preview URL resolution only after user intent on mobile.
- Preload artwork thumbnails and low-weight motion previews; avoid eager full audio or large Vault files.
- Use responsive media variants from backend processing.
- Keep touch targets comfortable without flattening the visual hierarchy.
- Replace hover-only states with press, focus, and scroll-based reveals.
- Preserve cinematic transitions with reduced-motion support.
- Use contract versioning and cache freshness so route transitions do not visibly swap content mid-animation.
- Support mobile admin upload recovery through draft session snapshots and pending upload IDs.
- Keep app clients on the same contracts with native media-session and offline cache policies layered above the API.

## Operational Resilience Blueprint

Backend resilience requirements:

- Apply and verify all intended Supabase migrations in the target environment.
- Confirm private storage bucket and policies before enabling live upload/read flows.
- Replace demo `x-user-id` and `x-admin` behavior with production auth, session validation, and role enforcement.
- Persist draft, lifecycle, upload, analytics, playback, library, Vault, and publish state.
- Add media worker processing and retry handling.
- Add route-level cache tags, invalidation records, and contract versioning.
- Add observability events for upload, processing, frontend sync, analytics, search, and API.
- Add rollback plans for failed publish, failed frontend sync, failed media processing, entitlement regression, and cache corruption.
- Keep frontend fallback active until production data proves stable over multiple releases.

Frontend resilience requirements:

- Never blank a cinematic surface because a backend route failed.
- Keep local fallback content until a backend contract has complete visual, media, and entitlement data.
- Use stale-while-refresh behavior during route transitions.
- Lazy request signed URLs and handle expiration gracefully.
- Show media fallback using existing immersive design, not generic error panels.
- Respect reduced motion and media data saver constraints.

## UI And UX Preservation Blueprint

The public frontend’s identity must remain intact:

- Keep cinematic transitions and route choreography owned by the frontend.
- Preserve Apple-inspired polish: restraint, hierarchy, tactile motion, crisp typography, and quiet depth.
- Keep hover systems and immersive media previews, with mobile equivalents.
- Preserve blur systems, layered depth, and visual rhythm.
- Keep Vault experiences emotionally distinct: protected, intimate, and media-forward.
- Avoid generic dashboard cards, admin tables, SaaS badges, CRUD layouts, and dense operational copy.
- Use backend readiness and entitlement states as subtle visual cues, not administrative labels.
- Let release relationships create narrative flow: single to album, album to deluxe, track to visual, release to Vault bonus.
- Keep media immersion first. Metadata supports the experience; it should not dominate the screen.
- Preserve animation integrity by hydrating contracts behind stable layouts and avoiding abrupt DOM reshapes.

## Frontend-Safe Integration Strategy

1. Keep all frontend work behind adapters. Do not wire components directly to raw backend routes.
2. Keep local fallback arrays and local media until each backend contract is complete and production-authenticated.
3. Introduce backend data surface by surface: latest singles, detail metadata, audio visuals, signed preview URLs, albums/EPs, library, Vault, analytics, full player.
4. Use contract completeness gates before replacing any frontend section.
5. Keep all Control System edit state out of the frontend.
6. Never expose service role keys, raw private storage paths as grants, or admin write routes to the public frontend.
7. Add cross-origin, auth, cache, and error-shape consistency before app-wide adoption.
8. Use feature flags per surface so the frontend can roll back to local fallback without redeploying content.

## Remaining Risks And Gaps

- Live Supabase persistence is not fully applied or verified for the release-management hardening layer.
- In-memory service state will reset in serverless/runtime contexts.
- Auth and admin authorization are demo-grade.
- Release type taxonomy conflicts must be resolved before durable persistence.
- Media path promotion from draft upload IDs to public delivery slugs is not fully defined.
- Server-side media probing, transcoding, derivative generation, and waveform extraction are missing.
- Entitlement, product slug, and price contracts are incomplete for frontend commerce/library transitions.
- Vault public adapter shape is too sparse for the cinematic frontend.
- Analytics are in-memory and need durable aggregation.
- Cache invalidation is modeled but not executed against route caches/CDN.
- Health checks should be aligned with actual migration table names.
- CORS policy needs consistent coverage across all frontend-facing routes.

## Recommended Implementation Order

1. Backend contract hardening: align taxonomies, resolve table-name health checks, apply migrations in a safe environment, and confirm RLS/storage policies.
2. Persistence pass: persist drafts, lifecycle state, upload completions, media assets, release relationships, analytics, playback, library, Vault, and Circle/Audio Visual records.
3. Publish pipeline: replace in-memory publish propagation with a durable staged transaction plus dry-run, cache plan, rollback plan, and frontend contract version.
4. Media processing: implement probing, dimensions, audio metadata, derivatives, waveform, thumbnails, responsive crops, and retry queues.
5. Frontend read contracts: add home, release experience, Vault, and player contract routes.
6. Adapter integration planning for the cinematic frontend: map contracts to existing props while retaining fallback.
7. Surface-by-surface frontend adoption: latest singles, detail modal, Audio Visuals, signed previews, albums/EPs, Vault, library, analytics, full player.
8. Production resilience: observability, cache invalidation, rollback drills, auth/session hardening, app/mobile policies.

## Phase 2 Scaling Recommendations

- Add a dedicated publish orchestration service with idempotency keys and durable state transitions.
- Add a media processing worker with queue persistence, retry policies, and derivative manifests.
- Add contract snapshots for frontend previews so artists can compare desktop, mobile, lyrics, Vault, and hero routes before publishing.
- Add search indexing as a first-class sync step.
- Add product and entitlement contract expansion for release bundles, collector drops, Vault memberships, and track-level grants.
- Add analytics aggregation tables for daily streams, valid streams, countries, saves, release opens, media failures, and Vault engagement.
- Add release relationship editor for single-to-album, deluxe, alternate version, visual-for, and Vault bonus links.
- Add frontend contract validation tests that assert no raw private storage paths are required by public clients.

## Phase 3 Ecosystem Evolution Recommendations

- Move toward a content graph where releases, tracks, contributors, media, visuals, Vault items, products, analytics, and frontend surfaces are queryable as connected entities.
- Add realtime publish/status channels for Control System operators and app clients.
- Add native app contracts for offline playback cache, media session controls, push notifications, and background progress sync.
- Add personalization rules for Vault highlights, release moments, hero priority, and Radio/Signal intersections while keeping artist intent central.
- Add editorial governance for cinematic surface ownership so one release, visual, Vault item, or collector moment owns each major frontend beat.
- Add content version history that can power public-facing anniversary editions, deluxe timelines, remasters, and alternate visual worlds without losing the original release identity.

## Final Position

The backend is already shaped like a strong Creator OS foundation, but the frontend should integrate only through stable, durable, media-aware contracts. The safest path is not a visual rebuild. It is a contract hardening and adapter migration that lets the public experience remain cinematic, polished, immersive, and emotionally paced while the Control System becomes the reliable source of truth for releases, media, contributors, publishing, analytics, and protected access.

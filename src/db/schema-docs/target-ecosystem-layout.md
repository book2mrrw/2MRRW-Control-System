# Target Ecosystem Layout

The platform should keep one ecosystem with two interfaces:

- `2mrrw-frontend` is the protected public experience. It reads published data, plays media, shows Vault/community surfaces, and records listener interactions.
- `2mrrw-control-system` is the backend/CMS control interface. It writes release, media, publishing, analytics, entitlement, and dashboard state into shared Supabase services.

Both interfaces connect to the same Supabase Database/Auth/Storage/Realtime/Edge Functions posture. The frontend should not require hardcoded edits when the Control System publishes new singles, albums, EPs, features, Vault items, or entitlement changes.

## Control System Modules

The requested conceptual layout maps to the current implementation without moving files yet:

- `dashboard`: current shell and dashboard UI in `src/app/page.tsx` and `src/components/control/*`.
- `release-manager`: draft/release management services in `src/server/release-management/*`, release read/write boundaries in `src/server/releases/*`, and admin release routes under `src/app/api/admin/releases/manage/*`.
- `analytics`: event and stream analytics in `src/server/analytics/*` plus analytics ingestion routes under `src/app/api/analytics/*` and playback event routes under `src/app/api/playback/*`.
- `publishing`: readiness checks, publish actions, scheduled visibility, and release propagation in `src/server/release-management/*`, `src/server/releases/releaseWriteService.ts`, and `src/app/api/admin/releases/[id]/publish`.
- `entitlements`: account permissions, library grants, memberships, and product grants in `src/server/account/*`, `src/server/entitlements/*`, `src/app/api/library`, and checkout/webhook routes.
- `media-management`: normalized media objects, media access, signed URLs, and storage policy docs in `src/server/media/*`, `src/app/api/media/[assetId]/signed-url`, `src/app/api/releases/[slug]/media`, and `src/storage/protected-media.md`.

## Frontend Conceptual Modules

The requested frontend layout also maps to current files without a physical reorganization:

- `app`: current App Router shell and main protected experience in `src/app/page.js`, `src/app/layout.js`, and local frontend API routes.
- `components`: reusable UI exists under `src/components/*`.
- `player`: playback state and modal player live in `src/context/AudioContext.js` and `src/components/media/ModalAudioPlayer.js`.
- `vault`: Vault UI lives inside `src/app/page.js`; frontend Vault API routes live under `src/app/api/vault/*`.
- `streaming`: playback persistence is currently `src/app/api/media/playback/route.js`; backend-aligned playback will target Control System `/api/playback/events`.
- `community`: community routes live under `src/app/api/community/*`; community UI is currently embedded in `src/app/page.js`.

## Reorganization Guidance

Do not physically move the frontend folders in the current integration phase. The protected experience is large and working, and moving files would increase routing/import risk without improving the backend data contract. Prefer thin read adapters first, then incremental component extraction after release, media, account, and entitlement contracts are stable.

Do not physically move backend folders yet either. The current `src/server/*` and `src/app/api/*` layout already separates service ownership from HTTP routes. Use documentation and optional barrel modules to clarify conceptual ownership until the contracts are stable enough for a structural migration.

## Dynamic Data Contract Direction

- Control System publishes normalized release media objects.
- Frontend reads via `src/lib/control-system/releases.js` adapters.
- Public release reads support `type=single|album|ep|feature`; `feature` is reserved until the backend stores feature/collaboration metadata.
- Frontend keeps local fallback arrays until signed media URLs, product slugs/prices, release type, and entitlement/session contracts are complete.

# Control System — Studio API access

Creator Studio (`CreatorReleaseSystem`) calls same-origin `/api/admin/*` routes from the browser. Those routes use **`requireStudioAccess`**, which allows:

1. **Same-origin browser requests** (`Sec-Fetch-Site: same-origin`) — no client token required in production.
2. **`CONTROL_SYSTEM_ADMIN_API_KEY`** via `x-admin-token` or `Authorization: Bearer …` — for scripts and automation.
3. **Local dev** without a key: `x-admin: true` header still works when `NODE_ENV !== "production"`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes (prod) | Catalog + media persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Server-side reads/writes |
| `CONTROL_SYSTEM_ADMIN_API_KEY` | Optional | External admin API access; not needed for Studio UI |
| `CONTROL_SYSTEM_ALLOWED_ORIGINS` | Optional | CORS for public frontend APIs |

## Studio release actions

| Action | Route |
|--------|--------|
| Publish | `POST /api/admin/releases/[id]/publish` |
| Unpublish | `POST /api/admin/releases/manage/[id]/actions` `{ "action": "unpublish" }` |
| Archive | `…/actions` `{ "action": "archive" }` |
| Recover | `…/actions` `{ "action": "recover" }` |
| Duplicate | `…/actions` `{ "action": "duplicate" }` |
| Sync frontend | `POST /api/admin/releases/manage/[id]/sync` |
| Catalog refresh | `GET /api/admin/catalog` |

Publish failures return **409** with readiness `checks[]` (metadata, cover_art, audio, etc.). Studio shows these as a checklist in the banner — there is no force-publish bypass.

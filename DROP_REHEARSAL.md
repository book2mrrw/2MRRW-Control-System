# Drop rehearsal — scheduled release go-live

Rehearse the full path before a real drop. Use a **non-production** release slug when possible, or `w2d` / `artificial` in a maintenance window.

## Prerequisites

- `CRON_SECRET` in Vercel Production (see `MEGA_GO_LIVE_CHECKLIST.md`)
- `vercel env pull .env.local` **or** copy `CRON_SECRET` from Vercel dashboard (pull often redacts secrets)
- Scripts: `./scripts/trigger-scheduled-cron.sh`

## Steps

| Step | Action | Expected |
|------|--------|----------|
| 1 | In Media Control Room, open release → **Metadata** → schedule **30+ min** future (timezone + AM/PM) | Save succeeds; DB: `status=scheduled`, `scheduled_publish_at`, `release_time`, `publish_timezone` |
| 2 | Refresh `/media` Singles/Albums/Features carousel | Badge **Scheduled**; countdown pill if implemented |
| 3 | `curl` public API | Release **absent** from `/api/public/releases` |
| 4 | Wait until `scheduled_publish_at` **or** run `./scripts/trigger-scheduled-cron.sh` | Cron JSON: `{"due":1,"results":[{"ok":true,"status":"published"}]}` |
| 5 | Re-check public API | Release **present** with `status=published` |
| 6 | Re-check `/media` | Badge **Live** |
| 7 | artist-platform (optional) | Release card visible with cover from control API |

## Hobby vs 5-minute precision

| Mode | How |
|------|-----|
| **Vercel Pro** | `vercel.json` cron `*/5 * * * *` + redeploy |
| **Hobby** | Daily `0 6 * * *` **or** GitHub Action `.github/workflows/scheduled-releases.yml` (every 5 min) **or** manual `./scripts/trigger-scheduled-cron.sh` at drop time |

## Rollback

- Unpublish in studio (More actions → Unpublish) — persists `draft` in DB after migration `0018`
- Or set `status=published` again after rehearsal

## Health

```bash
curl -sS https://2mrrw-control-system.vercel.app/api/health | jq .
```

Look for `"status":"ok"`, `catalog.publishedReleases`, and `storage` not stuck on fallback-only if bucket backfill completed.

## Rehearsal log (2026-05-19)

| Step | Result |
|------|--------|
| Schedule `artificial` (due in past) | Public API 8/9 |
| GitHub Action `scheduled-releases.yml` | `artificial` → `published`, public API 9/9 |
| `/media` | **Live Artificial** badge |

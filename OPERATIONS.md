# 2MRRW Control System — Operations

One-page reference for day-to-day ops and drop night. Production: **https://2-mrrw-control-system.vercel.app**

## Where secrets live

| Secret | Location | Used by |
|--------|----------|---------|
| `CRON_SECRET` | Vercel Production env | `/api/cron/scheduled-releases`, `/api/admin/ops/backfill-covers`, GitHub Action `scheduled-releases.yml` |
| `CONTROL_SYSTEM_URL` | GitHub repo secret | `https://2-mrrw-control-system.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Production | DB + Storage writes |
| `CONTROL_SYSTEM_ADMIN_API_KEY` | Vercel (optional) | `x-admin-token` for scripted admin calls |

`vercel env pull` **redacts** sensitive values — copy `CRON_SECRET` from the Vercel dashboard into local `.env.local` for `./scripts/trigger-scheduled-cron.sh`.

**Rotate `CRON_SECRET` quarterly** (or if leaked): Vercel → redeploy → update GitHub secret `CRON_SECRET`. Do not rotate casually.

## Cron: Vercel vs GitHub

| Layer | Schedule | Role |
|-------|----------|------|
| **Vercel Hobby** | `0 6 * * *` (daily 06:00 UTC) | Catches due releases once per day |
| **GitHub Actions** | Every 5 min (`scheduled-releases.yml`) | **Primary** for precise drops on Hobby |
| **Manual** | `./scripts/trigger-scheduled-cron.sh` | Drop-time backup / rehearsal |

Upgrade to **Vercel Pro** only if you want platform cron at `*/5 * * * *` instead of GitHub.

## Daily ops

```bash
curl -sS https://2-mrrw-control-system.vercel.app/api/health | jq .
# Expect: status ok, publishedReleases ≥ 1, storage usesFallback false for sample
```

- **Media Control Room:** https://2-mrrw-control-system.vercel.app/media  
- **Public catalog sanity:** `GET /api/public/releases` (published only)  
- **GitHub:** Actions → “Scheduled releases cron” / “Production health check” should be green  

## Drop night checklist

1. Release **ready** in studio (metadata, cover, audio) — readiness API shows blockers cleared.  
2. **Schedule** future date/time + timezone in Metadata.  
3. Confirm **Scheduled** badge + countdown on `/media`; release **absent** from `/api/public/releases`.  
4. At drop time: rely on **GitHub 5-min cron** or run `./scripts/trigger-scheduled-cron.sh`.  
5. Confirm cron JSON: `{"due":1,"results":[{"ok":true,"status":"published"}]}`.  
6. Confirm **Live** badge + release in public API + artist-platform cards.  

Full walkthrough: **`DROP_REHEARSAL.md`**.

## Troubleshooting

| Symptom | Check | Fix |
|---------|--------|-----|
| **Sync error** badge | `/api/admin/sync-state`, studio session | Re-save release; check `schedule_last_error` in DB |
| Scheduled never goes live | GitHub Action runs; `CRON_SECRET` matches Vercel | Re-sync secret; manual `trigger-scheduled-cron.sh` |
| Cron 401 | Bearer token | Update `CRON_SECRET` on Vercel + GitHub |
| Cover 502 / missing | `/api/health` storage | `POST /api/admin/ops/backfill-covers` with Bearer `CRON_SECRET` |
| “Release draft not found” in API | Cold serverless | Fixed via catalog hydration on schedule/readiness routes |

## Useful commands

```bash
./scripts/trigger-scheduled-cron.sh
./scripts/gh.sh run list --workflow=scheduled-releases.yml --limit=3
npm run verify && npm run build
npm run backfill:covers   # local only; needs real SUPABASE_SERVICE_ROLE_KEY in .env.local
```

## Related docs

- `MEGA_GO_LIVE_CHECKLIST.md` — go-live history  
- `EDGE_CASE_VERIFICATION.md` — verification matrix  
- `DROP_REHEARSAL.md` — rehearsal script  

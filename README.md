# 2MRRW / Tomorrow Control System Backend

Backend-first foundation for the official Control System.

## Implemented Surface

- Route-backed operational CMS:
  - `/dashboard`
  - `/releases`, `/releases/new`, `/releases/drafts`, `/releases/scheduled`, `/releases/published`, `/releases/[releaseId]`
  - `/tracks/[trackId]`, `/tracks/[trackId]/information`
  - `/media`, `/media/artwork`, `/media/audio`, `/media/videos`, `/media/loops`
  - `/visuals`, `/vault`, `/analytics`, `/identity`, `/commerce`, `/notify`, `/audit`, `/signal`, `/circle`, `/settings`
- Root `/` redirects to `/dashboard`; the Control System is an operational app entry point, not a scroll landing page.
- Release wizard routes cover basic release information, track information, songwriter/splits, ISRCs, cover art, audio, lyrics, and review/publish readiness.
- `GET /api/account/state`
- guest/session auth placeholders
- releases list/detail plus admin create/publish routes
- signed media URL route
- playback progress and player state
- library save/list
- checkout and Stripe webhook fulfillment
- vault content, media access, and progress
- Signal active/state routes
- Radio session/feed/interactions routes
- notification preferences/inbox
- analytics event ingestion
- audio visuals admin/public routes
- Circle event admin/public routes
- media upload intent and completion routes with strict category, owner, extension, and path validation

## Local Verification

```bash
npm install
npm run verify
npm run build
```

Live Supabase and Stripe credentials are optional for local verification. Without them, signed media and checkout flows use deterministic mock responses.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill local values in `.env.local`; never commit real secrets.
3. Run `npm run verify` before pushing changes.

Required account values:

- Supabase project URL and publishable key from Project Settings > API.
- Supabase service role key only for server-side local development and Vercel server env vars. Prefer `SUPABASE_SERVICE_ROLE_KEY`; `SUPABASE_SECRET_KEY` is also supported for Vercel Marketplace/Integration-style provisioning.
- Stripe secret key and webhook signing secret from the Stripe Dashboard or local Stripe CLI forwarding.
- Vercel project/org ids are created by `vercel link` and should stay in ignored `.vercel/` metadata.

## Vercel

Install or use the CLI through `npx`:

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
npm run verify
npx vercel
```

Use `npx vercel --prod` only when you are ready to deploy production. Configure secrets in the Vercel dashboard or with `vercel env add`; do not paste secret values into chat or commit them.

## Supabase

This repo currently stores SQL under `src/db/migrations` and `src/db/seeds`. Apply it only after selecting the intended Supabase project:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
```

Review the dry run before applying remote schema changes. For local-only testing, install the Supabase CLI and use a disposable local database before running seed SQL. Keep RLS enabled on all exposed `public` tables and keep `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` server-only.

Migration status:

- Live remote application status is not inferred from local files. Confirm with `supabase migration list --linked` or the Supabase dashboard before assuming a migration is applied.
- `0001_backend_foundation.sql` is the baseline schema and is intended to run once on a clean project.
- `0002`, `0003`, `0004`, `0005`, and `0006` use idempotent patterns where practical (`if not exists`, guarded constraints, policy replacement) for safer retry/dry-run review.
- Do not destructively alter a live database from this repo without a dry run, advisor pass, and backup/rollback plan.

Release-management schema notes live in `src/db/schema-docs/release-management-foundation.md`.

## Stripe

Create Stripe products/prices that match the catalog in `src/server/data/seedData.ts` and `src/db/seeds/0001_demo_catalog.sql`, then configure a webhook endpoint:

```text
https://<your-vercel-domain>/api/stripe/webhook
```

For local webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Set the generated webhook signing secret as `STRIPE_WEBHOOK_SECRET` locally or in Vercel.

## Production Wiring

1. Apply `src/db/migrations/0001_backend_foundation.sql`.
2. Seed `src/db/seeds/0001_demo_catalog.sql` as desired.
3. Create the private `protected-media` bucket and follow `src/storage/protected-media.md`.
4. Configure Stripe Checkout products/prices and webhook delivery.
5. Replace the in-memory stores with Supabase queries inside the existing service modules.

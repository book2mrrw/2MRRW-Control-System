# Backend Foundation Notes

The backend is organized around thin Next.js App Router handlers that call server-only services in `src/server/*`.

## Sync Contract

`GET /api/account/state` returns:

- `profile`
- `entitlements`
- `library`
- `playback`
- `notifications`
- `activeSessions`
- normalized `permissions`

The permission model is derived from server-owned purchases, memberships, vault grants, and library state. User-editable metadata is never used for authorization.

## Security Invariants

- RLS is enabled on every exposed `public` table in `src/db/migrations/0001_backend_foundation.sql`.
- Tables that are sources of truth for purchases, entitlements, Signal delivery attempts, Radio schedules, and analytics aggregates do not expose broad browser write policies.
- Supabase service role access is isolated in `src/server/supabase/client.ts`, which imports `server-only`.
- Protected media is accessed through short-lived signed URLs, not public bucket paths.
- Stripe fulfillment is webhook-first. Checkout creation does not grant entitlements.
- Stripe webhook handling is idempotent by provider event id.
- Signal lifecycle tables are separate from Radio scheduling/feed tables. Radio services do not import Signal services.

## Environment

Use `.env.example` as the starting point. Prefer `SUPABASE_SERVICE_ROLE_KEY` for the server-only Supabase key; `SUPABASE_SECRET_KEY` is also supported for Vercel Marketplace/Integration-style provisioning. Both Supabase server key names and `STRIPE_SECRET_KEY` must stay server-only and must not be prefixed with `NEXT_PUBLIC_`.

When Supabase and Stripe credentials are absent, the server services return deterministic mock results so typecheck and unit verification can run locally.

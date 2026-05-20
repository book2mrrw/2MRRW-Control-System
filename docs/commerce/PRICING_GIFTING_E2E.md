# Pricing + Gifting E2E Verification

## Control system (Creator Studio)

1. Checkout `dev` and run `npm run dev`.
2. Create or open a release draft → **Release details** → **Storefront pricing**.
3. Set price `499`, tier **Single**, enable **purchase-to-gift** → Save.
4. Confirm readiness shows **Storefront pricing** passed on Review.
5. Publish release (requires artwork/audio per existing gates).
6. Verify Supabase:
   - `releases.price_in_cents = 499`, `pricing_tier = single`, `gifting_enabled = true`
   - `products` row slug `{release-slug}-digital` with `price_cents` and grant `{ type: "release", releaseId }`
7. Confirm `sync_state` dirty keys: `release:{id}` and `catalog`.

## Gift admin proxy

1. Set `ADMIN_SEED_SECRET` in control + artist-platform env.
2. Open release detail → **Send as Gift** → create link.
3. Expect `POST /api/admin/gifts` (control) → `POST /api/admin/gifts` (storefront).
4. Open returned `/gift/{token}` URL on storefront.

## Storefront (artist-platform)

1. Open single modal for a control-backed release with lyrics/credits.
2. **Credits & Details** collapsible shows `release_credits` rows.
3. Timed lyrics (`lyrics_mode = timed`) use **Living Scroll** CSS; static lyrics use scroll panel.

## Automated

```bash
cd /Users/recharge/2MRRW-Control-System
npm run verify
```

Expected: typecheck + backend foundation tests pass (including `testReleaseCommerceValidation`).

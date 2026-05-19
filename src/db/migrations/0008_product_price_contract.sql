-- Persist product pricing fields used by the public frontend contract.

alter table public.products
  add column if not exists price_cents integer check (price_cents >= 0),
  add column if not exists currency text not null default 'usd';

update public.products
set price_cents = 999,
    currency = 'usd'
where slug = 'afterhours-digital'
  and price_cents is null;

update public.products
set price_cents = 1999,
    currency = 'usd'
where slug = 'founder-membership'
  and price_cents is null;

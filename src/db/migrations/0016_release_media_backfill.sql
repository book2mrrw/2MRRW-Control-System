-- Idempotent backfill: link media_assets to release_media for catalog cover/audio roles.

insert into public.release_media (
  release_id,
  track_id,
  media_asset_id,
  asset_role,
  is_primary,
  version,
  is_active,
  ingestion_ref,
  metadata
)
select
  r.id,
  case when ma.owner_type = 'track' then ma.owner_id::uuid else null end,
  ma.id,
  case
    when ma.storage_path ~* 'loops/' or ma.storage_path ~* '\.(mp4|mov|webm)(\?|#|$)' then 'background_loop'
    when ma.storage_path ~* 'preview' or ma.storage_path ~* 'previews/' then 'preview'
    when ma.storage_path ~* 'masters/' or ma.storage_path ~* '\.(mp3|wav|m4a|flac|aiff)(\?|#|$)' then 'audio'
    when ma.storage_path ~* 'artwork|cover' then 'cover_art'
    when ma.storage_path ~* 'lyrics' then 'lyrics'
    else 'other'
  end,
  false,
  1,
  true,
  'backfill_release_media',
  jsonb_build_object('storagePath', ma.storage_path, 'ownerType', ma.owner_type)
from public.releases r
join public.media_assets ma
  on ma.is_active is distinct from false
 and (
   (ma.owner_type = 'release' and ma.owner_id = r.id)
   or ma.owner_id in (select t.id from public.tracks t where t.release_id = r.id)
 )
where not exists (
  select 1
  from public.release_media rm
  where rm.release_id = r.id
    and rm.media_asset_id = ma.id
    and rm.asset_role = case
      when ma.storage_path ~* 'loops/' or ma.storage_path ~* '\.(mp4|mov|webm)(\?|#|$)' then 'background_loop'
      when ma.storage_path ~* 'preview' or ma.storage_path ~* 'previews/' then 'preview'
      when ma.storage_path ~* 'masters/' or ma.storage_path ~* '\.(mp3|wav|m4a|flac|aiff)(\?|#|$)' then 'audio'
      when ma.storage_path ~* 'artwork|cover' then 'cover_art'
      when ma.storage_path ~* 'lyrics' then 'lyrics'
      else 'other'
    end
    and rm.version = 1
);

update public.release_media
set is_primary = false
where asset_role in ('cover_art', 'background_loop')
  and is_active;

-- One primary cover per release: prefer cover_art, else background_loop.
with ranked as (
  select
    rm.id,
    rm.release_id,
    rm.asset_role,
    row_number() over (
      partition by rm.release_id
      order by case rm.asset_role when 'cover_art' then 0 when 'background_loop' then 1 else 2 end, rm.created_at
    ) as rn
  from public.release_media rm
  where rm.is_active
    and rm.asset_role in ('cover_art', 'background_loop')
)
update public.release_media rm
set is_primary = ranked.rn = 1
from ranked
where rm.id = ranked.id;

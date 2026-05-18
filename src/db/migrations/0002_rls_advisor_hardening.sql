-- Make server-only table access explicit so RLS advisors do not treat missing
-- policies as accidental. Service-role server code still bypasses RLS.
create policy "server only no client access" on public.collector_ownerships for all using (false) with check (false);
create policy "server only no client access" on public.commerce_events for all using (false) with check (false);
create policy "server only no client access" on public.engagement_daily for all using (false) with check (false);
create policy "server only no client access" on public.entitlement_events for all using (false) with check (false);
create policy "server only no client access" on public.geo_daily for all using (false) with check (false);
create policy "server only no client access" on public.guest_sessions for all using (false) with check (false);
create policy "server only no client access" on public.media_access_logs for all using (false) with check (false);
create policy "server only no client access" on public.media_assets for all using (false) with check (false);
create policy "server only no client access" on public.media_stream_events for all using (false) with check (false);
create policy "server only no client access" on public.media_variants for all using (false) with check (false);
create policy "server only no client access" on public.notification_delivery_logs for all using (false) with check (false);
create policy "server only no client access" on public.notification_events for all using (false) with check (false);
create policy "server only no client access" on public.player_queue_items for all using (false) with check (false);
create policy "server only no client access" on public.radio_assets for all using (false) with check (false);
create policy "server only no client access" on public.radio_schedules for all using (false) with check (false);
create policy "server only no client access" on public.radio_timeline_items for all using (false) with check (false);
create policy "server only no client access" on public.revenue_daily for all using (false) with check (false);
create policy "server only no client access" on public.signal_audience_segments for all using (false) with check (false);
create policy "server only no client access" on public.signal_cooldowns for all using (false) with check (false);
create policy "server only no client access" on public.signal_delivery_attempts for all using (false) with check (false);
create policy "server only no client access" on public.stripe_customers for all using (false) with check (false);
create policy "server only no client access" on public.user_devices for all using (false) with check (false);
create policy "server only no client access" on public.user_locations for all using (false) with check (false);
create policy "server only no client access" on public.vault_content_assets for all using (false) with check (false);
create policy "server only no client access" on public.video_watch_events for all using (false) with check (false);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end
$$;

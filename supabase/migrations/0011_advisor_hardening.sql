-- 0011 · Supabase advisor hardening (staging advisors, 2026-11-28). No data changes; same access rules.
set search_path = public, extensions;

-- 1. Security: pin search_path on the trigger functions that lacked it (lint 0011).
alter function enforce_offering_mode() set search_path = public;

-- 2. Security: trigger-only SECURITY DEFINER functions are not API endpoints (lints 0028/0029).
--    Triggers keep firing: the caller's EXECUTE privilege is not checked when a trigger runs.
revoke execute on function audit_content() from public, anon, authenticated;
revoke execute on function audit_establishment_experiences() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
--    Account deletion: signed-in users only.
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
--    is_editor() stays callable by anon/authenticated on purpose: every RLS policy calls it as the requesting
--    role, and it only answers "is the caller an editor" for the caller themself.

-- 3. Performance: "editors write" was FOR ALL, so SELECT ran two permissive policies (lint 0006).
--    Split into insert/update/delete; reads stay governed by "public read" (which already lets editors see
--    rejected dishes, samples, candidate links/offerings). (select is_editor()) is evaluated once per query.
do $$
declare t text;
begin
  foreach t in array array['experience_modules','regions','provinces','dishes','dish_origins','dish_photos','dish_sources','service_areas',
                           'restaurants','restaurant_sources','dish_restaurant_links','establishment_experiences','experience_items','offerings'] loop
    execute format('drop policy if exists "editors write" on %I', t);
    execute format('drop policy if exists "editors insert" on %I', t);
    execute format('drop policy if exists "editors update" on %I', t);
    execute format('drop policy if exists "editors delete" on %I', t);
    execute format('create policy "editors insert" on %I for insert with check ((select is_editor()))', t);
    execute format('create policy "editors update" on %I for update using ((select is_editor())) with check ((select is_editor()))', t);
    execute format('create policy "editors delete" on %I for delete using ((select is_editor()))', t);
  end loop;
end $$;

-- 4. Performance: evaluate auth.uid() once per query in owner policies (lint 0003). Same rule.
do $$
declare t text;
begin
  foreach t in array array['user_profiles','user_preferences','saved_experiences','experience_history','tasting_notes','user_media','user_achievements'] loop
    execute format('drop policy if exists "owner all" on %I', t);
    execute format('create policy "owner all" on %I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
drop policy if exists "read own role" on user_roles;
create policy "read own role" on user_roles for select using ((select auth.uid()) = user_id);

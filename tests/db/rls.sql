-- Database security tests (run by scripts/test-db.sh against a local PostgreSQL + PostGIS).
\set ON_ERROR_STOP 1
set search_path = public, extensions;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into user_roles values ('00000000-0000-0000-0000-000000000001', 'editor');
-- a candidate link (admin only)
insert into dish_restaurant_links (dish_id, restaurant_id, status, menu_evidence) values ('thang-co', 'pho-hoa-pasteur', 'candidate', '{"type":"search-result","note":"test"}');

create temp table results (name text, ok boolean);
grant all on results to anon, authenticated;
-- seeded catalogue size (as owner), so the anon check does not hard-code a count that changes with each import
create temp table seeded as select count(*) as dishes from dishes;
grant select on seeded to anon, authenticated;

-- 1. anonymous read: catalogue visible, candidate hidden, writes refused
set role anon;
insert into results select 'anon reads every seeded dish', count(*) = (select dishes from seeded) and count(*) >= 138 from dishes;
insert into results select 'six experience modules, sport pilot-planned last', (select count(*) from experience_modules) = 6 and (select status from experience_modules where id = 'sport') = 'pilot-planned' and (select max(sort_order) from experience_modules) = (select sort_order from experience_modules where id = 'sport');
insert into results select 'every establishment has an experience tag', not exists (select 1 from restaurants r where not exists (select 1 from establishment_experiences e where e.establishment_id = r.id));
insert into results select 'anon cannot see candidate links', count(*) = 0 from dish_restaurant_links where status = 'candidate';
do $$ begin
  begin update dishes set name_en = 'x' where id = 'mi-quang'; exception when others then null; end;
end $$;
reset role;
insert into results select 'anon update had no effect', name_en <> 'x' from dishes where id = 'mi-quang';

-- 2. signed-in non-editor: still read-only, but owns saved dishes
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
update dishes set name_en = 'y' where id = 'mi-quang';
insert into saved_experiences (user_id, experience_id, item_type, item_id) values ('00000000-0000-0000-0000-000000000002', 'food', 'dish', 'mi-quang');
insert into results select 'user sees own saved row', count(*) = 1 from saved_experiences;
-- 0005: the same account can hold Sport passport rows next to Food ones
insert into experience_history (user_id, experience_id, item_type, item_id, action, occurred_on) values ('00000000-0000-0000-0000-000000000002', 'sport', 'item', 'reformer-pilates', 'attended', '2026-11-27');
insert into results select 'sport history row stored for same account', count(*) = 1 from experience_history where experience_id = 'sport';
reset role;
insert into results select 'non-editor update had no effect', name_en <> 'y' from dishes where id = 'mi-quang';

-- 3. editor: can see candidates and edit content
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into results select 'editor sees candidate links', count(*) = 1 from dish_restaurant_links where status = 'candidate';
update dishes set name_en = 'Quảng noodles (edited)' where id = 'mi-quang';
insert into results select 'editor cannot see other user saved rows', count(*) = 0 from saved_experiences;
reset role;
-- link photos (0004): incomplete photo rejected, complete photo accepted
do $$ begin
  begin update dish_restaurant_links set primary_photo_url = 'https://x.test/a.jpg' where dish_id = 'thang-co'; insert into results values ('incomplete link photo rejected', false);
  exception when check_violation then insert into results values ('incomplete link photo rejected', true); end;
end $$;
update dish_restaurant_links set primary_photo_url = 'https://x.test/a.jpg', photo_kind = 'venue-specific', photo_source_url = 'https://x.test/post', photo_attribution = 'Venue', photo_license = 'Permission', photo_last_checked_at = '2026-11-27' where dish_id = 'thang-co';
insert into results select 'complete link photo accepted', count(*) = 1 from dish_restaurant_links where primary_photo_url is not null;
-- 0006: shared engine items + offerings (editor writes; mode + evidence rules enforced; anon reads public)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into experience_items (id, experience_id, name_vi, name_en, category) values ('test-ca-phe-muoi', 'coffee', 'Cà phê muối', 'Salt coffee', 'vietnamese-coffee');
do $$ begin
  begin insert into offerings (item_id, establishment_id, status, menu_evidence, last_verified) values ('test-ca-phe-muoi', 'pho-hoa-pasteur', 'source-listed', '{"type":"published-source","note":"t"}', '2026-11-27'); insert into results values ('offering needs establishment tagged with the mode', false);
  exception when others then insert into results values ('offering needs establishment tagged with the mode', true); end;
end $$;
insert into establishment_experiences values ('pho-hoa-pasteur', 'coffee');
do $$ begin
  begin insert into offerings (item_id, establishment_id, status, menu_evidence, last_verified) values ('test-ca-phe-muoi', 'pho-hoa-pasteur', 'menu-confirmed', '{"type":"published-source","note":"t"}', '2026-11-27'); insert into results values ('offering evidence must match level', false);
  exception when check_violation then insert into results values ('offering evidence must match level', true); end;
end $$;
insert into offerings (item_id, establishment_id, status, menu_evidence, last_verified) values ('test-ca-phe-muoi', 'pho-hoa-pasteur', 'source-listed', '{"type":"published-source","note":"t"}', '2026-11-27');
insert into results select 'editor offering audited', count(*) = 1 from content_audit where table_name = 'offerings' and row_key = 'test-ca-phe-muoi@pho-hoa-pasteur';
reset role;
set role anon;
insert into results select 'anon reads public offerings', count(*) = 1 from offerings where item_id = 'test-ca-phe-muoi';
insert into results select 'seeded coffee offerings readable', count(*) >= 5 from offerings where item_id <> 'test-ca-phe-muoi';
do $$ begin
  begin insert into experience_items (id, experience_id, name_vi, name_en, category) values ('x', 'coffee', 'x', 'x', 'tea'); exception when others then null; end;
end $$;
reset role;
insert into results select 'anon cannot add items', count(*) = 0 from experience_items where id = 'x';
insert into results select 'editor update persisted', name_en = 'Quảng noodles (edited)' from dishes where id = 'mi-quang';

-- 3b. storage + audit
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into storage.objects (bucket_id, name) values ('dish-photos', 'mi-quang/1.jpg');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$ begin
  begin insert into storage.objects (bucket_id, name) values ('dish-photos', 'x.jpg'); exception when others then null; end;
end $$;
reset role;
insert into results select 'only editors upload photos', count(*) = 1 from storage.objects;
insert into results select 'editor edit recorded in audit with editor id', count(*) >= 1 from content_audit
  where table_name = 'dishes' and row_key = 'mi-quang' and action = 'UPDATE' and changed_by = '00000000-0000-0000-0000-000000000001';
set role anon;
insert into results select 'anon cannot read audit', count(*) = 0 from content_audit;
reset role;

-- 3c. accounts & passport isolation
reset role;
insert into results select 'profile auto-created for new users', count(*) = 2 from user_profiles;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';  -- user B
insert into experience_history (user_id, experience_id, item_type, item_id, action, occurred_on) values ('00000000-0000-0000-0000-000000000002', 'food', 'dish', 'bun-bo-hue', 'tried', '2026-11-01');
insert into experience_history values ('00000000-0000-0000-0000-000000000002', 'food', 'dish', 'bun-bo-hue', 'tried', '2026-10-01') on conflict (user_id, experience_id, item_type, item_id, action) do update set occurred_on = least(experience_history.occurred_on, excluded.occurred_on);
insert into results select 'guest merge upsert keeps one row with earliest date', count(*) = 1 and min(occurred_on) = '2026-10-01' from experience_history where experience_id = 'food';
insert into tasting_notes (user_id, experience_id, item_type, item_id, rating, note) values ('00000000-0000-0000-0000-000000000002', 'food', 'dish', 'bun-bo-hue', 5, 'cay quá!');
do $$ begin
  begin insert into tasting_notes (user_id, experience_id, item_type, item_id, rating) values ('00000000-0000-0000-0000-000000000001', 'food', 'dish', 'x', 1);
  insert into results values ('user cannot write rows for another user', false);
  exception when others then insert into results values ('user cannot write rows for another user', true); end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';  -- user A (an editor) reads
insert into results select 'user A cannot read user B passport', (select count(*) from experience_history) = 0 and (select count(*) from tasting_notes) = 0 and (select count(*) from user_profiles) = 1;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
insert into storage.objects (bucket_id, name) values ('user-media', '00000000-0000-0000-0000-000000000002/bun.jpg');
do $$ begin
  begin insert into storage.objects (bucket_id, name) values ('user-media', '00000000-0000-0000-0000-000000000001/x.jpg');
  insert into results values ('user photos only in own folder', false);
  exception when others then insert into results values ('user photos only in own folder', true); end;
end $$;
select delete_my_account();
reset role;
insert into results select 'account deletion removes the user and all personal rows',
  (select count(*) from auth.users where id = '00000000-0000-0000-0000-000000000002') = 0
  and (select count(*) from experience_history) = 0 and (select count(*) from tasting_notes) = 0 and (select count(*) from saved_experiences) = 0;
set role anon;
do $$ begin
  begin perform delete_my_account(); insert into results values ('anon cannot call delete_my_account', false);
  exception when others then insert into results values ('anon cannot call delete_my_account', true); end;
end $$;
reset role;

-- 4. integrity rules
do $$ begin
  begin
    insert into restaurants (id, name, address, neighbourhood, location, venue_type, last_verified)
    values ('hanoi-test', 'Hà Nội test', 'x', 'x', extensions.st_setsrid(extensions.st_makepoint(105.85, 21.03), 4326)::extensions.geography, 'eatery', '2026-11-27');
    insert into results values ('venue outside HCMC rejected', false);
  exception when others then insert into results values ('venue outside HCMC rejected', true); end;
  begin
    insert into dish_restaurant_links (dish_id, restaurant_id, status, menu_evidence, last_verified) values ('mi-quang', 'pho-hoa-pasteur', 'menu-confirmed', '{"type":"published-source","note":"x"}', '2026-11-27');
    insert into results values ('published source cannot menu-confirm', false);
  exception when check_violation then insert into results values ('published source cannot menu-confirm', true); end;
  begin
    insert into dish_restaurant_links (dish_id, restaurant_id, status, menu_evidence) values ('mi-quang', 'pho-hoa-pasteur', 'source-listed', '{"type":"published-source","note":"x"}');
    insert into results values ('public status requires last-checked date', false);
  exception when check_violation then insert into results values ('public status requires last-checked date', true); end;
end $$;

-- 0007: establishment attributes; new establishments are not implicitly tagged Food
insert into restaurants (id, name, address, neighbourhood, location, venue_type, last_verified, attributes)
values ('test-cafe', 'Test Café', '1 Lê Lợi', 'Bến Thành', extensions.st_setsrid(extensions.st_makepoint(106.70, 10.775), 4326)::extensions.geography, 'café', '2026-11-27', '{"wifi": true, "cafeTypes": ["working"]}');
insert into results select 'establishment attributes stored', (attributes->>'wifi')::boolean from restaurants where id = 'test-cafe';
insert into results select 'new establishment not tagged Food implicitly', count(*) = 0 from establishment_experiences where establishment_id = 'test-cafe';
insert into establishment_experiences values ('test-cafe', 'coffee');
insert into results select 'mode tag audited', count(*) = 1 from content_audit where table_name = 'establishment_experiences' and row_key = 'test-cafe@coffee';
insert into results select 'seed tagged every Food establishment', (select count(*) from establishment_experiences where experience_id = 'food') >= 113;

-- 0008: optional eating/dining attributes; nutrition must name its source
insert into results select 'dishes.eating defaults to unknown (null)', bool_and(eating is null) from dishes where dataset = 'seed'; -- master imports may record eating attributes
update dishes set eating = '{"cookingMethods": ["simmered"], "allergensComplete": false}' where id = (select id from dishes order by id limit 1);
insert into results select 'dish eating stored', count(*) = 1 from dishes where eating->'cookingMethods' ? 'simmered';
do $$ begin
  update dishes set eating = '{"nutrition": {"kcal": 500, "confidence": "estimate"}}' where id = (select id from dishes order by id limit 1);
  insert into results values ('nutrition without source rejected', false);
exception when check_violation then insert into results values ('nutrition without source rejected', true); end $$;
update restaurants set dining = '{"atmosphere": ["quiet"]}' where id = 'test-cafe';
insert into results select 'restaurant dining stored', count(*) = 1 from restaurants where dining->'atmosphere' ? 'quiet';

-- 0009 (KEX-IMPORT-01): unknown spice is NULL, never defaulted to 0; the 0–3 check still applies
insert into dishes (id, name_vi, name_en, category, dish_type, ingredients, taste, dietary, meal_times, description_vi, description_en, prominence, dataset, verification_status)
values ('kex-unknown-spice', 'Món thử', 'Test dish', 'savory', 'rice', '{}', '{}', '{}', '{}', '', '', 3, 'master', 'pending-review');
insert into results select 'omitted spice stored as NULL (not 0)', spice_level is null from dishes where id = 'kex-unknown-spice';
insert into results select 'unknown spice excluded by a strict no-spice query', count(*) = 0 from dishes where id = 'kex-unknown-spice' and spice_level <= 0;
do $$ begin
  update dishes set spice_level = 5 where id = 'kex-unknown-spice';
  insert into results values ('spice outside 0–3 rejected', false);
exception when check_violation then insert into results values ('spice outside 0–3 rejected', true); end $$;
insert into results select 'seeded legacy spice levels unchanged (all recorded)', count(*) = 0 from dishes where dataset = 'seed' and spice_level is null; -- master imports may leave spice unknown (NULL)

-- 0010 (KEX-QA-03): building-level pins allowed; other precision values rejected
update restaurants set coordinate_precision = 'building' where id = 'test-cafe';
insert into results select 'building precision stored', coordinate_precision = 'building' from restaurants where id = 'test-cafe';
do $$ begin
  update restaurants set coordinate_precision = 'unit' where id = 'test-cafe';
  insert into results values ('unknown precision rejected', false);
exception when check_violation then insert into results values ('unknown precision rejected', true); end $$;

-- KEX-SEC-01: privileged writes are refused by the database for anon and signed-in non-editors,
-- whatever the UI shows (direct REST calls with the public anon key hit exactly these policies).
reset role;
insert into auth.users values ('00000000-0000-0000-0000-000000000003');
create temp table sec_before as select
  (select count(*) from dishes) d, (select count(*) from restaurants) r, (select count(*) from dish_restaurant_links) l,
  (select count(*) from offerings) o, (select count(*) from experience_items) i, (select count(*) from establishment_experiences) e,
  (select count(*) from dish_origins) dorig, (select count(*) from user_roles) ur, (select count(*) from content_audit where table_name <> 'user_roles') a;
grant select on sec_before to anon, authenticated;
create or replace function pg_temp.sec_attack() returns void language plpgsql as $f$ begin
  begin insert into dishes (id, name_vi, name_en, category, dish_type, ingredients, taste, dietary, meal_times, description_vi, description_en, prominence, dataset, verification_status) values ('sec-x', 'x', 'x', 'savory', 'rice', '{}', '{}', '{}', '{}', '', '', 3, 'master', 'pending-review'); exception when others then null; end;
  begin delete from dishes where id = 'pho-bo-ha-noi'; exception when others then null; end;
  begin insert into restaurants (id, name, address, neighbourhood, location, venue_type, last_verified) values ('sec-r', 'x', 'x', 'x', extensions.st_setsrid(extensions.st_makepoint(106.70, 10.775), 4326)::extensions.geography, 'eatery', '2026-11-28'); exception when others then null; end;
  begin update restaurants set name = 'hacked' where id = 'pho-hoa-pasteur'; exception when others then null; end;
  begin delete from restaurants where id = 'pho-hoa-pasteur'; exception when others then null; end;
  begin insert into dish_restaurant_links (dish_id, restaurant_id, status, menu_evidence) values ('mi-quang', 'pho-hoa-pasteur', 'candidate', '{"type":"search-result","note":"x"}'); exception when others then null; end;
  begin update dish_restaurant_links set status = 'source-listed' where status = 'candidate'; exception when others then null; end;
  begin delete from dish_restaurant_links; exception when others then null; end;
  begin delete from offerings; exception when others then null; end;
  begin update offerings set status = 'menu-confirmed'; exception when others then null; end;
  begin insert into experience_items (id, experience_id, name_vi, name_en, category) values ('sec-i', 'coffee', 'x', 'x', 'tea'); exception when others then null; end;
  begin delete from experience_items; exception when others then null; end;
  begin insert into establishment_experiences values ('pho-hoa-pasteur', 'bars'); exception when others then null; end;
  begin delete from establishment_experiences; exception when others then null; end;
  begin delete from dish_origins; exception when others then null; end;
  begin insert into user_roles values ('00000000-0000-0000-0000-000000000003', 'admin'); exception when others then null; end;
  begin update user_roles set user_id = '00000000-0000-0000-0000-000000000003'; exception when others then null; end;
  begin insert into content_audit (table_name, row_key, action) values ('dishes', 'x', 'UPDATE'); exception when others then null; end;
  begin delete from content_audit; exception when others then null; end;
end $f$;
grant execute on function pg_temp.sec_attack() to anon, authenticated;
set role anon;
select pg_temp.sec_attack();
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';  -- signed in, no role
select pg_temp.sec_attack();
insert into results select 'non-editor sees no candidate links', count(*) = 0 from dish_restaurant_links where status = 'candidate';
insert into results select 'non-editor is_editor() is false', not is_editor();
reset role;
insert into results select 'anon + non-editor content writes all refused (counts unchanged)',
  (select count(*) from dishes) = d and (select count(*) from restaurants) = r and (select count(*) from dish_restaurant_links) = l
  and (select count(*) from offerings) = o and (select count(*) from experience_items) = i and (select count(*) from establishment_experiences) = e
  and (select count(*) from dish_origins) = dorig from sec_before;
insert into results select 'anon + non-editor updates had no effect', (select name from restaurants where id = 'pho-hoa-pasteur') <> 'hacked'
  and (select count(*) from dish_restaurant_links where status = 'candidate') = 1 and not exists (select 1 from offerings where status = 'menu-confirmed' and menu_evidence->>'type' = 'published-source');
insert into results select 'no self-escalation into user_roles', (select count(*) from user_roles) = ur and not exists (select 1 from user_roles where user_id = '00000000-0000-0000-0000-000000000003') from sec_before;
insert into results select 'audit trail cannot be forged or erased', (select count(*) from content_audit where table_name <> 'user_roles') = a from sec_before;
-- the same writes succeed for an authorized editor (role granted by an admin with the service role)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into experience_items (id, experience_id, name_vi, name_en, category) values ('sec-editor-item', 'coffee', 'x', 'x', 'tea');
update restaurants set name = name where id = 'pho-hoa-pasteur';
reset role;
insert into results select 'authorized editor write succeeds and is audited', count(*) = 1 from content_audit where table_name = 'experience_items' and row_key = 'sec-editor-item' and changed_by = '00000000-0000-0000-0000-000000000001';

-- 0011: advisor hardening — trigger functions and account deletion are not callable by anon; no FOR ALL editor policy left
insert into results select 'trigger functions + delete_my_account not executable by anon',
  not has_function_privilege('anon', 'audit_content()', 'execute') and not has_function_privilege('anon', 'handle_new_user()', 'execute')
  and not has_function_privilege('anon', 'delete_my_account()', 'execute') and has_function_privilege('authenticated', 'delete_my_account()', 'execute')
  and has_function_privilege('anon', 'is_editor()', 'execute');
insert into results select 'editor policies split (no FOR ALL "editors write")', count(*) = 0 from pg_policies where policyname = 'editors write';

-- 0012 (D67): closure is optional, but must name status, date and source
insert into results select 'seeded closures stored', count(*) = 3 from restaurants where closure->>'status' = 'permanently-closed';
do $$ begin
  update restaurants set closure = '{"status": "gone"}' where id = 'test-cafe';
  insert into results values ('invalid closure rejected', false);
exception when check_violation then insert into results values ('invalid closure rejected', true); end $$;

-- 0013 (KEX-SEC-02): membership tiers are entitlements, never permissions; nobody self-grants a role or a tier.
reset role;
insert into auth.users values ('00000000-0000-0000-0000-000000000006'), ('00000000-0000-0000-0000-000000000007'), ('00000000-0000-0000-0000-000000000008'), ('00000000-0000-0000-0000-000000000009');
insert into user_roles values ('00000000-0000-0000-0000-000000000007', 'admin'), ('00000000-0000-0000-0000-000000000008', 'reviewer');
-- (a) a customer cannot grant themselves Premium or a staff role
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
do $$ begin
  begin insert into user_memberships (user_id, tier) values ('00000000-0000-0000-0000-000000000006', 'premium'); exception when others then null; end;
  begin insert into user_roles values ('00000000-0000-0000-0000-000000000006', 'admin'); exception when others then null; end;
end $$;
reset role;
insert into results select 'customer cannot self-assign a membership', count(*) = 0 from user_memberships where user_id = '00000000-0000-0000-0000-000000000006';
insert into results select 'customer cannot self-assign a staff role', count(*) = 0 from user_roles where user_id = '00000000-0000-0000-0000-000000000006';
-- (b) an admin grants a test entitlement (audited)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
insert into user_memberships (user_id, tier, source, updated_by) values ('00000000-0000-0000-0000-000000000006', 'premium', 'test', '00000000-0000-0000-0000-000000000007');
insert into user_memberships (user_id, tier, source) values ('00000000-0000-0000-0000-000000000009', 'plus', 'test');
reset role;
insert into results select 'admin grants a test membership', tier = 'premium' from user_memberships where user_id = '00000000-0000-0000-0000-000000000006';
insert into results select 'membership change audited with the admin', count(*) = 1 from content_audit where table_name = 'user_memberships' and row_key = '00000000-0000-0000-0000-000000000006' and changed_by = '00000000-0000-0000-0000-000000000007';
-- (c) a Premium customer is still not staff: no catalogue writes, no audit, no other users' memberships, cannot upgrade/extend
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
insert into results select 'premium customer is not an editor', not is_editor();
insert into results select 'premium customer is not staff', not is_staff();
insert into results select 'premium customer reads own membership only', count(*) = 1 and bool_and(user_id = '00000000-0000-0000-0000-000000000006') from user_memberships;
insert into results select 'premium customer cannot read the audit trail', count(*) = 0 from content_audit;
update dishes set name_en = 'premium-edit' where id = 'mi-quang';
update user_memberships set tier = 'premium', valid_until = '2099-01-01' where user_id = '00000000-0000-0000-0000-000000000009';
update user_memberships set valid_until = '2099-01-01' where user_id = '00000000-0000-0000-0000-000000000006';
reset role;
insert into results select 'premium customer catalogue update had no effect', name_en <> 'premium-edit' from dishes where id = 'mi-quang';
insert into results select 'customer cannot change memberships (own or others)', (select tier from user_memberships where user_id = '00000000-0000-0000-0000-000000000009') = 'plus' and (select valid_until from user_memberships where user_id = '00000000-0000-0000-0000-000000000006') is null;
-- (d) a reviewer is read-only staff: reads the audit trail, cannot write the catalogue or memberships
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';
insert into results select 'reviewer is staff but not an editor', is_staff() and not is_editor();
insert into results select 'reviewer reads the audit trail', count(*) > 0 from content_audit;
insert into results select 'reviewer cannot read customer memberships', count(*) = 0 from user_memberships;
update dishes set name_en = 'reviewer-edit' where id = 'mi-quang';
reset role;
insert into results select 'reviewer catalogue update had no effect', name_en <> 'reviewer-edit' from dishes where id = 'mi-quang';
do $$ begin
  insert into user_roles values ('00000000-0000-0000-0000-000000000006', 'superuser');
  insert into results values ('unknown staff role rejected', false);
exception when check_violation then insert into results values ('unknown staff role rejected', true); end $$;

-- 0014 (KEX-MEM-04): membership quotas enforced in the database, off by default.
reset role;
-- 0016 makes Plus the default tier during development; these tests exercise the Free quotas, so pin Free
-- (restored to the migration default in the 0016 section below).
update membership_settings set default_tier = 'free';
insert into auth.users values ('00000000-0000-0000-0000-000000000010'), ('00000000-0000-0000-0000-000000000011');
-- (a) enforcement off: a Free member may save more than 20 references
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
insert into saved_experiences (user_id, experience_id, item_type, item_id) select '00000000-0000-0000-0000-000000000010', 'food', 'dish', 'q-' || g from generate_series(1, 22) g;
reset role;
insert into results select 'quotas off by default (Free saved 22)', count(*) = 22 from saved_experiences where user_id = '00000000-0000-0000-0000-000000000010';
insert into results select 'proposed limits seeded (free 20 / plus 150 / premium unlimited)', (select value from membership_limits where tier = 'free' and limit_key = 'saved_references') = 20 and (select value from membership_limits where tier = 'plus' and limit_key = 'saved_references') = 150 and (select value from membership_limits where tier = 'premium' and limit_key = 'saved_references') is null;
-- (b) a customer cannot switch enforcement or change quotas
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
update membership_settings set enforce_limits = true;
update membership_limits set value = 9999 where tier = 'free';
reset role;
insert into results select 'customer cannot change quota settings', not enforce_limits from membership_settings;
insert into results select 'customer cannot change quota values', (select value from membership_limits where tier = 'free' and limit_key = 'saved_references') = 20;
-- (c) admin switches enforcement on
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
update membership_settings set enforce_limits = true;
reset role;
insert into results select 'admin can switch enforcement on', enforce_limits from membership_settings;
-- (d) Free member over quota: new reference refused; existing saves kept (downgrade retention); re-save into a collection allowed
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
do $$ begin
  insert into saved_experiences (user_id, experience_id, item_type, item_id) values ('00000000-0000-0000-0000-000000000010', 'food', 'dish', 'q-new');
  insert into results values ('new reference above Free quota refused', false);
exception when others then insert into results values ('new reference above Free quota refused', sqlerrm like 'quota_exceeded:saved_references:20%'); end $$;
insert into saved_experiences (user_id, experience_id, item_type, item_id, collection) values ('00000000-0000-0000-0000-000000000010', 'food', 'dish', 'q-1', 'Weekend');
insert into results select 'existing reference can go into a collection (not counted twice)', count(*) = 1 from saved_experiences where item_id = 'q-1' and collection = 'Weekend';
insert into saved_experiences (user_id, experience_id, item_type, item_id, collection) values ('00000000-0000-0000-0000-000000000010', 'food', 'dish', 'q-2', 'Office');
do $$ begin
  insert into saved_experiences (user_id, experience_id, item_type, item_id, collection) values ('00000000-0000-0000-0000-000000000010', 'food', 'dish', 'q-3', 'Third');
  insert into results values ('third collection above Free quota refused', false);
exception when others then insert into results values ('third collection above Free quota refused', sqlerrm like 'quota_exceeded:collections:2%'); end $$;
-- quotas are per experience: Coffee still has room
insert into saved_experiences (user_id, experience_id, item_type, item_id) values ('00000000-0000-0000-0000-000000000010', 'coffee', 'item', 'ca-phe-sua-da');
insert into results select 'quota is per experience', count(*) = 1 from saved_experiences where user_id = '00000000-0000-0000-0000-000000000010' and experience_id = 'coffee';
-- Passport history is never limited
insert into experience_history (user_id, experience_id, item_type, item_id, action) select '00000000-0000-0000-0000-000000000010', 'food', 'dish', 'h-' || g, 'tried' from generate_series(1, 40) g;
reset role;
insert into results select 'Passport history unlimited with quotas on', count(*) = 40 from experience_history where user_id = '00000000-0000-0000-0000-000000000010';
insert into results select 'over-quota saves retained (downgrade retention)', count(distinct item_id) = 22 from saved_experiences where user_id = '00000000-0000-0000-0000-000000000010' and experience_id = 'food';
-- (e) Premium (admin-granted test tier): unlimited; expired Premium falls back to Free
insert into user_memberships (user_id, tier, source) values ('00000000-0000-0000-0000-000000000011', 'premium', 'test');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';
insert into saved_experiences (user_id, experience_id, item_type, item_id) select '00000000-0000-0000-0000-000000000011', 'food', 'dish', 'p-' || g from generate_series(1, 200) g;
reset role;
insert into results select 'Premium saves beyond the Plus quota', count(*) = 200 from saved_experiences where user_id = '00000000-0000-0000-0000-000000000011';
update user_memberships set valid_until = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-000000000011';
insert into results select 'expired Premium is Free', member_tier('00000000-0000-0000-0000-000000000011') = 'free';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';
do $$ begin
  insert into saved_experiences (user_id, experience_id, item_type, item_id) values ('00000000-0000-0000-0000-000000000011', 'food', 'dish', 'p-new');
  insert into results values ('after downgrade: no new saves above quota', false);
exception when others then insert into results values ('after downgrade: no new saves above quota', true); end $$;
reset role;
insert into results select 'after downgrade: all 200 saves kept', count(*) = 200 from saved_experiences where user_id = '00000000-0000-0000-0000-000000000011';
update membership_settings set enforce_limits = false;

-- 0015 (KEX-BIZ-03): venue photos — public read, editors write, constraints, audit.
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into venue_photos (establishment_id, url, kind, source_url, attribution, license, last_checked_at) values ('pho-hoa-pasteur', 'https://upload.wikimedia.org/x.jpg', 'exterior', 'https://commons.wikimedia.org/wiki/File:X.jpg', 'Author', 'CC BY-SA 4.0', '2026-11-28');
reset role;
insert into results select 'editor adds a venue photo (audited)', count(*) = 1 from content_audit where table_name = 'venue_photos' and row_key = 'pho-hoa-pasteur';
set role anon;
insert into results select 'anon reads venue photos', count(*) >= 1 from venue_photos where establishment_id = 'pho-hoa-pasteur';
do $$ begin
  begin insert into venue_photos (establishment_id, url, kind, source_url, attribution, license, last_checked_at) values ('pho-hoa-pasteur', 'https://x.test/a.jpg', 'exterior', 'https://x.test', 'A', 'CC0', '2026-11-28'); exception when others then null; end;
end $$;
reset role;
insert into results select 'anon cannot add venue photos', count(*) = 0 from venue_photos where url = 'https://x.test/a.jpg';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
do $$ begin
  begin insert into venue_photos (establishment_id, url, kind, source_url, attribution, license, last_checked_at) values ('pho-hoa-pasteur', 'https://x.test/b.jpg', 'exterior', 'https://x.test', 'A', 'CC0', '2026-11-28'); exception when others then null; end;
end $$;
reset role;
insert into results select 'customer (even Premium) cannot add venue photos', count(*) = 0 from venue_photos where url = 'https://x.test/b.jpg';
do $$ begin
  insert into venue_photos (establishment_id, url, kind, source_url, attribution, license, last_checked_at) values ('pho-hoa-pasteur', 'http://insecure.test/c.jpg', 'exterior', 'https://x.test', 'A', 'CC0', '2026-11-28');
  insert into results values ('non-https / uncredited venue photo rejected', false);
exception when check_violation then insert into results values ('non-https / uncredited venue photo rejected', true); end $$;
do $$ begin
  insert into venue_photos (establishment_id, url, kind, source_url, attribution, license, last_checked_at) values ('pho-hoa-pasteur', 'https://x.test/d.jpg', 'stock', 'https://x.test', 'A', 'CC0', '2026-11-28');
  insert into results values ('unknown photo kind rejected', false);
exception when check_violation then insert into results values ('unknown photo kind rejected', true); end $$;
delete from venue_photos where url = 'https://upload.wikimedia.org/x.jpg';

-- ============================================================================================
-- 0016 menu unlocks + founding
-- ===================================================================================================
reset role;
insert into auth.users values ('00000000-0000-0000-0000-000000000020'), ('00000000-0000-0000-0000-000000000021'), ('00000000-0000-0000-0000-000000000022'),
  ('00000000-0000-0000-0000-000000000023'), ('00000000-0000-0000-0000-000000000024'), ('00000000-0000-0000-0000-000000000025'), ('00000000-0000-0000-0000-000000000026');
insert into results select 'quota key renamed menu_views → menu_unlocks (5 / 30 / unlimited)',
  not exists (select 1 from membership_limits where limit_key = 'menu_views')
  and (select value from membership_limits where tier = 'free' and limit_key = 'menu_unlocks') = 5
  and (select value from membership_limits where tier = 'plus' and limit_key = 'menu_unlocks') = 30
  and (select value from membership_limits where tier = 'premium' and limit_key = 'menu_unlocks') is null;
insert into results select 'billing period = calendar month in Asia/Ho_Chi_Minh', menu_unlock_period_start() = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date;
insert into results select 'enforcement is off going into 0016 tests', not enforce_limits from membership_settings;
create temp table r16 (k text, v jsonb);
grant all on r16 to anon, authenticated;
-- (a) idempotent unlock: reopening the same menu returns the existing unlock and never counts twice
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000020';
insert into r16 select 'first', unlock_menu('pho-hoa-pasteur', 'food');
insert into r16 select 'again', unlock_menu('pho-hoa-pasteur', 'food');
insert into r16 select 'usage', menu_unlock_usage();
insert into results select 'first unlock consumes one', (v->>'unlocked')::boolean and not (v->>'already')::boolean and (v->>'used')::int = 1 and (v->>'limit')::int = 5 from r16 where k = 'first';
insert into results select 'reopening the same menu is idempotent (already, still 1 used)', (v->>'unlocked')::boolean and (v->>'already')::boolean and (v->>'used')::int = 1 from r16 where k = 'again';
insert into results select 'usage meter: 1 used of 5, not enforced', (v->>'used')::int = 1 and (v->>'limit')::int = 5 and not (v->>'enforced')::boolean from r16 where k = 'usage';
insert into results select 'one unlock row stored (no double count)', count(*) = 1 from menu_unlocks where establishment_id = 'pho-hoa-pasteur';
-- (b) no direct client writes
do $$ begin
  begin insert into menu_unlocks (user_id, establishment_id, experience, period_start) values ('00000000-0000-0000-0000-000000000020', 'pho-hoa-pasteur', 'food', '2020-01-01'); exception when others then null; end;
  begin update menu_unlocks set period_start = '2020-01-01'; exception when others then null; end;
  begin delete from menu_unlocks; exception when others then null; end;
end $$;
reset role;
insert into results select 'client cannot insert/update/delete menu_unlocks directly', count(*) = 1 and bool_and(period_start = menu_unlock_period_start()) from menu_unlocks where user_id = '00000000-0000-0000-0000-000000000020';
-- (c) read-own isolation
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
insert into results select 'another member cannot read my unlocks', count(*) = 0 from menu_unlocks;
do $$ begin
  perform unlock_menu('no-such-place', 'food');
  insert into results values ('unknown establishment refused', false);
exception when others then insert into results values ('unknown establishment refused', sqlerrm = 'unknown_establishment'); end $$;
-- (d) enforcement off: a Free member may unlock more than 5 menus
do $$ declare e text; r jsonb; ok boolean := true; begin
  for e in select establishment_id from establishment_experiences where experience_id = 'food' order by 1 limit 7 loop
    r := unlock_menu(e, 'food'); ok := ok and (r->>'unlocked')::boolean;
  end loop;
  insert into results values ('limits off: Free unlocks 7 menus', ok and (menu_unlock_usage()->>'used')::int = 7);
end $$;
reset role;
set role anon;
do $$ begin
  perform unlock_menu('pho-hoa-pasteur', 'food');
  insert into results values ('guest cannot unlock', false);
exception when others then insert into results values ('guest cannot unlock', true); end $$;
reset role;
-- (e) enforcement on: Free refused above 5, re-opening an unlocked menu still allowed; Premium unlimited
update membership_settings set enforce_limits = true;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000022';
do $$ declare e text; r jsonb; n int := 0; refused jsonb; again jsonb; begin
  for e in select establishment_id from establishment_experiences where experience_id = 'food' order by 1 limit 6 loop
    r := unlock_menu(e, 'food');
    if (r->>'unlocked')::boolean then n := n + 1; else refused := r; end if;
  end loop;
  insert into results values ('enforced: Free unlocks exactly 5 menus', n = 5);
  insert into results values ('enforced: 6th unlock refused (unlocked=false, used 5, limit 5)', refused is not null and (refused->>'used')::int = 5 and (refused->>'limit')::int = 5);
  again := unlock_menu((select establishment_id from establishment_experiences where experience_id = 'food' order by 1 limit 1), 'food');
  insert into results values ('enforced: reopening an unlocked menu never consumes quota', (again->>'unlocked')::boolean and (again->>'already')::boolean and (again->>'used')::int = 5);
end $$;
reset role;
insert into results select 'refused unlock not stored', count(*) = 5 from menu_unlocks where user_id = '00000000-0000-0000-0000-000000000022';
insert into user_memberships (user_id, tier, source) values ('00000000-0000-0000-0000-000000000023', 'premium', 'test');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000023';
do $$ declare e text; ok boolean := true; begin
  for e in select establishment_id from establishment_experiences where experience_id = 'food' order by 1 limit 8 loop
    ok := ok and (unlock_menu(e, 'food')->>'unlocked')::boolean;
  end loop;
  insert into results values ('enforced: Premium unlocks are unlimited (limit null)', ok and menu_unlock_usage()->'limit' = 'null'::jsonb);
end $$;
reset role;
update membership_settings set enforce_limits = false;

-- (f) Founding Member programme (PO-approved): on by default; admin can switch it off; cap, single claim, paid refused
insert into results select 'founding programme on by default (cap 100, 90 days)', enabled and cap = 100 and duration_days = 90 from founding_programme;
set role anon;
insert into results select 'anon reads remaining founding places (count only)', founding_places_left() = 100;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
update founding_programme set enabled = false;
reset role;
insert into results select 'admin switches the founding programme off', not enabled from founding_programme;
insert into results select 'no remaining places shown while off', founding_places_left() is null;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('founding claim refused while disabled', false);
exception when others then insert into results values ('founding claim refused while disabled', sqlerrm = 'founding_refused:disabled'); end $$;
update founding_programme set enabled = true;
reset role;
insert into results select 'customer cannot switch the founding programme on', not enabled from founding_programme;
insert into results select 'disabled refusal granted nothing', count(*) = 0 from user_memberships where user_id = '00000000-0000-0000-0000-000000000024';
-- admin enables it with a cap of 2 for the test
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
update founding_programme set enabled = true, cap = 2;
reset role;
insert into results select 'admin enables the founding programme', enabled and cap = 2 from founding_programme;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
insert into r16 select 'claim', claim_founding_membership();
insert into results select 'founding claim grants Premium', (v->>'claimed')::boolean and v->>'tier' = 'premium' from r16 where k = 'claim';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('no double founding claim', false);
exception when others then insert into results values ('no double founding claim', sqlerrm = 'founding_refused:already_claimed'); end $$;
reset role;
insert into results select 'founding membership: premium, source founding, valid ~90 days', tier = 'premium' and source = 'founding' and valid_until between now() + interval '89 days' and now() + interval '91 days' from user_memberships where user_id = '00000000-0000-0000-0000-000000000024';
insert into results select 'founding grant audited', count(*) >= 1 from content_audit where table_name = 'user_memberships' and row_key = '00000000-0000-0000-0000-000000000024';
insert into results select 'founding member is Premium now', member_tier('00000000-0000-0000-0000-000000000024') = 'premium';
-- billing-tier member refused; an active (test) Premium member refused
insert into user_memberships (user_id, tier, source) values ('00000000-0000-0000-0000-000000000025', 'plus', 'billing');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('billing-tier member refused', false);
exception when others then insert into results values ('billing-tier member refused', sqlerrm = 'founding_refused:already_member'); end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000023';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('active Premium member refused', false);
exception when others then insert into results values ('active Premium member refused', sqlerrm = 'founding_refused:already_member'); end $$;
-- a second Free member takes the last place; the third is refused (cap 2)
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000021';
insert into r16 select 'claim2', claim_founding_membership();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000026';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('founding cap refusal', false);
exception when others then insert into results values ('founding cap refusal', sqlerrm = 'founding_refused:cap_reached'); end $$;
insert into results select 'member reads only own founding claim', count(*) = 0 from founding_claims;
do $$ begin
  begin insert into founding_claims (user_id, valid_until) values ('00000000-0000-0000-0000-000000000026', now()); exception when others then null; end;
end $$;
reset role;
insert into results select 'client cannot write founding_claims directly', count(*) = 2 from founding_claims;
-- expiry: the founding membership simply reverts to the default tier (no billing; Free pinned here); the place is not freed
update user_memberships set valid_until = now() - interval '1 second' where user_id = '00000000-0000-0000-0000-000000000024';
insert into results select 'expired founding membership reverts to the default tier (Free pinned)', member_tier('00000000-0000-0000-0000-000000000024') = 'free';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000026';
do $$ begin
  perform claim_founding_membership();
  insert into results values ('expiry does not free a founding place', false);
exception when others then insert into results values ('expiry does not free a founding place', sqlerrm = 'founding_refused:cap_reached'); end $$;
reset role;
update founding_programme set enabled = true, cap = 100;  -- migration default (on)

-- (g) Default member tier: Plus during development (migration default), Free when the PO flips it; grants win
reset role;
update membership_settings set default_tier = 'plus';  -- back to the migration default (pinned to Free for the 0014 tests)
insert into results select 'default member tier is Plus during development', default_tier = 'plus' from membership_settings;
insert into auth.users values ('00000000-0000-0000-0000-000000000030');
insert into results select 'no membership row → Plus (default tier)', member_tier('00000000-0000-0000-0000-000000000030') = 'plus'
  and member_limit('00000000-0000-0000-0000-000000000030', 'saved_references') = 150 and member_limit('00000000-0000-0000-0000-000000000030', 'menu_unlocks') = 30;
insert into results select 'expired grant → default tier (founding expiry reverts to Plus now)', member_tier('00000000-0000-0000-0000-000000000024') = 'plus';
insert into results select 'active founding Premium beats the default tier', member_tier('00000000-0000-0000-0000-000000000021') = 'premium';
insert into results select 'active test grant beats the default tier', member_tier('00000000-0000-0000-0000-000000000009') = 'plus' and member_tier('00000000-0000-0000-0000-000000000006') = 'premium';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000030';
insert into r16 select 'usage-default', menu_unlock_usage();
update membership_settings set default_tier = 'premium';
reset role;
insert into results select 'unlock meter uses the default tier quota (30)', (v->>'limit')::int = 30 from r16 where k = 'usage-default';
insert into results select 'customer cannot change the default tier', default_tier = 'plus' from membership_settings;
-- the PO flips the default back to Free (admin data change)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';
update membership_settings set default_tier = 'free';
reset role;
insert into results select 'default_tier flipped to free → no-row member is Free', member_tier('00000000-0000-0000-0000-000000000030') = 'free' and member_limit('00000000-0000-0000-0000-000000000030', 'menu_unlocks') = 5;
insert into results select 'flip: expired grant → Free', member_tier('00000000-0000-0000-0000-000000000024') = 'free';
do $$ begin
  update membership_settings set default_tier = 'gold';
  insert into results values ('unknown default tier rejected', false);
exception when check_violation then insert into results values ('unknown default tier rejected', true); end $$;
update membership_settings set default_tier = 'plus';
-- 0017 info reports ---------------------------------------------------------------------------------------
-- "Report incorrect information": anyone files a NEW report; only staff read all and triage; no client deletes.
reset role;
insert into auth.users values ('00000000-0000-0000-0000-000000000017');
create temp table r17_before as select (select name from restaurants where id = 'pho-hoa-pasteur') as name, (select address from restaurants where id = 'pho-hoa-pasteur') as address;
grant select on r17_before to anon, authenticated;
-- (a) guest: insert allowed (return=minimal), cannot set status / reviewer / reporter / photo, cannot read back
set role anon;
set request.jwt.claim.sub = '';
insert into info_reports (establishment_id, experience, category, details, evidence_url, contact_email)
  values ('pho-hoa-pasteur', 'food', 'incorrect-hours', 'Closes at 21:00 now, not 22:00.', 'https://example.com/post', 'guest@example.com');
do $$ begin
  begin insert into info_reports (establishment_id, experience, category, details, status) values ('pho-hoa-pasteur', 'food', 'other', 'forced resolved status', 'resolved');
  insert into results values ('guest cannot file a report as resolved', false);
  exception when others then insert into results values ('guest cannot file a report as resolved', true); end;
  begin insert into info_reports (establishment_id, experience, category, details, reviewed_by, reviewed_at, resolution_note) values ('pho-hoa-pasteur', 'food', 'other', 'forged reviewer fields', '00000000-0000-0000-0000-000000000007', now(), 'ok');
  insert into results values ('guest cannot set reviewer fields', false);
  exception when others then insert into results values ('guest cannot set reviewer fields', true); end;
  begin insert into info_reports (establishment_id, experience, category, details, reporter_id) values ('pho-hoa-pasteur', 'food', 'other', 'impersonating a user', '00000000-0000-0000-0000-000000000006');
  insert into results values ('guest cannot attribute a report to a user', false);
  exception when others then insert into results values ('guest cannot attribute a report to a user', true); end;
  begin insert into info_reports (establishment_id, experience, category, details, evidence_photo_path) values ('pho-hoa-pasteur', 'food', 'incorrect-photo', 'photo without account', '00000000-0000-0000-0000-000000000006/x.jpg');
  insert into results values ('guest cannot attach a photo path', false);
  exception when others then insert into results values ('guest cannot attach a photo path', true); end;
  begin insert into info_reports (establishment_id, experience, category, details) values ('pho-hoa-pasteur', 'food', 'hacked', 'unknown category here');
  insert into results values ('unknown report category rejected', false);
  exception when check_violation then insert into results values ('unknown report category rejected', true); end;
  begin insert into info_reports (establishment_id, experience, category, details) values ('pho-hoa-pasteur', 'food', 'other', 'x');
  insert into results values ('too-short details rejected', false);
  exception when check_violation then insert into results values ('too-short details rejected', true); end;
  begin insert into info_reports (establishment_id, experience, category, details) values ('pho-hoa-pasteur', 'food', 'other', repeat('x', 2001));
  insert into results values ('too-long details rejected', false);
  exception when check_violation then insert into results values ('too-long details rejected', true); end;
  begin insert into info_reports (establishment_id, experience, category, details, evidence_url) values ('pho-hoa-pasteur', 'food', 'other', 'javascript evidence', 'javascript:alert(1)');
  insert into results values ('non-http evidence URL rejected', false);
  exception when check_violation then insert into results values ('non-http evidence URL rejected', true); end;
  begin insert into info_reports (establishment_id, experience, category, details) values ('no-such-venue', 'food', 'other', 'venue does not exist');
  insert into results values ('report on unknown establishment rejected', false);
  exception when others then insert into results values ('report on unknown establishment rejected', true); end;
end $$;
insert into results select 'guest cannot read reports (not even their own)', count(*) = 0 from info_reports;
do $$ begin
  begin update info_reports set status = 'resolved'; exception when others then null; end;
  begin delete from info_reports; exception when others then null; end;
end $$;
reset role;
insert into results select 'guest report stored as new, unattributed, unreviewed', count(*) = 1 and bool_and(status = 'new' and reporter_id is null and reviewed_by is null and reviewed_at is null)
  from info_reports where establishment_id = 'pho-hoa-pasteur' and category = 'incorrect-hours';
insert into results select 'guest update/delete had no effect', count(*) = 1 and bool_and(status = 'new') from info_reports;
-- (b) signed-in customer: report attributed to them, photo only from own folder, reads own reports only
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000017';
insert into storage.objects (bucket_id, name) values ('report-evidence', '00000000-0000-0000-0000-000000000017/r1.jpg');
do $$ begin
  begin insert into storage.objects (bucket_id, name) values ('report-evidence', '00000000-0000-0000-0000-000000000006/r1.jpg');
  insert into results values ('report evidence upload only into own folder', false);
  exception when others then insert into results values ('report evidence upload only into own folder', true); end;
end $$;
insert into results select 'reporter cannot read evidence (staff only)', count(*) = 0 from storage.objects where bucket_id = 'report-evidence';
insert into info_reports (establishment_id, establishment_name, experience, category, details, evidence_photo_path)
  values ('pho-hoa-pasteur', 'Phở Hòa Pasteur', 'food', 'incorrect-photo', 'The header photo is another shop.', '00000000-0000-0000-0000-000000000017/r1.jpg');
insert into info_reports (establishment_id, experience, category, details) values ('pickoland-thao-dien', 'sport', 'incorrect-phone', 'Phone number rings a different business.');
do $$ begin
  begin insert into info_reports (establishment_id, experience, category, details, evidence_photo_path) values ('pho-hoa-pasteur', 'food', 'incorrect-photo', 'someone else folder photo', '00000000-0000-0000-0000-000000000006/r1.jpg');
  insert into results values ('reporter cannot attach a photo from another folder', false);
  exception when others then insert into results values ('reporter cannot attach a photo from another folder', true); end;
end $$;
insert into results select 'signed-in report attributed to the caller', count(*) = 2 and bool_and(reporter_id = '00000000-0000-0000-0000-000000000017') from info_reports;
insert into results select 'reporter reads own reports only', count(*) = 2 from info_reports;
update info_reports set status = 'resolved', resolution_note = 'self-resolved';
reset role;
insert into results select 'reporter cannot triage own report', count(*) = 0 from info_reports where status <> 'new';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';  -- another customer (Premium)
insert into results select 'other customer (even Premium) cannot read reports', count(*) = 0 from info_reports;
update info_reports set status = 'rejected';
reset role;
insert into results select 'non-staff update had no effect', count(*) = 0 from info_reports where status <> 'new';
-- (c) abuse guard: 10 per signed-in reporter / 24 h; 5 guest reports per establishment / hour
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000017';
insert into info_reports (establishment_id, experience, category, details) select 'pho-hoa-pasteur', 'food', 'other', 'burst report ' || g from generate_series(1, 8) g;
do $$ begin
  insert into info_reports (establishment_id, experience, category, details) values ('pho-hoa-pasteur', 'food', 'other', 'eleventh report today');
  insert into results values ('11th report in 24 h refused', false);
exception when others then insert into results values ('11th report in 24 h refused', sqlerrm like 'report_rate_limited:reporter%'); end $$;
reset role;
set role anon;
set request.jwt.claim.sub = '';
insert into info_reports (establishment_id, experience, category, details) select 'banh-mi-huynh-hoa', 'food', 'other', 'guest burst ' || g from generate_series(1, 5) g;
do $$ begin
  insert into info_reports (establishment_id, experience, category, details) values ('banh-mi-huynh-hoa', 'food', 'other', 'sixth guest report');
  insert into results values ('6th guest report per establishment per hour refused', false);
exception when others then insert into results values ('6th guest report per establishment per hour refused', sqlerrm like 'report_rate_limited:establishment%'); end $$;
insert into info_reports (establishment_id, experience, category, details) values ('pho-hoa-pasteur', 'food', 'other', 'another venue still accepted');
reset role;
insert into results select 'guest limit is per establishment', count(*) = 2 from info_reports where reporter_id is null and establishment_id = 'pho-hoa-pasteur';
-- (d) staff: a reviewer reads all + evidence and triages (stamped + audited); report body immutable; no delete
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000008';  -- reviewer
insert into results select 'staff reads every report', count(*) = 17 from info_reports;
insert into results select 'staff reads report evidence', count(*) = 1 from storage.objects where bucket_id = 'report-evidence';
update info_reports set status = 'reviewing', resolution_note = 'Checking the venue page.' where category = 'incorrect-photo';
do $$ begin
  update info_reports set details = 'rewritten by staff' where category = 'incorrect-photo';
  insert into results values ('report body cannot be rewritten', false);
exception when others then insert into results values ('report body cannot be rewritten', true); end $$;
do $$ begin
  update info_reports set status = 'archived' where category = 'incorrect-photo';
  insert into results values ('unknown report status rejected', false);
exception when check_violation then insert into results values ('unknown report status rejected', true); end $$;
delete from info_reports;
reset role;
insert into results select 'staff triage stamped with reviewer + time', status = 'reviewing' and reviewed_by = '00000000-0000-0000-0000-000000000008' and reviewed_at is not null and resolution_note = 'Checking the venue page.'
  from info_reports where category = 'incorrect-photo';
insert into results select 'staff status change audited', count(*) = 1 from content_audit c join info_reports r on c.row_key = r.id::text
  where c.table_name = 'info_reports' and r.category = 'incorrect-photo' and c.action = 'UPDATE' and c.changed_by = '00000000-0000-0000-0000-000000000008' and c.new_row->>'status' = 'reviewing';
insert into results select 'no client can delete reports', count(*) = 17 from info_reports;
insert into results select 'reports never change the listing', r.name = b.name and r.address = b.address from restaurants r, r17_before b where r.id = 'pho-hoa-pasteur';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000007';  -- admin resolves
update info_reports set status = 'resolved', resolution_note = 'Photo removed by editor.' where category = 'incorrect-photo';
reset role;
insert into results select 'admin resolves a report', status = 'resolved' and reviewed_by = '00000000-0000-0000-0000-000000000007' from info_reports where category = 'incorrect-photo';
insert into results select 'info_reports trigger functions not executable by API roles', not has_function_privilege('anon', 'info_report_before_insert()', 'execute')
  and not has_function_privilege('anon', 'audit_info_report()', 'execute') and not has_function_privilege('anon', 'info_report_before_update()', 'execute');
-- end 0017 info reports -----------------------------------------------------------------------------------

select (case when ok then 'PASS ' else 'FAIL ' end) || name from results;
select case when bool_and(ok) then 'ALL DB TESTS PASSED' else 'DB TESTS FAILED' end from results;

-- Database security tests (run by scripts/test-db.sh against a local PostgreSQL + PostGIS).
\set ON_ERROR_STOP 1
set search_path = public, extensions;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into user_roles values ('00000000-0000-0000-0000-000000000001', 'editor');
-- a candidate link (admin only)
insert into dish_restaurant_links (dish_id, restaurant_id, status, menu_evidence) values ('thang-co', 'pho-hoa-pasteur', 'candidate', '{"type":"search-result","note":"test"}');

create temp table results (name text, ok boolean);
grant all on results to anon, authenticated;

-- 1. anonymous read: catalogue visible, candidate hidden, writes refused
set role anon;
insert into results select 'anon reads 138 dishes', count(*) = 138 from dishes;
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
insert into results select 'dishes.eating defaults to unknown (null)', bool_and(eating is null) from dishes;
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
insert into results select 'seeded legacy spice levels unchanged (all recorded)', count(*) = 0 from dishes where id <> 'kex-unknown-spice' and spice_level is null;

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

select (case when ok then 'PASS ' else 'FAIL ' end) || name from results;
select case when bool_and(ok) then 'ALL DB TESTS PASSED' else 'DB TESTS FAILED' end from results;

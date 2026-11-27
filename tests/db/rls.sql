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
reset role;
insert into results select 'non-editor update had no effect', name_en <> 'y' from dishes where id = 'mi-quang';

-- 3. editor: can see candidates and edit content
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into results select 'editor sees candidate links', count(*) = 1 from dish_restaurant_links where status = 'candidate';
update dishes set name_en = 'Quảng noodles (edited)' where id = 'mi-quang';
insert into results select 'editor cannot see other user saved rows', count(*) = 0 from saved_experiences;
reset role;
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
insert into results select 'guest merge upsert keeps one row with earliest date', count(*) = 1 and min(occurred_on) = '2026-10-01' from experience_history;
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

select (case when ok then 'PASS ' else 'FAIL ' end) || name from results;
select case when bool_and(ok) then 'ALL DB TESTS PASSED' else 'DB TESTS FAILED' end from results;

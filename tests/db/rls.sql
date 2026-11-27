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
insert into user_saved (user_id, dish_id) values ('00000000-0000-0000-0000-000000000002', 'mi-quang');
insert into results select 'user sees own saved row', count(*) = 1 from user_saved;
reset role;
insert into results select 'non-editor update had no effect', name_en <> 'y' from dishes where id = 'mi-quang';

-- 3. editor: can see candidates and edit content
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into results select 'editor sees candidate links', count(*) = 1 from dish_restaurant_links where status = 'candidate';
update dishes set name_en = 'Quảng noodles (edited)' where id = 'mi-quang';
insert into results select 'editor cannot see other user saved rows', count(*) = 0 from user_saved;
reset role;
insert into results select 'editor update persisted', name_en = 'Quảng noodles (edited)' from dishes where id = 'mi-quang';

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

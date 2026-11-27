-- Multi-experience foundations (Food stays the reference implementation; nothing is renamed or dropped).
-- Additive and idempotent. See docs/EXPERIENCE_ENGINE.md.

-- 1. Module status: add "pilot-planned" (Sport) and register all six modules in Settings order.
alter table experience_modules drop constraint if exists experience_modules_status_check;
alter table experience_modules add constraint experience_modules_status_check check (status in ('active','coming-soon','pilot-planned'));
insert into experience_modules (id, status, sort_order) values
  ('food','active',0), ('bars','coming-soon',1), ('coffee','coming-soon',2), ('spa','coming-soon',3), ('shopping','coming-soon',4), ('sport','pilot-planned',5)
on conflict (id) do update set status = excluded.status, sort_order = excluded.sort_order;

-- 2. An establishment can belong to several experience modes (e.g. a café that is also a bar).
--    The existing `restaurants` table stays the shared establishment table; Food rows are back-filled.
create table if not exists establishment_experiences (
  establishment_id text not null references restaurants(id) on delete cascade,
  experience_id text not null references experience_modules(id),
  primary key (establishment_id, experience_id)
);
insert into establishment_experiences (establishment_id, experience_id) select id, 'food' from restaurants on conflict do nothing;
alter table establishment_experiences enable row level security;
drop policy if exists "public read" on establishment_experiences;
create policy "public read" on establishment_experiences for select using (true);
drop policy if exists "editors write" on establishment_experiences;
create policy "editors write" on establishment_experiences for all using (is_editor()) with check (is_editor());

-- New Food establishments are tagged automatically so existing import paths keep working.
create or replace function tag_food_establishment() returns trigger language plpgsql as $$
begin
  insert into establishment_experiences (establishment_id, experience_id) values (new.id, 'food') on conflict do nothing;
  return new;
end $$;
drop trigger if exists tag_food_establishment on restaurants;
create trigger tag_food_establishment after insert on restaurants for each row execute function tag_food_establishment();

-- 3. Passport rows for every experience: generic item types and actions (Food values unchanged).
--    item  = an experience item (drink, coffee, treatment, activity); instructor = Sport/Spa practitioner.
do $$
declare t text;
begin
  foreach t in array array['saved_experiences','experience_history','tasting_notes','user_media'] loop
    execute format('alter table %I drop constraint if exists %I', t, t || '_item_type_check');
    execute format($f$alter table %I add constraint %I check (item_type in ('dish','establishment','item','instructor'))$f$, t, t || '_item_type_check');
  end loop;
end $$;
alter table experience_history drop constraint if exists experience_history_action_check;
alter table experience_history add constraint experience_history_action_check check (action in ('tried','visited','attended','completed'));

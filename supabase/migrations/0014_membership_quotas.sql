-- 0014 · Membership quotas, enforced in the database (KEX-MEM-04 foundation; D72, D76).
--
-- * Quotas are configuration (membership_limits), not code: prices and quotas are proposals, editable by admins.
-- * Enforcement is OFF (membership_settings.enforce_limits = false) until paid plans can be bought — no member may hit a
--   cap they cannot upgrade past. Turning it on is an admin data change, together with the client gate + checkout.
-- * When on, a BEFORE INSERT trigger on saved_experiences refuses a NEW saved reference or a NEW collection above the
--   member's quota. Re-saving an already-saved reference (e.g. into another collection) never counts twice.
-- * Downgrade retention: only inserts are checked, so existing saves stay readable; Passport history
--   (experience_history) and notes are never limited. Guests have no rows here (device-only data).
-- * Concurrency: a per-user, per-experience transaction advisory lock serialises the count-then-insert across devices.
set search_path = public, extensions;

create table if not exists membership_settings (
  id boolean primary key default true check (id),            -- single row
  enforce_limits boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into membership_settings (id) values (true) on conflict (id) do nothing;

create table if not exists membership_limits (
  tier text not null check (tier in ('free', 'plus', 'premium')),
  limit_key text not null check (limit_key in ('saved_references', 'collections', 'menu_views', 'preference_presets', 'saved_locations')),
  value integer check (value is null or value >= 0),          -- null = unlimited
  primary key (tier, limit_key)
);
-- Proposed defaults (PO, 28 Nov 2026). Kept in step with src/lib/membership/plans.ts (unit-tested).
insert into membership_limits (tier, limit_key, value) values
  ('free', 'saved_references', 20), ('plus', 'saved_references', 150), ('premium', 'saved_references', null),
  ('free', 'collections', 2),       ('plus', 'collections', 10),       ('premium', 'collections', null),
  ('free', 'menu_views', 5),        ('plus', 'menu_views', 30),        ('premium', 'menu_views', null),
  ('free', 'preference_presets', 3),('plus', 'preference_presets', 10),('premium', 'preference_presets', null),
  ('free', 'saved_locations', 2),   ('plus', 'saved_locations', 10),   ('premium', 'saved_locations', null)
on conflict (tier, limit_key) do nothing;

alter table membership_settings enable row level security;
alter table membership_limits enable row level security;
drop policy if exists "public read" on membership_settings;
drop policy if exists "admins update" on membership_settings;
drop policy if exists "public read" on membership_limits;
drop policy if exists "admins write" on membership_limits;
-- Plan terms are public information; only admins change them.
create policy "public read" on membership_settings for select using (true);
create policy "admins update" on membership_settings for update using ((select is_admin())) with check ((select is_admin()));
create policy "public read" on membership_limits for select using (true);
create policy "admins write" on membership_limits for all using ((select is_admin())) with check ((select is_admin()));

-- The member's effective tier: an unexpired membership row, else free.
create or replace function member_tier(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select m.tier from user_memberships m where m.user_id = uid and (m.valid_until is null or m.valid_until > now())), 'free');
$$;
-- A quota for a member: null = unlimited.
create or replace function member_limit(uid uuid, key text) returns integer
language sql stable security definer set search_path = public as $$
  select l.value from membership_limits l where l.tier = member_tier(uid) and l.limit_key = key;
$$;
revoke execute on function member_tier(uuid) from public, anon;
revoke execute on function member_limit(uuid, text) from public, anon;
grant execute on function member_tier(uuid) to authenticated;
grant execute on function member_limit(uuid, text) to authenticated;

create or replace function enforce_saved_quota() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim integer; used integer;
begin
  if not coalesce((select enforce_limits from membership_settings where id), false) then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || '|' || new.experience_id));
  -- a new saved reference (unique item or establishment within the experience)?
  if not exists (select 1 from saved_experiences s where s.user_id = new.user_id and s.experience_id = new.experience_id
                 and s.item_type = new.item_type and s.item_id = new.item_id) then
    lim := member_limit(new.user_id, 'saved_references');
    if lim is not null then
      select count(*) into used from (select distinct item_type, item_id from saved_experiences
        where user_id = new.user_id and experience_id = new.experience_id) x;
      if used >= lim then raise exception 'quota_exceeded:saved_references:%', lim using errcode = 'P0001'; end if;
    end if;
  end if;
  -- a new named collection within the experience?
  if new.collection <> '' and not exists (select 1 from saved_experiences s where s.user_id = new.user_id
                 and s.experience_id = new.experience_id and s.collection = new.collection) then
    lim := member_limit(new.user_id, 'collections');
    if lim is not null then
      select count(distinct collection) into used from saved_experiences
        where user_id = new.user_id and experience_id = new.experience_id and collection <> '';
      if used >= lim then raise exception 'quota_exceeded:collections:%', lim using errcode = 'P0001'; end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function enforce_saved_quota() from public, anon, authenticated;
drop trigger if exists saved_experiences_quota on saved_experiences;
create trigger saved_experiences_quota before insert on saved_experiences for each row execute function enforce_saved_quota();

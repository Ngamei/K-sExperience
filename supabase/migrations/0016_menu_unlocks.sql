-- 0016 · Complete menu unlocks + K's Founding Member programme (KEX-MEM-04 foundation; PO decisions 2026-11-28).
--
-- Menu unlocks
-- * One unlock = access to ONE establishment's complete available menu prices for the current billing period.
--   Reopening the same unlocked menu in that period never consumes quota (unique per user × establishment × period).
-- * Quotas: Free 5, Plus 30, Premium unlimited per period (membership_limits key `menu_unlocks`, renamed here from
--   0014's `menu_views` so code, database and the unit parity test use one name).
-- * Billing period: until billing exists it is the calendar month in Asia/Ho_Chi_Minh time
--   (menu_unlock_period_start()). Once subscriptions exist it follows the subscription period (only that function changes).
-- * Quota is checked only when membership_settings.enforce_limits is on (it is OFF). While off, unlocks are still
--   recorded (usage meter) but never refused.
-- * Clients cannot write menu_unlocks directly: no insert/update/delete policy; the only writer is unlock_menu(),
--   which is idempotent and serialised per user with a transaction advisory lock (no double count across devices).
--
-- Default member tier: membership_settings.default_tier ('plus' during development; PO switches it to 'free' later)
-- applies to signed-in members without an active membership row (section 1b).
--
-- Founding Member programme (approved by the PO 2026-11-28; configurable, admins can switch it off)
-- * founding_programme (single row): enabled true, cap 100 members, duration_days 90 (mirrored in plans.ts
--   FOUNDING_PROGRAMME; a unit test keeps the defaults in step). founding_places_left() exposes a count only.
-- * claim_founding_membership(): complimentary Premium for duration_days, source 'founding'. No automatic billing
--   afterwards — at valid_until the membership simply reverts to the default tier (member_tier() ignores expired rows).
-- * founding_claims is the ledger of every claim ever made: the cap counts it, so an expired or overwritten
--   membership row never frees a place, and a member can claim only once. A global advisory lock serialises claims
--   so the cap cannot be exceeded concurrently. The membership grant is audited by the 0013 trigger.
set search_path = public, extensions;

-- 1. Rename the quota key menu_views → menu_unlocks ----------------------------------------------------------
alter table membership_limits drop constraint if exists membership_limits_limit_key_check;
update membership_limits set limit_key = 'menu_unlocks' where limit_key = 'menu_views';
alter table membership_limits add constraint membership_limits_limit_key_check
  check (limit_key in ('saved_references', 'collections', 'menu_unlocks', 'preference_presets', 'saved_locations'));

-- 1b. Default member tier (PO 2026-11-28) -------------------------------------------------------------------
-- A signed-in member without an active user_memberships row (no row, or an expired one) gets default_tier:
-- 'plus' while the product is in development; the PO switches it back to 'free' when development is done
-- (one admin data change). An active row (founding, test or admin grant, billing) always takes precedence.
-- Mirrored in plans.ts DEFAULT_MEMBER_TIER (unit-tested). Used by member_tier() → member_limit() → every quota check.
alter table membership_settings add column if not exists default_tier text not null default 'plus' check (default_tier in ('free', 'plus', 'premium'));

-- The member's stored tier: an unexpired membership row's tier, else null.
create or replace function member_stored_tier(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.tier from user_memberships m where m.user_id = uid and (m.valid_until is null or m.valid_until > now());
$$;
-- The member's effective tier: the stored tier, else the configured default tier.
create or replace function member_tier(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(member_stored_tier(uid), (select s.default_tier from membership_settings s where s.id), 'free');
$$;
revoke execute on function member_stored_tier(uuid) from public, anon;
grant execute on function member_stored_tier(uuid) to authenticated;

-- 2. Menu unlocks --------------------------------------------------------------------------------------------
-- Start of the current billing period: calendar month in Ho Chi Minh City time (until subscriptions exist).
create or replace function menu_unlock_period_start() returns date
language sql stable set search_path = public as $$
  select date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

create table if not exists menu_unlocks (
  user_id uuid not null references auth.users on delete cascade,
  establishment_id text not null references restaurants(id) on delete cascade,
  experience text not null references experience_modules(id),
  period_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, establishment_id, period_start)
);
create index if not exists menu_unlocks_user_period on menu_unlocks (user_id, period_start);
alter table menu_unlocks enable row level security;
drop policy if exists "read own menu unlocks" on menu_unlocks;
create policy "read own menu unlocks" on menu_unlocks for select using ((select auth.uid()) = user_id);
-- No insert/update/delete policy: only unlock_menu() (security definer) writes.
revoke insert, update, delete on menu_unlocks from anon, authenticated;

-- Usage for the meter: unlocks used this period and the member's quota (limit null = unlimited).
create or replace function menu_unlock_usage() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); ps date := menu_unlock_period_start();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'used', (select count(*) from menu_unlocks u where u.user_id = uid and u.period_start = ps),
    'limit', member_limit(uid, 'menu_unlocks'),
    'period_start', ps,
    'enforced', coalesce((select enforce_limits from membership_settings where id), false));
end $$;

-- Unlock one establishment's complete menu for the current period. Idempotent: an existing unlock is returned
-- without consuming quota. Returns {unlocked, already, used, limit, period_start}; unlocked = false only when
-- enforcement is on and the quota is used up.
create or replace function unlock_menu(p_establishment_id text, p_experience text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); ps date := menu_unlock_period_start(); lim integer; used integer; enforced boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from establishment_experiences e where e.establishment_id = p_establishment_id and e.experience_id = p_experience) then
    raise exception 'unknown_establishment' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtext('menu_unlock|' || uid::text));
  select count(*) into used from menu_unlocks u where u.user_id = uid and u.period_start = ps;
  lim := member_limit(uid, 'menu_unlocks');
  if exists (select 1 from menu_unlocks u where u.user_id = uid and u.establishment_id = p_establishment_id and u.period_start = ps) then
    return jsonb_build_object('unlocked', true, 'already', true, 'used', used, 'limit', lim, 'period_start', ps);
  end if;
  enforced := coalesce((select enforce_limits from membership_settings where id), false);
  if enforced and lim is not null and used >= lim then
    return jsonb_build_object('unlocked', false, 'already', false, 'used', used, 'limit', lim, 'period_start', ps);
  end if;
  insert into menu_unlocks (user_id, establishment_id, experience, period_start) values (uid, p_establishment_id, p_experience, ps);
  return jsonb_build_object('unlocked', true, 'already', false, 'used', used + 1, 'limit', lim, 'period_start', ps);
end $$;
revoke execute on function menu_unlock_usage() from public, anon;
revoke execute on function unlock_menu(text, text) from public, anon;
grant execute on function menu_unlock_period_start() to anon, authenticated;
grant execute on function menu_unlock_usage() to authenticated;
grant execute on function unlock_menu(text, text) to authenticated;

-- 3. Founding Member programme ---------------------------------------------------------------------------------
alter table user_memberships drop constraint if exists user_memberships_source_check;
alter table user_memberships add constraint user_memberships_source_check check (source in ('test', 'grant', 'billing', 'founding'));

create table if not exists founding_programme (
  id boolean primary key default true check (id),            -- single row
  enabled boolean not null default true,                     -- approved by the PO 2026-11-28
  cap integer not null default 100 check (cap >= 0),
  duration_days integer not null default 90 check (duration_days > 0),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into founding_programme (id) values (true) on conflict (id) do nothing;
alter table founding_programme enable row level security;
drop policy if exists "public read" on founding_programme;
drop policy if exists "admins update" on founding_programme;
create policy "public read" on founding_programme for select using (true);
create policy "admins update" on founding_programme for update using ((select is_admin())) with check ((select is_admin()));

-- Every claim ever made (the cap counts this ledger, not current membership rows).
create table if not exists founding_claims (
  user_id uuid primary key references auth.users on delete cascade,
  claimed_at timestamptz not null default now(),
  valid_until timestamptz not null
);
alter table founding_claims enable row level security;
drop policy if exists "read own founding claim" on founding_claims;
create policy "read own founding claim" on founding_claims for select using ((select auth.uid()) = user_id or (select is_admin()));
revoke insert, update, delete on founding_claims from anon, authenticated;

-- Claim a complimentary Founding Premium membership. Refusals raise 'founding_refused:<reason>' with reason
-- disabled | cap_reached | already_claimed | already_member.
create or replace function claim_founding_membership() returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg founding_programme; until timestamptz;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtext('founding_programme'));
  select * into cfg from founding_programme where id;
  if not found or not cfg.enabled then raise exception 'founding_refused:disabled' using errcode = 'P0001'; end if;
  if exists (select 1 from founding_claims c where c.user_id = uid) then raise exception 'founding_refused:already_claimed' using errcode = 'P0001'; end if;
  -- Already on a paid or billing tier (an active stored Plus/Premium row, or any billing-managed membership): nothing
  -- to give. The default tier (Plus during development) does not count — any such member may become a Founding Member.
  if coalesce(member_stored_tier(uid), 'free') <> 'free' or exists (select 1 from user_memberships m where m.user_id = uid and m.source = 'billing') then
    raise exception 'founding_refused:already_member' using errcode = 'P0001';
  end if;
  if (select count(*) from founding_claims) >= cfg.cap then raise exception 'founding_refused:cap_reached' using errcode = 'P0001'; end if;
  until := now() + make_interval(days => cfg.duration_days);
  insert into founding_claims (user_id, valid_until) values (uid, until);
  insert into user_memberships (user_id, tier, source, valid_until, updated_by, updated_at)
  values (uid, 'premium', 'founding', until, uid, now())
  on conflict (user_id) do update set tier = 'premium', source = 'founding', valid_until = until, updated_by = uid, updated_at = now();
  return jsonb_build_object('claimed', true, 'tier', 'premium', 'valid_until', until);
end $$;
revoke execute on function claim_founding_membership() from public, anon;
grant execute on function claim_founding_membership() to authenticated;

-- Remaining Founding places (a count only — no user data). Null while the programme is switched off.
create or replace function founding_places_left() returns integer
language sql stable security definer set search_path = public as $$
  select case when p.enabled then greatest(p.cap - (select count(*) from founding_claims)::integer, 0) end
  from founding_programme p where p.id;
$$;
revoke execute on function founding_places_left() from public;
grant execute on function founding_places_left() to anon, authenticated;

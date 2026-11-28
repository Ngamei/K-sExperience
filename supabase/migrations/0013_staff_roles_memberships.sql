-- 0013 · Staff roles and customer memberships are separate things (KEX-SEC-02).
--
--  * Staff permissions live in user_roles (admin, editor = Data Editor, researcher, reviewer = Data Reviewer).
--    Only admin/editor may write the catalogue (is_editor(), unchanged). Researchers and reviewers are read-only staff.
--  * Customer membership (free / plus / premium) lives in user_memberships. It is an entitlement, never a permission:
--    no policy or function below grants anything because of a tier, and is_editor()/is_staff() never read it.
--  * Nobody can grant themselves a role or a tier: user_roles has no client write policy at all, and
--    user_memberships is writable only by an admin (test entitlements now; the billing webhook later, via the service role).
-- No live payments: `source` is 'test' or 'grant' until billing exists ('billing' reserved for that integration).
set search_path = public, extensions;

-- 1. Staff roles -----------------------------------------------------------------------------------------
alter table user_roles drop constraint if exists user_roles_role_check;
alter table user_roles add constraint user_roles_role_check check (role in ('admin', 'editor', 'researcher', 'reviewer'));

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles r where r.user_id = auth.uid() and r.role in ('admin', 'editor', 'researcher', 'reviewer'));
$$;
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles r where r.user_id = auth.uid() and r.role = 'admin');
$$;
-- Like is_editor(): callable by the API roles because RLS policies call it as the requester; it only answers for the caller.
revoke execute on function is_staff() from public;
revoke execute on function is_admin() from public;
grant execute on function is_staff() to anon, authenticated;
grant execute on function is_admin() to anon, authenticated;

-- Every staff role may read the content audit trail (writes stay admin/editor only).
drop policy if exists "editors read audit" on content_audit;
drop policy if exists "staff read audit" on content_audit;
create policy "staff read audit" on content_audit for select using ((select is_staff()));

-- 2. Customer memberships --------------------------------------------------------------------------------
create table if not exists user_memberships (
  user_id uuid primary key references auth.users on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'plus', 'premium')),
  source text not null default 'test' check (source in ('test', 'grant', 'billing')),
  valid_until timestamptz,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table user_memberships enable row level security;
drop policy if exists "read own membership" on user_memberships;
drop policy if exists "admins manage memberships" on user_memberships;
drop policy if exists "admins insert memberships" on user_memberships;
drop policy if exists "admins update memberships" on user_memberships;
drop policy if exists "admins delete memberships" on user_memberships;
-- A customer sees only their own tier; an admin can see all (Users & Memberships module).
create policy "read own membership" on user_memberships for select using ((select auth.uid()) = user_id or (select is_admin()));
create policy "admins insert memberships" on user_memberships for insert with check ((select is_admin()));
create policy "admins update memberships" on user_memberships for update using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete memberships" on user_memberships for delete using ((select is_admin()));

-- Audit every membership change (who granted what to whom).
create or replace function audit_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, coalesce(new.user_id, old.user_id)::text, tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
revoke execute on function audit_membership() from public, anon, authenticated;
drop trigger if exists audit_user_memberships on user_memberships;
create trigger audit_user_memberships after insert or update or delete on user_memberships for each row execute function audit_membership();

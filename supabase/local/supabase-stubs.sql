-- LOCAL TESTING ONLY: minimal stand-ins for objects that exist in every Supabase project.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
-- Like Supabase: the user id comes from the JWT 'sub' claim of the current request.
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

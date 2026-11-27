-- K's Experience — user accounts & the shared Experience Passport (P0).
-- One account for every experience module (food active; coffee/bars/spa/shopping later).
-- Replaces the never-provisioned user_saved / user_tried / user_collection* tables from 0001.
set search_path = public, extensions;

drop table if exists user_collection_items, user_collections, user_saved, user_tried cascade;

create table user_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  locale text not null default 'en' check (locale in ('en','vi')),
  share_passport boolean not null default false,          -- privacy: passport is private by default
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid references auth.users on delete cascade,
  experience_id text references experience_modules(id),
  prefs jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

-- Saved items across experiences (dishes, establishments; later cafés, bars, …)
create table saved_experiences (
  user_id uuid references auth.users on delete cascade,
  experience_id text not null references experience_modules(id),
  item_type text not null check (item_type in ('dish','establishment')),
  item_id text not null,
  collection text not null default '',                     -- '' = default "Saved" list; else collection name
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id, item_type, item_id, collection)
);

-- Passport history: tried dishes, visited establishments. One row per item+action (no duplicates).
create table experience_history (
  user_id uuid references auth.users on delete cascade,
  experience_id text not null references experience_modules(id),
  item_type text not null check (item_type in ('dish','establishment')),
  item_id text not null,
  action text not null check (action in ('tried','visited')),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id, item_type, item_id, action)
);

create table tasting_notes (
  user_id uuid references auth.users on delete cascade,
  experience_id text not null references experience_modules(id),
  item_type text not null check (item_type in ('dish','establishment')),
  item_id text not null,
  rating smallint check (rating between 1 and 5),
  note text check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, experience_id, item_type, item_id)
);

create table user_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  experience_id text not null references experience_modules(id),
  item_type text not null check (item_type in ('dish','establishment')),
  item_id text not null,
  storage_path text not null,                              -- user-media/<user_id>/...
  caption text,
  created_at timestamptz not null default now()
);

create table user_achievements (
  user_id uuid references auth.users on delete cascade,
  experience_id text not null references experience_modules(id),
  code text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, experience_id, code)
);

-- Private by default: every row is visible/editable only by its owner.
do $$
declare t text;
begin
  foreach t in array array['user_profiles','user_preferences','saved_experiences','experience_history','tasting_notes','user_media','user_achievements'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "owner all" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Profile row created automatically for every new account.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into user_profiles (user_id, display_name) values (new.id, nullif(split_part(coalesce(new.email, ''), '@', 1), ''))
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Account deletion by the user themself (cascades to all personal rows).
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;

-- Personal photos: private bucket, each user owns the folder named after their id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-media', 'user-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "user media owner read" on storage.objects for select using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user media owner write" on storage.objects for insert with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user media owner delete" on storage.objects for delete using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

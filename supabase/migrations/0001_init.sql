-- K's Experience — initial schema (Supabase PostgreSQL + PostGIS).
-- STATUS: authored, NOT yet applied to any Supabase project (no credentials in this checkpoint).
-- Mirrors src/lib/data/schema.ts. Local mode reads the JSON files in data/ instead.

create extension if not exists postgis;

-- Experiences (shared infrastructure for future modules) --------------------------------------
create table experience_modules (
  id text primary key,                         -- food | bars | coffee | spa | shopping
  status text not null check (status in ('active','coming-soon')),
  sort_order int not null default 0
);

-- Geography -------------------------------------------------------------------------------------
create table regions (
  id text primary key,
  name_vi text not null, name_en text not null,
  color text, sort_order int, blurb_vi text, blurb_en text
);

create table provinces (                        -- 63 historical provinces (culinary identities)
  id text primary key,
  name_vi text not null, name_en text not null, iso text not null,
  region_id text not null references regions(id),
  kind text not null check (kind in ('city','province')),
  current_unit_id text not null,                -- post-1 July 2025 unit (34)
  current_unit_name_vi text not null,
  label_point geography(Point, 4326) not null,
  boundary geography(MultiPolygon, 4326)
);

-- Dishes -----------------------------------------------------------------------------------------
create table dishes (
  id text primary key,
  name_vi text not null, name_en text not null,
  alt_names text[] not null default '{}',
  category text not null check (category in ('savory','sweet','snack')),
  dish_type text not null,
  family text,
  ingredients text[] not null default '{}',
  taste text[] not null default '{}',
  spice_level smallint not null check (spice_level between 0 and 3),
  dietary text[] not null default '{}',
  meal_times text[] not null default '{}',
  description_vi text not null default '', description_en text not null default '',
  prominence smallint not null check (prominence between 1 and 3),
  dataset text not null check (dataset in ('seed','master')),
  verification_status text not null check (verification_status in ('seed-unverified','pending-review','verified','rejected')),
  verification_notes text, verified_at date,
  search_text text generated always as (lower(name_vi || ' ' || name_en || ' ' || array_to_string(alt_names, ' '))) stored,
  updated_at timestamptz not null default now()
);
create index dishes_category_idx on dishes(category);

create table dish_origins (
  dish_id text not null references dishes(id) on delete cascade,
  province_id text references provinces(id),
  region_id text not null references regions(id),
  role text not null check (role in ('primary','associated')),
  unique (dish_id, province_id, region_id)
);

create table dish_photos (
  id bigserial primary key,
  dish_id text not null references dishes(id) on delete cascade,
  storage_path text not null,                   -- Supabase Storage
  credit text not null, license text not null, source_url text
);

create table dish_sources (
  id bigserial primary key,
  dish_id text not null references dishes(id) on delete cascade,
  title text not null, url text, accessed date, note text
);

-- HCMC establishments -------------------------------------------------------------------------
create table restaurants (
  id text primary key,
  name text not null,
  is_sample boolean not null default false,
  address text not null,
  neighbourhood text not null,
  location geography(Point, 4326) not null,
  venue_type text not null,
  price_range text check (price_range in ('$','$$','$$$','$$$$')),
  opening_hours jsonb,
  contact jsonb,
  delivery_links jsonb not null default '[]',
  last_verified date,
  constraint real_venues_need_verification check (is_sample or last_verified is not null)
);
create index restaurants_location_idx on restaurants using gist(location);

create table restaurant_sources (
  id bigserial primary key,
  restaurant_id text not null references restaurants(id) on delete cascade,
  title text not null, url text, accessed date, note text
);

create table dish_restaurant_links (
  dish_id text not null references dishes(id) on delete cascade,
  restaurant_id text not null references restaurants(id) on delete cascade,
  status text not null check (status in ('verified-available','unverified','temporarily-unavailable')),
  menu_evidence jsonb,
  price_min_vnd int, price_max_vnd int,
  last_verified date,
  primary key (dish_id, restaurant_id),
  constraint verified_needs_evidence check (status <> 'verified-available' or (menu_evidence is not null and last_verified is not null))
);

-- HCMC-only enforcement: venues must fall inside the current (2025) HCMC boundary.
create table service_areas (id text primary key, boundary geography(MultiPolygon, 4326) not null);
create or replace function enforce_hcmc() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from service_areas s where s.id = 'ho-chi-minh' and st_covers(s.boundary, new.location)) then
    raise exception 'Establishment % is outside Ho Chi Minh City', new.id;
  end if;
  return new;
end $$;
create trigger restaurants_hcmc_only before insert or update on restaurants for each row execute function enforce_hcmc();

-- Per-user data (Supabase Auth) --------------------------------------------------------------------
create table user_saved (user_id uuid references auth.users on delete cascade, dish_id text references dishes(id) on delete cascade, created_at timestamptz default now(), primary key (user_id, dish_id));
create table user_tried (user_id uuid references auth.users on delete cascade, dish_id text references dishes(id) on delete cascade, tried_on date not null default current_date, primary key (user_id, dish_id));
create table user_collections (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null);
create table user_collection_items (collection_id uuid references user_collections(id) on delete cascade, dish_id text references dishes(id) on delete cascade, primary key (collection_id, dish_id));
create table user_roles (user_id uuid primary key references auth.users on delete cascade, role text not null check (role in ('admin','editor')));

-- Row level security ----------------------------------------------------------------------------
alter table dishes enable row level security;
alter table dish_origins enable row level security;
alter table restaurants enable row level security;
alter table dish_restaurant_links enable row level security;
alter table user_saved enable row level security;
alter table user_tried enable row level security;
alter table user_collections enable row level security;
alter table user_collection_items enable row level security;

create policy "public read dishes" on dishes for select using (verification_status <> 'rejected');
create policy "public read origins" on dish_origins for select using (true);
create policy "public read real restaurants" on restaurants for select using (not is_sample);
create policy "public read real links" on dish_restaurant_links for select using (true);
create policy "own saved" on user_saved for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tried" on user_tried for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collections" on user_collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collection items" on user_collection_items for all
  using (exists (select 1 from user_collections c where c.id = collection_id and c.user_id = auth.uid()));
create policy "admins write dishes" on dishes for all
  using (exists (select 1 from user_roles r where r.user_id = auth.uid() and r.role in ('admin','editor')));
create policy "admins write restaurants" on restaurants for all
  using (exists (select 1 from user_roles r where r.user_id = auth.uid() and r.role in ('admin','editor')));
create policy "admins write links" on dish_restaurant_links for all
  using (exists (select 1 from user_roles r where r.user_id = auth.uid() and r.role in ('admin','editor')));

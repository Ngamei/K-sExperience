-- Shared Experience Engine tables for modules other than Food (Coffee pilot first).
-- Food keeps `dishes` + `dish_restaurant_links` as its module extension; nothing is renamed or moved.
-- Mirrors src/engine/schema.ts. Additive and idempotent.

create table if not exists experience_items (
  id text primary key,
  experience_id text not null references experience_modules(id),
  name_vi text not null,
  name_en text not null,
  alt_names text[] not null default '{}',
  category text not null,
  attributes jsonb not null default '{}'::jsonb,       -- module-specific attributes (registry `attributes`)
  description_vi text not null default '',
  description_en text not null default '',
  photos jsonb not null default '[]'::jsonb,          -- [{url, credit, license, sourceUrl}]
  sources jsonb not null default '[]'::jsonb,         -- [{title, url, accessed, note}]
  verification_status text not null default 'seed-unverified' check (verification_status in ('seed-unverified','pending-review','verified','rejected')),
  dataset text not null default 'seed' check (dataset in ('seed','master')),
  check (experience_id <> 'food')                     -- Food items live in `dishes`
);
create index if not exists experience_items_exp_idx on experience_items(experience_id, category);

-- An offering = "this establishment offers this item": same evidence levels, last-checked rule and
-- dish-at-place photo rules as Food links. Establishments are the shared `restaurants` table.
create table if not exists offerings (
  item_id text not null references experience_items(id) on delete cascade,
  establishment_id text not null references restaurants(id) on delete cascade,
  status text not null check (status in ('candidate','source-listed','menu-confirmed','directly-confirmed','visit-confirmed','temporarily-unavailable')),
  menu_evidence jsonb,
  price_min_vnd int, price_max_vnd int, price_unit text,
  last_verified date,
  primary_photo_url text, photo_kind text, photo_source_url text, photo_attribution text, photo_license text, photo_last_checked_at date,
  primary key (item_id, establishment_id),
  constraint offering_public_status_needs_date check (status = 'candidate' or last_verified is not null),
  constraint offering_evidence_matches_status check (
    case status
      when 'candidate' then coalesce(menu_evidence->>'type','search-result') in ('search-result','published-source')
      when 'source-listed' then menu_evidence->>'type' = 'published-source'
      when 'menu-confirmed' then menu_evidence->>'type' in ('official-menu','delivery-listing','menu-photo')
      when 'directly-confirmed' then menu_evidence->>'type' in ('phone-call','message')
      when 'visit-confirmed' then menu_evidence->>'type' in ('site-visit','user-visit')
      when 'temporarily-unavailable' then menu_evidence->>'type' in ('official-menu','delivery-listing','menu-photo','phone-call','message','site-visit','user-visit','published-source')
    end),
  constraint offering_photo_kind check (photo_kind is null or photo_kind in ('venue-specific','menu-photo','delivery-listing','generic-dish')),
  constraint offering_photo_complete check (
    (primary_photo_url is null and photo_kind is null and photo_source_url is null and photo_attribution is null and photo_license is null and photo_last_checked_at is null)
    or (primary_photo_url is not null and photo_kind is not null and photo_source_url is not null and photo_attribution is not null and photo_license is not null and photo_last_checked_at is not null))
);

-- The establishment must be tagged with the item's experience mode.
create or replace function enforce_offering_mode() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from establishment_experiences ee join experience_items i on i.id = new.item_id
    where ee.establishment_id = new.establishment_id and ee.experience_id = i.experience_id
  ) then raise exception 'establishment % is not tagged with the experience of item %', new.establishment_id, new.item_id; end if;
  return new;
end $$;
drop trigger if exists enforce_offering_mode on offerings;
create trigger enforce_offering_mode before insert or update on offerings for each row execute function enforce_offering_mode();

alter table experience_items enable row level security;
alter table offerings enable row level security;
drop policy if exists "public read" on experience_items;
create policy "public read" on experience_items for select using (verification_status <> 'rejected' or is_editor());
drop policy if exists "editors write" on experience_items;
create policy "editors write" on experience_items for all using (is_editor()) with check (is_editor());
drop policy if exists "public read" on offerings;
create policy "public read" on offerings for select using (status <> 'candidate' or is_editor());
drop policy if exists "editors write" on offerings;
create policy "editors write" on offerings for all using (is_editor()) with check (is_editor());

-- Same audit trail as Food content (audit key for offerings = item@establishment).
create or replace function audit_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old)); k text;
begin
  k := case tg_table_name
    when 'dish_restaurant_links' then (r->>'dish_id') || '@' || (r->>'restaurant_id')
    when 'offerings' then (r->>'item_id') || '@' || (r->>'establishment_id')
    when 'dish_origins' then r->>'dish_id'
    when 'dish_photos' then r->>'dish_id'
    else r->>'id' end;
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, k, tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
drop trigger if exists audit_experience_items on experience_items;
create trigger audit_experience_items after insert or update or delete on experience_items for each row execute function audit_content();
drop trigger if exists audit_offerings on offerings;
create trigger audit_offerings after insert or update or delete on offerings for each row execute function audit_content();

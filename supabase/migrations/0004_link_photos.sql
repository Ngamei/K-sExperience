-- Dish-at-place imagery: a photo of THIS dish for THIS establishment, stored on the link
-- (never on the establishment alone, so a venue photo can't be shown for the wrong dish).
-- Mirrors LinkPhotoSchema in src/lib/data/schema.ts. Additive and idempotent.
alter table dish_restaurant_links
  add column if not exists primary_photo_url text,
  add column if not exists photo_kind text,
  add column if not exists photo_source_url text,
  add column if not exists photo_attribution text,
  add column if not exists photo_license text,
  add column if not exists photo_last_checked_at date;

alter table dish_restaurant_links drop constraint if exists link_photo_kind;
alter table dish_restaurant_links add constraint link_photo_kind
  check (photo_kind is null or photo_kind in ('venue-specific','menu-photo','delivery-listing','generic-dish'));

-- A photo is all-or-nothing: no image without kind, source, attribution, licence and a checked date.
alter table dish_restaurant_links drop constraint if exists link_photo_complete;
alter table dish_restaurant_links add constraint link_photo_complete check (
  (primary_photo_url is null and photo_kind is null and photo_source_url is null and photo_attribution is null and photo_license is null and photo_last_checked_at is null)
  or (primary_photo_url is not null and photo_kind is not null and photo_source_url is not null and photo_attribution is not null and photo_license is not null and photo_last_checked_at is not null)
);

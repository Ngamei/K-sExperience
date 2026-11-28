-- 0015 · Venue photos for the business profile header (KEX-BIZ-03, D78).
-- Credited photos of the establishment itself. Public read; editors write; audited. A photo always carries its
-- source page, author, licence and the date someone confirmed it shows this establishment.
set search_path = public, extensions;

create table if not exists venue_photos (
  id bigserial primary key,
  establishment_id text not null references restaurants(id) on delete cascade,
  url text not null check (url like 'https://%'),
  kind text not null check (kind in ('exterior', 'interior', 'signage', 'served-here')),
  source_url text not null check (source_url like 'https://%'),
  attribution text not null check (char_length(attribution) > 0),
  license text not null check (char_length(license) > 0),
  last_checked_at date not null,
  caption jsonb check (caption is null or (caption ? 'en' and caption ? 'vi')),
  sort_order integer not null default 0,
  unique (establishment_id, url)
);
create index if not exists venue_photos_establishment_idx on venue_photos (establishment_id, sort_order);

alter table venue_photos enable row level security;
drop policy if exists "public read" on venue_photos;
drop policy if exists "editors insert" on venue_photos;
drop policy if exists "editors update" on venue_photos;
drop policy if exists "editors delete" on venue_photos;
create policy "public read" on venue_photos for select using (true);
create policy "editors insert" on venue_photos for insert with check ((select is_editor()));
create policy "editors update" on venue_photos for update using ((select is_editor())) with check ((select is_editor()));
create policy "editors delete" on venue_photos for delete using ((select is_editor()));

-- Audit like other curated content (row key = establishment id).
create or replace function audit_venue_photo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, coalesce(new.establishment_id, old.establishment_id), tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
revoke execute on function audit_venue_photo() from public, anon, authenticated;
drop trigger if exists audit_venue_photos on venue_photos;
create trigger audit_venue_photos after insert or update or delete on venue_photos for each row execute function audit_venue_photo();

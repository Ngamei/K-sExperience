-- K's Experience — photo storage + content audit trail.
set search_path = public, extensions;

-- Photos: public bucket, editors-only writes (5 MB, jpeg/png/webp).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "dish photos public read" on storage.objects for select using (bucket_id = 'dish-photos');
create policy "dish photos editors insert" on storage.objects for insert with check (bucket_id = 'dish-photos' and public.is_editor());
create policy "dish photos editors update" on storage.objects for update using (bucket_id = 'dish-photos' and public.is_editor());
create policy "dish photos editors delete" on storage.objects for delete using (bucket_id = 'dish-photos' and public.is_editor());

-- Audit trail: every insert/update/delete on curated content, with the editor who made it.
create table content_audit (
  id bigserial primary key,
  table_name text not null,
  row_key text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_row jsonb,
  new_row jsonb
);
create index content_audit_row_idx on content_audit(table_name, row_key, changed_at desc);
alter table content_audit enable row level security;
create policy "editors read audit" on content_audit for select using (is_editor());

create or replace function audit_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old)); k text;
begin
  k := case tg_table_name
    when 'dish_restaurant_links' then (r->>'dish_id') || '@' || (r->>'restaurant_id')
    when 'dish_origins' then r->>'dish_id'
    when 'dish_photos' then r->>'dish_id'
    else r->>'id' end;
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, k, tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_dishes after insert or update or delete on dishes for each row execute function audit_content();
create trigger audit_dish_origins after insert or update or delete on dish_origins for each row execute function audit_content();
create trigger audit_dish_photos after insert or update or delete on dish_photos for each row execute function audit_content();
create trigger audit_restaurants after insert or update or delete on restaurants for each row execute function audit_content();
create trigger audit_links after insert or update or delete on dish_restaurant_links for each row execute function audit_content();

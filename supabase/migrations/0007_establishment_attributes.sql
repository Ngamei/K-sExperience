-- Shared establishments for every experience. Additive and idempotent.
-- 1. Establishment attributes (registry `establishmentAttributes`, e.g. a café's Wi-Fi, a studio's equipment).
alter table restaurants add column if not exists attributes jsonb not null default '{}'::jsonb;

-- 2. Mode tags are now written explicitly by each module (Admin, importers, seed). The 0005 trigger tagged
--    every new establishment as Food, which would have listed a new café in Food's Nearby. Existing tags stay.
drop trigger if exists tag_food_establishment on restaurants;
drop function if exists tag_food_establishment();

-- 3. Audit trail for mode tags (key = establishment@experience).
create or replace function audit_establishment_experiences() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, (r->>'establishment_id') || '@' || (r->>'experience_id'), tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
drop trigger if exists audit_establishment_experiences on establishment_experiences;
create trigger audit_establishment_experiences after insert or update or delete on establishment_experiences
  for each row execute function audit_establishment_experiences();

-- 0012 · D67: reported closure of an establishment. The row stays (saved items, Passport history and notes keep
-- resolving); the app never recommends a closed establishment. NULL = no closure reported.
alter table restaurants add column if not exists closure jsonb;
alter table restaurants drop constraint if exists restaurants_closure_check;
alter table restaurants add constraint restaurants_closure_check check (
  closure is null or (
    closure->>'status' in ('temporarily-closed', 'permanently-closed')
    and coalesce(closure->>'reportedOn', '') <> ''
    and length(coalesce(closure->>'source', '')) >= 3
  )
);

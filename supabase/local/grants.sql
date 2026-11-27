-- LOCAL TESTING ONLY: Supabase grants these privileges to its API roles by default.
grant usage on schema public, extensions, auth to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant usage on schema storage to anon, authenticated;
grant select on storage.objects, storage.buckets to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

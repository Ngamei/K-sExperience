-- 0017 · "Report incorrect information" on every business profile (KEX-BIZ-04).
--
-- Customers (guests included) file a report; they never change canonical business data. Reports land in a
-- restricted Admin review queue. Rules enforced here, whatever the client sends:
--  * insert: anon + authenticated, only as a NEW, un-reviewed report; reporter_id is null (guest) or the caller.
--    A signed-in caller's report is always attributed to them (reporter_id filled in by the trigger), so the
--    per-reporter daily limit cannot be dodged and they can see their own reports.
--  * select: the reporter sees their own reports; staff (is_staff(): admin, editor, researcher, reviewer) see all.
--    Guests cannot read anything back (the client inserts with return=minimal).
--  * update: staff only, and only the triage fields (status, resolution_note); reviewed_by / reviewed_at are
--    stamped by the database. No client delete. Every staff change is written to content_audit.
--  * abuse guard: at most 10 reports per signed-in reporter per 24 h, and at most 5 guest reports per
--    establishment per hour (and 60 guest reports per hour overall).
--  * evidence photo: private bucket `report-evidence`; signed-in users upload only into their own folder
--    (<uid>/...); only staff can read (signed URLs in the Admin queue). Guests report without a photo.
set search_path = public, extensions;

create table if not exists info_reports (
  id uuid primary key default gen_random_uuid(),
  establishment_id text not null check (char_length(establishment_id) between 1 and 200),
  -- Name as shown to the reporter (helps triage if the listing is later renamed or removed).
  establishment_name text check (establishment_name is null or char_length(establishment_name) <= 200),
  experience text not null references experience_modules(id),
  category text not null check (category in ('incorrect-address', 'permanently-closed', 'incorrect-hours', 'incorrect-phone',
                                             'outdated-menu', 'incorrect-price', 'incorrect-photo', 'missing-information', 'other')),
  details text not null check (char_length(btrim(details)) between 5 and 2000),
  evidence_url text check (evidence_url is null or (evidence_url ~* '^https?://[^\s]+$' and char_length(evidence_url) <= 500)),
  evidence_photo_path text check (evidence_photo_path is null or (char_length(evidence_photo_path) <= 300 and evidence_photo_path !~ '\.\.')),
  reporter_id uuid references auth.users on delete set null,
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  locale text check (locale is null or locale in ('en', 'vi')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'rejected')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists info_reports_queue_idx on info_reports (status, created_at desc);
create index if not exists info_reports_establishment_idx on info_reports (establishment_id, created_at desc);
create index if not exists info_reports_reporter_idx on info_reports (reporter_id, created_at desc) where reporter_id is not null;

alter table info_reports enable row level security;
drop policy if exists "anyone files a new report" on info_reports;
drop policy if exists "reporter or staff read" on info_reports;
drop policy if exists "staff triage" on info_reports;
create policy "anyone files a new report" on info_reports for insert to anon, authenticated with check (
  status = 'new' and resolution_note is null and reviewed_by is null and reviewed_at is null
  and (reporter_id is null or reporter_id = (select auth.uid()))
  -- a photo can only be attached by a signed-in reporter, from their own folder
  and (evidence_photo_path is null or ((select auth.uid()) is not null and reporter_id = (select auth.uid())
       and split_part(evidence_photo_path, '/', 1) = (select auth.uid())::text))
);
create policy "reporter or staff read" on info_reports for select using (
  ((select auth.uid()) is not null and reporter_id = (select auth.uid())) or (select is_staff())
);
create policy "staff triage" on info_reports for update using ((select is_staff())) with check ((select is_staff()));
-- No delete policy: clients cannot delete reports (retention/erasure is done with the service role).

-- Guests insert (never select); signed-in users insert/select/update (RLS decides). Supabase grants these by default.
grant insert on info_reports to anon;
grant select, insert, update on info_reports to authenticated;
revoke delete on info_reports from anon;

-- Insert guard: attribution, server timestamps, establishment must exist, rate limits.
create or replace function info_report_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer;
begin
  -- Never trust client-supplied bookkeeping for non-staff callers.
  new.created_at := now();
  if uid is not null and new.reporter_id is null then new.reporter_id := uid; end if;
  if new.contact_email is not null then new.contact_email := nullif(btrim(new.contact_email), ''); end if;
  new.details := btrim(new.details);
  if not exists (select 1 from restaurants r where r.id = new.establishment_id) then
    raise exception 'unknown_establishment' using errcode = '23503';
  end if;
  if new.reporter_id is not null then
    select count(*) into n from info_reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours';
    if n >= 10 then raise exception 'report_rate_limited:reporter' using errcode = 'P0001'; end if;
  else
    select count(*) into n from info_reports where reporter_id is null and establishment_id = new.establishment_id and created_at > now() - interval '1 hour';
    if n >= 5 then raise exception 'report_rate_limited:establishment' using errcode = 'P0001'; end if;
    select count(*) into n from info_reports where reporter_id is null and created_at > now() - interval '1 hour';
    if n >= 60 then raise exception 'report_rate_limited:guests' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
revoke execute on function info_report_before_insert() from public, anon, authenticated;
drop trigger if exists info_reports_before_insert on info_reports;
create trigger info_reports_before_insert before insert on info_reports for each row execute function info_report_before_insert();

-- Update guard: the report itself is immutable; staff change only status + resolution note; reviewer stamped.
create or replace function info_report_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.id, new.establishment_id, new.establishment_name, new.experience, new.category, new.details, new.evidence_url,
      new.evidence_photo_path, new.reporter_id, new.contact_email, new.locale, new.created_at)
     is distinct from
     (old.id, old.establishment_id, old.establishment_name, old.experience, old.category, old.details, old.evidence_url,
      old.evidence_photo_path, old.reporter_id, old.contact_email, old.locale, old.created_at) then
    raise exception 'report_immutable: only status and resolution_note can change' using errcode = '42501';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end $$;
revoke execute on function info_report_before_update() from public, anon, authenticated;
drop trigger if exists info_reports_before_update on info_reports;
create trigger info_reports_before_update before update on info_reports for each row execute function info_report_before_update();

-- Audit every staff change (row key = report id). Inserts are not audited: the report row is its own record.
create or replace function audit_info_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into content_audit (table_name, row_key, action, changed_by, old_row, new_row)
  values (tg_table_name, coalesce(new.id, old.id)::text, tg_op, auth.uid(),
          to_jsonb(old), case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
revoke execute on function audit_info_report() from public, anon, authenticated;
drop trigger if exists audit_info_reports on info_reports;
create trigger audit_info_reports after update or delete on info_reports for each row execute function audit_info_report();

-- Evidence photos: private bucket (5 MB, jpeg/png/webp). Own-folder upload for signed-in users; staff read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-evidence', 'report-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "report evidence own folder upload" on storage.objects;
drop policy if exists "report evidence staff read" on storage.objects;
drop policy if exists "report evidence editors delete" on storage.objects;
create policy "report evidence own folder upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'report-evidence' and (select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "report evidence staff read" on storage.objects for select using (bucket_id = 'report-evidence' and (select public.is_staff()));
create policy "report evidence editors delete" on storage.objects for delete using (bucket_id = 'report-evidence' and (select public.is_editor()));

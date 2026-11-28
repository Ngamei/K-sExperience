-- KEX-IMPORT-01: spice intensity may be unknown. NULL = not recorded; it must never be stored as 0, because
-- 0 means "not spicy" and would pass a strict no-spice filter. Existing 0–3 values are unchanged (the CHECK
-- constraint still applies to non-null values). Additive and idempotent.
alter table dishes alter column spice_level drop not null;
alter table dishes alter column spice_level drop default;

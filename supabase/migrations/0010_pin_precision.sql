-- KEX-QA-03: coordinate precision gains 'building' (the pin marks the building that contains the venue's unit —
-- never presented as the exact unit). Existing 'exact' / 'street' values are unchanged. Additive and idempotent.
alter table restaurants drop constraint if exists restaurants_coordinate_precision_check;
alter table restaurants add constraint restaurants_coordinate_precision_check
  check (coordinate_precision in ('exact', 'building', 'street'));

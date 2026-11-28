-- Hôm nay ăn gì? — optional eating attributes for dishes and dining attributes for establishments.
-- Additive and idempotent. Both are nullable: unknown stays unknown (never defaulted).
-- dishes.eating      : DishEatingSchema (cooking methods, proteins, allergens + allergensComplete, portion,
--                      vegetables, occasions, service styles, customisation, nutrition {kcal, proteinG, source, confidence}, source)
-- restaurants.dining : RestaurantDiningSchema (atmosphere, service styles, occasions, max group size, source)
alter table dishes add column if not exists eating jsonb;
alter table restaurants add column if not exists dining jsonb;

-- Nutrition values must say where they came from.
alter table dishes drop constraint if exists dishes_eating_nutrition_sourced;
alter table dishes add constraint dishes_eating_nutrition_sourced check (
  eating is null or eating->'nutrition' is null or jsonb_typeof(eating->'nutrition') = 'null'
  or (eating->'nutrition'->>'source') is not null
);

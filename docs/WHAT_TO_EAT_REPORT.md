# Hôm nay ăn gì? — data completeness

Generated 2026-11-28 by `npm run data:what-to-eat`. Do not edit by hand.

Provenance: **sourced** = recorded with a citation (catalogue tags count as sourced); **estimate** = recorded, marked as an estimate;
**derived** = inferred from existing tags (e.g. proteins from `contains-*`, cooking method from dish type); **unknown** = not recorded — the engine never assumes a value.

Dishes recommendable with at least one real HCMC venue: **44 / 180**. All 180 dishes can be suggested; the other 136 appear only as "no HCMC place listed yet".

## Dish attributes

| Attribute | Sourced | Estimate | Derived | Unknown |
| --- | ---: | ---: | ---: | ---: |
| Meal times | 139 (77%) | 0 | 0 (0%) | 41 (23%) |
| Dietary tags | 156 (87%) | 0 | 0 (0%) | 24 (13%) |
| Taste | 140 (78%) | 0 | 0 (0%) | 40 (22%) |
| Ingredients | 160 (89%) | 0 | 0 (0%) | 20 (11%) |
| Proteins | 1 (1%) | 0 | 153 (85%) | 26 (14%) |
| Cooking methods | 0 (0%) | 0 | 98 (54%) | 82 (46%) |
| Allergens | 1 (1%) | 0 | 179 (99%) | 0 (0%) |
| Allergen list complete | 0 (0%) | 0 | 0 (0%) | 180 (100%) |
| Portion | 1 (1%) | 0 | 50 (28%) | 129 (72%) |
| Vegetables | 0 (0%) | 0 | 11 (6%) | 169 (94%) |
| Occasions | 0 (0%) | 0 | 0 (0%) | 180 (100%) |
| Service styles | 0 (0%) | 0 | 0 (0%) | 180 (100%) |
| Nutrition | 0 (0%) | 0 | 0 (0%) | 180 (100%) |

## Venue attributes (real HCMC establishments)

| Attribute | Known | Coverage |
| --- | ---: | ---: |
| Price range | 22 / 439 | 5% |
| Opening hours | 194 / 439 | 44% |
| Delivery links | 0 / 439 | 0% |
| Dining attributes (atmosphere, occasions) | 0 / 439 | 0% |
| Dish price at venue (link) | 27 / 444 | 6% |

Unknown venue values never exclude a dish: budget, open-now, delivery and atmosphere filters add a caution instead.

## Dishes supporting each recommendation filter

| Filter | Value | Dishes | With an HCMC place | Note |
| --- | --- | ---: | ---: | --- |
| meal | breakfast | 46 | 21 |  |
| meal | lunch | 68 | 25 |  |
| meal | dinner | 51 | 14 |  |
| meal | snack | 49 | 12 |  |
| meal | late-night | 11 | 8 |  |
| diet | vegetarian | 33 | 4 | includes dishes with a common vegetarian version |
| diet | vegan | 21 | 1 |  |
| diet | no-pork | 122 | 21 |  |
| diet | no-beef | 167 | 39 |  |
| diet | no-seafood | 122 | 21 |  |
| diet | no-peanut | 167 | 40 |  |
| diet | no-offal | 174 | 43 |  |
| goal | balanced | 71 | 24 | derived from taste/cooking tags |
| goal | weight | 61 | 21 | derived; no calorie data |
| goal | protein | 125 | 43 | derived from contains-* tags |
| goal | quick | 86 | 23 |  |
| goal | budget | 107 | 36 | dish type only — prices mostly unknown |
| budget | u30 | 6 | 6 | dishes with a RECORDED price in range |
| budget | u50 | 8 | 8 | dishes with a RECORDED price in range |
| budget | u100 | 10 | 10 | dishes with a RECORDED price in range |
| budget | 100-300 | 2 | 2 | dishes with a RECORDED price in range |
| budget | 300+ | 0 | 0 | dishes with a RECORDED price in range |
| spice | recorded (0–3) | 138 | 43 |  |
| spice | no spice (0) | 78 | 20 | unknown intensity never matches |
| spice | unknown | 42 | 1 | excluded by any spice limit below 'any' |
| allergens | known (derived) | 180 | 44 |  |
| allergens | complete (sourced) | 0 | 0 |  |
| occasion | special dining (needs a place) | 44 | 44 |  |
| atmosphere | recorded | 0 | 0 |  |
| nutrition | recorded | 0 | 0 |  |

## Meal × diet combinations with no results (meal set to “only this meal”)

By default meal time only ranks, so these combinations still return dishes; they show where metadata or venue research is missing. Dietary restrictions are never relaxed.

| Meal | Diet | Eligible dishes | With an HCMC place |
| --- | --- | ---: | ---: |
| breakfast | vegan | 2 | 0 |
| lunch | vegan | 2 | 0 |
| dinner | vegetarian | 1 | 0 |
| dinner | vegan | 1 | 0 |
| late-night | vegan | 0 | 0 |

## Collections and modes (default context: central HCMC, no history)

| Preset | Eligible dishes | Shown |
| --- | ---: | ---: |
| Cơm trưa văn phòng (`com-trua-van-phong`) | 180 | 6 |
| Ăn ngon tiết kiệm (`an-ngon-tiet-kiem`) | 180 | 6 |
| Ăn ngon, ăn cân bằng (`an-can-bang`) | 180 | 6 |
| Bữa ăn giàu protein (`giau-protein`) | 180 | 6 |
| Cơm nhà (`com-nha`) | 180 | 6 |
| Hôm nay ăn chay (`an-chay`) | 33 | 4 |
| Hẹn hò tối nay (`hen-ho`) | 44 | 6 |
| Đi ăn cùng bạn bè (`ban-be`) | 180 | 6 |
| Tự thưởng cho mình (`tu-thuong`) | 44 | 6 |
| Hôm nay ăn món lạ (`mon-la`) | 180 | 6 |
| Ăn khuya Sài Gòn (`an-khuya`) | 180 | 6 |
| Món ăn nhẹ nhàng (`nhe-nhang`) | 132 | 6 |
| Ăn hằng ngày (`hang-ngay`) | 180 | 6 |
| Ăn nhanh (`nhanh-gon`) | 180 | 6 |
| Giữ dáng lành mạnh (`giu-dang`) | 180 | 6 |
| Ăn cùng gia đình (`gia-dinh`) | 44 | 6 |
| Ăn sang (`cao-cap`) | 44 | 6 |
| Khám phá vùng miền (`vung-mien`) | 111 | 6 |

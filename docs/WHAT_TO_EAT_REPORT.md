# Hôm nay ăn gì? — data completeness

Generated 2026-11-28 by `npm run data:what-to-eat`. Do not edit by hand.

Provenance: **sourced** = recorded with a citation (catalogue tags count as sourced); **estimate** = recorded, marked as an estimate;
**derived** = inferred from existing tags (e.g. proteins from `contains-*`, cooking method from dish type); **unknown** = not recorded — the engine never assumes a value.

Dishes recommendable with at least one real HCMC venue: **138 / 138**.

## Dish attributes

| Attribute | Sourced | Estimate | Derived | Unknown |
| --- | ---: | ---: | ---: | ---: |
| Meal times | 138 (100%) | 0 | 0 (0%) | 0 (0%) |
| Dietary tags | 138 (100%) | 0 | 0 (0%) | 0 (0%) |
| Taste | 138 (100%) | 0 | 0 (0%) | 0 (0%) |
| Ingredients | 138 (100%) | 0 | 0 (0%) | 0 (0%) |
| Proteins | 0 (0%) | 0 | 138 (100%) | 0 (0%) |
| Cooking methods | 0 (0%) | 0 | 66 (48%) | 72 (52%) |
| Allergens | 0 (0%) | 0 | 138 (100%) | 0 (0%) |
| Allergen list complete | 0 (0%) | 0 | 0 (0%) | 138 (100%) |
| Portion | 0 (0%) | 0 | 49 (36%) | 89 (64%) |
| Vegetables | 0 (0%) | 0 | 6 (4%) | 132 (96%) |
| Occasions | 0 (0%) | 0 | 0 (0%) | 138 (100%) |
| Service styles | 0 (0%) | 0 | 0 (0%) | 138 (100%) |
| Nutrition | 0 (0%) | 0 | 0 (0%) | 138 (100%) |

## Venue attributes (real HCMC establishments)

| Attribute | Known | Coverage |
| --- | ---: | ---: |
| Price range | 1 / 118 | 1% |
| Opening hours | 3 / 118 | 3% |
| Delivery links | 0 / 118 | 0% |
| Dining attributes (atmosphere, occasions) | 0 / 118 | 0% |
| Dish price at venue (link) | 1 / 121 | 1% |

Unknown venue values never exclude a dish: budget, open-now, delivery and atmosphere filters add a caution instead.

## Dishes supporting each recommendation filter

| Filter | Value | Dishes | With an HCMC place | Note |
| --- | --- | ---: | ---: | --- |
| meal | breakfast | 46 | 19 |  |
| meal | lunch | 67 | 21 |  |
| meal | dinner | 50 | 11 |  |
| meal | snack | 48 | 9 |  |
| meal | late-night | 11 | 6 |  |
| diet | vegetarian | 29 | 4 | includes dishes with a common vegetarian version |
| diet | vegan | 21 | 1 |  |
| diet | no-pork | 84 | 17 |  |
| diet | no-beef | 130 | 32 |  |
| diet | no-seafood | 82 | 15 |  |
| diet | no-peanut | 126 | 32 |  |
| diet | no-offal | 133 | 35 |  |
| goal | balanced | 56 | 19 | derived from taste/cooking tags |
| goal | weight | 46 | 16 | derived; no calorie data |
| goal | protein | 112 | 35 | derived from contains-* tags |
| goal | quick | 76 | 19 |  |
| goal | budget | 91 | 29 | dish type only — prices mostly unknown |
| budget | u30 | 0 | 0 | dishes with a RECORDED price in range |
| budget | u50 | 1 | 1 | dishes with a RECORDED price in range |
| budget | u100 | 1 | 1 | dishes with a RECORDED price in range |
| budget | 100-300 | 0 | 0 | dishes with a RECORDED price in range |
| budget | 300+ | 0 | 0 | dishes with a RECORDED price in range |
| allergens | known (derived) | 138 | 36 |  |
| allergens | complete (sourced) | 0 | 0 |  |
| occasion | special dining (needs a place) | 36 | 36 |  |
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
| Cơm trưa văn phòng (`com-trua-van-phong`) | 138 | 6 |
| Ăn ngon tiết kiệm (`an-ngon-tiet-kiem`) | 138 | 6 |
| Ăn ngon, ăn cân bằng (`an-can-bang`) | 138 | 6 |
| Bữa ăn giàu protein (`giau-protein`) | 138 | 6 |
| Cơm nhà (`com-nha`) | 138 | 6 |
| Hôm nay ăn chay (`an-chay`) | 29 | 4 |
| Hẹn hò tối nay (`hen-ho`) | 36 | 6 |
| Đi ăn cùng bạn bè (`ban-be`) | 138 | 6 |
| Tự thưởng cho mình (`tu-thuong`) | 36 | 6 |
| Hôm nay ăn món lạ (`mon-la`) | 138 | 6 |
| Ăn khuya Sài Gòn (`an-khuya`) | 138 | 6 |
| Món ăn nhẹ nhàng (`nhe-nhang`) | 132 | 6 |
| Ăn hằng ngày (`hang-ngay`) | 138 | 6 |
| Ăn nhanh (`nhanh-gon`) | 138 | 6 |
| Giữ dáng lành mạnh (`giu-dang`) | 138 | 6 |
| Ăn cùng gia đình (`gia-dinh`) | 36 | 6 |
| Ăn sang (`cao-cap`) | 36 | 6 |
| Khám phá vùng miền (`vung-mien`) | 98 | 6 |

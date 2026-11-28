# CC-ENRICH-Q1Q3PNBT-001 — business-profile enrichment (Claude Code)

- **Scope (PO P0, 2026-11-28):** enrich EXISTING Food venues in former Quận 1, Quận 3, Phú Nhuận and Bình Thạnh. No new venues, no coordinate changes. ChatGPT areas (Thảo Điền, An Phú, Sala, Thủ Thiêm, Quận 7 / Phú Mỹ Hưng) not touched.
- **Batch:** `research-exchange/inbox/CC-ENRICH-Q1Q3PNBT-001.json` → stored as `data/source/venue-research/batch-CC-ENRICH-Q1Q3PNBT-001.json`; intake report `research-exchange/reports/CC-ENRICH-Q1Q3PNBT-001.md`.
- **Status:** imported (52 accepted, 0 rejected). Nothing has been verified by phone or visit; every value is `source-listed` desk research, access date 2026-11-28. **Codex: please spot-check per CX-VALIDATE-ENRICH-001.**

## Results

52 of the 155 in-scope Food venues touched.

| Field | Added | Canonical total after import (all 383 venues) |
| --- | ---: | ---: |
| `contact.phone` | 18 | 18 (was 0) |
| `contact.social` | 1 | 1 |
| `openingHours` (only venues that had none) | 26 | 161 (was 135) |
| `priceRange` | 21 | 22 (was 1) |
| dish-link `priceVnd` | 26 links | 27 (was 1) |
| `closure` | 0 (no source reported a closure for an in-scope venue) | — |

Field sources: mia.vn 56 profile fields + 26 dish prices (pages fetched and parsed); MICHELIN Guide 7 phones; VinWonders 2; Toplist 1. Corroborating sources (Falstaff, En Primeur Club, Grab food blog, GreenSM, Trip.com, other MICHELIN locale pages) are added to the venue's `sources` with the note "Corroborating source …".

## Method and acceptance rules

1. Every mia.vn article already cited by an in-scope venue (plus per-venue mia.vn articles found in the blog sitemap by name slug) was re-fetched (robots.txt allows Claude; ≤1 request / 1.5 s). Each venue's block was located by **house number + full street name** in its `Địa chỉ` line (a first attempt that matched on the first street word paired two venues at "23 Nguyễn …" — fixed before any value was used), and its `Điện thoại / Số điện thoại`, `Giờ mở cửa / Giờ hoạt động` and `Giá` lines read. Every matched block heading was checked against the venue name.
2. 41 venues were also looked up by web search (MICHELIN Guide, Grab food blog, VinWonders, Toplist, Falstaff, Foodle, En Primeur Club, Trip.com, Foody). MICHELIN, Google, Facebook, Grab, ShopeeFood and Trip.com pages are **not fetchable** from this sandbox (proxy 403 / bot challenge), so those values were read from search-result extracts of the cited page — Codex should re-open them first.
3. Accepted: a phone from MICHELIN, a mia.vn venue block, or one guide naming this venue + address with no conflicting number found. Aggregator-only phones (Airbnb, Trip.com, Wanderlog) and stale blogs (2014, 2023) were **not** used.
4. Opening hours only for venues that had none, and only when no consulted source conflicts. Conflicts are listed below and nothing was stored. Days a source does not state are never filled in. Example: Bánh mì Hoàng Lam gives Mon–Sat only, so nothing was stored. Overnight ranges use the existing `[open, close<open]` convention (`isOpenAt` handles them); "24/24" is stored as 00:00–23:59.
5. Dish `priceVnd` only when both ends of the price are stated for this dish (or its bowl/plate/portion) at this venue. A lone "from X" or "khoảng X" is not stored. The price source is appended to the link's evidence note ("Price X–Y VND per mia.vn (checked 2026-11-28)").
6. `priceRange` only when the whole stated range lies inside one contract bucket ($ < 60,000; $$ 60,000–150,000 VND/person).
7. Foody.vn listings were fetched for calibration but **not used**. Their hours visibly disagree with current sources (e.g. Huỳnh Hoa 18:00–22:00 vs 06:00–22:00 in 2026; Phở Hòa page shows two different schedules), and phones are hidden.

## Importer / contract changes (pipeline step 1)

Before: an intake batch could not enrich an existing venue. The importer's merge path (`if (existing) { add new dish ids; continue; }`) silently **dropped** `openingHours`, `priceRange`, `contact`, `closure` and any `priceVnd` on already-linked dishes. 7 venues lost hours that CC-FOOD-010 had researched this way, 5 of them in scope (Phở Minh, Ba Ghiền, Huỳnh Hoa, Bánh mì Chim Chạy, Ốc Bắc). The exchange `BatchVenueSchema` also stripped `contact`, and batch ids such as `CC-ENRICH-Q1Q3PNBT-001` failed the id regex.

- `src/lib/data/enrich.ts` (new, pure): `applyEnrichment()` merges contact/hours/priceRange/closure and link prices into an existing record. It never removes anything, keeps existing contact keys and is idempotent. Each supporting URL is added to `sources` with `note: "Source for: phone, opening hours, … (checked <date>)"`, which gives field-level provenance. `enrichProblems()` holds the contract checks: id required, no lon/lat, every field needs `fieldSources.<field>`, that URL must be in `sources`, and prices need a url.
- `src/lib/data/exchange.ts`: `BatchVenueSchema` gains `contact {phone, website, social}` (phone format checked; a phone without `fieldSources.phone` is a schema error), `enrich`, `fieldSources`. `validateVenues` gives an `enrich` verdict: the id must exist in this experience (never created), dishes optional, Food only for now. The batch id regex now allows multi-part scopes (`CC-ENRICH-Q1Q3PNBT-001`) and still rejects free-form ids.
- `scripts/intake.ts`: enrich venues are not geocoded or pinned. They keep the existing coordinates, and the report shows "existing record".
- `scripts/import-restaurants.ts`: enrich venues are applied in a **second pass**, after every batch has created its venues (batch files sort alphabetically, so `batch-CC-ENRICH-*` would otherwise run before `batch-CC-FOOD-*`). An unknown id is an import error. The normal merge path is unchanged, so legacy batches re-import byte-identically (verified: no canonical diff before this batch).
- `scripts/exchange-export.ts`: new template `research-exchange/templates/enrich-batch.json`. `contract/json-schema/research-batch.json` was regenerated.
- Tests: `tests/unit/enrich.test.ts` (9 tests) covers id format, fields surviving parsing, phone provenance required, enrich verdicts against real data (existing id accepted without dishes, unknown id rejected), a merge without data loss producing valid `RestaurantSchema` + `DishRestaurantLinkSchema`, idempotency, closure, and the canonical invariant "every venue with a phone cites a source noted for phone".
- Verified on the real import (script diff of before/after canonical files): same 383 venue ids and 388 link ids, existing sources all kept, no existing opening hours overwritten, only `contact / openingHours / priceRange / sources / lastVerified` changed on venues and only `priceVnd` + evidence note on links.

Not done: enrichment of module establishments (`data/experiences/{coffee,bars,spa,sport}.json`). `validateVenues` rejects `enrich` for module batches with a clear reason. This is reserved for CC-ENRICH-Q1Q3PNBT-002.

## Data-quality findings (not changed — for the owner / Codex)

- Probable duplicate records: `hu-tieu-hong-phat` (389–391 Võ Văn Tần, MICHELIN) and `hu-tieu-nam-vang-hong-phat-391-vo-van-tan`; `hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-tam` and `…-cach-mang-thang-8` (both received the same hours/price); `bun-bo-hue-o-le-cach-mang-thang-8-48-cach-mang-thang-8` and `quan-bun-bo-hue-quan-xua-48-cach-mang-thang-tam`. Sources place O Lê at 642 Phan Văn Trị, so the O Lê record at 48 CMT8 is doubtful.
- `quan-269-de-tham` is named only "Quán". The mia.vn source calls it "Quán Giá Hẹ".
- `com-tam-74-nguyen-van-cu`: existing hours 07:00–15:30, but mia.vn 2026 says 06:30–15:00. Kept, not overwritten.
- Phở Minh's two mia.vn articles disagree on closing time (9h45 vs 10h00). 06:30–10:00 was stored because it matches MICHELIN.

## Commands and results

```
ln -s /home/user/K-sExperience/node_modules node_modules   # later replaced by `cp -al` (hard-link copy): Turbopack refuses a node_modules symlink outside the worktree root
npx tsx scripts/import-restaurants.ts            # before the batch: ✓ 383 restaurants, 388 links — no canonical diff with the new importer
npx vitest run tests/unit/enrich.test.ts         # 9 passed
npm run intake -- research-exchange/inbox/CC-ENRICH-Q1Q3PNBT-001.json           # ✓ 52 accepted, 0 rejected — dry run
npm run intake -- research-exchange/inbox/CC-ENRICH-Q1Q3PNBT-001.json --apply   # ✓ 52 accepted, 0 rejected — applied (no ids lost)
npm run exchange:export   # ✓ 10 JSON schemas, 138 dishes, 435 establishments, 449 offerings
npm run data:report       # ✓ 138 dishes, 383 venues, 0 possible duplicates
npm run data:coverage     # ≥5: 17 · 1–4: 22 · 0: 99
npm run db:seed-sql       # ✓ 138 dishes, 383 restaurants, 388 links
npm run data:what-to-eat · data:food-coverage · data:experiences   # ✓
npm run data:validate     # 25 passed
npm run test              # 24 files, 187 passed
npm run typecheck · npx eslint <changed files>   # clean
npm run qa                # see QA line below
```

**npm run qa:** typecheck ✓, lint ✓, unit+integration 187/187 ✓, build ✓, build:e2e ✓, e2e 113 passed / 1 skipped ✓, build:auth-test ✓. The first test:e2e-auth attempt failed only because port 54321 was held by another worktree's concurrent run. After it freed: test:e2e-auth 50 passed ✓, build:modules-test ✓, test:e2e-modules 62 passed ✓.

## Per-venue record (all 155 in-scope Food venues)

"Checked" = what was consulted. "not researched" = no mia.vn source and no web search in this batch; these are left for CC-ENRICH-Q1Q3PNBT-002. "Still missing" lists the fields that remain empty after this batch.

| Venue | Id | Added | Still missing | Checked | Notes (searched, not found / conflicts) |
| --- | --- | --- | --- | --- | --- |
| Phở Minh | pho-minh-63-6-pasteur | phone, hours, priceRange, dish price | dish price (pho-bo-ha-noi) | mia.vn re-read, web search | — |
| Góc Huế – Kỳ Đồng | goc-hue-ky-dong-41-ky-dong | — | phone, hours, priceRange, dish price (banh-khoai, banh-nam) | web search | phone not found; only Foody hours (stale, not used) |
| Góc Huế – Nguyễn Thái Bình | goc-hue-nguyen-thai-binh-155-nguyen-thai-binh | — | phone, hours, priceRange, dish price (banh-khoai, banh-nam) | not researched |  |
| Bún riêu cua ốc Cô Thủy | bun-rieu-cua-oc-co-thuy-287-66-nguyen-dinh-chieu | — | phone, hours, priceRange, dish price (bun-rieu-cua, bun-oc-ha-noi) | mia.vn re-read, web search | phone, hours, price not found |
| Bánh Mì Huỳnh Hoa | banh-mi-huynh-hoa | hours | phone, priceRange | mia.vn re-read, web search | phone: only a travel aggregator (+84 962 455 517) — not used |
| Cơm Tấm Ba Ghiền | com-tam-ba-ghien | phone | hours, priceRange, dish price (com-tam-sai-gon) | web search | hours conflict (Time Out 8:00–20:30 / mia 2026 07:00–20:30 / MICHELIN 08:00–22:00) |
| Bánh Xèo 46A | banh-xeo-46a | phone, hours | dish price (banh-xeo-nam-bo) | mia.vn re-read, web search | — |
| Hủ Tiếu Hồng Phát | hu-tieu-hong-phat | phone | hours, priceRange, dish price (hu-tieu-nam-vang) | web search | hours conflict (MICHELIN 06:30–22:30 / mia 2026 07:00–20:00) |
| Nam Giao | nam-giao-136-15-le-thanh-ton | — | phone, hours, priceRange, dish price (bun-bo-hue) | web search | phone not found; hours conflict (Foody 08:30–21:00 / Vietnam Airlines 06:00–23:00) |
| Bún Chả 145 | bun-cha-145-145-bui-vien | — | phone, hours, priceRange, dish price (bun-cha-ha-noi) | web search | phone conflict (+84 28 3837 3474 vs 0763 373 474); hours conflict (Trip.com 11:00–21:30 vs split lunch/dinner); price only from aggregators |
| Bún Chả Hà Nội 26 | bun-cha-ha-noi-26-8a-9c2-thai-van-lung | — | phone, hours, priceRange, dish price (bun-cha-ha-noi) | web search | phone not found; only Foody hours/prices (stale, not used) |
| Mì Quảng 3 Anh Em | mi-quang-3-anh-em-193-cach-mang-thang-8 | — | phone, hours, priceRange, dish price (mi-quang) | web search | phone, hours, price not found for this branch |
| Mì Quảng Ếch | mi-quang-ech-233-nguyen-trong-tuyen | — | phone, hours, priceRange, dish price (mi-quang) | not researched |  |
| Bún Riêu Cua Ốc Phan Rang | bun-rieu-cua-oc-phan-rang-66-nguyen-thai-binh | — | phone, hours, priceRange, dish price (bun-rieu-cua) | not researched |  |
| Bún Riêu Gánh Chợ Bến Thành | bun-rieu-ganh-cho-ben-thanh-163-le-thanh-ton | hours | phone, priceRange, dish price (bun-rieu-cua) | mia.vn re-read |  |
| Bánh Cuốn Tây Hồ | banh-cuon-tay-ho-127-dinh-tien-hoang | — | phone, hours, priceRange, dish price (banh-cuon-thanh-tri) | mia.vn re-read, web search | phone only in a 2014 blog (no area code) — not used; hours conflict (mia 2025 06:00–23:00 / Foodle & 2014 blog 05:30–21:30) |
| Bánh Cuốn Ba Miền | banh-cuon-ba-mien-104-ba-huyen-thanh-quan | — | phone, hours, priceRange, dish price (banh-cuon-thanh-tri) | not researched |  |
| Bánh Cuốn Hồng Hạnh | banh-cuon-hong-hanh-353-le-van-sy | — | phone, hours, priceRange, dish price (banh-cuon-thanh-tri) | not researched |  |
| Cơm Tấm Phúc Lộc Thọ | com-tam-phuc-loc-tho-236-dinh-tien-hoang | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | not researched |  |
| Cơm Tấm 67 Tấm | com-tam-67-tam-99-1b-vo-van-tan | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Phở Cao Vân | pho-cao-van-25-mac-dinh-chi | hours | phone, priceRange, dish price (pho-sai-gon) | mia.vn re-read, web search | phone and price not found |
| Phở Dậu | pho-dau-288-m1-nam-ky-khoi-nghia | — | phone, hours, priceRange, dish price (pho-bo-ha-noi) | mia.vn re-read, web search | phone only in a 2023 blog (two numbers) — not used; hours conflict (mia 05:00–13:00 / Foody & Scooter Saigon 05:00–11:00) |
| Bánh Mì Như Lan | banh-mi-nhu-lan-68-ham-nghi | — | phone, hours, priceRange, dish price (banh-mi-sai-gon) | web search | phone only on Airbnb; hours conflict (04:30–23:00 / 24h / 07:30–21:00) |
| Bánh Mì Chim Chạy | banh-mi-chim-chay-147d-nguyen-thi-minh-khai | — | phone, hours, priceRange, dish price (banh-mi-sai-gon) | web search | no source for the 147D Nguyễn Thị Minh Khai branch (Grab blog lists other branches) |
| Hủ Tiếu Nam Vang Liến Húa | hu-tieu-nam-vang-lien-hua-381-vo-van-tan | dish price | phone, hours, priceRange | mia.vn re-read, web search | phone not found; hours conflict (mia 08:00–23:00 / Vinpearl 06:00–23:00) |
| Bánh Xèo Bếp Mẹ Ỉn | banh-xeo-bep-me-in-74-7-hai-ba-trung | — | phone, hours, priceRange, dish price (banh-xeo-nam-bo) | mia.vn re-read, web search | no listing tied to this address |
| Bánh Xèo Cây Bàng | banh-xeo-cay-bang-163a-tran-van-dang | — | phone, hours, priceRange, dish price (banh-xeo-tom-nhay-quy-nhon) | mia.vn re-read |  |
| Bột Chiên 51 | bot-chien-51-51-nguyen-van-lac | — | phone, hours, priceRange, dish price (bot-chien) | not researched |  |
| Bột Chiên Chú Thái | bot-chien-chu-thai-161-ly-chinh-thang | — | phone, hours, priceRange, dish price (bot-chien) | web search | phone, hours, price not found |
| Bánh Tráng Long 34 | banh-trang-long-34-34-nguyen-thuong-hien | — | phone, hours, priceRange, dish price (banh-trang-tron) | not researched |  |
| Cô 7 Bạc Liêu | co-7-bac-lieu-139l-nguyen-trai | — | phone, hours, priceRange, dish price (lau-mam) | web search | no listing found for this venue |
| Bánh Bèo Huế Thùy Linh | banh-beo-hue-thuy-linh-209-le-van-sy | — | phone, hours, priceRange, dish price (banh-beo-hue) | not researched |  |
| Bánh Bèo Xíu | banh-beo-xiu-284-le-van-sy | — | phone, hours, priceRange, dish price (banh-beo-hue) | not researched |  |
| Bánh Bèo Huế O Trinh | banh-beo-hue-o-trinh-126-bui-thi-xuan | — | phone, hours, priceRange, dish price (banh-beo-hue) | not researched |  |
| Chè Ba Màu | che-ba-mau-142-nguyen-phi-khanh | — | phone, hours, priceRange, dish price (che-ba-mau) | not researched |  |
| Chè Đèn Dầu | che-den-dau-504-nguyen-kiem | — | phone, hours, priceRange, dish price (che-ba-mau) | not researched |  |
| Chè Ngon Cô Ba | che-ngon-co-ba-176-co-giang | — | phone, hours, priceRange, dish price (che-ba-mau) | not researched |  |
| Chè Vỉa Hè Cô Điệp | che-via-he-co-diep-241-vo-van-tan | — | phone, hours, priceRange, dish price (che-ba-mau) | not researched |  |
| Bánh Xèo Miền Tây 139 | banh-xeo-mien-tay-139-139-tran-van-dang | — | phone, hours, priceRange, dish price (banh-xeo-nam-bo) | not researched |  |
| Bún Bò Huế O Lê – Cách Mạng Tháng 8 | bun-bo-hue-o-le-cach-mang-thang-8-48-cach-mang-thang-8 | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read, web search | no O Lê listing at 48 CMT8 (sources place O Lê at 642 Phan Văn Trị and Bún Bò Huế Quán Xưa at 48 CMT8) — possible wrong/duplicate record of quan-bun-bo-hue-quan-xua-48-cach-mang-thang-tam |
| Bún Bò Mỡ Nổi Cô Như | bun-bo-mo-noi-co-nhu-274-29-vo-van-tan | phone, hours, priceRange, dish price | — | mia.vn re-read, web search | — |
| Bún Bò Huế Kim Hương – Rạch Bùng Binh | bun-bo-hue-kim-huong-rach-bung-binh-17-rach-bung-binh | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read | closure recorded earlier — skipped |
| Bánh Mì 110 | banh-mi-110-110-hoang-van-thu | hours, priceRange, dish price | phone | mia.vn re-read |  |
| Bánh Mì Hoàng Lam | banh-mi-hoang-lam-168-nguyen-thuong-hien | phone, social, priceRange, dish price | hours | mia.vn re-read, web search | hours Mon–Sat only (Sunday unknown) — not stored |
| Ốc Bắc | oc-bac-351-nguyen-thuong-hien | — | phone, hours, priceRange, dish price (oc-sai-gon) | not researched |  |
| Ốc Chị Em | oc-chi-em-24-nguyen-thai-binh | — | phone, hours, priceRange, dish price (oc-sai-gon) | not researched |  |
| Ốc Béo Hà Nội | oc-beo-ha-noi-10-ban-co | — | phone, hours, priceRange, dish price (oc-sai-gon) | not researched |  |
| Ốc Chị Hồng | oc-chi-hong-210-15-cach-mang-thang-8 | phone, hours | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Bún Riêu Cô Hương Béo | bun-rieu-co-huong-beo-110-cao-thang | — | phone, hours, priceRange, dish price (bun-rieu-cua) | not researched |  |
| Hidden House | hidden-house-55-3-le-thi-hong-gam | — | phone, hours, priceRange, dish price (banh-khot-vung-tau) | not researched |  |
| Hủ Tiếu Mỹ Tho Thanh Xuân | hu-tieu-my-tho-thanh-xuan-62-ton-that-thiep | — | phone, hours, priceRange, dish price (hu-tieu-my-tho) | mia.vn re-read, web search | phone not found (site hutieuthanhxuanquan1.com not reachable); hours conflict (mia 06:00–13:00 / Grab 06:00–15:00 / blog 07:00–14:00) |
| Bún Nước Lèo Sóc Trăng – Lê Quang Định | bun-nuoc-leo-soc-trang-le-quang-dinh-401-le-quang-dinh | — | phone, hours, priceRange, dish price (bun-nuoc-leo-soc-trang) | web search | phone, hours, price not found (Grab blog confirms address only) |
| Xôi xéo Hà Nội | xoi-xeo-ha-noi-81-ngo-thoi-nhiem | — | phone, hours, priceRange, dish price (xoi-xeo) | web search | only a Grab blog naming the shop at this address "Xôi Bắc" (06:00–10:00) — name mismatch, not used |
| Bánh canh Trảng Bàng Ba Xi | banh-canh-trang-bang-ba-xi-135-vo-van-tan | — | phone, hours, priceRange, dish price (banh-canh-trang-bang) | web search | phone, current hours, price not found (only a 2012 repost: 8:30–22:00) |
| Bánh mì Bà Huynh | banh-mi-ba-huynh-197a-nguyen-trai | — | phone, hours, priceRange, dish price (banh-mi-sai-gon) | mia.vn re-read, web search | phone not found; hours conflict (mia listicle 05:30–00:00 / mia venue article 06:00–22:00) |
| Quán Ốc Phước Đạt | quan-oc-phuoc-dat-84-nguyen-thong | phone, hours | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Quán Ốc Hồng Ngọc | quan-oc-hong-ngoc-13-vuon-chuoi | phone, hours | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Ốc Mint | oc-mint-170-do-thi-loi | phone, hours | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Hủ tiếu Nam Vang Thành Đạt | hu-tieu-nam-vang-thanh-dat-34-co-bac | hours | phone, priceRange, dish price (hu-tieu-nam-vang) | mia.vn re-read |  |
| Hủ tiếu Nam Vang Nhân Quán | hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-tam | hours, dish price | phone, priceRange | mia.vn re-read |  |
| Hủ tiếu Nam Vang Trung Còi | hu-tieu-nam-vang-trung-coi-80-cao-thang | hours | phone, priceRange, dish price (hu-tieu-nam-vang) | mia.vn re-read |  |
| Hủ tiếu Nam Vang Nhân quán | hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-8 | hours, dish price | phone, priceRange | mia.vn re-read |  |
| Hủ tiếu Nam Vang Quốc Ký | hu-tieu-nam-vang-quoc-ky-24-ky-con | hours, priceRange, dish price | phone | mia.vn re-read, web search | phone not found |
| Hủ tiếu Nam Vang Hồng Phát | hu-tieu-nam-vang-hong-phat-391-vo-van-tan | priceRange, dish price | phone, hours | mia.vn re-read |  |
| Phở Hùng quận 1 | pho-hung-quan-1-243-nguyen-trai | phone, hours | priceRange, dish price (pho-sai-gon) | mia.vn re-read, web search | price only "from 70,000/bowl" |
| Phở Hà | pho-ha-17-19-hai-trieu | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Bún Chả Bà Lan "Thận | bun-cha-ba-lan-than-9b-nguyen-thi-minh-khai | hours | phone, priceRange, dish price (bun-cha-ha-noi) | mia.vn re-read |  |
| Quán bún bò Huế Quán Xưa | quan-bun-bo-hue-quan-xua-48-cach-mang-thang-tam | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Quán Phở Trang | quan-pho-trang-428-vo-van-tan | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở Ông Cả | pho-ong-ca-66b-cao-thang | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở Hương Bình | pho-huong-binh-148-vo-thi-sau | phone | hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read, web search | hours conflict between MICHELIN locale pages (06:30–22:30 vs 06:30–21:00) |
| Phở Việt Nam | pho-viet-nam-66-tran-quoc-toan | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở Hoàng Yến | pho-hoang-yen-595-11-nguyen-dinh-chieu | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở Anh | pho-anh-08-ky-dong | hours | phone, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở 34 Cao Thắng | pho-34-cao-thang-34-cao-thang | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Phở Bò Phú Gia | pho-bo-phu-gia-146e-ly-chinh-thang | — | phone, hours, priceRange, dish price (pho-sai-gon) | mia.vn re-read |  |
| Quán cơm tấm đêm Cu Bo | quan-com-tam-dem-cu-bo-122-nguyen-cu-trinh | hours, priceRange | phone, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Quán | quan-269-de-tham | hours, priceRange, dish price | phone | mia.vn re-read |  |
| Bún Đậu Homemade quận 1 | bun-dau-homemade-quan-1-1-nguyen-van-trang | — | phone, hours, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún đậu A Chảnh | bun-dau-a-chanh-200-cong-quynh | — | phone, hours, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún Đậu Mắm Tôm Tiến Hải | bun-dau-mam-tom-tien-hai-211-nguyen-cu-trinh | — | phone, hours, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún đậu 46 | bun-dau-46-240-tran-hung-dao | — | phone, hours, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún Đậu Mắm Tôm Quán No | bun-dau-mam-tom-quan-no-26-24-24-do-quang-dau | — | phone, hours, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún bò Huế Út Hưng | bun-bo-hue-ut-hung-6c-tu-xuong | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún bò Huế 31 | bun-bo-hue-31-31-mac-dinh-chi | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read, web search | phone not found; hours conflict (Foody 06:00–14:00 / Vietnam Airlines two sittings) |
| Nam Giao Quán | nam-giao-quan-242-de-tham | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún bò núp hẻm O Liễu | bun-bo-nup-hem-o-lieu-108-22f-tran-quang-dieu | — | phone, hours, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún riêu Cô Hương Béo | bun-rieu-co-huong-beo-19b-nguyen-thi-minh-khai | hours | phone, priceRange, dish price (bun-rieu-cua) | mia.vn re-read |  |
| Quán bún riêu Trinh | quan-bun-rieu-trinh-156-tran-quang-khai | hours, priceRange, dish price | phone | mia.vn re-read |  |
| Bún riêu đường Nguyễn Trãi | bun-rieu-duong-nguyen-trai-219-nguyen-trai | hours, priceRange, dish price | phone | mia.vn re-read |  |
| Cơm tấm Thành Râu | com-tam-thanh-rau-119-phung-van-cung | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Sườn Chéo | com-tam-suon-cheo-203-huynh-van-banh | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Cali | com-tam-cali-82-nguyen-van-troi | hours | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read, web search | branch phone only on Toplist (028 7300 0422) — not used |
| Quán Cơm Tấm Mén | quan-com-tam-men-39-4b-huynh-van-banh | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Bà Ròm | com-tam-ba-rom-55-phan-dinh-phung | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Bà Chị Hai | com-tam-ba-chi-hai-51-dang-van-ngu | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm Tấm Hẻm 33 | com-tam-hem-33-33-16-nguyen-dinh-chinh | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm Tấm Mây | com-tam-may-26-truong-quoc-dung | — | phone, hours, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Quán 176 | quan-176-176-nam-ky-khoi-nghia | — | phone, hours, priceRange, dish price (pho-cuon) | mia.vn re-read |  |
| Quán Phở Hai Thiền | quan-pho-hai-thien-14-bui-vien | — | phone, hours, priceRange, dish price (pho-cuon) | mia.vn re-read |  |
| Quán bún thang Madame Thảo | quan-bun-thang-madame-thao-157-20-nguyen-gia-tri | phone, hours | priceRange, dish price (bun-thang) | mia.vn re-read, web search | — |
| Bún thang Hà Nội Quán | bun-thang-ha-noi-quan-38-tran-hung-dao | — | phone, hours, priceRange, dish price (bun-thang) | mia.vn re-read |  |
| Hương Bún Thang | huong-bun-thang-50-ho-bieu-chanh | — | phone, hours, priceRange, dish price (bun-thang) | mia.vn re-read |  |
| Bún thang Thanh Thảo | bun-thang-thanh-thao-176-13-ly-tu-trong | — | phone, hours, priceRange, dish price (bun-thang) | mia.vn re-read |  |
| Bún ốc Thanh Hải | bun-oc-thanh-hai-14-12-ky-dong | — | phone, hours, priceRange, dish price (bun-oc-ha-noi) | mia.vn re-read |  |
| Bún ốc sườn cô Sáu | bun-oc-suon-co-sau-457-hai-ba-trung | — | phone, hours, priceRange, dish price (bun-oc-ha-noi) | mia.vn re-read |  |
| Bún Ốc Song Anh | bun-oc-song-anh-100-nguyen-van-dau | — | phone, hours, priceRange, dish price (bun-oc-ha-noi) | mia.vn re-read |  |
| Bún Riêu Nhà | bun-rieu-nha-63b-tran-quoc-thao | — | phone, hours, priceRange, dish price (bun-oc-ha-noi) | mia.vn re-read |  |
| Phở Hòa Pasteur | pho-hoa-pasteur | phone | priceRange, dish price (pho-sai-gon) | web search | — |
| Cục Gạch Quán | cuc-gach-quan-10-dang-tat | phone | priceRange, dish price (canh-chua-ca-loc) | mia.vn re-read, web search | — |
| Quán Bụi | quan-bui-100-thach-thi-thanh | priceRange, dish price | phone | mia.vn re-read, web search | phone not found (quan-bui.com lists other branches only) |
| Cơm tấm 74 Nguyễn Văn Cừ | com-tam-74-nguyen-van-cu-74-nguyen-van-cu | dish price | phone, priceRange | mia.vn re-read |  |
| Cơm tấm 86 | com-tam-86-151-co-giang | priceRange, dish price | phone | mia.vn re-read |  |
| Cota Subicha | cota-subicha-161-nguyen-van-thu | dish price | phone, priceRange | mia.vn re-read |  |
| Quán cơm Ba Cường | quan-com-ba-cuong-263-tran-quang-khai | dish price | phone, priceRange | mia.vn re-read |  |
| Cơm tấm Bà Mười | com-tam-ba-muoi-294-35-xo-viet-nghe-tinh | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Quán ốc Mắm Sữa | quan-oc-mam-sua-282-6-bui-huu-nghia | priceRange, dish price | phone | mia.vn re-read |  |
| Quán ốc Thảo | quan-oc-thao-295-nguyen-xi | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Bánh tráng trộn Chú Viên | banh-trang-tron-chu-vien-38-nguyen-thuong-hien | priceRange, dish price | phone | mia.vn re-read |  |
| Bánh tráng trộn Dì Hồng | banh-trang-tron-di-hong-25-duong-so-11 | priceRange, dish price | phone | mia.vn re-read |  |
| Bánh mì 362 | banh-mi-362-25-tran-cao-van | — | phone, priceRange, dish price (banh-mi-sai-gon) | mia.vn re-read |  |
| Bánh mì Dì Oanh | banh-mi-di-oanh-229-53-bui-dinh-tuy | — | phone, priceRange, dish price (banh-mi-sai-gon) | mia.vn re-read |  |
| Quán Ốc Chú Lùn | quan-oc-chu-lun-76-nguyen-van-thu | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Quán Ốc Ghe | quan-oc-ghe-34-mac-dinh-chi | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Quán Ốc Vân Chợ Bến Thành | quan-oc-van-cho-ben-thanh-23-nguyen-an-ninh | phone | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Ốc Diệu Bùi Viện | oc-dieu-bui-vien-50-52-do-quang-dau | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Ốc Cúc | oc-cuc-91-co-giang | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Quán 9 Ốc | quan-9-oc-23-nguyen-van-giai | — | phone, priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Ốc 195 | oc-195-195-56-tran-van-dang | phone | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Quán Ốc Lan 2 | quan-oc-lan-2-18-nguyen-dinh-chieu | phone | priceRange, dish price (oc-sai-gon) | mia.vn re-read |  |
| Bánh xèo miền Tây Bà Hai | banh-xeo-mien-tay-ba-hai-49-nguyen-trong-tuyen | dish price | phone, priceRange | mia.vn re-read |  |
| Bánh xèo rau rừng Anh Tiến | banh-xeo-rau-rung-anh-tien-356-phan-van-tri | priceRange | phone, dish price (banh-xeo-nam-bo) | mia.vn re-read |  |
| Ngõ Nhỏ Phố Nhỏ | ngo-nho-pho-nho-158-pasteur | — | phone, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read, web search | phone not found |
| Bún đậu mắm tôm Cô Khàn | bun-dau-mam-tom-co-khan-102-26-cong-quynh | — | phone, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Hẻm Đậu | hem-dau-140e-ly-chinh-thang | — | phone, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Bún đậu Hàng Khay | bun-dau-hang-khay-209-nguyen-trong-tuyen | — | phone, priceRange, dish price (bun-dau-mam-tom) | mia.vn re-read |  |
| Phở Hiền | pho-hien-68-9a-tran-quang-khai | — | phone, priceRange, dish price (pho-sai-gon) | mia.vn re-read, web search | phone not found |
| Phở Phú Vương | pho-phu-vuong-120-nguyen-thai-binh | — | phone, priceRange, dish price (pho-sai-gon) | mia.vn re-read, web search | phone not found; price only "from 65,000" |
| Béo Ơi Quán | beo-oi-quan-15-20-nguyen-thi-minh-khai | priceRange, dish price | phone | mia.vn re-read |  |
| Bún chả Bà Bính | bun-cha-ba-binh-4-nguyen-trung-ngan | priceRange, dish price | phone | mia.vn re-read, web search | phone not found |
| Bún Chả Hồ Gươm | bun-cha-ho-guom-82-ho-tung-mau | priceRange, dish price | phone | mia.vn re-read |  |
| Bún chả Đồng Xuân | bun-cha-dong-xuan-323-ly-tu-trong | priceRange, dish price | phone | mia.vn re-read |  |
| Quán Ngon | quan-ngon-209-de-tham | priceRange, dish price | phone | mia.vn re-read |  |
| Bún bò Huế 725 Hoàng Sa | bun-bo-hue-725-hoang-sa-725-hoang-sa | — | phone, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún bò Huế Song Anh | bun-bo-hue-song-anh-28a-ban-co | — | phone, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún bò Hẻm | bun-bo-hem-314-11-ly-chinh-thang | — | phone, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Bún bò Huế O Sửu | bun-bo-hue-o-suu-72-tran-quoc-toan | — | phone, priceRange, dish price (bun-bo-hue) | mia.vn re-read |  |
| Quán Cơm tấm Quỳnh | quan-com-tam-quynh-146-ly-chinh-thang | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Con Vịt Béo | com-tam-con-vit-beo-41-nguyen-son-ha | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Quán Cơm tấm Hùng | quan-com-tam-hung-194-2-vo-van-tan | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm Trần Quý Cáp | com-tam-tran-quy-cap-260-vo-van-tan | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Cơm tấm 932P | com-tam-932p-932-truong-sa | — | phone, priceRange, dish price (com-tam-sai-gon) | mia.vn re-read |  |
| Bánh cuốn Hồng Hạnh | banh-cuon-hong-hanh-17a-nguyen-thi-minh-khai | — | phone, priceRange, dish price (banh-cuon-thanh-tri) | mia.vn re-read |  |
| Tiệm lẩu Cù Lao | tiem-lau-cu-lao-410-nguyen-xi | — | phone, priceRange, dish price (lau-mam) | mia.vn re-read |  |
| Lẩu mắm 140 | lau-mam-140-140-13-tran-huy-lieu | — | phone, priceRange, dish price (lau-mam) | mia.vn re-read |  |

in scope 155 enriched 52 not researched 21

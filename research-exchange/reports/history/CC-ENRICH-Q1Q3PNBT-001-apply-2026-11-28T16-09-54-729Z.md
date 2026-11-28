# Intake CC-ENRICH-Q1Q3PNBT-001 — applied

- Experience: food · kind: venues · agent: claude-code · researched 2026-11-28
- Method: Business-profile enrichment of EXISTING Food venues in former Quận 1, Quận 3, Phú Nhuận and Bình Thạnh (enrich: true; no new venues, no coordinates). mia.vn articles already cited by these venues were re-fetched (robots.txt allows Claude) and each venue block (matched by house number + street) re-read for Điện thoại / Giờ mở cửa / Giá; MICHELIN Guide, Grab food blog, VinWonders, Toplist, Falstaff, En Primeur Club were read through web-search extracts (their pages are not fetchable from the sandbox). Acceptance: phone from MICHELIN, a mia.vn venue block, or one guide naming this venue+address with no conflicting number; hours only for venues without hours and only when no consulted source conflicts (conflicts are listed in docs/handover/CC-ENRICH-Q1Q3PNBT-001.md, not stored); dish prices only with both ends of the range stated (a lone "from X" is not stored); priceRange only when the whole stated range lies in one contract bucket ($ <60k, $$ 60–150k VND). Foody.vn listings were checked but not used (hours/prices visibly stale). Every value carries fieldSources; access date 2026-11-28; nothing verified by phone or visit.
- Result: **52 accepted, 0 rejected, 2 warnings** (2026-11-28T16:09:54.728Z)

## Warnings

- CC-ENRICH-Q1Q3PNBT-001 was already imported — re-import is idempotent (same ids merge)
- pins reused from the dry run of 2026-11-28T16:09:52.686Z (no new Nominatim queries; supplied coordinates verified unchanged)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Phở Minh | `pho-minh-63-6-pasteur` | ✅ accept | enrich | 1 | 1 | existing record | Pasteur, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71016, Việt Nam | — |
| Phở Hòa Pasteur | `pho-hoa-pasteur` | ✅ accept | enrich | 0 | 0 | existing record | — | — |
| Bánh Xèo 46A | `banh-xeo-46a` | ✅ accept | enrich | 0 | 0 | existing record | — | — |
| Cục Gạch Quán | `cuc-gach-quan-10-dang-tat` | ✅ accept | enrich | 0 | 0 | existing record | Cục Gạch Quán, 10, Đặng Tất, Khu phố 3, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việ | — |
| Hủ Tiếu Hồng Phát | `hu-tieu-hong-phat` | ✅ accept | enrich | 0 | 0 | existing record | — | — |
| Cơm Tấm Ba Ghiền | `com-tam-ba-ghien` | ✅ accept | enrich | 0 | 0 | existing record | — | — |
| Phở Hùng quận 1 | `pho-hung-quan-1-243-nguyen-trai` | ✅ accept | enrich | 0 | 0 | existing record | Quán Phở Hùng, 241-243, Nguyễn Trãi, Khu phố 5, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh | — |
| Phở Hương Bình | `pho-huong-binh-148-vo-thi-sau` | ✅ accept | enrich | 0 | 0 | existing record | Võ Thị Sáu, Khu phố 10, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việt Nam | — |
| Bún Bò Mỡ Nổi Cô Như | `bun-bo-mo-noi-co-nhu-274-29-vo-van-tan` | ✅ accept | enrich | 1 | 1 | existing record | Võ Văn Tần, Khu phố 9, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | shares an identical street-level point with Hủ tiếu Nam Vang Hồng Phát, Cơm Tấm 67 Tấm (food), Chè Vỉa Hè Cô Điệp (food), Hủ tiếu Nam Vang Hồng Phát (food), Quán Cơm tấm Hùng (food), Cơm tấm Trần Quý Cáp (food), Dưỡng Sinh Cô Ba (Võ Văn Tần) (spa) — location approximate (house number not mapped) |
| Phở Cao Vân | `pho-cao-van-25-mac-dinh-chi` | ✅ accept | enrich | 0 | 0 | existing record | Phở Cao Vân, 25, Mạc Đĩnh Chi, Khu phố 10, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71016, V | — |
| Bánh Mì Huỳnh Hoa | `banh-mi-huynh-hoa` | ✅ accept | enrich | 0 | 0 | existing record | — | — |
| Bún Riêu Gánh Chợ Bến Thành | `bun-rieu-ganh-cho-ben-thanh-163-le-thanh-ton` | ✅ accept | enrich | 0 | 0 | existing record | Lê Thánh Tôn, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71016, Việt Nam | shares an identical street-level point with Pasteur Street Craft Beer – Lê Thánh Tôn (bars) — location approximate (house number not mapped) |
| Hủ Tiếu Nam Vang Liến Húa | `hu-tieu-nam-vang-lien-hua-381-vo-van-tan` | ✅ accept | enrich | 1 | 1 | existing record | Võ Văn Tần, Khu phố 3, Phường Xuân Hòa, Thành phố Hồ Chí Minh, 72421, Việt Nam | shares an identical street-level point with Bánh canh Trảng Bàng Ba Xi (food) — location approximate (house number not mapped) |
| Bánh Mì 110 | `banh-mi-110-110-hoang-van-thu` | ✅ accept | enrich | 1 | 1 | existing record | Hoàng Văn Thụ, Khu phố 5, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh, 72121, Việt Nam | — |
| Bánh Mì Hoàng Lam | `banh-mi-hoang-lam-168-nguyen-thuong-hien` | ✅ accept | enrich | 1 | 1 | existing record | Nguyễn Thượng Hiền, Khu phố 6, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | — |
| Ốc Chị Hồng | `oc-chi-hong-210-15-cach-mang-thang-8` | ✅ accept | enrich | 0 | 0 | existing record | Hẻm 629 Đường Cách Mạng Tháng 8, Khu phố 12A, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 7252 | — |
| Quán Ốc Phước Đạt | `quan-oc-phuoc-dat-84-nguyen-thong` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Thông, Khu phố 6, Phường Xuân Hòa, Thành phố Hồ Chí Minh, 72421, Việt Nam | — |
| Quán Ốc Hồng Ngọc | `quan-oc-hong-ngoc-13-vuon-chuoi` | ✅ accept | enrich | 0 | 0 | existing record | Hẻm 136 Vườn Chuối, Khu phố 6, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | — |
| Ốc Mint | `oc-mint-170-do-thi-loi` | ✅ accept | enrich | 0 | 0 | existing record | Đỗ Thị Lời, Khu phố 11, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, 72422, Việt Nam | — |
| Ốc 195 | `oc-195-195-56-tran-van-dang` | ✅ accept | enrich | 0 | 0 | existing record | Trần Văn Đang, Khu phố 15, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, 72422, Việt Nam | shares an identical street-level point with Bánh Xèo Cây Bàng (food), Bánh Xèo Miền Tây 139 (food) — location approximate (house number not mapped) |
| Quán Ốc Lan 2 | `quan-oc-lan-2-18-nguyen-dinh-chieu` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Đình Chiểu, Khu phố 16, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | shares an identical street-level point with Bún riêu cua ốc Cô Thủy (food) — location approximate (house number not mapped) |
| Quán Ốc Vân Chợ Bến Thành | `quan-oc-van-cho-ben-thanh-23-nguyen-an-ninh` | ✅ accept | enrich | 0 | 0 | existing record | 23, Nguyễn An Ninh, Khu phố 3, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009, Việt Nam | — |
| Hủ tiếu Nam Vang Thành Đạt | `hu-tieu-nam-vang-thanh-dat-34-co-bac` | ✅ accept | enrich | 0 | 0 | existing record | Hủ Tiếu Thành Đạt - Cô Bắc, 34, Cô Bắc, Khu phố 16, Phường Cầu Ông Lãnh, Thành phố Hồ Chí  | — |
| Hủ tiếu Nam Vang Nhân Quán | `hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-tam` | ✅ accept | enrich | 1 | 1 | existing record | Cách Mạng Tháng Tám, Khu phố 5, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | — |
| Hủ tiếu Nam Vang Nhân quán | `hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-8` | ✅ accept | enrich | 1 | 1 | existing record | Hẻm 686 Cách Mạng Tháng 8, Khu phố 14, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh, 72121,  | — |
| Hủ tiếu Nam Vang Trung Còi | `hu-tieu-nam-vang-trung-coi-80-cao-thang` | ✅ accept | enrich | 0 | 0 | existing record | Cao Thắng, Khu phố 26, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam | shares an identical street-level point with Phở Ông Cả (food) — location approximate (house number not mapped) |
| Hủ tiếu Nam Vang Quốc Ký | `hu-tieu-nam-vang-quoc-ky-24-ky-con` | ✅ accept | enrich | 1 | 1 | existing record | Ký Con, Khu phố 14, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009, Việt Nam | — |
| Hủ tiếu Nam Vang Hồng Phát | `hu-tieu-nam-vang-hong-phat-391-vo-van-tan` | ✅ accept | enrich | 1 | 1 | existing record | Võ Văn Tần, Khu phố 9, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | shares an identical street-level point with Bún Bò Mỡ Nổi Cô Như, Cơm Tấm 67 Tấm (food), Chè Vỉa Hè Cô Điệp (food), Bún Bò Mỡ Nổi Cô Như (food), Quán Cơm tấm Hùng (food), Cơm tấm Trần Quý Cáp (food), Dưỡng Sinh Cô Ba (Võ Văn Tần) (spa) — location approximate (house number not mapped) |
| Bún Chả Bà Lan "Thận | `bun-cha-ba-lan-than-9b-nguyen-thi-minh-khai` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Thị Minh Khai, Khu phố 7, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009, Việt Nam | shares an identical street-level point with Bánh Mì Chim Chạy (food), Le Spa des Artistes by L'Apothiquaire (Hôtel des Arts Saigon) (spa) — location approximate (house number not mapped) |
| Phở Anh | `pho-anh-08-ky-dong` | ✅ accept | enrich | 0 | 0 | existing record | Kỳ Đồng, Khu phố 2, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, 72422, Việt Nam | — |
| Quán cơm tấm đêm Cu Bo | `quan-com-tam-dem-cu-bo-122-nguyen-cu-trinh` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Cư Trinh, Khu phố 6, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, 71011, Việt Nam | shares an identical street-level point with Bún Đậu Mắm Tôm Tiến Hải (food) — location approximate (house number not mapped) |
| Quán | `quan-269-de-tham` | ✅ accept | enrich | 1 | 1 | existing record | Khách Sạn Vinh, 269, Đề Thám, Khu phố 12, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009,  | — |
| Bún riêu Cô Hương Béo | `bun-rieu-co-huong-beo-19b-nguyen-thi-minh-khai` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Thị Minh Khai, Khu phố 1, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, 71011, Việt N | — |
| Quán bún riêu Trinh | `quan-bun-rieu-trinh-156-tran-quang-khai` | ✅ accept | enrich | 1 | 1 | existing record | Trần Quang Khải, Khu phố 8, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việt Nam | shares an identical street-level point with Quán cơm Ba Cường, Quán cơm Ba Cường (food), Phở Hiền (food) — location approximate (house number not mapped) |
| Bún riêu đường Nguyễn Trãi | `bun-rieu-duong-nguyen-trai-219-nguyen-trai` | ✅ accept | enrich | 1 | 1 | existing record | GPT, 219-221, Nguyễn Trãi, Khu phố 15, Phường Chợ Quán, Thành phố Hồ Chí Minh, 72722, Việt | — |
| Cơm tấm Cali | `com-tam-cali-82-nguyen-van-troi` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Văn Trỗi, Khu phố 8, Phường Tân Sơn Hòa, Thành phố Hồ Chí Minh, 72122, Việt Nam | — |
| Quán bún thang Madame Thảo | `quan-bun-thang-madame-thao-157-20-nguyen-gia-tri` | ✅ accept | enrich | 0 | 0 | existing record | Nguyễn Gia Trí, Khu phố 49, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh, 72331, Việt Nam | — |
| Quán Bụi | `quan-bui-100-thach-thi-thanh` | ✅ accept | enrich | 1 | 1 | existing record | Thạch Thị Thanh, Khu phố 10, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việt Nam | — |
| Cơm tấm 74 Nguyễn Văn Cừ | `com-tam-74-nguyen-van-cu-74-nguyen-van-cu` | ✅ accept | enrich | 1 | 1 | existing record | Cơm tấm Nguyễn Văn Cừ, 74, Nguyễn Văn Cừ, Khu phố 8, Phường Cầu Ông Lãnh, Thành phố Hồ Chí | — |
| Cơm tấm 86 | `com-tam-86-151-co-giang` | ✅ accept | enrich | 1 | 1 | existing record | Cô Giang, Khu phố 17, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, 71011, Việt Nam | shares an identical street-level point with Ốc Cúc (food) — location approximate (house number not mapped) |
| Cota Subicha | `cota-subicha-161-nguyen-van-thu` | ✅ accept | enrich | 1 | 1 | existing record | Trường Trung học cơ sở Trần Văn Ơn, 161B, Nguyễn Văn Thủ, Khu phố 14, Phường Tân Định, Thà | — |
| Quán cơm Ba Cường | `quan-com-ba-cuong-263-tran-quang-khai` | ✅ accept | enrich | 1 | 1 | existing record | Trần Quang Khải, Khu phố 8, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việt Nam | shares an identical street-level point with Quán bún riêu Trinh, Phở Hiền (food), Quán bún riêu Trinh (food) — location approximate (house number not mapped) |
| Quán ốc Mắm Sữa | `quan-oc-mam-sua-282-6-bui-huu-nghia` | ✅ accept | enrich | 1 | 1 | existing record | Hẻm 282/49 Đường Bùi Hữu Nghĩa, Khu phố 32, Phường Gia Định, Thành phố Hồ Chí Minh, 72330, | — |
| Bánh tráng trộn Chú Viên | `banh-trang-tron-chu-vien-38-nguyen-thuong-hien` | ✅ accept | enrich | 1 | 1 | existing record | Nguyễn Thượng Hiền, Khu phố 33, Phường Vườn Lài, Thành phố Hồ Chí Minh, 72522, Việt Nam | — |
| Bánh tráng trộn Dì Hồng | `banh-trang-tron-di-hong-25-duong-so-11` | ✅ accept | enrich | 1 | 1 | existing record | Đường số 11, Khu phố 20, Phường Gia Định, Thành phố Hồ Chí Minh, 72330, Việt Nam | — |
| Bánh xèo miền Tây Bà Hai | `banh-xeo-mien-tay-ba-hai-49-nguyen-trong-tuyen` | ✅ accept | enrich | 1 | 1 | existing record | Nguyễn Trọng Tuyển, Khu phố 24, Phường Cầu Kiệu, Thành phố Hồ Chí Minh, 72222, Việt Nam | — |
| Bánh xèo rau rừng Anh Tiến | `banh-xeo-rau-rung-anh-tien-356-phan-van-tri` | ✅ accept | enrich | 0 | 0 | existing record | Phan Văn Trị, Khu phố 5, Phường Bình Thạnh, Thành phố Hồ Chí Minh, 72326, Việt Nam | — |
| Béo Ơi Quán | `beo-oi-quan-15-20-nguyen-thi-minh-khai` | ✅ accept | enrich | 1 | 1 | existing record | Nguyễn Thị Minh Khai, Khu phố 10, Phường Bàn Cờ, Thành phố Hồ Chí Minh, 72420, Việt Nam | — |
| Bún chả Bà Bính | `bun-cha-ba-binh-4-nguyen-trung-ngan` | ✅ accept | enrich | 1 | 1 | existing record | Nguyễn Trung Ngạn, Khu phố 2, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71016, Việt Nam | — |
| Bún Chả Hồ Gươm | `bun-cha-ho-guom-82-ho-tung-mau` | ✅ accept | enrich | 1 | 1 | existing record | Nhà Hàng Poki Grill, 82, Hồ Tùng Mậu, Khu phố 9, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71 | — |
| Bún chả Đồng Xuân | `bun-cha-dong-xuan-323-ly-tu-trong` | ✅ accept | enrich | 1 | 1 | existing record | Lý Tự Trọng, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71016, Việt Nam | shares an identical street-level point with Bún thang Thanh Thảo (food) — location approximate (house number not mapped) |
| Quán Ngon | `quan-ngon-209-de-tham` | ✅ accept | enrich | 1 | 1 | existing record | Đề Thám, Khu phố 12, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009, Việt Nam | — |

## Importer output

```
· skipped Bún Bò Huế Bến Ngự (585 Huỳnh Tấn Phát) — ambiguous street name, no district in source
· skipped Bún Bò Gia Hội (622 Tô Ngọc Vân) — ambiguous street name, no district in source
· skipped Bún Riêu Yến (1348 Trường Sa) — ambiguous street name, no district in source
· skipped Bánh Khọt & Bánh Xèo Ban Mê (78 Bình Giã) — ambiguous street name, no district in source
· skipped Bánh Cuốn Bắc (21A Bùi Thị Xuân) — ambiguous street name, no district in source
· skipped Lẩu Mắm Cô Út (41/6B Phan Văn Hớn) — ambiguous street name, no district in source
· skipped Chè Thanh Tâm (98 Bùi Hữu Nghĩa) — ambiguous street name, no district in source
· skipped Bún Chả Cá Đà Nẵng (8 Phan Xích Long) — ambiguous street name, no district in source
· skipped Chè Hiển Khánh (718 Nguyễn Đình Chiểu) — Geocoder placed No. 718 at the Quận 1 end of Nguyễn Đình Chiểu (street-level match, ~2 km off); not published until the exact location is confirmed.
· skipped Cơm tấm G.Gala (10 Bà Lê Chân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Dì Út (55/8 Bis Trần Đình Xu) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Cơm tấm Đỗ Phủ Đại Hàn (113A Đặng Dung) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Ba Há (389 Hưng Phú) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Cơm tấm Kiều Giang (192E Trần Quang Khải) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Ốc Hòa Trường Sa (1446 Trường Sa) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Tân Bình — exact location unconfirmed
· skipped Ốc Tuyết (432A/43B Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán ốc 235A (235A Mai Xuân Thưởng) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 8 than Quận 6 — exact location unconfirmed
· skipped Ốc Bà Cô Lốc Cốc (40a Trần Cao Vân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Bánh tráng trộn Cô Thảo (90 Nguyễn Thượng Hiền) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Bánh tráng trộn Long (34 Nguyễn Thượng Hiền) — intake CC-FOOD-010: possible duplicate of existing establishment banh-trang-long-34-34-nguyen-thuong-hien (Bánh Tráng Long 34, 34 Nguyễn Thượng Hiền, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bánh mì Kim Dung (118A Lý Thường Kiệt) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 10 — exact location unconfirmed
· skipped Bánh mì Út Kiêm (148 QL13) — intake CC-FOOD-010: coordinates: geocoder matched "Hẻm 148 Trần Thị Nghĩ, Khu phố 6, Phường Hạnh Thông, Thành phố Hồ Chí Minh, 71423, Việt Nam", which is not on 148 QL13
· skipped Bánh mì Cô Lành (6 Hồ Xuân Hương) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Bình Thạnh — exact location unconfirmed
· skipped Quán Ốc Vũ (37 Vĩnh Khánh) — intake CC-FOOD-010: possible duplicate of existing establishment oc-vu-37-vinh-khanh (Ốc Vũ, 37 Vĩnh Khánh, Quận 4, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán ốc Thảo (383 Vĩnh Khánh) — intake CC-FOOD-010: possible duplicate of existing establishment oc-thao-383-vinh-khanh (Ốc Thảo, 383 Vĩnh Khánh, Quận 4, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán ốc Khánh (25/5 Nguyễn Bỉnh Khiêm) — intake CC-FOOD-010: possible duplicate of existing establishment duong-sinh-co-ba-nguyen-binh-khiem (Dưỡng Sinh Cô Ba (Nguyễn Bỉnh Khiêm), 25/65 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán Sáu Ốc (5 Hồ Hảo Hớn) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Quán ốc Cô Thắm 30K (450/28C Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán ốc Ngon (290B/71 Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Làng Ốc (43 Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Ốc Cô Năm (432/42 Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán Ốc Anh (39/34 Dạ Nam) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Quán ốc Hội Ngộ (432A/27 Dương Bá Trạc) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán Ốc An (242/48 Nguyễn Thiện Thuật) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Quán Ốc Chị Hồng (210/15 Cách Mạng Tháng 8) — intake CC-FOOD-010: possible duplicate of existing establishment oc-chi-hong-210-15-cach-mang-thang-8 (Ốc Chị Hồng, 210/15 Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán Ốc Liễu (611/59 Điện Biên Phủ) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Quán Ốc Béo Hà Nội (10 Bàn Cờ) — intake CC-FOOD-010: possible duplicate of existing establishment oc-beo-ha-noi-10-ban-co (Ốc Béo Hà Nội, 10 Bàn Cờ, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán Ốc Diễm (136 Nguyễn Thiện Thuật) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Ốc tự nhiên Sài Gòn (536 Nguyễn Xiển) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Quán Ốc Quý (2H Đường số 10) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Thủ Thiêm than Quận 7 — exact location unconfirmed
· skipped Hủ tiếu Nam Vang Thanh Xuân (62 Tôn Thất Thiệp) — intake CC-FOOD-010: possible duplicate of existing establishment hu-tieu-my-tho-thanh-xuan-62-ton-that-thiep (Hủ Tiếu Mỹ Tho Thanh Xuân, 62 Tôn Thất Thiệp, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bánh xèo 335 Điện Biên Phủ (335/2 Điện Biên Phủ) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Thảo Điền than Quận 3 — exact location unconfirmed
· skipped Bánh xèo Dì Tuyết (2S A1-6 Mỹ Viên) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bánh xèo 46A Đinh Công Tráng (46A Đinh Công Tráng) — intake CC-FOOD-010: possible duplicate of existing establishment banh-xeo-46a (Bánh Xèo 46A, 46A Đinh Công Tráng, Phường Tân Định (District 1), TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bánh xèo Hẹn Hò (34L Đường số 7L) — intake CC-FOOD-010: coordinates: geocoder matched "Đường số 7, Khu phố 13, Phường Tân Hưng, Thành phố Hồ Chí Minh, 72912, Việt Nam", which is not on 34L Đường số 7L
· skipped Bánh xèo Mười Xiềm (204 Nguyễn Trãi) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 1 — exact location unconfirmed
· skipped Bánh xèo Thanh Phương (31 Hoàng Hoa Thám) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Tân Bình — exact location unconfirmed
· skipped Bún đậu mắm tôm Mạc Văn Khoa (176 QL13) — intake CC-FOOD-010: coordinates: geocoder matched "Hẻm 176 Nguyễn Văn Thương, Khu phố 32, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh, 72331, Việt Nam", which is not on 176 QL13
· skipped Bún bò Huế 14B (14B Đường 46) — intake CC-FOOD-010: coordinates: geocoder matched "Đường Số 14B, Khu phố 22, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam", which is not on 14B Đường 46
· skipped Phở quận 1 Cao Vân (25 Mạc Đĩnh Chi) — intake CC-FOOD-010: possible duplicate of existing establishment pho-cao-van-25-mac-dinh-chi (Phở Cao Vân, 25 Mạc Đĩnh Chi, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Phở Lộc 74 (74 Điện Biên Phủ) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 1 — exact location unconfirmed
· skipped T.A.T CORNER (8-1B Hà Huy Tập) — intake CC-FOOD-010: coordinates: geocoder matched "Bảo tàng Mỹ thuật Thành phố Hồ Chí Minh, 97A, Phó Đức Chính, Khu phố 16, Phường Bến Thành, Thành phố Hồ Chí Minh, 71010, Việt Nam", which is not on 8-1B Hà Huy Tập
· skipped Hà Nội Quán (86 Trương Định) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bún chả cô Hiên (100 Trần Khắc Chân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 1 — exact location unconfirmed
· skipped Bún bò Kim Hương (17 Rạch Bùng Binh) — intake CC-FOOD-010: possible duplicate of existing establishment bun-bo-hue-kim-huong-rach-bung-binh-17-rach-bung-binh (Bún Bò Huế Kim Hương – Rạch Bùng Binh, 17 Rạch Bùng Binh, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bún bò Cô Như (274/29 Võ Văn Tần) — intake CC-FOOD-010: possible duplicate of existing establishment bun-bo-mo-noi-co-nhu-274-29-vo-van-tan (Bún Bò Mỡ Nổi Cô Như, 274/29 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bún sườn bò bà Mai (71 Lô C2 đường số 45) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bún bò Huế 14B (14B Đường số 46) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 7 than Quận 4 — exact location unconfirmed
· skipped Phở Hòa (260C Pasteur) — intake CC-FOOD-010: possible duplicate of existing establishment pho-hoa-pasteur (Phở Hòa Pasteur, 260C Pasteur, Phường Xuân Hòa (formerly Ward 8, District 3), TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Phở lòng bò (251/5 Nguyễn Thiện Thuật) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Phở Lễ (146 Bàn Cờ vào 20m) — intake CC-FOOD-010: coordinates: geocoder matched "Trụ sở Ủy ban nhân dân Thành phố Hồ Chí Minh, 86, Lê Thánh Tôn, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71006, Việt Nam", which is not on 146 Bàn Cờ vào 20m
· skipped Quán cơm tấm Bà Tám Tiền (88 Nguyễn Thượng Hiền) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Tiệm cơm tấm Loan Nguyễn Thái Sơn (340A Nguyễn Thái Sơn) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Cơm Tấm 333 (26/10 Phạm Văn Đồng) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Gò Vấp — exact location unconfirmed
· skipped Bún đậu Mạc Văn Khoa (90 Trần Quang Khải) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bún Đậu Xoài (96 Trần Quang Khải) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Phúc Lộc Thọ (538 Nguyễn Thị Minh Khai) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Quán Số 1 (01 Nguyễn Thượng Hiền) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Quán Cơm Tí Nị (184A Nguyễn Thượng Hiền) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Cơm tấm Ni Mập (132B Cách Mạng Tháng 8) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 10 than Quận 3 — exact location unconfirmed
· skipped Bún bò Góc Huế An Dương Vương (400 An Dương Vương) — intake CC-FOOD-010: possible duplicate of existing establishment goc-hue-an-duong-vuong-400-an-duong-vuong (Góc Huế – An Dương Vương, 400 An Dương Vương, Quận 5, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bún bò Ngọc Dung (504 – 506 Hoàng Hữu Nam) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bún bò Huế 170B (170B Trần Nhân Tôn) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 10 — exact location unconfirmed
· skipped Bún Bò Huế Kim Hương (275 Nguyễn Duy Trinh) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bún Bò Thương Nhớ (98 Nguyễn Thị Nhung) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bún riêu Gánh chợ Bến Thành (04 Phan Bội Châu) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 1 — exact location unconfirmed
· skipped Bún riêu B'lao (478 Võ Văn Kiệt) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Bún riêu đường Nguyễn Cảnh Chân (18/5 Nguyễn Cảnh Chân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Quán bún riêu Đà Lạt (113bis Đặng Dung) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bún riêu ốc Nguyễn Thái Bình (66 Nguyễn Thái Bình) — intake CC-FOOD-010: possible duplicate of existing establishment bun-rieu-cua-oc-phan-rang-66-nguyen-thai-binh (Bún Riêu Cua Ốc Phan Rang, 66 Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bún đậu H-Famil Phan Văn Trị (673 Đ. Phan Văn Trị) — intake CC-FOOD-010: coordinates: geocoder matched "Đường Phan Văn Trị, Khu phố 4, Phường Hạnh Thông, Thành phố Hồ Chí Minh, 71423, Việt Nam", which is not on 673 Đ. Phan Văn Trị
· skipped Bún đậu mắm tôm Xồm (6 Lê Lợi) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Cơm tấm Khang (3 Bis Cửu Long) — intake CC-FOOD-010: coordinates: geocoder matched "Cửu Long, Khu phố 15, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 3 Bis Cửu Long
· skipped Cơm tấm Xí Muội (1090 Lạc Long Quân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 11 than Tân Bình — exact location unconfirmed
· skipped Canh Bún & Bún Riêu Bạch Tuộc Chị Thủy (22F Nguyễn Thị Tần) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Quán phở cuốn Bato (86 Nguyễn Thị Minh Khai) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Quán Huế Bích Liên (351/49B Lê Văn Sỹ) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Quán bánh cuốn Tây Hồ 127 (127 Đinh Tiên Hoàng) — intake CC-FOOD-010: possible duplicate of existing establishment banh-cuon-tay-ho-127-dinh-tien-hoang (Bánh Cuốn Tây Hồ, 127 Đinh Tiên Hoàng, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bánh cuốn Trứng (55/19 Vạn Kiếp) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Bình Thạnh — exact location unconfirmed
· skipped Bánh cuốn Nhớ (353 Lê Văn Sỹ) — intake CC-FOOD-010: possible duplicate of existing establishment banh-cuon-hong-hanh-353-le-van-sy (Bánh Cuốn Hồng Hạnh, 353 Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán bánh cuốn chợ Bàn Cờ (174/28 Nguyễn Thiện Thuật) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Bánh cuốn Bắc (21A Bùi Thị Xuân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Tân Bình than Quận 1 — exact location unconfirmed
· skipped Lẩu mắm Sài Gòn Phong Lan (26 Long Thuận) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bún thang Chị Ba (177 ter đường Cách Mạng Tháng 8) — intake CC-FOOD-010: coordinates: geocoder matched "Hẻm 656 Đường Cách Mạng Tháng 8, Khu phố 10, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, 72422, Việt Nam", which is not on 177 ter đường Cách Mạng Tháng 8
· skipped Bún thang cô Ngọc (443/63 Điện Biên Phủ) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Thảo Điền than Quận 3 — exact location unconfirmed
· skipped Quán Bún Hùng Mập (39 Đường 152 Cao Lỗ) — intake CC-FOOD-010: coordinates: geocoder matched "Phạm Thị Tánh, Khu phố 44, Phường Chánh Hưng, Thành phố Hồ Chí Minh, 73023, Việt Nam", which is not on 39 Đường 152 Cao Lỗ
· skipped Ốc Cẩm (162 Trần Nhân Tôn) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 10 — exact location unconfirmed
· skipped Bánh khọt Thùy Lê (606/187 Đường 3/2) — intake CC-FOOD-010: coordinates: geocoder matched "3 Tháng 2, Khu phố 24, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 606/187 Đường 3/2
· skipped Bánh khọt Hidden House (55/3 Lê Thị Hồng Gấm) — intake CC-FOOD-010: possible duplicate of existing establishment hidden-house-55-3-le-thi-hong-gam (Hidden House, 55/3 Lê Thị Hồng Gấm, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bánh khọt miền Tây Thanh Phương (31/6 Hoàng Hoa Thám) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Tân Bình — exact location unconfirmed
· skipped Bánh khọt Dì Năm (150/18 Nguyễn Trãi) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 1 — exact location unconfirmed
· skipped Bánh khọt Cô Ba Vũng Tàu (40B Trần Cao Vân) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Bánh khọt & Bánh xèo Cô Út Gạo (311 Đ. Bình Đông) — intake CC-FOOD-010: coordinates: geocoder matched "Bình Đông, Khu phố 11, Phường Phú Định, Thành phố Hồ Chí Minh, 73022, Việt Nam", which is not on 311 Đ. Bình Đông
· skipped Bánh xèo rau rừng Bé Diệp (257 Phạm Văn Đồng) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Gò Vấp — exact location unconfirmed
· skipped Bánh Khọt 267 (606/42 Đường 3/2) — intake CC-FOOD-010: coordinates: geocoder matched "3 Tháng 2, Khu phố 24, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 606/42 Đường 3/2
· skipped Bánh khọt Phương Nga (32/11 Đặng Dung) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bánh Xèo Gỏi Cuốn Cô Tuyên (152 Long Phước) — intake CC-FOOD-010: coordinates: geocoder matched "Trường Trung học phổ thông Phước Long, 18D, Dương Đình Hội, Khu phố 48, Phường Phước Long, Thành phố Hồ Chí Minh, 71321, Việt Nam", which is not on 152 Long Phước
· skipped Bánh xèo Quảng 7B/99 (1C/100 Hẻm 100 căn Nguyễn Tri Phương Tổ 63 Khu P) — intake CC-FOOD-010: coordinates: not geocoded: not found
· skipped Bánh xèo Thảo Vy (300 Sư Vạn Hạnh) — intake CC-FOOD-010: possible duplicate of existing establishment banh-xeo-tom-nhay-thanh-dieu-300-su-van-hanh (Bánh Xèo Tôm Nhảy Thanh Diệu, 300 Sư Vạn Hạnh, Quận 10, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Bò bía cô Lý (120E Lê Văn Duyệt) — intake CC-FOOD-010: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 1 — exact location unconfirmed
· skipped Quán Hương Bắc (1102 Đ. Phạm Văn Đồng) — intake CC-FOOD-010: coordinates: geocoder matched "Đường Phạm Văn Đồng, Khu phố 17, Phường Linh Xuân, Thành phố Hồ Chí Minh, 71309, Việt Nam", which is not on 1102 Đ. Phạm Văn Đồng
+ enriched pho-minh-63-6-pasteur: phone, openingHours, priceRange, price:pho-sai-gon
+ enriched pho-hoa-pasteur: phone
+ enriched banh-xeo-46a: phone, openingHours
+ enriched cuc-gach-quan-10-dang-tat: phone
+ enriched hu-tieu-hong-phat: phone
+ enriched com-tam-ba-ghien: phone
+ enriched pho-hung-quan-1-243-nguyen-trai: phone, openingHours
+ enriched pho-huong-binh-148-vo-thi-sau: phone
+ enriched bun-bo-mo-noi-co-nhu-274-29-vo-van-tan: phone, openingHours, priceRange, price:bun-bo-hue
+ enriched pho-cao-van-25-mac-dinh-chi: openingHours
+ enriched banh-mi-huynh-hoa: openingHours
+ enriched bun-rieu-ganh-cho-ben-thanh-163-le-thanh-ton: openingHours
+ enriched hu-tieu-nam-vang-lien-hua-381-vo-van-tan: price:hu-tieu-nam-vang
+ enriched banh-mi-110-110-hoang-van-thu: openingHours, priceRange, price:banh-mi-sai-gon
+ enriched banh-mi-hoang-lam-168-nguyen-thuong-hien: phone, social, priceRange, price:banh-mi-sai-gon
+ enriched oc-chi-hong-210-15-cach-mang-thang-8: phone, openingHours
+ enriched quan-oc-phuoc-dat-84-nguyen-thong: phone, openingHours
+ enriched quan-oc-hong-ngoc-13-vuon-chuoi: phone, openingHours
+ enriched oc-mint-170-do-thi-loi: phone, openingHours
+ enriched oc-195-195-56-tran-van-dang: phone
+ enriched quan-oc-lan-2-18-nguyen-dinh-chieu: phone
+ enriched quan-oc-van-cho-ben-thanh-23-nguyen-an-ninh: phone
+ enriched hu-tieu-nam-vang-thanh-dat-34-co-bac: openingHours
+ enriched hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-tam: openingHours, price:hu-tieu-nam-vang
+ enriched hu-tieu-nam-vang-nhan-quan-122d-cach-mang-thang-8: openingHours, price:hu-tieu-nam-vang
+ enriched hu-tieu-nam-vang-trung-coi-80-cao-thang: openingHours
+ enriched hu-tieu-nam-vang-quoc-ky-24-ky-con: openingHours, priceRange, price:hu-tieu-nam-vang
+ enriched hu-tieu-nam-vang-hong-phat-391-vo-van-tan: priceRange, price:hu-tieu-nam-vang
+ enriched bun-cha-ba-lan-than-9b-nguyen-thi-minh-khai: openingHours
+ enriched pho-anh-08-ky-dong: openingHours
+ enriched quan-com-tam-dem-cu-bo-122-nguyen-cu-trinh: openingHours, priceRange
+ enriched quan-269-de-tham: openingHours, priceRange, price:com-tam-sai-gon
+ enriched bun-rieu-co-huong-beo-19b-nguyen-thi-minh-khai: openingHours
+ enriched quan-bun-rieu-trinh-156-tran-quang-khai: openingHours, priceRange, price:bun-rieu-cua
+ enriched bun-rieu-duong-nguyen-trai-219-nguyen-trai: openingHours, priceRange, price:bun-rieu-cua
+ enriched com-tam-cali-82-nguyen-van-troi: openingHours
+ enriched quan-bun-thang-madame-thao-157-20-nguyen-gia-tri: phone, openingHours
+ enriched quan-bui-100-thach-thi-thanh: priceRange, price:com-tam-sai-gon
+ enriched com-tam-74-nguyen-van-cu-74-nguyen-van-cu: price:com-tam-sai-gon
+ enriched com-tam-86-151-co-giang: priceRange, price:com-tam-sai-gon
+ enriched cota-subicha-161-nguyen-van-thu: price:com-tam-sai-gon
+ enriched quan-com-ba-cuong-263-tran-quang-khai: price:com-tam-sai-gon
+ enriched quan-oc-mam-sua-282-6-bui-huu-nghia: priceRange, price:oc-sai-gon
+ enriched banh-trang-tron-chu-vien-38-nguyen-thuong-hien: priceRange, price:banh-trang-tron
+ enriched banh-trang-tron-di-hong-25-duong-so-11: priceRange, price:banh-trang-tron
+ enriched banh-xeo-mien-tay-ba-hai-49-nguyen-trong-tuyen: price:banh-xeo-nam-bo
+ enriched banh-xeo-rau-rung-anh-tien-356-phan-van-tri: priceRange
+ enriched beo-oi-quan-15-20-nguyen-thi-minh-khai: priceRange, price:bun-cha-ha-noi
+ enriched bun-cha-ba-binh-4-nguyen-trung-ngan: priceRange, price:bun-cha-ha-noi
+ enriched bun-cha-ho-guom-82-ho-tung-mau: priceRange, price:bun-cha-ha-noi
+ enriched bun-cha-dong-xuan-323-ly-tu-trong: priceRange, price:bun-cha-ha-noi
+ enriched quan-ngon-209-de-tham: priceRange, price:bun-cha-ha-noi
✓ 383 restaurants, 388 dish links, 39 dishes covered, 17 dishes with ≥5 venues
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.

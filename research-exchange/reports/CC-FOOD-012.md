# Intake CC-FOOD-012 — applied

- Experience: food · kind: venues · agent: claude-code · researched 2026-11-28
- Method: Venues for the 42 dishes added by GPT-CAT-001/002/003, from the 362 mia.vn HCMC food articles already read for CC-FOOD-011 (re-parsed with the 180-dish catalogue). Linked only when the venue's name contains the dish name or the article is about that exact dish. Hours only for one same-day range; no prices. Status: source-listed.
- Result: **2 accepted, 4 rejected, 1 warnings** (2026-11-28T15:57:07.307Z)

## Warnings

- pins reused from the dry run of 2026-11-28T15:57:01.260Z (no new Nominatim queries; supplied coordinates verified unchanged)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Bò Kho Gánh | `bo-kho-ganh-029-lo-h-chung-cu-ngo-gia-tu` | ❌ reject | none | 1 | 0 | — | — | coordinates: not geocoded: not found |
| Bún thịt nướng Chị Tuyền | `bun-thit-nuong-chi-tuyen-175-co-giang` | ✅ accept | new | 1 | 0 | street · geocoder 10.7624080,106.6940850 | Cô Giang, Khu phố 17, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, 71011, Việt Nam | shares an identical street-level point with Cơm tấm 86 (food), Ốc Cúc (food) — location approximate (house number not mapped) |
| Bánh Xèo Gỏi Cuốn Cô Tuyên | `banh-xeo-goi-cuon-co-tuyen-152-long-phuoc` | ❌ reject | none | 1 | 0 | street · geocoder 10.8165370,106.7756680 | Trường Trung học phổ thông Phước Long, 18D, Dương Đình Hội, Khu phố 48, Phường Phước Long, | coordinates: geocoder matched "Trường Trung học phổ thông Phước Long, 18D, Dương Đình Hội, Khu phố 48, Phường Phước Long, Thành phố Hồ Chí Minh, 71321, Việt Nam", which is not on 152 Long Phước |
| Vị Sài Gòn | `vi-sai-gon-157-nguyen-van-thu` | ✅ accept | new | 1 | 0 | street · geocoder 10.7920890,106.7010320 | Nguyễn Văn Thủ, Khu phố 13, Phường Tân Định, Thành phố Hồ Chí Minh, 71008, Việt Nam | shares an identical street-level point with Quán Ốc Chú Lùn (food), Góc Hà Nội (coffee) — location approximate (house number not mapped) |
| Quán bún thịt nướng Hải Đăng | `quan-bun-thit-nuong-hai-dang-149-chan-hung` | ❌ reject | none | 1 | 0 | street · geocoder 10.7860240,106.6631730 | Chấn Hưng, Phường Tân Hòa, Thành phố Hồ Chí Minh, 72125, Việt Nam | coordinates: street-level pin (house number not located) lies nearer Quận 10 than Tân Bình — exact location unconfirmed |
| Quán bún thịt nướng Cô Ba | `quan-bun-thit-nuong-co-ba-65-tan-thanh` | ❌ reject | none | 1 | 0 | street · geocoder 10.7554550,106.6523540 | Tân Thành, Khu phố 25, Phường Chợ Lớn, Thành phố Hồ Chí Minh, 72723, Việt Nam | coordinates: street-level pin (house number not located) lies nearer Quận 11 than Tân Phú — exact location unconfirmed |

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
· skipped Cơm tấm G.Gala (10 Bà Lê Chân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Dì Út (55/8 Bis Trần Đình Xu) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh tráng trộn Cô Thảo (90 Nguyễn Thượng Hiền) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Bò bía cô Lý (120E Lê Văn Duyệt) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 1 — exact location unconfirmed
· skipped Quán ốc Khánh (25/5 Nguyễn Bỉnh Khiêm) — intake CC-FOOD-011: possible duplicate of existing establishment duong-sinh-co-ba-nguyen-binh-khiem (Dưỡng Sinh Cô Ba (Nguyễn Bỉnh Khiêm), 25/65 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Quán Sáu Ốc (5 Hồ Hảo Hớn) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Bún bò Huế 14B (14B Đường 46) — intake CC-FOOD-011: coordinates: geocoder matched "Đường Số 14B, Khu phố 22, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam", which is not on 14B Đường 46
· skipped Bún chả cô Hiên (100 Trần Khắc Chân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 1 — exact location unconfirmed
· skipped Bún đậu H-Famil Phan Văn Trị (673 Đ. Phan Văn Trị) — intake CC-FOOD-011: coordinates: geocoder matched "Đường Phan Văn Trị, Khu phố 4, Phường Hạnh Thông, Thành phố Hồ Chí Minh, 71423, Việt Nam", which is not on 673 Đ. Phan Văn Trị
· skipped Bún đậu mắm tôm Xồm (6 Lê Lợi) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Bún đậu mắm tôm Mạc Văn Khoa (176 QL13) — intake CC-FOOD-011: coordinates: geocoder matched "Hẻm 176 Nguyễn Văn Thương, Khu phố 32, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh, 72331, Việt Nam", which is not on 176 QL13
· skipped Quán cơm tấm Bà Tám Tiền (88 Nguyễn Thượng Hiền) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Tiệm cơm tấm Loan Nguyễn Thái Sơn (340A Nguyễn Thái Sơn) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Gò Vấp — exact location unconfirmed
· skipped Cơm Tấm 333 (26/10 Phạm Văn Đồng) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Gò Vấp — exact location unconfirmed
· skipped Cơm tấm Đỗ Phủ Đại Hàn (113A Đặng Dung) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Kiều Giang (192E Trần Quang Khải) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Khang (3 Bis Cửu Long) — intake CC-FOOD-011: coordinates: geocoder matched "Cửu Long, Khu phố 15, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 3 Bis Cửu Long
· skipped Cơm tấm Xí Muội (1090 Lạc Long Quân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 11 than Tân Bình — exact location unconfirmed
· skipped Quán Ốc An (242/48 Nguyễn Thiện Thuật) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Quán Ốc Liễu (611/59 Điện Biên Phủ) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Quán Ốc Diễm (136 Nguyễn Thiện Thuật) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Quán ốc Bà Cô Lốc Cốc (40a Trần Cao Vân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Quán ốc Cô Thắm 30K (450/28C Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán ốc Ngon (290B/71 Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Làng Ốc (43 Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Ốc Cô Năm (432/42 Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán ốc Tuyết quận 8 (432A/43B Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Quán Ốc Anh (39/34 Dạ Nam) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Quán ốc Hội Ngộ (432A/27 Dương Bá Trạc) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 8 — exact location unconfirmed
· skipped Bánh cuốn Trứng (55/19 Vạn Kiếp) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Bình Thạnh — exact location unconfirmed
· skipped Quán bánh cuốn chợ Bàn Cờ (174/28 Nguyễn Thiện Thuật) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Bánh cuốn Bắc (21A Bùi Thị Xuân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Tân Bình than Quận 1 — exact location unconfirmed
· skipped Cơm tấm Ba Đạt (01 Quốc Hương) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh cuốn bà Năm (93 Trần Não) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh xèo Quảng 7B/99 (1C/100 Hẻm 100 căn Nguyễn Tri Phương Tổ 63 Khu P) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh Xèo Gỏi Cuốn Cô Tuyên (152 Long Phước) — intake CC-FOOD-011: coordinates: geocoder matched "Trường Trung học phổ thông Phước Long, 18D, Dương Đình Hội, Khu phố 48, Phường Phước Long, Thành phố Hồ Chí Minh, 71321, Việt Nam", which is not on 152 Long Phước
· skipped Bún Bò Huế Kim Hương (275 Nguyễn Duy Trinh) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bún Bò Thương Nhớ (98 Nguyễn Thị Nhung) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bún đậu Mạc Văn Khoa (90 Trần Quang Khải) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bún Đậu Xoài (96 Trần Quang Khải) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bún thang Chị Ba (177 ter đường Cách Mạng Tháng 8) — intake CC-FOOD-011: coordinates: geocoder matched "Hẻm 656 Đường Cách Mạng Tháng 8, Khu phố 10, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, 72422, Việt Nam", which is not on 177 ter đường Cách Mạng Tháng 8
· skipped Bún thang cô Ngọc (443/63 Điện Biên Phủ) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Thảo Điền than Quận 3 — exact location unconfirmed
· skipped Quán Bún Hùng Mập (39 Đường 152 Cao Lỗ) — intake CC-FOOD-011: coordinates: geocoder matched "Phạm Thị Tánh, Khu phố 44, Phường Chánh Hưng, Thành phố Hồ Chí Minh, 73023, Việt Nam", which is not on 39 Đường 152 Cao Lỗ
· skipped Cơm tấm Phúc Lộc Thọ (538 Nguyễn Thị Minh Khai) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Cơm tấm Ni Mập (132B Cách Mạng Tháng 8) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 10 than Quận 3 — exact location unconfirmed
· skipped Lẩu A7 (14/5B Kỳ Đồng) — intake CC-FOOD-011: possible duplicate of existing establishment bun-oc-thanh-hai-14-12-ky-dong (Bún ốc Thanh Hải, 14/12 Kỳ Đồng, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Lẩu gà lá é Anh Bảy (04 Đường 46) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Thủ Đức — exact location unconfirmed
· skipped Lẩu mắm Sài Gòn Phong Lan (26 Long Thuận) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Ốc Hòa Trường Sa (1432 Trường Sa) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Tân Bình — exact location unconfirmed
· skipped Ốc Cẩm (162 Trần Nhân Tôn) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 10 — exact location unconfirmed
· skipped Quán ốc 235A (235A Mai Xuân Thưởng) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 8 than Quận 6 — exact location unconfirmed
· skipped Quán phở cuốn Bato (86 Nguyễn Thị Minh Khai) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Quán Huế Bích Liên (351/49B Lê Văn Sỹ) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Quận 3 — exact location unconfirmed
· skipped Bún đậu mắm tôm Tiến Hải (409 Nguyễn Tri Phương) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 10 — exact location unconfirmed
· skipped Nem nướng Ninh Hòa Hoàng Phương (92/2 Đường số 15) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Thủ Thiêm than Quận 7 — exact location unconfirmed
· skipped Bánh khọt Thùy Lê (606/187 Đường 3/2) — intake CC-FOOD-011: coordinates: geocoder matched "3 Tháng 2, Khu phố 24, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 606/187 Đường 3/2
· skipped Bánh khọt miền Tây Thanh Phương (31/6 Hoàng Hoa Thám) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Tân Bình — exact location unconfirmed
· skipped Bánh khọt Dì Năm (150/18 Nguyễn Trãi) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 1 — exact location unconfirmed
· skipped Bánh khọt Cô Ba Vũng Tàu (40B Trần Cao Vân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
· skipped Bánh khọt & Bánh xèo Cô Út Gạo (311 Đ. Bình Đông) — intake CC-FOOD-011: coordinates: geocoder matched "Bình Đông, Khu phố 11, Phường Phú Định, Thành phố Hồ Chí Minh, 73022, Việt Nam", which is not on 311 Đ. Bình Đông
· skipped Bánh xèo rau rừng Bé Diệp (257 Phạm Văn Đồng) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Gò Vấp — exact location unconfirmed
· skipped Bánh Khọt 267 (606/42 Đường 3/2) — intake CC-FOOD-011: coordinates: geocoder matched "3 Tháng 2, Khu phố 24, Phường Hòa Hưng, Thành phố Hồ Chí Minh, 72523, Việt Nam", which is not on 606/42 Đường 3/2
· skipped Bánh khọt Phương Nga (32/11 Đặng Dung) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Bánh xèo Hẹn Hò Miền Tây (34L Đường số 7L) — intake CC-FOOD-011: coordinates: geocoder matched "Đường số 9, Khu phố 27, Phường Chánh Hưng, Thành phố Hồ Chí Minh, 73023, Việt Nam", which is not on 34L Đường số 7L
· skipped Bánh xèo 335 Điện Biên Phủ (335/2 Điện Biên Phủ) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Thảo Điền than Quận 3 — exact location unconfirmed
· skipped Bánh xèo Dì Tuyết (2S A1-6 Mỹ Viên) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh xèo Mười Xiềm (204 Nguyễn Trãi) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 1 — exact location unconfirmed
· skipped Bánh xèo Thanh Phương (31 Hoàng Hoa Thám) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Phú Nhuận than Tân Bình — exact location unconfirmed
· skipped Quán Bánh Xèo Hương Lúa (361 Nguyễn Duy Trinh) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Quán Bánh Xèo Miền Trung (432 Nguyễn Duy Trinh) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh Xèo Ba Híu (12/46/9 Trần Não) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bánh Xèo Cô Ba (304 Thân Văn Nhiếp) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bún bò Ngọc Dung (504 – 506 Hoàng Hữu Nam) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Bún bò Huế 14B (14B Đường số 46) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 7 than Quận 4 — exact location unconfirmed
· skipped Bún riêu Gánh chợ Bến Thành (04 Phan Bội Châu) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 1 — exact location unconfirmed
· skipped Bún riêu B'lao (478 Võ Văn Kiệt) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Bún riêu đường Nguyễn Cảnh Chân (18/5 Nguyễn Cảnh Chân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
· skipped Quán bún riêu Đà Lạt (113bis Đặng Dung) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
· skipped Canh Bún & Bún Riêu Bạch Tuộc Chị Thủy (22F Nguyễn Thị Tần) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Mai Quán Bún riêu (287/31 Nguyễn Đình Chiểu) — intake CC-FOOD-011: possible duplicate of existing establishment bun-rieu-cua-oc-co-thuy-287-66-nguyen-dinh-chieu (Bún riêu cua ốc Cô Thủy, 287/66 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Canh bún & Bún riêu bạch tuộc Chị Thủy (25F Nguyễn Thị Tần) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 5 than Quận 8 — exact location unconfirmed
· skipped Cơm tấm Mộc (85 Lý Tự Trọng. P. Bến Thành) — intake CC-FOOD-011: coordinates: geocoder matched "Lý Tự Trọng, Khu phố 2, Phường Bến Thành, Thành phố Hồ Chí Minh, 71009, Việt Nam", which is not on 85 Lý Tự Trọng. P. Bến Thành
· skipped Hủ tiếu Sa Đéc & Bánh tằm Dì Năm (166 Bùi Thị Xuân) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Tân Bình than Quận 1 — exact location unconfirmed
· skipped Hủ tiếu Nam Vang Đạt Thành (607C Cách Mạng Tháng 8) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Tân Bình than Quận 10 — exact location unconfirmed
· skipped Bếp Ốc (74/7E Hai Bà Trưng) — intake CC-FOOD-011: possible duplicate of existing establishment banh-xeo-bep-me-in-74-7-hai-ba-trung (Bánh Xèo Bếp Mẹ Ỉn, 74/7 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh) — use the same name/address to merge, or set confirmDistinct
· skipped Ốc Nho 88 (178-180-182-190 Lê Quốc Hưng) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Ốc tự nhiên (536 Nguyễn Xiển) — intake CC-FOOD-011: coordinates: not geocoded: not found
· skipped Quán Ốc Quý (2H Đường số 10) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Thủ Thiêm than Quận 7 — exact location unconfirmed
· skipped Ốc Hòa Trường Sa (1446 Trường Sa) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Tân Bình — exact location unconfirmed
· skipped Phở lòng bò (251/5 Nguyễn Thiện Thuật) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 3 — exact location unconfirmed
· skipped Phở Lễ (146 Bàn Cờ vào 20m) — intake CC-FOOD-011: coordinates: geocoder matched "Trụ sở Ủy ban nhân dân Thành phố Hồ Chí Minh, 86, Lê Thánh Tôn, Khu phố 3, Phường Sài Gòn, Thành phố Hồ Chí Minh, 71006, Việt Nam", which is not on 146 Bàn Cờ vào 20m
· skipped Phở Lộc 74 (74 Điện Biên Phủ) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Bình Thạnh than Quận 1 — exact location unconfirmed
· skipped Bánh mì Út Kiêm (148 QL13) — intake CC-FOOD-011: coordinates: geocoder matched "Hẻm 148 Trần Thị Nghĩ, Khu phố 6, Phường Hạnh Thông, Thành phố Hồ Chí Minh, 71423, Việt Nam", which is not on 148 QL13
· skipped Bánh mì Cô Lành (6 Hồ Xuân Hương) — intake CC-FOOD-011: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Bình Thạnh — exact location unconfirmed
· skipped Bò Kho Gánh (029 Lô H chung cư Ngô Gia Tự) — intake CC-FOOD-012: coordinates: not geocoded: not found
· skipped Bánh Xèo Gỏi Cuốn Cô Tuyên (152 Long Phước) — intake CC-FOOD-012: coordinates: geocoder matched "Trường Trung học phổ thông Phước Long, 18D, Dương Đình Hội, Khu phố 48, Phường Phước Long, Thành phố Hồ Chí Minh, 71321, Việt Nam", which is not on 152 Long Phước
· skipped Quán bún thịt nướng Hải Đăng (149 Chấn Hưng) — intake CC-FOOD-012: coordinates: street-level pin (house number not located) lies nearer Quận 10 than Tân Bình — exact location unconfirmed
· skipped Quán bún thịt nướng Cô Ba (65 Tân Thành) — intake CC-FOOD-012: coordinates: street-level pin (house number not located) lies nearer Quận 11 than Tân Phú — exact location unconfirmed
✓ 439 restaurants, 444 dish links, 44 dishes covered, 19 dishes with ≥5 venues
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.

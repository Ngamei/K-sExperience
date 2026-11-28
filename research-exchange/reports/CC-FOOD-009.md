# Intake CC-FOOD-009 — applied

- Experience: food · kind: venues · agent: claude-code · researched 2026-11-28
- Method: Establishment-first desk research for home-style and regional dishes with 0 HCMC venues (Vietnamese queries; Michelin Guide, mia.vn, VnExpress, mytour, VinWonders). Pages read via search-result excerpts (direct fetches blocked) — spot-check. Hours only where the source states them; no prices because no source gives a dish price at these venues.
- Result: **3 accepted, 1 rejected, 0 warnings** (2026-11-28T04:45:06.514Z)

| Venue | Id | Decision | Action | Offerings | Priced | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- |
| Cục Gạch Quán | `cuc-gach-quan-10-dang-tat` | ✅ accept | new | 1 | 0 | — |
| Bánh canh Trảng Bàng Ba Xi | `banh-canh-trang-bang-ba-xi-135-vo-van-tan` | ✅ accept | new | 1 | 0 | — |
| Bánh canh Trảng Bàng Ông Cáo | `banh-canh-trang-bang-ong-cao-4d-vo-van-van` | ✅ accept | new | 1 | 0 | — |
| Chè Hiển Khánh | `che-hien-khanh-718-nguyen-dinh-chieu` | ❌ reject | none | 0 | 0 | excluded by researcher: Geocoder placed No. 718 at the Quận 1 end of Nguyễn Đình Chiểu (street-level match, ~2 km off); not published until the exact location is confirmed. |

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
✓ 118 restaurants, 121 dish links, 36 dishes covered, 10 dishes with ≥5 venues
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.

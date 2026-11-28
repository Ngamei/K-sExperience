# Business profile completeness

Generated 2026-11-28 by `npm run data:profile-completeness` from the canonical data. Do not edit by hand. Machine-readable: `docs/profile-completeness.json`.

**Targets** are the PO's proposed launch quality standard (2026-11-28) — target coverage, not measured coverage. **Current** is measured from the records; a field counts only if the record carries it. Real records only (no samples). ✅ meets target · 🟡 at least half way · 🔴 below half.

**509 real establishments** (Food 457 · Coffee 9 · Bars 30 · Spa 6 · Sport 7). **Launch-ready profiles: 0** (every field with a target ≥ 70 % present). Median days since last check: 0; checked in the last 90 days: 100 %.

## Overall vs launch standard

| Field | Target | Current | Count | |
| --- | --- | --- | --- | --- |
| Business name & category | 100 % | 100 % | 509/509 | ✅ |
| Verified address | 100 % | 100 % | 509/509 | ✅ |
| Validated location | 100 % | 22.4 % | 114/509 | 🔴 |
| Operating status | 90 % | 39.5 % | 201/509 | 🔴 |
| Phone or contact channel | 85 % | 3.5 % | 18/509 | 🔴 |
| Opening hours | 80 % | 38.1 % | 194/509 | 🔴 |
| Menu or service list | 80 % | 0 % | 0/509 | 🔴 |
| Published prices | 70 % | 5.3 % | 27/509 | 🔴 |
| Actual business photography | 50 % | 0.2 % | 1/509 | 🔴 |
| ↳ of which phone number | — | 3.5 % | 18/509 | |
| Source freshness (≤ 90 days) | — | 100 % | 509/509 | |

## By research area

Areas follow the PO's research split. An establishment is counted in the first area whose rule matches (polygon areas first, then the former district named in the address).

| Area | Owner | Profiles | Launch-ready | Name | Address | Pin | Status | Contact | Hours | Menu | Prices | Photo | Phone | ≤ 90 d |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thảo Điền & An Phú | ChatGPT | 8 | 0 | 100 % | 100 % | 12.5 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 100 % |
| Sala & Thủ Thiêm | ChatGPT | 2 | 0 | 100 % | 100 % | 50 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 100 % |
| Q7 & Phú Mỹ Hưng | ChatGPT | 38 | 0 | 100 % | 100 % | 31.6 % | 28.9 % | 0 % | 28.9 % | 0 % | 0 % | 0 % | 0 % | 100 % |
| Q1 & Q3 | Claude Code | 169 | 0 | 100 % | 100 % | 25.4 % | 44.4 % | 8.9 % | 41.4 % | 0 % | 13.6 % | 0.6 % | 8.9 % | 100 % |
| Phú Nhuận & Bình Thạnh | Claude Code | 28 | 0 | 100 % | 100 % | 0 % | 50 % | 10.7 % | 42.9 % | 0 % | 14.3 % | 0 % | 10.7 % | 100 % |
| Other districts | unassigned | 221 | 0 | 100 % | 100 % | 14.9 % | 45.7 % | 0 % | 45.7 % | 0 % | 0 % | 0 % | 0 % | 100 % |
| District not in address | unassigned | 43 | 0 | 100 % | 100 % | 55.8 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % | 100 % |

Columns: Name = Business name & category (target 100 %) · Address = Verified address (target 100 %) · Pin = Validated location (target 100 %) · Status = Operating status (target 90 %) · Contact = Phone or contact channel (target 85 %) · Hours = Opening hours (target 80 %) · Menu = Menu or service list (target 80 %) · Prices = Published prices (target 70 %) · Photo = Actual business photography (target 50 %).

## By experience

| Experience | Profiles | Launch-ready | Name | Address | Pin | Status | Contact | Hours | Menu | Prices | Photo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| food | 457 | 0 | 100 % | 100 % | 20.8 % | 43.5 % | 3.9 % | 42.5 % | 0 % | 5.9 % | 0.2 % |
| coffee | 9 | 0 | 100 % | 100 % | 33.3 % | 11.1 % | 0 % | 0 % | 0 % | 0 % | 0 % |
| bars | 30 | 0 | 100 % | 100 % | 46.7 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % |
| spa | 6 | 0 | 100 % | 100 % | 0 % | 16.7 % | 0 % | 0 % | 0 % | 0 % | 0 % |
| sport | 7 | 0 | 100 % | 100 % | 28.6 % | 0 % | 0 % | 0 % | 0 % | 0 % | 0 % |

## Definitions

- **nameCategory** — name and venueType present
- **address** — street address (contains a house number or street) and ≥ 1 cited source
- **location** — pin precision exact or building (street-level pins are approximate)
- **status** — closure recorded, or checked ≤ 365 days ago AND the record carries a live operating signal (opening hours, contact channel or delivery link) — a listicle mention alone does not confirm the business is operating
- **contact** — phone, website, social page or a delivery/booking link
- **phone** — phone number recorded (contact.phone)
- **hours** — opening hours recorded
- **menu** — a menu/service list: ≥ 1 link evidenced by an official menu, delivery listing or menu photo, or ≥ 5 real dish/item links (one listicle dish mention is not a menu)
- **prices** — ≥ 1 real dish/item link with a published price
- **photo** — ≥ 1 real photo of the business (data/venue-photos.json), not an illustration
- **fresh90** — last checked ≤ 90 days ago

## Enrichment worklist (top 15 per area)

Existing profiles first (PO: enrich before adding). Ordered by number of linked dishes/items, then most missing fields. Full lists in the JSON.

### Thảo Điền & An Phú — ChatGPT (8 profiles missing fields)

| Venue | Experience | Links | Missing |
| --- | --- | --- | --- |
| Bang Bang Pickleball Club (`bang-bang-pickleball-club`) | sport | 2 | location, status, contact, hours, menu, prices |
| Anh Coffee Matcha Bar (`anh-coffee-matcha-bar-37-thao-dien`) | coffee | 1 | location, status, contact, hours, menu, prices |
| Belgica Brewpub (`belgica-brewpub-198a-nguyen-van-huong`) | bars | 1 | location, status, contact, hours, menu, prices |
| Pasteur Street Craft Beer – Thảo Điền (`pasteur-street-craft-beer-thao-dien-120-xuan-thuy`) | bars | 1 | location, status, contact, hours, menu, prices |
| PickoLand Thảo Điền Pickleball Club (`pickoland-thao-dien`) | sport | 1 | location, status, contact, hours, menu, prices |
| Tiệm Bia Gà – Thảo Điền (`tiem-bia-ga-thao-dien-26b-xuan-thuy`) | bars | 1 | location, status, contact, hours, menu, prices |
| UFiTU Pilates+ (Thảo Điền) (`ufitu-pilates-thao-dien-3-38-quoc-huong`) | sport | 1 | location, status, contact, hours, menu, prices |
| BiaCraft – Thảo Điền (`biacraft-thao-dien-90-xuan-thuy`) | bars | 1 | status, contact, hours, menu, prices |

### Sala & Thủ Thiêm — ChatGPT (2 profiles missing fields)

| Venue | Experience | Links | Missing |
| --- | --- | --- | --- |
| Pasteur Street Craft Beer – Metropole (`pasteur-street-craft-beer-metropole-20-nguyen-thien-thanh`) | bars | 1 | location, status, contact, hours, menu, prices |
| Pasteur Street Craft Beer – Sala (`pasteur-street-craft-beer-sala-74-nguyen-co-thach`) | bars | 1 | status, contact, hours, menu, prices |

### Q7 & Phú Mỹ Hưng — ChatGPT (38 profiles missing fields)

| Venue | Experience | Links | Missing |
| --- | --- | --- | --- |
| Bánh Đa Cua Lão Ngư (`banh-da-cua-lao-ngu-105-duong-so-53`) | food | 1 | location, status, contact, hours, menu, prices |
| Bún chả Hà Nội xưa (`bun-cha-ha-noi-xua-144-duong-so-79`) | food | 1 | location, status, contact, hours, menu, prices |
| Bún thang Linh Trang Anh (`bun-thang-linh-trang-anh-185-duong-so-79`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm tấm Minh Long (`com-tam-minh-long-607-nguyen-thi-thap`) | food | 1 | location, status, contact, hours, menu, prices |
| Hủ Tiếu Tài Anh (`hu-tieu-tai-anh-494-nguyen-thi-thap`) | food | 1 | location, status, contact, hours, menu, prices |
| Lẩu Mắm Bà Dú (`lau-mam-ba-du-436-nguyen-thi-thap`) | food | 1 | location, status, contact, hours, menu, prices |
| Ốc Ben (`oc-ben-12-duong-so-3`) | food | 1 | location, status, contact, hours, menu, prices |
| Ốc Đêm 66 (`oc-dem-66-80-nguyen-thi-thap`) | food | 1 | location, status, contact, hours, menu, prices |
| Ốc Lạ Mà Quen (`oc-la-ma-quen-903-41-tran-xuan-soan`) | food | 1 | location, status, contact, hours, menu, prices |
| Ốc tự nhiên Sài Gòn (`oc-tu-nhien-sai-gon-194-le-van-luong`) | food | 1 | location, status, contact, hours, menu, prices |
| Ốc tự nhiên Sài Gòn (`oc-tu-nhien-sai-gon-2-tran-trong-cung`) | food | 1 | location, status, contact, hours, menu, prices |
| Pasteur Street Craft Beer – Nguyễn Đức Cảnh (`pasteur-street-craft-beer-nguyen-duc-canh-123-nguyen-duc-canh`) | bars | 1 | location, status, contact, hours, menu, prices |
| Phở Đệ Nhất (`pho-de-nhat-415-nguyen-thi-thap`) | food | 1 | location, status, contact, hours, menu, prices |
| Phở Định quận 7 (`pho-dinh-quan-7-3-1a-nguyen-cao`) | food | 1 | location, status, contact, hours, menu, prices |
| Phở Thìn quận 7 (`pho-thin-quan-7-53-nguyen-duc-canh`) | food | 1 | location, status, contact, hours, menu, prices |

### Q1 & Q3 — Claude Code (169 profiles missing fields)

| Venue | Experience | Links | Missing |
| --- | --- | --- | --- |
| Le Spa des Artistes by L'Apothiquaire (Hôtel des Arts Saigon) (`le-spa-des-artistes`) | spa | 4 | location, status, contact, hours, menu, prices |
| Góc Huế – Kỳ Đồng (`goc-hue-ky-dong-41-ky-dong`) | food | 3 | location, status, contact, hours, menu, prices |
| Gym One Pickleball (`gym-one-pickleball-le-quy-don`) | sport | 3 | location, status, contact, hours, menu, prices |
| La Maison de L'Apothiquaire (`la-maison-de-lapothiquaire-truong-dinh`) | spa | 3 | location, status, contact, hours, menu, prices |
| Bánh Bèo Huế O Trinh (`banh-beo-hue-o-trinh-126-bui-thi-xuan`) | food | 2 | location, status, contact, hours, menu, prices |
| Bún riêu cua ốc Cô Thủy (`bun-rieu-cua-oc-co-thuy-287-66-nguyen-dinh-chieu`) | food | 2 | location, status, contact, hours, menu, prices |
| Góc Huế – Nguyễn Thái Bình (`goc-hue-nguyen-thai-binh-155-nguyen-thai-binh`) | food | 2 | location, status, contact, hours, menu, prices |
| Okkio Caffe (Lê Lợi) (`okkio-caffe-le-loi`) | coffee | 2 | status, contact, hours, menu, prices |
| Phở Minh (`pho-minh-63-6-pasteur`) | food | 2 | location, menu |
| An Miên Spa (`an-mien-spa-dinh-tien-hoang`) | spa | 1 | location, status, contact, hours, menu, prices |
| Bánh Bèo Huế Thùy Linh (`banh-beo-hue-thuy-linh-209-le-van-sy`) | food | 1 | location, status, contact, hours, menu, prices |
| Bánh Bèo Xíu (`banh-beo-xiu-284-le-van-sy`) | food | 1 | location, status, contact, hours, menu, prices |
| Bánh canh Trảng Bàng Ba Xi (`banh-canh-trang-bang-ba-xi-135-vo-van-tan`) | food | 1 | location, status, contact, hours, menu, prices |
| Bánh mì Bà Huynh (`banh-mi-ba-huynh-197a-nguyen-trai`) | food | 1 | location, status, contact, hours, menu, prices |
| Bánh Mì Chim Chạy (`banh-mi-chim-chay-147d-nguyen-thi-minh-khai`) | food | 1 | location, status, contact, hours, menu, prices |

### Phú Nhuận & Bình Thạnh — Claude Code (28 profiles missing fields)

| Venue | Experience | Links | Missing |
| --- | --- | --- | --- |
| Bột Chiên 51 (`bot-chien-51-51-nguyen-van-lac`) | food | 1 | location, status, contact, hours, menu, prices |
| Bún Nước Lèo Sóc Trăng – Lê Quang Định (`bun-nuoc-leo-soc-trang-le-quang-dinh-401-le-quang-dinh`) | food | 1 | location, status, contact, hours, menu, prices |
| Bún Ốc Song Anh (`bun-oc-song-anh-100-nguyen-van-dau`) | food | 1 | location, status, contact, hours, menu, prices |
| Chè Đèn Dầu (`che-den-dau-504-nguyen-kiem`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm tấm Bà Chị Hai (`com-tam-ba-chi-hai-51-dang-van-ngu`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm tấm Bà Ròm (`com-tam-ba-rom-55-phan-dinh-phung`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm Tấm Hẻm 33 (`com-tam-hem-33-33-16-nguyen-dinh-chinh`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm Tấm Mây (`com-tam-may-26-truong-quoc-dung`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm tấm Sườn Chéo (`com-tam-suon-cheo-203-huynh-van-banh`) | food | 1 | location, status, contact, hours, menu, prices |
| Cơm tấm Thành Râu (`com-tam-thanh-rau-119-phung-van-cung`) | food | 1 | location, status, contact, hours, menu, prices |
| Hủ tiếu Nam Vang Hồng Thịnh (`hu-tieu-nam-vang-hong-thinh-39-nguyen-van-dau`) | food | 1 | location, status, contact, hours, menu, prices |
| Hương Bún Thang (`huong-bun-thang-50-ho-bieu-chanh`) | food | 1 | location, status, contact, hours, menu, prices |
| Mì Quảng Ếch (`mi-quang-ech-233-nguyen-trong-tuyen`) | food | 1 | location, status, contact, hours, menu, prices |
| Quán Cơm Tấm Mén (`quan-com-tam-men-39-4b-huynh-van-banh`) | food | 1 | location, status, contact, hours, menu, prices |
| Bánh mì Dì Oanh (`banh-mi-di-oanh-229-53-bui-dinh-tuy`) | food | 1 | location, contact, menu, prices |

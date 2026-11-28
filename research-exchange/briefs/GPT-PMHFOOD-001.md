# Brief — GPT-PMHFOOD-001 · Phú Mỹ Hưng everyday lunch (Food)

**Assigned to:** ChatGPT Research Team · **Handed over by:** Claude Code, 2026-11-28 (was CC-PMHFOOD-001) · **Status:** planned

## Goal
Real Vietnamese lunch places inside the approved **Phú Mỹ Hưng** polygon (`data/neighbourhoods/neighbourhoods.json` → `phu-my-hung`: lon 106.698–106.732, lat 10.715–10.742), for dishes that have **no venue in the area today** (`docs/food-coverage.json` → `scouting`). Target: up to 10 venues; quality over count.

## Dishes (in priority order)
| Dish id | Name | Venues in HCMC today |
| --- | --- | --- |
| `hu-tieu-my-tho` | Hủ tiếu Mỹ Tho | 2 |
| `pho-bo-ha-noi` | Phở bò Hà Nội (Hanoi-style only — not generic phở) | 2 |
| `banh-mi-sai-gon` | Bánh mì Sài Gòn | 6 |
| `bun-bo-hue` | Bún bò Huế | 10 |
| `bun-cha-ha-noi` | Bún chả Hà Nội | 5 |
| `com-tam-sai-gon` | Cơm tấm Sài Gòn | 7 |
| `mi-quang` | Mì Quảng | 5 |

Quận 7 food venues already in the dataset (do not resubmit): Phở Trang 420 Phạm Thái Bường, Hủ tiếu Tài Anh 494 Nguyễn Thị Thập, Lẩu mắm Bà Du 436 Nguyễn Thị Thập, Bánh đa cua Lão Ngư 105 Đường số 53 — check `research-exchange/exports/` for others.

## Unverified leads (from search snippets only — confirm or drop)
| Lead | What the snippet said | Open question |
| --- | --- | --- |
| Bún Bò Huế O Ơi | B20 Đường 22, KĐT Phú Mỹ Hưng (MoMo); 50–105k on MoMo | Lot address — give the street + lot exactly as signed; price per bowl from the listing |
| Cơm tấm Thuận Kiều (PMH branch) | 284 Nguyễn Lương Bằng, Phú Mỹ; 50–110k; 6:30–21:00 (list article) | Branch still open? Is 284 Nguyễn Lương Bằng inside the polygon? |
| Cơm tấm Ba Ghiền (PMH) | "7 Đặng Văn Ngữ, Phú Mỹ Hưng" | Đặng Văn Ngữ is a Phú Nhuận street — likely wrong; drop unless an official source gives a PMH address |
| Phở Trang | 30K Hoàng Quốc Việt, Phú Mỹ | Hoàng Quốc Việt may be outside the polygon; generic phở ≠ phở bò Hà Nội |
| Bún chả Hà Nội "Phú Mỹ Hưng" | mia.vn list; address possibly from another entry's caption | Needs an independent source with the address |

## Rules (non-negotiable — `research-exchange/README.md`)
- Each venue cites an https source that names **this venue + its address**; each dish cites a source naming **this venue + this exact dish**. Official menu / GrabFood / ShopeeFood / MoMo listing = `menu-confirmed` evidence; a guide article = `source-listed`.
- Prices only from a menu, delivery listing or dated article (VND per item). Omit unknown hours, prices, coordinates — unknown is valid.
- Regional variants stay separate (phở bò Hà Nội ≠ phở Sài Gòn; bún chả Hà Nội ≠ other bún). No photos unless licensed for this exact item at this venue.
- Address: house/lot number + street; `district: "Quận 7"`. Supplied lon/lat need `coordinatePrecision` + `coordinateSource`; otherwise leave blank and intake geocodes.
- No outreach to venues; no membership or partnership claims. Closed or unconfirmed venues: leave out and list them in `method`.

## Deliverable
`research-exchange/inbox/GPT-PMHFOOD-001.json` from `templates/venues-batch.json` (`batchId: "GPT-PMHFOOD-001"`, `agent: "chatgpt"`). Claude Code then runs `npm run intake -- research-exchange/inbox/GPT-PMHFOOD-001.json` (dry run), Codex reviews `reports/GPT-PMHFOOD-001.md`, and only the PO approves the apply to production.

import json,sys
S=sys.argv[1]
h=json.load(open(f'{S}/dl/harvest.json'))
FIX={ # address -> cleaned name (from the source heading) or None = drop
"029 Lô C2 Chung Cư Tân Vĩnh":None,"118 Phan Xích Long":None,"539A/17 Bình Thới":None,"60 A4":None,"165 Cống Quỳnh":None,
"19 Bùi Quang Là":None,"650/4/20B Điện Biên Phủ":None,"129 Nguyễn Hữu Cầu":None,"60C Pasteur":None,
"63/6 Pasteur":"Phở Minh","198C Xóm Chiếu":"Bún riêu Cô Thu","241 Tôn Đản":"Canh bún & bún riêu Cô Bảy","64/19 Nguyễn Khoái":"Bún riêu Chị Gái",
"244 Tôn Đản":"Bún riêu Cô Tuyến","17 Rạch Bùng Binh":"Bún bò Kim Hương","274/29 Võ Văn Tần":"Bún bò Cô Như","135 Bành Văn Trân":"Bún bò Huế Hạnh",
"242 Đề Thám":"Nam Giao Quán","218 Quốc lộ 1K":"Bún bò Huế Giáo Toàn","203 Huỳnh Văn Bánh":"Cơm tấm Sườn Chéo","82 Nguyễn Văn Trỗi":"Cơm tấm Cali",
"55 Phan Đình Phùng":"Cơm tấm Bà Ròm","33/16 Nguyễn Đình Chính":"Cơm Tấm Hẻm 33","26 Trương Quốc Dung":"Cơm Tấm Mây","96 Trần Quang Khải":"Bún Đậu Xoài",
"383 Vĩnh Khánh":"Quán ốc Thảo","351 Nguyễn Thượng Hiền":"Ốc Bắc","538 Nguyễn Thị Minh Khai":"Cơm tấm Phúc Lộc Thọ","132B Cách Mạng Tháng 8":"Cơm tấm Ni Mập",
"138 Nguyễn Trãi":"Bún bò Bàu Sen","68/1 Bông Sao":"Quán Ốc Thảo","160 Dương Bạch Mai":"Quán ốc Bí Bo","177 Phùng Hưng":"Bánh xèo chợ Phùng Hưng",
"200 Cống Quỳnh":"Bún đậu A Chảnh","442B Đoàn Văn Bơ":"Quán Cô Thơ","253 Phan Huy Ích":"Bún đậu mắm tôm Mạc Văn Khoa","448 Thống Nhất":"Bún đậu mắm tôm A Chảnh",
"19B Nguyễn Thị Minh Khai":"Bún riêu Cô Hương Béo","04 Phan Bội Châu":"Bún riêu Gánh chợ Bến Thành","478 Võ Văn Kiệt":"Bún riêu B'lao",
"260 Võ Văn Tần":"Cơm tấm Trần Quý Cáp","783 Kha Vạn Cân":"Cơm tấm Bác Râu","122D Cách Mạng Tháng Tám":"Hủ tiếu Nam Vang Nhân Quán",
}
venues=[];dropped=[]
for v in h:
  if v['address'] in FIX:
    if FIX[v['address']] is None: dropped.append(v['name']+' | '+v['address']); continue
    old=v['name']; v['name']=FIX[v['address']]
    for d in v['dishes']: d['evidence']=d['evidence'].replace(f' lists {old} at',f' lists {v["name"]} at')
  out={k:v[k] for k in ('name','address','district','venueType','sources','dishes')}
  if v.get('openingHours'): out['openingHours']=v['openingHours']
  out['note']=f"Source address: {v['_raw'].strip()}"+(f" · Source hours: {v['_hoursRaw'].strip()}" if v.get('_hoursRaw') else '')
  venues.append(out)
b={"batchId":"CC-FOOD-010","experience":"food","kind":"venues","agent":"claude-code","researchedOn":"2026-11-28",
"method":"Single-source bulk import from mia.vn (robots.txt allows Claude crawlers). HCMC dish listicles were selected from the mia.vn blog sitemap by URL slug (dish keyword + HCMC area), fetched at ≤1 request/1.5 s, and parsed for each venue's heading name, 'Địa chỉ' (house number + street + district) and 'Giờ mở cửa'. A venue is linked only to the dish the article is about; generic dishes mapped to a regional catalogue variant carry 'Regional style not confirmed'. Hours kept only when the source gives one same-day range (overnight ranges omitted, days not stated = daily as written). Prices not imported (the source gives a venue-level range, not a per-dish price). Status: source-listed — not yet verified on site; mia.vn articles may be out of date.",
"venues":venues}
json.dump(b,open('/home/user/K-sExperience/research-exchange/inbox/CC-FOOD-010.json','w'),ensure_ascii=False,indent=2)
print(len(venues),'venues; dropped',len(dropped)); [print(' -',x) for x in dropped]

import re,sys,json
urls=re.findall(r'<loc>([^<]*)</loc>',open(sys.argv[1]).read())
HCM=r'sai-gon|saigon|tphcm|tp-hcm|ho-chi-minh|-hcm-|-hcm$|quan-(1|3|4|5|6|7|8|10|11|12|binh-thanh|phu-nhuan|go-vap|tan-binh|tan-phu|binh-tan|thu-duc)(-|$)|thu-duc'
OTHER=r'ha-noi(?!.*sai-gon)|da-nang|hue(?!.*sai-gon)|nha-trang|da-lat|vung-tau|can-tho|hoi-an|phu-quoc|quy-nhon|ha-long|hai-phong|sapa|binh-duong|dong-nai|tay-ninh|long-an|ben-tre|tien-giang|my-tho|soc-trang|bac-lieu|chau-doc|phan-thiet|buon-ma-thuot'
# (pattern, dishId, styleNote)
M=[(r'bun-bo-hue','bun-bo-hue',False),(r'bun-bo','bun-bo-hue',True),(r'com-tam','com-tam-sai-gon',False),
(r'hu-tieu-nam-vang','hu-tieu-nam-vang',False),(r'hu-tieu-my-tho','hu-tieu-my-tho',False),(r'hu-tieu-sa-dec','hu-tieu-sa-dec',False),
(r'bun-rieu','bun-rieu-cua',False),(r'lau-mam','lau-mam',False),(r'bun-dau-mam-tom|bun-dau','bun-dau-mam-tom',False),
(r'bun-cha-ca','',False),(r'bun-cha','bun-cha-ha-noi',True),(r'mi-quang','mi-quang',False),(r'banh-cuon','banh-cuon-thanh-tri',True),
(r'pho-cuon','pho-cuon',False),(r'pho-kho-gia-lai|pho-kho','pho-kho-gia-lai',False),(r'banh-canh-cua|banh-canh-gio|banh-canh-cha-ca','',False),(r'pho-ha-noi|pho-bac','pho-bo-ha-noi',False),(r'pho-ga','pho-ga-ha-noi',True),(r'pho','pho-sai-gon',True),
(r'banh-mi(?!-que|-hoi-an|-chao|-thit-nuong-hoi)','banh-mi-sai-gon',False),(r'oc','oc-sai-gon',False),
(r'bot-chien','bot-chien',False),(r'che-ba-mau','che-ba-mau',False),(r'banh-xeo','banh-xeo-nam-bo',True),(r'banh-khot','banh-khot-vung-tau',True),
(r'banh-trang-tron','banh-trang-tron',False),(r'bo-bia','bo-bia',False),(r'banh-flan|banh-plan','banh-flan',False),(r'sam-bo-luong|sam-bo-chinh','sam-bo-luong',False),
(r'banh-can','banh-can',False),(r'banh-beo','banh-beo-hue',True),(r'nem-nuong','nem-nuong-ninh-hoa',True),(r'banh-da-cua','banh-da-cua-hai-phong',False),
(r'com-ga-hoi-an|com-ga-tam-ky','com-ga-hoi-an',False),(r'com-hen','com-hen',False),(r'bun-mam','',False),(r'bun-nuoc-leo','bun-nuoc-leo-soc-trang',False),
(r'banh-trang-nuong','banh-trang-nuong-da-lat',True),(r'bun-thang','bun-thang',False),(r'xoi-xeo','xoi-xeo',False),(r'cao-lau','cao-lau-hoi-an',False),
(r'banh-tam-bi','banh-tam-bi-bac-lieu',True),(r'banh-canh-ghe','banh-canh-ghe-vung-tau',True),(r'banh-canh-trang-bang','banh-canh-trang-bang',False),
(r'cha-ca-la-vong|cha-ca-ha-noi','cha-ca-la-vong',False),(r'banh-bot-loc','banh-bot-loc-hue',True),(r'bun-do','bun-do-buon-ma-thuot',False),
(r'bun-sua','bun-sua-nha-trang',False),(r'banh-khoai','banh-khoai',False),(r'bun-ca-chau-doc','bun-ca-chau-doc',False),(r'canh-chua','canh-chua-ca-loc',True),
(r'banh-chuoi-nuong','banh-chuoi-nuong',False),(r'banh-pia','banh-pia-soc-trang',True),(r'thit-de|lau-de','',False)]
out=[]
for u in urls:
  s=u.rsplit('/',1)[1]
  if not re.search(HCM,s): continue
  if re.search(OTHER,s) and not re.search(r'sai-gon|tphcm|ho-chi-minh|quan-\d',s): continue
  if re.search(r'pho-nhat|pho-long-den|bo-nuong-pho|pho-chao|xiu-mai|muoi-ot|nha-xe|xe-khach|limousine|di-chuyen|tour|khach-san|homestay|resort|cafe|ca-phe|bar|rooftop|chua-|bao-tang|cho-',s): continue
  s2=re.sub(r'thanh-pho|duong-pho|pho-di-bo|pho-dem|pho-tay|pho-co|pho-bien|pho-am-thuc|khu-pho','x',s)
  for p,d,sn in M:
    if re.search(r'(?:^|-)(?:'+p+r')(?=-|$)',s2):
      if d: out.append({'url':u,'dishId':d,'styleNote':sn})
      break
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
import collections;print(len(out),collections.Counter(o['dishId'] for o in out).most_common())

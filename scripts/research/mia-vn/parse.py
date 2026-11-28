import re,sys,json,html,os,unicodedata
S=sys.argv[1]
sel=json.load(open(f'{S}/dl/selected.json'))
D=[(r'qu[ậa]n\s*1\b|\bq\.?\s*1\b(?!\d)','Quận 1'),(r'qu[ậa]n\s*3\b|\bq\.?\s*3\b(?!\d)','Quận 3'),(r'qu[ậa]n\s*4\b|\bq\.?\s*4\b(?!\d)','Quận 4'),
(r'qu[ậa]n\s*5\b|\bq\.?\s*5\b(?!\d)','Quận 5'),(r'qu[ậa]n\s*6\b|\bq\.?\s*6\b(?!\d)','Quận 6'),(r'qu[ậa]n\s*7\b|\bq\.?\s*7\b(?!\d)','Quận 7'),
(r'qu[ậa]n\s*8\b|\bq\.?\s*8\b(?!\d)','Quận 8'),(r'qu[ậa]n\s*10\b|\bq\.?\s*10\b','Quận 10'),(r'qu[ậa]n\s*11\b|\bq\.?\s*11\b','Quận 11'),
(r'qu[ậa]n\s*12\b|\bq\.?\s*12\b','Quận 12'),(r'qu[ậa]n\s*[29]\b|\bq\.?\s*[29]\b(?!\d)|thủ đức','Thủ Đức'),(r'bình thạnh','Bình Thạnh'),(r'phú nhuận','Phú Nhuận'),
(r'tân bình','Tân Bình'),(r'tân phú','Tân Phú'),(r'gò vấp','Gò Vấp'),(r'bình tân','Bình Tân'),(r'nhà bè','Nhà Bè'),(r'bình chánh','Bình Chánh')]
def txt(x): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',x))).strip()
def district(rest):
  r=unicodedata.normalize('NFC',rest.lower())
  for p,d in D:
    if re.search(p,r): return d
def hours(h):
  h=h.strip().rstrip('.').lower()
  def ap(m):
    hh,mm,p=int(m[1]),m[2],m[3]
    hh=(hh%12)+(12 if p=='pm' else 0); return f'{hh}:{mm}'
  h=re.sub(r'(\d{1,2}):(\d{2})\s*(am|pm)',ap,h)
  m=re.fullmatch(r'(\d{1,2})\s*(?:h|:|giờ)\s*(\d{2})?\s*(?:sáng|trưa|chiều|tối)?\s*[-–đến]+\s*(\d{1,2})\s*(?:h|:|giờ)\s*(\d{2})?\s*(?:sáng|trưa|chiều|tối)?(?:\s*(?:hằng ngày|hàng ngày|mỗi ngày|các ngày trong tuần))?',h)
  if not m: return None
  a,b,c,d=int(m[1]),int(m[2] or 0),int(m[3]),int(m[4] or 0)
  if a>23 or c>24 or b>59 or d>59: return None
  if c>=24 or (c*60+d)<=(a*60+b): return None # overnight / past midnight: not representable, omit
  r=[[f'{a:02d}:{b:02d}',f'{c:02d}:{d:02d}']]
  return {k:r for k in ['mon','tue','wed','thu','fri','sat','sun']}
out=[];stats={'pages':0,'addr':0,'kept':0,'nohouse':0,'nodistrict':0}
for s in sel:
  f=f"{S}/dl/pages/{s['url'].rsplit('/',1)[1]}.html"
  if not os.path.exists(f): continue
  t=open(f,encoding='utf8',errors='ignore').read(); stats['pages']+=1
  m=re.search(r'<article.*?</article>',t,re.S); body=m.group(0) if m else t
  tm=re.search(r'<h1[^>]*>(.*?)</h1>',t,re.S) or re.search(r'<title>(.*?)</title>',t,re.S); title=txt(tm[1]) if tm else s['url']
  lm=re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})',t); pub=lm[1] if lm else None
  name=None; cur=None
  for tag,inner in re.findall(r'<(h2|h3|p|li)[^>]*>(.*?)</\1>',body,re.S):
    x=txt(inner)
    if tag in('h2','h3'):
      n=re.sub(r'^[\W_]*\d{1,2}(?:\.\d{1,2})*(?:[\s\.\):\-]+|(?=[^\d\W]))','',x); n=re.split(r'\s[-–:|]\s|:\s|,\s',n)[0].strip()
      n=re.sub(r'^.*?\b(?:ở|tại) (?=quán |tiệm )','',n,flags=re.I)
      n=re.split(r'\s(?:với|giá|ngon nhất|ngon|đậm|địa chỉ|nổi tiếng|chuẩn vị|siêu|hơn \d|since|có|thơm|độc|bình dân|quen thuộc|hút khách|lâu đời|đông khách)\s|\s\(',n,flags=re.I)[0].strip(' "“”-–')
      generic=re.fullmatch(r'(?:quán |tiệm |hàng )?(?:bún bò huế|bún bò|bún đậu|bún đậu mắm tôm|phở|cơm tấm|bánh mì|ốc|bún riêu|bánh xèo|bún chả)',n.lower()) or re.search(r'ở sài gòn|sài gòn$',n.lower()) and len(n.split())<5
      name=n if 2<len(n)<60 and not generic else None; cur=None; continue
    if not name: continue
    ma=re.match(r'^(?:Địa chỉ|Địa điểm|Address)[^:]{0,25}:\s*(.+)$',x,re.I)
    if ma:
      stats['addr']+=1
      parts=re.split(r'\s*(?:;|\||\s+và\s+|\s+-\s+(?=\d)|\(?cơ sở \d+\)?:?)\s*',ma[1],flags=re.I)
      cur=[]
      for p in parts:
        p=p.strip(' .;')
        if not re.match(r'^(?:số\s*)?\d+[A-Za-z]?(?:[/\-]\d+[A-Za-z]?)*(?:\s*bis)?\s+\S',p,re.I): stats['nohouse']+=1; continue
        p=re.sub(r'^số\s*','',p,flags=re.I)
        seg=[q.strip() for q in p.split(',')]
        dist=district(','.join(seg[1:])) or district(seg[0])
        if not dist: stats['nodistrict']+=1; continue
        street=re.sub(r'\s*\b(Quận|Q\.)\s*\d+.*$','',seg[0]).strip()
        street=re.sub(r'^(\S+)\s+(?:đường|Đường)\s+(?!số|\d)',r'\1 ',street)
        street=re.sub(r'^(\S+)\s+(?:đường|Đường)\s+số\s+(\d+)',r'\1 Đường số \2',street,flags=re.I)
        street=re.sub(r'^(\S+)\s+(?:đường|Đường)\s+(\d+)\b',r'\1 Đường \2',street)
        v={'name':name,'address':street,'district':dist,'venueType':'eatery','sources':[s['url']],'dishes':[{'dishId':s['dishId'],'evidence':f"mia.vn guide “{title}”{' ('+pub+')' if pub else ''} lists {name} at {ma[1].strip()} for this dish.{' Regional style not confirmed.' if s['styleNote'] else ''}",'url':s['url']}],'_style':s['styleNote'],'_raw':ma[1]}
        out.append(v); cur.append(v)
      continue
    mh=re.match(r'^(?:Giờ mở cửa|Thời gian mở cửa|Giờ hoạt động|Thời gian hoạt động)\s*:\s*(.+)$',x,re.I)
    if mh and cur:
      oh=hours(mh[1])
      for v in cur:
        v['_hoursRaw']=mh[1]
        if oh: v['openingHours']=oh
# dedupe within harvest: same address+district -> merge dishes/sources
seen={};alias={}
for v in out:
  st=re.sub(r'^\S+\s+','',v['address']).lower()
  k=(v['address'].lower(),v['district']) if (v['name'].lower(),st,v['district']) not in alias else alias[(v['name'].lower(),st,v['district'])]
  alias.setdefault((v['name'].lower(),st,v['district']),k)
  if k in seen:
    e=seen[k]; e['dishes']+= [d for d in v['dishes'] if d['dishId'] not in {x['dishId'] for x in e['dishes']}]; e['sources']=list(dict.fromkeys(e['sources']+v['sources']))
  else: seen[k]=v
res=list(seen.values()); stats['kept']=len(res)
json.dump(res,open(f'{S}/dl/harvest.json','w'),ensure_ascii=False,indent=1)
print(stats)

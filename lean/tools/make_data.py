#!/usr/bin/env python3
"""RAW SUMMARY (Google Sheet values JSON) + budget.json  ->  lean/data/data.json
usage: make_data.py <get_values.json> [out.json]"""
import json,re,sys,datetime,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
src=json.load(open(sys.argv[1]));v=src['values'] if isinstance(src,dict) else src
out=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'data/data.json'
MON={m:i+1 for i,m in enumerate('January February March April May June July August September October November December'.split())}
hdr=v[2];allc=[]
for i,x in enumerate(hdr):
    m=re.match(r'^(\d+) (\w+)$',(x or '').strip())
    if i>=10 and m and m.group(2) in MON:allc.append((i,int(m.group(1)),MON[m.group(2)]))
# the sheet holds two year blocks side by side (prior year first, current year last); current = last block, starts at '1 January'
st=max(j for j,(i,d,mo) in enumerate(allc) if d==1 and mo==1)
cols=[(i,datetime.date(2026,mo,d)) for i,d,mo in allc[st:]]
# prior-year block (2025): first col is '31 December' of 2024 -> dropped
c25=[(i,datetime.date(2025,mo,d)) for i,d,mo in allc[1:st]]
assert len(c25)==365,len(c25)
num=lambda s:(None if s in(None,'') else (lambda t:float(t) if re.match(r'^-?\d+(\.\d+)?$',t) else None)(s.replace(',','').strip()))
S={}
for r in v[3:]:
    if len(r)<8 or not re.match(r'^\d+-',r[4] or ''):continue
    k=int(r[4].split('-')[0]);rg=(r[3] or '').replace('REGION ','R')
    if k in S and S[k]['r']=='NA' and rg.startswith('R') and len(rg)<4:S[k]['r']=rg
    s=S.setdefault(k,{'k':k,'n':r[4].split('-',1)[1].title(),'r':(lambda x:x if x.startswith('R') and len(x)<4 else 'NA')((r[3] or '').replace('REGION ','R')),'rows':[]})
    s['rows'].append([num(r[i]) if i<len(r) else None for i,_ in cols])
    s.setdefault('rows25',[]).append([num(r[i]) if i<len(r) else None for i,_ in c25])
B=json.load(open(ROOT.parent/'src/data/budget.json'));OV={'70':29361,'71':56985,'72':31967}
RFIX={7:'R1',17:'R4',27:'R5'}  # region is #N/A in the sheet for these multi-floor sites
ZO={50,34,69,7,51,39,37}
sites=[]
for k,s in sorted(S.items()):
    n=len(cols);vals=[]
    for j in range(n):
        xs=[row[j] for row in s['rows']]
        vals.append(None if any(x is None or x<0 for x in xs) else round(sum(xs),1))
    vals=[None if x==0 else x for x in vals]   # 0 kWh = not filled in yet
    # outlier guard: a daily value above 6x the site's median is a meter/typing error -> treated as missing
    nz=sorted(x for x in vals if x)
    med=nz[len(nz)//2] if nz else 0
    if med>=100:
        vals=[None if (x is not None and x>6*med) else x for x in vals]
    # 2025: same cleaning rules, then monthly estimate = avg of days with a reading x days in month (needs >=15 days)
    v25=[]
    for j in range(len(c25)):
        xs=[row[j] for row in s['rows25']]
        v25.append(None if any(x is None or x<0 for x in xs) else round(sum(xs),1))
    v25=[None if x==0 else x for x in v25]
    nz5=sorted(x for x in v25 if x);md5=nz5[len(nz5)//2] if nz5 else 0
    if md5>=100:v25=[None if (x is not None and x>6*md5) else x for x in v25]
    m25=[]
    for mo in range(1,13):
        xs=[x for (i,d),x in zip(c25,v25) if d.month==mo and x]
        dim=(datetime.date(2025+(mo==12),mo%12+1,1)-datetime.date(2025,mo,1)).days
        m25.append(round(sum(xs)/len(xs)*dim) if len(xs)>=15 else None)
    b=B.get(str(k));proxy=False
    if b:bm=b['m']
    elif str(k) in OV:bm=[OV[str(k)]]*12;proxy=True
    else:bm=None
    sites.append({'k':k,'n':s['n'],'r':RFIX.get(k,s['r']),'z':k in ZO,'v':vals,'b':bm,'bp':proxy,'m25':m25})
asof=cols[-1][1]
# last date with real data (>=1 site)
last=max(j for j in range(len(cols)) if sum(1 for x in sites if x['v'][j])>=len(sites)*.5)
json.dump({'dates':[d.isoformat() for _,d in cols[:last+1]],'sites':[dict(x,v=x['v'][:last+1]) for x in sites]},open(out,'w'),separators=(',',':'))
print(out,len(sites),'sites',cols[0][1],cols[last][1])

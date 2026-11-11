#!/usr/bin/env python3
"""Daily session files (Drive folder, one YYYYMMDD.xlsx per day, Flexmonster pivot export)
 -> lean/data/sessions.json  {dates:[..], v:{cinema:[shows..]}, a:{cinema:[admits..]}}
usage: make_sessions.py <dir-with-xlsx>   (files named YYYYMMDD.xlsx)  |  --from-dl <tool-result .txt files...>"""
import sys,json,base64,glob,os,io,re,datetime,pathlib,collections
import openpyxl
R=pathlib.Path(__file__).resolve().parents[1];OUT=R/'data/sessions.json'
def pick(wb,ds):
    # choose the sheet whose first data row is the file's own date (some files carry extra/combined sheets)
    for ws in wb.worksheets:
        if not ws.title.startswith('Flexmonster'):continue
        rows=ws.iter_rows(min_row=2,max_row=2,values_only=True)
        for r in rows:
            if r and str(r[0])[:10]==ds:return ws
    return wb.active
def parse(fobj,ds=None):
    wb=openpyxl.load_workbook(fobj,read_only=True,data_only=True)
    ws=pick(wb,ds) if ds else wb.active
    agg=collections.OrderedDict();c=None
    for r in list(ws.iter_rows(values_only=True))[1:]:
        y,cs,sc,st,hm,ad,ns=(list(r)+[None]*7)[:7]
        if cs:c=cs
        if cs=='Grand Total' or y=='Grand Total':continue
        if not isinstance(ns,(int,float)) or (st in(None,'') and hm in(None,'')) or not c:continue
        k=int(str(c).split('-')[0]);a=agg.setdefault(k,[0,0]);a[0]+=ns;a[1]+=ad or 0
    return agg
def load():
    return json.load(open(OUT)) if OUT.exists() else {'days':{}}
def save(d):
    days=sorted(d['days']);ks=sorted({int(k) for v in d['days'].values() for k in v})
    out={'dates':days,'v':{},'a':{}}
    for k in ks:
        out['v'][str(k)]=[d['days'][x].get(str(k),[None,None])[0] for x in days]
        out['a'][str(k)]=[d['days'][x].get(str(k),[None,None])[1] for x in days]
    json.dump(out,open(OUT,'w'),separators=(',',':'))
    json.dump(d,open(R/'data/.sessions_cache.json','w'),separators=(',',':'))
    print(len(days),'days',days[0],days[-1],len(ks),'cinemas')
if __name__=='__main__':
    cache=R/'data/.sessions_cache.json'
    d=json.load(open(cache)) if cache.exists() else {'days':{}}
    if sys.argv[1]=='--from-dl':
        for p in sys.argv[2:]:
            t=open(p).read()
            try:j=json.loads(t[t.index('{'):])
            except Exception:continue
            m=re.match(r'(\d{8})\.xlsx',j.get('title',''))
            if not m:continue
            ds=datetime.datetime.strptime(m.group(1),'%Y%m%d').strftime('%Y-%m-%d')
            agg=parse(io.BytesIO(base64.b64decode(j['content'])),ds)
            d['days'][ds]={str(k):v for k,v in agg.items()}
    else:
        for p in sorted(glob.glob(sys.argv[1]+'/*.xlsx')):
            m=re.match(r'(\d{8})\.xlsx',os.path.basename(p))
            if m:d['days'][datetime.datetime.strptime(m.group(1),'%Y%m%d').strftime('%Y-%m-%d')]={str(k):v for k,v in parse(p,datetime.datetime.strptime(m.group(1),'%Y%m%d').strftime('%Y-%m-%d')).items()}
    save(d)

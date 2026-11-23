#!/usr/bin/env python3
"""Daily session files (YYYYMMDD.xlsx, Flexmonster export) -> lean/data/ops.json
Per cinema per day: shows, admits, zero-admit shows, first/last show minute-of-day (+admits in them), screens used.
usage: make_ops.py <dir-with-xlsx>   (merges into existing ops.json)"""
import sys,json,glob,os,re,datetime,pathlib,collections
import openpyxl
R=pathlib.Path(__file__).resolve().parents[1];OUT=R/'data/ops.json'
def mins(hm):
    try:h,m=str(hm).split(':');return int(h)*60+int(m)
    except Exception:return None
def parse(path,ds):
    wb=openpyxl.load_workbook(path,read_only=True,data_only=True)
    ws=wb.active
    for w in wb.worksheets:
        if w.title.startswith('Flexmonster'):
            r=next(w.iter_rows(min_row=2,max_row=2,values_only=True),None)
            if r and str(r[0])[:10]==ds:ws=w;break
    rows=list(ws.iter_rows(values_only=True));nob=bool(rows) and str(rows[0][0]).strip()=='CinemaSite'
    c=scr=None;agg={}
    for r in rows[1:]:
        r=([None]+list(r)) if nob else r
        y,cs,sc,st,hm,ad,ns,seats=(list(r)+[None]*8)[:8]
        if cs:c=cs
        if sc not in(None,''):scr=sc
        if cs=='Grand Total' or y=='Grand Total':continue
        if not isinstance(ns,(int,float)) or not c:continue
        t=mins(hm)
        if t is None:continue
        k=int(str(c).split('-')[0]);a=agg.setdefault(k,[])
        a.append((t,ad or 0,ns,seats or 0,scr))
    out={}
    for k,L in agg.items():
        sh=sum(x[2] for x in L);ad=sum(x[1] for x in L)
        z=sum(x[2] for x in L if x[1]==0)
        f=min(L,key=lambda x:x[0]);l=max(L,key=lambda x:x[0])
        zh=collections.Counter(x[0]//60 for x in L for _ in range(int(x[2])) if x[1]==0)
        out[str(k)]=[sh,ad,z,f[0],f[1],l[0],l[1],len({x[4] for x in L}),dict(zh)]
    return out
if __name__=='__main__':
    d=json.load(open(OUT)) if OUT.exists() else {'days':{}}
    for p in sorted(glob.glob(sys.argv[1]+'/*.xlsx')):
        m=re.match(r'(\d{4})(\d\d)(\d\d)\.xlsx',os.path.basename(p))
        if m:ds='-'.join(m.groups());d['days'][ds]=parse(p,ds)
    d['cols']=['shows','admits','zero','first','firstAd','last','lastAd','screens','zeroByHour']
    json.dump(d,open(OUT,'w'),separators=(',',':'));print(len(d['days']),'days',min(d['days']),max(d['days']),OUT.stat().st_size)

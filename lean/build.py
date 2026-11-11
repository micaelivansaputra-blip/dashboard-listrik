#!/usr/bin/env python3
"""lean/src/template.html + lean/data/data.json -> single-file page. usage: build.py [out.html]"""
import json,pathlib,sys,datetime
R=pathlib.Path(__file__).parent
d=json.load(open(R/'data/data.json'));d.setdefault('generated',datetime.date.today().strftime('%-d %b %Y'))
sp=R/'data/shows.json'
if sp.exists():d['shows']=json.load(open(sp))
ip=R/'data/invoice.json'
if ip.exists():d['invoice']=json.load(open(ip))
gp=R/'data/geo.json'
if gp.exists():d['geo']=json.load(open(gp))
for nm in('sessions','budget'):
    q=R/f'data/{nm}.json'
    if q.exists():d[nm]=json.load(open(q))
html=(R/'src/template.html').read_text().replace('/*DATA*/',json.dumps(d,separators=(',',':')))
out=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else R/'out.html'
out.write_text(html);print(out,len(html)//1024,'KB')

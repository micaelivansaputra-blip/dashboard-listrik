#!/usr/bin/env python3
"""Number_of_Show_Monthly_Per_Cinema.xlsx -> lean/data/shows.json  usage: make_shows.py <xlsx>"""
import openpyxl,json,sys,pathlib
R=pathlib.Path(__file__).resolve().parents[1]
ws=openpyxl.load_workbook(sys.argv[1],data_only=True).active
rows=list(ws.iter_rows(min_row=2,values_only=True))
hdr=[x for x in rows[0][2:] if x];out={'months':hdr,'v':{}}
for r in rows[1:]:
    n=r[1]
    if not n or not str(n)[0].isdigit():continue
    out['v'][str(int(str(n).split('-')[0]))]=[x if isinstance(x,(int,float)) else None for x in r[2:2+len(hdr)]]
json.dump(out,open(R/'data/shows.json','w'),separators=(',',':'));print(len(out['v']),'cinemas',hdr[0],hdr[-1])

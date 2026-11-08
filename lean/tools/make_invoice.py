#!/usr/bin/env python3
"""Actual_Invoice_Electricity_*.xlsx (sheet RAW) -> lean/data/invoice.json
Monthly kWh per cinema = sum of the 'KwH usage' column of every invoice line (same as the file's PIVOT).
usage: make_invoice.py <xlsx> [out.json]"""
import openpyxl,json,sys,pathlib,collections,warnings
warnings.filterwarnings('ignore')
ROOT=pathlib.Path(__file__).resolve().parents[1]
out=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else ROOT/'data/invoice.json'
MO='January February March April May June July August September October November December'.split()
ws=openpyxl.load_workbook(sys.argv[1],data_only=True,read_only=True)['RAW']
a=collections.defaultdict(float);seen=set()
for r in ws.iter_rows(min_row=3,values_only=True):
    if not r[1] or r[3] not in(2025,2026) or r[2] not in MO or not isinstance(r[11],(int,float)):continue
    k=int(str(r[1]).split('-')[0]);a[(k,r[3],MO.index(r[2])+1)]+=r[11];seen.add((r[3],MO.index(r[2])+1))
months=sorted(seen);ks=sorted({k for k,_,_ in a})
v={str(k):[round(a[(k,y,m)]) if (k,y,m) in a else None for y,m in months] for k in ks}
json.dump({'months':[f'{y}-{m:02d}' for y,m in months],'v':v},open(out,'w'),separators=(',',':'))
print(out,len(ks),'sites',months[0],months[-1])

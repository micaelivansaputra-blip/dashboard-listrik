"""Build src/data/evaloct.json (October evaluation: why over budget, which sites rose most) from ACTUAL INVOICE kWh.
Inputs: tools/oct_invoice.json (Sep and Oct 2026 invoice kWh per site, from Actual_Invoice_Electricity_Oct.xlsx PIVOT),
        a rows file with name / region / budget per site (fc4_rows.json), Oct-2025 invoice kWh (oct25.json), src/data/budget.json.
usage: python3 tools/make_evaloct.py <fc4_rows.json> <oct25.json>"""
import json, sys
base = json.load(open(sys.argv[1])); ly = json.load(open(sys.argv[2]))
inv = json.load(open('tools/oct_invoice.json')); B = json.load(open('src/data/budget.json'))
NOTE = {'39': 'The invoice shows 52,900 kWh for August, September and October, so this looks like an estimate, not a reading.'}
rows = []
for x in base:
    k = str(x['k']); b = B.get(k); i = inv[k]
    r = dict(k=x['k'], n=x['name'], r=x['region'], bud=x['bud'], fc=round(i['oct']), conf='Estimated' if k in NOTE else 'Invoice',
             note=NOTE.get(k, ''), sep=round(i['sep']), sepb=b['m'][8] if b else None, ly=round(ly[k]) if k in ly else None)
    r['gap'] = r['fc'] - r['bud']; r['gp'] = r['gap'] / r['bud'] if r['bud'] else None
    if r['sep'] and r['sepb']:
        r['carried'] = r['sep'] - r['sepb']; r['usage'] = r['fc'] - r['sep']; r['cut'] = r['sepb'] - r['bud']; r['sp'] = r['usage'] / r['sep']
    if r['ly']:
        r['vly'] = r['fc'] - r['ly']; r['bly'] = r['bud'] - r['ly']
    rows.append(r)
json.dump(dict(asof='2026-10-31', rows=rows), open('src/data/evaloct.json', 'w'), separators=(',', ':'))
S = lambda key, rs: sum(r[key] for r in rs)
print('all', len(rows), S('bud', rows), S('fc', rows), S('gap', rows))
dec = [r for r in rows if 'carried' in r]; ov = [r for r in dec if r['gp'] > .05]
print('decomp', len(dec), S('gap', dec), S('carried', dec), S('usage', dec), S('cut', dec))
print('over', len(ov), S('gap', ov), S('carried', ov), S('usage', ov), S('cut', ov))
l = [r for r in rows if r['ly']]; print('LY', len(l), S('ly', l), S('bud', l), S('fc', l))

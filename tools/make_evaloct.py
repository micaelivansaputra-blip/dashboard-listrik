"""Build src/data/evaloct.json (October evaluation: why over budget, which sites rose most).
Inputs: forecast rows (fc3_rows.json), Oct-2025 invoice kWh (oct25.json), src/data/budget.json.
usage: python3 tools/make_evaloct.py <fc3_rows.json> <oct25.json>"""
import json, sys
fc = json.load(open(sys.argv[1])); ly = json.load(open(sys.argv[2]))
B = json.load(open('src/data/budget.json'))
rows = []
for x in fc:
    k = str(x['k']); b = B.get(k)
    fcast = round((x['act'] or 0) + x.get('f28', 0) + x.get('frest', 0))
    sepb = b['m'][8] if b else None
    sep = x.get('inv_sep')
    r = dict(k=x['k'], n=x['name'], r=x['region'], bud=x['bud'], fc=fcast, conf=x['conf'], note=x.get('note', ''),
             sep=round(sep) if sep else None, sepb=sepb, ly=round(ly[k]) if k in ly else None)
    r['gap'] = r['fc'] - r['bud']
    r['gp'] = r['gap'] / r['bud'] if r['bud'] else None
    if r['sep'] and r['sepb']:
        r['carried'] = r['sep'] - r['sepb']          # Sep overshoot carried into Oct
        r['usage'] = r['fc'] - r['sep']              # Oct usage vs Sep usage
        r['cut'] = r['sepb'] - r['bud']              # budget lowered Sep -> Oct
        r['sp'] = r['usage'] / r['sep']
    if r['ly']:
        r['vly'] = r['fc'] - r['ly']; r['bly'] = r['bud'] - r['ly']
    rows.append(r)
json.dump(dict(asof='2026-10-28', rows=rows), open('src/data/evaloct.json', 'w'), separators=(',', ':'))
tot = lambda key, rs: sum(r[key] for r in rs)
print('all', len(rows), tot('bud', rows), tot('fc', rows), tot('gap', rows))
dec = [r for r in rows if 'carried' in r]
print('decomp sites', len(dec), tot('gap', dec), tot('carried', dec), tot('usage', dec), tot('cut', dec))
ov = [r for r in dec if r['gp'] > .05]
print('over', len(ov), tot('gap', ov), tot('carried', ov), tot('usage', ov), tot('cut', ov))
ly_ = [r for r in rows if r['ly']]
print('LY', len(ly_), tot('ly', ly_), tot('bud', ly_), tot('fc', ly_))
for r in sorted(rows, key=lambda r: -r['gap'])[:12]: print(r['n'], r['gap'], r.get('carried'), r.get('usage'), r.get('cut'), r.get('vly'), r['conf'])

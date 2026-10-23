/* Electricity data engine: reads the "Daily Electricity Usage" workbook and returns the dashboard dataset.
   Port of the validated Python pipeline (clean -> to_daily -> smooth -> per-site panel -> quality filter). */
(function (root) {
  const DAY = 86400000;
  const isoDay = s => Math.round(Date.parse(s + 'T00:00:00Z') / DAY);
  const iso = d => new Date(d * DAY).toISOString().slice(0, 10);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  function rollMed(v, win, minp) {
    const h = (win - 1) / 2, out = new Array(v.length);
    for (let i = 0; i < v.length; i++) {
      const w = []; for (let j = Math.max(0, i - h); j <= Math.min(v.length - 1, i + h); j++) if (!Number.isNaN(v[j])) w.push(v[j]);
      out[i] = w.length >= minp ? median(w) : NaN;
    }
    return out;
  }
  const std1 = a => { const m = mean(a); return Math.sqrt(a.reduce((t, x) => t + (x - m) ** 2, 0) / (a.length - 1)); };

  function clean(days, vals) {
    let d = [], v = [];
    for (let i = 0; i < vals.length; i++) if (i === 0 || vals[i] !== vals[i - 1]) { d.push(days[i]); v.push(vals[i]); }
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < v.length; i++) {
        const prev = i > 0 ? v[i - 1] : null, nxt = i < v.length - 1 ? v[i + 1] : null;
        const low = prev !== null && v[i] < prev && (nxt === null || nxt >= prev);
        const high = nxt !== null && v[i] > nxt && (prev === null || prev <= nxt);
        if (low || high) { d.splice(i, 1); v.splice(i, 1); changed = true; break; }
      }
    }
    return { d, v };
  }
  function toDaily(d, v, ct) {
    const vals = []; let start = null;
    for (let i = 1; i < d.length; i++) {
      const n = d[i] - d[i - 1], per = (v[i] - v[i - 1]) / n * ct;
      for (let k = 1; k <= n; k++) vals.push(per);
    }
    return { start: d[0] + 1, vals };
  }
  function smooth(vals) {
    const n = vals.length, v = vals.slice(), med = rollMed(vals, 21, 7);
    const lab = vals.map((x, i) => (x < 0 || x < 0.25 * med[i]) ? 'L' : (x > 2.5 * med[i] ? 'H' : 'N'));
    let i = 0;
    while (i < n) {
      if (lab[i] === 'L') {
        let j = i; while (j + 1 < n && lab[j + 1] === 'L') j++;
        let end = Math.min(j + 1, n - 1);
        for (let k = j + 1; k < Math.min(j + 6, n); k++) if (lab[k] === 'H') { end = k; break; }
        let start = i;
        for (const k of [i - 1, i - 2]) if (k >= 0 && lab[k] === 'H') start = k;
        const m = mean(v.slice(start, end + 1));
        for (let k = start; k <= end; k++) v[k] = m;
        i = end + 1;
      } else i++;
    }
    return v;
  }
  function repair(x) {
    const v = x.slice(), n = v.length, med = rollMed(x, 21, 7); let fixed = 0;
    for (let it = 0; it < 50; it++) {
      let bad = -1;
      for (let i = 0; i < n; i++) if (v[i] <= 0 || v[i] < 0.2 * med[i] || v[i] > 3 * med[i]) { bad = i; break; }
      if (bad < 0) break;
      const a = Math.max(0, bad - 3), b = Math.min(n, bad + 4), m = mean(v.slice(a, b));
      for (let k = a; k < b; k++) v[k] = m;
      fixed++;
    }
    return { v, fixed };
  }

  function buildDataset(XLSX, buf, o) {
    o = Object.assign({
      readType: 'array', fileName: '',
      sunEnd: '2026-09-26',
      manualExclude: { '49-LIVING WORLD PEKANBARU': 'meter readings look estimated (constant daily increase, then a drop)' },
      zxSites: ['51-LIPPO PLAZA SUNSET', '37-MALL PHINISI POINT'],
      program: ['50-MAL BOTANIA 2', '34-PACIFIC MALL TEGAL', '69-SENAYAN PARK', '39-LIPPO ICON CIBUBUR'],
      lastOverride: null, minCoverage: 0.8
    }, o || {});
    const SH26 = { WBP: ['Mar-Des26 WBP'], LWBP: ['Mar-Des26 LWBP'] };
    const SH25 = { WBP: ['Jul25 WBP', 'Aug25 WBP', 'Sep25 WBP', 'Okt25 WBP'], LWBP: ['Jul25 LWBP', 'Aug25 LWBP', 'Sep25 LWBP', 'Okt25 LWBP'] };
    const NEED = ['RAW SUMMARY', ...Object.values(SH26).flat(), ...Object.values(SH25).flat(), 'By Weekly'];
    const wb = XLSX.read(buf, { type: o.readType, sheets: NEED, cellFormula: false, cellStyles: false, cellHTML: false });
    const need = n => { if (!wb.Sheets[n]) throw new Error('Sheet "' + n + '" was not found in the file.'); return wb.Sheets[n]; };
    const cell = (ws, r, c) => ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
    const tofloat = c => {
      if (!c) return NaN;
      if (c.t === 'n') return Number.isFinite(c.v) ? c.v : NaN;
      if (c.t === 's') { const x = parseFloat(String(c.v).replace(/,/g, '')); return /^\s*-?[\d,]*\.?\d+(e[+-]?\d+)?\s*$/i.test(c.v) ? x : NaN; }
      return NaN;
    };
    const str = c => (c && c.v != null) ? String(c.v).trim() : 'None';
    const dims = ws => { const r = XLSX.utils.decode_range(ws['!ref']); return { R: r.e.r + 1, C: r.e.c + 1 }; };
    const hdrDay = (ws, c) => { const x = cell(ws, 3, c); return (x && x.t === 'n' && x.v > 40000 && x.v < 60000) ? Math.floor(x.v) - 25569 : null; };

    // CT table
    const RS = need('RAW SUMMARY'), CT = new Map();
    for (let r = 4; r <= dims(RS).R; r++) {
      const typ = (cell(RS, r, 7) || {}).v;
      if (typ === 'WBP' || typ === 'LWBP') {
        const c8 = cell(RS, r, 8);
        CT.set(str(cell(RS, r, 5)) + '||' + typ, { ct: c8 && c8.t === 'n' ? c8.v : null, site: str(cell(RS, r, 6)) });
      }
    }
    const SITES = [...new Set([...CT.values()].map(x => x.site))].sort();
    const REGION = new Map();
    function sheetRows(ws) {
      const seen = new Map(), out = [], D = dims(ws);
      for (let r = 4; r <= D.R; r++) {
        const v = cell(ws, r, 3), rg = cell(ws, r, 2);
        if (v && v.t === 's' && v.v.trim() && rg && rg.t === 's' && String(rg.v).startsWith('Region')) {
          const n = v.v.trim(); seen.set(n, (seen.get(n) || 0) + 1);
          out.push({ r, n, occ: seen.get(n), rg: String(rg.v).trim() });
        }
      }
      return out;
    }
    // choose the last complete day from the 2026 sheets
    const counts = new Map();
    for (const typ of ['WBP', 'LWBP']) {
      const ws = need(SH26[typ][0]), D = dims(ws), rows = sheetRows(ws).filter(x => x.occ === 1);
      for (let c = 5; c <= D.C; c++) {
        const d = hdrDay(ws, c); if (d == null) continue;
        let k = 0; for (const x of rows) if (Number.isFinite(tofloat(cell(ws, x.r, c)))) k++;
        counts.set(d, (counts.get(d) || 0) + k);
      }
    }
    const cd = [...counts.keys()].sort((a, b) => a - b);
    const lastSeen = cd.filter(d => counts.get(d) > 0).pop();
    const ref = Math.max(...cd.filter(d => d > lastSeen - 21 && d <= lastSeen).map(d => counts.get(d)));
    let LAST = lastSeen; while (counts.get(LAST) < o.minCoverage * ref) LAST--;
    if (o.lastOverride) LAST = isoDay(o.lastOverride);
    const info0 = { lastSeen: iso(lastSeen), last: iso(LAST), coverage: counts.get(LAST) / ref };

    function build(by, readEnd) {
      const meters = new Map();
      for (const typ of Object.keys(by)) {
        const ser = new Map();
        for (const sh of by[typ]) {
          const ws = need(sh), D = dims(ws);
          const cols = []; for (let c = 5; c <= D.C; c++) { const d = hdrDay(ws, c); if (d != null && d <= readEnd) cols.push([c, d]); }
          for (const { r, n, occ, rg } of sheetRows(ws)) {
            if (occ > 1) continue;
            if (!REGION.has(n)) REGION.set(n, rg);
            const m = ser.get(n) || new Map();
            for (const [c, d] of cols) { const x = tofloat(cell(ws, r, c)); if (Number.isFinite(x)) m.set(d, x); }
            ser.set(n, m);
          }
        }
        for (const [n, m] of ser) {
          const key = n + '||' + typ, meta = CT.get(key);
          if (!meta || typeof meta.ct !== 'number') continue;
          const dd = [...m.keys()].sort((a, b) => a - b);
          if (dd.length < 5) continue;
          const cs = clean(dd, dd.map(d => m.get(d)));
          const dly = toDaily(cs.d, cs.v, meta.ct);
          if (!dly.vals.length) continue;
          meters.set(key, { start: dly.start, vals: smooth(dly.vals), last: cs.d[cs.d.length - 1], first: cs.d[0], site: meta.site, typ, name: n });
        }
      }
      return meters;
    }
    const M26 = build(SH26, LAST);
    const M25 = build(SH25, LAST + 5);
    const skip = (k, mt) => mt.site === '7-SUN PLAZA' && mt.typ === 'WBP';

    const E26 = LAST, E25 = LAST - 363;
    const statusN = {}; SITES.forEach(s => statusN[s] = []);
    const live26 = [], live25 = new Set();
    for (const [k, m] of M26) {
      if (skip(k, m)) continue;
      if (m.last >= E26 && m.start <= isoDay('2026-08-01')) live26.push(k);
      else statusN[m.site].push(m.typ + ' meter last updated ' + iso(m.last));
    }
    for (const [k, m] of M25) if (!skip(k, m) && m.last >= LAST - 362 && m.start <= isoDay('2025-08-01')) live25.add(k);
    const panel = live26.filter(k => live25.has(k));
    for (const k of live26) if (!live25.has(k)) statusN[M26.get(k).site].push(M26.get(k).typ + ' meter has no 2025 data to compare');

    function frame(M, keys, d0, d1) {
      const bySite = new Map();
      for (const k of keys) { const m = M.get(k); (bySite.get(m.site) || bySite.set(m.site, []).get(m.site)).push(m); }
      const out = new Map();
      for (const [site, L] of bySite) {
        const arr = [];
        for (let d = d0; d <= d1; d++) {
          let s = 0, ok = true;
          for (const m of L) { const x = m.vals[d - m.start]; if (d < m.start || x === undefined || Number.isNaN(x)) { ok = false; break; } s += x; }
          arr.push(ok ? s : NaN);
        }
        out.set(site, arr);
      }
      return out;
    }
    const f26 = { d0: isoDay('2026-07-02'), d1: LAST }, f25 = { d0: isoDay('2025-07-02'), d1: E25 };
    const S26 = frame(M26, panel, f26.d0, f26.d1), S25 = frame(M25, panel, f25.d0, f25.d1);
    const S26r = new Map(), S25r = new Map(), fixes = new Map();
    for (const s of S26.keys()) {
      const a = S26.get(s), b = S25.get(s);
      if (a.some(Number.isNaN) || b.some(Number.isNaN)) { fixes.set(s, [-1, -1]); S26r.set(s, a); S25r.set(s, b); continue; }
      const r1 = repair(a), r2 = repair(b);
      S26r.set(s, r1.v); S25r.set(s, r2.v); fixes.set(s, [r1.fixed, r2.fixed]);
    }
    const slice = (arr, f, d0, d1) => arr.slice(d0 - f.d0, d1 - f.d0 + 1);
    const excluded = new Map();
    for (const s of S26.keys()) {
      const why = [], [f1, f2] = fixes.get(s);
      if (f1 < 0) why.push('missing days in the analysis window');
      else {
        if (Math.max(f1, f2) >= 20) why.push('too many odd readings (zero, negative or jumps)');
        const a = slice(S26r.get(s), f26, isoDay('2026-08-01'), LAST), b = slice(S25r.get(s), f25, isoDay('2025-08-01'), E25);
        if (a.some(x => x <= 0) || b.some(x => x <= 0)) why.push('zero or negative days remain after repair');
        for (const [nm, x] of [['Aug 26', slice(S26r.get(s), f26, isoDay('2026-08-01'), isoDay('2026-08-31'))], ['Sep 26', slice(S26r.get(s), f26, isoDay('2026-09-01'), isoDay('2026-09-30'))],
          ['Aug 25', slice(S25r.get(s), f25, isoDay('2025-08-01'), isoDay('2025-08-31'))], ['Sep 25', slice(S25r.get(s), f25, isoDay('2025-09-01'), isoDay('2025-09-30'))]]) {
          const m = mean(x); if (Math.abs(m) > 0 && std1(x) / Math.abs(m) > 0.9) { why.push('unusual daily swings (' + nm + ')'); break; }
        }
        const m26 = mean(slice(S26r.get(s), f26, isoDay('2026-08-01'), isoDay('2026-09-30'))), m25 = mean(slice(S25r.get(s), f25, isoDay('2025-08-01'), isoDay('2025-09-30')));
        if (m26 < 100 || m25 < 100) why.push('average below 100 kWh/day (CT or unit may be wrong)');
        else if (!(0.4 <= m26 / m25 && m26 / m25 <= 2.5)) why.push('2026 vs 2025 level not plausible (' + (m26 / m25).toFixed(1) + 'x; meter or CT change?)');
      }
      if (why.length) excluded.set(s, [...new Set(why)].join('; '));
    }
    for (const [s, w] of Object.entries(o.manualExclude)) if (S26.has(s)) excluded.set(s, w);
    const good = [...S26.keys()].filter(s => !excluded.has(s));

    // meter coverage per site
    const exp = {}, used = {};
    for (const [k, m] of M26) if (!skip(k, m)) (exp[m.site] = exp[m.site] || new Set()).add(m.typ);
    for (const k of panel) (used[M26.get(k).site] = used[M26.get(k).site] || new Set()).add(M26.get(k).typ);
    const regionOf = {}; for (const [k, v] of CT) { const n = k.split('||')[0]; if (REGION.has(n) && !(v.site in regionOf)) regionOf[v.site] = REGION.get(n); }

    // assemble dataset
    const d0 = isoDay('2026-08-01'), days = []; for (let d = d0; d <= LAST; d++) days.push(d);
    const octFirst = isoDay('2026-10-01'); if (LAST < octFirst) throw new Error('The file has no October 2026 data yet (last complete day ' + iso(LAST) + ').');
    const pyDays = []; for (let d = octFirst; d <= LAST; d++) pyDays.push(d - 364);
    const r1 = x => Math.round(x * 10) / 10;
    const sites = good.sort((a, b) => parseInt(a) - parseInt(b)).map(s => {
      const miss = [...(exp[s] || [])].filter(t => !(used[s] || new Set()).has(t));
      return { n: s, r: 'R' + (regionOf[s] || '').replace(/\D/g, ''), p: o.program.includes(s), partial: miss.length > 0,
        v: slice(S26r.get(s), f26, d0, LAST).map(r1), y: pyDays.map(d => r1(S25r.get(s)[d - f25.d0])) };
    });
    // month-to-month history (Mar 2026 onwards, plus Aug 2025 onwards for year-on-year)
    const h0 = isoDay('2026-03-01'), y0 = isoDay('2025-08-01'), H26 = frame(M26, panel, h0, LAST);
    const hist = { d0: iso(h0), n: LAST - h0 + 1, y0: iso(y0), v: {}, y: {} };
    for (const st of sites) {
      const arr = H26.get(st.n) || [], ref = [...st.v].sort((a, b) => a - b)[Math.floor(st.v.length / 2)], out = [];
      for (let i = 0; i < hist.n; i++) {
        const d = h0 + i;
        if (d >= d0) out.push(st.v[d - d0]);
        else { const x = arr[i]; out.push(Number.isFinite(x) && x > 0.2 * ref && x < 3 * ref ? r1(x) : null); }
      }
      hist.v[st.n] = out;
      hist.y[st.n] = slice(S25r.get(st.n), f25, y0, E25).map(r1);
    }
    // program sites outside the analysed panel
    const sumSite = (site, d1, types) => {
      const L = [...M26.values()].filter(m => m.site === site && (!types || types.includes(m.typ)));
      if (!L.length) return null;
      const out = []; for (let d = d0; d <= d1; d++) { let s = 0, ok = true; for (const m of L) { const x = m.vals[d - m.start]; if (d < m.start || x === undefined) { ok = false; break; } s += x; } out.push(ok ? s : NaN); }
      return out;
    };
    let sp = null;
    { const L = [...M26.values()].filter(m => m.site === '7-SUN PLAZA' && m.typ === 'LWBP');
      if (L.length) { const end = Math.min(LAST, isoDay(o.sunEnd)), v = []; for (let d = d0; d <= end; d++) { let s = 0, any = false; for (const m of L) { const x = m.vals[d - m.start]; if (d >= m.start && x !== undefined) { s += x; any = true; } } v.push(any ? s : NaN); }
        if (!v.some(Number.isNaN)) sp = { n: '7-SUN PLAZA', v: v.map(r1) }; } }
    const zx = [];
    for (const site of o.zxSites) {
      if (sites.some(x => x.n === site)) continue;
      const t = sumSite(site, LAST, null); if (!t || t.some(Number.isNaN)) continue;
      const med = rollMed(t, 15, 5), fx = t.map((x, i) => x < 2.5 * med[i] ? x : med[i]);
      zx.push({ n: site, v: fx.map(r1) });
    }
    const excl = [...excluded].map(([site, reason]) => ({ site, reason }));
    for (const s of SITES) if (!good.includes(s) && !excluded.has(s))
      excl.push({ site: s, reason: statusN[s].length ? [...new Set(statusN[s])].join('; ') : 'no active meter data in the report' });
    // sites outside the main comparison: tracked on their own with whatever meter data exists
    const inMain = new Set(sites.map(x => x.n));
    const track = SITES.filter(x => !inMain.has(x)).map(site => {
      const mv = {}, L = [...M26.entries()].filter(([k, m]) => m.site === site && !skip(k, m)), seen = {}, live = [];
      L.forEach(([k, m]) => { const a = []; for (let d = d0; d <= LAST; d++) { const x = m.vals[d - m.start]; a.push(d < m.start || x === undefined || Number.isNaN(x) ? null : r1(x)); }
        seen[m.typ] = (seen[m.typ] || 0) + 1; const key = seen[m.typ] > 1 ? m.typ + ' ' + seen[m.typ] : m.typ; mv[key] = a; if (m.last >= d0) live.push(key); });
      const tot = days.map((_, i) => live.length && live.every(t => mv[t][i] != null) ? r1(live.reduce((t, k) => t + mv[k][i], 0)) : null);
      const why = excl.find(e => e.site === site);
      return { n: site, r: 'R' + (regionOf[site] || '').replace(/\D/g, ''), reason: why ? why.reason : '', meters: L.filter(([k, m]) => m.last >= d0).map(([k, m]) => ({ typ: m.typ, last: iso(m.last) })), v: tot, m: mv };
    });
    // weekly efficiency sheet (optional): target, actual, shows and screen closes per site for one Wed-Tue week
    const weekly = (function () {
      const ws = wb.Sheets['By Weekly']; if (!ws || !ws['!ref']) return null;
      const R = dims(ws).R; let hr = -1;
      for (let r = 1; r <= Math.min(R, 15); r++) if (str(cell(ws, r, 2)).toUpperCase() === 'CINEMA') { hr = r; break; }
      if (hr < 0) return null;
      const yr = +iso(LAST).slice(0, 4), MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 };
      const dayAt = c => {
        const x = cell(ws, hr, c); if (!x) return null;
        if (x.t === 'n' && x.v > 40000 && x.v < 60000) return Math.floor(x.v) - 25569;
        const m = String(x.v).trim().match(/^(\d{1,2})[-\/ ]([A-Za-z]{3})/); if (!m || !MON[m[2].toLowerCase()]) return null;
        return Math.round(Date.UTC(yr, MON[m[2].toLowerCase()] - 1, +m[1]) / DAY);
      };
      const d0 = dayAt(5), d6 = dayAt(11); if (d0 == null || d6 == null || d6 - d0 !== 6) return null;
      const num = c => { const v = tofloat(c); return Number.isNaN(v) ? null : v; };
      const rows = [];
      for (let r = hr + 1; r <= R; r++) {
        const n = str(cell(ws, r, 2)); if (n === 'None' || !n) break;
        const days7 = []; for (let c = 5; c <= 11; c++) { const v = num(cell(ws, r, c)); days7.push(v ? v : null); }
        const es = num(cell(ws, r, 15));
        rows.push({ n, r: 'R' + (regionOf[n] || '').replace(/\D/g, ''), dt: num(cell(ws, r, 3)) || 0, wt: num(cell(ws, r, 4)) || 0, d: days7,
          wa: num(cell(ws, r, 12)) || 0, show: num(cell(ws, r, 13)) || 0, close: num(cell(ws, r, 14)) || 0,
          es: es == null ? 0 : (Math.abs(es) <= 1.5 ? Math.round(es * 100) : Math.round(es)) });
      }
      return rows.length ? { from: iso(d0), to: iso(d6), source: 'By Weekly sheet', rows } : null;
    })();
    return {
      days: days.map(iso), pyDays: pyDays.map(iso), sites, sp, zx, hist, weekly, track,
      meta: { source: o.fileName, last: iso(LAST), lastSeen: info0.lastSeen, totalSites: SITES.length, included: sites.length,
        excluded: excl.sort((a, b) => parseInt(a.site) - parseInt(b.site)), generatedAt: new Date().toISOString() }
    };
  }
  const api = { buildDataset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ElecEngine = api;
})(typeof self !== 'undefined' ? self : this);

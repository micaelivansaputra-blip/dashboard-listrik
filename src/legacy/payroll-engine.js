/* Payroll workbook reader. Runs in the browser (SheetJS global) and in node. Reads cached values only; nothing leaves the page. */
(function (root) {
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function buildPayroll(XLSX, buf, o) {
    o = Object.assign({ readType: 'array', fileName: '', year: null }, o || {});
    const wb = XLSX.read(buf, { type: o.readType, sheets: ['SUMMARY', 'PROD 16', 'PROD 14'], cellFormula: true, cellStyles: false, cellHTML: false, cellDates: false });
    const ws0 = n => wb.Sheets[n];
    if (!ws0('SUMMARY')) throw new Error('Sheet "SUMMARY" was not found in the file.');
    const A = (r, c) => XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
    const cell = (ws, r, c) => ws[A(r, c)];
    const num = x => (x && x.t === 'n' && Number.isFinite(x.v)) ? x.v : null;
    const txt = x => (x && x.v != null) ? String(x.v).trim() : '';
    const dims = ws => { const r = XLSX.utils.decode_range(ws['!ref']); return { R: r.e.r + 1, C: r.e.c + 1 }; };

    /* ---- SUMMARY: monthly Budget (B) vs Actual + Forecast (A + F) ---- */
    function parseSummary(ws) {
      const D = dims(ws), out = {};
      for (let r = 1; r <= D.R; r++) {
        const m = /^Productivity\s*(\d+)/i.exec(txt(cell(ws, r, 2)));
        if (!m) continue;
        const grp = {};
        for (let c = 3; c <= D.C; c++) {
          const t = txt(cell(ws, r, c)).toLowerCase();
          if (t === 'admits') grp.admits = c; else if (t.startsWith('rev')) grp.rev = c; else if (t.startsWith('admin pay')) grp.admin = c;
          else if (t.startsWith('opr payroll')) grp.opr = c; else if (t.startsWith('total payroll')) grp.total = c; else if (t.startsWith('% payroll')) grp.pct = c;
        }
        const get = (rr, k) => { const c = grp[k]; return c ? { b: num(cell(ws, rr, c)), af: num(cell(ws, rr, c + 1)) } : { b: null, af: null }; };
        const months = []; let total = null;
        for (let rr = r + 2; rr <= Math.min(D.R, r + 16); rr++) {
          const lab = txt(cell(ws, rr, 2)).toUpperCase();
          const mi = MONTHS.indexOf(lab);
          const row = { admits: get(rr, 'admits'), rev: get(rr, 'rev'), admin: get(rr, 'admin'), opr: get(rr, 'opr'), total: get(rr, 'total'), pct: get(rr, 'pct') };
          if (mi >= 0) months.push(Object.assign({ m: mi, label: MON3[mi] }, row));
          else if (lab === 'TOTAL') { total = row; break; }
        }
        if (months.length) out[m[1]] = { months, total };
      }
      if (!Object.keys(out).length) throw new Error('No "Productivity" block was found on the SUMMARY sheet.');
      return out;
    }

    /* ---- PROD sheets: weekly Admits and MHDW per site ---- */
    function parseProd(ws, year) {
      const D = dims(ws), isMon = s => MON3.includes(s);
      const runs = []; let cur = null;
      for (let c = 3; c <= D.C; c++) {
        const s = txt(cell(ws, 2, c));
        if (isMon(s)) { if (!cur) { cur = { c0: c, c1: c }; runs.push(cur); } else cur.c1 = c; } else cur = null;
      }
      if (runs.length < 2) throw new Error('weekly Admits and MHDW blocks were not found');
      const [ra, rm] = runs, nW = ra.c1 - ra.c0 + 1;
      const rows = []; let totalRow = null;
      for (let r = 7; r <= D.R; r++) {
        const n = txt(cell(ws, r, 2)); if (!n) continue;
        if (n.toUpperCase() === 'TOTAL') { totalRow = r; break; }
        rows.push({ r, n });
      }
      if (!totalRow) throw new Error('TOTAL row was not found');
      const weeks = [];
      for (let j = 0; j < nW; j++) {
        const c = ra.c0 + j, month = MON3.indexOf(txt(cell(ws, 2, c))), days = num(cell(ws, 3, c)) || 7, label = txt(cell(ws, 5, c));
        const mm = /(\d+)\s*-\s*(\d+)/.exec(label), d0 = mm ? +mm[1] : 1, d1 = mm ? +mm[2] : 28;
        const fa = rows.filter(x => { const k = cell(ws, x.r, c); return k && !k.f; }).length;
        const fm = rows.filter(x => { const k = cell(ws, x.r, rm.c0 + j); return k && !k.f; }).length;
        const actual = rows.length > 0 && fa >= 0.8 * rows.length && fm >= 0.8 * rows.length;
        const end = new Date(Date.UTC(year, month, d1)).toISOString().slice(0, 10);
        weeks.push({ month, label: MON3[month] + ' ' + d0 + '–' + d1, short: d0 + '–' + d1, days, end, actual });
      }
      // productivity block (admits / (FT hours + MHDW)) = first column after the MHDW block whose formula divides by "($AM..."
      let pc = null;
      for (let c = rm.c1 + 1; c <= D.C && pc == null; c++) { const k = cell(ws, rows[0].r, c); if (k && k.f && /^[A-Z]+\d+\/\(\$[A-Z]+\d+\*/.test(k.f)) pc = c; }
      let tgt = null;
      for (let c = 3; c <= rm.c0 + 5 && tgt == null; c++) if (txt(cell(ws, 4, c)).toUpperCase() === 'PROD' || txt(cell(ws, 3, c)).toUpperCase() === 'PROD') tgt = c;
      const v = (r, c) => { const x = num(cell(ws, r, c)); return x == null ? null : x; };
      /* ---- headcount, UMK, rate: columns between the Admits block and the MHDW block, labelled in rows 4-5 ---- */
      const L = c => XLSX.utils.encode_col(c - 1), hcCols = {}; let grp = '';
      for (let c = ra.c1 + 1; c < rm.c0; c++) {
        const g = txt(cell(ws, 4, c)), lab = txt(cell(ws, 5, c)); if (g) grp = g;
        const gk = grp.toUpperCase(), lk = lab.toUpperCase(), sec = /^FT\s*1/.test(lk) ? '1' : /^FT\s*2/.test(lk) ? '2' : lk === 'CL' ? 'cl' : lk === '1ST' ? '1' : lk === '2ND' ? '2' : '';
        if (lk === 'UMK') hcCols.umk = c; else if (lk.startsWith('RATE')) hcCols.rate = c;
        else if (gk.startsWith('HC AUG') && sec) hcCols['a' + sec] = c; else if (gk.startsWith('EOC') && sec && sec !== 'cl') hcCols['e' + sec] = c;
        else if (gk.startsWith('REDUCE') && sec && sec !== 'cl') hcCols['r' + sec] = c; else if (gk.startsWith('HC SEP') && sec) hcCols['s' + sec] = c;
      }
      /* ---- monthly cost components (BASIC, DW, ... OPR) and monthly MHDW, to the right of the MHDW block ---- */
      const compCols = {}, compFac = {}; let nm = '';
      for (let c = rm.c1 + 1; c <= D.C; c++) {
        const g = txt(cell(ws, 4, c)), mo = MONTHS.indexOf(txt(cell(ws, 5, c)).toUpperCase());
        if (g) nm = g; if (mo < 0 || !nm) continue;
        (compCols[nm] = compCols[nm] || {})[mo] = c;
        if (compFac[nm] == null) compFac[nm] = num(cell(ws, 3, c));
      }
      const compNames = Object.keys(compCols).filter(k => !/^prod/i.test(k));
      const sites = rows.map(x => {
        const o2 = {
          n: x.n, r: x.r, target: tgt ? v(x.r, tgt) : null,
          admits: weeks.map((_, j) => v(x.r, ra.c0 + j) || 0), mhdw: weeks.map((_, j) => v(x.r, rm.c0 + j) || 0),
          fa: weeks.map((_, j) => { const k = cell(ws, x.r, ra.c0 + j); return k && k.f ? 1 : 0; }),
          fm: weeks.map((_, j) => { const k = cell(ws, x.r, rm.c0 + j); return k && k.f ? 1 : 0; }),
          prod: pc ? weeks.map((_, j) => v(x.r, pc + j)) : null, hc: {}, c: {}
        };
        for (const k of Object.keys(hcCols)) o2.hc[k] = v(x.r, hcCols[k]);
        for (const nm2 of compNames) { const a = {}; for (const mo of Object.keys(compCols[nm2])) a[mo] = v(x.r, compCols[nm2][mo]); o2.c[nm2] = a; }
        return o2;
      });
      /* one example formula per block (first site) so the dashboard can show the real cell address and formula */
      const r0 = rows[0].r, fx = (r, c) => { const k = cell(ws, r, c); return k && k.f ? '=' + k.f : null; };
      const meta = {
        r0, L: { admits: weeks.map((_, j) => L(ra.c0 + j)), mhdw: weeks.map((_, j) => L(rm.c0 + j)), prod: pc ? weeks.map((_, j) => L(pc + j)) : null },
        fAdmits: weeks.map((_, j) => fx(r0, ra.c0 + j)), fMhdw: weeks.map((_, j) => fx(r0, rm.c0 + j)), fProd: pc ? weeks.map((_, j) => fx(r0, pc + j)) : null,
        hcL: Object.fromEntries(Object.keys(hcCols).map(k => [k, L(hcCols[k])])), hcF: Object.fromEntries(Object.keys(hcCols).map(k => [k, fx(r0, hcCols[k])]).filter(x => x[1])),
        compNames, compFac, compF: Object.fromEntries(compNames.map(k => [k, Object.fromEntries(Object.keys(compCols[k]).map(mo => [mo, { f: fx(r0, compCols[k][mo]), col: L(compCols[k][mo]) }]))])),
        compMonths: [...new Set([].concat(...compNames.map(k => Object.keys(compCols[k]).map(Number))))].sort((a, b) => a - b)
      };
      const tot = { admits: weeks.map((_, j) => v(totalRow, ra.c0 + j)), mhdw: weeks.map((_, j) => v(totalRow, rm.c0 + j)), prod: pc ? weeks.map((_, j) => v(totalRow, pc + j)) : null };
      if (tot.admits.some(x => x == null)) tot.admits = weeks.map((_, j) => sites.reduce((t, s) => t + s.admits[j], 0));
      if (tot.mhdw.some(x => x == null)) tot.mhdw = weeks.map((_, j) => sites.reduce((t, s) => t + s.mhdw[j], 0));
      const ctot = {}; for (const nm2 of compNames) { const a = {}; for (const mo of Object.keys(compCols[nm2])) a[mo] = v(totalRow, compCols[nm2][mo]); ctot[nm2] = a; }
      meta.ctot = ctot;
      return { meta, weeks, sites, tot, target: sites.find(s => s.target) ? sites.find(s => s.target).target : null };
    }

    const year = o.year || (/(20\d\d)/.exec(o.fileName.replace(/\d{2}(\d{2})(20\d\d)/, '$2')) || [0, 2026])[1] * 1 || 2026;
    const summary = parseSummary(ws0('SUMMARY')), prod = {}, problems = [];
    for (const k of Object.keys(summary)) {
      const sh = ws0('PROD ' + k);
      if (!sh) { problems.push('Sheet "PROD ' + k + '" is missing, so weekly numbers for Productivity ' + k + ' are not shown.'); continue; }
      try { prod[k] = parseProd(sh, year); } catch (e) { problems.push('PROD ' + k + ': ' + e.message); }
    }
    // mark which months are actual: all weeks of the month actual => Actual; none => Forecast; else Part actual
    const status = {};
    for (const k of Object.keys(prod)) {
      status[k] = {};
      for (let m = 0; m < 12; m++) {
        const w = prod[k].weeks.filter(x => x.month === m);
        status[k][m] = !w.length ? (m < 6 ? 'actual' : 'forecast') : w.every(x => x.actual) ? 'actual' : w.some(x => x.actual) ? 'part' : 'forecast';
      }
    }
    return { summary, prod, status, year, meta: { source: o.fileName, scenarios: Object.keys(summary), problems, generatedAt: new Date().toISOString() } };
  }
  const api = { buildPayroll };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PayEngine = api;
})(typeof self !== 'undefined' ? self : this);

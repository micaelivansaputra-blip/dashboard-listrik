/* ============================================================================
   ADMITS module · PRESENTER
   Turns Interactor results into a ViewModel (text, tones, ordered lists) and
   turns View events into Interactor queries. Holds the screen state.
   It never touches the DOM, so it can be unit-tested in Node with a fake view.
   ========================================================================== */
const AdmitsPresenter = function (interactor, router) {
  const NF = new Intl.NumberFormat('en-US');
  const int = n => n == null ? '–' : NF.format(Math.round(n));
  const dec = (n, d) => n == null ? '–' : n.toFixed(d == null ? 2 : d);
  const pct = (x, d) => x == null ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d == null ? 1 : d) + '%';
  const sgn = n => n == null ? '–' : (n >= 0 ? '+' : '−') + NF.format(Math.round(Math.abs(n)));

  // For electricity, up is bad and down is good (same convention as the rest of the dashboard).
  const toneKwh = x => x == null ? 'flat' : x > 0 ? 'up' : x < 0 ? 'down' : 'flat';

  const THRESHOLDS = [{ v: 0, label: 'Any change' }, { v: 0.02, label: 'Above 2%' }, { v: 0.05, label: 'Above 5%' }];
  const QUAD = {
    concern: { label: 'Admits down, kWh up', tone: 'up' },
    'both-down': { label: 'Both down', tone: 'down' },
    'both-up': { label: 'Both up', tone: 'flat' },
    saving: { label: 'Admits up, kWh down', tone: 'down' },
    steady: { label: 'Steady', tone: 'flat' }
  };
  const FLAGS = { unreliable: 'CT changed', estimated: 'Admits estimated', meter: 'Extra meter' };
  const COLUMNS = [
    { key: 'name', label: 'Site', left: true },
    { key: 'a26', label: 'Admits Sep 26' }, { key: 'aChg', label: 'Admits change' },
    { key: 'k26', label: 'kWh Sep 26' }, { key: 'kChg', label: 'kWh change' }, { key: 'kDelta', label: 'kWh added' },
    { key: 'i26', label: 'kWh per admit' }, { key: 'iChg', label: 'Per admit change' }
  ];

  const state = { thr: 0, excl: false, filter: 'all', query: '', sortKey: 'kDelta', sortDir: 'desc', selected: null, expand: false };
  const LIMIT = 12;
  let view = null;

  const opts = () => ({ thr: state.thr, excludeUnreliable: state.excl });
  const q = () => Object.assign({ filter: state.filter, query: state.query, sortKey: state.sortKey, sortDir: state.sortDir }, opts());

  /* ---------- ViewModel builders ---------- */

  function verdict(S) {
    if (!S.sites || S.aChg == null || S.kChg == null) return { tone: 'flat', parts: null };
    return {
      tone: toneKwh(S.kChg),
      parts: { aVerb: S.aChg < 0 ? 'fell' : 'rose', aPct: pct(Math.abs(S.aChg)).replace('+', ''), kVerb: S.kChg < 0 ? 'fell' : 'rose',
               kPct: pct(Math.abs(S.kChg)).replace('+', ''), sites: S.sites, per: dec(S.i26), iVerb: S.iChg < 0 ? 'down' : 'up', iPct: pct(Math.abs(S.iChg)).replace('+', ''),
               but: (S.aChg < 0) !== (S.kChg < 0) ? 'but' : 'and' }
    };
  }

  function kpis(S, C) {
    return [
      { label: 'Admits', value: pct(S.aChg), tone: 'flat', sub: `${int(S.a26)} vs ${int(S.a25)} in Sep 2025` },
      { label: 'Electricity (invoice kWh)', value: pct(S.kChg), tone: toneKwh(S.kChg), sub: `${int(S.k26)} vs ${int(S.k25)} in Sep 2025` },
      { label: 'kWh per admit', value: dec(S.i26), tone: toneKwh(S.iChg), sub: `${pct(S.iChg)} from ${dec(S.i25)} in Sep 2025` },
      { label: 'Admits down, kWh up', value: String(C.concern), tone: C.concern ? 'up' : 'flat', sub: `${sgn(S.concernKwh)} kWh combined, ${C.concern} of ${S.sites} sites` }
    ];
  }

  function niceCap(vals, floor, ceil) {
    const a = vals.map(Math.abs).sort((x, y) => x - y);
    const p = a.length ? a[Math.min(a.length - 1, Math.floor(a.length * 0.92))] : 0;
    return Math.min(ceil, Math.max(floor, Math.ceil(p * 1.25 * 10) / 10));
  }

  function scatter() {
    const pts = interactor.scatter(opts());
    const cx = niceCap(pts.map(p => p.x), 0.3, 1.0), cy = niceCap(pts.map(p => p.y), 0.3, 0.6);
    const clamp = (v, c) => Math.max(-c, Math.min(c, v));
    return {
      capX: cx, capY: cy,
      points: pts.map(p => ({
        no: p.no, name: p.name, q: p.quadrant,
        x: clamp(p.x, cx), y: clamp(p.y, cy), clipped: Math.abs(p.x) > cx || Math.abs(p.y) > cy,
        tip: [`Admits ${pct(p.x)} (${int(p.row.site.a25)} to ${int(p.row.site.a26)})`, `kWh ${pct(p.y)} (${int(p.row.site.k25)} to ${int(p.row.site.k26)})`]
      })),
      legend: Object.keys(QUAD).map(k => ({ q: k, label: QUAD[k].label })),
      xTitle: 'Change in admits vs Sep 2025', yTitle: 'Change in kWh vs Sep 2025'
    };
  }

  function concernRows() {
    const rows = interactor.concern(opts(), 5);
    const mx = Math.max.apply(null, rows.map(r => r.kDelta).concat([1]));
    return rows.map(r => ({
      no: r.site.no, name: r.site.name, width: Math.max(2, r.kDelta / mx * 100), hot: r.iChg != null && r.iChg > 0.1,
      sub: `Admits ${pct(r.aChg)} · kWh ${pct(r.kChg)}`, perAdmit: `${dec(r.i25)} to ${dec(r.i26)} kWh per admit`,
      value: sgn(r.kDelta), valueSub: 'kWh vs Sep 2025', flag: FLAGS[r.site.flag] || ''
    }));
  }

  function statusOf(r) {
    if (r.comparable) return QUAD[r.quadrant];
    if (r.status === 'unreliable') return { label: 'Left out: CT changed', tone: 'flat' };
    if (r.status === 'new') return { label: 'New site, no Sep 2025', tone: 'flat' };
    return { label: 'Invoice missing', tone: 'flat' };
  }

  function tableRows(all) {
    return all.map(r => {
      const s = r.site, st = statusOf(r), open = state.selected === s.no;
      const row = {
        no: s.no, name: s.name, status: st, flag: FLAGS[s.flag] || '', open,
        a25: int(s.a25), a26: int(s.a26), aChg: { text: pct(r.aChg), tone: 'flat' },
        k25: int(s.k25), k26: int(s.k26), kChg: { text: pct(r.kChg), tone: toneKwh(r.kChg) },
        kDelta: { text: r.kDelta == null ? '–' : sgn(r.kDelta), tone: toneKwh(r.kDelta) },
        i26: dec(r.i26), iChg: { text: pct(r.iChg), tone: toneKwh(r.iChg) }
      };
      if (open) row.detail = detail(r);
      return row;
    });
  }

  function detail(r) {
    const s = r.site;
    return {
      lines: [
        ['Admits', `${int(s.a25)} to ${int(s.a26)}`], ['Invoice kWh', `${int(s.k25)} to ${int(s.k26)}`],
        ['kWh per admit', r.comparable ? `${dec(r.i25)} to ${dec(r.i26)}` : '–']
      ],
      note: s.note, canOpenDaily: router.hasDaily(s.no)
    };
  }

  function tableVM() {
    const all = interactor.list(q());
    const capped = !state.expand && !state.query && state.filter === 'all' && all.length > LIMIT;
    return {
      columns: COLUMNS.map(c => ({ key: c.key, label: c.label, left: !!c.left, sorted: state.sortKey === c.key ? state.sortDir : '' })),
      rows: tableRows(capped ? all.slice(0, LIMIT) : all),
      more: all.length > LIMIT && !state.query && state.filter === 'all' ? { expanded: state.expand, label: state.expand ? 'Show fewer sites' : `Show all ${all.length} sites` } : null
    };
  }

  function coverage(S) {
    const c = S.coverage, items = [];
    items.push({ label: 'Compared like-for-like', value: `${S.sites} of ${c.total} sites` });
    if (c.newSites.length) items.push({ label: 'New sites, no Sep 2025 data', value: c.newSites.join(', ') });
    if (c.noInvoice.length) items.push({ label: 'No invoice in one of the years', value: c.noInvoice.join(', ') });
    if (c.unreliable.length && state.excl) items.push({ label: 'Left out because the CT changed', value: c.unreliable.join(', ') });
    items.push({ label: 'Admits only, sites in both years', value: `${int(c.admitsBoth.a26)} vs ${int(c.admitsBoth.a25)} (${pct(c.admitsBoth.a26 / c.admitsBoth.a25 - 1)}, ${c.admitsBoth.sites} sites)` });
    items.push({ label: 'Admits only, all sites in the file', value: `${int(c.admitsAll26.a26)} (${c.admitsAll26.sites} sites) vs ${int(c.admitsAll25.a25)} (${c.admitsAll25.sites} sites), not like-for-like` });
    return items;
  }

  function buildVM() {
    const S = interactor.summary(opts()), C = interactor.counts(opts());
    const filters = [['all', 'All', 'flat']].concat(Object.keys(QUAD).map(k => [k, QUAD[k].label, QUAD[k].tone])).concat([['nodata', 'No comparison', 'flat']]);
    return {
      meta: interactor.meta(),
      verdict: verdict(S),
      controls: {
        thresholds: THRESHOLDS.map(t => ({ v: t.v, label: t.label, active: t.v === state.thr })),
        excl: { on: state.excl, label: 'Leave out sites where the CT changed' }
      },
      kpis: kpis(S, C),
      scatter: scatter(),
      concern: concernRows(),
      filters: filters.map(f => ({ key: f[0], label: f[1], tone: f[2], count: C[f[0]], active: state.filter === f[0] })),
      query: state.query,
      table: tableVM(),
      coverage: coverage(S)
    };
  }

  /* ---------- lifecycle and view events ---------- */
  const render = force => view && view.render(buildVM(), force === true);

  return {
    state, buildVM,
    attach(v) { view = v; v.bind(this); render(); },
    refresh() { render(true); },
    onThreshold(v) { state.thr = +v; render(); },
    onExclude(on) { state.excl = !!on; render(); },
    onFilter(f) { state.filter = (state.filter === f) ? 'all' : f; render(); },
    onQuery(t) { state.query = t; render(); },
    onSort(k) {
      if (state.sortKey === k) state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
      else { state.sortKey = k; state.sortDir = k === 'name' ? 'asc' : 'desc'; }
      render();
    },
    onSelect(no) { state.selected = state.selected === no ? null : no; if (state.selected != null) state.expand = true; render(); },
    onPick(no) { state.selected = no; state.expand = true; render(); },       // chart click: always select, never toggle
    onToggleMore() { state.expand = !state.expand; render(); },
    onOpenDaily(no) { router.openDaily(no); }
  };
};
if (typeof module !== 'undefined') module.exports = AdmitsPresenter;

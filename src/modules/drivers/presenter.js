/* ============================================================================
   DRIVERS module · PRESENTER
   Turns Interactor results into a ViewModel (text, tones, ordered lists) and
   turns View events into Interactor queries. Holds the screen state.
   No DOM, so it can be unit-tested in Node. Sentences are whole templates with
   numbers only inside them, so every one can be translated as a unit.
   ========================================================================== */
const DriversPresenter = function (interactor, router) {
  const NF = new Intl.NumberFormat('en-US');
  const int = n => n == null ? '–' : NF.format(Math.round(n));
  const dec = (n, d) => n == null ? '–' : n.toFixed(d == null ? 2 : d);
  const pct = (x, d) => x == null ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(d == null ? 1 : d) + '%';
  const abs = (x, d) => x == null ? '–' : Math.abs(x * 100).toFixed(d == null ? 0 : d) + '%';
  const sgn = n => n == null ? '–' : (n >= 0 ? '+' : '−') + NF.format(Math.round(Math.abs(n)));
  // Electricity: up is bad, down is good, same convention as the rest of the dashboard.
  const tone = x => x == null ? 'flat' : x > 0 ? 'up' : x < 0 ? 'down' : 'flat';

  const STEPS = {
    new:        { label: 'New sites', kind: 'Structure', why: 'No kWh in Sep 2025. They add load, but they are not a change at an existing site.' },
    basis:      { label: 'CT changes', kind: 'Data basis', why: 'The same kind of meter now has a different CT, so the two Septembers are read on a different basis.' },
    extra:      { label: 'Extra meters', kind: 'Structure', why: 'A meter was added that last year did not have. Its kWh is not part of last year’s base.' },
    incomplete: { label: 'Incomplete invoices', kind: 'Data issue', why: 'A meter billed last year has no kWh this year. The invoice looks incomplete, so the drop is not a saving.' },
    like:       { label: 'Same-meter sites', kind: 'Real usage', why: 'The same meters in both years. This is the real change in how sites use electricity.' }
  };
  const KIND_TONE = { Structure: 'flat', 'Data basis': 'amber', 'Data issue': 'amber', 'Real usage': 'ink' };
  const COLUMNS = [{ key: 'name', label: 'Site', left: true }, { key: 'k25', label: 'kWh Sep 25' }, { key: 'k26', label: 'kWh Sep 26' }, { key: 'delta', label: 'kWh change' }, { key: 'pct', label: 'Change' }];
  const TOP = 5, LIMIT = 8;
  const NOT_MEASURED = [
    { t: 'Weather', d: 'A hotter September raises air-conditioning load. This needs temperature data.' },
    { t: 'Operating hours and showtimes', d: 'More or longer screenings raise the load. This needs the schedule per site.' },
    { t: 'Equipment changes', d: 'New or replaced AC, chillers or lighting change the base load. This needs the engineering log.' },
    { t: 'Shared mall load', d: 'Where the mall bills common areas, part of the kWh is not our own use. This needs the allocation rule.' }
  ];

  const state = { step: 'new', days: 30, expand: false };
  let view = null;

  /* ---------- ViewModel builders ---------- */

  function headline(B, C) {
    const newStep = B.steps.find(s => s.key === 'new');
    const lead = (B.net > 0 && newStep.share >= 0.5)
      ? { tpl: 'Invoice kWh is ' + pct(B.pct) + ' vs Sep 2025, but ' + abs(newStep.share) + ' of the net rise comes from ' + newStep.n + ' new sites.' }
      : { tpl: 'Invoice kWh is ' + pct(B.pct) + ' vs Sep 2025 (' + sgn(B.net) + ' kWh).' };
    const sub = C.sites ? 'On ' + C.sites + ' sites with the same meters, kWh is ' + pct(C.kChg) + ' while admits are ' + pct(C.aChg) + '. Each admit now uses ' + dec(C.i26) + ' kWh (' + pct(C.iChg) + ').' : '';
    return { tone: tone(B.pct), lead: lead.tpl, sub };
  }

  function bridge(B) {
    let run = 0;
    const bars = B.steps.map(st => {
      const from = run; run += st.delta;
      return { key: st.key, label: STEPS[st.key].label, from, to: run, tone: tone(st.delta), text: sgn(st.delta) };
    });
    bars.push({ key: 'net', label: 'Net change', from: 0, to: B.net, tone: 'net', text: sgn(B.net) });
    return { bars, unit: 'kWh', title: 'Change in invoice kWh, Sep 2026 vs Sep 2025' };
  }

  function stepList(B) {
    return B.steps.map(st => {
      const d = STEPS[st.key];
      return {
        key: st.key, label: d.label, kind: d.kind, kindTone: KIND_TONE[d.kind], active: state.step === st.key,
        value: sgn(st.delta), tone: tone(st.delta), width: Math.max(2, Math.min(100, Math.abs(st.share || 0) * 100)),
        meta: (st.n === 1 ? st.n + ' site' : st.n + ' sites') + ' · ' + abs(st.share) + ' of the net change'
      };
    });
  }

  function stepDetail() {
    const d = STEPS[state.step], all = interactor.stepSites(state.step);
    const capped = !state.expand && all.length > LIMIT;
    return {
      title: d.label, why: d.why,
      columns: COLUMNS,
      rows: (capped ? all.slice(0, LIMIT) : all).map(r => ({
        no: r.site.no, name: r.site.name, k25: r.site.k25 > 0 ? int(r.site.k25) : '–', k26: int(r.site.k26),
        delta: { text: sgn(r.delta), tone: tone(r.delta) }, pct: { text: r.pct == null ? 'New' : pct(r.pct), tone: tone(r.pct) },
        extra: r.added > 0 ? 'Includes ' + int(r.added) + ' kWh from the extra meter.' : '', note: r.site.note || '',
        canOpenDaily: router.hasDaily(r.site.no)
      })),
      more: all.length > LIMIT ? { expanded: state.expand, label: state.expand ? 'Show fewer sites' : 'Show all ' + all.length + ' sites' } : null
    };
  }

  function clean(C) {
    return {
      kpis: [
        { label: 'kWh, same meters', value: pct(C.kChg), tone: tone(C.kChg), sub: int(C.k26) + ' vs ' + int(C.k25) + ' in Sep 2025' },
        { label: 'Admits', value: pct(C.aChg), tone: 'flat', sub: int(C.a26) + ' vs ' + int(C.a25) + ' in Sep 2025' },
        { label: 'kWh per admit', value: dec(C.i26), tone: tone(C.iChg), sub: pct(C.iChg) + ' from ' + dec(C.i25) + ' in Sep 2025' },
        { label: 'kWh per billing day', value: pct(C.perDay), tone: tone(C.perDay), sub: 'Sep 2025 periods averaged ' + dec(C.d25, 1) + ' days, against ' + C.days + ' days assumed for Sep 2026' }
      ],
      days: [30, 31].map(v => ({ v, label: v + ' days', active: v === state.days })),
      sites: C.sites
    };
  }

  function admitsEffect(Ea) {
    const bars = Ea.thirds.map((t, i) => ({
      label: ['Third of sites where admits fell most', 'Middle third', 'Third of sites where admits rose most'][i],
      n: t.n, a: pct(t.aChg), k: pct(t.kChg), aw: Math.min(100, Math.abs(t.aChg) / 0.5 * 100), kw: Math.min(100, Math.abs(t.kChg) / 0.5 * 100),
      aTone: 'flat', kTone: tone(t.kChg)
    }));
    return {
      lead: Ea.slope == null ? '' : 'A 10% change in admits moves kWh by only about ' + dec(Ea.slope * 10, 1) + '%. Around ' + abs(Ea.fixedShare) + ' of the load does not follow admits.',
      bars, basis: Ea.n
    };
  }

  function concentration(Co) {
    const mx = Math.max.apply(null, Co.top.map(t => t.delta).concat([1]));
    return {
      lead: 'The typical site did not move: the median change is ' + pct(Co.medianPct) + ', with ' + Co.up + ' sites up and ' + Co.down + ' down.',
      sub: 'The top ' + Co.top.length + ' sites add ' + int(Co.topUp) + ' kWh, ' + abs(Co.topUp / Co.grossUp) + ' of all kWh added by rising sites.',
      rows: Co.top.map(t => ({ no: t.site.no, name: t.site.name, value: sgn(t.delta), sub: pct(t.pct) + ' vs Sep 2025', width: Math.max(2, t.delta / mx * 100), flag: t.site.flag === 'estimated' ? 'Admits estimated' : '' }))
    };
  }

  function verify(G, B) {
    const items = [];
    const catOf = {}; B.steps.forEach(s => s.sites.forEach(no => { catOf[no] = s.key; }));
    interactor.stepSites('basis').forEach(r => {
      if (r.site.flag === 'unreliable') items.push({ kind: 'CT change', site: r.site.name, no: r.site.no, detail: 'The new reading is not comparable with last year’s. Wait for engineering to confirm the billing basis.' });
    });
    interactor.stepSites('incomplete').forEach(r => items.push({ kind: 'Missing meter', site: r.site.name, no: r.site.no, detail: 'A meter billed last year has no kWh this year, so the drop is not a saving. Check the invoice.' }));
    G.rows.forEach(r => items.push({ kind: 'Invoice gap', site: r.site.name, no: r.site.no, detail: 'The daily file shows ' + int(r.site.daily26) + ' kWh against ' + int(r.site.k26) + ' on the invoice (' + pct(r.ratio - 1, 0) + '). The invoice may be missing a meter.' }));
    interactor.stepSites('new').forEach(r => { if (r.site.a25 != null) items.push({ kind: 'Admits', site: r.site.name, no: r.site.no, detail: 'Admits exist for Sep 2025 but there is no kWh. If the site opened later, the Sep 2025 admits may be misrecorded.' }); });
    interactor.stepSites('like').concat(interactor.stepSites('extra')).forEach(r => { if (r.site.flag === 'estimated') items.push({ kind: 'Admits', site: r.site.name, no: r.site.no, detail: 'Admits for this site are estimated, so kWh per admit is approximate.' }); });
    return {
      summary: G.rows.length ? 'The daily file is above the invoice at ' + G.rows.length + ' sites by ' + int(G.missing) + ' kWh in total (' + abs(G.baseShare, 1) + ' of last September’s base).' : '',
      items
    };
  }

  function buildVM() {
    const B = interactor.bridge(), C = interactor.clean(state.days);
    return {
      meta: interactor.meta(), headline: headline(B, C), bridge: bridge(B), steps: stepList(B), detail: stepDetail(),
      clean: clean(C), admits: admitsEffect(interactor.elasticity()), concentration: concentration(interactor.concentration(TOP)),
      verify: verify(interactor.gaps(), B), notMeasured: NOT_MEASURED
    };
  }

  /* ---------- lifecycle and view events ---------- */
  const render = force => view && view.render(buildVM(), force === true);
  return {
    state, buildVM,
    attach(v) { view = v; v.bind(this); render(); },
    refresh() { render(true); },
    onStep(k) { if (!STEPS[k]) return; state.step = k; state.expand = false; render(); },     // always select, never toggle
    onDays(d) { state.days = +d === 31 ? 31 : 30; render(); },
    onToggleMore() { state.expand = !state.expand; render(); },
    onOpenDaily(no) { router.openDaily(no); }
  };
};
if (typeof module !== 'undefined') module.exports = DriversPresenter;

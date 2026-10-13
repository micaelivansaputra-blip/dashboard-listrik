/* ============================================================================
   ADMITS module · INTERACTOR
   The use cases. Knows the business rules (via Entity) and where data comes
   from (via a gateway), but nothing about screens or formatting.
   Everything it returns is raw numbers, so it can be unit-tested in Node.
   ========================================================================== */
const AdmitsInteractor = function (gateway, E) {
  const data = gateway.load();
  const sites = data.sites.map(E.site);

  const sum = (rows, f) => rows.reduce((t, r) => t + f(r), 0);
  const analyzed = opts => sites.map(s => E.analyze(s, opts));
  const compared = opts => analyzed(opts).filter(r => r.comparable);

  /** Headline numbers for the like-for-like set. */
  function summary(opts) {
    const rows = compared(opts);
    const a25 = sum(rows, r => r.site.a25), a26 = sum(rows, r => r.site.a26);
    const k25 = sum(rows, r => r.site.k25), k26 = sum(rows, r => r.site.k26);
    const i25 = E.intensity(k25, a25), i26 = E.intensity(k26, a26);

    // Admits-only coverage, shown so nobody mistakes the raw 59-site total for a trend.
    const both = sites.filter(s => E.num(s.a25) && E.num(s.a26));
    const withA26 = sites.filter(s => E.num(s.a26));
    const withA25 = sites.filter(s => E.num(s.a25));
    return {
      sites: rows.length,
      a25, a26, aChg: E.change(a25, a26),
      k25, k26, kChg: E.change(k25, k26),
      i25, i26, iChg: E.change(i25, i26),
      concernKwh: sum(rows.filter(r => r.quadrant === 'concern'), r => r.kDelta),
      coverage: {
        total: sites.length,
        admitsBoth: { sites: both.length, a25: sum(both, s => s.a25), a26: sum(both, s => s.a26) },
        admitsAll26: { sites: withA26.length, a26: sum(withA26, s => s.a26) },
        admitsAll25: { sites: withA25.length, a25: sum(withA25, s => s.a25) },
        newSites: sites.filter(s => E.status(s) === 'new').map(s => s.name),
        noInvoice: sites.filter(s => E.status(s) === 'noinvoice').map(s => s.name),
        unreliable: sites.filter(s => E.status(s) === 'unreliable').map(s => s.name)
      }
    };
  }

  /** How many sites fall in each quadrant. */
  function counts(opts) {
    const c = { concern: 0, 'both-down': 0, 'both-up': 0, saving: 0, steady: 0, nodata: 0, all: sites.length };
    analyzed(opts).forEach(r => { if (r.comparable) c[r.quadrant]++; else c.nodata++; });
    return c;
  }

  const KEY = {
    name: r => r.site.name, a26: r => r.site.a26, aChg: r => r.aChg,
    k26: r => r.site.k26, kChg: r => r.kChg, i26: r => r.i26, iChg: r => r.iChg, kDelta: r => r.kDelta
  };

  /**
   * Table rows. q = { filter, query, sortKey, sortDir, thr, excludeUnreliable }
   * filter is 'all', 'nodata' or a quadrant name. Rows without data sort last.
   */
  function list(q) {
    const o = q || {};
    const text = (o.query || '').trim().toLowerCase();
    let rows = analyzed(o);
    if (o.filter && o.filter !== 'all') rows = rows.filter(r => o.filter === 'nodata' ? !r.comparable : r.quadrant === o.filter);
    if (text) rows = rows.filter(r => (r.site.no + ' ' + r.site.name).toLowerCase().includes(text));
    const get = KEY[o.sortKey] || KEY.kDelta, dir = o.sortDir === 'asc' ? 1 : -1;
    return rows.sort((x, y) => {
      const a = get(x), b = get(y);
      if (a == null && b == null) return x.site.no - y.site.no;
      if (a == null) return 1;
      if (b == null) return -1;
      const d = typeof a === 'string' ? a.localeCompare(b) : a - b;
      return d ? d * dir : x.site.no - y.site.no;
    });
  }

  /** Sites whose admits fell while kWh rose, biggest kWh increase first. */
  function concern(opts, limit) {
    const rows = compared(opts).filter(r => r.quadrant === 'concern').sort((a, b) => b.kDelta - a.kDelta);
    return limit ? rows.slice(0, limit) : rows;
  }

  /** Points for the scatter chart. */
  function scatter(opts) {
    return compared(opts).map(r => ({ no: r.site.no, name: r.site.name, x: r.aChg, y: r.kChg, quadrant: r.quadrant, row: r }));
  }

  function find(no, opts) {
    const s = sites.find(x => x.no === no);
    return s ? E.analyze(s, opts) : null;
  }

  return { meta: () => data.meta, summary, counts, list, concern, scatter, find };
};
if (typeof module !== 'undefined') module.exports = AdmitsInteractor;

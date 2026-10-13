/* ============================================================================
   DRIVERS module · INTERACTOR
   Use cases: the bridge from last September's kWh to this September's, the clean
   like-for-like view, how much admits really move kWh, and what to verify.
   Returns raw numbers only. No formatting, no DOM.
   ========================================================================== */
const DriversInteractor = function (gateway, E) {
  const data = gateway.load();
  const sites = data.sites.map(E.site);
  const cats = sites.map(s => ({ s, cat: E.category(s) }));
  const STEPS = ['new', 'basis', 'extra', 'incomplete', 'like'];
  // Only an extra meter is taken out of this year's kWh. A replaced meter (CT change) is the same load, read a new way.
  const adj = c => c.cat === 'extra' ? E.addedKwh(c.s) : 0;

  /** Net change split into one step per cause. The steps add up to the net change exactly. */
  function bridge() {
    const start = E.sum(cats, c => c.s.k25), end = E.sum(cats, c => c.s.k26);
    const steps = STEPS.map(key => {
      const rows = cats.filter(c => c.cat === key);
      return { key, n: rows.length, delta: E.sum(rows, c => c.s.k26 - c.s.k25), sites: rows.map(c => c.s.no) };
    });
    const net = end - start;
    return { start, end, net, pct: E.change(start, end), steps: steps.map(st => Object.assign(st, { share: net ? st.delta / net : null })) };
  }

  /** Sites inside one step, biggest absolute effect first. */
  function stepSites(key) {
    return cats.filter(c => c.cat === key).map(c => ({
      site: c.s, delta: c.s.k26 - c.s.k25, pct: E.change(c.s.k25, c.s.k26), added: adj(c)
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  /**
   * Clean like-for-like: same meters, admits in both years, kWh of any new meter taken out.
   * `days` (optional) re-expresses the change per billing day, assuming this September had that many days.
   */
  function clean(days) {
    const rows = cats.filter(c => E.clean(c.s, c.cat)).map(c => ({ s: c.s, k26: c.s.k26 - adj(c) }));
    const k25 = E.sum(rows, r => r.s.k25), k26 = E.sum(rows, r => r.k26), a25 = E.sum(rows, r => r.s.a25), a26 = E.sum(rows, r => r.s.a26);
    const d25 = billingDays();
    const kChg = E.change(k25, k26);
    return {
      sites: rows.length, k25, k26, a25, a26, kChg, aChg: E.change(a25, a26),
      i25: k25 / a25, i26: k26 / a26, iChg: E.change(k25 / a25, k26 / a26),
      perDay: (days && d25 && kChg != null) ? (1 + kChg) * d25 / days - 1 : null, d25, days: days || null
    };
  }

  /** kWh-weighted length of last September's billing periods, in days. */
  function billingDays() {
    const rows = sites.filter(s => s.d25 && s.k25 > 0);
    const w = E.sum(rows, s => s.k25);
    return w ? E.sum(rows, s => s.d25 * s.k25) / w : null;
  }

  /** How strongly kWh follows admits across the clean sites, and the same story in thirds. */
  function elasticity() {
    const rows = cats.filter(c => E.clean(c.s, c.cat)).map(c => ({ s: c.s, k26: c.s.k26 - adj(c) }));
    const x = rows.map(r => E.change(r.s.a25, r.s.a26)), y = rows.map(r => E.change(r.s.k25, r.k26));
    const fit = E.ols(x, y);
    const order = rows.map((r, i) => i).sort((i, j) => x[i] - x[j]), t = Math.floor(order.length / 3);
    const parts = [order.slice(0, t), order.slice(t, order.length - t), order.slice(order.length - t)].map(ix => {
      const rs = ix.map(i => rows[i]);
      return { n: rs.length, aChg: E.change(E.sum(rs, r => r.s.a25), E.sum(rs, r => r.s.a26)), kChg: E.change(E.sum(rs, r => r.s.k25), E.sum(rs, r => r.k26)) };
    });
    return { n: rows.length, slope: fit && fit.slope, intercept: fit && fit.intercept, r2: fit && fit.r2, robust: E.theilSen(x, y), thirds: parts, fixedShare: fit ? 1 - fit.slope : null };
  }

  /** Is the increase broad or carried by a few sites? Looks at same-meter sites only. */
  function concentration(topN) {
    const rows = cats.filter(c => c.cat === 'like').map(c => ({ s: c.s, delta: c.s.k26 - c.s.k25, pct: E.change(c.s.k25, c.s.k26) }));
    const up = rows.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta);
    const top = up.slice(0, topN || 5);
    return {
      sites: rows.length, up: up.length, down: rows.filter(r => r.delta < 0).length,
      medianPct: E.median(rows.map(r => r.pct)), grossUp: E.sum(up, r => r.delta), topUp: E.sum(top, r => r.delta),
      top: top.map(r => ({ site: r.s, delta: r.delta, pct: r.pct }))
    };
  }

  /** Sites where the daily file is far above the invoice: the invoice may still be missing a meter. */
  function gaps() {
    const rows = sites.map(s => ({ s, ratio: E.dailyGap(s) })).filter(r => r.ratio).sort((a, b) => b.ratio - a.ratio);
    return { rows: rows.map(r => ({ site: r.s, ratio: r.ratio, missing: r.s.daily26 - r.s.k26 })), missing: E.sum(rows, r => r.s.daily26 - r.s.k26), baseShare: E.sum(rows, r => r.s.daily26 - r.s.k26) / E.sum(cats, c => c.s.k25) };
  }

  return { meta: () => data.meta, bridge, stepSites, clean, elasticity, concentration, gaps, billingDays };
};
if (typeof module !== 'undefined') module.exports = DriversInteractor;

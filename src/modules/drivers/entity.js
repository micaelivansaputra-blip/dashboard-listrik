/* ============================================================================
   DRIVERS module · ENTITY
   Pure rules that explain WHY invoice kWh changed between two Septembers.
   A site is classified from its meters, not from a hand-made list.
   No DOM, no formatting, no I/O.
   ========================================================================== */
const DriversEntity = (function () {
  const num = v => typeof v === 'number' && isFinite(v);
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const SMALL = 0.05;          // a meter that adds or drops less than 5% of last year's kWh is noise, not a driver
  const GAP = 0.15;            // daily file is "far above" the invoice when it is more than 15% higher

  /** Raw row (+ admits fields joined in by the gateway) -> Site. Meters with no kWh in either year are dropped. */
  function site(raw) {
    const meters = (raw.meters || []).filter(m => (m.k25 || 0) > 0 || (m.k26 || 0) > 0).map(m => ({ t: m.t, ct: m.ct, k25: m.k25 || 0, k26: m.k26 || 0 }));
    return Object.freeze({
      no: raw.no, name: raw.name, meters,
      k25: sum(meters, m => m.k25), k26: sum(meters, m => m.k26),
      a25: num(raw.a25) ? raw.a25 : null, a26: num(raw.a26) ? raw.a26 : null,
      d25: num(raw.d25) ? raw.d25 : null, daily26: num(raw.daily26) ? raw.daily26 : null,
      flag: raw.flag || '', note: raw.note || ''
    });
  }

  /**
   * Why did this site's kWh change? One category per site, so the pieces add up exactly.
   *  new         no kWh last September (the site opened, or the invoice is missing)
   *  basis       the same kind of meter now has a different CT (billing basis changed)
   *  extra       a meter appeared that last year's base did not have
   *  incomplete  a meter that was billed last year has no kWh this year, with no replacement
   *  like        the same meters in both years
   */
  function category(s) {
    if (!(s.k25 > 0)) return 'new';
    const key = m => m.t;
    const by = (y, f) => s.meters.filter(m => m[y] > 0 && f(m));
    const dropped = s.meters.filter(m => m.k25 > 0 && m.k26 === 0), added = s.meters.filter(m => m.k26 > 0 && m.k25 === 0);
    const replaced = dropped.some(d => added.some(a => key(a) === key(d) && a.ct !== d.ct));
    if (replaced) return 'basis';
    const addedKwh = sum(added, m => m.k26), droppedKwh = sum(dropped, m => m.k25);
    if (addedKwh / s.k25 >= SMALL) return 'extra';
    if (droppedKwh / s.k25 >= SMALL && !added.length) return 'incomplete';
    return 'like';
  }

  /** kWh that belong to meters absent from last year's base. */
  const addedKwh = s => sum(s.meters.filter(m => m.k25 === 0 && m.k26 > 0), m => m.k26);

  /** Relative change, or null. */
  const change = (a, b) => (num(a) && num(b) && a > 0) ? b / a - 1 : null;

  /**
   * Is this site safe to use in a clean like-for-like comparison?
   * Sites that were not comparable on paper are out; a CT change counts only when nobody doubts the new reading.
   */
  function clean(s, cat) {
    if (s.a25 == null || s.a26 == null || !(s.a25 > 0) || !(s.a26 > 0)) return false;
    if (cat === 'like' || cat === 'extra') return true;
    return cat === 'basis' && s.flag !== 'unreliable';
  }

  /** Daily file well above the invoice means the invoice may be incomplete. Returns the ratio, or null. */
  function dailyGap(s) {
    if (!num(s.daily26) || !(s.k26 > 0)) return null;
    const r = s.daily26 / s.k26;
    return r > 1 + GAP ? r : null;
  }

  /** Ordinary least squares y = a + b x, plus r squared. */
  function ols(xs, ys) {
    const n = xs.length; if (n < 3) return null;
    const mx = sum(xs, x => x) / n, my = sum(ys, y => y) / n;
    let sxx = 0, sxy = 0, syy = 0;
    xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; });
    if (!sxx || !syy) return null;
    return { slope: sxy / sxx, intercept: my - sxy / sxx * mx, r2: sxy * sxy / (sxx * syy) };
  }

  /** Theil-Sen slope: the median of all pairwise slopes. Barely moved by a few extreme sites. */
  function theilSen(xs, ys) {
    const s = [];
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (Math.abs(xs[j] - xs[i]) > 1e-9) s.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
    return median(s);
  }

  function median(a) {
    if (!a.length) return null;
    const b = a.slice().sort((x, y) => x - y), m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }

  return { num, site, category, addedKwh, change, clean, dailyGap, ols, theilSen, median, sum, GAP };
})();
if (typeof module !== 'undefined') module.exports = DriversEntity;

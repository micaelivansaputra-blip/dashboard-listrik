/* ============================================================================
   ADMITS module · ENTITY
   Plain data and pure business rules. No DOM, no formatting, no I/O.
   A site is one row of the dataset: admits and invoice kWh for two Septembers.
   ========================================================================== */
const AdmitsEntity = (function () {
  const num = v => typeof v === 'number' && isFinite(v);
  const titleCase = s => String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  /** Raw dataset row -> immutable Site. Missing numbers become null, never 0. */
  function site(raw) {
    return Object.freeze({
      no: raw.no,
      name: titleCase(raw.name),
      a25: num(raw.a25) ? raw.a25 : null,   // admits, Sep 2025
      a26: num(raw.a26) ? raw.a26 : null,   // admits, Sep 2026
      k25: num(raw.k25) ? raw.k25 : null,   // invoice kWh, Sep 2025
      k26: num(raw.k26) ? raw.k26 : null,   // invoice kWh, Sep 2026
      flag: raw.flag || '',                 // '' | 'unreliable' | 'estimated' | 'meter'
      note: raw.note || ''
    });
  }

  /** Relative change from -> to, or null when it cannot be computed. */
  const change = (from, to) => (num(from) && num(to) && from > 0) ? to / from - 1 : null;

  /** kWh per admit, or null. */
  const intensity = (kwh, admits) => (num(kwh) && num(admits) && admits > 0) ? kwh / admits : null;

  const hasAdmits = s => num(s.a25) && num(s.a26) && s.a25 > 0 && s.a26 > 0;
  const hasKwh = s => num(s.k25) && num(s.k26) && s.k25 > 0 && s.k26 > 0;

  /**
   * Why a site can or cannot be compared.
   *  ok          both years of admits and kWh
   *  unreliable  comparable on paper, but the kWh basis changed (CT / meter replacement)
   *  new         no Sep 2025 admits: the site opened after last September
   *  noinvoice   admits exist, but an invoice is missing in one of the years
   */
  function status(s) {
    if (!num(s.a25)) return 'new';
    if (!hasKwh(s)) return 'noinvoice';
    if (s.flag === 'unreliable') return 'unreliable';
    return 'ok';
  }

  /** A site enters the like-for-like comparison when it has all four numbers. */
  const comparable = (s, opts) => {
    const st = status(s);
    return st === 'ok' || (st === 'unreliable' && !(opts && opts.excludeUnreliable));
  };

  /**
   * Quadrant of one site. A change counts only when it is larger than `thr`
   * (a fraction, 0.02 = 2%); smaller moves are "steady".
   *  concern    admits down, kWh up
   *  both-down  admits down, kWh down
   *  both-up    admits up, kWh up
   *  saving     admits up, kWh down
   *  steady     one of the two moved less than the threshold
   */
  function quadrant(aChg, kChg, thr) {
    if (aChg == null || kChg == null) return null;
    const t = thr || 0;
    const aDown = aChg < -t, aUp = aChg > t, kDown = kChg < -t, kUp = kChg > t;
    if (aDown && kUp) return 'concern';
    if (aDown && kDown) return 'both-down';
    if (aUp && kUp) return 'both-up';
    if (aUp && kDown) return 'saving';
    return 'steady';
  }

  /** Everything the other layers need to know about one site. */
  function analyze(s, opts) {
    const o = opts || {};
    const ok = comparable(s, o);
    const aChg = change(s.a25, s.a26);
    const kChg = ok ? change(s.k25, s.k26) : null;
    const i25 = ok ? intensity(s.k25, s.a25) : null;
    const i26 = ok ? intensity(s.k26, s.a26) : null;
    return {
      site: s,
      status: status(s),
      comparable: ok,
      aChg,
      kChg,
      i25, i26,
      iChg: change(i25, i26),
      kDelta: ok ? s.k26 - s.k25 : null,
      quadrant: ok ? quadrant(aChg, kChg, o.thr) : null
    };
  }

  return { num, site, change, intensity, status, comparable, quadrant, analyze };
})();
if (typeof module !== 'undefined') module.exports = AdmitsEntity;

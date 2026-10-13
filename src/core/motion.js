/* ============================================================================
   Motion: every animation in one place, so it can be switched off in one place.
   Everything here is progressive. With reduced motion, or if something fails,
   the dashboard looks the same, just without the movement.
   ========================================================================== */
const ANIM = (function () {
  // Chart.js animation config, shared by every chart.
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 900, easing: 'easeOutQuart' };
})();

const Motion = (function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const ACTIVE = '[aria-pressed="true"],[aria-current="true"]';

  /* ---------- 1. a thumb that glides under the active button of a segmented control ---------- */
  const track = new WeakMap();
  function thumbOf(el) {
    let st = track.get(el); if (!st) { st = { x: 0, y: 0, w: 0, h: 0 }; track.set(el, st); }
    let th = el.querySelector(':scope > .thumb');
    if (!th) {
      th = document.createElement('i'); th.className = 'thumb'; th.setAttribute('aria-hidden', 'true');
      th.style.setProperty('--tx', st.x + 'px'); th.style.setProperty('--ty', st.y + 'px'); th.style.setProperty('--tw', st.w + 'px'); th.style.setProperty('--th', st.h + 'px');
      el.insertBefore(th, el.firstChild); el.classList.add('th');
    }
    return { th, st };
  }
  function place(el) {
    const a = el.querySelector(':scope > button' + ACTIVE.replace(/,/g, ',:scope > button'));
    if (!a || !a.offsetWidth) { el.classList.remove('th-on'); return; }
    const { th, st } = thumbOf(el);
    const fresh = !st.w;                                             // first placement (or coming back from display:none): no glide
    th.classList.toggle('jump', fresh);
    st.x = a.offsetLeft; st.y = a.offsetTop; st.w = a.offsetWidth; st.h = a.offsetHeight;
    th.style.setProperty('--tx', st.x + 'px'); th.style.setProperty('--ty', st.y + 'px'); th.style.setProperty('--tw', st.w + 'px'); th.style.setProperty('--th', st.h + 'px');
    el.classList.add('th-on');
    if (fresh) requestAnimationFrame(() => th.classList.remove('jump'));
  }
  const watched = new WeakSet();
  function watch(el) {
    if (watched.has(el)) return; watched.add(el);
    let raf = 0, busy = false;
    const upd = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; busy = true; place(el); setTimeout(() => { busy = false; }, 0); }); };
    new MutationObserver(m => { if (busy && m.every(x => [...x.addedNodes, ...x.removedNodes].every(n => n.classList && n.classList.contains('thumb')))) return; upd(); })
      .observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-current', 'hidden'] });
    if (window.ResizeObserver) new ResizeObserver(() => { const st = track.get(el); if (st && !el.offsetWidth) st.w = 0; upd(); }).observe(el);
    upd();
  }
  function scan() { $$('.seg, .apptabs, #pgNav, #pgSub').forEach(watch); }

  /* ---------- 2. numbers count up when a page opens ---------- */
  const COUNT = '.kpi .v, .mk b, .t-big, .pc .big, .seg2 b, .ms b, .score-h b';
  function fmt(v, dec, TH, DEC) {
    const s = Math.abs(v).toFixed(dec), p = s.split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, TH) + (p[1] ? DEC + p[1] : '');
  }
  function count(root) {
    if (reduce) return;
    const id = (window.I18N && I18N.get && I18N.get()) === 'id', TH = id ? '.' : ',', DEC = id ? ',' : '.';
    $$(COUNT, root).forEach(el => {
      if (el.__cu || el.children.length || !el.offsetParent) return;
      const txt = el.textContent, m = /^([+−-]?)(\d[\d.,]*)(%?)$/.exec(txt.trim());
      if (!m) return;
      const raw = m[2], k = raw.lastIndexOf(DEC);
      let dec = 0, num;
      if (k >= 0 && raw.length - k - 1 !== 3 || (k >= 0 && raw.indexOf(TH) < 0 && raw.split(DEC).length === 2 && raw.length - k - 1 !== 3)) { dec = raw.length - k - 1; num = parseFloat(raw.slice(0, k).split(TH).join('') + '.' + raw.slice(k + 1)); }
      else num = parseFloat(raw.split(TH).join('').replace(DEC, ''));
      if (!isFinite(num) || num === 0) return;
      el.__cu = true; el.setAttribute('data-notr', '');                // keep the translator away while the number is moving
      const t0 = performance.now(), D = 900 + Math.min(600, Math.log10(Math.abs(num) + 1) * 120);
      (function frame(now) {
        const p = Math.min(1, (now - t0) / D);
        if (p < 1) { el.textContent = m[1] + fmt(num * easeOutExpo(p), dec, TH, DEC) + m[3]; requestAnimationFrame(frame); }
        else { el.textContent = txt; el.removeAttribute('data-notr'); el.__cu = false; }
      })(t0);
    });
  }

  /* ---------- 3. cards below the fold rise in as they are scrolled into view ---------- */
  let io = null;
  const RV = '.card, .kpis, .mkpis, .tiles, .tbl-wrap, .prog';
  function reveal(sec) {
    if (reduce || !('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    const H = innerHeight;
    $$(RV, sec).forEach(el => {
      if (el.hasAttribute('data-rv') || el.parentElement.closest('[data-rv]') || !el.offsetParent) return;
      if (el.getBoundingClientRect().top < H * 0.9) return;           // already on screen: the CSS entrance handles it
      el.setAttribute('data-rv', ''); io.observe(el);
    });
  }

  /* ---------- 4. when a page opens ---------- */
  function play(sec) { if (!sec) return; count(sec); reveal(sec); }
  function visibleSections() { return $$('#v-elec > section, #payBody > section').filter(s => !s.classList.contains('pg-off') && s.offsetParent); }
  function start() {
    scan(); new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true });
    // a page opens when its section loses .pg-off
    const sections = $$('#v-elec > section, #payBody > section');
    const seen = new WeakMap();
    new MutationObserver(ms => ms.forEach(m => { const s = m.target; const on = !s.classList.contains('pg-off'); if (on && seen.get(s) === false) requestAnimationFrame(() => requestAnimationFrame(() => play(s))); seen.set(s, on); }))
      .observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sections.forEach(s => seen.set(s, !s.classList.contains('pg-off')));
    // the page bar gets a hairline once the page scrolls under it
    const bar = document.getElementById('pgbar'), sen = document.getElementById('pgSentinel');
    if (bar && sen && 'IntersectionObserver' in window) new IntersectionObserver(es => { bar.classList.toggle('stuck', !es[0].isIntersecting); const hd = document.querySelector('header.bar'); if (hd) hd.classList.toggle('stuck', !es[0].isIntersecting); }).observe(sen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scan);
    requestAnimationFrame(() => requestAnimationFrame(() => visibleSections().forEach(play)));
    addEventListener('beforeprint', () => $$('[data-rv]').forEach(e => e.classList.add('in')));
  }

  /* ---------- 5. light / dark with a circular reveal from the button ---------- */
  function themeSwitch(btn, change) {
    if (reduce || !document.startViewTransition) { change(); return; }
    try {
      const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(change);
      vt.ready.then(() => document.documentElement.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => { });
    } catch (e) { change(); }
  }

  return { start, play, scan, themeSwitch, count };
})();

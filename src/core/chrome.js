/* ============================================================================
   Chrome: the page frame. One top bar (brand, page tabs, controls), a language
   switch that drives the existing <select>, and a greeting + page title above
   the content. It only rearranges existing elements; no logic is duplicated.
   ========================================================================== */
const Chrome = (function () {
  const $ = id => document.getElementById(id);
  const GREET = {
    en: ['Good morning', 'Good afternoon', 'Good evening'],
    id: ['Selamat pagi', 'Selamat siang', 'Selamat sore'],
    es: ['Buenos días', 'Buenas tardes', 'Buenas noches']
  };
  function greet() {
    const l = ($('langSel') && $('langSel').value) || 'en', h = new Date().getHours();
    const i = h < 11 ? 0 : h < 15 ? 1 : h < 18 ? 2 : 2;
    let t = (GREET[l] || GREET.en)[i];
    if (l === 'id' && h >= 18) t = 'Selamat malam';
    if (l === 'id' && h >= 11 && h < 15) t = 'Selamat siang';
    if (l === 'id' && h >= 15 && h < 18) t = 'Selamat sore';
    if (l === 'en' && h >= 22) t = 'Good night';
    return t;
  }
  let head, gEl, aEl, tEl;
  function sync() {
    if (!head) return;
    const on = document.querySelector('#pgSub button[aria-current="true"]') || document.querySelector('#pgNav button[aria-current="true"]');
    const t = on ? (on.textContent || '').trim() : '';
    if (tEl.textContent !== t) tEl.textContent = t;
    const g = greet() + ' \u{1F44B}'; if (gEl.textContent !== g) gEl.textContent = g;
    const a = ($('asof') && $('asof').textContent || '').trim(); if (aEl.textContent !== a) aEl.textContent = a;
    head.hidden = !t || !!($('pgNav') && $('pgNav').hidden);
  }
  function start() {
    const bar = document.querySelector('header.bar'), inner = bar && bar.querySelector('.bar-in');
    if (!bar || !inner) return;
    // one sticky header: brand + page tabs + controls, with the section tabs underneath
    const nav = $('pgNav'), pgbar = $('pgbar'), brand = inner.querySelector('.brand');
    if (nav && brand) inner.insertBefore(nav, brand.nextSibling);
    if (pgbar) bar.appendChild(pgbar);
    // language: ID / EN / ES segmented control that drives the original select
    const sel = $('langSel');
    if (sel) {
      const seg = document.createElement('div'); seg.className = 'seg langseg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Language'); seg.setAttribute('data-notr', '');
      [['id', 'ID'], ['en', 'EN'], ['es', 'ES']].forEach(([v, l]) => {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = l;
        b.addEventListener('click', () => { if (sel.value === v) return; sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); mark(); });
        seg.appendChild(b);
      });
      const mark = () => Array.from(seg.children).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === sel.value)));
      sel.after(seg); sel.hidden = true; sel.classList.add('is-hidden'); mark();
      sel.addEventListener('change', () => { mark(); setTimeout(sync, 60); });
    }
    // greeting + page title
    head = document.createElement('div'); head.className = 'pagehead'; head.id = 'pageHead'; head.setAttribute('data-notr', '');
    head.innerHTML = '<div class="ph-line"><span class="ph-greet"></span><i class="ph-dot"></i><span class="ph-asof"></span></div><h2 class="ph-title"></h2>';
    gEl = head.querySelector('.ph-greet'); aEl = head.querySelector('.ph-asof'); tEl = head.querySelector('.ph-title');
    const anchor = $('updMsg'); anchor.parentNode.insertBefore(head, anchor);
    const mo = new MutationObserver(() => requestAnimationFrame(sync)), cfg = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-current', 'hidden'] };
    ['pgNav', 'pgSub', 'asof'].forEach(id => $(id) && mo.observe($(id), cfg));
    sync();
  }
  return { start, sync };
})();

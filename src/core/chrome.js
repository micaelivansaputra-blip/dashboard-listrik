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
    // the section heading repeats the page title: keep only its small caption
    document.querySelectorAll('section > .sec-head:first-child').forEach(sh => {
      const h2 = sh.querySelector('h2'); if (!h2) return;
      let tn = h2.querySelector('.dupt');
      if (!tn) { const n0 = Array.from(h2.childNodes).find(n => n.nodeType === 3 && n.textContent.trim()); if (!n0) return; tn = document.createElement('span'); tn.className = 'dupt'; n0.replaceWith(tn); tn.appendChild(n0); }
      sh.classList.toggle('dup', !!t && tn.textContent.trim() === t);
    });
    if (typeof Buddy !== 'undefined' && Buddy.update) Buddy.update();
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
  /* ---- sidebar (wide screens): brand, dashboard switch and every page, grouped ---- */
  let side, snav, sideSig = '';
  function sideBuild() {
    side = document.createElement('aside'); side.className = 'sidebar'; side.id = 'sidebar'; side.setAttribute('aria-label', 'Navigation');
    side.innerHTML = '<div class="sb-top" id="sbTop"></div><nav class="snav" id="sideNav"></nav><div class="sb-foot" id="sbFoot"></div>';
    document.body.appendChild(side); snav = side.querySelector('#sideNav');
    const bar = document.querySelector('header.bar'), inner = bar.querySelector('.bar-in');
    const brand = inner.querySelector('.brand'), tabs = $('appTabs');
    const mk = el => { const a = document.createComment('slot'); el.parentNode.insertBefore(a, el); return a; };
    const aB = mk(brand), aT = mk(tabs), top = side.querySelector('#sbTop');
    const mq = matchMedia('(min-width:1100px)');
    const place = () => {
      if (mq.matches) { top.appendChild(brand); top.appendChild(tabs); document.body.classList.add('has-side'); }
      else { aB.after(brand); aT.after(tabs); document.body.classList.remove('has-side'); }
      window.dispatchEvent(new Event('resize'));
    };
    (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place)); place();
  }
  const ICON = { overview: 'overview', compare: 'compare', trends: 'trends', sites: 'sites', concerns: 'concerns', zoec: 'zoec', costs: 'costs' };
  function side_() {
    if (!side) return;
    const t = (typeof Pager !== 'undefined' && Pager.tree) ? Pager.tree() : [];
    const sig = JSON.stringify(t); if (sig === sideSig) return; sideSig = sig;
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    snav.innerHTML = t.map(g => '<div class="snav-h">' + esc(g.label) + '</div>' + g.items.map(i => '<button type="button" data-pg="' + i.id + '" data-g="' + (ICON[g.g] || g.g) + '" aria-current="' + i.on + '"><span>' + esc(i.label) + '</span></button>').join('')).join('');
  }
  const _start = start;
  function start2() { _start(); try { sideBuild(); side_(); } catch (e) { } }
  return { start: start2, sync, side: side_ };
})();

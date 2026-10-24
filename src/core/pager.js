/* ============================================================================
   CORE · Pager
   Shows one page at a time instead of one long scroll. Two levels:
     main bar   (#pgNav)  a few page groups
     sub bar    (#pgSub)  the sections inside the active group, only when there are 2 or more
   The original section buttons (#nav, #navPay) stay in the DOM but hidden. Their `hidden`
   flag still says whether a section exists (e.g. Month to Month needs history data), and
   their text is the label, so legacy code keeps working untouched.
   ========================================================================== */
const Pager = (function () {
  const GROUPS = {
    elec: [
      { id: 'overview', label: 'Overview', items: ['s-ringkasan', 's-tren'] },
      { id: 'compare', label: 'Compare', items: ['s-mom', 's-quarter', 's-hari'] },
      { id: 'sites', label: 'Sites', items: ['s-site', 's-week', 's-explore'] },
      { id: 'concerns', label: 'Concerns', items: ['s-cek', 's-track', 's-notes', 's-admits', 's-drivers'] },
      { id: 'zoec', label: 'Project ZOEC', items: ['s-program'] }
    ],
    pay: [
      { id: 'overview', label: 'Overview', items: ['p-mtd', 'p-sum'] },
      { id: 'trends', label: 'Trends', items: ['p-mon', 'p-wk'] },
      { id: 'sites', label: 'Sites', items: ['p-site'] },
      { id: 'costs', label: 'Costs', items: ['p-cost', 'p-how'] }
    ]
  };
  const cur = { elec: 's-ringkasan', pay: 'p-mtd' };       // page shown per dashboard
  const last = {};                                           // last section opened per group
  const $ = id => document.getElementById(id);
  const src = id => document.querySelector('#nav [data-t="' + id + '"],#navPay [data-t="' + id + '"]');
  const ok = id => { const b = src(id), s = $(id); return !!(b && s && !b.hidden && !s.hidden); };
  const label = id => { const b = src(id); return b ? b.textContent.trim() : id; };
  const groupOf = (app, id) => GROUPS[app].find(g => g.items.includes(id));
  let sig = '';

  function resizeCharts() {
    requestAnimationFrame(() => {
      try { Object.keys(charts).forEach(k => charts[k] && charts[k].resize && charts[k].resize()); } catch (e) { }
      window.dispatchEvent(new Event('resize'));
    });
  }

  function sync() { syncInner(); if (typeof Chrome !== 'undefined' && Chrome.side) Chrome.side(); }
  function tree() {
    const c = cur[APP];
    return GROUPS[APP].map(g => ({ g: g.id, label: g.label, items: g.items.filter(ok).map(id => ({ id, label: label(id), on: id === c })) })).filter(x => x.items.length);
  }
  function syncInner() {
    const app = APP, groups = GROUPS[app], all = groups.reduce((a, g) => a.concat(g.items), []);
    const avail = all.filter(ok);
    let c = cur[app]; if (!avail.includes(c)) c = avail[0] || null; cur[app] = c;
    all.forEach(id => { const s = $(id); if (s) s.classList.toggle('pg-off', id !== c); });

    const nav = $('pgNav'), sub = $('pgSub');
    const empty = !c || (app === 'pay' && $('payBody').hidden);
    nav.hidden = empty; $('pgbar').hidden = empty; if (empty) { sub.hidden = true; sig = ''; return; }
    const g = groupOf(app, c);
    const mains = groups.filter(x => x.items.some(ok)).map(x => {
      const open = x.items.includes(c) ? c : (x.items.includes(last[app + x.id]) && ok(last[app + x.id]) ? last[app + x.id] : x.items.find(ok));
      return { label: x.label, to: open, on: x === g, g: x.id };
    });
    const subs = g.items.filter(ok).map(id => ({ id, label: label(id), on: id === c }));
    const s = JSON.stringify([app, mains, subs]);
    if (s === sig) return; sig = s;
    nav.innerHTML = mains.map(m => `<button type="button" data-pg="${m.to}" data-g="${m.g}" aria-current="${m.on}"><span>${m.label}</span></button>`).join('');
    sub.hidden = subs.length < 2;
    sub.innerHTML = subs.length < 2 ? '' : subs.map(x => `<button type="button" data-pg="${x.id}" aria-current="${x.on}">${x.label}</button>`).join('');
  }

  function show(id, keepScroll) {
    if (!ok(id) || !GROUPS[APP].some(g => g.items.includes(id))) return false;
    cur[APP] = id; last[APP + groupOf(APP, id).id] = id;
    sync();
    if (APP === 'elec') { try { history.replaceState(null, '', '#' + id.slice(2)); } catch (e) { } }
    if (!keepScroll) { const h = document.querySelector('header.bar').offsetHeight; if (window.scrollY > h) window.scrollTo(0, h); }   // keep the page bar in view, no jump to the very top
    resizeCharts();
    return true;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('#pgNav [data-pg],#pgSub [data-pg],#sideNav [data-pg],#ovLists [data-pg]');
    if (b) show(b.dataset.pg);
  });
  GROUPS.elec.forEach(g => g.items.forEach(id => Router.register(id.slice(2), id)));

  return { sync, show, tree, has: id => GROUPS[APP].some(g => g.items.includes(id)), current: () => cur[APP], groups: GROUPS };
})();

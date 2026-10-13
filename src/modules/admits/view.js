/* ============================================================================
   ADMITS module · VIEW
   Passive. Draws whatever ViewModel it is given and forwards user input to the
   presenter. No business rules and no number formatting live here.
   `platform` injects the browser pieces (Chart.js, theme tokens, translation).
   ========================================================================== */
const AdmitsView = function (root, platform) {
  const P = platform;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = sel => root.querySelector(sel);
  let presenter = null, chart = null, lastVM = null;

  // Presentation-only mapping from quadrant to mark colour and shape (shape backs up colour for colour-blind readers).
  const MARK = {
    concern: { tok: '--up', shape: 'triangle' },
    'both-down': { tok: '--down', shape: 'circle' },
    'both-up': { tok: '--amber', shape: 'rect' },
    saving: { tok: '--blue', shape: 'rectRot' },
    steady: { tok: '--flat', shape: 'crossRot' }
  };
  const ARROW = { desc: '<i aria-hidden="true"> ▾</i>', asc: '<i aria-hidden="true"> ▴</i>', '': '' };

  /* ---------- static skeleton, built once ---------- */
  root.innerHTML = `
    <div class="sec-head"><h2>Admits vs kWh <small>Sep 2026 vs Sep 2025, invoice kWh</small></h2></div>
    <div class="card adm">
      <p class="adm-verdict" data-r="verdict"></p>
      <div class="ctl">
        <div class="f">Count a change when it is<div class="seg" data-r="thr" role="group" aria-label="Smallest change that counts"></div></div>
        <div class="f">Basis<div class="seg"><button type="button" data-r="excl" aria-pressed="false"></button></div></div>
      </div>
      <div class="mkpis" data-r="kpis"></div>
      <div class="grid2 adm-grid">
        <div class="card"><div class="ch"><div><h3>Every site, admits vs kWh</h3><span class="sub">One mark per site. Hollow marks are pinned to the edge of the chart.</span></div></div>
          <div class="chartbox adm-chart"><canvas data-r="canvas" role="img" aria-label="Scatter chart of the change in admits against the change in kWh for each site. The same data is in the table below."></canvas></div></div>
        <div class="card"><div class="ch"><div><h3>Biggest concerns</h3><span class="sub">Admits down while kWh went up, ranked by kWh added</span></div></div>
          <div class="cc adm-cc" data-r="concern"></div></div>
      </div>
      <div class="adm-tools">
        <div class="counts" data-r="filters" role="group" aria-label="Filter sites"></div>
        <label class="f xsearch" for="admQ">Search site<input id="admQ" type="search" data-r="q" placeholder="e.g. Manado"></label>
      </div>
      <p class="hint">Tap a column to sort, a status to filter, or a row for its details.</p>
      <div class="tbl-wrap"><table class="ptable atbl"><thead data-r="thead"></thead><tbody data-r="tbody"></tbody></table></div>
      <div class="adm-more" data-r="more"></div>
      <dl class="adm-cov" data-r="coverage"></dl>
      <p class="note">How to read it: admits are calendar September from the Man Hour Usage sheet, all formats. kWh comes from the electricity invoices (main meters times CT). An invoice period starts around the 23rd to 29th of the month before, so it does not line up exactly with calendar September, but both years follow the same pattern, so the year-on-year comparison holds.</p>
    </div>`;

  /* ---------- small renderers ---------- */
  const tone = t => `<span class="adm-n ${esc(t.tone)}">${esc(t.text)}</span>`;

  function renderVerdict(v) {
    const el = $('[data-r=verdict]'); el.className = 'adm-verdict ' + v.tone;
    const p = v.parts;
    el.textContent = p ? `Admits ${p.aVerb} ${p.aPct} ${p.but} electricity ${p.kVerb} ${p.kPct} across ${p.sites} like-for-like sites. Each admit now uses ${p.per} kWh, ${p.iVerb} ${p.iPct}.` : 'Not enough data to compare.';
  }

  function renderControls(c) {
    $('[data-r=thr]').innerHTML = c.thresholds.map(t => `<button type="button" data-thr="${t.v}" aria-pressed="${t.active}">${esc(t.label)}</button>`).join('');
    const b = $('[data-r=excl]'); b.textContent = c.excl.label; b.setAttribute('aria-pressed', c.excl.on);
  }

  function renderKpis(list) {
    $('[data-r=kpis]').innerHTML = list.map(k => `<div class="mk"><small>${esc(k.label)}</small><b class="${esc(k.tone)}">${esc(k.value)}</b><span>${esc(k.sub)}</span></div>`).join('');
  }

  function renderConcern(rows) {
    $('[data-r=concern]').innerHTML = rows.length ? rows.map(r => `
      <div class="crow" role="button" tabindex="0" data-adm="${r.no}">
        <div class="nm">${esc(r.name)}<small>${esc(r.sub)}</small><small>${esc(r.perAdmit)}</small>${r.flag ? `<span class="flag lo">${esc(r.flag)}</span>` : ''}</div>
        <div class="tr"><i class="${r.hot ? 'hi' : ''}" style="width:${r.width.toFixed(1)}%"></i></div>
        <div class="val">${esc(r.value)}<small>${esc(r.valueSub)}</small></div>
      </div>`).join('') : '<p class="hint">No site has fewer admits and more kWh with the current settings.</p>';
  }

  function renderFilters(list) {
    $('[data-r=filters]').innerHTML = list.map(f => `<button type="button" class="pill ${esc(f.tone)}" data-f="${esc(f.key)}" aria-pressed="${f.active}">${esc(f.label)} · ${f.count}</button>`).join('');
  }

  function renderTable(t) {
    $('[data-r=thead]').innerHTML = '<tr>' + t.columns.map(c => `<th class="${c.sorted ? 'sorted' : ''}" ${c.sorted ? `aria-sort="${c.sorted === 'asc' ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${c.key}"><span>${esc(c.label)}</span>${ARROW[c.sorted]}</button></th>`).join('') + '</tr>';
    $('[data-r=tbody]').innerHTML = t.rows.length ? t.rows.map(r => {
      const main = `<tr class="row" tabindex="0" data-adm="${r.no}" aria-expanded="${r.open}">
        <td><div class="sn"><i class="sd ${esc(r.status.tone)}"></i><span><b>${esc(r.name)}</b><small class="adm-st ${esc(r.status.tone)}">${esc(r.status.label)}</small>${r.flag ? `<span class="flag lo">${esc(r.flag)}</span>` : ''}</span></div></td>
        <td>${esc(r.a26)}</td><td>${tone(r.aChg)}</td><td>${esc(r.k26)}</td><td>${tone(r.kChg)}</td><td>${tone(r.kDelta)}</td><td>${esc(r.i26)}</td><td>${tone(r.iChg)}</td></tr>`;
      if (!r.open) return main;
      const d = r.detail;
      return main + `<tr class="adm-detail"><td colspan="8"><div class="adm-dbox">
        <dl>${d.lines.map(l => `<div><dt>${esc(l[0])}</dt><dd>${esc(l[1])}</dd></div>`).join('')}</dl>
        ${d.note ? `<p>${esc(d.note)}</p>` : ''}
        ${d.canOpenDaily ? `<button type="button" class="chipbtn" data-daily="${r.no}">Open daily chart</button>` : ''}</div></td></tr>`;
    }).join('') : '<tr><td colspan="8" class="adm-empty">No site matches.</td></tr>';
  }

  function renderMore(m) {
    $('[data-r=more]').innerHTML = m ? `<button type="button" class="chipbtn" data-more aria-expanded="${m.expanded}">${esc(m.label)}</button>` : '';
  }

  function renderCoverage(items) {
    $('[data-r=coverage]').innerHTML = items.map(i => `<div><dt>${esc(i.label)}</dt><dd>${esc(i.value)}</dd></div>`).join('');
  }

  /* ---------- chart ---------- */
  function renderChart(sc) {
    if (chart) { chart.destroy(); chart = null; }
    if (!P.Chart) return;
    const ink = P.css('--ink'), mu = P.css('--muted'), grid = P.css('--grid'), zero = P.css('--flat');
    const sets = sc.legend.map(l => {
      const m = MARK[l.q], col = P.css(m.tok), pts = sc.points.filter(p => p.q === l.q);
      return {
        label: l.label, data: pts.map(p => ({ x: p.x * 100, y: p.y * 100, p })), pointStyle: m.shape,
        pointBackgroundColor: pts.map(p => p.clipped ? 'transparent' : col + 'cc'), pointBorderColor: col, pointBorderWidth: 2,
        pointRadius: 6, pointHoverRadius: 9, hitRadius: 14
      };
    });
    const corner = {
      id: 'admCorner',
      afterDraw(ch) {
        const a = ch.chartArea, c = ch.ctx; if (a.right - a.left < 360) return; c.save(); c.font = "700 11.5px -apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif";
        const put = (txt, x, y, al, col) => { c.textAlign = al; c.textBaseline = y < a.top + 20 ? 'top' : 'bottom'; c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.css('--surface'); c.strokeText(P.tr(txt), x, y); c.fillStyle = col; c.fillText(P.tr(txt), x, y); };
        put('Admits down, kWh up', a.left + 8, a.top + 8, 'left', P.css('--up-ink'));
        put('Admits up, kWh up', a.right - 8, a.top + 8, 'right', mu);
        put('Both down', a.left + 8, a.bottom - 8, 'left', P.css('--down-ink'));
        put('Admits up, kWh down', a.right - 8, a.bottom - 8, 'right', P.css('--down-ink'));
        c.restore();
      }
    };
    const axis = (title, cap) => ({
      min: -cap * 100, max: cap * 100, title: { display: true, text: title, color: mu, font: { size: 12, weight: '600' } }, border: { display: false },
      grid: { color: c => c.tick.value === 0 ? zero : grid, lineWidth: c => c.tick.value === 0 ? 2 : 1 },
      ticks: { color: mu, maxTicksLimit: 7, callback: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%' }
    });
    const cfg = P.chartCfg({
      type: 'scatter', data: { datasets: sets }, plugins: [corner],
      options: {
        responsive: true, maintainAspectRatio: false, animation: ANIM, layout: { padding: { top: 4, right: 6 } },
        scales: { x: axis(sc.xTitle, sc.capX), y: axis(sc.yTitle, sc.capY) },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: mu, padding: 14 } },
          tooltip: { backgroundColor: ink, titleColor: P.css('--bg'), bodyColor: P.css('--bg'), cornerRadius: 12, padding: 12, usePointStyle: true, boxPadding: 5,
            callbacks: { title: c => c[0].raw.p.name, label: c => c.raw.p.tip.concat(c.raw.p.clipped ? ['Pinned to the chart edge'] : []) } }
        },
        onClick: (e, els) => { if (els.length) { const no = els[0].element.$context.raw.p.no; presenter.onPick(no); requestAnimationFrame(() => { const r = root.querySelector(`tr.row[data-adm="${no}"]`); if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); } },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
      }
    });
    chart = new P.Chart($('[data-r=canvas]'), cfg);
  }

  /* ---------- public surface used by the presenter ---------- */
  // Keep keyboard focus on the same control after its container is re-rendered.
  function focusSelector(el) {
    if (!el || !root.contains(el)) return null;
    if (el.hasAttribute && el.hasAttribute('data-more')) return '[data-more]';
    for (const a of ['adm', 'f', 'sort', 'thr', 'daily']) if (el.dataset && el.dataset[a] != null) return (a === 'adm' ? (el.matches('tr') ? 'tr.row' : '.crow') : '') + `[data-${a}="${el.dataset[a]}"]`;
    return el.matches('[data-r=excl]') ? '[data-r=excl]' : null;
  }

  let sig = '';
  function render(vm, force) {
    lastVM = vm;
    const sel = focusSelector(document.activeElement);
    const q = $('[data-r=q]'); if (q.value !== vm.query) q.value = vm.query;
    renderVerdict(vm.verdict); renderControls(vm.controls); renderKpis(vm.kpis); renderConcern(vm.concern);
    renderFilters(vm.filters); renderTable(vm.table); renderMore(vm.table.more); renderCoverage(vm.coverage);
    const s = JSON.stringify(vm.scatter);              // redraw the chart only when its data changed, or on a theme/language refresh
    if (force || s !== sig) { sig = s; renderChart(vm.scatter); }
    if (sel) { const n = root.querySelector(sel); if (n && n !== document.activeElement) n.focus({ preventScroll: true }); }
  }

  function bind(p) {
    presenter = p;
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-thr],[data-r=excl],[data-f],[data-sort],[data-daily],[data-more],[data-adm]');
      if (!t || !root.contains(t)) return;
      if (t.dataset.thr != null) presenter.onThreshold(t.dataset.thr);
      else if (t.matches('[data-r=excl]')) presenter.onExclude(t.getAttribute('aria-pressed') !== 'true');
      else if (t.dataset.f) presenter.onFilter(t.dataset.f);
      else if (t.dataset.sort) presenter.onSort(t.dataset.sort);
      else if (t.hasAttribute('data-more')) presenter.onToggleMore();
      else if (t.dataset.daily) presenter.onOpenDaily(+t.dataset.daily);
      else if (t.dataset.adm) presenter.onSelect(+t.dataset.adm);
    });
    root.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-adm][tabindex]')) { e.preventDefault(); presenter.onSelect(+e.target.dataset.adm); }
    });
    $('[data-r=q]').addEventListener('input', e => presenter.onQuery(e.target.value));
  }

  return { render, bind, lastVM: () => lastVM };
};
if (typeof module !== 'undefined') module.exports = AdmitsView;

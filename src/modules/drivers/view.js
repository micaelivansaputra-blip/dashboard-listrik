/* ============================================================================
   DRIVERS module · VIEW
   Passive. Draws the ViewModel it is given and forwards input to the presenter.
   `platform` injects the browser pieces (Chart.js, theme tokens, translation).
   ========================================================================== */
const DriversView = function (root, platform) {
  const P = platform;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = sel => root.querySelector(sel);
  let presenter = null, chart = null;

  root.innerHTML = `
    <div class="sec-head"><h2>Why kWh Rose <small>Sep 2026 vs Sep 2025, split by cause</small></h2></div>
    <div class="card drv">
      <p class="drv-lead" data-r="lead"></p>
      <p class="drv-sub" data-r="sub"></p>
      <div class="grid2 drv-grid">
        <div class="card"><div class="ch"><div><h3>Where the change comes from</h3><span class="sub">Each bar starts where the one above it ends. Tap a bar to see its sites.</span></div></div>
          <div class="chartbox drv-chart"><canvas data-r="canvas" role="img" aria-label="Bridge chart of the change in invoice kWh, split into new sites, CT changes, extra meters, incomplete invoices and same-meter sites. The same numbers are listed beside it."></canvas></div></div>
        <div class="card"><div class="ch"><div><h3>Causes, ranked by the flow</h3><span class="sub">Only the last one is a real change in usage</span></div></div>
          <div class="drv-steps" data-r="steps" role="group" aria-label="Causes"></div></div>
      </div>
      <div class="card drv-detail"><div class="ch"><div><h3 data-r="dTitle"></h3><span class="sub" data-r="dWhy"></span></div></div>
        <div class="tbl-wrap"><table class="ptable dtbl"><thead data-r="thead"></thead><tbody data-r="tbody"></tbody></table></div>
        <div class="adm-more" data-r="more"></div></div>

      <div class="drv-block">
        <div class="drv-bh"><div><h3>Sites with the same meters</h3><span class="sub">Admits in both years, new meters taken out, a doubtful CT reading left out</span></div>
          <div class="f">Sep 2026 billing period<div class="seg" data-r="days" role="group" aria-label="Assumed days in the Sep 2026 billing period"></div></div></div>
        <div class="mkpis" data-r="kpis"></div>
      </div>

      <div class="grid2 drv-grid">
        <div class="card"><div class="ch"><div><h3>Admits barely move electricity</h3><span class="sub" data-r="aSub"></span></div></div>
          <p class="drv-p" data-r="aLead"></p><div class="drv-thirds" data-r="thirds"></div></div>
        <div class="card"><div class="ch"><div><h3>A few sites carry the rise</h3><span class="sub">Sites with the same meters, ranked by kWh added</span></div></div>
          <p class="drv-p" data-r="cLead"></p><p class="drv-p mu" data-r="cSub"></p><div class="cc adm-cc" data-r="top"></div></div>
      </div>

      <div class="grid2 drv-grid">
        <div class="card"><div class="ch"><div><h3>To verify</h3><span class="sub">Open items that could change these numbers</span></div></div>
          <p class="drv-p" data-r="vSum"></p><ul class="drv-list" data-r="verify"></ul></div>
        <div class="card"><div class="ch"><div><h3>Not measurable from this data</h3><span class="sub">Possible causes that need other data</span></div></div>
          <ul class="drv-list plain" data-r="nm"></ul></div>
      </div>
      <p class="note">How to read it: the causes add up exactly to the net change. New sites, extra meters and CT changes change what is measured, not how much a site uses. Incomplete invoices are a data problem. Only same-meter sites show real usage. The billing period of Sep 2026 is not in the invoice file yet, so its length is an assumption.</p>
    </div>`;

  const tone = t => `<span class="adm-n ${esc(t.tone)}">${esc(t.text)}</span>`;
  const ARROW = '';

  function renderHead(h) {
    const lead = $('[data-r=lead]'); lead.className = 'drv-lead ' + h.tone; lead.textContent = h.lead;
    const sub = $('[data-r=sub]'); sub.textContent = h.sub; sub.hidden = !h.sub;
  }

  function renderSteps(list) {
    $('[data-r=steps]').innerHTML = list.map(s => `
      <button type="button" class="drv-step" data-step="${esc(s.key)}" aria-pressed="${s.active}">
        <span class="nm"><b>${esc(s.label)}</b><span class="drv-kind ${esc(s.kindTone)}">${esc(s.kind)}</span></span>
        <span class="val adm-n ${esc(s.tone)}">${esc(s.value)}<small>kWh</small></span>
        <span class="tr"><i class="${esc(s.tone)}" style="width:${s.width.toFixed(1)}%"></i></span>
        <small class="meta">${esc(s.meta)}</small>
      </button>`).join('');
  }

  function renderDetail(d) {
    $('[data-r=dTitle]').textContent = d.title; $('[data-r=dWhy]').textContent = d.why;
    $('[data-r=thead]').innerHTML = '<tr>' + d.columns.map(c => `<th><span>${esc(c.label)}</span></th>`).join('') + '</tr>';
    $('[data-r=tbody]').innerHTML = d.rows.map(r => `
      <tr><td><div class="sn"><span><b>${esc(r.name)}</b>${r.extra ? `<small class="adm-st flat">${esc(r.extra)}</small>` : ''}${r.note ? `<small class="adm-st flat">${esc(r.note)}</small>` : ''}${r.canOpenDaily ? `<button type="button" class="chipbtn" data-daily="${r.no}">Open daily chart</button>` : ''}</span></div></td>
        <td>${esc(r.k25)}</td><td>${esc(r.k26)}</td><td>${tone(r.delta)}</td><td>${tone(r.pct)}</td></tr>`).join('');
    $('[data-r=more]').innerHTML = d.more ? `<button type="button" class="chipbtn" data-more aria-expanded="${d.more.expanded}">${esc(d.more.label)}</button>` : '';
  }

  function renderClean(c) {
    $('[data-r=kpis]').innerHTML = c.kpis.map(k => `<div class="mk"><small>${esc(k.label)}</small><b class="${esc(k.tone)}">${esc(k.value)}</b><span>${esc(k.sub)}</span></div>`).join('');
    $('[data-r=days]').innerHTML = c.days.map(d => `<button type="button" data-days="${d.v}" aria-pressed="${d.active}">${esc(d.label)}</button>`).join('');
  }

  function renderAdmits(a) {
    $('[data-r=aLead]').textContent = a.lead;
    $('[data-r=aSub]').textContent = 'Sites with the same meters, split into thirds by the change in admits';
    $('[data-r=thirds]').innerHTML = a.bars.map(b => `
      <div class="drv-third"><div class="t">${esc(b.label)}<small>${b.n} sites</small></div>
        <div class="drv-pair"><span>Admits</span><i class="bar blue" style="width:${b.aw.toFixed(1)}%"></i><b>${esc(b.a)}</b></div>
        <div class="drv-pair"><span>kWh</span><i class="bar ${esc(b.kTone)}" style="width:${b.kw.toFixed(1)}%"></i><b class="adm-n ${esc(b.kTone)}">${esc(b.k)}</b></div></div>`).join('');
  }

  function renderConc(c) {
    $('[data-r=cLead]').textContent = c.lead; $('[data-r=cSub]').textContent = c.sub;
    $('[data-r=top]').innerHTML = c.rows.map(r => `
      <div class="crow"><div class="nm">${esc(r.name)}<small>${esc(r.sub)}</small>${r.flag ? `<span class="flag lo">${esc(r.flag)}</span>` : ''}</div>
        <div class="tr"><i class="hi" style="width:${r.width.toFixed(1)}%"></i></div>
        <div class="val">${esc(r.value)}<small>kWh</small></div></div>`).join('');
  }

  function renderVerify(v, nm) {
    const s = $('[data-r=vSum]'); s.textContent = v.summary; s.hidden = !v.summary;
    $('[data-r=verify]').innerHTML = v.items.length ? v.items.map(i => `<li><span class="chip">${esc(i.kind)}</span><div><b>${esc(i.site)}</b><p>${esc(i.detail)}</p></div></li>`).join('') : '<li class="hint">Nothing to verify.</li>';
    $('[data-r=nm]').innerHTML = nm.map(i => `<li><div><b>${esc(i.t)}</b><p>${esc(i.d)}</p></div></li>`).join('');
  }

  /* ---------- bridge chart: floating bars, one per cause ---------- */
  function renderChart(br) {
    if (chart) { chart.destroy(); chart = null; }
    if (!P.Chart) return;
    const ink = P.css('--ink'), mu = P.css('--muted'), grid = P.css('--grid');
    const col = b => b.tone === 'up' ? P.css('--up') : b.tone === 'down' ? P.css('--down') : P.css('--ink');
    const labels = {
      id: 'drvLabels',
      afterDatasetsDraw(ch) {
        const c = ch.ctx, meta = ch.getDatasetMeta(0); c.save(); c.font = "700 12px 'DM Sans',sans-serif"; c.textBaseline = 'middle'; c.fillStyle = ink;
        br.bars.forEach((b, i) => { const el = meta.data[i]; if (!el) return; const x = Math.max(el.x, el.base) + 8; c.textAlign = 'left'; c.fillText(b.text, x, el.y); });
        c.restore();
      }
    };
    const cfg = P.chartCfg({
      type: 'bar', plugins: [labels],
      data: { labels: br.bars.map(b => b.label), datasets: [{ label: 'kWh', data: br.bars.map(b => [b.from, b.to]), backgroundColor: br.bars.map(col), borderRadius: 4, borderSkipped: false, barThickness: 22 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { right: 18 } },
        scales: {
          x: { grace: '18%', title: { display: true, text: br.title, color: mu, font: { size: 12, weight: '600' } }, border: { display: false }, grid: { color: c => c.tick.value === 0 ? P.css('--flat') : grid, lineWidth: c => c.tick.value === 0 ? 2 : 1 },
               ticks: { color: mu, maxTicksLimit: 7, callback: v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v / 1000) + 'k' } },
          y: { border: { display: false }, grid: { display: false }, ticks: { color: ink, font: { weight: '600' } } }
        },
        plugins: { legend: { display: false },
          tooltip: { backgroundColor: ink, titleColor: P.css('--bg'), bodyColor: P.css('--bg'), cornerRadius: 12, padding: 12,
            callbacks: { title: c => br.bars[c[0].dataIndex].label, label: c => br.bars[c.dataIndex].text + ' kWh' } } },
        onClick: (e, els) => { if (els.length) { const b = br.bars[els[0].index]; if (b.key !== 'net') presenter.onStep(b.key); } },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
      }
    });
    chart = new P.Chart($('[data-r=canvas]'), cfg);
  }

  /* ---------- public surface ---------- */
  function focusSelector(el) {
    if (!el || !root.contains(el) || !el.dataset) return null;
    for (const a of ['step', 'days', 'daily']) if (el.dataset[a] != null) return `[data-${a}="${el.dataset[a]}"]`;
    return el.hasAttribute('data-more') ? '[data-more]' : null;
  }
  let sig = '';
  function render(vm, force) {
    const sel = focusSelector(document.activeElement);
    renderHead(vm.headline); renderSteps(vm.steps); renderDetail(vm.detail); renderClean(vm.clean);
    renderAdmits(vm.admits); renderConc(vm.concentration); renderVerify(vm.verify, vm.notMeasured);
    const s = JSON.stringify(vm.bridge);
    if (force || s !== sig) { sig = s; renderChart(vm.bridge); }
    if (sel) { const n = root.querySelector(sel); if (n && n !== document.activeElement) n.focus({ preventScroll: true }); }
  }
  function bind(p) {
    presenter = p;
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-step],[data-days],[data-daily],[data-more]');
      if (!t || !root.contains(t)) return;
      if (t.dataset.step) presenter.onStep(t.dataset.step);
      else if (t.dataset.days) presenter.onDays(t.dataset.days);
      else if (t.dataset.daily) presenter.onOpenDaily(+t.dataset.daily);
      else if (t.hasAttribute('data-more')) presenter.onToggleMore();
    });
  }
  return { render, bind };
};
if (typeof module !== 'undefined') module.exports = DriversView;

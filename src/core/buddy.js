/* ============================================================================
   Buddy: one character per page. It follows the pointer a little, reacts to the
   data (mood), and gives a short, formal tip when tapped. Tips are computed from
   the live data in the current language. The glow that follows the cursor lives
   here too.
   ========================================================================== */
const Buddy = (function () {
  const $ = id => document.getElementById(id);
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICON = {
    overview: '<path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z"/>',
    compare: '<path d="M5 11h3v8H5zM10.5 5h3v14h-3zM16 9h3v10h-3z"/>',
    trends: '<path d="M3 17l6-6 4 4 8-9v4h2V4h-7v2h3l-6 7-4-4-8 8z"/>',
    sites: '<path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.500A2.500 2.500 0 119.500 9 2.500 2.500 0 0112 11.500z"/>',
    concerns: '<path d="M12 3L2 21h20zm1 14h-2v-2h2zm0-4h-2V9h2z"/>',
    zoec: '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
    costs: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15v1h-2v-1.100A3 3 0 019 14h2c0 .6.4 1 1 1s1-.4 1-1-.4-1-1-1c-1.700 0-3-1.100-3-2.800a3 3 0 012-2.800V6h2v1.200a3 3 0 012 2.800h-2c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1c1.700 0 3 1.100 3 2.800a3 3 0 01-2 2.200z"/>'
  };
  const HUE = { overview: 0, compare: 62, trends: 62, sites: -48, concerns: 150, zoec: -100, costs: -28 };
  const NAME = { overview: 'Volty', compare: 'Duo', trends: 'Trendy', sites: 'Pinny', concerns: 'Alert', zoec: 'Zero', costs: 'Penny' };
  let root, bub, body, g = '', idx = 0, hideT = 0, hinted = true, mood = 'happy';
  const lang = () => ($('langSel') && $('langSel').value) || 'en';
  const L = (en, id, es) => ({ en, id, es })[lang()] || en;
  const isPay = () => typeof APP !== 'undefined' && APP === 'pay';

  /* ---------- tips from the live data ---------- */
  function elecFacts() {
    const list = selected(), P = periods(list), rows = list.map(s => ({ s, a: siteAvg(s) }));
    const dSep = P.okt.raw / P.sep.raw - 1, dAgu = P.okt.raw / P.agu.raw - 1, yoy = P.okt.raw / P.py.raw - 1;
    const up = rows.filter(r => r.a.mom > TH).length, dn = rows.filter(r => r.a.mom < -TH).length;
    const byMom = [...rows].sort((x, y) => y.a.mom - x.a.mom), byYoy = [...rows].sort((x, y) => y.a.yoy - x.a.yoy);
    const natYoy = yoy, ex = rows.map(r => ({ r, ex: r.a.okt - r.a.py * (1 + natYoy), sig: (r.a.mom > TH) + (r.a.vsAgu > TH) + (r.a.yoy > TH) })).sort((x, y) => y.ex - x.ex);
    return { P, rows, dSep, dAgu, yoy, up, dn, byMom, byYoy, ex, red: ex.filter(e => e.sig >= 2).length, wk: P.okt.we / P.okt.wd - 1, n: rows.length };
  }
  function tips() {
    const nm = NAME[g] || 'Volty', out = [];
    const intro = { en: `I am ${nm}. Tap me again for the next tip.`, id: `Saya ${nm}. Ketuk lagi untuk tip berikutnya.`, es: `Soy ${nm}. Toca de nuevo para el siguiente consejo.` }[lang()];
    out.push(intro);
    try {
      if (isPay()) {
        const T = {
          overview: [L('Compare actual admits and man-hours with the budget before reading the cost lines.', 'Bandingkan admits dan man-hour aktual dengan budget sebelum membaca baris biaya.', 'Compare las admisiones y horas-hombre reales con el presupuesto antes de leer los costos.')],
          trends: [L('A month with fewer admits and the same man-hours raises the cost per admit.', 'Bulan dengan admits lebih sedikit dan man-hour sama akan menaikkan biaya per admit.', 'Un mes con menos admisiones y las mismas horas-hombre sube el costo por admisión.')],
          sites: [L('Sort by productivity to find the sites that need a schedule review.', 'Urutkan berdasarkan produktivitas untuk menemukan site yang perlu ditinjau jadwalnya.', 'Ordene por productividad para encontrar los sitios cuyo horario conviene revisar.')],
          costs: [L('Payroll files stay on this device and are not shared.', 'File payroll hanya tersimpan di perangkat ini dan tidak dibagikan.', 'Los archivos de nómina se quedan en este dispositivo y no se comparten.')]
        }[g] || [];
        return out.concat(T);
      }
      const f = elecFacts(), pc = (v) => pct(v, 1);
      const top = f.byMom[0], low = f.byMom[f.byMom.length - 1], ty = f.byYoy[0];
      if (g === 'overview') {
        out.push(L(`October is ${pc(f.dSep)} vs September and ${pc(f.dAgu)} vs August. Lower is better.`, `Oktober ${pc(f.dSep)} vs September dan ${pc(f.dAgu)} vs Agustus. Makin rendah makin baik.`, `Octubre está ${pc(f.dSep)} vs septiembre y ${pc(f.dAgu)} vs agosto. Menos es mejor.`));
        out.push(L(`Weekends run ${pc(f.wk)} vs weekdays this month.`, `Akhir pekan ${pc(f.wk)} dibanding hari kerja bulan ini.`, `Los fines de semana van ${pc(f.wk)} vs entre semana este mes.`));
        out.push(L(`${f.dn} sites use less than last month and ${f.up} use more.`, `${f.dn} site memakai lebih sedikit dari bulan lalu dan ${f.up} lebih banyak.`, `${f.dn} sitios usan menos que el mes pasado y ${f.up} usan más.`));
        if (ty) out.push(L(`Largest rise vs last year: ${short(ty.s.n)} (${pct(ty.a.yoy, 0)}).`, `Kenaikan terbesar vs tahun lalu: ${short(ty.s.n)} (${pct(ty.a.yoy, 0)}).`, `Mayor aumento vs el año pasado: ${short(ty.s.n)} (${pct(ty.a.yoy, 0)}).`));
        mood = f.dSep > .01 ? 'worried' : f.dSep < -.01 ? 'happy' : 'meh';
      } else if (g === 'compare') {
        out.push(L('Pick any two months, then switch to weekdays or weekends to remove the calendar effect.', 'Pilih dua bulan mana saja, lalu ganti ke hari kerja atau akhir pekan untuk menghilangkan efek kalender.', 'Elija dos meses y cambie a entre semana o fines de semana para quitar el efecto del calendario.'));
        if (top) out.push(L(`Largest rise vs September: ${short(top.s.n)} (${pct(top.a.mom, 0)}).`, `Kenaikan terbesar vs September: ${short(top.s.n)} (${pct(top.a.mom, 0)}).`, `Mayor aumento vs septiembre: ${short(top.s.n)} (${pct(top.a.mom, 0)}).`));
        if (low) out.push(L(`Largest fall vs September: ${short(low.s.n)} (${pct(low.a.mom, 0)}).`, `Penurunan terbesar vs September: ${short(low.s.n)} (${pct(low.a.mom, 0)}).`, `Mayor descenso vs septiembre: ${short(low.s.n)} (${pct(low.a.mom, 0)}).`));
        mood = 'meh';
      } else if (g === 'sites') {
        out.push(L(`${f.up} sites are up and ${f.dn} are down vs September (more than 5%).`, `${f.up} site naik dan ${f.dn} turun vs September (lebih dari 5%).`, `${f.up} sitios suben y ${f.dn} bajan vs septiembre (más de 5%).`));
        out.push(L('Use Month and Compare with on Perform Site to compare any two months.', 'Pakai Month dan Compare with di Perform Site untuk membandingkan dua bulan mana saja.', 'Use Mes y Comparar con en Desempeño por Sitio para comparar dos meses.'));
        out.push(L('Site Explorer compares up to five sites side by side.', 'Site Explorer membandingkan hingga lima site berdampingan.', 'El Explorador de Sitios compara hasta cinco sitios lado a lado.'));
        mood = f.up > f.dn ? 'worried' : 'happy';
      } else if (g === 'concerns') {
        out.push(L(`${f.red} sites are red: up more than 5% in at least two comparisons.`, `${f.red} site berstatus merah: naik lebih dari 5% di minimal dua perbandingan.`, `${f.red} sitios están en rojo: suben más de 5% en al menos dos comparaciones.`));
        const t = f.ex[0]; if (t) out.push(L(`Highest excess over national growth: ${short(t.r.s.n)} (+${fmt(t.ex)} kWh/day).`, `Kelebihan tertinggi di atas pertumbuhan nasional: ${short(t.r.s.n)} (+${fmt(t.ex)} kWh/hari).`, `Mayor exceso sobre el crecimiento nacional: ${short(t.r.s.n)} (+${fmt(t.ex)} kWh/día).`));
        out.push(L('Log the reason for each red site in its follow-up so the next review starts from it.', 'Catat alasan tiap site merah di follow-up agar review berikutnya bisa melanjutkan.', 'Registre el motivo de cada sitio en rojo en su seguimiento para la próxima revisión.'));
        out.push(L('Why kWh Rose separates new sites and CT changes from real usage.', 'Why kWh Rose memisahkan site baru dan perubahan CT dari pemakaian sebenarnya.', 'Por qué subió el kWh separa sitios nuevos y cambios de CT del consumo real.'));
        mood = f.red ? 'worried' : 'happy';
      } else if (g === 'zoec') {
        const q = (QUIPS || []).find(x => /^ZOEC check/.test(x)), m = q && /(\d+) of (\d+)/.exec(q);
        if (m) out.push(L(`${m[1]} of ${m[2]} program sites fell faster than the other sites.`, `${m[1]} dari ${m[2]} site program turun lebih cepat dari site lain.`, `${m[1]} de ${m[2]} sitios del programa bajaron más rápido que los demás.`));
        out.push(L('Before is 1–18 Aug and After is 19 Aug onward, the same dates for every site.', 'Before adalah 1–18 Agu dan After mulai 19 Agu, tanggal yang sama untuk semua site.', 'Antes es 1–18 ago y Después desde el 19 ago, las mismas fechas para todos los sitios.'));
        out.push(L('This is a before/after view. It does not prove the program is the cause.', 'Ini tampilan sebelum/sesudah. Ini tidak membuktikan program sebagai penyebab.', 'Es una vista antes/después. No prueba que el programa sea la causa.'));
        mood = m && +m[1] * 2 >= +m[2] ? 'happy' : 'meh';
      }
    } catch (e) { }
    return out;
  }

  /* ---------- the character ---------- */
  function paint() {
    if (!root) return;
    const pay = isPay();
    const grp = (document.querySelector('#pgNav button[aria-current="true"]') || {}).dataset;
    const ng = (grp && grp.g) || g || 'overview';
    const key = (pay ? 'p:' : 'e:') + ng;
    const changed = key !== root.dataset.key;
    root.dataset.key = key; g = ng;
    root.style.setProperty('--hue', (HUE[g] || 0) + 'deg'); root.dataset.g = g;
    tips(); // sets mood
    if (changed) {
      body.innerHTML = volty(mood);
      root.querySelector('.bd-badge svg').innerHTML = ICON[g] || ICON.overview;
      idx = 0; hide();
      if (!reduce) { root.classList.remove('swap'); void root.offsetWidth; root.classList.add('swap'); }
    } else if (root.dataset.mood !== mood) body.innerHTML = volty(mood);
    root.dataset.mood = mood;
    const lab = L(`${NAME[g]}, the guide for this page. Tap for a tip.`, `${NAME[g]}, pemandu halaman ini. Ketuk untuk tip.`, `${NAME[g]}, la guía de esta página. Toque para un consejo.`);
    root.querySelector('.bd-char').setAttribute('aria-label', lab);
  }
  function hide() { clearTimeout(hideT); if (bub) bub.hidden = true; }
  function say() {
    const t = tips(); const txt = t[idx++ % t.length];
    bub.innerHTML = '<b></b><span></span>'; bub.querySelector('b').textContent = NAME[g]; bub.querySelector('span').textContent = txt;
    bub.hidden = false; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
    clearTimeout(hideT); hideT = setTimeout(hide, 8000);
    root.classList.remove('hint'); hinted = false;
    if (!reduce) {
      root.querySelector('.bd-char').animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.06,.96)' }, { transform: 'translateY(0) scale(.97,1.03)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      for (let i = 0; i < 8; i++) {
        const s = document.createElement('i'); s.className = 'bd-spark'; root.appendChild(s);
        const a = Math.PI + (i / 7) * Math.PI, r = 40 + Math.random() * 30;
        s.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r - 10}px) scale(1.2)`, opacity: 0 }], { duration: 750, easing: 'ease-out' }).onfinish = () => s.remove();
      }
    }
  }

  /* ---------- pointer: character leans toward it, glow follows it ---------- */
  let px = innerWidth / 2, py = innerHeight / 2, gx = px, gy = py, rx = px, ry = py, raf = 0, card = null;
  function loop() {
    raf = 0;
    gx += (px - gx) * .14; gy += (py - gy) * .14; rx += (px - rx) * .32; ry += (py - ry) * .32;
    const gl = $('curGlow'), rg = $('curRing');
    if (gl) gl.style.transform = `translate3d(${gx - 260}px,${gy - 260}px,0)`;
    if (rg) rg.style.transform = `translate3d(${rx - 16}px,${ry - 16}px,0)`;
    if (root) {
      const r = root.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 420);
      root.style.setProperty('--lx', (dx / d * 7 * k).toFixed(1) + 'px'); root.style.setProperty('--ly', (dy / d * 5 * k).toFixed(1) + 'px'); root.style.setProperty('--lr', (dx / d * 7 * k).toFixed(1) + 'deg');
    }
    if (Math.abs(px - gx) > .5 || Math.abs(py - gy) > .5 || Math.abs(px - rx) > .5) raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(loop);
    const gl = $('curGlow'); if (gl) gl.classList.add('on');
    const rg = $('curRing'); if (rg) { rg.classList.add('on'); rg.classList.toggle('big', !!e.target.closest('button,a,select,input,[role=button],th,.row,[data-n]')); }
    const c = e.target.closest && e.target.closest('.card');
    if (card && card !== c) { card.style.removeProperty('--cx'); card.style.removeProperty('--cy'); }
    card = c;
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px'); }
  }
  function onLeave() { const gl = $('curGlow'), rg = $('curRing'); if (gl) gl.classList.remove('on'); if (rg) rg.classList.remove('on'); if (card) { card.style.removeProperty('--cx'); card.style.removeProperty('--cy'); card = null; } }

  function start() {
    root = document.createElement('div'); root.id = 'buddy'; root.className = 'buddy hint';
    root.innerHTML = '<div class="bd-bubble" role="status" hidden></div><button type="button" class="bd-char"><span class="bd-body" aria-hidden="true"></span><span class="bd-badge" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span></button>';
    document.body.appendChild(root);
    bub = root.querySelector('.bd-bubble'); body = root.querySelector('.bd-body');
    root.querySelector('.bd-char').addEventListener('click', e => { e.stopPropagation(); say(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    document.addEventListener('click', e => { if (!e.target.closest('#buddy')) hide(); });
    if (fine && !reduce) {
      const gl = document.createElement('div'); gl.id = 'curGlow'; gl.setAttribute('aria-hidden', 'true');
      const rg = document.createElement('div'); rg.id = 'curRing'; rg.setAttribute('aria-hidden', 'true');
      document.body.append(gl, rg);
      addEventListener('pointermove', onMove, { passive: true }); document.documentElement.addEventListener('pointerleave', onLeave);
    } else if (fine) {
      addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('.card'); if (card && card !== c) { card.style.removeProperty('--cx'); card.style.removeProperty('--cy'); } card = c; if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--cx', (e.clientX - r.left) + 'px'); c.style.setProperty('--cy', (e.clientY - r.top) + 'px'); } }, { passive: true });
    }
    paint();
  }
  return { start, update: paint };
})();

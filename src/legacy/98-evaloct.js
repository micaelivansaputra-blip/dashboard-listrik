/* ---------- Evaluation Oct: why October is over budget and which sites rose the most ----------
   Data: src/data/evaloct.json (built by tools/make_evaloct.py from the full-month forecast + invoices).
   gap = forecast - budget = (Sep usage - Sep budget) [carried over] + (Oct forecast - Sep usage) [usage change] + (Sep budget - Oct budget) [budget cut]. */
const EVALOCT = /*EVAL*/;
const EV={view:'gap'};
function evTag(r){
  if(r.gp==null||r.gp<=.05) return r.gp!=null&&r.gp<-.05?['save','Saving']:['on','Within budget'];
  if(r.carried==null) return ['up','New site · no Sep base'];
  const c=[[r.carried,'Already over in Sep'],[r.usage,'Usage up vs Sep'],[r.cut,'Budget lowered vs Sep']].sort((a,b)=>b[0]-a[0])[0];
  return ['up',c[1]];
}
function evDq(r){return r.conf==='High'?'':`<small class="evq ${r.conf==='Invoice-based'?'lo':'md'}" title="${fuEsc(r.note||'')}">${r.conf==='Invoice-based'?'From invoice':'Estimated'}</small>`;}
function renderEvalOct(){
  const $=id=>document.getElementById(id); if(!$('evTable')) return;
  const R=EVALOCT.rows, S=(a,k)=>a.reduce((t,r)=>t+(r[k]||0),0), sg=n=>(n>=0?'+':'−')+fmt(Math.abs(n));
  const dec=R.filter(r=>r.carried!=null), ov=dec.filter(r=>r.gp>.05), lyR=R.filter(r=>r.ly);
  const top10=R.slice().sort((a,b)=>b.gap-a.gap).slice(0,10), gapAll=S(R,'gap');
  const allOv=R.filter(r=>r.gp>.05), nOver=allOv.length, nSave=R.filter(r=>r.gp<-.05).length;
  const sepGap=S(dec,'carried'), useCh=S(dec,'usage'), cut=S(dec,'cut'), gapDec=S(dec,'gap');
  const budLY=S(lyR,'bud'), lyTot=S(lyR,'ly'), fcLY=S(lyR,'fc');
  $('evSub').textContent='Forecast for the full month · meter data to 28 Oct';
  const card=(t,v,n,c)=>`<div class="pfc ${c}"><span class="pfl">${t}</span><span class="pfv">${v}</span><span class="pfn">${n}</span></div>`;
  $('evCards').innerHTML=
    card('Budget',fmt(S(R,'bud')),'kWh · all 59 sites','')+
    card('Forecast',fmt(S(R,'fc')),'kWh · full October','')+
    card('Gap vs budget',sg(gapAll),`${pct(gapAll/S(R,'bud'))} · over budget`,'up')+
    card('Sites over / saving',`${nOver} / ${nSave}`,'more than 5% above / below budget','');
  const why=[
    ['1','Budget was set lower than last October',`For the ${lyR.length} sites that existed in 2025, the October budget is ${fmt(budLY)} kWh versus ${fmt(lyTot)} kWh actually used in Oct 2025 — ${fmt(lyTot-budLY)} kWh (${pct(budLY/lyTot-1)}) below. Compared with September, budgets were cut by ${fmt(cut)} kWh.`],
    ['2','Usage did not come down enough from September',`These ${dec.length} sites were already ${sg(sepGap)} kWh over budget in September. October usage is forecast ${sg(useCh)} kWh versus the September invoice, so only part of that overshoot disappears while the budget gets tighter.`],
    ['3','The over-budget sites carry almost all of the gap',`${ov.length} sites are more than 5% above budget with a combined ${sg(S(ov,'gap'))} kWh. ${fmt(S(ov,'carried'))} kWh of it was already there in September, ${fmt(S(ov,'cut'))} kWh comes from the lower budget, and usage added only ${sg(S(ov,'usage'))} kWh.`],
    ['4','A few sites decide the result',`The top 10 sites add up to ${sg(S(top10,'gap'))} kWh, ${Math.round(S(top10,'gap')/S(allOv,'gap')*100)}% of the ${sg(S(allOv,'gap'))} kWh gap of all ${allOv.length} over-budget sites. Senayan Park alone is ${sg(R.find(r=>r.k===69).gap)} kWh.`],
    ['5','Versus last October usage is only slightly higher',`Forecast usage is ${fmt(fcLY)} kWh against ${fmt(lyTot)} kWh in Oct 2025 (${pct(fcLY/lyTot-1)}, ${sg(fcLY-lyTot)} kWh). Most of the over-budget position comes from the budget level, not from a jump in consumption.`],
    ['6','Read some numbers with care',`${R.filter(r=>r.conf!=='High').length} sites are estimated from raw meters or invoices instead of clean daily data. Kendari and K-Square have budgets far above their invoices, so those two look like budget issues, not savings.`]
  ];
  $('evWhy').innerHTML=why.map(w=>`<div class="evw"><i>${w[0]}</i><div><b>${w[1]}</b><p>${w[2]}</p></div></div>`).join('');
  const steps=[['September gap (invoice vs budget)',sepGap,'up'],['Usage change vs September',useCh,useCh<0?'down':'up'],['Budget lowered for October',cut,'up'],['October gap (forecast vs budget)',gapDec,'tot']];
  const mx=Math.max(...steps.map(s=>Math.abs(s[1])));
  $('evBridge').innerHTML=steps.map(s=>`<div class="evb"><span>${s[0]}</span><div class="evbar"><i class="${s[2]}" style="width:${Math.max(2,Math.abs(s[1])/mx*100)}%"></i></div><b class="${s[2]==='tot'?'':s[1]<0?'down':'up'}">${sg(s[1])}</b></div>`).join('')+
    `<div class="note">September uses actual invoice kWh (billing period roughly 25th to 24th), October is calendar-month forecast, so the bridge is a guide to direction and size, not an exact reconciliation.</div>`;
  const v=EV.view, q=$('evSearch').value.trim().toLowerCase();
  const key={gap:'gap',sep:'usage',ly:'vly'}[v];
  let f=R.filter(r=>(!q||r.n.toLowerCase().includes(q))&&(v==='all'||r[key]!=null));
  f.sort((a,b)=>v==='all'?a.n.localeCompare(b.n,'en',{numeric:true}):b[key]-a[key]);
  if(v!=='all'&&!q) f=f.slice(0,20);
  const cell=n=>n==null?'<small class="tk-n">—</small>':`<span class="cell ${n>0?'up':n<0?'down':'flat'}">${sg(n)}</span>`;
  const body=f.map(r=>{const t=evTag(r);return `<tr><td><div class="sn"><span class="sd ${t[0]==='up'?'up':t[0]==='save'?'down':'flat'}"></span><span><b>${short(r.n)}</b><small>${r.r}${r.ly==null?' · new site':''} ${evDq(r)}</small></span></div></td>
    <td class="hs">${fmt(r.bud)}</td><td class="hs">${fmt(r.fc)}</td><td class="hs"><b class="${r.gap>0?'up':'down'}">${sg(r.gap)}</b></td><td class="hs">${r.gp==null?'—':pct(r.gp)}</td>
    <td class="hs">${cell(r.usage)}</td><td class="hs">${cell(r.vly)}</td><td><span class="pfp ${t[0]}">${t[1]}</span></td></tr>`;}).join('');
  $('evTable').innerHTML=`<table class="ptable pft"><thead><tr><th>Site</th><th class="hs">Budget</th><th class="hs">Forecast</th><th class="hs">Gap kWh</th><th class="hs">vs budget</th><th class="hs">vs Sep invoice</th><th class="hs">vs Oct 2025</th><th>Main driver</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="empty">No matching site.</td></tr>'}</tbody></table>`;
  $('evNote').textContent={gap:'Top 20 sites by gap to the October budget.',sep:'Top 20 sites by forecast October kWh minus the September invoice kWh.',ly:'Top 20 sites by forecast October kWh minus Oct 2025 invoice kWh (sites with a 2025 invoice only).',all:'All 59 sites.'}[v]+' All figures are kWh for the full month. Main driver = the largest part of the gap: overshoot already in September, higher usage, or a lowered budget.';
}
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='evView'){EV.view=e.target.value; renderEvalOct();} });
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='evSearch') renderEvalOct(); });
renderEvalOct();

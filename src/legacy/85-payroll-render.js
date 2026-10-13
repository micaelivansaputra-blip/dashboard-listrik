/* ---------- wiring ---------- */
function wireCalc(){
  const $=id=>document.getElementById(id);
  const tog=(id,key)=>{ const el=$(id); const go=e=>{ if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return; const r=e.target.closest('tr[data-ps]'); if(!r||e.target.closest('.calc'))return; if(e.type==='keydown')e.preventDefault(); PAY.open[key]=PAY.open[key]===r.dataset.ps?null:r.dataset.ps; const y=window.scrollY; renderPay(); window.scrollTo(0,y); };
    el.addEventListener('click',go); el.addEventListener('keydown',go); };
  tog('psTable','year'); tog('mtdTable','mtd'); tog('costTable','cost');
  $('costMon').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.cm=+b.dataset.m;PAY.open.cost=null;renderPay();});
  $('costSort').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.cs=b.dataset.s;PAY.cx=false;renderPay();});
  $('costQ').addEventListener('input',e=>{PAY.cq=e.target.value;renderPay();});
  $('costMore').addEventListener('click',e=>{if(e.target.closest('[data-cmore]')){PAY.cx=!PAY.cx;renderPay();}});
}

function renderPay(){
  const empty=!PAY.d; document.getElementById('payEmpty').hidden=!empty; document.getElementById('payBody').hidden=empty;
  const sub=document.getElementById('asof');
  if(empty){ sub.textContent='Upload the payroll workbook with Update data'; return; }
  const {d,S,P,st}=payCtx(), la=P?lastActual(P):-1;
  sub.textContent=`Budget vs Actual + Forecast · ${la>=0?'actual through '+P.weeks[la].label:'no actual weeks found'} · Productivity ${PAY.sc}`;
  document.getElementById('pSub').textContent=`FY ${d.year}`;
  const ks=Object.keys(d.summary).sort((a,b)=>b-a);
  document.getElementById('pScen').innerHTML=ks.map(k=>`<button type="button" data-sc="${k}" aria-pressed="${k===PAY.sc}">Productivity ${k}</button>`).join('');
  applyPayView(); renderPayMtd(); renderPayHero(S,P,st,la); renderPayMonths(S,st); renderPayWeeks(P,la); renderPaySites(P,la); renderPayCost(); renderPayHow(); renderPayFoot(d,P,la); applyPayView();
}
function renderPayHero(S,P,st,la){
  const T=S.total, rv=T.rev.af/T.rev.b-1, av=T.admits.af/T.admits.b-1, pv=T.total.af/T.total.b-1, ov=T.opr.af/T.opr.b-1, adv=T.admin.af/T.admin.b-1;
  const dpt=T.pct.af-T.pct.b, over=S.months.filter(m=>m.pct.af!=null&&m.pct.b!=null&&m.pct.af-m.pct.b>0.005);
  let chip,cc,head;
  if(pv>PT){chip='Over budget';cc='bad';head=`Payroll is ${pct(pv,1).replace('+','')} above budget`;}
  else if(dpt>0.003){chip='Watch the ratio';cc='watch';head=pv<-PT?`Payroll is ${Math.abs(pv*100).toFixed(1)}% under budget, but it takes a bigger share of revenue`:`Payroll is on budget, but it takes a bigger share of revenue`;}
  else{chip='On track';cc='good';head=pv<-PT?`Payroll is ${Math.abs(pv*100).toFixed(1)}% under budget and the revenue ratio is in line`:`Payroll and the revenue ratio are on budget`;}
  const worst=over.slice().sort((a,b)=>(b.pct.af-b.pct.b)-(a.pct.af-a.pct.b))[0];
  const bl=[
   `Total payroll (Actual + Forecast) is Rp ${fmtM(T.total.af)} Mio against a budget of Rp ${fmtM(T.total.b)} Mio (${pct(pv)}). Operations payroll is ${pct(ov)} and admin payroll ${pct(adv)} versus budget.`,
   `Admits are ${pct(av)} and revenue ${pct(rv)} versus budget, so payroll takes ${pc1(T.pct.af)} of revenue against ${pc1(T.pct.b)} in the budget (${ppt(dpt)}).`,
   over.length?`${over.length} of 12 months are more than 0.5 pt above the budget ratio${worst?`; the largest gap is ${worst.label} (${pc1(worst.pct.af)} vs ${pc1(worst.pct.b)})`:''}.`:'No month is more than 0.5 pt above the budget ratio.',
   P?(la>=0?`Actual weeks run through ${P.weeks[la].label}. ${P.weeks.length-1-la} weeks are still forecast, so the full-year view will move as you update Admits and MHDW.`:'No week is marked as actual yet, so every number is forecast.'):'Weekly sheet for this scenario was not found.'
  ];
  document.getElementById('pVerdict').innerHTML=`<span class="stchip ${cc}">${chip}</span><h2>${head}</h2><ul>${bl.map(x=>`<li><span>${x}</span></li>`).join('')}</ul>`;
  const items=[
   ['Admits',T.admits.af,T.admits.b,fmt,'hi','admits',m=>m.admits.af,'admits'],
   ['Revenue',T.rev.af,T.rev.b,fmtM,'hi','rev',m=>m.rev.af,'Rp Mio'],
   ['Total payroll',T.total.af,T.total.b,fmtM,'lo','total',m=>m.total.af,'Rp Mio'],
   ['Payroll % of revenue',T.pct.af,T.pct.b,pc1,'lo','pct',m=>m.pct.af,'of revenue']];
  document.getElementById('pKpis').innerHTML=items.map(([l,af,b,f,g,k,fn,u],i)=>{
    const isP=k==='pct', v=isP?af-b:af/b-1, c=vcls(isP?(af/b-1):v,g), icon=ICON[v>0.0005?'up':v<-0.0005?'down':'flat'];
    return `<div class="card kpi ${i===2?'hl':''}"><div class="l">${l} · full year</div><div class="v">${f(af)}</div><div class="u">${u}</div>${ksp(S.months.map(fn))}
     <div class="delta ${dcls(c)}">${icon}${isP?ppt(v):pct(v)} <span>vs budget</span></div><div class="sub2">Budget ${f(b)}</div></div>`;}).join('');
}
function payOpts(){ const o=makeOpts().opts; o.plugins.legend={display:true,position:'bottom',align:'start',labels:{usePointStyle:true,boxWidth:8,boxHeight:8,color:css('--muted'),padding:14}}; o.interaction={mode:'index',intersect:false}; o.plugins.tooltip.mode='index'; o.plugins.tooltip.intersect=false; return o; }
function renderPayMonths(S,st){
  const M=S.months, blue=css('--blue'), flat=css('--flat'), c1=css('--c1'), c2=css('--c2'), c3=css('--c3'), labels=M.map(m=>m.label);
  const isF=M.map(m=>st[m.m]==='forecast'), isP=M.map(m=>st[m.m]==='part');
  const o=payOpts(); o.scales.y.ticks.callback=v=>fmt(v); o.scales.y.min=0;
  o.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': Rp '+fmt(c.parsed.y)+' Mio';
  mk('cPayM',{type:'bar',data:{labels,datasets:[
    {label:'Budget',data:M.map(m=>m.total.b/1e6),backgroundColor:A(flat,.55),borderRadius:6,borderSkipped:'bottom',maxBarThickness:22},
    {label:'Actual + Forecast',data:M.map(m=>m.total.af/1e6),backgroundColor:M.map((m,i)=>isF[i]?A(blue,.5):isP[i]?A(blue,.75):blue),borderRadius:6,borderSkipped:'bottom',maxBarThickness:22}]},options:o});
  const o2=payOpts(); const all=M.flatMap(m=>[m.pct.b,m.pct.af]).filter(x=>x!=null); o2.scales.y.min=Math.max(0,Math.floor(Math.min(...all)*100-1)/100); o2.scales.y.ticks.callback=v=>(v*100).toFixed(0)+'%';
  o2.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+pc1(c.parsed.y);
  mk('cPayPct',{type:'line',data:{labels,datasets:[
    {label:'Budget',data:M.map(m=>m.pct.b),borderColor:flat,backgroundColor:flat,borderWidth:2.4,borderDash:[6,4],pointRadius:3,tension:.25},
    {label:'Actual + Forecast',data:M.map(m=>m.pct.af),borderColor:blue,backgroundColor:blue,borderWidth:3,pointRadius:4,pointBorderColor:css('--surface'),pointBorderWidth:2,tension:.25}]},options:o2});
  const o3=payOpts(); o3.scales.y.ticks.callback=v=>v+'%'; o3.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+(c.parsed.y>=0?'+':'−')+Math.abs(c.parsed.y).toFixed(1)+'% vs budget';
  const vr=k=>M.map(m=>m[k].b?(m[k].af/m[k].b-1)*100:null);
  mk('cPayVar',{type:'bar',data:{labels,datasets:[
    {label:'Admits',data:vr('admits'),backgroundColor:c1,borderRadius:4,borderSkipped:false,maxBarThickness:16},
    {label:'Revenue',data:vr('rev'),backgroundColor:c2,borderRadius:4,borderSkipped:false,maxBarThickness:16},
    {label:'Total payroll',data:vr('total'),backgroundColor:c3,borderRadius:4,borderSkipped:false,maxBarThickness:16}]},options:o3});
  /* table */
  const g=(b,a)=>b?a/b-1:null, vv=(x,good)=>x==null?'<span class="vv flat">n/a</span>':`<span class="vv ${vcls(x,good)}">${pct(x)}</span>`;
  const chip=k=>`<span class="pchip ${k}">${k==='part'?'part actual':k}</span>`;
  const row=(m,tot)=>{const k=tot?null:st[m.m];
    return `<tr class="${tot?'tot':''}"><td class="mo">${tot?'Total':m.label}</td><td style="text-align:left">${tot?'':chip(k||'forecast')}</td>
    <td class="sep">${fmt(m.admits.b)}</td><td>${fmt(m.admits.af)}</td><td>${vv(g(m.admits.b,m.admits.af),'hi')}</td>
    <td class="sep">${fmtM(m.rev.b)}</td><td>${fmtM(m.rev.af)}</td><td>${vv(g(m.rev.b,m.rev.af),'hi')}</td>
    <td class="sep">${fmtM(m.total.b)}</td><td>${fmtM(m.total.af)}</td><td>${vv(g(m.total.b,m.total.af),'lo')}</td>
    <td class="sep">${pc1(m.pct.b)}</td><td>${pc1(m.pct.af)}</td><td><span class="vv ${vcls((m.pct.af-m.pct.b)/m.pct.b,'lo')}">${ppt(m.pct.af-m.pct.b)}</span></td></tr>`;};
  const head='<th>Month</th><th style="text-align:left">Status</th><th class="sep">Admits B</th><th>A + F</th><th>Var</th><th class="sep">Revenue B</th><th>A + F</th><th>Var</th><th class="sep">Total payroll B</th><th>A + F</th><th>Var</th><th class="sep">% of revenue B</th><th>A + F</th><th>Diff</th>';
  document.getElementById('pTable').innerHTML=`<table class="ptable ptbl"><thead><tr>${head}</tr></thead><tbody>${M.map(m=>row(m,false)).join('')}${S.total?row(S.total,true):''}</tbody></table>`;
  PAY.tsv=['Month\tAdmits B\tAdmits A+F\tRevenue B (Mio)\tRevenue A+F (Mio)\tPayroll B (Mio)\tPayroll A+F (Mio)\t% of revenue B\t% of revenue A+F',...M.map(m=>[m.label,m.admits.b,m.admits.af,m.rev.b/1e6,m.rev.af/1e6,m.total.b/1e6,m.total.af/1e6,(m.pct.b*100).toFixed(2),(m.pct.af*100).toFixed(2)].map(x=>typeof x==='number'?Math.round(x*100)/100:x).join('\t'))].join('\n');
}
function renderPayWeeks(P,la){
  if(!P) return;
  const W=P.weeks, blue=css('--blue'), flat=css('--flat'), mu=css('--muted');
  const col=W.map(w=>w.actual?blue:A(blue,.5)), labels=W.map(w=>MON3_[w.month]+' '+w.short);
  document.getElementById('wkSub').textContent=la>=0?`actual through ${W[la].label}`:'all weeks are forecast';
  const wa=la>=0?la:0, prev=la>0?la-1:null;
  const kp=(l,v,f,pv,good)=>{const dn=W[wa].days,dp=prev!=null?W[prev].days:7,d=pv?(v/dn)/(pv/dp)-1:null;return `<div class="mk"><small>${l}</small><b>${f(v)}</b><span>${d==null?'&nbsp;':`<span class="vv ${vcls(d,good)}">${pct(d)}</span> vs previous week, per day`}</span></div>`;};
  const tp=P.tot.prod?P.tot.prod[wa]:null;
  document.getElementById('wKpis').innerHTML=
    kp('Admits · '+W[wa].label,P.tot.admits[wa],fmt,prev!=null?P.tot.admits[prev]:null,'hi')+
    kp('MHDW · '+W[wa].label,P.tot.mhdw[wa],fmt,prev!=null?P.tot.mhdw[prev]:null,'lo')+
    `<div class="mk hl"><small>Productivity · ${W[wa].label}</small><b>${tp!=null?tp.toFixed(1):'n/a'}</b><span>admits per man-hour${P.target?' · target '+P.target:''}</span></div>`+
    `<div class="mk"><small>Weeks with actual data</small><b>${W.filter(w=>w.actual).length} of ${W.length}</b><span>${W.length-W.filter(w=>w.actual).length} still forecast</span></div>`;
  const base=()=>{const o=payOpts(); o.plugins.legend={display:false}; o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:innerWidth<640?6:12}; o.plugins.tooltip.callbacks.title=c=>W[c[0].dataIndex].label+(W[c[0].dataIndex].actual?' · actual':' · forecast'); return o;};
  const oa=base(); oa.plugins.tooltip.callbacks.label=c=>' Admits: '+fmt(c.parsed.y);
  mk('cWkA',{type:'bar',data:{labels,datasets:[{data:P.tot.admits,backgroundColor:col,borderRadius:5,borderSkipped:'bottom',maxBarThickness:20}]},options:oa});
  const om=base(); om.plugins.tooltip.callbacks.label=c=>' MHDW: '+fmt(c.parsed.y);
  mk('cWkM',{type:'bar',data:{labels,datasets:[{data:P.tot.mhdw,backgroundColor:col,borderRadius:5,borderSkipped:'bottom',maxBarThickness:20}]},options:om});
  const op=base(); op.scales.y.ticks.callback=v=>v; op.plugins.legend={display:true,position:'bottom',align:'start',labels:{usePointStyle:true,boxWidth:8,boxHeight:8,color:mu,padding:14}}; op.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+c.parsed.y.toFixed(2);
  const pr=P.tot.prod||[]; if(pr.length){const all=pr.filter(x=>x!=null).concat(P.target?[P.target]:[]); op.scales.y.min=Math.max(0,Math.floor(Math.min(...all)-1)); }
  mk('cWkP',{type:'line',data:{labels,datasets:[
    {label:'Admits per man-hour',data:pr,borderColor:blue,backgroundColor:blue,borderWidth:3,pointRadius:3,pointHoverRadius:6,tension:.25,segment:{borderDash:c=>W[c.p1DataIndex]&&W[c.p1DataIndex].actual?undefined:[5,4]}},
    ...(P.target?[{label:'Target',data:W.map(()=>P.target),borderColor:flat,backgroundColor:flat,borderWidth:2,borderDash:[7,5],pointRadius:0}]:[])]},options:op});
}
const MON3_=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function renderPaySites(P,la){
  if(!P) return; const W=P.weeks;
  const sel=document.getElementById('psWk'); if(PAY.wk==null||PAY.wk>=W.length) PAY.wk=Math.max(0,la);
  sel.innerHTML=W.map((w,i)=>`<option value="${i}">${w.label}${w.actual?'':' (forecast)'}</option>`).join(''); sel.value=PAY.wk;
  const j=PAY.wk, q=PAY.q.trim().toLowerCase();
  const net=P.tot.prod?P.tot.prod[j]:null; document.querySelectorAll('#psRef button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===PAY.ref));
  let rows=P.sites.filter(s=>s.admits[j]>0).map(s=>{const p=s.prod?s.prod[j]:null,t=PAY.ref==='avg'?net:(s.target||P.target); return {s,a:s.admits[j],m:s.mhdw[j],p,t,g:(p!=null&&t)?p/t-1:null};});
  const n0=rows.length, nok=rows.filter(r=>r.g!=null&&r.g>=-PT).length; rows=rows.filter(r=>!q||r.s.n.toLowerCase().includes(q));
  rows.sort((x,y)=>(x.g==null?9:x.g)-(y.g==null?9:y.g));
  const lim=12, shown=(PAY.expand||q)?rows:rows.slice(0,lim);
  document.getElementById('psSub').textContent=`${n0} sites with admits in ${W[j].label}`;
  document.getElementById('psHint').textContent=`${nok} of ${n0} sites are at or above ${PAY.ref==='avg'?'the network average':'target'}${net!=null?' · network average '+net.toFixed(1):''}${P.target?' · scenario target '+P.target:''}. Productivity is admits per man-hour, using the workbook's own formula. Tap a site to see the calculation.`;
  const sp=(s)=>{const v=(s.prod||[]).map((x,i)=>(x==null||!W[i].actual)?null:x), pts=v.map((x,i)=>x==null?null:[i,x]).filter(Boolean); if(pts.length<2) return ''; const lo=Math.min(...pts.map(p=>p[1])),hi=Math.max(...pts.map(p=>p[1]));
    return `<svg viewBox="0 0 96 26" aria-hidden="true"><polyline fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(([i,x])=>[(i/(W.length-1)*96).toFixed(1),(23-(x-lo)/(hi-lo||1)*20).toFixed(1)].join(',')).join(' ')}"/></svg>`;};
  const body=shown.map(r=>{const c=vcls(r.g,'hi'), ii=P.sites.indexOf(r.s), open=PAY.open.year===String(ii);return `<tr class="row" data-ps="${ii}" tabindex="0" role="button" aria-expanded="${open}"><td><div class="sn"><span class="chev ${open?'o':''}" aria-hidden="true"></span><span class="sd ${dcls(c)}"></span><span><b>${short(r.s.n)}</b></span></div></td><td>${fmt(r.a)}</td><td>${fmt(r.m)}</td><td>${r.p!=null?r.p.toFixed(1):'n/a'}</td><td>${r.t||'n/a'}</td><td>${r.g==null?'<span class="sub">n/a</span>':`<span class="cell ${dcls(c)} on">${pct(r.g)}</span>`}</td><td class="sp hs">${sp(r.s)}</td></tr>`+(open?`<tr class="calcrow"><td colspan="7">${calcPanel(P,r.s,[j],short(r.s.n)+' · '+W[j].label)}</td></tr>`:'');}).join('');
  document.getElementById('psTable').innerHTML=`<table class="ptable"><thead><tr><th>Site</th><th>Admits</th><th>MHDW</th><th>Admits per man-hour</th><th>${PAY.ref==='avg'?'Network avg':'Target'}</th><th>vs ${PAY.ref==='avg'?'average':'target'}</th><th class="hs">Actual weeks</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('psMore').innerHTML=(!q&&rows.length>lim)?`<button type="button" class="chipbtn" data-pmore aria-pressed="true">${PAY.expand?'Show worst '+lim:'Show all '+rows.length+' sites'}</button>`:'';
}
function renderPayFoot(d,P,la){
  const m=d.meta||{};
  document.getElementById('payFoot').innerHTML=`<div>Productivity uses the workbook's own formula: admits ÷ (headcount in column AM × 40 hours × days ÷ 7 + MHDW). That column is "FT 1st" and leaves out "FT 2nd" and "CL", so if site values look too low, check it with your team.</div>
   <div>Revenue "Actual + Forecast" follows the workbook: budget revenue adjusted by the admits variance. Months before July have no weekly detail and are treated as actual. A week counts as actual when its Admits and MHDW cells hold typed numbers; weeks that still contain formulas count as forecast. MTD uses only the weeks marked actual, so a week that is not finished yet will pull the per-day numbers down.</div>
   <div>${m.source?'Source file: '+m.source+' · ':''}processed ${new Date(m.generatedAt).toLocaleString(EN,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}. Numbers are read in this browser and saved only on this device.${P&&la>=0?' Last actual week: '+P.weeks[la].label+'.':''} <button type="button" class="chipbtn" id="payClear" aria-pressed="false">Clear saved payroll data</button></div>
   ${(m.problems||[]).length?`<div>Notes: ${m.problems.join(' ')}</div>`:''}`;
}
function wirePay(){
  const $=id=>document.getElementById(id); wireCalc();
  $('appTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.app!==APP)setApp(b.dataset.app);});
  $('payUp').addEventListener('click',()=>$('fileIn').click());
  $('pScen').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.sc=b.dataset.sc;PAY.wk=null;renderPay();});
  $('psWk').addEventListener('change',e=>{PAY.wk=+e.target.value;renderPay();});
  $('psRef').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.ref=b.dataset.r;renderPay();});
  $('psQ').addEventListener('input',e=>{PAY.q=e.target.value;renderPay();});
  $('psMore').addEventListener('click',e=>{if(e.target.closest('[data-pmore]')){PAY.expand=!PAY.expand;renderPay();}});
  $('pView').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.view=b.dataset.v;renderPay();window.scrollTo(0,0);});
  $('mtdSort').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PAY.msort=b.dataset.s;PAY.mexp=false;renderPay();});
  $('mtdQ').addEventListener('input',e=>{PAY.mq=e.target.value;renderPay();});
  $('mtdMore').addEventListener('click',e=>{if(e.target.closest('[data-mmore]')){PAY.mexp=!PAY.mexp;renderPay();}});
  $('pCopy').addEventListener('click',()=>copyText(PAY.tsv||'',$('pCopyMsg')));
  document.addEventListener('click',e=>{if(e.target.closest('#payClear')){try{localStorage.removeItem('payroll.v1');}catch(x){} PAY.d=null; renderPay(); msg('Saved payroll data was cleared from this device.','ok');}});
  document.querySelectorAll('#navPay button').forEach(b=>b.addEventListener('click',()=>$(b.dataset.t).scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})));
}

function render(){
  if(APP==='pay'){renderPay();return;}
  const list=selected(); const P=periods(list);
  document.getElementById('asof').textContent=`Data through ${dm(days[N-1])} 2026 · ${list.length} sites${REGION==='All'?'':' · '+REGION}`;
  const {zs}=renderHero(P,list); renderKpis(P); renderStrip(zs); renderCharts(P); renderSites(list); renderConcern(list,P); renderProgram(); renderFoot(list); renderMom(); renderExplorer(); renderWeekly(); App.refresh();
  document.getElementById('yoyBtn').textContent='Oct 2025';
}
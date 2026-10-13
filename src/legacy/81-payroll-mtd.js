/* ---------- MTD view ---------- */
const MONF_=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mtdInfo(){
  if(!PAY.d) return null; const d=PAY.d,P=d.prod[PAY.sc],S=d.summary[PAY.sc]; if(!P) return null;
  const la=lastActual(P); if(la<0) return null;
  const W=P.weeks, M=W[la].month, pm=M-1;
  const idx=m=>W.map((w,i)=>i).filter(i=>W[i].month===m&&W[i].actual);
  const sum=(ix,f)=>ix.reduce((s,i)=>s+(f(i)||0),0);
  const agg=(ix,adm,mh,pr)=>{ if(!ix.length) return null; const days=sum(ix,i=>W[i].days), a=sum(ix,i=>adm[i]), m=sum(ix,i=>mh[i]),
      den=pr?sum(ix,i=>pr[i]>0?adm[i]/pr[i]:0):0; return {ix,days,adm:a,mh:m,prod:den>0?a/den:null,ad:a/days,md:m/days}; };
  const cur=idx(M), prv=pm>=0?idx(pm):[];
  const T=agg(cur,P.tot.admits,P.tot.mhdw,P.tot.prod), Tp=prv.length?agg(prv,P.tot.admits,P.tot.mhdw,P.tot.prod):null;
  const dim=new Date(d.year,M+1,0).getDate(), dimP=pm>=0?new Date(d.year,pm+1,0).getDate():null;
  const mo=S.months[M], moP=pm>=0?S.months[pm]:null;
  const first=W[cur[0]].short.split('–')[0], last=W[cur[cur.length-1]].short.split('–')[1];
  return {d,P,S,W,M,pm,cur,prv,T,Tp,dim,dimP,mo,moP,la,bud:mo?mo.admits.b/dim:null,budP:moP?moP.admits.b/dimP:null,
    mon:MON3_[M],monP:pm>=0?MON3_[pm]:null,range:`${first}–${last} ${MON3_[M]}`,rest:W.filter(w=>w.month===M&&!w.actual).length,agg};
}
function payView(){ return (PAY.view==='mtd'&&mtdInfo())?'mtd':'year'; }
function applyPayView(){
  const v=payView(), hasM=!!mtdInfo(), P=PAY.d&&PAY.d.prod[PAY.sc];
  const show={'p-mtd':v==='mtd','p-sum':v==='year','p-mon':v==='year','p-wk':v==='year'&&!!P,'p-site':v==='year'&&!!P,'p-cost':!!(P&&P.meta&&P.meta.compNames&&P.meta.compNames.includes('OPR')),'p-how':!!(P&&P.meta)};
  Object.keys(show).forEach(id=>{document.getElementById(id).hidden=!show[id]; document.querySelector('#navPay [data-t="'+id+'"]').hidden=!show[id];});
  const info=mtdInfo(), lab=info?'MTD '+info.mon:'MTD';
  document.getElementById('pViewMtd').textContent=lab; document.getElementById('pViewMtd').hidden=!hasM; document.getElementById('navMtd').textContent=lab;
  document.querySelectorAll('#pView button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));
}
function renderPayMtd(){
  const I=mtdInfo(); if(!I) return;
  const {P,S,W,T,Tp,mo,moP,mon,monP,bud,budP}=I, st=I.d.status[PAY.sc]||{};
  const dBud=bud?T.ad/bud-1:null, dPrev=Tp?T.ad/Tp.ad-1:null, mPrev=Tp?T.md/Tp.md-1:null, pPrev=(Tp&&Tp.prod&&T.prod)?T.prod/Tp.prod-1:null;
  const tgt=P.target||null, pTgt=(tgt&&T.prod)?T.prod/tgt-1:null;
  document.getElementById('mtdH').firstChild.textContent='MTD '+mon+' ';
  document.getElementById('mtdSub').textContent=`${I.range} · ${T.days} days · Productivity ${PAY.sc}`;
  /* verdict */
  const dr=mo.pct.af-mo.pct.b, tv=mo.total.af/mo.total.b-1;
  let chip,cc,head;
  if(tv>PT){chip='Over budget';cc='bad';}else if(dr>0.003){chip='Watch the ratio';cc='watch';}else{chip='On track';cc='good';}
  const dirA=dBud==null?'':dBud<-PT?'below':dBud>PT?'above':'in line with';
  head=dBud==null?`${mon} so far: ${fmt(T.adm)} admits over ${T.days} days`:`${mon} so far, admits run ${dirA==='in line with'?'in line with':Math.abs(dBud*100).toFixed(1)+'% '+dirA} the budget pace`+(dPrev!=null?`, and ${dPrev<-PT?'MHDW use is '+(mPrev<0?'down '+Math.abs(mPrev*100).toFixed(0)+'%':'up '+(mPrev*100).toFixed(0)+'%')+' per day':'MHDW use is '+(mPrev<0?'down '+Math.abs(mPrev*100).toFixed(0)+'%':'up '+(mPrev*100).toFixed(0)+'%')+' per day'}`:'');
  const bl=[
   `Admits: ${fmt(T.adm)} in ${T.days} days, ${fmt(T.ad)} per day.${dBud!=null?` That is ${pct(dBud)} against the ${mon} budget pace (${fmt(bud)} per day)`:''}${dPrev!=null?` and ${pct(dPrev)} against ${monP} per day (${fmt(Tp.ad)}).`:'.'}`,
   `MHDW: ${fmt(T.mh)} hours, ${fmt(T.md)} per day${mPrev!=null?` (${pct(mPrev)} vs ${monP} per day, ${fmt(Tp.md)})`:''}. Lower is better.`,
   T.prod!=null?`Productivity: ${T.prod.toFixed(1)} admits per man-hour${tgt?` against a target of ${tgt} (${pct(pTgt)})`:''}${pPrev!=null?`, ${pct(pPrev)} vs ${monP}`:''}.`:'Productivity could not be calculated for these weeks.',
   `Full ${mon} outlook: payroll Rp ${fmtM(mo.total.af)} Mio against a budget of Rp ${fmtM(mo.total.b)} Mio (${pct(tv)}), taking ${pc1(mo.pct.af)} of revenue versus ${pc1(mo.pct.b)} in the budget (${ppt(dr)}). ${I.rest?`${I.rest} week${I.rest>1?'s':''} of ${mon} ${I.rest>1?'are':'is'} still forecast, so this will move as you update Admits and MHDW.`:`All weeks of ${mon} have actual data.`}`
  ];
  document.getElementById('mtdVerdict').innerHTML=`<span class="stchip ${cc}">${chip}</span><h2>${head}</h2><ul>${bl.map(x=>`<li><span>${x}</span></li>`).join('')}</ul>`;
  /* kpis */
  const wk=I.cur.concat([]); const perDay=(ix,arr)=>ix.map(i=>arr[i]/W[i].days);
  const spA=perDay((Tp?Tp.ix:[]).concat(I.cur),P.tot.admits), spM=perDay((Tp?Tp.ix:[]).concat(I.cur),P.tot.mhdw);
  const dl=(v,good,txt,isPt)=>{ if(v==null||!isFinite(v)) return `<div class="delta flat">${ICON.flat}n/a <span>${txt}</span></div>`; const c=vcls(v,good); return `<div class="delta ${dcls(c)}">${ICON[v>0.0005?'up':v<-0.0005?'down':'flat']}${isPt?ppt(v):pct(v)} <span>${txt}</span></div>`; };
  const card=(l,v,u,sp,d1,sub,hl)=>`<div class="card kpi ${hl?'hl':''}"><div class="l">${l}</div><div class="v">${v}</div><div class="u">${u}</div>${sp&&sp.length>1?ksp(sp):''}${d1}<div class="sub2">${sub}</div></div>`;
  document.getElementById('mtdKpis').innerHTML=
    card('Admits · '+mon+' MTD',fmt(T.adm),'admits',spA,dl(dBud,'hi','vs budget pace'),`${fmt(T.ad)} per day`+(dPrev!=null?` · ${pct(dPrev)} vs ${monP}`:''))+
    card('MHDW · '+mon+' MTD',fmt(T.mh),'man-hours',spM,dl(mPrev,'lo','vs '+(monP||'last month')+', per day'),`${fmt(T.md)} per day`)+
    card('Productivity · '+mon+' MTD',T.prod!=null?T.prod.toFixed(1):'n/a','admits per man-hour',null,dl(pTgt,'hi','vs target'),tgt?`Target ${tgt}`+(Tp&&Tp.prod?` · ${monP} ${Tp.prod.toFixed(1)}`:''):(Tp&&Tp.prod?`${monP} ${Tp.prod.toFixed(1)}`:''))+
    card(mon+' payroll outlook',fmtM(mo.total.af),'Rp Mio · full month',S.months.map(m=>m.total.af),dl(tv,'lo','vs budget'),`${pc1(mo.pct.af)} of revenue · budget ${pc1(mo.pct.b)}`,true);
  /* charts */
  const blue=css('--blue'), flat=css('--flat'), mu=css('--muted');
  const ix=(Tp?Tp.ix:[]).concat(W.map((w,i)=>i).filter(i=>W[i].month===I.M)); const labels=ix.map(i=>MON3_[W[i].month]+' '+W[i].short);
  const col=ix.map(i=>W[i].month===I.M?(W[i].actual?blue:A(blue,.5)):A(flat,.8));
  document.getElementById('mtdLeg').innerHTML=`<span><i style="background:${A(flat,.8)}"></i>${monP||'Last month'} (actual)</span><span><i style="background:var(--blue)"></i>${mon} MTD (actual)</span><span><i style="background:color-mix(in srgb,var(--blue) 50%,var(--surface))"></i>Rest of ${mon} (forecast)</span>`;
  const base=()=>{const o=payOpts(); o.plugins.legend={display:false}; o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:innerWidth<640?5:12}; o.scales.y.min=0; o.plugins.tooltip.callbacks.title=c=>{const w=W[ix[c[0].dataIndex]];return w.label+(w.actual?' · actual':' · forecast');}; return o;};
  const oa=base(); oa.scales.y.ticks.callback=v=>fmt(v); oa.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+fmt(c.parsed.y)+' per day';
  const bpd=ix.map(i=>W[i].month===I.M?bud:budP);
  mk('cMtdA',{type:'bar',data:{labels,datasets:[{label:'Admits',data:ix.map(i=>P.tot.admits[i]/W[i].days),backgroundColor:col,borderRadius:6,borderSkipped:'bottom',maxBarThickness:28,order:2},
    {type:'line',label:'Budget pace',data:bpd,borderColor:flat,backgroundColor:flat,borderWidth:2.2,borderDash:[7,5],pointRadius:0,stepped:true,order:1}]},options:oa});
  const om=base(); om.scales.y.ticks.callback=v=>fmt(v); om.plugins.tooltip.callbacks.label=c=>' MHDW: '+fmt(c.parsed.y)+' per day';
  mk('cMtdM',{type:'bar',data:{labels,datasets:[{label:'MHDW',data:ix.map(i=>P.tot.mhdw[i]/W[i].days),backgroundColor:col,borderRadius:6,borderSkipped:'bottom',maxBarThickness:28}]},options:om});
  /* sites */
  const siteAgg=s=>{const c=I.agg(I.cur,s.admits,s.mhdw,s.prod), p=Tp?I.agg(Tp.ix,s.admits,s.mhdw,s.prod):null; return {s,c,p};};
  let rows=P.sites.map(siteAgg).filter(r=>r.c&&r.c.adm>0).map(r=>{const t=r.s.target||P.target; return {...r,t,g:(r.c.prod!=null&&t)?r.c.prod/t-1:null,ch:(r.p&&r.p.ad>0)?r.c.ad/r.p.ad-1:null};});
  const n0=rows.length, q=PAY.mq.trim().toLowerCase(); rows=rows.filter(r=>!q||r.s.n.toLowerCase().includes(q));
  const nn=(v,d)=>v==null?d:v;
  rows.sort(PAY.msort==='mhdw'?(a,b)=>b.c.mh-a.c.mh:PAY.msort==='adm'?(a,b)=>nn(a.ch,9)-nn(b.ch,9):(a,b)=>nn(a.g,9)-nn(b.g,9));
  const lim=10, shown=(PAY.mexp||q)?rows:rows.slice(0,lim);
  document.querySelectorAll('#mtdSort button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===PAY.msort));
  document.getElementById('mtdSiteSub').textContent=`${n0} sites with admits in ${I.range}`;
  const top8=P.sites.map(siteAgg).filter(r=>r.c).sort((a,b)=>b.c.mh-a.c.mh).slice(0,8), th=top8.reduce((s,r)=>s+r.c.mh,0);
  document.getElementById('mtdHint').textContent=`The 8 sites with the most MHDW account for ${T.mh?Math.round(th/T.mh*100):0}% of all ${mon} MHDW so far. Productivity is admits per man-hour, using the workbook's own formula. Tap a site to see how it is calculated.`;
  const body=shown.map(r=>{const c=vcls(r.g,'hi'), cc2=vcls(r.ch,'hi'), ii=P.sites.indexOf(r.s), open=PAY.open.mtd===String(ii);
    return `<tr class="row" data-ps="${ii}" tabindex="0" role="button" aria-expanded="${open}"><td><div class="sn"><span class="chev ${open?'o':''}" aria-hidden="true"></span><span class="sd ${dcls(c)}"></span><span><b>${short(r.s.n)}</b></span></div></td><td>${fmt(r.c.ad)}</td><td>${r.ch==null?'<span class="sub">n/a</span>':`<span class="vv ${cc2}">${pct(r.ch)}</span>`}</td><td>${fmt(r.c.mh)}</td><td>${r.c.prod!=null?r.c.prod.toFixed(1):'n/a'}</td><td>${r.t||'n/a'}</td><td>${r.g==null?'<span class="sub">n/a</span>':`<span class="cell ${dcls(c)} on">${pct(r.g)}</span>`}</td></tr>`+(open?`<tr class="calcrow"><td colspan="7">${calcPanel(P,r.s,I.cur,short(r.s.n)+' · '+I.range)}</td></tr>`:'');}).join('');
  document.getElementById('mtdTable').innerHTML=`<table class="ptable"><thead><tr><th>Site</th><th>Admits per day</th><th>vs ${monP||'last month'}</th><th>MHDW</th><th>Admits per man-hour</th><th>Target</th><th>vs target</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('mtdMore').innerHTML=(!q&&rows.length>lim)?`<button type="button" class="chipbtn" data-mmore aria-pressed="true">${PAY.mexp?'Show top '+lim:'Show all '+rows.length+' sites'}</button>`:'';
}
/* ---------- Cost Breakdown section ---------- */
const CG=[['Basic pay',['BASIC'],'--c1'],['Daily workers (DW)',['DW'],'--c2'],['Contributions (TK, KS, PEN)',['TK','KS','PEN'],'--c3'],['Accruals (COMP, HOL AL)',['COMP','HOL AL'],'--c4'],['Allowances (MOD Al, MED AL, BIK)',['MOD Al','MED AL','BIK'],'--c5']];
function costMonth(P){ const M=P.meta, ms=M.compMonths||[]; if(!ms.length) return null;
  if(PAY.cm!=null&&ms.includes(PAY.cm)) return PAY.cm;
  const la=lastActual(P); return la>=0&&ms.includes(P.weeks[la].month)?P.weeks[la].month:ms[0]; }
function monthTot(P,k,m){ return P.sites.reduce((t,s)=>t+((s.c[k]&&s.c[k][m])||0),0); }
function monthAdmits(P,s,m,onlyActual){ let a=0; P.weeks.forEach((w,j)=>{ if(w.month===m&&(!onlyActual||w.actual)) a+=s.admits[j]||0; }); return a; }
function monthHours(P,s,m,key,onlyActual){ let h=0; P.weeks.forEach((w,j)=>{ if(w.month===m&&(!onlyActual||w.actual)) h+=(((s.hc&&s.hc[key])||0)*40*w.days/7)+(s.mhdw[j]||0); }); return h; }
function renderPayCost(){
  const sec=document.getElementById('p-cost'); const P=PAY.d&&PAY.d.prod[PAY.sc];
  if(!P||!P.meta||!P.meta.compNames||!P.meta.compNames.includes('OPR')){ return; }
  const M=P.meta, m=costMonth(P), st=(PAY.d.status&&PAY.d.status[PAY.sc])||{}, stl={actual:'actual',part:'part actual',forecast:'forecast'};
  document.getElementById('costSub').textContent=`${MON3_[m]} · ${stl[st[m]]||'forecast'} · Productivity ${PAY.sc}`;
  document.getElementById('costMon').innerHTML=M.compMonths.map(x=>`<button type="button" data-m="${x}" aria-pressed="${x===m}">${MON3_[x]}</button>`).join('');
  const tot=k=>monthTot(P,k,m), opr=tot('OPR'), adm=P.sites.reduce((t,s)=>t+monthAdmits(P,s,m),0), dw=tot('DW'), mhH=tot('MH DW');
  const sparkO=M.compMonths.map(x=>monthTot(P,'OPR',x));
  const hcA=P.sites.reduce((t,s)=>t+(s.hc.a1||0),0), hcS=P.sites.reduce((t,s)=>t+(s.hc.s2||0),0), nd=P.sites.filter(s=>(s.hc.a1||0)!==(s.hc.s2||0)).length;
  const kp=(l,v,u,sub,hl)=>`<div class="card kpi ${hl?'hl':''}"><div class="l">${l}</div><div class="v">${v}</div><div class="u">${u}</div><div class="sub2">${sub}</div></div>`;
  document.getElementById('costKpis').innerHTML=
    kp(MON3_[m]+' payroll (OPR)',nf(opr/1e6),'Rp Mio, all sites',`${nf(dw/(opr||1)*100,1)}% of it is daily workers`,true)+
    kp('Payroll per admit',adm>0?'Rp '+nf(opr/adm):'n/a','OPR ÷ admits',`${nf(adm)} admits in ${MON3_[m]}${st[m]==='actual'?'':' (includes forecast weeks)'}`)+
    kp('Daily-worker cost',nf(dw/1e6,1),'Rp Mio',mhH>0?`${nf(mhH)} MHDW hours · about Rp ${nf(dw/mhH)} per hour`:'no MHDW hours')+
    kp('Staff counted for cost',nf(hcS),'HC SEP · FT 2nd',`Productivity counts ${nf(hcA)} (HC AUG · FT 1st)${nd?` · ${nd} site${nd>1?'s':''} differ`:''}`);
  /* stacked months */
  const gs=CG.map(g=>({...g,k:g[1].filter(k=>M.compNames.includes(k))})).filter(g=>g.k.length);
  const mu=css('--muted'), surf=css('--surface'); const o=payOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.ticks.callback=v=>nf(v);
  o.plugins.tooltip.callbacks.label=c=>` ${c.dataset.label}: Rp ${nf(c.parsed.y,1)} Mio`;
  const alpha=x=>st[x]==='actual'?1:.55;
  mk('cCostM',{type:'bar',data:{labels:M.compMonths.map(x=>MON3_[x]),datasets:gs.map(g=>({label:g[0],data:M.compMonths.map(x=>g.k.reduce((t,k)=>t+monthTot(P,k,x),0)/1e6),backgroundColor:M.compMonths.map(x=>A(css(g[2]),alpha(x))),borderColor:surf,borderWidth:2,borderRadius:4,borderSkipped:false,maxBarThickness:46}))},options:o});
  /* shares for the selected month */
  const sh=gs.map(g=>({n:g[0],v:g.k.reduce((t,k)=>t+tot(k),0),c:g[2],k:g.k}));
  document.getElementById('costShare').innerHTML=`<div class="ch"><div><h3>Where the money goes · ${MON3_[m]}</h3><span class="sub">Share of OPR. Only daily workers move with MHDW; the rest follows headcount.</span></div></div>`+
    sh.map(x=>`<div class="shr"><div class="shl"><span><i style="background:var(${x.c})"></i>${esc(x.n)}</span><b>${nf(x.v/(opr||1)*100,1)}%</b><span class="sub">Rp ${nf(x.v/1e6,1)} Mio</span></div><div class="shb"><i style="width:${Math.min(100,x.v/(opr||1)*100).toFixed(1)}%;background:var(${x.c})"></i></div></div>`).join('')+
    (mhH>0?`<p class="hint" style="margin:12px 0 0">One extra MHDW hour costs about Rp ${nf(dw/mhH)} (hourly rate plus the TK add-on), so 100 hours is roughly Rp ${nf(dw/mhH*100/1e6,1)} Mio.</p>`:'');
  /* site table */
  const q=PAY.cq.trim().toLowerCase();
  let rows=P.sites.map((s,i)=>{const o2=s.c.OPR?s.c.OPR[m]:0, a=monthAdmits(P,s,m), hrs=monthHours(P,s,m,basisKey(P),false);
    return {s,i,opr:o2||0,basic:(s.c.BASIC&&s.c.BASIC[m])||0,dw:(s.c.DW&&s.c.DW[m])||0,a,rpa:a>0?o2/a:null,pr:hrs>0?a/hrs:null};}).filter(r=>r.opr>0);
  const n0=rows.length; rows=rows.filter(r=>!q||r.s.n.toLowerCase().includes(q));
  const key=PAY.cs; rows.sort(key==='opr'?(a,b)=>b.opr-a.opr:key==='dw'?(a,b)=>b.dw-a.dw:key==='adm'?(a,b)=>a.a-b.a:(a,b)=>(b.rpa==null?-1:b.rpa)-(a.rpa==null?-1:a.rpa));
  document.querySelectorAll('#costSort button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===key));
  const lim=12, shown=(PAY.cx||q)?rows:rows.slice(0,lim), mx=Math.max(...rows.map(r=>r.rpa||0),1), avg=adm>0?opr/adm:null;
  document.getElementById('costTSub').textContent=`${n0} sites with payroll in ${MON3_[m]}`;
  const body=shown.map(r=>{const open=PAY.open.cost===String(r.i), hot=avg&&r.rpa!=null&&r.rpa>avg*1.25;
    return `<tr class="row" data-ps="${r.i}" tabindex="0" role="button" aria-expanded="${open}"><td><div class="sn"><span class="chev ${open?'o':''}" aria-hidden="true"></span><span><b>${short(r.s.n)}</b></span></div></td><td class="hs">${nf(r.s.hc.a1)} → ${nf(r.s.hc.s2)}</td><td class="hs">${nf(r.basic/1e6,1)}</td><td class="hs">${nf(r.dw/1e6,1)}</td><td>${nf(r.opr/1e6,1)}</td><td>${nf(r.a)}</td><td><span class="mini"><i style="width:${r.rpa==null?0:(r.rpa/mx*100).toFixed(0)}%;background:${hot?'var(--up)':'var(--blue)'}"></i></span> ${r.rpa==null?'n/a':nf(r.rpa)}</td></tr>`+(open?`<tr class="calcrow"><td colspan="7">${costPanel(P,r.s,m)}</td></tr>`:'');}).join('');
  document.getElementById('costTable').innerHTML=`<table class="ptable"><thead><tr><th>Site</th><th class="hs">Staff (AUG → SEP)</th><th class="hs">Basic, Rp Mio</th><th class="hs">DW, Rp Mio</th><th>OPR, Rp Mio</th><th>Admits</th><th>Rp per admit</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('costMore').innerHTML=(!q&&rows.length>lim)?`<button type="button" class="chipbtn" data-cmore aria-pressed="true">${PAY.cx?'Show top '+lim:'Show all '+rows.length+' sites'}</button>`:'';
  document.getElementById('costHint').textContent=`${avg!=null?`Network average Rp ${nf(avg)} per admit. Red bars are more than 25% above it. `:''}Tap a site to see how its payroll is built, line by line, with the cell and formula behind each number.`;
}

/* ---------- Tracking: sites that are not in the main comparison ----------
   Sites with LWBP-only or stale meters, no 2025 baseline, no budget or no usable meter data. They are shown on their
   own with whatever readings exist: this month's average, change vs September, and budget where one is set. */
const TK={q:''};
const tkMean=a=>{const x=a.filter(v=>v!=null&&Number.isFinite(v));return x.length?{m:x.reduce((t,v)=>t+v,0)/x.length,n:x.length}:null;};
const tkMonth=(s,ym)=>tkMean(s.v.filter((_,i)=>days[i]&&days[i].startsWith(ym)));
function tkInfo(s){
  const ym=days[N-1].slice(0,7), pm=(()=>{const d=new Date(+ym.slice(0,4),+ym.slice(5)-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const cur=tkMonth(s,ym), prev=tkMonth(s,pm), no=(/^\d+/.exec(s.n)||[])[0], b=no&&BUDGET[+no], mi=+ym.slice(5)-1;
  const bud=b&&b.m[mi]?b.m[mi]/new Date(+ym.slice(0,4),mi+1,0).getDate():null;
  let lastIdx=-1; s.v.forEach((x,i)=>{if(x!=null) lastIdx=i;});
  const mom=cur&&prev?cur.m/prev.m-1:null, vb=cur&&bud?cur.m/bud-1:null;
  const stale=(s.meters||[]).filter(m=>m.last<days[N-1]);
  return {cur,prev,bud,mom,vb,last:lastIdx>=0?days[lastIdx]:null,stale,has:!!cur,pm};
}
function tkSpark(s){
  const v=s.v.slice(-30), x=v.filter(n=>n!=null); if(x.length<2) return '<span class="tk-none">—</span>';
  const lo=Math.min(...x), hi=Math.max(...x);
  const pts=v.map((n,i)=>n==null?null:[i/(v.length-1)*96,23-(n-lo)/(hi-lo||1)*20]).filter(Boolean);
  return `<svg viewBox="0 0 96 26" aria-hidden="true"><polyline fill="none" stroke="var(--flat)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}"/></svg>`;
}
const TKWHY=[[/no active meter/i,'No meter data yet'],[/no 2025 data/i,'No 2025 data'],[/estimated/i,'Readings look estimated'],[/odd readings/i,'Odd meter readings'],[/zero or negative/i,'Zero or negative days'],[/unusual daily swings/i,'Big daily swings'],[/below 100 kWh/i,'CT or unit may be wrong'],[/not plausible/i,'Level vs 2025 not plausible']];
function tkWhy(s,i){
  const out=[]; i.stale.forEach(m=>out.push(m.typ+' meter last updated '+dm(m.last)));
  const r=s.reason||''; TKWHY.forEach(([re,t])=>{if(re.test(r)&&!out.includes(t)) out.push(t);});
  if(i.vb!=null&&(i.vb>1.5||i.vb<-.6)) out.push('Value far from budget, check meter');
  return out;
}
const tkCell=(p,hi)=>p==null?'<span class="cell flat">—</span>':`<span class="cell ${p>CT.hi?'up':p>CT.lo?'warn':p<-CT.lo?'down':'flat'}${hi?' on':''}">${pct(p)}</span>`;
function tkRows(){
  const q=TK.q.trim().toLowerCase();
  return (DATA.track||[]).filter(s=>(REGION==='All'||s.r===REGION)&&(!q||s.n.toLowerCase().includes(q))).map(s=>({s,i:tkInfo(s)}))
    .sort((a,b)=>(b.i.has-a.i.has)||(parseInt(a.s.n)-parseInt(b.s.n)));
}
function renderTrack(){
  const sec=document.getElementById('s-track'); if(!sec||!DATA||!days) return;
  const nb=document.querySelector('#nav [data-t="s-track"]'), all=DATA.track||[];
  if(nb) nb.hidden=!all.length; sec.hidden=!all.length&&sec.hidden; if(!all.length) return;
  const rows=tkRows(), wd=rows.filter(r=>r.i.has).length, nod=rows.length-wd, ym=days[N-1].slice(0,7), mname=MONFULL[+ym.slice(5)-1];
  document.getElementById('tkSum').innerHTML=`<b>${rows.length}</b> site${rows.length===1?'':'s'} · <span class="fu none">${wd} with readings this month</span>${nod?` <span class="fu open">${nod} without usable meter data</span>`:''}`;
  const body=rows.map(({s,i})=>{
    const why=tkWhy(s,i), off=i.vb!=null&&(i.vb>1.5||i.vb<-.6);
    return `<tr class="row trow" data-tk="${fuEsc(s.n)}" tabindex="0">
     <td><div class="sn"><span class="sd ${i.has?'flat':'off'}"></span><span><b>${short(s.n)}${fuHas(s.n)?'<i class="nd" title="Has a note"></i>':''}</b><small>${s.r}${(s.meters||[]).length?' · '+s.meters.map(m=>m.typ).join(' + '):''}</small></span></div></td>
     <td class="tk-why" data-notr>${why.length?why.map(w=>`<span class="fu ${/far from|wrong/.test(w)?'open':'none'}">${fuEsc(w)}</span>`).join(' '):'<span class="fu resolved">OK</span>'}</td>
     <td>${i.has?`<div class="okt"><span>${fmt(i.cur.m)}</span></div><small class="tk-n">${i.cur.n} day${i.cur.n===1?'':'s'}</small>`:'<span class="cell flat">—</span>'}</td>
     <td class="hs">${off?'<span class="cell flat">—</span>':tkCell(i.mom)}</td>
     <td class="hs">${i.bud?`<div class="okt"><span>${fmt(i.bud)}</span></div>${off?'<span class="cell flat">—</span>':tkCell(i.vb,true)}`:'<small class="tk-n">No budget</small>'}</td>
     <td class="sp hs">${tkSpark(s)}</td><td class="nt">${fuChip(s.n)}</td></tr>`;}).join('');
  document.getElementById('tkList').innerHTML=`<table class="ptable"><thead><tr><th>Site</th><th>Why it is here</th><th>${mname} avg kWh/day</th><th class="hs">vs ${MONFULL[+tkInfo(all[0]).pm.slice(5)-1]}</th><th class="hs">Budget/day · vs budget</th><th class="hs">Last 30 days</th><th class="nt">Notes</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
}
function openTrack(n){
  const s=(DATA.track||[]).find(x=>x.n===n); if(!s) return; lastFocus=document.activeElement;
  const i=tkInfo(s), L=s.v.length, types=Object.keys(s.m||{}).filter(t=>s.m[t].some(x=>x!=null));
  const st=[['Last reading',i.last?dm(i.last):'none',''],[MONFULL[+days[N-1].slice(5,7)-1]+' avg',i.cur?fmt(i.cur.m)+' kWh/day':'—',''],['vs '+MONFULL[+i.pm.slice(5)-1],i.mom==null?'—':pct(i.mom),i.mom==null?'':cls(i.mom)],['Budget per day',i.bud?fmt(i.bud)+' kWh':'No budget set',''],['vs budget',i.vb==null?'—':pct(i.vb),i.vb==null?'':(i.vb>CT.hi?'up':i.vb<-CT.lo?'down':'')]];
  document.getElementById('mBody').innerHTML=`<div class="mhead">${mini(i.vb!=null&&i.vb>CT.hi?'up':'flat')}<div><h3 id="mTitle">${short(n)}</h3><div class="sub">${s.r?s.r+' · ':''}Tracked on its own${types.length?' · '+types.join(' + ')+' meter':''}</div></div></div>
   <div class="mstats">${st.map(([l,v,c])=>`<div class="ms"><small>${l}</small><b class="${c}">${v}</b></div>`).join('')}</div>
   ${types.length?`<div class="chartbox" style="height:280px"><canvas id="cSite" role="img" aria-label="Daily kWh for ${short(n)}"></canvas></div>
   <p class="note" style="margin-top:10px">Why it is here: <span data-notr>${fuEsc(tkWhy(s,i).join('; ')||'—')}</span>. Gaps in the line are days without a complete reading.</p>`:`<p class="note" style="margin-top:14px">This site has no usable meter data in the sheet yet. You can still add notes below.</p>`}`;
  document.getElementById('modal').hidden=false; document.body.style.overflow='hidden'; if(typeof fuMount==='function') fuMount(n);
  if(types.length){
    const {opts,mu}=makeOpts(); const o=opts; o.plugins.legend={display:types.length>1,labels:{color:mu,boxWidth:12}};
    o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:8,callback:function(v){return dm(days[v]);}};
    o.plugins.tooltip.callbacks.title=c=>dm(days[c[0].dataIndex]); o.spanGaps=false;
    const ds=[{label:types.length>1?'Total':'Daily',data:s.v,borderColor:css('--blue'),borderWidth:3,pointRadius:0,tension:.2,spanGaps:false}];
    if(types.length>1) types.forEach((t,k)=>ds.push({label:t,data:s.m[t],borderColor:css(k?'--down':'--flat'),borderWidth:1.5,pointRadius:0,tension:.2,borderDash:[4,3],spanGaps:false}));
    mk('cSite',{type:'line',data:{labels:days.slice(0,L),datasets:ds},options:o});
  }
  document.querySelector('.mclose').focus();
}
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='tkQ'){TK.q=e.target.value; renderTrack();} });
document.addEventListener('click',e=>{ const r=e.target.closest('[data-tk]'); if(r) openTrack(r.dataset.tk); });
document.addEventListener('keydown',e=>{ if(e.key==='Enter'){const r=e.target.closest&&e.target.closest('tr[data-tk]'); if(r) openTrack(r.dataset.tk);} });

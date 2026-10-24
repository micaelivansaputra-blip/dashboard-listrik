/* ---------- site explorer ---------- */
const EX={sel:[],col:{},from:null,to:null,range:'30',view:'daily',scale:'abs',ly:false};
const XC=['--c1','--c2','--c3','--c4','--c5'];
const hv=s=>DATA.hist.v[s.n]||(DATA.hist.t&&DATA.hist.t[s.n])||[];
/* every site that can be tracked here: the main sites plus the Tracking sites that have readings */
const exAll=()=>DATA.sites.concat(Object.keys(DATA.hist.t||{}).map(n=>{const t=(DATA.track||[]).find(x=>x.n===n);return t?Object.assign({},t,{track:true,p:false}):null;}).filter(Boolean));
const hIdx=d=>Math.round((dt(d)-dt(DATA.hist.d0))/864e5);
function exFill(arr,edges){ // fill the few missing days so lines stay continuous (edges=false keeps the gaps before the first and after the last reading)
  const out=arr.slice(); let last=null; for(let i=0;i<out.length;i++){ if(out[i]==null) out[i]=last; else last=out[i]; }
  let nx=null; for(let i=out.length-1;i>=0;i--){ if(out[i]==null) out[i]=nx; else nx=out[i]; }
  if(edges===false){ const f=arr.findIndex(x=>x!=null); let l=-1; arr.forEach((x,i)=>{if(x!=null) l=i;}); for(let i=0;i<out.length;i++) if(i<f||i>l) out[i]=null; }
  return out; }
const exF=s=>exFill(hv(s),s.track?false:undefined);
const exMa=(full,i)=>{ if(i<6) return null; const w=full.slice(i-6,i+1); return w.some(x=>x==null)?null:mean(w); };
function exAdd(n){
  if(EX.sel.includes(n)) return; if(EX.sel.length>=5){document.getElementById('xNote').textContent='You can compare up to 5 sites. Remove one first.';return;}
  const used=Object.entries(EX.col).filter(([k])=>EX.sel.includes(k)).map(([,v])=>v); EX.col[n]=XC.find(c=>!used.includes(c)); EX.sel.push(n);
}
function exDefault(){
  const L=selected().map(s=>({s,a:siteAvg(s)})).sort((x,y)=>y.a.mom-x.a.mom).slice(0,3); EX.sel=[]; EX.col={}; L.forEach(r=>exAdd(r.s.n));
}
function exSetRange(r){
  EX.range=r; if(r==='all'&&EX.view==='daily') EX.view='ma7'; else if(r!=='all'&&r!=='custom'&&EX.autoMa){EX.view='daily';} EX.autoMa=(r==='all'); const last=days[N-1], first=DATA.hist.d0; let from=first;
  if(r==='14') from=addDays(last,-13); else if(r==='30') from=addDays(last,-29); else if(r==='zoec') from=days[iProg]; else from=first;
  EX.from=from<first?first:from; EX.to=last;
}
function exSeries(s){ // returns {dates,vals} for selected range, honouring view
  const full=exF(s), base=EX.view==='ma7'?full.map((_,i)=>exMa(full,i)):full;
  const i0=hIdx(EX.from), i1=hIdx(EX.to), dates=[], vals=[];
  for(let i=Math.max(0,i0);i<=Math.min(full.length-1,i1);i++){ dates.push(addDays(DATA.hist.d0,i)); vals.push(base[i]); }
  return {dates,vals,raw:full};
}
function renderExplorer(){
  const sec=document.getElementById('s-explore'), nb=document.querySelector('#nav [data-t="s-explore"]');
  if(!hasHist()){sec.hidden=true; if(nb)nb.hidden=true; return;} sec.hidden=false; if(nb)nb.hidden=false;
  EX.sel=EX.sel.filter(n=>exAll().some(s=>s.n===n)); if(!EX.sel.length) exDefault();
  if(!EX.from) exSetRange(EX.range);
  const sites=EX.sel.map(n=>exAll().find(s=>s.n===n)), last=days[N-1];
  document.getElementById('xFrom').min=document.getElementById('xTo').min=DATA.hist.d0; document.getElementById('xFrom').max=document.getElementById('xTo').max=last;
  document.getElementById('xFrom').value=EX.from; document.getElementById('xTo').value=EX.to;
  document.querySelectorAll('#xRange button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===EX.range));
  document.querySelectorAll('#xView button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===EX.view));
  document.querySelectorAll('#xScale button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===EX.scale));
  const lyOk=sites.length===1&&EX.scale==='abs'&&addDays(EX.to,-364)>=DATA.hist.y0&&addDays(EX.from,-364)<=addDays(DATA.hist.y0,histLen('y')-1);
  const lyBtn=document.getElementById('xLy'); lyBtn.disabled=!lyOk; lyBtn.style.opacity=lyOk?'':'.4'; lyBtn.setAttribute('aria-pressed',lyOk&&EX.ly);
  document.getElementById('xChips').innerHTML=sites.map(s=>`<span class="xchip"><i style="background:var(${EX.col[s.n]})"></i>${short(s.n)}<button type="button" data-rm="${s.n}" aria-label="Remove ${short(s.n)}">×</button></span>`).join('')||'<span class="sub">No site selected. Search above or use a quick pick.</span>';
  const {opts,mu}=makeOpts(), o=opts, dates=[]; for(let i=hIdx(EX.from);i<=hIdx(EX.to);i++) if(i>=0&&i<DATA.hist.n) dates.push(addDays(DATA.hist.d0,i));
  const ds=sites.map(s=>{const x=exSeries(s); let v=x.vals; if(EX.scale==='idx'){const m=mean(v.filter(z=>z!=null)); v=v.map(z=>z==null?null:z/m*100);} const c=css(EX.col[s.n]);
    return {label:short(s.n),data:v,borderColor:c,backgroundColor:c,borderWidth:EX.view==='ma7'?3:2.2,pointRadius:0,pointHoverRadius:5,tension:.2,spanGaps:true};});
  let lyLine=null;
  if(lyOk&&EX.ly){const y=DATA.hist.y[sites[0].n]; ds.push({label:'Same days last year',data:dates.map(d=>{const j=Math.round((dt(addDays(d,-364))-dt(DATA.hist.y0))/864e5); return (j>=0&&j<y.length)?y[j]:null;}),borderColor:css('--flat'),backgroundColor:css('--flat'),borderWidth:2,borderDash:[6,4],pointRadius:0,pointHoverRadius:4,tension:.2,spanGaps:true}); lyLine=true;}
  document.getElementById('xLegend').innerHTML=ds.map((d,i)=>`<span><i style="background:${d.borderColor};${d.borderDash?'background:repeating-linear-gradient(90deg,'+d.borderColor+' 0 6px,transparent 6px 10px)':''}"></i>${d.label}</span>`).join('');
  const all=ds.flatMap(d=>d.data).filter(x=>x!=null); if(all.length){const lo=Math.min(...all),hi=Math.max(...all),pad=(hi-lo)*.12||5; o.scales.y.min=EX.scale==='idx'?Math.floor((lo-pad)/5)*5:Math.max(0,Math.floor((lo-pad)/50)*50);}
  o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:innerWidth<640?5:10,callback:function(v){return dm(dates[v]);}};
  o.scales.y.ticks.callback=v=>EX.scale==='idx'?v:fmt(v);
  o.plugins.tooltip.mode='index'; o.plugins.tooltip.intersect=false; o.interaction={mode:'index',intersect:false};
  o.plugins.tooltip.callbacks.title=c=>{const d=dates[c[0].dataIndex]; return DN[dow(d)]+' '+dm(d);};
  o.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+(c.parsed.y==null?'n/a':(EX.scale==='idx'?c.parsed.y.toFixed(0):fmt(c.parsed.y)+' kWh/day'));
  mk('cEx',{type:'line',data:{labels:dates,datasets:ds},options:o});
  document.getElementById('xNote').textContent=sites.length?(EX.scale==='idx'?'Index: each site is shown relative to its own average in the period (100 = average), so sites of different sizes can be compared by shape.':((EX.from<'2026-08-01'?'Before August the data is only lightly cleaned, so single-day spikes can be meter noise. ':'')+(sites.length===1&&!lyOk?'Last-year overlay is available for single sites from 31 July 2026 onwards.':''))):'';
  renderExStats(sites,dates);
}
function renderExStats(sites,dates){
  const i0=hIdx(EX.from), i1=hIdx(EX.to), len=i1-i0+1, last=days[N-1];
  const {opts,mu}=makeOpts(); const o=opts;
  const rows=sites.map(s=>{
    const full=exF(s), seg=[]; for(let i=Math.max(0,i0);i<=Math.min(full.length-1,i1);i++) if(full[i]!=null) seg.push({i,d:addDays(DATA.hist.d0,i),v:full[i]});
    if(!seg.length) return null;
    const vs=seg.map(x=>x.v), avg=mean(vs), mn=seg.reduce((a,b)=>b.v<a.v?b:a), mxx=seg.reduce((a,b)=>b.v>a.v?b:a);
    const wd=seg.filter(x=>!isWE(x.d)).map(x=>x.v), we=seg.filter(x=>isWE(x.d)).map(x=>x.v);
    const pi0=i0-len, pw=pi0>=0?full.slice(pi0,i0).filter(x=>x!=null):[], prev=pw.length?mean(pw):null;
    const spikes=[]; for(const x of seg){ if(x.i<14) continue; const w0=full.slice(x.i-14,x.i); if(w0.some(z=>z==null)) continue; const w=w0.slice().sort((a,b)=>a-b), med=(w[6]+w[7])/2; if(x.v>1.25*med) spikes.push({d:x.d,v:x.v,p:x.v/med-1}); }
    const prof=[1,2,3,4,5,6,0].map(g=>{const a=seg.filter(x=>dow(x.d)===g).map(x=>x.v); return a.length?(mean(a)/avg-1)*100:null;});
    return {s,avg,mn,mxx,wd:wd.length?mean(wd):NaN,we:we.length?mean(we):NaN,prev,spikes,prof};}).filter(Boolean);
  document.getElementById('xStatSub').textContent=`${dm(EX.from)} – ${dm(EX.to)} · ${len} days`;
  const th=l=>`<th>${l}</th>`;
  document.getElementById('xStats').innerHTML=`<table class="ptable xstats" style="min-width:680px"><thead><tr><th style="text-align:left">Site</th>${th('Average')}${th('vs previous '+len+' days')}${th('Lowest day')}${th('Highest day')}${th('Weekday avg')}${th('Weekend avg')}</tr></thead><tbody>${rows.map(r=>{const c=r.prev?cls(r.avg/r.prev-1):'flat';
    return `<tr class="row" data-n="${r.s.n}" tabindex="0"><td><div class="nm"><i style="background:var(${EX.col[r.s.n]})"></i><b>${short(r.s.n)}</b></div></td><td>${fmt(r.avg)}</td><td>${r.prev?`<span class="cell ${c} on">${pct(r.avg/r.prev-1)}</span>`:'<span class="sub">n/a</span>'}</td><td>${fmt(r.mn.v)}<small>${dm(r.mn.d)}</small></td><td>${fmt(r.mxx.v)}<small>${dm(r.mxx.d)}</small></td><td>${fmt(r.wd)}</td><td>${fmt(r.we)}</td></tr>`;}).join('')||'<tr><td colspan="7" class="empty">Pick a site to see numbers.</td></tr>'}</tbody></table>`;
  document.getElementById('xSpikes').innerHTML=rows.map(r=>{const top=r.spikes.sort((a,b)=>b.p-a.p).slice(0,4);
    return `<div class="mvrow" style="cursor:default;grid-template-columns:minmax(0,1fr)"><b style="display:flex;align-items:center;gap:8px"><i style="width:10px;height:10px;border-radius:50%;background:var(${EX.col[r.s.n]})"></i>${short(r.s.n)} <span class="sub">${r.spikes.length} spike day${r.spikes.length===1?'':'s'}</span></b>${top.length?`<div class="sub">${top.map(x=>`${DN[dow(x.d)]} ${dm(x.d)} (${pct(x.p,0)})`).join(' · ')}</div>`:'<div class="sub">No spike days in this period.</div>'}</div>`;}).join('')||'<div class="note">Pick a site to see spike days.</div>';
  o.scales.y.ticks.callback=v=>(v>0?'+':'')+v+'%'; delete o.scales.y.min; o.scales.x.ticks={color:mu,maxRotation:0};
  o.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+(c.parsed.y==null?'n/a':(c.parsed.y>=0?'+':'−')+Math.abs(c.parsed.y).toFixed(1)+'% vs its average');
  o.plugins.legend={display:false}; o.interaction={mode:'index',intersect:false}; o.plugins.tooltip.mode='index'; o.plugins.tooltip.intersect=false;
  mk('cExWd',{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:rows.map(r=>({label:short(r.s.n),data:r.prof,backgroundColor:css(EX.col[r.s.n]),borderRadius:4,borderSkipped:false,maxBarThickness:22}))},options:o});
  EX.tsv=['Date\t'+rows.map(r=>r.s.n).join('\t'),...(()=>{const out=[];for(let i=Math.max(0,i0);i<=Math.min(DATA.hist.n-1,i1);i++){out.push([addDays(DATA.hist.d0,i),...rows.map(r=>{const v=hv(r.s)[i];return v==null?'':v;})].join('\t'));}return out;})()].join('\n');
}
function exResults(q){
  const box=document.getElementById('xres'), inp=document.getElementById('xq'); q=q.trim().toLowerCase();
  if(!q){box.hidden=true; inp.setAttribute('aria-expanded','false'); return;}
  const L=exAll().filter(s=>s.n.toLowerCase().includes(q)&&!EX.sel.includes(s.n)).slice(0,8);
  box.innerHTML=L.map(s=>`<button type="button" role="option" data-add="${s.n}">${short(s.n)} <small>${s.r}${s.track?' · tracking':''}</small></button>`).join('')||'<div class="sub" style="padding:8px 10px">No matching site.</div>';
  box.hidden=false; inp.setAttribute('aria-expanded','true');
}
function wireMomExplore(){
  const $=id=>document.getElementById(id);
  $('mA').addEventListener('change',e=>{MOM.A=e.target.value;if(MOM.B===MOM.A){fillMonthSelects();}renderMom();});
  $('mB').addEventListener('change',e=>{MOM.B=e.target.value;if(MOM.B===MOM.A){fillMonthSelects();}renderMom();});
  $('mType').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;MOM.type=b.dataset.k;setMomSeg();renderMom();});
  $('mQuick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ks=monthKeys().map(m=>m.k),q=b.dataset.q;
    if(q==='swap'){[MOM.A,MOM.B]=[MOM.B,MOM.A];}
    else if(q==='prev'){const v=ks.filter(k=>k[0]==='v'),i=v.indexOf(MOM.A.replace(/^y/,'v')); if(i>0){MOM.A=v[i];MOM.B=v[i-1];}}
    else if(q==='yoy'){const ym=MOM.A.slice(2),y='y:2025-'+ym.slice(5); if(MOM.A[0]==='v'&&ks.includes(y)){MOM.B=y;}else{$('mCopyMsg').textContent='Last year is only available for August, September and October.';setTimeout(()=>$('mCopyMsg').textContent='',4000);}}
    fillMonthSelects();renderMom();});
  $('mSite').addEventListener('input',e=>{const v=e.target.value.trim().toLowerCase(); let m=null;
    if(!v) MOM.site=''; else {const all=momAll(); m=all.find(x=>short(x.n).toLowerCase()===v||x.n.toLowerCase()===v); if(!m){const c=all.filter(x=>short(x.n).toLowerCase().includes(v)); if(c.length===1&&v.length>=4) m=c[0];} if(m) MOM.site=m.n; else return;}
    renderMom();});
  $('mSite').addEventListener('change',e=>{if(!MOM.site) e.target.value='';});
  $('mq').addEventListener('input',e=>{MOM.q=e.target.value;renderMom();});
  $('mTable').addEventListener('click',e=>{const b=e.target.closest('th button');if(!b)return;e.stopPropagation();const k=b.dataset.k;if(MOM.sk===k)MOM.dir=MOM.dir==='desc'?'asc':'desc';else{MOM.sk=k;MOM.dir=k==='name'?'asc':'desc';}renderMom();});
  $('mMore').addEventListener('click',e=>{if(e.target.closest('[data-more]')){MOM.expand=!MOM.expand;renderMom();}});
  $('mCopy').addEventListener('click',()=>copyText(MOM.tsv||'',$('mCopyMsg')));
  /* explorer */
  const xq=$('xq'); xq.addEventListener('input',e=>exResults(e.target.value));
  xq.addEventListener('keydown',e=>{if(e.key==='Enter'){const b=$('xres').querySelector('[data-add]');if(b){exAdd(b.dataset.add);xq.value='';exResults('');renderExplorer();}}if(e.key==='Escape'){exResults('');}});
  $('xres').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;exAdd(b.dataset.add);xq.value='';exResults('');$('xNote').textContent='';renderExplorer();});
  document.addEventListener('click',e=>{if(!e.target.closest('.xsearch'))exResults('');},true);
  $('xChips').addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;EX.sel=EX.sel.filter(n=>n!==b.dataset.rm);$('xNote').textContent='';renderExplorer();});
  $('xQuick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=b.dataset.p;EX.sel=[];EX.col={};$('xNote').textContent='';
    if(p==='up'){selected().map(s=>({s,a:siteAvg(s)})).sort((x,y)=>y.a.mom-x.a.mom).slice(0,3).forEach(r=>exAdd(r.s.n));}
    else if(p==='big'){selected().map(s=>({s,a:siteAvg(s)})).sort((x,y)=>y.a.okt-x.a.okt).slice(0,3).forEach(r=>exAdd(r.s.n));}
    else if(p==='zoec'){DATA.sites.filter(s=>s.p).slice(0,5).forEach(s=>exAdd(s.n));}
    else if(p==='trk'){exAll().filter(s=>s.track).slice(0,5).forEach(s=>exAdd(s.n));}
    renderExplorer();});
  $('xRange').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;exSetRange(b.dataset.r);renderExplorer();});
  const dch=()=>{let f=$('xFrom').value,t=$('xTo').value;if(!f||!t)return;if(f>t)[f,t]=[t,f];EX.from=f;EX.to=t;EX.range='custom';renderExplorer();};
  $('xFrom').addEventListener('change',dch); $('xTo').addEventListener('change',dch);
  $('xView').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;EX.view=b.dataset.v;renderExplorer();});
  $('xScale').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;EX.scale=b.dataset.s;renderExplorer();});
  $('xLy').addEventListener('click',()=>{if($('xLy').disabled)return;EX.ly=!EX.ly;renderExplorer();});
  $('xCopy').addEventListener('click',()=>copyText(EX.tsv||'',$('xCopyMsg')));
}
function resetMomExplore(){MCACHE.clear();EX.sel=[];EX.col={};EX.from=null;EX.range='30';EX.ly=false;MOM.q='';MOM.expand=false;if(hasHist()){fillMonthSelects();setMomSeg();}}


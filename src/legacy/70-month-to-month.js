/* ---------- month to month ---------- */
const MOM={A:'v:2026-10',B:'v:2026-09',type:'all',q:'',sk:'p',dir:'desc',expand:false,site:''};
const MCACHE=new Map();
const hasHist=()=>!!(DATA.hist&&DATA.hist.v);
const addDays=(d,n)=>new Date(dt(d).getTime()+n*864e5).toISOString().slice(0,10);
const histLen=src=>src==='v'?DATA.hist.n:(Object.values(DATA.hist.y)[0]||[]).length;
const histBase=src=>src==='v'?DATA.hist.d0:DATA.hist.y0;
function monthKeys(){
  const out=[];
  for(const src of ['y','v']){
    const n=histLen(src); if(!n) continue; const seen=[];
    for(let i=0;i<n;i++){const ym=addDays(histBase(src),i).slice(0,7); if(!seen.includes(ym)) seen.push(ym);}
    for(const ym of seen){
      if(src==='y'&&ym==='2025-10'&&!DATA.pyDays.length) continue;
      const k=src+':'+ym, md=MD(k), y=+ym.slice(0,4), m=+ym.slice(5)-1, full=new Date(Date.UTC(y,m+1,0)).getUTCDate();
      const part=md.length<full;
      out.push({k,ym,label:MN[m]+' '+y+(part?` (${dm(md[0].d).split(' ')[0]}–${dm(md[md.length-1].d)})`:''),part,n:md.length,full});
    }
  }
  return out;
}
function MD(key){
  if(MCACHE.has('md'+key)) return MCACHE.get('md'+key);
  const [src,ym]=key.split(':'), out=[], n=histLen(src);
  for(let i=0;i<n;i++){const d=addDays(histBase(src),i); if(d.slice(0,7)!==ym) continue; if(src==='y'&&ym==='2025-10'&&d<DATA.pyDays[0]) continue; out.push({i,d});}
  MCACHE.set('md'+key,out); return out;
}
/* the series of one site for a month key; Tracking sites (no 2025 data) live in hist.t */
const histArr=(key,s)=>key[0]==='v'?(DATA.hist.v[s.n]||(DATA.hist.t&&DATA.hist.t[s.n])):DATA.hist.y[s.n];
/* every site this page can show: the main sites plus Tracking sites that have readings */
const momAll=()=>DATA.sites.concat(Object.keys(DATA.hist.t||{}).map(n=>{const t=(DATA.track||[]).find(x=>x.n===n);return t?Object.assign({},t,{track:true}):null;}).filter(Boolean));
const momList=()=>{ if(MOM.site){const x=momAll().find(s=>s.n===MOM.site); if(x) return [x];} return selected(); };
function siteMonth(s,key,type){
  const ck=s.n+'|'+key+'|'+type; if(MCACHE.has(ck)) return MCACHE.get(ck);
  const arr=histArr(key,s); let r=NaN;
  if(arr){ const vals=[]; let exp=0;
    for(const {i,d} of MD(key)){ if(type==='wd'&&isWE(d)) continue; if(type==='we'&&!isWE(d)) continue; exp++; const x=arr[i]; if(x!=null&&Number.isFinite(x)) vals.push(x); }
    if(exp&&vals.length>=0.7*exp) r=mean(vals); }
  MCACHE.set(ck,r); return r;
}
function momRows(){
  const rows=[]; for(const s of momList()){ const a=siteMonth(s,MOM.A,MOM.type), b=siteMonth(s,MOM.B,MOM.type); if(Number.isFinite(a)&&Number.isFinite(b)) rows.push({s,a,b,d:a-b,p:a/b-1}); }
  return rows;
}
const lblOf=k=>(monthKeys().find(m=>m.k===k)||{label:k}).label;
const shortLbl=k=>{const [src,ym]=k.split(':');return MN[+ym.slice(5)-1]+' '+ym.slice(2,4);};
function fillMonthSelects(){
  const ks=monthKeys(), opt=k=>`<option value="${k.k}">${k.label}</option>`;
  for(const id of ['mA','mB']) document.getElementById(id).innerHTML=[...ks].reverse().map(opt).join('');
  const have=k=>ks.some(m=>m.k===k);
  if(!have(MOM.A)) MOM.A=ks.filter(m=>m.k[0]==='v').pop().k;
  if(!have(MOM.B)||MOM.B===MOM.A){const v=ks.filter(m=>m.k[0]==='v'),i=v.findIndex(m=>m.k===MOM.A);MOM.B=(v[i-1]||v[0]).k;}
  document.getElementById('mA').value=MOM.A; document.getElementById('mB').value=MOM.B;
}
function setMomSeg(){document.querySelectorAll('#mType button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===MOM.type));}
function renderMom(){
  const sec=document.getElementById('s-mom'), nb=document.querySelector('#nav [data-t="s-mom"]');
  if(!hasHist()){sec.hidden=true; if(nb)nb.hidden=true; return;} sec.hidden=false; if(nb)nb.hidden=false;
  const {opts,mu}=makeOpts(), blue=css('--blue'), amber=css('--volt'), flat=css('--flat'), ink=css('--ink'), up=css('--up'), down=css('--down');
  const rows=momRows(), list=momList(), one=!!(MOM.site&&list.length===1&&list[0].n===MOM.site), tn=MOM.type==='all'?'':(MOM.type==='wd'?' (weekdays)':' (weekends)');
  const ta=rows.reduce((t,r)=>t+r.a,0), tb=rows.reduce((t,r)=>t+r.b,0), dp=tb?ta/tb-1:0;
  const nu=rows.filter(r=>r.p>TH).length, nd=rows.filter(r=>r.p<-TH).length, nf=rows.length-nu-nd;
  const LA=lblOf(MOM.A), LB=lblOf(MOM.B);
  document.getElementById('momSub').textContent=`${LA} vs ${LB}${tn} · ${one?short(MOM.site):rows.length+' sites'}`;
  { const dl=document.getElementById('mSiteList'), all=momAll(), sg=all.length+':'+all.filter(x=>x.track).length; if(dl&&dl.dataset.sig!==sg){dl.innerHTML=all.slice().sort((a,b)=>parseInt(a.n)-parseInt(b.n)).map(x=>`<option value="${fuEsc(short(x.n))}">${x.r}${x.track?' · tracking':''}</option>`).join(''); dl.dataset.sig=sg;}
    const si=document.getElementById('mSite'); if(si&&document.activeElement!==si) si.value=one?short(MOM.site):''; }
  document.getElementById('mKpis').innerHTML=
    `<div class="mk"><small>${LB}</small><b>${fmt(tb)}</b><span>kWh per day${tn}</span></div>`+
    `<div class="mk hl"><small>${LA}</small><b>${fmt(ta)}</b><span>kWh per day${tn}</span></div>`+
    `<div class="mk"><small>Change</small><b class="${cls(dp)}">${pct(dp)}</b><span>${ta-tb>=0?'+':'−'}${fmt(Math.abs(ta-tb))} kWh per day</span></div>`+
    (one?`<div class="mk"><small>Site</small><b style="font-size:1.1em">${short(MOM.site)}</b><span>${list[0].r}${list[0].track?' · tracking':''}</span></div>`:`<div class="mk"><small>Sites</small><b>${nu} up · ${nd} down</b><span>${nf} stable (within ±5%)</span></div>`);
  const ks=monthKeys(), ka=ks.find(m=>m.k===MOM.A), kb=ks.find(m=>m.k===MOM.B), notes=[];
  for(const m of [ka,kb]) if(m&&m.part) notes.push(`${m.label} covers ${m.n} of ${m.full} days, so it is compared by average per day, and its weekday mix differs from a full month.`);
  if(one&&!rows.length) notes.push(`${short(MOM.site)} has no (or too little) data in one of the two months, so there is nothing to compare. Pick another month.`);
  else if(rows.length<list.length) notes.push(`${list.length-rows.length} of ${list.length} sites are left out because they have no (or too little) data in one of the two months.`);
  if([MOM.A,MOM.B].some(k=>k[0]==='v'&&k.slice(2)<'2026-08')) notes.push('March to July readings are only lightly cleaned (zero and extreme values removed), so they can be noisier than August onwards.');
  document.getElementById('momNote').innerHTML=notes.join('<br>')||'Both months are complete. Only sites with data in both months are compared.';
  /* bar chart: 2026 months, like-for-like sites */
  const m26=ks.filter(m=>m.k[0]==='v'), m25=ks.filter(m=>m.k[0]==='y');
  const set=one?list:list.filter(s=>m26.every(m=>Number.isFinite(siteMonth(s,m.k,MOM.type))));
  const vals=m26.map(m=>{const x=set.reduce((t,s)=>t+siteMonth(s,m.k,MOM.type),0); return Number.isFinite(x)?x:null;});
  const ly=m26.map(m=>{const y=m25.find(z=>z.ym.slice(5)===m.ym.slice(5)); if(!y) return null; let t=0; for(const s of set){const x=siteMonth(s,y.k,MOM.type); if(!Number.isFinite(x)) return null; t+=x;} return t;});
  document.getElementById('mBarSub').textContent=`kWh per day${tn}, ${one?short(MOM.site)+'. Months without enough data are left empty.':set.length+' sites that have data in every month.'} Tap a bar to compare it with the month before.`;
  const o=opts; o.plugins.legend={display:true,position:'bottom',align:'start',labels:{usePointStyle:true,boxWidth:8,boxHeight:8,color:mu,padding:14}};
  const allv=[...vals,...ly.filter(x=>x!=null)]; o.scales.y.min=allv.length?(one?Math.max(0,Math.floor(Math.min(...allv)*.85/100)*100):Math.floor(Math.min(...allv)*.85/1000)*1000):0; o.layout={padding:{top:22}};
  o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:false,font:{size:innerWidth<640?10.5:12},callback:function(v){return m26[v].ym===m26[v].ym?MN[+m26[v].ym.slice(5)-1]+(m26[v].part?'*':''):'';}};
  o.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+fmt(c.parsed.y)+' kWh/day';
  o.onClick=(e,els,ch)=>{const h=ch.getElementsAtEventForMode(e,'nearest',{intersect:true},true)[0]; if(!h) return; const m=m26[h.index], i=m26.indexOf(m); MOM.A=m.k; MOM.B=(m26[i-1]||m26[i+1]).k; fillMonthSelects(); renderMom();};
  const col=m26.map(m=>m.k===MOM.A?amber:m.k===MOM.B?blue:A(blue,.28));
  const lab={id:'lab',afterDatasetsDraw(ch){const c=ch.ctx;c.save();c.fillStyle=ink;c.font="700 12px -apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif";c.textAlign='center';ch.getDatasetMeta(0).data.forEach((b,i)=>{if(vals[i]!=null&&(innerWidth>640||m26[i].k===MOM.A||m26[i].k===MOM.B))c.fillText(fmt(vals[i]),b.x,b.y-7);});c.restore();}};
  mk('cMom',{type:'bar',data:{labels:m26.map(m=>m.label),datasets:[{label:'2026',data:vals,backgroundColor:col,borderRadius:{topLeft:10,topRight:10},borderSkipped:'bottom',maxBarThickness:46,order:2},{type:'line',label:'Same month 2025',data:ly,borderColor:flat,backgroundColor:flat,borderWidth:2.5,pointRadius:5,pointHoverRadius:7,pointBorderColor:css('--surface'),pointBorderWidth:2,showLine:false,order:1}]},options:o,plugins:[lab]});
  /* day by day */
  const o2=makeOpts().opts; o2.plugins.legend={display:true,position:'bottom',align:'start',labels:{usePointStyle:true,boxWidth:8,boxHeight:8,color:mu,padding:14}};
  const dayline=key=>{const md=MD(key), arr=new Array(31).fill(null), dd=new Array(31).fill(null);
    for(const {i,d} of md){ if(MOM.type==='wd'&&isWE(d)) continue; if(MOM.type==='we'&&!isWE(d)) continue; let t=0;
      for(const r of rows){const h=(histArr(key,r.s)||[])[i]; t+=(h!=null?h:(key===MOM.A?r.a:r.b));}
      arr[+d.slice(8)-1]=t; dd[+d.slice(8)-1]=d; }
    return {arr,dd};};
  const da=dayline(MOM.A), db=dayline(MOM.B), ymin=Math.min(...[...da.arr,...db.arr].filter(x=>x!=null));
  if(Number.isFinite(ymin)) o2.scales.y.min=one?Math.max(0,Math.floor(ymin*.9/100)*100):Math.floor(ymin*.9/1000)*1000;
  o2.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:10};
  o2.plugins.tooltip.callbacks.title=c=>'Day '+c[0].label;
  o2.plugins.tooltip.callbacks.label=c=>{const d=(c.datasetIndex===0?da:db).dd[c.dataIndex]; return ' '+c.dataset.label+': '+fmt(c.parsed.y)+' kWh/day'+(d?'  ('+DN[dow(d)]+')':'');};
  mk('cMomDay',{type:'line',data:{labels:Array.from({length:31},(_,i)=>String(i+1)),datasets:[
    {label:LA,data:da.arr,borderColor:amber,backgroundColor:amber,borderWidth:2.6,pointRadius:0,pointHoverRadius:5,tension:.25,spanGaps:false},
    {label:LB,data:db.arr,borderColor:blue,backgroundColor:blue,borderWidth:2.6,pointRadius:0,pointHoverRadius:5,tension:.25,spanGaps:false}]},options:o2});
  /* movers */
  const up6=rows.filter(r=>r.d>0).sort((x,y)=>y.d-x.d).slice(0,6), dn6=rows.filter(r=>r.d<0).sort((x,y)=>x.d-y.d).slice(0,6), mx=Math.max(1,...up6.map(r=>r.d),...dn6.map(r=>-r.d));
  const mv=(r,c)=>`<div class="mvrow" data-n="${r.s.n}" tabindex="0"><b>${short(r.s.n)}</b><em class="${c}">${r.d>=0?'+':'−'}${fmt(Math.abs(r.d))} kWh/day · ${pct(r.p)}</em><div class="mvbar"><i style="width:${Math.max(3,Math.abs(r.d)/mx*100)}%;background:var(--${c})"></i></div></div>`;
  document.getElementById('movers').innerHTML=`<div><h4>Biggest increases</h4>${up6.map(r=>mv(r,'up')).join('')||'<div class="note">No site went up.</div>'}</div><div><h4>Biggest decreases</h4>${dn6.map(r=>mv(r,'down')).join('')||'<div class="note">No site went down.</div>'}</div>`;
  renderMomTable(rows,LA,LB);
}
function renderMomTable(rows,LA,LB){
  const q=MOM.q.trim().toLowerCase(), d=MOM.dir==='desc'?1:-1;
  let f=rows.filter(r=>!q||r.s.n.toLowerCase().includes(q));
  f.sort((x,y)=>MOM.sk==='name'?x.s.n.localeCompare(y.s.n)*(MOM.dir==='asc'?1:-1):(y[MOM.sk]-x[MOM.sk])*d);
  const lim=12, shown=(MOM.expand||q)?f:f.slice(0,lim);
  document.getElementById('mTblSub').textContent=`${f.length} site${f.length===1?"":"s"} · ${LA} vs ${LB}`;
  const th=(k,l)=>`<th class="${MOM.sk===k?'sorted':''}" aria-sort="${MOM.sk===k?(MOM.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" data-k="${k}">${l}${MOM.sk===k?(MOM.dir==='asc'?' ▲':' ▼'):''}</button></th>`;
  const body=shown.map(r=>{const c=cls(r.p);return `<tr class="row" data-n="${r.s.n}" tabindex="0"><td><div class="sn"><span class="sd ${c}"></span><span><b>${short(r.s.n)}${r.s.partial?' *':''}</b><small>${r.s.r}</small></span></div></td><td>${fmt(r.b)}</td><td>${fmt(r.a)}</td><td>${r.d>=0?'+':'−'}${fmt(Math.abs(r.d))}</td><td><span class="cell ${c} on">${pct(r.p)}</span></td></tr>`;}).join('');
  document.getElementById('mTable').innerHTML=`<table class="ptable" style="min-width:520px"><thead><tr>${th('name','Site')}${th('b',LB)}${th('a',LA)}${th('d','Change kWh')}${th('p','Change %')}</tr></thead><tbody>${body||'<tr><td colspan="5" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('mMore').innerHTML=(!q&&f.length>lim)?`<button type="button" class="chipbtn" data-more aria-pressed="true">${MOM.expand?'Show top '+lim:'Show all '+f.length+' sites'}</button>`:'';
  MOM.tsv=['Site\tRegion\t'+LB+' kWh/day\t'+LA+' kWh/day\tChange kWh/day\tChange %',...f.map(r=>[r.s.n,r.s.r,r.b.toFixed(1),r.a.toFixed(1),r.d.toFixed(1),(r.p*100).toFixed(1)].join('\t'))].join('\n');
}
function copyText(txt,el){
  const done=ok=>{el.textContent=ok?'Copied. Paste it into Excel or Google Sheets.':'Copy is not available here. Select the table and copy it instead.';setTimeout(()=>{el.textContent='';},4500);};
  const fb=()=>{try{const t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();done(ok);}catch(e){done(false);}};
  try{navigator.clipboard.writeText(txt).then(()=>done(true),fb);}catch(e){fb();}
}
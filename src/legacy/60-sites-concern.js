/* ---------- sites ---------- */
let STATUS='all', SORTKEY='p', SORT='desc', EXPAND=false, NOTEF=false;
const PS={A:null,B:null,type:'all'};
const MKEY={mom:'mom',agu:'vsAgu',yoy:'yoy'}, KMODE={};
function spark(s,c){const m=ma7(s.v),vs=m.filter(x=>x!=null),lo=Math.min(...vs),hi=Math.max(...vs);
  const pts=m.map((v,i)=>v==null?null:[i/(s.v.length-1)*96,23-(v-lo)/(hi-lo||1)*20]).filter(Boolean);
  return `<svg viewBox="0 0 96 26" aria-hidden="true"><polyline fill="none" stroke="var(--${c})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}"/></svg>`;}
function setMode(){}
function fillPS(){
  if(!hasHist()) return;
  const ks=monthKeys(), v=ks.filter(m=>m.k[0]==='v'), opt=k=>`<option value="${k.k}">${k.label}</option>`;
  for(const id of ['psA','psB']) document.getElementById(id).innerHTML=[...ks].reverse().map(opt).join('');
  const have=k=>ks.some(m=>m.k===k);
  if(!have(PS.A)) PS.A=v[v.length-1].k;
  if(!have(PS.B)||PS.B===PS.A){const i=v.findIndex(m=>m.k===PS.A);PS.B=(v[i-1]||v[0]).k;}
  document.getElementById('psA').value=PS.A; document.getElementById('psB').value=PS.B;
  document.querySelectorAll('#psType button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===PS.type));
}
function renderSites(list){
  const box=document.getElementById('tiles');
  if(!hasHist()){box.innerHTML='<div class="empty">Monthly history is not available in this file.</div>';return;}
  if(!document.getElementById('psA').options.length) fillPS();
  const q=QUERY.trim().toLowerCase(), LA=shortLbl(PS.A), LB=shortLbl(PS.B);
  const all=list.map(s=>{const a=siteMonth(s,PS.A,PS.type), b=siteMonth(s,PS.B,PS.type); return {s,a,b,d:a-b,p:a/b-1,ok:Number.isFinite(a)&&Number.isFinite(b)&&b>0};});
  const rows=all.filter(r=>r.ok), miss=all.length-rows.length;
  const nu=rows.filter(r=>r.p>TH).length, nd=rows.filter(r=>r.p<-TH).length, nf=rows.length-nu-nd;
  const seg=(c,l,n)=>`<button type="button" class="seg2 ${c}" data-st="${c}" aria-pressed="${STATUS===c}" style="flex:${Math.max(n,1)} 1 0"><b>${n}</b><span>${l}</span></button>`;
  document.getElementById('counts').innerHTML=`<div class="dist">${seg('up','Up >5%',nu)}${seg('flat','Stable',nf)}${seg('down','Down >5%',nd)}</div>`+(STATUS!=='all'?'<button type="button" class="chipbtn" data-st="all">Show all</button>':'')+`<div class="noterow"><button type="button" class="chipbtn" id="noteFilt" aria-pressed="${NOTEF}">Sites with notes · ${typeof fuCount==='function'?fuCount():0}</button><button type="button" class="chipbtn" id="noteCopy">Copy all notes</button><span class="fumsg" id="noteMsg" role="status"></span></div>`;
  let f=rows.filter(r=>(!q||r.s.n.toLowerCase().includes(q))&&(STATUS==='all'||cls(r.p)===STATUS)&&(!NOTEF||fuHas(r.s.n)));
  const d=SORT==='desc'?1:-1;
  f.sort((x,y)=>SORTKEY==='name'?x.s.n.localeCompare(y.s.n)*(SORT==='asc'?1:-1):(y[SORTKEY]-x[SORTKEY])*d);
  const lim=12, shown=(EXPAND||q||STATUS!=='all'||NOTEF)?f:f.slice(0,lim);
  const tn=PS.type==='all'?'':(PS.type==='wd'?' (weekdays)':' (weekends)');
  document.getElementById('siteSub').textContent=`${f.length} sites · ${lblOf(PS.A)} vs ${lblOf(PS.B)}${tn}`;
  const ks=monthKeys(), part=[PS.A,PS.B].map(k=>ks.find(m=>m.k===k)).filter(m=>m&&m.part).map(m=>m.label);
  document.getElementById('psNote').textContent=(part.length?'Partial month: only some days of the month are in the data. Averages are kWh per day, so they can be compared, but a short month may have a different mix of weekdays and weekends. ':'')+(miss?`${miss} site${miss>1?'s have':' has'} no usable data for one of the two months and ${miss>1?'are':'is'} left out.`:'');
  const mx=Math.max(...rows.map(r=>Math.max(r.a,r.b)),1);
  const th=(k,l,cl='')=>`<th class="${cl} ${SORTKEY===k?'sorted':''} ${k==='p'?'actc':''}" aria-sort="${SORTKEY===k?(SORT==='asc'?'ascending':'descending'):'none'}"><button type="button" data-k="${k}">${l}${SORTKEY===k?(SORT==='asc'?' ▲':' ▼'):''}</button></th>`;
  const sgn=v=>(v>=0?'+':'−')+fmt(Math.abs(v));
  const body=shown.map(({s,a,b,d:dd,p})=>{const c=cls(p);return `<tr class="row" data-n="${s.n}" tabindex="0">
    <td><div class="sn"><span class="sd ${c}"></span><span><b>${short(s.n)}${s.partial?' *':''}${fuHas(s.n)?'<i class="nd" title="Has a note"></i>':''}</b><small>${s.r}</small></span></div></td>
    <td><div class="okt"><span>${fmt(a)}</span><i style="width:${Math.max(4,a/mx*72)}px"></i></div></td>
    <td class="hs"><div class="okt"><span>${fmt(b)}</span><i style="width:${Math.max(4,b/mx*72)}px;opacity:.55"></i></div></td>
    <td class="hs"><span class="cell ${c}">${sgn(dd)}</span></td>
    <td><span class="cell ${c} on">${pct(p)}</span></td><td class="sp hs">${spark(s,c==='flat'?'flat':c)}</td><td class="nt">${fuChip(s.n)}</td></tr>`;}).join('');
  box.innerHTML=`<table class="ptable"><thead><tr>${th('name','Site')}${th('a',LA+' kWh/day')}${th('b',LB+' kWh/day','hs')}${th('d','Change kWh/day','hs')}${th('p','Change %')}<th class="hs">Trend</th><th class="nt">Notes</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('more').innerHTML=(!q&&STATUS==='all'&&!NOTEF&&f.length>lim)?`<button type="button" class="chipbtn" data-more aria-pressed="true">${EXPAND?'Show top '+lim:'Show all '+f.length+' sites'}</button>`:'';
}

let CROWS=[], CSAVE=[], CMETA={};
/* FY2026 budget for the month of the latest data, as kWh per day */
function budgetFor(s){
  const m=/^\d+/.exec(s.n), b=m&&BUDGET[+m[0]]; if(!b) return null;
  const d=days[iOkt], mi=+d.slice(5,7)-1, dim=new Date(+d.slice(0,4),mi+1,0).getDate(), v=b.m[mi];
  return v?{perDay:v/dim,month:v,mi,dim}:null;
}
const CT={hi:.10,lo:.05};   // Red: more than 10% above budget. Yellow: 5 to 10% above
function renderConcern(list,P){
  var __a=[list,P];
  const all=list.map(s=>{const a=siteAvg(s),b=budgetFor(s); if(!b||!Number.isFinite(a.okt)) return null; const p=a.okt/b.perDay-1; const l7=s.v.slice(-7).filter(x=>x!=null&&Number.isFinite(x)); const p7=l7.length?(l7.reduce((q,x)=>q+x,0)/l7.length)/b.perDay-1:p; const dt=p7-p; const lv1=s.v[s.v.length-1], pl=Number.isFinite(lv1)?lv1/b.perDay-1:null; return {s,a,last:lv1,pl,spike:pl!=null&&pl-p>.20,b,act:a.okt,bud:b.perDay,ex:a.okt-b.perDay,p,p7,tr:dt>.03?'up':dt<-.03?'down':'flat',lv:p>CT.hi?'hi':p>CT.lo?'lo':'ok'};}).filter(Boolean);
  const over=all.filter(r=>r.lv!=='ok').sort((x,y)=>y.ex-x.ex), rows=over.slice(0,8);
  const ta=all.reduce((t,r)=>t+r.act,0), tb=all.reduce((t,r)=>t+r.bud,0);
  const sav=all.filter(r=>r.p<-CT.lo).sort((x,y)=>x.ex-y.ex); CSAVE=sav.slice(0,8);
  CROWS=rows; CMETA={nSave:sav.length,n:all.length,nOver:over.length,nRed:over.filter(r=>r.lv==='hi').length,ta,tb,tp:tb?ta/tb-1:0,mon:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][all[0]?all[0].b.mi:0]};
  const mx=Math.max(...rows.map(r=>r.ex),1);
  document.getElementById('concern').innerHTML=rows.length?rows.map((r,i)=>`<div class="crow" role="button" tabindex="0" data-n="${r.s.n}"><div class="nm"><span class="rk">${i+1}</span><div class="nb"><b>${short(r.s.n)}${r.s.partial?' *':''}</b><small>${r.s.r}</small>
    <div class="cmp"><span class="cp">Budget ${fmt(r.bud)}/day</span><span class="cp ${r.lv==='hi'?'up':'warn'}">Actual ${fmt(r.act)}/day</span><span class="cp ${r.tr==='up'?'up':r.tr==='down'?'down':''}">Last 7 days ${pct(r.p7,0)} ${r.tr==='up'?'↑ still rising':r.tr==='down'?'↓ easing':'→ steady'}</span></div>${typeof fuChip==='function'?'<div class="fuline">'+fuChip(r.s.n)+'</div>':''}</div></div>
    <div class="tr"><i class="${r.lv==='hi'?'hi':''}" style="width:${Math.max(0,r.ex)/mx*100}%"></i></div>
    <div class="val">+${fmt(r.ex)}<small>kWh/day above budget</small><span class="flag ${r.lv}">${r.lv==='hi'?'Red':'Yellow'} · ${pct(r.p,0)} vs budget</span></div></div>`).join(''):'<div class="empty">No site is more than 5% above its budget.</div>';
  const sv=document.getElementById('saving'); if(sv){const mxs=Math.max(...CSAVE.map(r=>-r.ex),1); sv.innerHTML=CSAVE.length?`<div class="sv-h"><b>Saving vs budget</b><small>${sav.length} site${sav.length===1?'':'s'} more than 5% below budget · biggest savings first</small></div>`+CSAVE.map((r,i)=>`<div class="crow sv" role="button" tabindex="0" data-n="${r.s.n}"><div class="nm"><span class="rk">${i+1}</span><div class="nb"><b>${short(r.s.n)}${r.s.partial?' *':''}</b><small>${r.s.r}</small><div class="cmp"><span class="cp">Budget ${fmt(r.bud)}/day</span><span class="cp down">Actual ${fmt(r.act)}/day</span></div></div></div><div class="tr"><i class="sv-i" style="width:${-r.ex/mxs*100}%"></i></div><div class="val">−${fmt(-r.ex)}<small>kWh/day below budget</small><span class="flag ok">${pct(r.p,0)} vs budget</span></div></div>`).join(''):'';}
  const sm=document.getElementById('cSum'); if(sm) sm.innerHTML=`<div class="cs"><small>Budget</small><b>${fmt(CMETA.tb)}</b><span>kWh/day, ${CMETA.n} sites</span></div><div class="cs"><small>Actual</small><b>${fmt(CMETA.ta)}</b><span>kWh/day so far</span></div><div class="cs ${cls(CMETA.tp)}"><small>vs budget</small><b>${pct(CMETA.tp)}</b><span>${CMETA.ta>=CMETA.tb?'+':'−'}${fmt(Math.abs(CMETA.ta-CMETA.tb))} kWh/day</span></div><div class="cs"><small>Over budget</small><b>${CMETA.nOver}</b><span>of ${CMETA.n} sites, ${CMETA.nRed} red</span></div>`;
  if(typeof LASTC!=='undefined'){LASTC=rows.map(r=>r.s.n);LASTC.args=__a;fuSummary();}
  if(typeof cxRender==='function') cxRender();
  if(typeof renderNotes==='function') renderNotes();
  if(typeof renderTrack==='function') renderTrack();
}

function renderProgram(){
  const all=DATA.sites, other=all.filter(s=>!s.p);
  const defs=[['50-MAL BOTANIA 2','WBP + LWBP'],['34-PACIFIC MALL TEGAL','WBP + LWBP'],['69-SENAYAN PARK','WBP + LWBP'],['7-SUN PLAZA','LWBP only, data to 26 Sep'],['51-LIPPO PLAZA SUNSET','WBP + LWBP · readings are noisy'],['39-LIPPO ICON CIBUBUR','LWBP meter only'],['37-MALL PHINISI POINT','',1]];
  const dn=css('--down'), bl=css('--blue'), oth=natSeries(other);
  const np=mean(oth.slice(iProg))/mean(oth.slice(0,iProg))-1;
  const res=defs.map(([n,tag,none])=>{const s=getSite(n);
    if(!s) return {n,tag,none:1};
    const pre=mean(s.v.slice(0,iProg)),post=mean(s.v.slice(iProg)),ch=post/pre-1; return {n,tag,v:s.v,pre,post,ch,rel:ch-np};});
  document.getElementById('prog').innerHTML=res.map(c=>{
    const nm=short(c.n);
    if(c.none) return `<div class="card pc none"><svg class="ava" viewBox="0 0 100 120">${bulby(false,true).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><h3>${nm}</h3><div class="tag">No meter data yet</div><div class="big" style="color:var(--muted)">n/a</div><div class="nodata">The daily report has no active meter readings for this site, so it cannot be measured yet. It will appear here once readings are added.</div></div>`;
    const m=ma7(c.v), vs=m.filter(x=>x!=null), lo=Math.min(...vs), hi=Math.max(...vs), L=c.v.length;
    const pts=m.map((v,i)=>v==null?null:[i/(N-1)*300, 58-(v-lo)/(hi-lo||1)*50]).filter(Boolean);
    const px=iProg/(N-1)*300, good=c.rel<0;
    return `<div class="card pc" role="button" tabindex="0" data-n="${c.n}"><svg class="ava" viewBox="0 0 100 120">${bulby(good).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><h3>${nm}</h3><div class="tag">${c.tag}</div><div class="big ${c.ch<0?'down':'up'}">${pct(c.ch)}</div>
     <div class="row"><span>Before ${fmt(c.pre)}</span><span>After ${fmt(c.post)}</span></div>
     <div class="vs ${good?'good':'bad'}">${Math.abs(c.rel*100).toFixed(1)} pts ${good?'better':'worse'} than other sites</div>
     <svg viewBox="0 0 300 66" preserveAspectRatio="none" role="img" aria-label="7-day trend ${nm}"><line x1="${px}" x2="${px}" y1="0" y2="66" stroke="${dn}" stroke-width="1.6" stroke-dasharray="4 3"/><polyline fill="none" stroke="${bl}" stroke-width="2.6" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${pts.map(p=>p.join(',')).join(' ')}"/></svg></div>`;}).join('')
   +(()=>{const ok=res.filter(r=>!r.none).sort((x,y)=>x.rel-y.rel), mx=Math.max(...ok.map(r=>Math.abs(r.rel)),.01), nb=ok.filter(r=>r.rel<0).length;
     return `<div class="card pc" style="background:var(--surface-2);box-shadow:none"><div class="score-h">${bulby(nb>ok.length/2)}<div><h3 style="padding:0">Scoreboard</h3><div class="tag">${nb} of ${ok.length} sites beat the others</div></div></div>
      <div class="score">${ok.map(r=>`<div class="r"><span class="n">${short(r.n)}</span><div class="t"><i class="${r.rel<0?'good':'bad'}" style="width:${Math.max(4,Math.abs(r.rel)/mx*100)}%"></i></div><b class="${r.rel<0?'gt':'bt'}">${r.rel<0?'−':'+'}${Math.abs(r.rel*100).toFixed(1)}</b></div>`).join('')}</div>
      <div class="tag" style="margin-top:10px">Points vs other sites. Negative (green) = fell more than non-program sites.</div></div>`;})();
  QUIPS.push(`ZOEC check: ${res.filter(r=>!r.none&&r.rel<0).length} of ${res.filter(r=>!r.none).length} program sites fell faster than the rest.`);
  const nc=res.filter(r=>r.none).length;
  document.getElementById('progNote').innerHTML=`<b>Before</b> = average kWh/day from 1 to 18 Aug. <b>After</b> = from 19 Aug to the latest data (the same start date is used for every site). Sites without the program changed ${pct(np)} over the same period, so each card compares against that. This is a before/after view and does not prove the program is the cause. Sun Plaza uses LWBP through 26 Sep because later meter readings are unreliable. Lippo Plaza Sunset has many flat, repeated readings and one spike (13 Sep, replaced by the local median), so treat it as indicative. Lippo Icon Cibubur only has an LWBP meter in the report.${nc?' Mall Phinisi Point has no meter data yet.':''}`;
}

function renderFoot(list){
  const m=DATA.meta||{}, ex=m.excluded||[];
  const part=DATA.sites.filter(s=>s.partial).map(s=>short(s.n)).join(', ');
  const zxn=(DATA.zx||[]).map(z=>short(z.n));
  document.getElementById('foot').innerHTML=`<div>Coverage: ${DATA.sites.length} of ${m.totalSites||59} sites with reliable daily meter data (+ Sun Plaza${zxn.length?' and '+zxn.join(', '):''}, ZOEC project only). Oct 2026 = ${octLbl}. Oct 2025 comparison = ${pyLbl} 2025 (same weekdays). Data is preliminary.</div>
   ${part?`<div>* Partial meter coverage (only some meters included): ${part}.</div>`:''}
   ${m.source?`<div>Source file: ${m.source}${m.generatedAt?' · processed '+new Date(m.generatedAt).toLocaleString(EN,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):''}${m.lastSeen&&m.lastSeen!==m.last?' · the file has partial rows after '+dm(m.last)+', they are ignored until most sites report':''}.</div>`:''}
   ${ex.length?`<details class="dq"><summary>Data check: ${ex.length} sites are not included</summary><ul>${ex.map(e=>`<li><b>${short(e.site)}</b>: ${e.reason}</li>`).join('')}</ul></details>`:''}`;
}


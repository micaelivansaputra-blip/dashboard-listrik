/* ---------- Quarter view: monthly usage and cost per site, from the actual electricity invoices ----------
   Source: INVOICE (Actual Invoice Electricity.xlsx, PIVOT sheet). Monthly kWh and cost (incl. PPN) of every site as billed.
   Daily meter readings are not used on this page. */
const QT={q:'2026-Q3',f:'all',hide:true,sk:'t',dir:'desc',more:false,mode:'kwh'};
const QMON={'2026-Q1':['2026-01','2026-02','2026-03'],'2026-Q2':['2026-04','2026-05','2026-06'],'2026-Q3':['2026-07','2026-08','2026-09']};
const qtNum=n=>(/^\d+/.exec(n)||[])[0];
const qtRegion=n=>{const k=qtNum(n); const s=(DATA.sites.concat(DATA.track||[])).find(x=>qtNum(x.n)===k); return s?s.r:'';};
const qtName=n=>{const k=qtNum(n); const s=DATA.sites.concat(DATA.track||[]).find(x=>qtNum(x.n)===k); return s?s.n:n;};
const qtIdr=x=>x==null?'—':(x/1e6).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' jt';
const qtDir=t=>t==null?'na':t>CT.lo?'up':t<-CT.lo?'down':'flat';
function qtMonths(){ return QMON[QT.q]; }
function qtAvail(){ return Object.keys(QMON).filter(q=>QMON[q].every(m=>INVOICE.months.includes(m))); }
function qtRows(){
  const ms=qtMonths(), ix=ms.map(m=>INVOICE.months.indexOf(m));
  return INVOICE.sites.map(x=>{
    const kw=ix.map(i=>x.kwh[i]), cs=ix.map(i=>x.cost[i]), ok=kw.concat(cs).every(y=>y!=null&&y>0);
    let flag='';
    if(!ok) flag='Missing invoice in this quarter';
    else{ const md=[...kw].sort((a,b)=>a-b)[1]; if(kw.some(y=>y/md>2.5||y/md<.4)) flag='Unusual invoice amount, check billing'; }
    const no=qtNum(x.n), bd=no&&BUDGET[+no], bud=bd&&bd.m[+ms[2].slice(5)-1]||null, rt=ok?cs.map((c,i)=>c/kw[i]):[null,null,null];
    const t=ok?kw[2]/kw[0]-1:null, ct=ok?cs[2]/cs[0]-1:null, rc=ok?rt[2]/rt[0]-1:null;
    let why='';
    if(ok){ const u=qtDir(t), c=qtDir(ct);
      if(u==='up'&&c==='up') why=rc>CT.lo?'Usage and rate both up':'Usage up, cost follows';
      else if(u==='up') why='Usage up, cost steady';
      else if(c==='up') why='Rate up, usage not';
      else if(u==='down'&&c==='down') why='Usage and cost down';
      else if(u==='down') why='Usage down, cost steady';
      else if(c==='down') why='Cost down, usage steady';
      else why='Stable'; }
    return {n:x.n,s:{n:qtName(x.n),r:qtRegion(x.n)},kw,cs,rt,ok,s1:ok?kw[1]/kw[0]-1:null,s2:ok?kw[2]/kw[1]-1:null,t,ct,rc,why,bud,vb:ok&&bud?kw[2]/bud-1:null,flag,bad:!!flag};
  });
}
function qtSpark(v){ const mx=Math.max(...v), mn=Math.min(...v)*.9; return `<svg viewBox="0 0 54 26" aria-hidden="true">${v.map((x,i)=>{const h=Math.max(3,(x-mn)/(mx-mn||1)*22); return `<rect x="${i*19}" y="${25-h}" width="14" height="${h}" rx="3" fill="var(--blue)" opacity="${.35+i*.3}"/>`;}).join('')}</svg>`; }
function renderQuarter(){
  const sec=document.getElementById('s-quarter'), nb=document.querySelector('#nav [data-t="s-quarter"]'); if(!sec) return;
  const av=qtAvail(); if(!av.length){sec.hidden=true; if(nb) nb.hidden=true; return;} if(nb) nb.hidden=false;
  if(!av.includes(QT.q)) QT.q=av[av.length-1];
  const sel=document.getElementById('qtQ'); if(sel.dataset.sig!==av.join()){sel.innerHTML=av.slice().reverse().map(q=>`<option value="${q}">${q.slice(5)} ${q.slice(0,4)}</option>`).join(''); sel.dataset.sig=av.join();} sel.value=QT.q;
  const ms=qtMonths(), ML=ms.map(m=>MN[+m.slice(5)-1]);
  const all=qtRows().filter(r=>REGION==='All'||r.s.r===REGION), pool=all.filter(r=>r.ok&&!(QT.hide&&r.bad));
  const up=pool.filter(r=>qtDir(r.t)==='up'), dn=pool.filter(r=>qtDir(r.t)==='down'), fl=pool.length-up.length-dn.length;
  const tk=ms.map((_,i)=>pool.reduce((t,r)=>t+r.kw[i],0)), tc=ms.map((_,i)=>pool.reduce((t,r)=>t+r.cs[i],0));
  const dk=pool.length?tk[2]/tk[0]-1:null, dc=pool.length?tc[2]/tc[0]-1:null, r0=tc[0]/tk[0], r2=tc[2]/tk[2], dr=pool.length?r2/r0-1:null;
  const cu=pool.filter(r=>qtDir(r.ct)==='up').length;
  document.getElementById('qtSub').textContent=`${QT.q.slice(5)} ${QT.q.slice(0,4)} · ${ML[0]}–${ML[2]} · ${pool.length} sites · actual invoices`;
  const kp=(l,b,sub,c)=>`<div class="mk"><small>${l}</small><b${c!=null?` class="${cls(c)}"`:''}>${b}</b><span>${sub}</span></div>`;
  document.getElementById('qtKpis').innerHTML=
    kp(`kWh usage · ${ML[2]}`,fmt(tk[2])+' kWh',`${ML[0]} ${fmt(tk[0])} → ${ML[1]} ${fmt(tk[1])}`).replace('class="mk"','class="mk hl"')+
    kp(`Usage ${ML[2]} vs ${ML[0]}`,dk==null?'—':pct(dk),`${up.length} up · ${fl} stable · ${dn.length} down`,dk||0)+
    kp(`Cost · ${ML[2]}`,'Rp '+(tc[2]/1e9).toFixed(2)+' M',`${ML[0]} ${(tc[0]/1e9).toFixed(2)} → ${ML[1]} ${(tc[1]/1e9).toFixed(2)} M`)+
    kp(`Cost ${ML[2]} vs ${ML[0]}`,dc==null?'—':pct(dc),`${cu} sites with cost up`,dc||0)+
    kp(`Cost per kWh · ${ML[2]}`,'Rp '+fmt(r2),`${ML[0]} Rp ${fmt(r0)} · ${dr==null?'':pct(dr)}`);
  const q=document.getElementById('qtSearch').value.trim().toLowerCase();
  let f=all.filter(r=>r.ok&&(!QT.hide||!r.bad)&&(QT.f==='all'||qtDir(r.t)===QT.f)&&(!q||r.s.n.toLowerCase().includes(q)));
  const d=QT.dir==='desc'?1:-1;
  f.sort((x,y)=>QT.sk==='name'?x.s.n.localeCompare(y.s.n)*(QT.dir==='asc'?1:-1):((y[QT.sk]??-9)-(x[QT.sk]??-9))*d);
  const miss=all.filter(r=>!r.ok).length, hid=QT.hide?all.filter(r=>r.ok&&r.bad).length:0;
  document.getElementById('qtNote').textContent=`Source: the actual electricity invoices (kWh and cost including PPN, as billed). Daily meter readings are not used here. An invoice month follows the billing period, which usually does not match the calendar month, and months have different numbers of days, so changes of a few percent can come from that. "Cost per kWh" is invoice cost divided by invoice kWh, so it shows tariff and other charges separately from usage. ${miss?miss+' site'+(miss>1?'s have':' has')+' no invoice for one of the months. ':''}${hid?hid+' site'+(hid>1?'s':'')+' with an unusual invoice amount hidden (use the button to show them). ':''}`;
  document.querySelectorAll('#qtFilt button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===QT.f)));
  document.getElementById('qtHide').setAttribute('aria-pressed',String(QT.hide));
  const cell=(p,on)=>p==null?'<span class="cell flat">—</span>':`<span class="cell ${p>CT.hi?'up':p>CT.lo?'warn':p<-CT.lo?'down':'flat'}${on?' on':''}">${pct(p)}</span>`;
  const th=(k,l,c='')=>`<th class="${c} ${QT.sk===k?'sorted':''}" aria-sort="${QT.sk===k?(QT.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" data-k="${k}">${l}${QT.sk===k?(QT.dir==='asc'?' ▲':' ▼'):''}</button></th>`;
  const lim=15, shown=(QT.more||q||QT.f!=='all')?f:f.slice(0,lim);
  const body=shown.map(r=>`<tr class="row" data-brief="${fuEsc(r.n)}" tabindex="0"><td><div class="sn"><span class="sd ${r.t>CT.lo?'up':r.t<-CT.lo?'down':'flat'}"></span><span><b>${short(r.s.n)}${fuHas(r.s.n)?'<i class="nd" title="Has a note"></i>':''}</b><small>${r.s.r}${r.flag?' · <span data-notr>'+fuEsc(r.flag)+'</span>':''}</small></span></div></td>
    ${r.kw.map(x=>`<td class="hs">${fmt(x)}</td>`).join('')}<td>${cell(r.t,true)}</td><td class="sp hs">${qtSpark(r.kw)}</td>
    ${r.cs.map(x=>`<td class="hs">${qtIdr(x)}</td>`).join('')}<td>${cell(r.ct,true)}</td><td class="hs">Rp ${fmt(r.rt[2])}<br>${cell(r.rc)}</td><td class="hs"><small>${r.why}</small></td>
    <td class="hs">${r.bud?fmt(r.bud)+'<br>'+cell(r.vb):'<small class="tk-n">No budget</small>'}</td></tr>`).join('');
  const g=(t,n)=>`<th colspan="${n}" class="grp">${t}</th>`;
  document.getElementById('qtTable').innerHTML=`<table class="ptable qtt" style="min-width:1180px"><thead><tr><th></th>${g('kWh usage (invoice)',5)}${g('Cost (Rp, incl. PPN)',4)}${g('Why',2)}${g('Budget',1)}</tr><tr>${th('name','Site')}${ML.map(m=>`<th class="hs">${m}</th>`).join('')}${th('t',ML[2]+' vs '+ML[0])}<th class="hs">Trend</th>${ML.map(m=>`<th class="hs">${m}</th>`).join('')}${th('ct',ML[2]+' vs '+ML[0])}${th('rc',ML[2]+' cost per kWh','hs')}<th class="hs">Driver</th>${th('vb',ML[2]+' budget (kWh)','hs')}</tr></thead><tbody>${body||`<tr><td colspan="13" class="empty">No matching sites.</td></tr>`}</tbody></table>`;
  document.getElementById('qtMore').innerHTML=(!q&&QT.f==='all'&&f.length>lim)?`<button type="button" class="chipbtn" data-more aria-pressed="true">${QT.more?'Show top '+lim:'Show all '+f.length+' sites'}</button>`:'';
  const mv=pool.filter(r=>r.t>CT.lo).sort((a,b)=>b.t-a.t).slice(0,6), mx=Math.max(.01,...mv.map(r=>r.t));
  document.getElementById('qtMovers').innerHTML=mv.length?mv.map(r=>`<div class="mvrow" data-brief="${fuEsc(r.n)}" tabindex="0"><b>${short(r.s.n)}</b><em class="up">${fmt(r.kw[0])} → ${fmt(r.kw[2])} kWh · ${pct(r.t)}<br><span style="font-weight:500">${qtIdr(r.cs[0])} → ${qtIdr(r.cs[2])} · cost ${pct(r.ct)}</span></em><div class="mvbar"><i style="width:${Math.max(3,r.t/mx*100)}%;background:var(--up)"></i></div></div>`).join(''):'<div class="note">No site increased by more than 5% in this quarter.</div>';
  QT.tsv=['Site\tRegion\t'+ML.map(m=>m+' kWh').join('\t')+'\tkWh '+ML[2]+' vs '+ML[0]+'\t'+ML.map(m=>m+' Rp').join('\t')+'\tCost '+ML[2]+' vs '+ML[0]+'\t'+ML[2]+' Rp per kWh\tDriver\t'+ML[2]+' budget kWh\t'+ML[2]+' kWh vs budget\tData note',...f.map(r=>[r.s.n,r.s.r,...r.kw.map(Math.round),(r.t*100).toFixed(1)+'%',...r.cs.map(Math.round),(r.ct*100).toFixed(1)+'%',Math.round(r.rt[2]),r.why,r.bud?Math.round(r.bud):'',r.vb==null?'':(r.vb*100).toFixed(1)+'%',r.flag].join('\t'))].join('\n');
}
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='qtQ'){QT.q=e.target.value; renderQuarter();} });
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='qtSearch') renderQuarter(); });
document.addEventListener('click',e=>{
  const f=e.target.closest('#qtFilt [data-f]'); if(f){QT.f=f.dataset.f; renderQuarter(); return;}
  if(e.target.closest('#qtHide')){QT.hide=!QT.hide; renderQuarter(); return;}
  if(e.target.closest('#qtCopy')){copyText(QT.tsv||'',document.getElementById('qtMsg')); return;}
  const h=e.target.closest('#qtTable th button'); if(h){e.stopPropagation(); const k=h.dataset.k; if(QT.sk===k) QT.dir=QT.dir==='desc'?'asc':'desc'; else {QT.sk=k; QT.dir=k==='name'?'asc':'desc';} renderQuarter(); return;}
  if(e.target.closest('#qtMore [data-more]')){QT.more=!QT.more; renderQuarter();}
});

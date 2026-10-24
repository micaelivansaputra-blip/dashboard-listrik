/* ---------- Quarter view: how every site moved month by month inside a quarter ---------- */
const QT={q:'2026-Q3',f:'all',hide:true,sk:'t',dir:'desc',txt:'',more:false};
const QMON={'2026-Q2':['2026-04','2026-05','2026-06'],'2026-Q3':['2026-07','2026-08','2026-09']};
function qtMonths(){ return QMON[QT.q]||QMON['2026-Q3']; }
function qtAvail(){ const ks=monthKeys().filter(m=>m.k[0]==='v').map(m=>m.ym); return Object.keys(QMON).filter(q=>QMON[q].every(m=>ks.includes(m))); }
function qtSites(){ return momAll().filter(s=>REGION==='All'||s.r===REGION); }
function qtFlag(s){ if(!s.track||typeof tkWhy!=='function') return ''; return tkWhy(s,tkInfo(s)).filter(w=>/wrong|far from|estimated|not plausible|last updated/.test(w)).join('; '); }
const qtBad=s=>s.track&&typeof tkWhy==='function'&&tkWhy(s,tkInfo(s)).some(w=>/wrong|far from/.test(w));
function qtRows(){
  const ms=qtMonths(), nxt=(()=>{const d=new Date(+ms[2].slice(0,4),+ms[2].slice(5),1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const hasNext=monthKeys().some(m=>m.k==='v:'+nxt);
  return qtSites().map(s=>{
    const v=ms.map(m=>siteMonth(s,'v:'+m,'all')), nx=hasNext?siteMonth(s,'v:'+nxt,'all'):NaN;
    const ok=v.every(Number.isFinite); let flag=qtFlag(s), bad=qtBad(s);
    if(ok&&s.track){const md=[...v].sort((a,b)=>a-b)[1]; if(v.some(x=>x<=0||x/md>2.5||x/md<.4)){bad=true; flag=(flag?flag+'; ':'')+'Odd monthly level, check meter';}}
    return {s,v,ok,s1:ok?v[1]/v[0]-1:null,s2:ok?v[2]/v[1]-1:null,t:ok?v[2]/v[0]-1:null,nx:Number.isFinite(nx)&&Number.isFinite(v[2])?nx/v[2]-1:null,flag,bad};
  });
}
const qtDir=t=>t==null?'na':t>CT.lo?'up':t<-CT.lo?'down':'flat';
function qtSpark(v){ const mx=Math.max(...v), mn=Math.min(...v)*.9; return `<svg viewBox="0 0 54 26" aria-hidden="true">${v.map((x,i)=>{const h=Math.max(3,(x-mn)/(mx-mn||1)*22); return `<rect x="${i*19}" y="${25-h}" width="14" height="${h}" rx="3" fill="var(--blue)" opacity="${.35+i*.3}"/>`;}).join('')}</svg>`; }
function renderQuarter(){
  const sec=document.getElementById('s-quarter'), nb=document.querySelector('#nav [data-t="s-quarter"]'); if(!sec) return;
  const av=hasHist()?qtAvail():[]; if(!av.length){sec.hidden=true; if(nb) nb.hidden=true; return;} if(nb) nb.hidden=false;
  if(!av.includes(QT.q)) QT.q=av[av.length-1];
  const sel=document.getElementById('qtQ'); if(sel.dataset.sig!==av.join()){sel.innerHTML=av.slice().reverse().map(q=>`<option value="${q}">${q.slice(5)} ${q.slice(0,4)}</option>`).join(''); sel.dataset.sig=av.join();} sel.value=QT.q;
  const ms=qtMonths(), ML=ms.map(m=>MN[+m.slice(5)-1]), nxtL=(()=>{const n=(+ms[2].slice(5))%12; return MN[n];})();
  const all=qtRows(), pool=all.filter(r=>r.ok&&!(QT.hide&&r.bad));
  const up=pool.filter(r=>qtDir(r.t)==='up'), dn=pool.filter(r=>qtDir(r.t)==='down'), fl=pool.length-up.length-dn.length;
  const tot=ms.map((_,i)=>pool.reduce((t,r)=>t+r.v[i],0)), tt=pool.length?tot[2]/tot[0]-1:null;
  document.getElementById('qtSub').textContent=`${QT.q.slice(5)} ${QT.q.slice(0,4)} · ${ML[0]}–${ML[2]} · ${pool.length} sites with data in all three months`;
  document.getElementById('qtKpis').innerHTML=
    ms.map((m,i)=>`<div class="mk${i===2?' hl':''}"><small>${ML[i]} ${m.slice(0,4)}</small><b>${fmt(tot[i])}</b><span>kWh per day, all sites</span></div>`).join('')+
    `<div class="mk"><small>${ML[2]} vs ${ML[0]}</small><b class="${cls(tt||0)}">${tt==null?'—':pct(tt)}</b><span>${up.length} up · ${fl} stable · ${dn.length} down</span></div>`;
  const q=QT.q&&document.getElementById('qtSearch').value.trim().toLowerCase();
  let f=all.filter(r=>r.ok&&(!QT.hide||!r.bad)&&(QT.f==='all'||qtDir(r.t)===QT.f)&&(!q||r.s.n.toLowerCase().includes(q)));
  const d=QT.dir==='desc'?1:-1, key=r=>QT.sk==='name'?r.s.n:QT.sk==='a'?r.v[2]:r[QT.sk];
  f.sort((x,y)=>QT.sk==='name'?x.s.n.localeCompare(y.s.n)*(QT.dir==='asc'?1:-1):((key(y)??-9)-(key(x)??-9))*d);
  const miss=all.length-all.filter(r=>r.ok).length, hid=QT.hide?all.filter(r=>r.ok&&r.bad).length:0;
  document.getElementById('qtNote').textContent=`Average kWh per day for each month, only sites with at least 70% of days in every month. ${miss?miss+' site'+(miss>1?'s have':' has')+' no usable data in one of the months. ':''}${hid?hid+' tracking site'+(hid>1?'s':'')+' with a suspect meter level (CT or unit may be wrong) hidden. ':''}${ms[0]<'2026-08'?'March to July readings are only lightly cleaned, so '+ML[0]+' can be noisier.':''}`;
  document.querySelectorAll('#qtFilt button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===QT.f)));
  const hb=document.getElementById('qtHide'); hb.setAttribute('aria-pressed',String(QT.hide));
  const cell=(p,on)=>p==null?'<span class="cell flat">—</span>':`<span class="cell ${p>CT.hi?'up':p>CT.lo?'warn':p<-CT.lo?'down':'flat'}${on?' on':''}">${pct(p)}</span>`;
  const th=(k,l,c='')=>`<th class="${c} ${QT.sk===k?'sorted':''}" aria-sort="${QT.sk===k?(QT.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" data-k="${k}">${l}${QT.sk===k?(QT.dir==='asc'?' ▲':' ▼'):''}</button></th>`;
  const lim=15, shown=(QT.more||q||QT.f!=='all')?f:f.slice(0,lim);
  const body=shown.map(r=>`<tr class="row" data-n="${fuEsc(r.s.n)}" tabindex="0"><td><div class="sn"><span class="sd ${r.t>CT.lo?'up':r.t<-CT.lo?'down':'flat'}"></span><span><b>${short(r.s.n)}${fuHas(r.s.n)?'<i class="nd" title="Has a note"></i>':''}</b><small>${r.s.r}${r.s.track?' · tracking':''}${r.flag?' · <span data-notr>'+fuEsc(r.flag.split(';')[0])+'</span>':''}</small></span></div></td>
    ${r.v.map(x=>`<td class="hs">${fmt(x)}</td>`).join('')}<td class="hs">${cell(r.s1)}</td><td class="hs">${cell(r.s2)}</td><td>${cell(r.t,true)}</td><td class="sp hs">${qtSpark(r.v)}</td><td class="hs">${cell(r.nx)}</td></tr>`).join('');
  document.getElementById('qtTable').innerHTML=`<table class="ptable" style="min-width:760px"><thead><tr>${th('name','Site')}${ms.map((m,i)=>`<th class="hs">${ML[i]}</th>`).join('')}${th('s1',ML[1]+' vs '+ML[0],'hs')}${th('s2',ML[2]+' vs '+ML[1],'hs')}${th('t',ML[2]+' vs '+ML[0])}<th class="hs">Trend</th>${th('nx',nxtL+' MTD vs '+ML[2],'hs')}</tr></thead><tbody>${body||'<tr><td colspan="9" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  document.getElementById('qtMore').innerHTML=(!q&&QT.f==='all'&&f.length>lim)?`<button type="button" class="chipbtn" data-more aria-pressed="true">${QT.more?'Show top '+lim:'Show all '+f.length+' sites'}</button>`:'';
  const mv=pool.filter(r=>r.t>CT.lo).sort((a,b)=>b.t-a.t).slice(0,6), mx=Math.max(.01,...mv.map(r=>r.t));
  document.getElementById('qtMovers').innerHTML=mv.length?mv.map(r=>`<div class="mvrow" data-n="${fuEsc(r.s.n)}" tabindex="0"><b>${short(r.s.n)}</b><em class="up">${fmt(r.v[0])} → ${fmt(r.v[2])} kWh/day · ${pct(r.t)}</em><div class="mvbar"><i style="width:${Math.max(3,r.t/mx*100)}%;background:var(--up)"></i></div></div>`).join(''):'<div class="note">No site increased by more than 5% in this quarter.</div>';
  QT.tsv=['Site\tRegion\t'+ML.join(' kWh/day\t')+' kWh/day\t'+ML[1]+' vs '+ML[0]+'\t'+ML[2]+' vs '+ML[1]+'\t'+ML[2]+' vs '+ML[0]+'\tDirection\t'+nxtL+' MTD vs '+ML[2]+'\tData note',...f.map(r=>[r.s.n,r.s.r,...r.v.map(x=>x.toFixed(1)),(r.s1*100).toFixed(1)+'%',(r.s2*100).toFixed(1)+'%',(r.t*100).toFixed(1)+'%',{up:'Increasing',down:'Decreasing',flat:'Stable'}[qtDir(r.t)],r.nx==null?'':(r.nx*100).toFixed(1)+'%',r.flag].join('\t'))].join('\n');
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

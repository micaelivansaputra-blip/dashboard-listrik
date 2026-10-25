/* ---------- Site Performance: every site against its budget for one month (default = month to date) ----------
   Three cards double as filters: Over budget, Saving, On budget. Reuses ovSite() from the overview, so the numbers
   match the MTD page exactly. Tap a row for the site's daily chart. */
const PF={f:'all',sk:'ex',dir:'desc',q:''};
function pfPrev(ym){const y=+ym.slice(0,4),m=+ym.slice(5);return m>1?y+'-'+String(m-1).padStart(2,'0'):null;}
function renderPerf(list){
  const $=id=>document.getElementById(id); if(!$('pfTable')) return;
  const last=ovLast(), months=ovMonthList(), ym=(OVM&&months.includes(OVM))?OVM:last, mi=+ym.slice(5)-1, isLast=ym===last;
  const sel=$('pfMonth'), sig=months.join(',')+'|'+ym;
  if(sel.dataset.sig!==sig){sel.innerHTML=months.slice().reverse().map(m=>`<option value="${m}">${MONFULL[+m.slice(5)-1]} ${m.slice(0,4)}${m===last?' (MTD)':''}</option>`).join(''); sel.dataset.sig=sig;}
  sel.value=ym;
  const nb=document.querySelector('#nav [data-t="s-perf"]'); if(nb&&nb.textContent!=='Site Performance') nb.textContent='Site Performance';
  const py=pfPrev(ym), pm=py?MN[+py.slice(5)-1]:'';
  const all=list.map(s=>{const r=ovSite(s,ym); if(!r) return null; r.pv=py?siteMonth(s,'v:'+py,'all'):NaN; r.t=Number.isFinite(r.pv)&&r.pv>0?r.act/r.pv-1:null; r.st=r.p>CT.lo?'over':r.p<-CT.lo?'save':'on'; return r;}).filter(Boolean);
  const cnt=k=>all.filter(r=>r.st===k), sum=a=>a.reduce((t,r)=>t+r.ex,0);
  const ov=cnt('over'), sv=cnt('save'), on=cnt('on');
  const dim=all[0]?all[0].dim:30, nd=isLast?days.filter(d=>d.slice(0,7)===ym).length:dim;
  $('pfSub').textContent=all.length?`${MONFULL[mi]} ${ym.slice(0,4)}${isLast&&nd<dim?' · month to date, 1–'+nd:''} · ${all.length} sites`:'';
  const card=(k,t,a,cls,note)=>`<button type="button" class="pfc ${cls}" data-pf="${k}" aria-pressed="${PF.f===k}"><span class="pfl">${t}</span><span class="pfv">${a.length}</span><span class="pfn">${note}</span></button>`;
  $('pfCards').innerHTML=
    card('all','All sites',all,'',`${fmt(all.reduce((t,r)=>t+r.act,0))} kWh/day vs budget ${fmt(all.reduce((t,r)=>t+r.bud,0))}`)+
    card('over','Over budget',ov,'up',`more than 5% above · ${ov.length?'+'+fmt(sum(ov)):'0'} kWh/day`)+
    card('save','Saving',sv,'down',`more than 5% below · ${sv.length?'−'+fmt(Math.abs(sum(sv))):'0'} kWh/day`)+
    card('on','On budget',on,'flat','within 5% either way');
  const q=$('pfSearch').value.trim().toLowerCase();
  let f=all.filter(r=>(PF.f==='all'||r.st===PF.f)&&(!q||r.s.n.toLowerCase().includes(q)));
  const d=PF.dir==='desc'?1:-1;
  f.sort((x,y)=>PF.sk==='name'?x.s.n.localeCompare(y.s.n)*(PF.dir==='asc'?1:-1):((y[PF.sk]??-1e9)-(x[PF.sk]??-1e9))*d);
  const mx=Math.max(.2,...f.map(r=>Math.abs(r.p)));
  const pill=r=>`<span class="pfp ${r.st}">${r.st==='over'?'Over budget':r.st==='save'?'Saving':'On budget'}</span>`;
  const th=(k,l,c='')=>`<th class="${c} ${PF.sk===k?'sorted':''}" aria-sort="${PF.sk===k?(PF.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" data-k="${k}">${l}${PF.sk===k?(PF.dir==='asc'?' ▲':' ▼'):''}</button></th>`;
  const body=f.map(r=>`<tr class="row" data-n="${fuEsc(r.s.n)}" tabindex="0"><td><div class="sn"><span class="sd ${r.st==='over'?'up':r.st==='save'?'down':'flat'}"></span><span><b>${short(r.s.n)}${fuHas(r.s.n)?'<i class="nd" title="Has a note"></i>':''}</b><small>${r.s.r}${r.s.partial?' · partial meter':''}</small></span></div></td>
    <td class="hs">${fmt(r.act)}</td><td class="hs">${fmt(r.bud)}</td><td class="hs"><b class="${r.st==='over'?'up':r.st==='save'?'down':''}">${r.ex>=0?'+':'−'}${fmt(Math.abs(r.ex))}</b></td>
    <td class="hs"><div class="pfb"><span class="${r.st}">${pct(r.p)}</span><i class="${r.st}" style="width:${Math.max(3,Math.abs(r.p)/mx*100)}%"></i></div></td>
    <td class="hs">${r.t==null?'<small class="tk-n">—</small>':`<span class="cell ${r.t>CT.lo?'up':r.t<-CT.lo?'down':'flat'}">${pct(r.t)}</span>`}</td><td>${pill(r)}</td></tr>`).join('');
  $('pfTable').innerHTML=`<table class="ptable pft"><thead><tr>${th('name','Site')}${th('act','Actual kWh/day','hs')}${th('bud','Budget','hs')}${th('ex','Gap kWh/day','hs')}${th('p','vs budget','hs')}${th('t',pm?'vs '+pm:'vs last month','hs')}<th>Status</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="empty">No matching sites.</td></tr>'}</tbody></table>`;
  $('pfNote').textContent=`Budget per day = monthly budget ÷ ${dim} days. Over or under budget means more than 5% away from budget. Tap a row for the daily chart.`;
}
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-pf]'); if(c){PF.f=c.dataset.pf; PF.sk='ex'; PF.dir=PF.f==='save'?'asc':'desc'; renderPerf(selected()); return;}
  const h=e.target.closest('#pfTable th button'); if(h){e.stopPropagation(); const k=h.dataset.k; if(PF.sk===k) PF.dir=PF.dir==='desc'?'asc':'desc'; else {PF.sk=k; PF.dir=k==='name'?'asc':'desc';} renderPerf(selected());}
});
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='pfSearch') renderPerf(selected()); });
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='pfMonth'){OVM=e.target.value; render();} });

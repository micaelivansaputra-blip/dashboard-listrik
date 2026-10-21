/* ---------- Overview: usage against the FY2026 budget of one month ----------
   Default is the latest month in the data (month to date). The Month filter switches to
   another month and compares that month with its own budget. Nothing else is compared here. */
let OVM=null;                                   // chosen month as 'YYYY-MM'; null = latest month
const MONFULL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ovLast=()=>days[N-1].slice(0,7);
function ovMonthList(){
  const last=ovLast(), out=[];
  if(hasHist()) monthKeys().filter(m=>m.k[0]==='v').forEach(m=>{ if(m.ym.slice(0,4)==='2026') out.push(m.ym); });
  if(!out.includes(last)) out.push(last);
  return out.sort();
}
/* one site's average kWh/day in a month, and that month's budget per day */
function ovSite(s,ym){
  const no=(/^\d+/.exec(s.n)||[])[0], b=no&&BUDGET[+no], mi=+ym.slice(5)-1, dim=new Date(+ym.slice(0,4),mi+1,0).getDate();
  if(!b||!b.m[mi]) return null;
  const act=ym===ovLast()?siteAvg(s).okt:siteMonth(s,'v:'+ym,'all');
  if(!Number.isFinite(act)) return null;
  const bud=b.m[mi]/dim; return {s,act,bud,ex:act-bud,p:act/bud-1,month:b.m[mi],dim};
}
/* total kWh per day across the sites, for every day of the month that has data */
function ovDaily(rows,ym){
  const last=ym===ovLast(), out=[];
  const idx=last?days.map((d,i)=>[d,i]).filter(x=>x[0].slice(0,7)===ym):MD('v:'+ym).map(x=>[x.d,x.i]);
  idx.forEach(([d,i])=>{
    let t=0,ok=true;
    for(const r of rows){const arr=last?r.s.v:DATA.hist.v[r.s.n]; const x=arr&&arr[i]; if(x==null||!Number.isFinite(x)){ok=false;break;} t+=x;}
    if(ok) out.push({d,v:t});
  });
  return out;
}
function ovChart(series,bud,mx){
  const W=860,H=250,L=46,R=8,T=14,B=26, pw=W-L-R, ph=H-T-B, n=series.length||1, gap=Math.max(2,Math.min(8,pw/n*.22)), bw=pw/n-gap;
  const top=Math.max(mx,bud)*1.12, y=v=>T+ph-v/top*ph, step=(()=>{const raw=top/4,m=Math.pow(10,Math.floor(Math.log10(raw)));return [1,2,2.5,5,10].map(k=>k*m).find(k=>k>=raw)||raw;})();
  let g='';
  for(let v=0;v<=top;v+=step) g+=`<line x1="${L}" x2="${W-R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="ov-grid"/><text x="${L-8}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" class="ov-ax">${fmt(v)}</text>`;
  const bars=series.map((x,i)=>{const bx=L+i*(pw/n)+gap/2, hh=Math.max(1,x.v/top*ph), over=x.v>bud*(1+CT.hi);
    return `<rect x="${bx.toFixed(1)}" y="${(T+ph-hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="${Math.min(4,bw/3).toFixed(1)}" class="ov-bar${over?' hi':''}"><title>${DN[dow(x.d)]} ${dm(x.d)}: ${fmt(x.v)} kWh (${pct(x.v/bud-1)} vs budget)</title></rect>
      <text x="${(bx+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle" class="ov-ax">${+x.d.slice(8)}</text>`;}).join('');
  return `<svg class="ov-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Total kWh per day against the budget per day">${g}${bars}
    <line x1="${L}" x2="${W-R}" y1="${y(bud).toFixed(1)}" y2="${y(bud).toFixed(1)}" class="ov-bud"/>
    <text x="${L+6}" y="${(y(bud)-7).toFixed(1)}" text-anchor="start" class="ov-budl">Budget ${fmt(bud)}</text></svg>`;
}
function renderOverview(list){
  const $=id=>document.getElementById(id); if(!$('ovVerdict')) return;
  const last=ovLast(), months=ovMonthList(), ym=(OVM&&months.includes(OVM))?OVM:last, mi=+ym.slice(5)-1, mname=MONFULL[mi], isLast=ym===last;
  const sel=$('ovMonth'), sig=months.join(',')+'|'+ym;
  if(sel.dataset.sig!==sig){sel.innerHTML=months.slice().reverse().map(m=>`<option value="${m}">${MONFULL[+m.slice(5)-1]} ${m.slice(0,4)}${m===last?' (MTD)':''}</option>`).join(''); sel.dataset.sig=sig;}
  sel.value=ym;
  const nb=document.querySelector('#nav [data-t="s-ringkasan"]'); if(nb){const t=isLast?'MTD '+MN[mi]:MONFULL[mi]; if(nb.textContent!==t) nb.textContent=t;}
  const rows=list.map(s=>ovSite(s,ym)).filter(Boolean);
  const ntot=list.length;
  if(!rows.length){ $('ovVerdict').innerHTML=`<h2>No budget comparison for ${mname}</h2><p style="margin-top:8px">There is no daily data with a budget for this month and region.</p>`; $('ovKpis').innerHTML=''; $('ovDaily').innerHTML=''; $('ovLists').innerHTML=''; return; }
  const ta=rows.reduce((t,r)=>t+r.act,0), tb=rows.reduce((t,r)=>t+r.bud,0), tp=ta/tb-1, dim=rows[0].dim;
  const over=rows.filter(r=>r.p>CT.lo), red=rows.filter(r=>r.p>CT.hi), save=rows.filter(r=>r.p<-CT.lo);
  const byEx=rows.slice().sort((x,y)=>y.ex-x.ex), top5=byEx.filter(r=>r.p>CT.lo).slice(0,5), sv=rows.slice().sort((x,y)=>x.ex-y.ex).filter(r=>r.p<-CT.lo).slice(0,5);
  const ap=Math.abs(tp*100).toFixed(1)+'%';
  const c=tp>CT.hi?'up':tp>CT.lo?'warn':tp<-CT.lo?'flat':'flat';
  const chip=tp>CT.lo?'Over budget':tp<-CT.lo?'Under budget':'On budget';
  const title=tp>CT.lo||tp<-CT.lo?`Usage is ${ap} ${tp>0?'above':'below'} the ${mname} budget`:`Usage is on budget for ${mname}`;
  const daily=ovDaily(rows,ym), nd=daily.length;
  const proj=isLast&&nd&&nd<dim?`At this pace ${mname} ends at about ${fmt(ta*dim)} kWh against a budget of ${fmt(tb*dim)} kWh.`:'';
  const note=isLast&&nd<dim?`Month to date: ${nd} of ${dim} days (1–${+days[N-1].slice(8)} ${MN[mi]}). Budget per day = monthly budget ÷ ${dim} days.`:`Full month. Budget per day = monthly budget ÷ ${dim} days.`;
  $('ovVerdict').innerHTML=`<span class="chip ${c}">${chip}</span><h2 style="margin-top:12px">${title}</h2>
    <p style="margin-top:8px">Actual ${fmt(ta)} kWh/day against a budget of ${fmt(tb)} kWh/day · ${rows.length} sites${REGION==='All'?'':' · '+REGION}.</p>
    <ul class="basis" style="margin-top:14px">
     <li>${over.length} of ${rows.length} sites are more than 5% above budget (${red.length} are more than 10%).</li>
     ${save.length?`<li>${save.length} site${save.length===1?' is':'s are'} more than 5% below budget.</li>`:''}
     ${top5[0]?`<li>Biggest gap: ${short(top5[0].s.n)}, +${fmt(top5[0].ex)} kWh/day (${pct(top5[0].p,0)}).</li>`:''}
     ${proj?`<li>${proj}</li>`:''}</ul>`;
  $('ovNote').textContent=note;
  const dl=(k,t)=>`<div class="delta ${k}">${t}</div>`;
  const kcls=tp>CT.lo?'up':tp<-CT.lo?'down':'flat';
  const items=[
    ['Budget',tb,'kWh per day',`<div class="u" style="margin-top:10px">${fmt(tb*dim)} kWh for ${mname}</div>`,''],
    [isLast?'Actual (month to date)':'Actual',ta,'kWh per day',dl(kcls,`${ICON[kcls]}${pct(tp)} <span>vs budget</span>`),'hl'],
    ['Gap to budget',Math.abs(ta-tb),'kWh per day',dl(kcls,`${ta>=tb?'above':'below'} budget`),''],
    ['Sites over budget',over.length,`of ${rows.length} sites`,`<div class="delta ${red.length?'up':'flat'}">${red.length} red · ${save.length} saving</div>`,'']];
  $('ovKpis').innerHTML=items.map(([l,v,u,d,h])=>`<div class="card kpi ${h}"><div class="l">${l}</div><div class="v">${fmt(v)}</div><div class="u">${u}</div>${d}</div>`).join('');
  document.querySelectorAll('#ovKpis .v').forEach((el,i)=>countUp(el,items[i][1]));
  $('ovDaily').innerHTML=`<div class="strip-top"><h3>Each day vs budget</h3><div class="sub">Total kWh per day, ${rows.length} sites · the dashed line is the budget per day</div></div>`+(nd?ovChart(daily,tb,Math.max(...daily.map(x=>x.v))):'<div class="empty">No daily data for this month.</div>')+
    `<div class="sw"><span><i style="background:var(--blue)"></i>Within 10% of budget or below</span><span><i style="background:var(--up)"></i>More than 10% above budget</span></div>`;
  const li=(r,sg)=>`<div class="ovl" role="button" tabindex="0" data-n="${r.s.n}"><span class="nm"><b>${short(r.s.n)}</b><small>${r.s.r} · ${fmt(r.act)} vs ${fmt(r.bud)} kWh/day</small></span><span class="v ${sg}">${sg==='up'?'+':'−'}${fmt(Math.abs(r.ex))}<small>${pct(r.p,0)}</small></span></div>`;
  $('ovLists').innerHTML=`<div class="card"><div class="ovl-h"><h3>Biggest gaps above budget</h3><button type="button" class="linkbtn" data-pg="s-cek">Open Site Concern ›</button></div>${top5.length?top5.map(r=>li(r,'up')).join(''):'<div class="empty">No site is more than 5% above budget.</div>'}</div>
    <div class="card"><div class="ovl-h"><h3>Saving against budget</h3></div>${sv.length?sv.map(r=>li(r,'down')).join(''):'<div class="empty">No site is more than 5% below budget.</div>'}</div>`;
  QUIPS=[`${mname} is ${pct(tp)} vs budget.`];
}
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='ovMonth'){OVM=e.target.value; renderOverview(selected()); if(typeof Pager!=='undefined') Pager.sync();} });

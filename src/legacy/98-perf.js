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
  $('pfSub').textContent=all.length?`${MONFULL[mi]} ${ym.slice(0,4)}${isLast&&nd<dim?' · month to date, 1–'+nd:''}`:'';
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
  PF.shown=f; PF.all=all; PF.ym=ym; PF.nd=nd; PF.dim=dim; PF.isLast=isLast;
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

/* ---- Download PNG of the table as shown (current month, filter and sort), top N rows ---- */
const PFLAB={all:'All sites',over:'Over budget',save:'Saving',on:'On budget'};
function pfCanvas(n,mode){
  const all=PF.all||[], both=mode==='both';
  const sections=both?[{t:'Over budget',rows:all.filter(r=>r.st==='over').sort((x,y)=>y.ex-x.ex).slice(0,n)},{t:'Saving against budget',rows:all.filter(r=>r.st==='save').sort((x,y)=>x.ex-y.ex).slice(0,n)}].filter(x=>x.rows.length):[{t:null,rows:(PF.shown||[]).slice(0,n)}];
  const F='-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif', S=2, W=1600, P=64, RH=66, top0=250, SH=both?58:0;
  const nrows=sections.reduce((t,x)=>t+x.rows.length,0), H=top0+sections.length*(60+SH)+nrows*RH+(sections.length-1)*30+96;
  const cv=document.createElement('canvas'); cv.width=W*S; cv.height=H*S; const c=cv.getContext('2d'); c.scale(S,S); c.textBaseline='alphabetic';
  const RR=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
  c.fillStyle='#fff'; c.fillRect(0,0,W,H);
  const mi=+PF.ym.slice(5)-1, per=`${MONFULL[mi]} ${PF.ym.slice(0,4)}${PF.isLast&&PF.nd<PF.dim?' · month to date, 1–'+PF.nd+' '+MN[mi]:''}`;
  c.fillStyle='#1b3d9c'; c.font='800 22px '+F; c.fillText('CINÉPOLIS · SITE PERFORMANCE',P,66);
  c.fillStyle='#0f1b3d'; c.font='800 46px '+F; c.fillText(both?'Over budget and saving':{all:'All sites vs budget',over:'Sites over budget',save:'Sites saving vs budget',on:'Sites on budget'}[PF.f],P,126);
  c.fillStyle='#5d6b8c'; c.font='500 24px '+F; c.fillText(`${per} · kWh per day${REGION==='All'?'':' · '+REGION}`,P,166);
  const ov=all.filter(r=>r.st==='over').length, sv=all.filter(r=>r.st==='save').length, on=all.filter(r=>r.st==='on').length;
  const chips=[[`Over budget ${ov}`,'#fdeeec','#c43a30'],[`Saving ${sv}`,'#e9f7f0','#1f7a4e'],[`On budget ${on}`,'#eaf0fd','#1b3d9c']]; let cx=P;
  c.font='700 21px '+F; chips.forEach(([t,bg,fg])=>{const w=c.measureText(t).width+36; c.fillStyle=bg; RR(cx,192,w,38,19); c.fill(); c.fillStyle=fg; c.fillText(t,cx+18,218); cx+=w+12;});
  const col={rk:P+14,site:P+64,act:700,bud:850,gap:1010,bar:1090,st:1370}, TW=W-P*2;
  const mx=Math.max(.2,...sections.flatMap(x=>x.rows.map(r=>Math.abs(r.p))));
  let top=top0;
  sections.forEach(sec=>{
    if(sec.t){ const g=sec.t.startsWith('Over'); c.fillStyle=g?'#c43a30':'#1f7a4e'; c.font='800 30px '+F; c.textAlign='left'; c.fillText(sec.t,P,top+34); top+=SH; }
    c.fillStyle='#1b3d9c'; RR(P,top,TW,52,12); c.fill(); c.fillStyle='#fff'; c.font='700 18px '+F;
    c.textAlign='left'; c.fillText('#',col.rk,top+33); c.fillText('SITE',col.site,top+33);
    c.textAlign='right'; c.fillText('ACTUAL',col.act+80,top+33); c.fillText('BUDGET',col.bud+80,top+33); c.fillText('GAP',col.gap+50,top+33); c.textAlign='left'; c.fillText('VS BUDGET',col.bar,top+33); c.fillText('STATUS',col.st,top+33);
    sec.rows.forEach((r,i)=>{
      const y=top+60+i*RH, mid=y+RH/2; if(i%2===0){c.fillStyle='#f5f7fc'; c.fillRect(P,y,TW,RH);}
      const clr=r.st==='over'?'#c43a30':r.st==='save'?'#1f7a4e':'#1b3d9c', bar=r.st==='over'?'#e8675d':r.st==='save'?'#40b57f':'#6f8fe0';
      c.textAlign='left'; c.fillStyle='#8a96b3'; c.font='700 22px '+F; c.fillText(String(i+1),col.rk,mid+8);
      c.fillStyle='#0f1b3d'; c.font='700 25px '+F; c.fillText(short(r.s.n),col.site,mid-3);
      c.fillStyle='#5d6b8c'; c.font='500 17px '+F; c.fillText(r.s.r+(r.s.partial?' · partial meter':''),col.site,mid+20);
      c.textAlign='right'; c.fillStyle='#0f1b3d'; c.font='500 24px '+F; c.fillText(fmt(r.act),col.act+80,mid+8); c.fillText(fmt(r.bud),col.bud+80,mid+8);
      c.fillStyle=clr; c.font='800 25px '+F; c.fillText((r.ex>=0?'+':'−')+fmt(Math.abs(r.ex)),col.gap+50,mid+8);
      c.textAlign='left'; c.font='800 24px '+F; c.fillStyle=clr; c.fillText(pct(r.p),col.bar,mid+8);
      const bw=Math.max(6,Math.abs(r.p)/mx*140); c.fillStyle=bar; RR(col.bar+112,mid-6,bw,12,6); c.fill();
      const lab=r.st==='over'?'Over budget':r.st==='save'?'Saving':'On budget'; c.font='700 19px '+F; const w2=c.measureText(lab).width+30;
      c.fillStyle=r.st==='over'?'#fdeeec':r.st==='save'?'#e9f7f0':'#eaf0fd'; RR(col.st,mid-17,w2,34,17); c.fill(); c.fillStyle=clr; c.fillText(lab,col.st+15,mid+6);
    });
    top+=60+sec.rows.length*RH+30;
  });
  const fy=top-30+36;
  c.fillStyle='#5d6b8c'; c.font='500 19px '+F; c.textAlign='left';
  c.fillText(`Budget per day = monthly budget ÷ ${PF.dim} days. Over or under budget = more than 5% away from budget. ${PF.ym===days[N-1].slice(0,7)?'Data through '+dm(days[N-1])+', preliminary.':''}`,P,fy);
  c.fillText('Cinépolis Indonesia · Operations',P,fy+30);
  return cv;
}
async function pfDownload(){
  const say=(t,k)=>{const m=document.getElementById('pfMsg'); if(m){m.textContent=t; m.className='fumsg '+(k||'');}};
  const v=document.getElementById('pfRows').value, mode=(document.getElementById('pfInc')||{}).value||'filter', n=v==='all'?Math.max((PF.all||[]).length,1):+v;
  if(!PF.shown||!PF.shown.length){say('Nothing to download for this filter.','err'); return;}
  const cv=pfCanvas(n,mode), nm=`site-performance-${mode==='both'?'over-and-saving':PF.f}-${PF.ym}-top${v==='all'?'all':n}.png`;
  cv.toBlob(async b=>{ if(!b){say('Could not create the picture.','err');return;}
    try{ let dl=null; try{ if(window.claude&&claude.use) dl=await claude.use('downloads'); }catch(e){}
      if(dl){ await dl.save({filename:nm,data:b}); say('Saved '+nm,'ok'); return; }
      const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=nm; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); say('Downloaded '+nm,'ok');
    }catch(e){ say(e&&e.code==='declined'?'Download cancelled.':'Could not download here.','err'); }
  },'image/png');
}
document.addEventListener('click',e=>{ if(e.target.closest('#pfPng')) pfDownload(); });

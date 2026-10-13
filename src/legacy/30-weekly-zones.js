/* ---------- Weekly Zones (By Weekly sheet) ---------- */
const WK={n:5,clean:true,min:4000};
const medOf=a=>{const s=a.slice().sort((x,y)=>x-y),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0;};
function wkRows(){
  const W=DATA.weekly; if(!W||!W.rows||!W.rows.length) return null;
  return W.rows.filter(r=>REGION==='All'||r.r===REGION).map(r=>{
    const d=r.d||[], got=d.filter(x=>x!=null&&x>0), k=got.length, sum=got.reduce((s,x)=>s+x,0);
    const eff=(k&&r.dt)?sum/(r.dt*k)-1:null, med=medOf(got);
    let run=1,mx=k?1:0; for(let i=1;i<d.length;i++){ if(d[i]!=null&&d[i-1]!=null&&Math.abs(d[i]-d[i-1])<0.5){run++;mx=Math.max(mx,run);}else run=1; }
    const fl=[]; if(k&&mx>=5) fl.push(['flat','Same reading on 5 or more days in a row','same reading every day']);
    if(k>=3&&got.some(x=>x>3*med||x<0.15*med)) fl.push(['odd','One day is far from the rest of the week','one odd day']);
    if(eff!=null&&eff<-0.6) fl.push(['low','More than 60% below target: check the meter or CT','far below target, check meter or CT']);
    const S=DATA.sites.find(s=>s.n===r.n), i0=DATA.days?DATA.days.indexOf(W.from):-1;
    if(S&&i0>=0){ let sp=0,sw=0,c=0; for(let i=0;i<7;i++){ const w=d[i], pv=S.v[i0+i]; if(w!=null&&w>0&&pv!=null){sp+=pv;sw+=w;c++;} }
      if(c>=4&&sw>0&&Math.abs(sp/sw-1)>0.10){ const df=sp/sw-1; fl.push(['diff','The dashboard\'s own meter data is '+(df>0?'+':'−')+Math.abs(df*100).toFixed(0)+'% vs this sheet on the same days','meter data differs by '+Math.abs(df*100).toFixed(0)+'%']); } }
    return {r,k,sum,eff,fl,sheetEff:r.wt?r.wa/r.wt-1:null};
  });
}
function wkZones(rows){
  const base=rows.filter(x=>x.k>=5&&x.eff!=null&&x.r.wt>=WK.min);
  const okc=x=>x.k>=6&&!x.fl.length;
  const pool=WK.clean?base.filter(okc):base;
  const green=pool.filter(x=>x.eff<=-0.03).sort((a,b)=>a.eff-b.eff).slice(0,WK.n);
  const red=pool.filter(x=>x.eff>=0.03).sort((a,b)=>b.eff-a.eff).slice(0,WK.n);
  const left=[]; if(WK.clean){
    const g2=base.filter(x=>x.eff<=-0.03).sort((a,b)=>a.eff-b.eff).slice(0,WK.n), r2=base.filter(x=>x.eff>=0.03).sort((a,b)=>b.eff-a.eff).slice(0,WK.n);
    g2.concat(r2).forEach(x=>{ if(!okc(x)) left.push(x); });
  }
  return {base,green,red,left};
}
function wkSpark(r){
  const d=r.d||[], vals=d.filter(x=>x!=null&&x>0); if(!vals.length) return '';
  const hi=Math.max(...vals,r.dt)*1.08, lo=Math.min(...vals,r.dt)*0.92, X=i=>(3+i/6*82).toFixed(1), Y=v=>(25-(v-lo)/(hi-lo||1)*22).toFixed(1);
  let segs=[],cur=[]; d.forEach((v,i)=>{ if(v!=null&&v>0) cur.push(X(i)+','+Y(v)); else { if(cur.length) segs.push(cur); cur=[]; } }); if(cur.length) segs.push(cur);
  const dots=d.map((v,i)=>(v!=null&&v>0&&(i===0||d[i-1]==null||d[i-1]<=0)&&(i===6||d[i+1]==null||d[i+1]<=0))?`<circle cx="${X(i)}" cy="${Y(v)}" r="2.2" fill="var(--blue)"/>`:'').join('');
  return `<svg viewBox="0 0 88 28" aria-hidden="true"><line class="tg" x1="3" x2="85" y1="${Y(r.dt)}" y2="${Y(r.dt)}"/>${segs.map(s=>s.length>1?`<polyline class="ln" points="${s.join(' ')}"/>`:'').join('')}${dots}</svg>`;
}
function wkTint(v,sc){ if(v==null) return ''; const a=Math.min(1,Math.abs(v)/(sc||0.5)), col=v<0?'var(--down)':'var(--up)', pc=Math.round(14+a*46); return `background:color-mix(in srgb,${col} ${pc}%,var(--surface))`; }
function wkScreenTint(es){ const pc=es<=-20?55:es<0?32:14; const col=es<0?(es<=-20?'var(--down)':'var(--amber)'):'var(--up)'; return `background:color-mix(in srgb,${col} ${pc}%,var(--surface))`; }
function wkTable(list){
  const f0=n=>fmt(Math.round(n));
  const row=x=>{ const r=x.r, adj=x.k<7;
    const chips=(adj?`<span class="zflag warn" title="Calculated on the ${x.k} days that have readings">${x.k}/7 days</span>`:'')+x.fl.map(([k,t])=>`<span class="zflag warn" title="${t}">${k==='flat'?'Same value daily':k==='odd'?'Odd day':k==='diff'?'Meter data differs':'Very low'}</span>`).join('');
    return `<tr><td class="nm"><b>${r.n}</b>${chips?`<small>${chips}</small>`:''}</td><td>${f0(r.wt)}</td><td>${f0(r.wa)}</td><td class="hs">${f0(r.show)}</td><td class="hs">${f0(r.close)}</td><td class="eff2 hs" style="${wkScreenTint(r.es)}">${r.es}%</td><td class="eff" style="${wkTint(x.eff)}" title="${adj?'Adjusted to '+x.k+' days. The sheet shows '+(x.sheetEff*100).toFixed(0)+'%.':'Weekly actual ÷ weekly target − 1'}">${x.eff>0?'+':x.eff<0?'−':''}${Math.abs(x.eff*100).toFixed(0)}%</td><td class="sp hs">${wkSpark(r)}</td></tr>`; };
  return `<table class="ptable zt"><thead><tr><th>Cinema</th><th>Weekly target</th><th>Weekly actual</th><th class="hs">Total show</th><th class="hs">Total close screen</th><th class="hs">Efficiency (Screen close)</th><th>Efficiency (Listrik)</th><th class="hs">Daily vs target</th></tr></thead><tbody>${list.length?list.map(row).join(''):'<tr><td colspan="8" class="empty">No site matches this view.</td></tr>'}</tbody></table>`;
}
function renderWeekly(){
  const sec=document.getElementById('s-week'), nav=document.querySelector('#nav [data-t="s-week"]'), rows=wkRows();
  sec.hidden=!rows; nav.hidden=!rows; if(!rows) return;
  const W=DATA.weekly, z=wkZones(rows), n0=rows.length;
  document.getElementById('zwSub').textContent=`${dm(W.from)} – ${dm(W.to)} · Wed–Tue week · from the By Weekly sheet`;
  document.querySelectorAll('#zwN button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.n===WK.n));
  document.querySelectorAll('#zwMode button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.m==='clean')===WK.clean));
  const net=z.base.length||rows.filter(x=>x.k>=5&&x.eff!=null).length;
  const ok=rows.filter(x=>x.k>=5&&x.eff!=null), tg=ok.reduce((s,x)=>s+x.r.dt*x.k,0), ac=ok.reduce((s,x)=>s+x.sum,0), netEff=tg?ac/tg-1:null;
  const over=ok.filter(x=>x.eff>0.1).length, under=ok.filter(x=>x.eff<-0.1).length, none=rows.filter(x=>x.k<5).length;
  document.getElementById('zwKpis').innerHTML=
   `<div class="mk hl"><small>Network vs weekly target</small><b>${netEff==null?'n/a':pct(netEff)}</b><span>${ok.length} sites with 5+ days of readings</span></div>`+
   `<div class="mk"><small>Sites over target (&gt;10%)</small><b class="up">${over}</b><span>of ${ok.length} sites</span></div>`+
   `<div class="mk"><small>Sites under target (&gt;10%)</small><b class="down">${under}</b><span>of ${ok.length} sites</span></div>`+
   `<div class="mk"><small>Sites without enough readings</small><b>${none}</b><span>fewer than 5 of 7 days</span></div>`;
  document.getElementById('zwGreen').innerHTML=wkTable(z.green); document.getElementById('zwRed').innerHTML=wkTable(z.red);
  const L=document.getElementById('zwLeft');
  L.innerHTML=z.left.length?`<b>Left out because the readings look unreliable:</b> ${z.left.map(x=>{const why=x.fl.length?x.fl.map(f=>f[2]).join(', '):`${x.k}/7 days`;return `${short(x.r.n)} (${x.eff>0?'+':'−'}${Math.abs(x.eff*100).toFixed(0)}%, ${why})`;}).join('; ')}. Switch to <i>All sites</i> to include them.`:'';
  const short2=[]; if(z.green.length<WK.n) short2.push(`only ${z.green.length} site${z.green.length===1?'':'s'} in the Green Zone ${z.green.length===1?'is':'are'} more than 3% below target`); if(z.red.length<WK.n) short2.push(`only ${z.red.length} site${z.red.length===1?'':'s'} in the Red Zone ${z.red.length===1?'is':'are'} more than 3% above target`);
  if(short2.length) L.innerHTML+=(z.left.length?'<br>':'')+'Fewer than '+WK.n+' shown: '+short2.join(' and ')+'.';
  L.hidden=!(z.left.length||short2.length);
  document.getElementById('zwNote').textContent=`Efficiency (Listrik) = weekly actual ÷ weekly target − 1. Sites with missing days are measured on the days that have readings, so a half-filled week is not compared with a full-week target. Zones use sites with a weekly target of at least ${fmt(WK.min)} kWh and at least ${WK.clean?6:5} of 7 daily readings. Where the dashboard's own meter-based daily numbers differ from the sheet by more than 10% on the same days, the site is marked and left out of Reliable only. Targets, shows and screen-close figures are shown as entered in the sheet.`;
}
function wireWeekly(){
  document.getElementById('zwN').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;WK.n=+b.dataset.n;renderWeekly();});
  document.getElementById('zwMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;WK.clean=b.dataset.m==='clean';renderWeekly();});
}

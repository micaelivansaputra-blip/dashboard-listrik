/* ---------- hero ---------- */
function octZ(P){
  const sepDays=range(days,IDX.sep), sepVals=range(P.T,IDX.sep);
  return range(days,IDX.okt).map((d,k)=>{
    const ref=sepVals.filter((_,i)=>dow(sepDays[i])===dow(d)); const m=mean(ref);
    const sd=Math.sqrt(ref.reduce((t,x)=>t+(x-m)**2,0)/(ref.length-1));
    return {d, v:P.T[iOkt+k], ref:m, z:(P.T[iOkt+k]-m)/sd};
  });
}
function renderHero(P,list){
  const dSep=P.okt.raw/P.sep.raw-1, dAgu=P.okt.raw/P.agu.raw-1, yoy=P.okt.raw/P.py.raw-1;
  const zs=octZ(P), zmax=Math.max(...zs.map(x=>x.z)), hot=zs.filter(x=>x.z>=2).length;
  const gains=list.map(s=>{const a=siteAvg(s);return a.okt-a.py}).sort((a,b)=>b-a);
  const pos=gains.filter(x=>x>0).reduce((t,x)=>t+x,0), top5=pos?gains.slice(0,5).reduce((t,x)=>t+Math.max(x,0),0)/pos:0;
  const up=list.filter(s=>siteAvg(s).yoy>TH).length, dn=list.filter(s=>siteAvg(s).yoy<-TH).length;
  let c,chip,title; const ap=v=>Math.abs(v*100).toFixed(1)+'%';
  if(dSep>0.01){c=dSep>0.05?'up':'warn';chip='Up vs Sep';title=`Electricity usage is up ${ap(dSep)} vs September`;}
  else if(dSep<-0.01){c='flat';chip='Down vs Sep';title=`Electricity usage is down ${ap(dSep)} vs September`;}
  else {c='flat';chip='Level';title='Electricity usage is level with September';}
  const lowest = P.sep.raw<P.agu.raw && P.sep.raw<P.okt.raw;
  document.getElementById('verdict').innerHTML =
   `<span class="chip ${c}">${chip}</span><h2 style="margin-top:12px">${title}</h2>
    <p style="margin-top:10px">October is ${pct(dSep)} vs September${lowest?' (the lowest month so far)':''}, ${pct(dAgu)} vs August and ${pct(yoy)} vs Oct 2025.</p>
    <ul class="basis" style="margin-top:14px">
     <li>${hot?`${hot} of ${nOkt} October days ran above the normal range for their weekday.`:`All ${nOkt} October days are within the normal range for their weekday.`}</li>
     <li>${up} sites up and ${dn} down vs Oct 2025; 5 sites account for ${Math.round(top5*100)}% of the increase.</li>
     <li>${octLbl} is one full week (5 weekdays + 2 weekend days), so it compares fairly with full months. Data is preliminary.</li></ul>`;
  const mood=c==='flat'?'happy':c==='up'?'worried':'meh';
  const msg=dSep>0.01?`Usage is up ${ap(dSep)} vs Sep. Keep an eye on me!`:dSep<-0.01?'Usage is down vs Sep. Nice!':'Holding steady.';
  renderMascots(mood,msg);
  const topY=list.map(s=>({s,a:siteAvg(s)})).sort((x,y)=>(y.a.okt-y.a.py)-(x.a.okt-x.a.py))[0];
  QUIPS=[`October is ${pct(dSep)} vs September and ${pct(dAgu)} vs August.`,
    `Weekends run ${pct(P.okt.we/P.okt.wd-1)} above weekdays this October. Cinemas are busiest then!`,
    `${dn} sites use less power than last October. Nice work!`,
    topY?`Biggest rise vs last year: ${short(topY.s.n)} (${pct(topY.a.yoy,0)}). Worth a look.`:'Pick a region to zoom in.',
    'Tap any site tile to see its daily chart.'];
  return {zs};
}

function ksp(a){const lo=Math.min(...a),hi=Math.max(...a),n=a.length;
  const p=a.map((v,i)=>[n>1?i/(n-1)*120:0,26-(v-lo)/(hi-lo||1)*22].map(x=>x.toFixed(1)).join(',')).join(' ');
  return `<svg class="ksp" viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${p}"/></svg>`;}
function renderKpis(P){
  const SER=[range(P.T,IDX.agu),range(P.T,IDX.sep),range(P.T,IDX.okt),P.P];
  const items=[
    ['August 2026',P.agu.raw,null,'',''],
    ['September 2026',P.sep.raw,P.sep.raw/P.agu.raw-1,'vs August',''],
    [`October 2026 (${octLbl})`,P.okt.raw,P.okt.raw/P.sep.raw-1,'vs September','hl'],
    [`Oct 2025 (${pyLbl})`,P.py.raw,P.okt.raw/P.py.raw-1,'Oct 2026 vs this','']];
  document.getElementById('kpis').innerHTML=items.map(([l,v,d,s,h],i)=>
   `<div class="card kpi ${h}"><div class="l">${l}</div><div class="v">${fmt(v)}</div><div class="u">kWh per day</div>${ksp(SER[i])}
    <div class="delta ${d==null?'none flat':cls(d)}">${d==null?'&nbsp;':ICON[cls(d)]+pct(d)+' <span>'+s+'</span>'}</div></div>`).join('');
  document.querySelectorAll('#kpis .v').forEach((el,i)=>countUp(el,items[i][1]));
}

function renderStrip(zs){
  const vals=zs.flatMap(x=>[x.v,x.ref]); const lo=Math.min(...vals)*0.88, hi=Math.max(...vals)*1.02;
  const h=v=>((v-lo)/(hi-lo)*100).toFixed(1);
  document.getElementById('strip').innerHTML=zs.map(x=>{
    const we=isWE(x.d);
    return `<div class="dcol" title="${DN[dow(x.d)]} ${dm(x.d)}: ${fmt(x.v)} kWh · September ${DN[dow(x.d)]} average ${fmt(x.ref)}">
      <div class="area"><div class="bar-d ${we?'we':''}" style="height:${h(x.v)}%"></div><div class="ref" style="bottom:${h(x.ref)}%"></div></div>
      <b>${fmt(x.v)}</b><span>${DN[dow(x.d)]} ${dt(x.d).getUTCDate()}</span></div>`;}).join('');
  const hot=zs.filter(x=>x.z>=2).length;
  document.getElementById('stripNote').textContent = hot? `${hot} day(s) above the normal range` : `Every day is within the normal range for its weekday (highest z-score ${Math.max(...zs.map(x=>x.z)).toFixed(1)})`;
}

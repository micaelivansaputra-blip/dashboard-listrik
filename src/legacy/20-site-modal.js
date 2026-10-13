/* ---------- site detail modal ---------- */
function getSite(n){
  return DATA.sites.find(s=>s.n===n)||(DATA.zx||[]).find(s=>s.n===n)||(n==='7-SUN PLAZA'&&DATA.sp?{n,r:'',v:DATA.sp.v}:null);
}
let lastFocus=null;
function openSite(n){
  const s=getSite(n); if(!s) return; lastFocus=document.activeElement;
  const full=s.v.length===N, isP=ZSET.includes(n), L=s.v.length;
  const stats=[]; const st=full?(()=>{const a=siteAvg(s);return a;})():null;
  let mood='flat';
  if(st){ mood=cls(st.mom); stats.push(['October avg',fmt(st.okt)+' kWh/day','']); stats.push(['vs September',pct(st.mom),cls(st.mom)]); stats.push(['vs August',pct(st.vsAgu),cls(st.vsAgu)]); if(s.y) stats.push(['vs Oct 2025',pct(st.yoy),cls(st.yoy)]); }
  if(isP){ const pre=mean(s.v.slice(0,iProg)),post=mean(s.v.slice(iProg)); const c=post/pre-1; mood=c<-TH?'down':c>TH?'up':'flat'; stats.push(['Before ZOEC',fmt(pre)+' kWh/day','']); stats.push(['After ZOEC',fmt(post)+' kWh/day','']); stats.push(['Change',pct(c),c<0?'down':'up']); }
  document.getElementById('mBody').innerHTML=`<div class="mhead">${mini(mood)}<div><h3 id="mTitle">${short(n)}${s.partial?' *':''}</h3><div class="sub">${s.r?s.r+' · ':''}${L} days of data${isP?' · ZOEC project site':''}</div></div></div>
   <div class="mstats">${stats.map(([l,v,c])=>`<div class="ms"><small>${l}</small><b class="${c}">${v}</b></div>`).join('')}</div>
   <div class="chartbox" style="height:280px"><canvas id="cSite" role="img" aria-label="Daily kWh for ${short(n)}"></canvas></div>
   <p class="note" style="margin-top:10px">Thin line = daily kWh. Thick line = 7-day average.${isP?' Dashed green line = ZOEC start (19 Aug).':''}${s.partial?' * Partial meter coverage.':''}</p>`;
  document.getElementById('modal').hidden=false; document.body.style.overflow='hidden'; if(typeof fuMount==='function') fuMount(n);
  const {opts,mu}=makeOpts(); const o=opts; o.plugins.legend={display:false};
  o.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:8,callback:function(v){return dm(days[v]);}};
  o.plugins.tooltip.callbacks.title=c=>dm(days[c[0].dataIndex]);
  const vs=s.v; o.scales.y.min=Math.floor(Math.min(...vs)*.9/100)*100;
  const pl={id:'pl',beforeDatasetsDraw(ch){if(!isP)return;const {ctx,chartArea:a,scales:{x}}=ch;const px=x.getPixelForValue(iProg);ctx.save();ctx.strokeStyle=css('--down');ctx.lineWidth=1.8;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(px,a.top);ctx.lineTo(px,a.bottom);ctx.stroke();ctx.restore();}};
  mk('cSite',{type:'line',data:{labels:days.slice(0,L),datasets:[{data:vs,borderColor:css('--flat'),borderWidth:1.5,pointRadius:0,tension:.15},{data:ma7(vs),borderColor:css('--blue'),borderWidth:3.5,pointRadius:0,tension:.3}]},options:o,plugins:[pl]});
  document.querySelector('.mclose').focus();
}
function closeSite(){ document.getElementById('modal').hidden=true; document.body.style.overflow=''; if(charts.cSite){charts.cSite.destroy();delete charts.cSite;} if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
const ZSET=['50-MAL BOTANIA 2','34-PACIFIC MALL TEGAL','69-SENAYAN PARK','7-SUN PLAZA','51-LIPPO PLAZA SUNSET','39-LIPPO ICON CIBUBUR'];


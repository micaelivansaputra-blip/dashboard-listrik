/* ---------- charts ---------- */
function mk(id,cfg){ cfg=I18N.chart(cfg); if(charts[id]) charts[id].destroy(); charts[id]=new Chart(document.getElementById(id),cfg); }
function makeOpts(){
  const ink=css('--ink'), mu=css('--muted'), ln=css('--grid');
  Chart.defaults.font.family="'DM Sans',system-ui,sans-serif"; Chart.defaults.color=mu;
  return {ink,mu,ln,opts:{responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{display:false},tooltip:{backgroundColor:css('--ink'),titleColor:css('--bg'),bodyColor:css('--bg'),cornerRadius:12,padding:12,usePointStyle:true,boxPadding:5,titleFont:{weight:'600'},callbacks:{label:c=>' '+fmt(c.parsed.y)+' kWh/day'}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{color:mu}},y:{grid:{color:ln},border:{display:false,dash:[3,5]},ticks:{color:mu,padding:8,maxTicksLimit:6,callback:v=>fmt(v)},title:{display:false}}}}};
}
function title(t){return {display:false,text:t,align:'start',color:css('--ink'),font:{family:"'DM Sans',system-ui,sans-serif",size:17,weight:'700'},padding:{bottom:14}};}
const A=(hex,a)=>hex+Math.round(a*255).toString(16).padStart(2,'0');
const lg=(ch,c1,c2)=>{const a=ch.chartArea; if(!a) return c1; const g=ch.ctx.createLinearGradient(0,a.top,0,a.bottom); g.addColorStop(0,c1); g.addColorStop(1,c2); return g;};
function pill(c,txt,x,y,bg,fg){c.save();c.font="700 11.5px 'DM Sans',sans-serif";const w=c.measureText(txt).width+14,h=20;c.fillStyle=bg;c.beginPath();(c.roundRect?c.roundRect(x-w/2,y-h/2,w,h,10):c.rect(x-w/2,y-h/2,w,h));c.fill();c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x,y+.5);c.restore();}
let SHOW={d:true,a:true,w:true,z:true};
function renderCharts(P){
  const {ink,mu}=makeOpts(); const fresh=()=>makeOpts().opts;
  const blue=css('--blue'), up=css('--up'), down=css('--down'), flat=css('--flat'), amber=css('--amber'), volt=css('--volt'), surf=css('--surface'), s2=css('--surface-2');
  /* monthly */
  const vals=[P.agu.raw,P.sep.raw,P.okt.raw,P.py.raw];
  const dl=[null,vals[1]/vals[0]-1,vals[2]/vals[1]-1,null];
  const cols=[blue,blue,vals[2]>vals[1]?up:down,flat];
  const o1=fresh(); o1.plugins.title=title('Average per Month'); o1.scales.y.min=Math.floor(Math.min(...vals)*0.9/1000)*1000; o1.layout={padding:{top:34}}; o1.scales.x.ticks={color:mu,maxRotation:0,autoSkip:false,font:{size:innerWidth<640?10.5:12}};
  o1.plugins.tooltip.callbacks.label=c=>' '+fmt(c.parsed.y)+' kWh/day'+(dl[c.dataIndex]!=null?'  ('+pct(dl[c.dataIndex])+' vs previous bar)':'');
  const note={id:'note',afterDraw(ch){const c=ch.ctx;c.save();c.fillStyle=mu;c.font="12px 'DM Sans',sans-serif";c.textAlign='right';c.fillText(tr('Axis starts at')+' '+fmt(ch.scales.y.min),ch.chartArea.right,ch.chartArea.top-24);c.restore();}};
  const lbl={id:'lbl',afterDatasetsDraw(ch){const c=ch.ctx;c.save();c.fillStyle=ink;c.font="700 14px 'DM Sans',sans-serif";c.textAlign='center';
    ch.getDatasetMeta(0).data.forEach((b,i)=>{c.fillText(fmt(vals[i]),b.x,b.y-9); if(dl[i]!=null){const k=cls(dl[i]);pill(c,(dl[i]>=0?'▲ ':'▼ ')+pct(dl[i]),b.x,b.y-31,css('--'+(k==='flat'?'flat':k)+'-soft'),css('--'+k+'-ink'));}});c.restore();}};
  mk('cMonthly',{type:'bar',data:{labels:[['August'],['September'],['Oct',`(${octLbl})`],['Oct 2025',`(${pyLbl})`]],datasets:[{data:vals,backgroundColor:c=>lg(c.chart,cols[c.dataIndex],A(cols[c.dataIndex],.45)),borderRadius:{topLeft:14,topRight:14},borderSkipped:'bottom',maxBarThickness:60}]},options:o1,plugins:[lbl]});

  /* weekly */
  const wk=[]; const first=days.findIndex(d=>dow(d)===1);
  for(let i=first;i<N;i+=7){const seg=P.T.slice(i,i+7); wk.push({d:days[i],v:mean(seg),full:seg.length===7});}
  const o2=fresh(); o2.plugins.title=title('Average per Week');
  o2.scales.y.min=Math.floor(Math.min(...wk.map(w=>w.v))*0.94/1000)*1000; o2.scales.y.max=Math.ceil(Math.max(...wk.map(w=>w.v))*1.05/1000)*1000;
  o2.plugins.tooltip.callbacks.title=c=>'Week of '+c[0].label.replace('*','');
  o2.interaction={mode:'index',intersect:false}; o2.layout={padding:{right:26}}; o2.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:innerWidth<640?5:10};
  const wv=wk.map(w=>w.v), iMax=wv.indexOf(Math.max(...wv)), iMin=wv.indexOf(Math.min(...wv)), lastI=wk.length-1;
  const wl={id:'wl',afterDatasetsDraw(ch){const c=ch.ctx;c.save();c.font="700 12px 'DM Sans',sans-serif";c.textAlign='center';
    [...new Set([iMax,iMin,lastI])].forEach(i=>{const p=ch.getDatasetMeta(0).data[i];const low=i===iMin&&i!==lastI;c.fillStyle=ink;c.fillText(fmt(wv[i]),p.x,low?p.y+22:p.y-14);});c.restore();}};
  mk('cWeekly',{type:'line',data:{labels:wk.map(w=>w.d.slice(8)+'/'+w.d.slice(5,7)+(w.full?'':'*')),datasets:[{data:wv,borderColor:blue,backgroundColor:c=>lg(c.chart,A(blue,.28),A(blue,0)),fill:true,borderWidth:3,pointRadius:wk.map((_,i)=>i===lastI?7:0),pointHoverRadius:8,pointBackgroundColor:wk.map((w,i)=>i===lastI?volt:surf),pointBorderColor:wk.map((w,i)=>i===lastI?ink:blue),pointBorderWidth:wk.map((_,i)=>i===lastI?3:2.5),tension:.35}]},options:o2,plugins:[wl]});

  /* daily */
  const m7=ma7(P.T);
  const o3=fresh(); o3.plugins.title=title('Daily Usage');
  o3.interaction={mode:'index',intersect:false};
  o3.plugins.tooltip.callbacks.title=c=>DN[dow(days[c[0].dataIndex])]+' '+dm(days[c[0].dataIndex]);
  o3.plugins.tooltip.callbacks.label=c=>' '+c.dataset.label+': '+fmt(c.parsed.y)+' kWh';
  o3.scales.x.ticks={color:mu,maxRotation:0,autoSkip:true,maxTicksLimit:innerWidth<640?5:12,callback:function(v){return dm(days[v]);}};
  o3.scales.y.min=Math.floor(Math.min(...P.T)*0.95/1000)*1000;
  const mxI=P.T.indexOf(Math.max(...P.T)), mnI=P.T.indexOf(Math.min(...P.T));
  const dpl={id:'dpl',beforeDatasetsDraw(ch){const {ctx,chartArea:a,scales:{x}}=ch;ctx.save();
    const step=x.getPixelForValue(1)-x.getPixelForValue(0), half=step/2;
    if(SHOW.w){ctx.fillStyle=A(s2,.9); days.forEach((d,i)=>{if(isWE(d)){const px=x.getPixelForValue(i);ctx.fillRect(px-half,a.top,step,a.bottom-a.top);}});}
    const x0=x.getPixelForValue(iOkt)-half; ctx.fillStyle=A(amber,.14); ctx.fillRect(x0,a.top,a.right-x0,a.bottom-a.top);
    ctx.fillStyle=css('--amber-ink'); ctx.font="700 12px 'DM Sans',sans-serif"; ctx.textAlign='left'; ctx.fillText(tr('October'),x0+8,a.top+16);
    if(SHOW.z){const px=x.getPixelForValue(iProg); ctx.strokeStyle=down; ctx.lineWidth=1.8; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(px,a.top); ctx.lineTo(px,a.bottom); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=css('--down-ink'); ctx.fillText(tr('ZOEC starts (19 Aug)'),px+8,a.top+16);}
    ctx.restore();},
   afterDatasetsDraw(ch){const {ctx,chartArea:a,scales:{x,y}}=ch;ctx.save();
    const act=ch.tooltip&&ch.tooltip.getActiveElements&&ch.tooltip.getActiveElements();
    if(act&&act.length){const px=act[0].element.x;ctx.strokeStyle=A(ink,.35);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,a.top);ctx.lineTo(px,a.bottom);ctx.stroke();}
    if(SHOW.d){[[mxI,-12,'Peak'],[mnI,20,'Low']].forEach(([i,dy,l])=>{const px=x.getPixelForValue(i),py=y.getPixelForValue(P.T[i]);ctx.fillStyle=surf;ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,4.5,0,7);ctx.fill();ctx.stroke();ctx.fillStyle=ink;ctx.font="700 11.5px 'DM Sans',sans-serif";ctx.textAlign=px>a.right-70?'right':px<a.left+70?'left':'center';ctx.fillText(tr(l)+' '+fmt(P.T[i]),px,py+dy);});}
    ctx.restore();}};
  mk('cDaily',{type:'line',data:{labels:days,datasets:[
    {label:'Daily',data:P.T,borderColor:A(flat,.95),borderWidth:1.6,pointRadius:0,pointHoverRadius:4,tension:.2,hidden:!SHOW.d},
    {label:'7-day average',data:m7,borderColor:blue,borderWidth:3.5,pointRadius:0,pointHoverRadius:5,tension:.35,fill:true,backgroundColor:c=>lg(c.chart,A(blue,.22),A(blue,0)),hidden:!SHOW.a}]},options:o3,plugins:[dpl]});

  /* weekday vs weekend */
  const per=[[['August'],P.agu],[['September'],P.sep],[['Oct',`(${octLbl})`],P.okt],[['Oct 2025',`(${pyLbl})`],P.py]];
  const o4=fresh(); o4.plugins.legend={display:true,labels:{color:mu,usePointStyle:true,pointStyle:'circle',boxWidth:8}}; o4.plugins.title=title('Average kWh per Day');
  o4.layout={padding:{top:14}};
  o4.scales.y.min=Math.floor(Math.min(...per.map(p=>Math.min(p[1].wd,p[1].we)))*0.9/1000)*1000;
  o4.scales.x.ticks={color:mu,callback:function(v){const p=per[v][1];return [...per[v][0],'Wkd '.slice(0,0)+'Weekend '+pct(p.we/p.wd-1)];},autoSkip:false,maxRotation:0,font:{size:innerWidth<640?10.5:12}};
  const dl4={id:'dl',afterDatasetsDraw(ch){const c=ch.ctx;c.save();c.fillStyle=ink;c.font="700 12px 'DM Sans',sans-serif";c.textAlign='center';
    ch.data.datasets.forEach((ds,k)=>ch.getDatasetMeta(k).data.forEach((b,i)=>c.fillText(fmt(ds.data[i]),b.x,b.y-7)));c.restore();}};
  mk('cWd',{type:'bar',data:{labels:per.map(p=>p[0]),datasets:[{label:'Weekday',data:per.map(p=>p[1].wd),backgroundColor:c=>lg(c.chart,blue,A(blue,.45)),borderRadius:{topLeft:10,topRight:10},borderSkipped:'bottom',categoryPercentage:.6,barPercentage:.9},{label:'Weekend',data:per.map(p=>p[1].we),backgroundColor:c=>lg(c.chart,amber,A(amber,.45)),borderRadius:{topLeft:10,topRight:10},borderSkipped:'bottom',categoryPercentage:.7,barPercentage:.92}]},options:o4,plugins:[dl4]});
  document.getElementById('monSub').textContent='kWh per day · axis starts at '+fmt(charts.cMonthly.scales.y.min);
}
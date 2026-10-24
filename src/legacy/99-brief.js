/* ---------- Site brief: everything needed to ask a site about its electricity, plus a ready-to-send polite message (Bahasa Indonesia) ----------
   Sources: invoice (INVOICE), kWh budget (BUDGET), P&L admissions and electricity (PNL, New DB Financial Sep 2026), daily meter data for the current month.
   Invoice month X is compared with the admissions of month X-1, the same pairing the finance Remarks sheet uses (an invoice bills the previous month's usage). */
const BR={n:null,mode:'kwh'};
const brIdr=x=>x==null?'—':'Rp '+(x/1e6).toFixed(1).replace('.',',')+' jt';
const brN=x=>x==null?'—':Math.round(x).toLocaleString('id-ID');
const brP=x=>x==null?'—':Math.abs(x)<.0005?'0,0%':(x>=0?'+':'−')+Math.abs(x*100).toFixed(1).replace('.',',')+'%';
const brSite=n=>{const k=qtNum(n); return {inv:INVOICE.sites.find(x=>qtNum(x.n)===k), pnl:PNL.sites.find(x=>String(x.n)===k), bud:BUDGET[+k], shows:PNL.shows[k]};};
function brBuild(n){
  const {inv,pnl,bud,shows}=brSite(n); if(!inv) return null;
  const ms=qtMonths(), ix=ms.map(m=>INVOICE.months.indexOf(m)), all6=[ix[0]-3,ix[0]-2,ix[0]-1].concat(ix).filter(i=>i>=0);
  const r=qtRows().find(x=>qtNum(x.n)===qtNum(n)), ML=ms.map(m=>MN[+m.slice(5)-1]);
  const adm=i=>pnl&&i>=1?pnl.adm[i-1]:null, perAdm=i=>adm(i)&&inv.kwh[i]?inv.kwh[i]/adm(i):null, bm=i=>bud?bud.m[i]:null;
  const cols=all6.map(i=>({i,m:MN[i],kwh:inv.kwh[i],lw:inv.lw[i],wb:inv.wb[i],cost:inv.cost[i],rate:inv.kwh[i]?inv.cost[i]/inv.kwh[i]:null,b:bm(i),vb:bm(i)&&inv.kwh[i]?inv.kwh[i]/bm(i)-1:null,
    act:i>=1?MN[i-1]:null,adm:adm(i),admB:pnl&&i>=1?pnl.admB[i-1]:null,pa:perAdm(i),el:pnl?pnl.el[i]:null,elB:pnl?pnl.elB[i]:null}));
  const q=ix.map(i=>cols.find(c=>c.i===i)), a0=q[0].adm, a2=q[2].adm, ak=a0&&a2?a2/a0-1:null, pa=q[0].pa&&q[2].pa?q[2].pa/q[0].pa-1:null;
  const cur=DATA.sites.find(s=>qtNum(s.n)===qtNum(n)); let mtd=null;
  if(cur){const co=days.map((d,i)=>d.startsWith(days[N-1].slice(0,7))?i:-1).filter(i=>i>=0), vs=co.map(i=>cur.v[i]).filter(x=>x!=null&&x>0);
    const bd=bud?bud.m[+days[N-1].slice(5,7)-1]/new Date(+days[N-1].slice(0,4),+days[N-1].slice(5,7),0).getDate():null;
    if(vs.length) mtd={avg:vs.reduce((a,b)=>a+b,0)/vs.length,days:vs.length,bd,vb:bd?vs.reduce((a,b)=>a+b,0)/vs.length/bd-1:null,mon:MONFULL[+days[N-1].slice(5,7)-1],last:days[N-1]};}
  return {n,name:short(n),reg:qtRegion(n),r,cols,q,ML,a0,a2,ak,pa,mtd,shows,bud};
}
function brFind(b){ /* plain-language reading of the data */
  const r=b.r, f=[], q=b.q;
  if(r.t!=null) f.push(`Usage ${b.ML[0]}→${b.ML[2]}: ${brN(q[0].kwh)} → ${brN(q[2].kwh)} kWh (${brP(r.t)}). Cost ${brIdr(q[0].cost)} → ${brIdr(q[2].cost)} (${brP(r.ct)}).`);
  if(r.rc!=null) f.push(Math.abs(r.rc)<=CT.lo?`Cost per kWh is steady (Rp ${brN(q[0].rate)} → Rp ${brN(q[2].rate)}), so the cost change follows usage, not the tariff.`:`Cost per kWh moved ${brP(r.rc)} (Rp ${brN(q[0].rate)} → Rp ${brN(q[2].rate)}), so part of the cost change is not usage. Worth asking about the bill.`);
  if(q[2].vb!=null) f.push(`${b.ML[2]} invoice is ${brP(q[2].vb)} vs the ${b.ML[2]} budget (${brN(q[2].b)} kWh).`+(q.some(c=>c.vb!=null&&c.vb<-CT.lo)&&q[2].vb>0?` ${q.filter(c=>c.vb!=null&&c.vb<-CT.lo).map(c=>c.m).join(' and ')} stayed under budget.`:''));
  if(b.ak!=null) f.push(`Admissions (activity months ${q[0].act}→${q[2].act}): ${brN(b.a0)} → ${brN(b.a2)} (${brP(b.ak)}). kWh per admission ${q[0].pa.toFixed(2).replace('.',',')} → ${q[2].pa.toFixed(2).replace('.',',')} (${brP(b.pa)}).`+(r.t>CT.lo&&Math.abs(b.pa)<=CT.lo?' The increase is in line with more visitors.':r.t>CT.lo&&b.pa>CT.lo?' Usage rose faster than visitors.':''));
  if(b.mtd) f.push(`${b.mtd.mon} so far (daily meters, ${b.mtd.days} days): ${brN(b.mtd.avg)} kWh/day`+(b.mtd.vb!=null?`, ${brP(b.mtd.vb)} vs budget per day.`:'.'));
  const lw=q.map(c=>c.lw), wb=q.map(c=>c.wb); if(wb[0]>0&&wb[2]>0&&lw[0]>0&&lw[2]>0){const dl=lw[2]/lw[0]-1, dw=wb[2]/wb[0]-1; f.push(`By meter: off-peak (LWBP) ${brP(dl)}, peak (WBP) ${brP(dw)}, ${b.ML[0]} to ${b.ML[2]}.`);}
  return f;
}
function brMsg(b){
  const r=b.r,q=b.q,up=r.t>CT.lo,dn=r.t<-CT.lo;
  const bln=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September'], B=q.map(c=>bln[c.i]);
  let t=`Selamat siang Bapak/Ibu [Nama], mohon izin bertanya terkait pemakaian listrik ${b.name} di Q3 2026.\n\n`;
  t+=`Dari data invoice listrik (kWh dan biaya termasuk PPN):\n`;
  q.forEach((c,i)=>t+=`• ${B[i]}: ${brN(c.kwh)} kWh, ${brIdr(c.cost)}\n`);
  t+=`Perubahan ${B[2]} dibanding ${B[0]}: ${brP(r.t)} kWh dan ${brP(r.ct)} biaya.`;
  if(q[2].vb!=null) t+=` Untuk ${B[2]}, pemakaian ${brP(q[2].vb)} terhadap budget (${brN(q[2].b)} kWh).`;
  t+=`\n`;
  if(b.ak!=null){ t+=`\nSebagai pembanding, admissions (bulan aktivitas ${bln[q[0].i-1]}–${bln[q[2].i-1]}) ${brN(b.a0)} → ${brN(b.a2)} (${brP(b.ak)}), sehingga kWh per admission ${b.pa==null?'':(Math.abs(b.pa)<=CT.lo?'relatif stabil':(b.pa>0?'naik '+brP(b.pa).slice(1):'turun '+brP(b.pa).slice(1)))}.\n`; }
  if(up||dn){
    t+=`\nUntuk membantu saya memahami ${up?'kenaikan':'penurunan'} ini, boleh dibantu informasi berikut?\n`;
    t+=`1. Apakah ada perubahan jam operasional, jumlah show, atau studio yang aktif pada ${B[0]}–${B[2]}?\n`;
    t+=`2. Apakah ada ${up?'penambahan peralatan, event/promosi khusus, atau pengaturan AC dan lampu yang berubah':'penghematan atau perubahan pengaturan AC dan lampu yang dilakukan'}?\n`;
    t+=`3. Apakah ada kendala atau pekerjaan maintenance yang berpengaruh pada pemakaian listrik?\n`;
    t+=`4. Apakah periode tagihan di invoice ${B[2]} sama panjangnya dengan bulan sebelumnya?\n`;
  } else t+=`\nPemakaian relatif stabil. Apakah ada kondisi khusus di ${B[0]}–${B[2]} yang perlu saya catat?\n`;
  t+=`\nTerima kasih banyak atas bantuannya, Bapak/Ibu. Mohon maaf kalau mengganggu waktunya.`;
  return t;
}
function brHTML(b){
  const r=b.r, C=b.cols, row=(l,f,c='')=>`<tr class="${c}"><th>${l}</th>${C.map(x=>`<td class="${x.i>=b.q[0].i?'':'pre'}">${f(x)}</td>`).join('')}</tr>`;
  const cell=p=>p==null?'—':`<span class="cell ${p>CT.hi?'up':p>CT.lo?'warn':p<-CT.lo?'down':'flat'}">${brP(p)}</span>`;
  return `<div class="mhead">${mini(r.t>CT.hi?'up':'flat')}<div><h3 id="mTitle">${b.name}</h3><div class="sub">${b.reg||''} · ${b.ML[0]}–${b.ML[2]} 2026 brief · actual invoices, P&amp;L and budget</div></div></div>
  <div id="brTop">${brTop(b)}</div>
  <div class="brbar"><button type="button" class="ghost" id="brPng">Download PNG</button><button type="button" class="ghost" id="brPdf">Download PDF</button><span class="cmsg" id="brOk" role="status"></span></div>
  <details class="brdet"><summary>Details, full data and message to ask</summary>
  <h4 class="brh">What the data says</h4><ul class="brl">${brFind(b).map(x=>`<li>${fuEsc(x)}</li>`).join('')}</ul>
  <h4 class="brh">Full data</h4><div class="tbl-wrap"><table class="ptable brt"><thead><tr><th>Invoice month</th>${C.map(x=>`<th>${x.m}</th>`).join('')}</tr></thead><tbody>
   ${row('kWh (invoice)',x=>brN(x.kwh),'strong')}${C.every(x=>x.wb>0&&x.lw>0)?row('· off-peak LWBP',x=>brN(x.lw))+row('· peak WBP',x=>brN(x.wb)):''}
   ${row('Budget kWh',x=>brN(x.b))}${row('kWh vs budget',x=>cell(x.vb))}
   ${row('Cost incl. PPN',x=>brIdr(x.cost),'strong')}${row('Cost per kWh',x=>x.rate?'Rp '+brN(x.rate):'—')}
   ${row('Activity month',x=>x.act||'—','mute')}${row('Admissions',x=>brN(x.adm))}${row('Admissions budget',x=>brN(x.admB))}${row('kWh per admission',x=>x.pa?x.pa.toFixed(2).replace('.',','):'—')}
   ${row('P&amp;L electricity (same calendar month)',x=>brIdr(x.el))}${row('P&amp;L electricity budget',x=>brIdr(x.elB))}
  </tbody></table></div>
  <p class="note" style="margin-top:8px">Invoice month X bills the usage of month X−1, so each invoice is paired with the admissions of the month before it (the same pairing as the finance Remarks sheet). The billing period on the invoice is not exact calendar months. P&amp;L electricity is booked by calendar month and can differ from the invoice. ${b.shows?`Shows: ${brN(b.shows[0])} in July and ${brN(b.shows[1])} in August.`:''}</p>
  <h4 class="brh">Message to ask (Bahasa Indonesia)</h4>
  <textarea id="brMsg" class="brmsg" rows="14" aria-label="Message">${fuEsc(brMsg(b))}</textarea>
  <div class="brbar"><button type="button" class="ghost" id="brCopyMsg">Copy message</button><button type="button" class="ghost" id="brCopyData">Copy data table</button><button type="button" class="ghost" id="brDaily">Open daily chart</button></div></details>`;
}
function brVal(b,c){ return BR.mode==='cost'?{a:c.el,t:c.elB}:{a:c.kwh,t:c.b}; }
function brFmt(v){ return v==null?'—':BR.mode==='cost'?brIdr(v):brN(v); }
function brTop(b){
  const kc=BR.mode==='cost', MF=['January','February','March','April','May','June','July','August','September'];
  const cards=b.q.map((c,k)=>{const v=brVal(b,c), d=v.t&&v.a?v.a/v.t-1:null, cl=d==null?'flat':d>CT.hi?'up':d>CT.lo?'warn':d<-CT.lo?'down':'flat';
    return `<div class="brc"><div class="brct"><small>${MF[c.i]} 2026</small><b>${brFmt(v.a)}${kc?'':' kWh'}</b><span class="brd ${cl}">${d==null?'No budget':brP(d)+' vs budget'}</span></div><div class="chartbox" style="height:210px"><canvas id="cBr${k}" role="img" aria-label="${MF[c.i]}: budget vs actual"></canvas></div></div>`;}).join('');
  const tk=b.q.map(c=>{const v=brVal(b,c); return v.t&&v.a?`${c.m} ${brP(v.a/v.t-1)}`:null;}).filter(Boolean).join(', ');
  return `<div class="brseg"><div class="seg" id="brMode" role="group" aria-label="Measure"><button type="button" data-bm="kwh" aria-pressed="${!kc}">kWh (invoice)</button><button type="button" data-bm="cost" aria-pressed="${kc}">Cost (P&amp;L, Rp)</button></div></div>
  <div class="brcharts">${cards}</div>
  <p class="brtake">${tk?fuEsc('Actual vs budget: '+tk+'.'):'No budget is set for this site.'}${kc?' Cost compares the P&amp;L electricity line with its budget, both by calendar month.':' Actual is the invoice kWh, budget is the monthly kWh budget.'}</p>`;
}
function brCharts(b){
  const ink=css('--ink'), mu=css('--muted'), blue=css('--blue')||'#0a84ff', ln=css('--flat')||'#8e8e93';
  const lab={id:'brlab',afterDatasetsDraw(ch){const c=ch.ctx; c.save(); c.font='700 12.5px -apple-system,BlinkMacSystemFont,Inter,sans-serif'; c.fillStyle=ink; c.textAlign='center'; ch.getDatasetMeta(0).data.forEach((bar,i)=>{const t=ch.data.datasets[0].lab[i]; if(t) c.fillText(t,bar.x,bar.y-8);}); c.restore();}};
  const mx=Math.max(...b.q.map(c=>{const v=brVal(b,c); return Math.max(v.a||0,v.t||0);}));
  b.q.forEach((c,k)=>{const v=brVal(b,c), d=v.t&&v.a?v.a/v.t-1:null, over=d==null?blue:d>CT.hi?css('--up'):d>CT.lo?css('--warn')||'#ff9f0a':d<-CT.lo?css('--down'):blue;
    const o=makeOpts().opts; o.layout={padding:{top:24}}; o.scales.y={display:false,beginAtZero:true,min:0,max:mx*1.15}; o.scales.x={grid:{display:false},border:{display:false},ticks:{color:mu,font:{size:13,weight:'600'}}};
    o.plugins.legend={display:false}; o.plugins.tooltip.callbacks={label:x=>' '+x.label+': '+brFmt(x.parsed.y)+(BR.mode==='cost'?'':' kWh')};
    mk('cBr'+k,{type:'bar',plugins:[lab],data:{labels:['Budget','Actual'],datasets:[{data:[v.t||null,v.a],lab:[v.t?(BR.mode==='cost'?brIdr(v.t).replace('Rp ',''):brN(v.t)):'',BR.mode==='cost'?brIdr(v.a).replace('Rp ',''):brN(v.a)],backgroundColor:[A(ln.length===7?ln:'#8e8e93',.45),over],borderRadius:10,maxBarThickness:70}]},options:o});});
}
function openBrief(n){
  const b=brBuild(n); if(!b) return; BR.n=n; BR.b=b; lastFocus=document.activeElement;
  document.getElementById('mBody').innerHTML=brHTML(b); document.getElementById('modal').hidden=false; document.body.style.overflow='hidden';
  brCharts(b);
  const body=document.getElementById('mBody'), n0=body.children.length, det=body.querySelector('.brdet'); fuMount(qtName(n)); [...body.children].slice(n0).forEach(el=>det.before(el));
  document.querySelector('.mclose').focus();
}
document.addEventListener('keydown',e=>{ if(e.key==='Enter'){const r=e.target.closest&&e.target.closest('tr[data-brief],.mvrow[data-brief]'); if(r){e.preventDefault(); openBrief(r.dataset.brief);}} });
document.addEventListener('click',e=>{
  const bm=e.target.closest('#brMode [data-bm]'); if(bm&&BR.b){BR.mode=bm.dataset.bm; document.getElementById('brTop').innerHTML=brTop(BR.b); brCharts(BR.b); return;}
  if(e.target.closest('#brDaily')&&BR.n){const n=(DATA.sites.concat(DATA.track||[])).find(x=>qtNum(x.n)===qtNum(BR.n)); if(n) openSite(n.n); return;}
  const bt=e.target.closest('[data-brief]'); if(bt){e.stopPropagation(); e.preventDefault(); openBrief(bt.dataset.brief); return;}
  if(e.target.closest('#brCopyMsg')) copyText(document.getElementById('brMsg').value,document.getElementById('brOk'));
  if(e.target.closest('#brCopyData')&&BR.b){const b=BR.b,C=b.cols; copyText(['Metric\t'+C.map(x=>x.m).join('\t'),'kWh\t'+C.map(x=>Math.round(x.kwh)).join('\t'),'LWBP kWh\t'+C.map(x=>Math.round(x.lw)).join('\t'),'WBP kWh\t'+C.map(x=>Math.round(x.wb)).join('\t'),'Budget kWh\t'+C.map(x=>x.b?Math.round(x.b):'').join('\t'),'Cost incl PPN\t'+C.map(x=>Math.round(x.cost)).join('\t'),'Rp per kWh\t'+C.map(x=>x.rate?Math.round(x.rate):'').join('\t'),'Activity month\t'+C.map(x=>x.act||'').join('\t'),'Admissions\t'+C.map(x=>x.adm??'').join('\t'),'kWh per admission\t'+C.map(x=>x.pa?x.pa.toFixed(2):'').join('\t'),'PnL electricity\t'+C.map(x=>x.el?Math.round(x.el):'').join('\t')].join('\n'),document.getElementById('brOk'));}
},true);
/* ---------- Download the brief as PNG or PDF (kWh and cost, budget vs actual, plus the reasons noted for the site) ---------- */
const BRX={W:1240,H:1754};
function brRR(c,x,y,w,h,r){c.beginPath(); if(c.roundRect) c.roundRect(x,y,w,h,r); else c.rect(x,y,w,h);}
function brWrap(c,t,x,y,w,lh,max){const out=[]; String(t).split('\n').forEach(p=>{let l=''; p.split(' ').forEach(wd=>{const tt=l?l+' '+wd:wd; if(c.measureText(tt).width>w&&l){out.push(l); l=wd;} else l=tt;}); out.push(l);}); out.slice(0,max).forEach((l,i)=>c.fillText(l+(i===max-1&&out.length>max?'…':''),x,y+i*lh)); return Math.min(out.length,max)*lh;}
function brStatus(a,t){ if(!t||!a) return {c:'#0a84ff',l:'No budget'}; const d=a/t-1; return {d,l:brP(d)+' vs budget',c:d>CT.hi?'#ff3b30':d>CT.lo?'#ff9f0a':d<-CT.lo?'#34c759':'#0a84ff'}; }
function brReport(b){
  const cv=document.createElement('canvas'); cv.width=BRX.W; cv.height=BRX.H; const c=cv.getContext('2d'), F='-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Arial,sans-serif', P=70, W=BRX.W-P*2;
  c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height); c.textBaseline='alphabetic';
  c.fillStyle='#111'; c.font='800 52px '+F; c.fillText(b.name,P,120);
  c.fillStyle='#6b7280'; c.font='500 26px '+F; c.fillText(`${b.reg||''} · Electricity ${b.ML[0]}–${b.ML[2]} 2026 · budget vs actual`,P,162);
  const q=b.q, r=b.r; let y=210;
  const kp=[['kWh '+b.ML[2],brN(q[2].kwh)],[b.ML[2]+' vs '+b.ML[0],brP(r.t)],['Cost '+b.ML[2]+' (invoice)',brIdr(q[2].cost)],['Cost per kWh','Rp '+brN(q[2].rate)]];
  kp.forEach((k,i)=>{const w=(W-3*18)/4, x=P+i*(w+18); c.fillStyle='#f2f2f7'; brRR(c,x,y,w,120,22); c.fill(); c.fillStyle='#6b7280'; c.font='600 22px '+F; c.fillText(k[0],x+22,y+40); c.fillStyle='#111'; c.font='800 36px '+F; c.fillText(k[1],x+22,y+88);});
  y+=170;
  const sect=(title,sub,get,fmtv,y0)=>{
    c.fillStyle='#111'; c.font='800 34px '+F; c.fillText(title,P,y0); c.fillStyle='#6b7280'; c.font='500 22px '+F; c.fillText(sub,P,y0+34);
    const top=y0+70, H=400, base=top+H, gw=(W-2*24)/3, mx=Math.max(...q.map(x=>Math.max(get(x).a||0,get(x).t||0)))*1.12||1, MF=['January','February','March','April','May','June','July','August','September'];
    q.forEach((m,i)=>{const v=get(m), x0=P+i*(gw+24), st=brStatus(v.a,v.t);
      c.fillStyle='#f2f2f7'; brRR(c,x0,top,gw,H+90,26); c.fill();
      c.fillStyle='#111'; c.font='700 26px '+F; c.fillText(MF[m.i],x0+24,top+44);
      c.font='700 22px '+F; const tw=c.measureText(st.l).width+26; c.fillStyle=st.c+'33'; brRR(c,x0+24,top+62,tw,36,18); c.fill(); c.fillStyle=st.c===('#ff9f0a')?'#b26a00':st.c; c.fillText(st.l,x0+37,top+87);
      const bw=gw*.28, ch=H-190, bx=[x0+gw*.2,x0+gw*.54];
      [[v.t,'#c7c7cc','Budget'],[v.a,st.c,'Actual']].forEach(([val,col,lb],k)=>{
        if(val){const h=Math.max(6,val/mx*ch); c.fillStyle=col; brRR(c,bx[k],top+H+10-h-30,bw,h,14); c.fill(); c.fillStyle='#111'; c.font='700 22px '+F; c.textAlign='center'; c.fillText(fmtv(val),bx[k]+bw/2,top+H+10-h-42); c.textAlign='left';}
        c.fillStyle='#6b7280'; c.font='600 22px '+F; c.textAlign='center'; c.fillText(lb,bx[k]+bw/2,top+H+50); c.textAlign='left';});});
    return base+130;};
  y+=0; y=sect('kWh usage: budget vs actual','Invoice kWh against the monthly kWh budget',m=>({a:m.kwh,t:m.b}),v=>brN(v),y);
  y+=0; y=sect('Cost: budget vs actual','P&L electricity line against its budget, by calendar month (Rp million)',m=>({a:m.el,t:m.elB}),v=>(v/1e6).toFixed(1).replace('.',','),y);
  y+=0; c.fillStyle='#111'; c.font='800 34px '+F; c.fillText('Reason noted for this site',P,y); y+=26;
  const key=qtName(BR.n), notes=fuNotes(FU[fuId(key)]).slice(0,3); c.font='500 24px '+F;
  if(!notes.length){c.fillStyle='#8e8e93'; c.fillText('No reason noted yet.',P,y+34); y+=60;}
  else notes.forEach(nt=>{const tg=nt.tag?(FUTAG[nt.tag]||''):''; const hd=[fuEff(nt),tg,nt.by].filter(Boolean).join(' · '); c.fillStyle='#6b7280'; c.font='700 21px '+F; c.fillText(hd,P,y+32); c.fillStyle='#111'; c.font='500 24px '+F; const h=brWrap(c,[nt.reason,nt.cm?'('+nt.cm+')':''].filter(Boolean).join(' '),P,y+66,W,32,3); y+=66+h+14;});
  c.fillStyle='#8e8e93'; c.font='500 19px '+F; brWrap(c,'Source: actual electricity invoices, New DB Financial Sep 2026 (P&L) and the kWh budget. Invoice month X bills the usage of month X−1. Generated '+new Date().toISOString().slice(0,10)+'.',P,BRX.H-70,W,26,2);
  return cv;
}
function brPdf(jpg,w,h){ /* one A4 page holding the JPEG */
  const enc=s=>new TextEncoder().encode(s), parts=[], offs=[]; let len=0; const add=d=>{const u=typeof d==='string'?enc(d):d; parts.push(u); len+=u.length;};
  const obj=(n,body)=>{offs[n]=len; add(n+' 0 obj\n'); add(body); add('\nendobj\n');};
  add('%PDF-1.4\n'); obj(1,'<< /Type /Catalog /Pages 2 0 R >>'); obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offs[4]=len; add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+w+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n'); add(jpg); add('\nendstream\nendobj\n');
  const cs='q 595 0 0 842 0 0 cm /Im0 Do Q'; obj(5,'<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream');
  const xr=len; let x='xref\n0 6\n0000000000 65535 f \n'; for(let i=1;i<=5;i++) x+=String(offs[i]).padStart(10,'0')+' 00000 n \n'; add(x+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF');
  return new Blob(parts,{type:'application/pdf'});
}
async function brSave(blob,name,msg){
  const say=(t,c)=>{const m=document.getElementById('brOk'); if(m){m.textContent=t; m.className='fumsg '+(c||'');}};
  try{ let dl=null; try{ if(window.claude&&claude.use) dl=await claude.use('downloads'); }catch(e){}
    if(dl){ await dl.save({filename:name,data:blob}); say('Saved '+name,'ok'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); say('Downloaded '+name,'ok');
  }catch(e){ say(e&&e.code==='declined'?'Download cancelled.':'Could not download here.','err'); }
}
document.addEventListener('click',async e=>{
  const bt=e.target.closest('#brPng,#brPdf'); if(!bt||!BR.b) return; e.stopPropagation();
  const cv=brReport(BR.b), nm=short(BR.n).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-q3-2026';
  if(bt.id==='brPng'){ cv.toBlob(b=>b&&brSave(b,nm+'.png'),'image/png'); return; }
  cv.toBlob(async b=>{ if(!b) return; const u=new Uint8Array(await b.arrayBuffer()); brSave(brPdf(u,cv.width,cv.height),nm+'.pdf'); },'image/jpeg',.92);
},true);

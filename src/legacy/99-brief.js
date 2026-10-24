/* ---------- Site brief: everything needed to ask a site about its electricity, plus a ready-to-send polite message (Bahasa Indonesia) ----------
   Sources: invoice (INVOICE), kWh budget (BUDGET), P&L admissions and electricity (PNL, New DB Financial Sep 2026), daily meter data for the current month.
   Invoice month X is compared with the admissions of month X-1, the same pairing the finance Remarks sheet uses (an invoice bills the previous month's usage). */
const BR={n:null};
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
  <div class="brcharts">
   ${[['kWh usage','cBrK',r.t,brN(b.q[2].kwh)+' kWh'],['Cost (Rp, incl. PPN)','cBrC',r.ct,brIdr(b.q[2].cost)],['Cost per kWh','cBrR',r.rc,'Rp '+brN(b.q[2].rate)]].map(([t,id,d,v])=>`<div class="brc"><div class="brct"><small>${t}</small><b>${v}</b><span class="brd ${d>CT.lo?'up':d<-CT.lo?'down':'flat'}">${brP(d)} ${b.ML[2]} vs ${b.ML[0]}</span></div><div class="chartbox" style="height:220px"><canvas id="${id}" role="img" aria-label="${t}, ${b.ML.join(', ')}"></canvas></div></div>`).join('')}
  </div>
  <p class="brtake">${fuEsc(brFind(b)[1]||'')} ${b.q[2].vb!=null?fuEsc('Sep invoice is '+brP(b.q[2].vb)+' vs budget.'):''}</p>
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
  <div class="brbar"><button type="button" class="ghost" id="brCopyMsg">Copy message</button><button type="button" class="ghost" id="brCopyData">Copy data table</button><button type="button" class="ghost" id="brDaily">Open daily chart</button><span class="cmsg" id="brOk" role="status"></span></div></details>`;
}
function brCharts(b){
  const q=b.q, L=q.map(c=>c.m), blue=css('--blue')||'#0a84ff', ink=css('--ink'), mu=css('--muted');
  const lab={id:'brlab',afterDatasetsDraw(ch){const m=ch.getDatasetMeta(0), c=ch.ctx; c.save(); c.font='700 13px -apple-system,BlinkMacSystemFont,Inter,sans-serif'; c.fillStyle=ink; c.textAlign='center'; m.data.forEach((bar,i)=>c.fillText(ch.data.datasets[0].lab[i],bar.x,bar.y-8)); c.restore();}};
  const one=(id,vals,labs,tt)=>{
    const o=makeOpts().opts; o.layout={padding:{top:26}}; o.scales.y={display:false,beginAtZero:true,suggestedMax:Math.max(...vals)*1.12}; o.scales.x={grid:{display:false},border:{display:false},ticks:{color:mu,font:{size:13,weight:'600'}}};
    o.plugins.legend={display:false}; o.plugins.tooltip.callbacks={label:c=>' '+tt(c.parsed.y)};
    mk(id,{type:'bar',plugins:[lab],data:{labels:L,datasets:[{data:vals,lab:labs,backgroundColor:vals.map((_,i)=>A(blue.length===7?blue:'#0a84ff',.35+i*.325)),borderRadius:10,maxBarThickness:64}]},options:o});};
  one('cBrK',q.map(c=>c.kwh),q.map(c=>brN(c.kwh)),v=>brN(v)+' kWh');
  one('cBrC',q.map(c=>c.cost),q.map(c=>brIdr(c.cost).replace('Rp ','')),v=>brIdr(v));
  one('cBrR',q.map(c=>c.rate),q.map(c=>brN(c.rate)),v=>'Rp '+brN(v)+' per kWh');
}
function openBrief(n){
  const b=brBuild(n); if(!b) return; BR.n=n; BR.b=b; lastFocus=document.activeElement;
  document.getElementById('mBody').innerHTML=brHTML(b); document.getElementById('modal').hidden=false; document.body.style.overflow='hidden';
  brCharts(b);
  document.querySelector('.mclose').focus();
}
document.addEventListener('keydown',e=>{ if(e.key==='Enter'){const r=e.target.closest&&e.target.closest('tr[data-brief],.mvrow[data-brief]'); if(r){e.preventDefault(); openBrief(r.dataset.brief);}} });
document.addEventListener('click',e=>{
  if(e.target.closest('#brDaily')&&BR.n){const n=(DATA.sites.concat(DATA.track||[])).find(x=>qtNum(x.n)===qtNum(BR.n)); if(n) openSite(n.n); return;}
  const bt=e.target.closest('[data-brief]'); if(bt){e.stopPropagation(); e.preventDefault(); openBrief(bt.dataset.brief); return;}
  if(e.target.closest('#brCopyMsg')) copyText(document.getElementById('brMsg').value,document.getElementById('brOk'));
  if(e.target.closest('#brCopyData')&&BR.b){const b=BR.b,C=b.cols; copyText(['Metric\t'+C.map(x=>x.m).join('\t'),'kWh\t'+C.map(x=>Math.round(x.kwh)).join('\t'),'LWBP kWh\t'+C.map(x=>Math.round(x.lw)).join('\t'),'WBP kWh\t'+C.map(x=>Math.round(x.wb)).join('\t'),'Budget kWh\t'+C.map(x=>x.b?Math.round(x.b):'').join('\t'),'Cost incl PPN\t'+C.map(x=>Math.round(x.cost)).join('\t'),'Rp per kWh\t'+C.map(x=>x.rate?Math.round(x.rate):'').join('\t'),'Activity month\t'+C.map(x=>x.act||'').join('\t'),'Admissions\t'+C.map(x=>x.adm??'').join('\t'),'kWh per admission\t'+C.map(x=>x.pa?x.pa.toFixed(2):'').join('\t'),'PnL electricity\t'+C.map(x=>x.el?Math.round(x.el):'').join('\t')].join('\n'),document.getElementById('brOk'));}
},true);

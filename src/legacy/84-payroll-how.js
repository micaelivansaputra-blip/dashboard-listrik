/* ---------- How it's calculated ---------- */
function renderPayHow(){
  const P=PAY.d&&PAY.d.prod[PAY.sc], box=document.getElementById('howBody'); if(!P||!P.meta){ box.innerHTML=''; return; }
  const M=P.meta, W=P.weeks, sh=sheetName(), bk=basisKey(P), la=lastActual(P), L=M.L||{}, tg=P.target;
  const ex=P.sites.filter(s=>la>=0&&s.admits[la]>0).sort((a,b)=>b.admits[la]-a.admits[la])[0];
  const fw=W.findIndex(w=>!w.actual);
  const diff=P.sites.filter(s=>(s.hc.a1||0)!==(s.hc.s2||0));
  const hcA=P.sites.reduce((t,s)=>t+(s.hc.a1||0),0), hcS=P.sites.reduce((t,s)=>t+(s.hc.s2||0),0);
  const m=costMonth(P), comp=M.compNames&&M.compNames.includes('OPR');
  const frow=k=>{const c=M.compF&&M.compF[k]&&M.compF[k][m]; return `<tr><td><b>${esc(k)}</b><small>${esc((CMEAN[k]||(()=>''))(M.compFac&&M.compFac[k]))}</small></td><td class="fcell" data-notr>${esc(c&&c.col?c.col+M.r0:'')}<br>${esc(c&&c.f?c.f:'(typed number)')}</td></tr>`;};
  box.innerHTML=`
  <div class="grid2">
   <div class="card"><div class="ch"><div><h3>1 · Admits per man-hour</h3><span class="sub">Where the number in the site tables comes from</span></div></div>
    <ol class="hw">
     <li><b>Admits</b> are typed into the weekly Admits block of <code>${esc(sh)}</code> (columns ${esc(L.admits?L.admits[0]+'–'+L.admits[L.admits.length-1]:'')}), one column per week.</li>
     <li><b>Staff hours</b> = staff × 40 × days in the week ÷ 7. "Staff" is column <code>${esc(M.hcL?M.hcL[bk]:'')}</code>, ${esc(HCN[bk]||'headcount')}. A full-time person counts as 40 hours a week.</li>
     <li><b>MHDW</b> (man-hours of daily workers) is typed from actuals in columns ${esc(L.mhdw?L.mhdw[0]+'–'+L.mhdw[L.mhdw.length-1]:'')}. It is the extra hours on top of the permanent staff.</li>
     <li><b>Admits per man-hour</b> = admits ÷ (staff hours + MHDW). The workbook puts it in columns ${esc(L.prod?L.prod[0]+'–'+L.prod[L.prod.length-1]:'')}.</li>
     <li><b>Target</b> is column <code>BA</code> (${tg!=null?nf(tg):'n/a'} in Productivity ${PAY.sc}). The scenario name is this target.</li>
    </ol></div>
   <div class="card"><div class="ch"><div><h3>2 · Forecast weeks</h3><span class="sub">Weeks that still hold formulas instead of typed numbers</span></div></div>
    ${fw>=0?`<p class="hint">First forecast week: ${esc(W[fw].label)}. Its admits and MHDW cells contain these formulas (shown for the first site, row ${M.r0}):</p>${M.fAdmits&&M.fAdmits[fw]?`<p class="cnote"><b>Admits</b></p>${fx(M.fAdmits[fw])}<p class="hint" style="margin:6px 0 12px">The site's share of earlier weeks inside SUM(…) × the network forecast total for that week.</p>`:''}${M.fMhdw&&M.fMhdw[fw]?`<p class="cnote"><b>MHDW</b></p>${fx(M.fMhdw[fw])}<p class="hint" style="margin:6px 0 0">The man-hours needed to reach 90% of target, minus the staff hours already paid for, never below 0. So forecast MHDW rises when forecast admits rise or the target is higher.</p>`:''}`:'<p class="hint">Every week in this file holds typed numbers.</p>'}
    <p class="hint" style="margin-top:12px">A week is treated as actual when at least 80% of its site cells hold typed numbers in both Admits and MHDW.</p></div>
  </div>
  ${ex?`<div class="card" style="margin-top:14px"><div class="ch"><div><h3>Worked example</h3><span class="sub">${esc(short(ex.n))}, the site with the most admits in the last actual week (${esc(W[la].label)})</span></div></div>${calcPanel(P,ex,[la],'Step by step')}</div>`:''}
  ${comp?`<div class="grid2" style="margin-top:14px">
   <div class="card"><div class="ch"><div><h3>3 · Payroll build-up (OPR)</h3><span class="sub">${MON3_[m]} column, shown for row ${M.r0}. Formulas are copied from your file.</span></div></div>
    <div class="tbl-wrap"><table class="ctab ctab2"><thead><tr><th>Line</th><th>Cell and formula</th></tr></thead><tbody>${M.compNames.filter(k=>k!=='MH DW'&&k!=='OPR').map(frow).join('')}${frow('OPR')}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0">The meanings are my reading of the abbreviations; the formulas are exact. Check the abbreviations with whoever built the sheet.</p></div>
   <div class="card"><div class="ch"><div><h3>4 · SUMMARY sheet</h3><span class="sub">How the monthly summary picks these up</span></div></div>
    <ol class="hw">
     <li><b>Admits (Actual + Forecast)</b> = the sum of the weekly network admits for the month in the PROD sheet.</li>
     <li><b>Revenue (Actual + Forecast)</b> = budget revenue × (1 + admits variance against budget).</li>
     <li><b>Opr payroll</b> = the OPR total row of the PROD sheet for that month (the sum of the sites above).</li>
     <li><b>Admin payroll</b> is typed into SUMMARY by hand.</li>
     <li><b>Total payroll</b> = Opr + Admin, and <b>% payroll</b> = total payroll ÷ revenue.</li>
    </ol><p class="hint" style="margin:10px 0 0">As read from the current structure of the file; if the sheet is rebuilt, check these links again.</p></div>
  </div>`:''}
  <div class="card" style="margin-top:14px"><div class="ch"><div><h3>Worth checking with your team</h3><span class="sub">Things I noticed while tracing the formulas</span></div></div>
   <ul class="chk">
    <li><b>Two headcounts.</b> Productivity counts ${esc(HCN[bk]||'')} (${nf(hcA)} staff in total), while payroll cost and forecast MHDW use HC SEP · FT 2nd (${nf(hcS)}). ${diff.length?`${diff.length} site${diff.length>1?'s':''} differ: ${esc(diff.map(s=>short(s.n)+' ('+nf(s.hc.a1)+' → '+nf(s.hc.s2)+')').join(', '))}.`:'No site differs in this file.'} If the intent is to measure with the current team, productivity should use the same column as cost.</li>
    <li><b>CL staff are not in productivity.</b> Only the "FT 1st" column is counted in staff hours, while the other staff columns (FT 2nd, CL) are left out of the productivity formula.</li>
    <li><b>One target for every site.</b> ${new Set(P.sites.map(s=>s.target).filter(x=>x!=null)).size<=1?`Column BA holds ${tg!=null?nf(tg):'one value'} for all sites, so a small cinema and a big one are held to the same bar.`:'Column BA holds different targets by site.'}</li>
    <li><b>Partial weeks.</b> A week that is still running counts as actual only once its cells are typed in, so the per-day numbers for a half-filled week can look low.</li>
   </ul></div>`;
}

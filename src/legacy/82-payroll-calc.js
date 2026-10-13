/* ---------- how each payroll number is calculated ---------- */
const nf=(v,d=0)=>(v==null||!isFinite(v))?'n/a':v.toLocaleString(EN,{minimumFractionDigits:d,maximumFractionDigits:d});
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function rowF(f,r0,r){ return f==null?null:f.replace(new RegExp('([A-Z]+)'+r0+'(?![0-9])','g'),'$1'+r); }
const HCN={a1:'HC AUG · FT 1st',a2:'HC AUG · FT 2nd',acl:'HC AUG · CL',s1:'HC SEP · FT 1st',s2:'HC SEP · FT 2nd',scl:'HC SEP · CL'};
function basisKey(P){ const M=P.meta||{}, f=(M.fProd||[]).find(Boolean)||'', m=/\$([A-Z]+)\d+\*/.exec(f); if(m&&M.hcL){for(const k in M.hcL) if(M.hcL[k]===m[1]) return k;} return 'a1'; }
const sheetName=()=>'PROD '+PAY.sc;
const fx=t=>`<div class="fx" data-notr tabindex="0">${esc(t)}</div>`;

/* step-by-step table for one site and one or more weeks */
function calcPanel(P,s,ix,title){
  if(!P.meta||!s.hc) return '<div class="calc"><p class="cnote">This payroll data was saved before the calculation detail existed. Choose the payroll file again to see the steps.</p></div>';
  const M=P.meta||{}, W=P.weeks, sh=sheetName(), bk=basisKey(P), hn=(s.hc&&s.hc[bk]!=null)?s.hc[bk]:0, s2=s.hc?s.hc.s2:null, tg=s.target||P.target, L=M.L||{};
  const cols=ix.map(j=>{const d=W[j].days,ft=hn*40*d/7,mh=s.mhdw[j],a=s.admits[j];return {j,d,a,ft,mh,tot:ft+mh,p:(ft+mh)>0?a/(ft+mh):null,pw:s.prod?s.prod[j]:null,fa:s.fa&&s.fa[j],fm:s.fm&&s.fm[j],alt:s2!=null?s2*40*d/7+mh:null};});
  const sum=k=>cols.reduce((t,c)=>t+(c[k]||0),0), multi=cols.length>1;
  const T={d:sum('d'),a:sum('a'),ft:sum('ft'),mh:sum('mh'),tot:sum('tot'),alt:s2!=null?sum('alt'):null}; T.p=T.tot>0?T.a/T.tot:null;
  const E=multi?T:cols[0], first=cols[0].j, lastj=cols[cols.length-1].j;
  const rng=a=>a?(multi?a[first]+'–'+a[lastj]:a[first]):'';
  const hd=cols.map(c=>`<th>${esc(W[c.j].short)}${W[c.j].actual?'':' <em>fcst</em>'}</th>`).join('')+(multi?'<th>Total</th>':'');
  const R=(n,lab,hint,vals,tv,cls)=>`<tr class="${cls||''}"><td><b>${n}</b>&nbsp; ${lab}<small>${hint}</small></td>${vals.map(v=>`<td>${v}</td>`).join('')}${multi?`<td>${tv==null?'':tv}</td>`:''}</tr>`;
  const tr=[
    R(1,'Admits',`${sh} · row ${s.r} · column ${rng(L.admits)}. Typed in for actual weeks.`,cols.map(c=>nf(c.a)),nf(T.a)),
    R(2,'Days in the week',`Row 3 above the MHDW columns (${rng(L.mhdw)}).`,cols.map(c=>c.d),T.d),
    R(3,'Staff counted',`${HCN[bk]||'headcount'} · column ${(M.hcL&&M.hcL[bk])||'?'}, row ${s.r}. Same for every week.`,cols.map(()=>nf(hn)),nf(hn)),
    R(4,'Staff hours',`= staff × 40 hours × days ÷ 7`,cols.map(c=>nf(c.ft,1)),nf(T.ft,1)),
    R(5,'MHDW hours',`${sh} · column ${rng(L.mhdw)}. Man-hours of daily workers: ${cols.some(c=>c.fm)?'typed for actual weeks, a formula for forecast weeks':'typed in'}.`,cols.map(c=>nf(c.mh,1)),nf(T.mh,1)),
    R(6,'Total man-hours','= 4 + 5',cols.map(c=>nf(c.tot,1)),nf(T.tot,1),'sub'),
    R(7,'Admits per man-hour','= 1 ÷ 6',cols.map(c=>nf(c.p,2)),nf(T.p,2),'key'),
    R('✓','Value in the workbook',`${sh} · column ${rng(L.prod)}, row ${s.r}. Should equal step 7.`,cols.map(c=>nf(c.pw,2)),multi?'':'')
  ];
  if(tg) tr.push(R(8,'Target',`${sh} · column BA, row ${s.r}`,cols.map(()=>nf(tg)),nf(tg)),R(9,'Against target','= 7 ÷ 8 − 1',cols.map(c=>c.p!=null?pct(c.p/tg-1):'n/a'),T.p!=null?pct(T.p/tg-1):'n/a'));
  const eff=cols[cols.length-1], ftxt=(M.fProd&&M.fProd[eff.j])?rowF(M.fProd[eff.j],M.r0,s.r):null;
  const out=[];
  if(tg&&E.tot>0){ const need=E.a/tg, gap=E.tot-need;
    out.push(gap>0?`At the target of ${tg}, ${nf(E.a)} admits would need ${nf(need)} man-hours. This site used ${nf(E.tot)}, which is ${nf(gap)} more (about ${nf(gap/40,1)} people working a 40-hour week).`:
      `At the target of ${tg}, ${nf(E.a)} admits would need ${nf(need)} man-hours. This site used ${nf(E.tot)}, which is ${nf(-gap)} fewer.`); }
  if(s2!=null&&s2!==hn&&E.alt>0) out.push(`<b>Basis differs:</b> productivity counts ${nf(hn)} staff (${HCN[bk]}) but this site's payroll cost and forecast MHDW use ${nf(s2)} (HC SEP · FT 2nd). With ${nf(s2)} staff the same weeks would give ${nf(E.a/E.alt,2)} instead of ${nf(E.p,2)}.`);
  if(cols.some(c=>c.fa)&&M.fAdmits){ const j=cols.find(c=>c.fa).j; if(M.fAdmits[j]) out.push(`A forecast week's admits are a formula too: ${esc(rowF(M.fAdmits[j],M.r0,s.r))} (this site's share of the earlier weeks in SUM(…) × the network forecast for that week).`); }
  if(cols.some(c=>c.fm)&&M.fMhdw){ const j=cols.find(c=>c.fm).j; if(M.fMhdw[j]) out.push(`A forecast week's MHDW is sized by the workbook: ${esc(rowF(M.fMhdw[j],M.r0,s.r))}. It reads as: the man-hours needed to hit 90% of target, minus the staff hours already paid for, and never below 0.`); }
  return `<div class="calc"><h4>${esc(title||short(s.n))}</h4><div class="tbl-wrap"><table class="ctab"><thead><tr><th>Step</th>${hd}</tr></thead><tbody>${tr.join('')}</tbody></table></div>
   ${ftxt?`<p class="hint" style="margin:12px 0 6px">The workbook formula for step 7 (${esc(sh)}, cell ${L.prod?L.prod[eff.j]+s.r:''}):</p>${fx(ftxt)}`:''}
   ${out.map(x=>`<p class="cnote">${x}</p>`).join('')}</div>`;
}

/* how one site's monthly payroll (OPR) is built up */
const CMEAN={'BASIC':f=>'Basic pay = UMK × staff counted for cost (HC SEP · FT 2nd)','MOD Al':f=>'Fixed allowance per CL-category staff (the amounts are typed inside the formula)','DW':f=>'Daily-worker pay = that month\'s MHDW × the hourly RATE','TK':f=>`${nf((f||0)*100,2)}% of (BASIC + MOD Al + DW)`,'KS':f=>`${nf((f||0)*100,1)}% of BASIC`,'PEN':f=>`${nf((f||0)*100,1)}% of BASIC`,'COMP':f=>'BASIC ÷ 12 (a monthly accrual of one month\'s pay)','HOL AL':f=>'(BASIC + MOD Al) ÷ 12 (a monthly accrual of the holiday allowance)','BIK':f=>`${nf((f||0)*100,1)}% of MED AL`,'MED AL':f=>`Medical allowance Rp ${nf(f)} × staff (HC SEP · FT 1st)`,'OPR':f=>'Sum of all the lines above. This is "Opr payroll" in SUMMARY'};
function costPanel(P,s,m){
  const M=P.meta, r=s.r, names=M.compNames.filter(k=>k!=='MH DW'&&k!=='OPR'), val=k=>(s.c[k]&&s.c[k][m])||0, opr=s.c.OPR?s.c.OPR[m]:0;
  const line=(k)=>{const c=M.compF[k]&&M.compF[k][m], f=c&&c.f?rowF(c.f,M.r0,r):'(typed number)';
    return `<tr><td><b>${esc(k)}</b><small>${esc((CMEAN[k]||(()=>''))(M.compFac[k]))}</small></td><td class="fcell" data-notr>${esc(c&&c.col?c.col+r:'')}<br>${esc(f)}</td><td>${nf(val(k))}</td></tr>`;};
  const mhm=s.c['MH DW']?s.c['MH DW'][m]:null;
  return `<div class="calc"><h4>${esc(short(s.n))} · ${MON3_[m]} payroll build-up</h4>
   <p class="hint" style="margin:0 0 10px">Staff counted for cost: ${nf(s.hc.s2)} (HC SEP · FT 2nd) · UMK Rp ${nf(s.hc.umk)} · hourly rate Rp ${nf(s.hc.rate)}${mhm!=null?` · MHDW in ${MON3_[m]}: ${nf(mhm,1)} hours`:''}</p>
   <div class="tbl-wrap"><table class="ctab ctab2"><thead><tr><th>Line</th><th>Cell and formula in ${esc(sheetName())}</th><th>Rp</th></tr></thead><tbody>${names.map(line).join('')}
   <tr class="key"><td><b>OPR</b><small>${esc(CMEAN.OPR())}</small></td><td class="fcell" data-notr>${esc(M.compF.OPR&&M.compF.OPR[m]?M.compF.OPR[m].col+r:'')}<br>${esc(M.compF.OPR&&M.compF.OPR[m]&&M.compF.OPR[m].f?rowF(M.compF.OPR[m].f,M.r0,r):'')}</td><td>${nf(opr)}</td></tr></tbody></table></div></div>`;
}

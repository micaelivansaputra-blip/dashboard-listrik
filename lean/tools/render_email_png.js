const {chromium}=require('playwright');const fs=require('fs');
const d=JSON.parse(fs.readFileSync('rep.json'));const THR=0.10;
const S=d.sites,MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dt=new Date(d.date+'T00:00:00');
const DW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const nf=n=>Math.round(n).toLocaleString('en-US');
const pc=p=>(p>0?'+':p<0?'−':'')+Math.abs(p*100).toFixed(0)+'%';
const mp=s=>s.mtd.n&&s.mtd.t?s.mtd.a/s.mtd.t-1:null;
const have=S.filter(s=>s.mtd.n>0),dd=S.filter(s=>s.daily.a!=null),miss=S.filter(s=>s.daily.a==null);
const sum=(L,f)=>L.reduce((x,s)=>x+f(s),0);
const MA=sum(have,s=>s.mtd.a),MT=sum(have,s=>s.mtd.t),DA=sum(dd,s=>s.daily.a),DT=sum(dd,s=>s.daily.t);
const mo=have.filter(s=>mp(s)>THR).sort((a,b)=>mp(b)-mp(a)),dov=dd.filter(s=>s.daily.p>THR).sort((a,b)=>b.daily.p-a.daily.p);
const regs=[...new Set(S.map(s=>s.r))].sort();
const R=regs.map(r=>{const m=have.filter(s=>s.r==r),x=dd.filter(s=>s.r==r);return{r,mp:sum(m,s=>s.mtd.a)/sum(m,s=>s.mtd.t)-1,dp:sum(x,s=>s.daily.a)/sum(x,s=>s.daily.t)-1,mo:m.filter(s=>mp(s)>THR).length,n:m.length}});
const col=p=>p>THR?'#ff453a':p>0?'#ff9f0a':'#30d158';
const bar=p=>{const w=Math.min(Math.abs(p)/0.4,1)*100;return`<div class="bar"><div class="mid"></div><div class="fill" style="${p>=0?`left:50%;width:${w/2}%`:`right:50%;width:${w/2}%`};background:${col(p)}"></div></div>`};
const list=(L,key,top=8)=>L.slice(0,top).map(s=>{const p=key=='m'?mp(s):s.daily.p,a=key=='m'?s.mtd.a:s.daily.a,t=key=='m'?s.mtd.t:s.daily.t;
 return`<div class="li"><div class="nm">${s.n.replace(/\b\w/g,c=>c)}<span class="chip">${s.r}</span></div><div class="num">${nf(a)} <span class="mut">/ ${nf(t)}</span></div><div class="pp" style="color:${col(p)}">${pc(p)}</div></div>`}).join('');
const html=`<!doctype html><meta charset=utf-8><style>
*{box-sizing:border-box}body{margin:0;background:#000;color:#f5f5f7;font:15px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Helvetica Neue",Arial,sans-serif;width:1120px;padding:40px}
.mut{color:#98989d}.eyebrow{color:#0a84ff;font-weight:700;letter-spacing:.12em;font-size:13px}
h1{font-size:44px;letter-spacing:-.03em;margin:6px 0 2px;line-height:1.05}.sub{color:#98989d;font-size:16px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:26px 0 18px}
.card{background:#1c1c1e;border-radius:20px;padding:20px 22px}
.k .l{color:#98989d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.k .v{font-size:40px;font-weight:700;letter-spacing:-.03em;margin-top:6px;line-height:1}.k .n{color:#98989d;font-size:13px;margin-top:8px}
.hl{background:linear-gradient(160deg,#0a84ff,#0a4fd1)}.hl .l,.hl .n{color:rgba(255,255,255,.8)}
h2{font-size:19px;margin:0 0 14px;letter-spacing:-.01em}
.reg{display:grid;grid-template-columns:110px 1fr 1fr 70px;gap:14px;align-items:center;padding:7px 0;border-top:1px solid #2c2c2e}.reg:first-of-type{border-top:0}
.hd{color:#98989d;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.bar{position:relative;height:10px;background:#2c2c2e;border-radius:5px}.mid{position:absolute;left:50%;top:-3px;bottom:-3px;width:2px;background:#636366}.fill{position:absolute;top:0;bottom:0;border-radius:5px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.li{display:grid;grid-template-columns:1fr auto 54px;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #2c2c2e}.li:first-of-type{border-top:0}
.nm{font-weight:600}.chip{background:#2c2c2e;color:#98989d;border-radius:999px;padding:1px 8px;font-size:11px;margin-left:8px;font-weight:600}.num{font-variant-numeric:tabular-nums;color:#f5f5f7}.pp{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.more{color:#0a84ff;font-weight:600;margin-top:10px}.foot{color:#98989d;font-size:13px;margin-top:18px;line-height:1.6}
.pill{display:inline-block;border-radius:999px;padding:3px 10px;font-weight:700;font-size:12px}
</style><body>
<div class="eyebrow">ELECTRICITY MONITORING</div><h1>Daily Monitoring</h1>
<div class="sub">${DW[dt.getDay()]}, ${dt.getDate()} ${MN[dt.getMonth()]} ${dt.getFullYear()} · ${dd.length} of ${S.length} cinemas reported</div>
<div class="grid4">
<div class="card k hl"><div class="l">MTD vs target</div><div class="v">${pc(MA/MT-1)}</div><div class="n">${nf(MA)} of ${nf(MT)} kWh</div></div>
<div class="card k"><div class="l">Daily vs target</div><div class="v" style="color:${col(DA/DT-1)}">${pc(DA/DT-1)}</div><div class="n">${nf(DA)} of ${nf(DT)} kWh</div></div>
<div class="card k"><div class="l">Over MTD</div><div class="v" style="color:#ff453a">${mo.length}<span class="mut" style="font-size:20px"> / ${have.length}</span></div><div class="n">above ${THR*100}% of target</div></div>
<div class="card k"><div class="l">Over daily</div><div class="v" style="color:#ff453a">${dov.length}<span class="mut" style="font-size:20px"> / ${dd.length}</span></div><div class="n">above ${THR*100}% of target</div></div></div>
<div class="card"><h2>By region</h2>
<div class="reg"><div class="hd">Region</div><div class="hd">MTD vs target</div><div class="hd">Daily vs target</div><div class="hd" style="text-align:right">Over MTD</div></div>
${R.map(x=>`<div class="reg"><div class="nm">Region ${x.r.replace('R','')}</div><div style="display:grid;grid-template-columns:1fr 52px;gap:8px;align-items:center">${bar(x.mp)}<b style="color:${col(x.mp)};text-align:right">${pc(x.mp)}</b></div><div style="display:grid;grid-template-columns:1fr 52px;gap:8px;align-items:center">${bar(x.dp)}<b style="color:${col(x.dp)};text-align:right">${pc(x.dp)}</b></div><div style="text-align:right" class="mut"><b style="color:#f5f5f7">${x.mo}</b> / ${x.n}</div></div>`).join('')}</div>
<div class="two"><div class="card"><h2>Follow up: over MTD</h2>${list(mo,'m')}<div class="more">+ ${Math.max(mo.length-8,0)} more in the Excel attachment</div></div>
<div class="card"><h2>Follow up: over daily</h2>${list(dov,'d')}<div class="more">+ ${Math.max(dov.length-8,0)} more in the Excel attachment</div></div></div>
<div class="foot"><span class="pill" style="background:rgba(48,209,88,.16);color:#30d158">Saving</span> &nbsp;${have.length-have.filter(s=>mp(s)>0).length} cinemas on or under target MTD. Thank you, please keep it up.<br>
${miss.length?`<span class="pill" style="background:rgba(255,159,10,.16);color:#ff9f0a">Data incomplete</span> &nbsp;${miss.map(s=>s.n).join(', ')}.<br>`:''}
Target = FY2026 monthly kWh budget. Daily target follows the weekly pattern (Sat–Sun ≥ Thu–Fri ≥ Mon–Wed). MTD target = budget ÷ days in month × days with data.</div></body>`;
fs.writeFileSync('out/gsat_email.html',html);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1120,height:900},deviceScaleFactor:2});await p.setContent(html);await p.waitForTimeout(300);await p.screenshot({path:'out/Email_GSAT_style_4Nov.png',fullPage:true});await b.close();console.log('ok',mo.length,dov.length)})()

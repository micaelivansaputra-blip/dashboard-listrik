const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();const p=await b.newPage();const er=[];p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.cwd()+'/lean.html');
const r=await p.evaluate(()=>{const m=10,days=calDays(2026,m),dimM=days.length;
 const sites=S.filter(s=>s.b).sort((a,b)=>a.r<b.r?-1:a.r>b.r?1:a.k-b.k).map(s=>{
  const vals=[];for(let i=Math.max(0,LAST-27);i<=LAST;i++){const v=s.v[i];if(v!=null&&v>0)vals.push(v)}
  const level=vals.length>=14?vals.reduce((x,y)=>x+y,0)/vals.length:null,p=prof[s.k],nm=norm(s,2026,m);
  const idx={we:7*p.w/2,th:7*p.t/2,ot:7*p.o/3},tg={we:s.b[m]*(p.w/2)/nm,th:s.b[m]*(p.t/2)/nm,ot:s.b[m]*(p.o/3)/nm};
  let act=0,nact=0;const c={we:0,th:0,ot:0};
  for(const d of days){const i=D.findIndex(x=>x.getTime()==d.getTime());const v=i>=0&&i<=LAST?s.v[i]:null;if(v!=null){act+=v;nact++}else c[grp(d)]++}
  return{k:s.k,n:s.n,r:s.r,bp:s.bp,budget:s.b[m],level,nlevel:vals.length,idx,tg,act,nact,c,cf:p.cf,ok:p.ok}});
 return{sites,dim:dimM,last:RAW.dates[LAST],cnt:days.reduce((o,d)=>{o[grp(d)]=(o[grp(d)]||0)+1;return o},{})}});
fs.writeFileSync('fc.json',JSON.stringify(r));console.log(r.sites.length,r.dim,r.last,JSON.stringify(r.cnt),r.sites.filter(s=>s.level==null).map(s=>s.n),er);await b.close()})()

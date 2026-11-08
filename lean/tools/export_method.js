const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();const p=await b.newPage();const er=[];p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.cwd()+'/lean.html');
const r=await p.evaluate(()=>{const ord=[1,2,3,4,5,6,0];const m=10;
 const sites=S.filter(s=>s.b).sort((a,b)=>a.r<b.r?-1:a.r>b.r?1:a.k-b.k).map(s=>{const o=OWN[s.k];
  const nm=norm(s,2026,m),p=prof[s.k];
  return{k:s.k,n:s.n,r:s.r,budget:s.b[m],bp:s.bp,own:o?ord.map(i=>o.mean[i]):null,noise:o?o.noise:null,nmin:o?o.n:null,
   chk:{cf:p.cf,w:p.w,t:p.t,o:p.o,tgOt:s.b[m]*(p.o/3)/nm,tgTh:s.b[m]*(p.t/2)/nm,tgWe:s.b[m]*(p.w/2)/nm}}});
 return{net:ord.map(i=>NET[i]),sites,step:STEP}});
fs.writeFileSync('mt.json',JSON.stringify(r));console.log(r.sites.length,r.net.map(x=>+x.toFixed(3)),r.step,er);await b.close()})()

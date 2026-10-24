/* ---------- app tabs + payroll ---------- */
let APP='elec';
const PAY={d:null,sc:'16',wk:null,q:'',expand:false,ref:'target',view:'mtd',msort:'prod',mq:'',mexp:false,open:{mtd:null,year:null,cost:null},cm:null,cs:'rpa',cq:'',cx:false};
const PT=0.03;
const fmtM=v=>Math.round(v/1e6).toLocaleString(EN);
const pc1=v=>(v*100).toFixed(1)+'%';
const ppt=v=>(v>=0?'+':'−')+Math.abs(v*100).toFixed(1)+' pt';
/* good: 'hi' = higher is better, 'lo' = lower is better */
function vcls(v,good){ if(v==null||!isFinite(v)||Math.abs(v)<PT) return 'flat'; const better=good==='hi'?v>0:v<0; return better?'good':'bad'; }
const dcls=c=>c==='good'?'down':c==='bad'?'up':'flat';
function setApp(a){
  APP=a;
  document.querySelectorAll('#appTabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.app===a));
  document.getElementById('v-elec').hidden=a!=='elec'; document.getElementById('v-pay').hidden=a!=='pay';
  document.getElementById('nav').hidden=a!=='elec'; document.getElementById('navPay').hidden=a!=='pay';
  document.getElementById('regionLbl').hidden=a!=='elec';
  document.getElementById('appTitle').textContent=a==='pay'?'Payroll Monitoring':'Electricity Usage Monitoring';
  try{history.replaceState(null,'',a==='pay'?'#payroll':location.pathname+location.search);}catch(e){}
  window.scrollTo(0,0); render();
}
function loadPayLocal(){ try{const t=localStorage.getItem('payroll.v1'); if(t){const d=JSON.parse(t); if(d&&d.summary){PAY.d=d; pickSc(d);}}}catch(e){} }
function savePayLocal(){ try{localStorage.setItem('payroll.v1',JSON.stringify(PAY.d));}catch(e){} }
/* open the scenario with the most recent actual week (the one being edited); keep the current one on a tie */
function pickSc(d){
  const ks=Object.keys(d.summary); if(!ks.includes(PAY.sc)) PAY.sc=ks[0];
  let best=PAY.sc,bi=d.prod[PAY.sc]?lastActual(d.prod[PAY.sc]):-1;
  ks.forEach(k=>{const i=d.prod[k]?lastActual(d.prod[k]):-1; if(i>bi){bi=i;best=k;}}); PAY.sc=best;
}
function applyPayroll(d){
  PAY.d=d; pickSc(d); PAY.wk=null; PAY.mq=''; PAY.mexp=false;
  const mq=document.getElementById('mtdQ'); if(mq) mq.value=''; PAY.q=''; PAY.expand=false;
  const q=document.getElementById('psQ'); if(q) q.value='';
  savePayLocal();
}
const lastActual=P=>{let k=-1;P.weeks.forEach((w,i)=>{if(w.actual)k=i;});return k;};
function payCtx(){ const d=PAY.d,S=d.summary[PAY.sc],P=d.prod[PAY.sc]||null,st=(d.status&&d.status[PAY.sc])||{}; return {d,S,P,st}; }

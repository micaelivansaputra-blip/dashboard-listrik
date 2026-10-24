/* controls */
function fillRegions(){const regs=['All',...[...new Set(DATA.sites.map(s=>s.r))].sort()];
  const el=document.getElementById('region'); el.innerHTML=regs.map(r=>`<option>${r}</option>`).join(''); el.value=REGION;}
fillRegions(); if(hasHist()){fillMonthSelects();} wireMomExplore(); wireWeekly(); wirePay(); loadPayLocal();
document.getElementById('region').addEventListener('change',e=>{REGION=e.target.value;render();});
document.getElementById('q').addEventListener('input',e=>{QUERY=e.target.value;renderSites(selected());});
(function(){const $=id=>document.getElementById(id), re=()=>{fillPS();renderSites(selected());};
  $('psA').addEventListener('change',e=>{PS.A=e.target.value;re();});
  $('psB').addEventListener('change',e=>{PS.B=e.target.value;re();});
  $('psType').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;PS.type=b.dataset.k;re();});
  $('psQuick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ks=monthKeys().map(m=>m.k),q=b.dataset.q;
    if(q==='swap'){[PS.A,PS.B]=[PS.B,PS.A];}
    else if(q==='prev'){const v=ks.filter(k=>k[0]==='v'),i=v.indexOf(PS.A.replace(/^y/,'v'));if(i>0){PS.A=v[i];PS.B=v[i-1];}}
    else if(q==='yoy'){const y='y:2025-'+PS.A.slice(7);if(PS.A[0]==='v'&&ks.includes(y))PS.B=y;else{const n=$('psNote');n.textContent='Last year is only available for August, September and October.';return;}}
    re();});})();
document.getElementById('counts').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(!b)return;STATUS=(b.dataset.st==='all'||STATUS===b.dataset.st)?'all':b.dataset.st;renderSites(selected());});
document.addEventListener('click',e=>{const c=e.target.closest('[data-n]');if(c&&!c.closest('#modal')){openSite(c.dataset.n);return;}if(e.target.closest('[data-close]'))closeSite();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('modal').hidden)closeSite();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-n][tabindex]')){e.preventDefault();openSite(e.target.dataset.n);}});
document.getElementById('tiles').addEventListener('click',e=>{const b=e.target.closest('th button');if(!b)return;e.stopPropagation();const k=b.dataset.k;
  if(SORTKEY===k)SORT=SORT==='desc'?'asc':'desc';else{SORTKEY=k;SORT=k==='name'?'asc':'desc';}
  renderSites(selected());});
document.getElementById('counts').addEventListener('click',e=>{
  if(e.target.closest('#noteFilt')){NOTEF=!NOTEF;renderSites(selected());return;}
  if(e.target.closest('#noteCopy')){fuCopyAll().then(n=>{const m=document.getElementById('noteMsg');if(m){m.textContent=n?n+' notes copied. Paste into Excel.':'No notes yet.';m.className='fumsg ok';}}).catch(()=>{const m=document.getElementById('noteMsg');if(m){m.textContent='Copy was blocked by the browser.';m.className='fumsg err';}});}
});
document.getElementById('more').addEventListener('click',e=>{if(e.target.closest('[data-more]')){EXPAND=!EXPAND;renderSites(selected());}});
document.getElementById('dailyTog').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;SHOW[b.dataset.k]=!SHOW[b.dataset.k];b.setAttribute('aria-pressed',SHOW[b.dataset.k]);renderCharts(periods(selected()));});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>render());
/* light / dark switch: follows the system until the user picks one */
(function(){
  const root=document.documentElement, btn=document.getElementById('themeBtn'), mq=matchMedia('(prefers-color-scheme: dark)');
  const SUN='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const cur=()=>root.dataset.theme||(mq.matches?'dark':'light');
  function paint(){ const d=cur()==='dark'; btn.innerHTML=d?SUN:MOON; const t=d?'Switch to light mode':'Switch to dark mode'; btn.setAttribute('aria-label',t); btn.title=t; }
  root.dataset.theme='dark'; try{ const t=localStorage.getItem('theme'); if(t==='dark'||t==='light') root.dataset.theme=t; }catch(e){}
  paint();
  btn.addEventListener('click',()=>{ const n=cur()==='dark'?'light':'dark'; Motion.themeSwitch(btn,()=>{ root.dataset.theme=n; try{localStorage.setItem('theme',n);}catch(e){} paint(); render(); }); });
  mq.addEventListener('change',()=>paint());
})();

(function(){ const el=document.getElementById('langSel'); el.value=I18N.get(); I18N.start(); I18N.apply();
  el.addEventListener('change',()=>{ I18N.set(el.value); render(); }); })();

new MutationObserver(()=>render()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
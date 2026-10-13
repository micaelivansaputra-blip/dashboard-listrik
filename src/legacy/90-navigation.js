/* navigation */
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>Router.scrollTo(b.dataset.t)));
const secs=[...document.querySelectorAll('#nav button')].map(b=>document.getElementById(b.dataset.t));
const paySecs=['p-mtd','p-sum','p-mon','p-wk','p-site','p-cost','p-how'].map(i=>document.getElementById(i));
function setActive(){const y=window.scrollY+170,pay=APP==='pay',L=(pay?paySecs:secs).filter(x=>x&&!x.hidden);let cur=L[0].id;L.forEach(x=>{if(x.getBoundingClientRect().top+window.scrollY<=y)cur=x.id;});
  document.querySelectorAll(pay?'#navPay button':'#nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.t===cur));}
addEventListener('scroll',setActive,{passive:true});
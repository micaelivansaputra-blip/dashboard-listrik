/* ---------- characters ---------- */
const INK='#101A33'; let UID=0;
function volty(mood){
  const u='v'+(UID++), cy='#8CF6FF';
  const eyes={
   happy:`<path class="pp" d="M48 70 Q53 62 58 70" fill="none" stroke="${cy}" stroke-width="3.6" stroke-linecap="round"/><path class="pp" d="M66 70 Q71 62 76 70" fill="none" stroke="${cy}" stroke-width="3.6" stroke-linecap="round"/>`,
   meh:`<rect class="pp" x="48" y="66" width="10" height="5" rx="2.5" fill="${cy}"/><rect class="pp" x="66" y="66" width="10" height="5" rx="2.5" fill="${cy}"/>`,
   worried:`<ellipse class="pp" cx="53" cy="67.5" rx="4.6" ry="5.4" fill="${cy}"/><ellipse class="pp" cx="71" cy="67.5" rx="4.6" ry="5.4" fill="${cy}"/><path d="M47 60 L58 62.5 M77 60 L66 62.5" stroke="${cy}" stroke-width="2.4" stroke-linecap="round"/>`}[mood];
  return `<svg viewBox="0 0 120 150" aria-hidden="true" style="overflow:visible"><defs>
   <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B9C7FF"/><stop offset=".55" stop-color="#6F86EE"/><stop offset="1" stop-color="#3C4DB8"/></linearGradient>
   <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <filter id="${u}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
   <filter id="${u}e" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
   <ellipse class="vsh" cx="60" cy="144" rx="24" ry="4" fill="${INK}" opacity=".2"/>
   <g class="vf">
   <path class="glow" d="M70 4 L22 78 H54 L44 136 L100 56 H68 Z" fill="#79E7FF" opacity=".6" filter="url(#${u}b)"/>
   <g class="ring"><ellipse cx="60" cy="70" rx="56" ry="15" fill="none" stroke="#8CF6FF" stroke-opacity=".55" stroke-width="1.4" stroke-dasharray="3 7" transform="rotate(-18 60 70)"/></g>
   <path d="M70 4 L22 78 H54 L44 136 L100 56 H68 Z" fill="url(#${u}g)" stroke="#ffffff" stroke-opacity=".55" stroke-width="2.2" stroke-linejoin="round"/>
   <path d="M69 12 L31 70 H54 L50 100 L88 56" fill="none" stroke="url(#${u}h)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
   <rect x="38" y="56" width="48" height="22" rx="11" fill="#0B1226" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/>
   <g filter="url(#${u}e)" opacity=".9">${eyes}</g>${eyes}
   <circle class="tw" cx="104" cy="22" r="2.2" fill="#8CF6FF"/><circle class="tw tw2" cx="12" cy="40" r="1.8" fill="#E6BE5A"/><circle class="tw" cx="108" cy="104" r="1.6" fill="#E6BE5A"/>
   </g></svg>`;
}
function bulby(on,zzz){
  const u='o'+(UID++);
  const eyes=on?`<ellipse cx="42" cy="51" rx="3.4" ry="4" fill="#8CF6FF"/><ellipse cx="58" cy="51" rx="3.4" ry="4" fill="#8CF6FF"/>`
    :`<path d="M38 52 H46 M54 52 H62" stroke="#7B87A8" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 100 120" aria-hidden="true" style="overflow:visible"><defs>
   <radialGradient id="${u}g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${on?'#FFF3C9':'#E3E8F4'}"/><stop offset="1" stop-color="${on?'#E2B54F':'#98A4C0'}"/></radialGradient>
   <filter id="${u}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter></defs>
   ${on?`<circle class="glow" cx="50" cy="50" r="44" fill="#F2CB6A" opacity=".55" filter="url(#${u}b)"/>`:''}
   <ellipse cx="50" cy="104" rx="20" ry="4" fill="${INK}" opacity=".18"/>
   <path d="M38 84 H62 L58 100 H42 Z" fill="#8E9AB8" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linejoin="round"/>
   <circle cx="50" cy="52" r="36" fill="url(#${u}g)" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
   <path d="M26 34 Q34 20 50 17" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3.2" stroke-linecap="round"/>
   <rect x="31" y="42" width="38" height="18" rx="9" fill="#0B1226"/>${eyes}
   ${zzz?`<text x="76" y="20" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-weight="700" font-size="20" fill="${INK}" opacity=".6">z</text><text x="88" y="6" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-weight="700" font-size="14" fill="${INK}" opacity=".6">z</text>`:''}</svg>`;
}
function mini(c){
  const m={up:'M8 18 Q13 13 18 18',down:'M8 15 Q13 20.5 18 15',flat:'M8 17 H18'}[c];
  return `<svg class="face" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="currentColor" opacity=".13"/><circle cx="9" cy="10.5" r="1.7" fill="currentColor"/><circle cx="17" cy="10.5" r="1.7" fill="currentColor"/><path d="${m}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
}
function renderMascots(mood,msg){
  document.getElementById('mascot').innerHTML=volty(mood);
  document.getElementById('heroM').innerHTML=`<div class="bubble">${msg}</div>${volty(mood)}`;
}
let pq=null;
addEventListener('pointermove',e=>{ if(pq)return; pq=requestAnimationFrame(()=>{pq=null;
  document.querySelectorAll('svg .pp').forEach(p=>{const r=p.ownerSVGElement.getBoundingClientRect();const cx=r.left+r.width/2, cy=r.top+r.height*.43;
    let dx=e.clientX-cx, dy=e.clientY-cy; const d=Math.hypot(dx,dy)||1, k=Math.min(1,d/160)*2.6; p.style.transform=`translate(${dx/d*k}px,${dy/d*k}px)`;});});},{passive:true});
let QUIPS=['Hi! I\'m Volty. Tap me again for another tip.'], qi=0, qt=null;
function say(){
  const q=document.getElementById('quip'); q.textContent=QUIPS[qi++%QUIPS.length]; q.hidden=false;
  clearTimeout(qt); qt=setTimeout(()=>q.hidden=true,5200);
  if(!reduce){const b=document.querySelector('.brand');for(let i=0;i<8;i++){const s=document.createElement('i');s.className='spark';b.appendChild(s);const a=i/8*Math.PI*2, r=34+Math.random()*22;
    s.animate([{transform:'translate(0,0) scale(.6) rotate(0)',opacity:1},{transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) scale(1.2) rotate(${(Math.random()-.5)*180}deg)`,opacity:0}],{duration:700,easing:'ease-out'}).onfinish=()=>s.remove();}}
}
function countUp(el,v){
  if(reduce){el.textContent=fmt(v);return;}
  const t0=performance.now(); (function f(t){const k=Math.min(1,(t-t0)/750),e=1-Math.pow(1-k,3);el.textContent=fmt(v*e);if(k<1)requestAnimationFrame(f);})(t0);
}
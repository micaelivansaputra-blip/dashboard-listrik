/* ---------- language (EN / ID / ES-MX) ---------- */
const I18N=(function(){
  const D=(/*I18NDICT*/);
  const OK={en:1,id:1,es:1}; let lang='en';
  try{const t=localStorage.getItem('lang'); if(OK[t]) lang=t;}catch(e){}
  const MF=['January','February','March','April','May','June','July','August','September','October','November','December'], MS=MF.map(m=>m.slice(0,3));
  const MN={id:{F:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],S:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']},
            es:{F:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],S:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']}};
  const TOK=/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|[+−]?\d(?:[\d,]*\d)?(?:\.\d+)?%?/g;
  const DN={id:['Sen','Sel','Rab','Kam','Jum','Sab','Min'],es:['lun','mar','mié','jue','vie','sáb','dom']}, DS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const TOKD=new RegExp(TOK.source.replace('(January','(Mon|Tue|Wed|Thu|Fri|Sat|Sun|January'),'g');
  const fnum=s=>lang==='id'?s.replace(/,/g,'\u0001').replace(/\./g,',').replace(/\u0001/g,'.'):s;
  const mon=m=>{ let i=DS.indexOf(m); if(i>=0) return DN[lang][i]; i=MF.indexOf(m); if(i>=0) return MN[lang].F[i]; i=MS.indexOf(m); return i>=0?MN[lang].S[i]:m; };
  const cap=(a,b)=>/^[A-Z]/.test(a)&&/^[a-zà-ÿ]/.test(b)?b[0].toUpperCase()+b.slice(1):b;
  const miss=new Map();
  const RULES=[/*I18NRULES*/];
  const loc=x=>x.replace(TOKD,t=>/^[A-Za-z]/.test(t)?mon(t):fnum(t));
  function tr(str){
    if(lang==='en'||str==null) return str;
    const s=String(str); const m0=/^(\s*)([\s\S]*?)(\s*)$/.exec(s); const core=m0[2]; if(!core) return s;
    for(const r of RULES){ const m=r[0].exec(core); if(m){ const t=typeof r[1]==='function'?r[1](m,lang):r[1][lang]; if(t!=null) return m0[1]+String(t).replace(/([$@])(\d)/g,(_,k,n)=>m[n]==null?'':(k==='$'?loc(m[n]):tr(m[n])))+m0[3]; } }
    const re=/\d/.test(core)?TOKD:TOK; const toks=[]; const key=core.replace(re,t=>{toks.push(t);return '§';});
    let out=D[lang][key];
    if(out===undefined){
      if(/[A-Za-z]{3}/.test(key.replace(/§/g,''))) miss.set(key,core);
      return toks.length?m0[1]+cap(core,loc(core))+m0[3]:s;
    }
    let i=0; const res=out.replace(/§(\d)?/g,(_,n)=>{const t=toks[n?+n-1:i++]; if(t==null) return ''; return /^[A-Za-z]/.test(t)?mon(t):fnum(t);});
    return m0[1]+cap(core,res)+m0[3];
  }
  /* DOM */
  const W=new WeakMap(), A=new WeakMap(), SKIP={SCRIPT:1,STYLE:1,CANVAS:1,NOSCRIPT:1,TEXTAREA:1};
  const ATTR=['placeholder','aria-label','title'];
  function node(n){
    const w=W.get(n), orig=(w&&n.data===w.out)?w.orig:n.data; const out=tr(orig);
    if(out!==n.data) n.data=out; W.set(n,{orig,out});
  }
  function attrs(el){
    ATTR.forEach(a=>{ if(!el.hasAttribute||!el.hasAttribute(a)) return; const k=A.get(el)||{}, w=k[a], v=el.getAttribute(a), orig=(w&&v===w.out)?w.orig:v, out=tr(orig);
      if(out!==v) el.setAttribute(a,out); k[a]={orig,out}; A.set(el,k); });
  }
  function walk(root){
    if(root.nodeType===3){ const p=root.parentNode; if(p&&!SKIP[p.nodeName]&&!(p.closest&&p.closest('[data-notr],code'))) node(root); return; }
    if(root.nodeType!==1||SKIP[root.nodeName]||(root.closest&&root.closest('[data-notr],code'))) return;
    attrs(root); for(let c=root.firstChild;c;c=c.nextSibling) walk(c);
  }
  let mo=null;
  function start(){
    if(mo) return; mo=new MutationObserver(ms=>{
      for(const m of ms){
        if(m.type==='characterData'){ const p=m.target.parentNode; if(p&&!SKIP[p.nodeName]&&!(p.closest&&p.closest('[data-notr],code'))) node(m.target); }
        else if(m.type==='attributes'){ attrs(m.target); }
        else m.addedNodes.forEach(n=>walk(n));
      } });
    mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
  }
  function apply(){ document.documentElement.lang=lang==='es'?'es-MX':lang; walk(document.body); }
  /* Chart.js: translate dataset names, string labels, axis titles and tooltip text */
  const wrapCb=f=>function(){const r=f.apply(this,arguments); return Array.isArray(r)?r.map(tr):(typeof r==='string'?tr(r):r);};
  function chart(cfg){
    if(lang==='en'||!cfg) return cfg;
    try{
      if(cfg.data){ if(Array.isArray(cfg.data.labels)) cfg.data.labels=cfg.data.labels.map(x=>typeof x==='string'?tr(x):x);
        (cfg.data.datasets||[]).forEach(d=>{ if(typeof d.label==='string') d.label=tr(d.label); }); }
      const o=cfg.options||{}, sc=o.scales||{}; Object.keys(sc).forEach(k=>{ if(sc[k]&&sc[k].title&&sc[k].title.text) sc[k].title.text=tr(sc[k].title.text); });
      const cb=o.plugins&&o.plugins.tooltip&&o.plugins.tooltip.callbacks; if(cb) Object.keys(cb).forEach(k=>{ if(typeof cb[k]==='function') cb[k]=wrapCb(cb[k]); });
    }catch(e){}
    return cfg;
  }
  function set(l){ if(!OK[l]||l===lang) return; lang=l; try{localStorage.setItem('lang',l);}catch(e){} apply(); }
  return {tr,chart,apply,start,set,loc,get:()=>lang,miss:()=>[...miss.entries()],D};
})();
const tr=s=>I18N.tr(s);

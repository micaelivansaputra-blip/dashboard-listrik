let DATA = /*DATA*/;
/* FY2026 monthly kWh budget per site, keyed by site number: {no:{n,m:[Jan..Dec]}} */
const BUDGET = /*BUDGET*/;
const TH = 0.05, EN = 'en-US';
const fmt = n => Math.round(n).toLocaleString(EN);
const pct = (x,d=1) => (x>=0?'+':'−') + Math.abs(x*100).toFixed(d) + '%';
const cls = x => x>TH?'up':x<-TH?'down':'flat';
const short = s => s.split('-').slice(1).join('-').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
let days = DATA.days, N = days.length;
const dt = s => new Date(s+'T00:00:00Z');
const dow = s => dt(s).getUTCDay();
const isWE = s => {const d=dow(s);return d===0||d===6};
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dm = s => dt(s).getUTCDate()+' '+MN[dt(s).getUTCMonth()];
let IDX, iOkt, iProg, nOkt, octLbl, pyLbl;
function setup(){
  days=DATA.days; N=days.length; IDX={agu:[0,30],sep:[31,60]};
  iOkt=days.indexOf('2026-10-01'); IDX.okt=[iOkt,N-1]; iProg=days.indexOf('2026-08-19'); nOkt=N-iOkt;
  octLbl=`${dt(days[iOkt]).getUTCDate()}–${dt(days[N-1]).getUTCDate()} Oct`;
  pyLbl=`${dt(DATA.pyDays[0]).getUTCDate()}–${dt(DATA.pyDays[DATA.pyDays.length-1]).getUTCDate()} Oct`;
}
setup();
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ICON = {up:'<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2 12 8H9v4H5V8H2z" fill="currentColor"/></svg>',down:'<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 12 2 6h3V2h4v4h3z" fill="currentColor"/></svg>',flat:'<svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 5h10v1.8H2zm0 3.2h10V10H2z" fill="currentColor"/></svg>'};

let REGION='All', MODE='mom', QUERY='', charts={};
/* Tracking sites that have readings, shaped like normal sites so list pages can show them too */
function trackSites(){ return Object.keys((DATA.hist&&DATA.hist.t)||{}).map(n=>{const t=(DATA.track||[]).find(x=>x.n===n); return t?Object.assign({},t,{track:true,partial:false}):null;}).filter(Boolean); }
/* list pages: add Tracking sites with readings, but leave out the ones flagged as suspect (CT or unit wrong, value far from budget) so they do not distort rankings */
function withTracked(list){ return list.concat(trackSites().filter(s=>(REGION==='All'||s.r===REGION)&&!(typeof tkWhy==='function'&&tkWhy(s,tkInfo(s)).some(w=>/wrong|far from/.test(w))))); }
function selected(){ return DATA.sites.filter(s => REGION==='All' || s.r===REGION); }
function natSeries(list){ return days.map((_,i)=>list.reduce((t,s)=>t+s.v[i],0)); }
function pySeries(list){ return DATA.pyDays.map((_,i)=>list.reduce((t,s)=>t+s.y[i],0)); }
function stat(vals, dates){
  const wd=[],we=[]; vals.forEach((v,i)=> (isWE(dates[i])?we:wd).push(v));
  return {raw:mean(vals), wd:wd.length?mean(wd):NaN, we:we.length?mean(we):NaN};
}
const range = (a,[i,j]) => a.slice(i,j+1);
function periods(list){
  const T=natSeries(list), P=pySeries(list), o={};
  for(const k of ['agu','sep','okt']) o[k]=stat(range(T,IDX[k]), range(days,IDX[k]));
  o.py=stat(P, DATA.pyDays);
  return {T,P,...o};
}
function siteAvg(s){
  const av=k=>mean(range(s.v,IDX[k]));
  const okt=av('okt'), sep=av('sep'), agu=av('agu'), py=s.y?mean(s.y):NaN;
  return {okt,sep,agu,py,mom:okt/sep-1,vsAgu:okt/agu-1,yoy:okt/py-1};
}
function ma7(a){return a.map((_,i)=>{if(i<6) return null; const w=a.slice(i-6,i+1); return w.some(x=>x==null)?null:mean(w);});}


/* ---------- Notes History: every note written for a site, newest first ----------
   Reads the same notes as the site pop-up (FU). "Latest per site" shows the current note of each site;
   "Full history" lists every saved version. Click an item to open the site and edit its note. */
const NT={q:'',view:'latest',st:'all',tag:'all'};
function ntWhen(iso){
  const d=new Date(iso); if(isNaN(d)) return {day:'',txt:''};
  const day=d.getDate()+' '+MN[d.getMonth()]+' '+d.getFullYear(), tm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  return {day,txt:day+', '+tm,ts:d.getTime()};
}
function ntEntries(){
  const out=[];
  Object.values(FU).forEach(f=>{
    if(!f||!f.site||!(f.reason||f.tag)) return;
    const site=DATA.sites.find(s=>s.n===f.site)||null;
    const base=(e,cur)=>({site:f.site,r:site?site.r:'',tag:e.tag||'',cm:e.cm||'',reason:e.reason||'',by:e.by||'',at:e.at||f.at||'',status:cur?(f.status||'open'):'',cur,due:cur?(f.due||''):'',s:site});
    if(NT.view==='latest') out.push(base(f,true));
    else{
      const log=(f.log&&f.log.length)?f.log:[f];
      log.forEach((e,i)=>out.push(base(e,i===0)));
    }
  });
  return out.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
function ntFilter(list){
  const q=NT.q.trim().toLowerCase();
  return list.filter(e=>(NT.st==='all'||(e.cur&&e.status===NT.st))&&(NT.tag==='all'||e.tag===NT.tag)&&(!q||(e.site+' '+e.reason+' '+e.cm+' '+e.by+' '+(FUTAG[e.tag]||'')).toLowerCase().includes(q)));
}
function ntNow(s){
  if(!s||typeof ovSite!=='function') return '';
  const r=ovSite(s,ovLast()); if(!r) return '';
  const k=r.p>CT.hi?'up':r.p>CT.lo?'warn':r.p<-CT.lo?'down':'flat';
  return `<span class="nt-now ${k}">${pct(r.p,0)} vs budget now</span>`;
}
function ntOpts(){
  const st=document.getElementById('ntSt'), tg=document.getElementById('ntTag'); if(!st||st.options.length) return;
  st.innerHTML='<option value="all">All statuses</option>'+Object.keys(FUST).map(k=>`<option value="${k}">${FUST[k]}</option>`).join('');
  tg.innerHTML='<option value="all">All reasons</option>'+Object.keys(FUTAG).map(k=>`<option value="${k}">${FUTAG[k]}</option>`).join('');
}
function renderNotes(){
  const box=document.getElementById('ntList'); if(!box) return; ntOpts();
  const all=ntEntries(), list=ntFilter(all), sites=new Set(list.map(e=>e.site)).size;
  document.getElementById('ntSum').textContent=all.length?`${list.length} note${list.length===1?'':'s'} · ${sites} site${sites===1?'':'s'}${list.length!==all.length?' (filtered)':''}`:'';
  document.querySelectorAll('#ntView button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.nt===NT.view)));
  if(!all.length){ box.innerHTML='<div class="empty">No notes yet. Open any site in Site Concern or Sites and add what the CM told you. It will show up here.</div>'; return; }
  if(!list.length){ box.innerHTML='<div class="empty">No note matches these filters.</div>'; return; }
  let day='';
  box.innerHTML=list.map(e=>{
    const w=ntWhen(e.at), hd=w.day!==day?`<div class="nt-day">${fuEsc(w.day)}</div>`:''; day=w.day;
    const stc=e.cur&&e.status?`<span class="fu ${e.status}">${FUST[e.status]||e.status}</span>`:'';
    return `${hd}<div class="nti" role="button" tabindex="0" data-n="${fuEsc(e.site)}">
      <div class="nti-h"><b>${short(e.site)}</b>${e.r?`<small>${e.r}</small>`:''}${e.tag?`<span class="fu tag">${FUTAG[e.tag]||'Other'}</span>`:''}${stc}${e.cur?ntNow(e.s):''}</div>
      ${e.reason?`<p class="nti-t" data-notr>${fuEsc(e.reason)}</p>`:''}
      <div class="nti-m" data-notr>${e.cm?'Told by '+fuEsc(e.cm)+' · ':''}${e.by?'written by '+fuEsc(e.by)+' · ':''}${fuEsc(w.txt)}${e.due?' · next follow-up '+fuEsc(e.due):''}</div></div>`;
  }).join('');
}
function ntCopy(){
  const list=ntFilter(ntEntries());
  const t='Site\tReason\tNote\tTold by\tStatus\tWritten by\tDate\n'+list.map(e=>[e.site,FUTAG[e.tag]||'',e.reason,e.cm,e.cur?(FUST[e.status]||''):'',e.by,ntWhen(e.at).txt].map(x=>String(x==null?'':x).replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  const say=(m,c)=>{const el=document.getElementById('ntMsg'); if(el){el.textContent=m; el.className='fumsg '+(c||'');}};
  if(!list.length){say('Nothing to copy.','err');return;}
  navigator.clipboard.writeText(t).then(()=>say(list.length+' notes copied. Paste them into Excel.','ok'),()=>say('Could not copy. Allow clipboard access and try again.','err'));
}
document.addEventListener('input',e=>{ if(e.target&&e.target.id==='ntQ'){NT.q=e.target.value; renderNotes();} });
document.addEventListener('change',e=>{ const t=e.target; if(!t) return; if(t.id==='ntSt'){NT.st=t.value; renderNotes();} else if(t.id==='ntTag'){NT.tag=t.value; renderNotes();} });
document.addEventListener('click',e=>{
  const v=e.target.closest('#ntView [data-nt]'); if(v){NT.view=v.dataset.nt; renderNotes(); return;}
  if(e.target.closest('#ntCopy')) ntCopy();
});

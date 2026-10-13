/* ---------- Site Concern follow-ups (shared team notes, needs the db capability) ---------- */
let FUMSG=null, FU={}, FUON=false, FUCAN=true, FUCUR=null, LASTC=null;
const fuId=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
const fuEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FUST={open:'Open',following:'Following up',resolved:'Resolved'};
const fuAgo=iso=>{const d=Math.floor((Date.now()-new Date(iso))/864e5);return d<=0?'today':d===1?'yesterday':d+' days ago';};
function fuChip(n){
  if(!FUON) return '';
  const f=FU[fuId(n)];
  if(!f) return `<span class="fu none">+ Add follow-up</span>`;
  return `<span class="fu ${f.status}">${FUST[f.status]||'Open'}</span>${f.reason?` <span class="fur" data-notr>${fuEsc(f.reason.length>70?f.reason.slice(0,68)+'…':f.reason)}</span>`:''}`;
}
function fuSummary(){
  const el=document.getElementById('fuSum'); if(!el) return;
  if(!FUON||!LASTC){el.hidden=true;return;}
  const c={open:0,following:0,resolved:0,none:0};
  LASTC.forEach(n=>{const f=FU[fuId(n)];c[f?(c[f.status]!=null?f.status:'open'):'none']++;});
  el.hidden=false;
  el.innerHTML=`<b>Follow-up</b> <span class="fu none">${c.none} not started</span> <span class="fu open">${c.open} open</span> <span class="fu following">${c.following} following up</span> <span class="fu resolved">${c.resolved} resolved</span>`;
}
function fuHTML(n){
  const f=FU[fuId(n)]||{}, nm=(()=>{try{return localStorage.getItem('fuName')||'';}catch(e){return '';}})();
  const log=(f.log||[]).map(l=>`<li><b data-notr>${fuEsc(l.by||'—')}</b> · <span class="fu ${l.status}">${FUST[l.status]||'Open'}</span> · <time data-notr>${fuEsc(String(l.at||'').slice(0,10))}</time>${l.cm?` · CM: <span data-notr>${fuEsc(l.cm)}</span>`:''}${l.reason?`<div data-notr>${fuEsc(l.reason)}</div>`:''}</li>`).join('');
  const dis=FUCAN?'':' disabled';
  return `<div class="fubox" id="fuBox"><h4>Follow-up</h4>
   <p class="note">Reason from the CM for this increase. Everyone with edit access sees the same notes.</p>
   <div class="fugrid">
    <label>Status<select id="fuSt"${dis}>${Object.keys(FUST).map(k=>`<option value="${k}"${(f.status||'open')===k?' selected':''}>${FUST[k]}</option>`).join('')}</select></label>
    <label>CM name<input id="fuCm" type="text" maxlength="80" value="${fuEsc(f.cm||'')}" placeholder="Name of the CM"${dis}></label>
    <label>Next follow-up<input id="fuDue" type="date" value="${fuEsc(f.due||'')}"${dis}></label>
    <label>Your name<input id="fuBy" type="text" maxlength="60" value="${fuEsc(nm)}" placeholder="Who is updating"${dis}></label>
   </div>
   <label class="fuw">Reason from the CM<textarea id="fuRs" rows="3" maxlength="800" placeholder="Why is usage up? For example: extra shows, AC schedule changed, renovation, meter issue"${dis}>${fuEsc(f.reason||'')}</textarea></label>
   <div class="fuact"><button type="button" class="fubtn" id="fuSave"${dis}>Save follow-up</button><span class="fumsg ${FUMSG&&FUMSG.n===n?FUMSG.c:''}" id="fuMsg" role="status">${FUMSG&&FUMSG.n===n?FUMSG.t:(FUCAN?'':'You have view-only access, so you cannot edit these notes.')}</span></div>
   ${f.at?`<p class="note">Last updated ${fuAgo(f.at)}${f.by?' by ':''}<span data-notr>${fuEsc(f.by||'')}</span></p>`:''}
   ${log?`<details class="fulog"><summary>History</summary><ul>${log}</ul></details>`:''}</div>`;
}
function fuMount(n){
  FUCUR=n; FUMSG=null; if(!FUON) return;
  document.getElementById('mBody').insertAdjacentHTML('beforeend',fuHTML(n));
  fuWire(n);
}
function fuWire(n){
  const b=document.getElementById('fuSave'); if(!b) return;
  b.addEventListener('click',async()=>{
    const g=id=>document.getElementById(id).value.trim(), m=document.getElementById('fuMsg');
    const by=g('fuBy'); if(!by){m.textContent='Please add your name first.';m.className='fumsg err';document.getElementById('fuBy').focus();return;}
    try{localStorage.setItem('fuName',by);}catch(e){}
    const id=fuId(n), old=FU[id]||{}, at=new Date().toISOString();
    const ent={at,by,status:g('fuSt'),cm:g('fuCm'),reason:g('fuRs')};
    const doc={site:n,status:ent.status,cm:ent.cm,reason:ent.reason,due:g('fuDue'),by,at,log:[ent,...(old.log||[])].slice(0,25)};
    b.disabled=true; m.className='fumsg'; m.textContent='Saving…'; FUMSG=null;
    try{await DB.doc('followups/'+id).set(doc); FUMSG={n,c:'ok',t:'Saved. Your team can see it now.'}; const m2=document.getElementById('fuMsg'); if(m2){m2.textContent=FUMSG.t; m2.className='fumsg ok'; I18N.apply();}}
    catch(e){const c=e&&e.code; m.className='fumsg err'; m.textContent=c==='invalid_argument'?'Not saved: you only have view access. Ask the owner to make you a Contributor.':'Not saved ('+(c||'error')+'). Please try again.';}
    const b2=document.getElementById('fuSave'); if(b2) b2.disabled=false;
  });
}
function fuRefresh(){
  if(LASTC) renderConcern.apply(null,LASTC.args); fuSummary();
  const m=document.getElementById('modal'), box=document.getElementById('fuBox');
  if(m&&!m.hidden&&box&&FUCUR&&!box.contains(document.activeElement)){box.outerHTML=fuHTML(FUCUR);fuWire(FUCUR);I18N.apply();}
}
(async()=>{try{
  if(!window.claude||!claude.use) return;
  const db=await claude.use('db'); if(!db) return; DB=DB||db;
  try{const U=await claude.use('user'); if(U&&U.can&&U.can('data.write')===false) FUCAN=false;}catch(e){}
  DB.collection('followups').onSnapshot(s=>{FU={};s.docs.forEach(d=>{FU[d.id]=d.data();});FUON=true;fuRefresh();},()=>{});
}catch(e){}})();

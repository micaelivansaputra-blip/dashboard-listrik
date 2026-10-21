/* ---------- Site notes: the reason behind a site's usage, for every site.
   Shared with the team through the db capability when the page runs in Claude; otherwise
   kept in this browser (localStorage). ---------- */
let FUMSG=null, FU={}, FUON=true, FUCAN=true, FUCUR=null, LASTC=null, FULOCAL=true;
const FUTAG={extra:'Extra shows / event',ac:'AC schedule or setting',reno:'Renovation / tenant works',meter:'Meter or data issue',weather:'Weather',other:'Other'};
function fuLoadLocal(){try{FU=JSON.parse(localStorage.getItem('followups.v1')||'{}')||{};}catch(e){FU={};}}
function fuSaveLocal(){try{localStorage.setItem('followups.v1',JSON.stringify(FU));return true;}catch(e){return false;}}
fuLoadLocal();
function fuHas(n){const f=FU[fuId(n)];return !!(f&&(f.reason||f.tag));}
function fuCount(){return Object.values(FU).filter(f=>f&&(f.reason||f.tag)).length;}
const fuId=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
const fuEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FUST={open:'Open',following:'Following up',resolved:'Resolved'};
const fuAgo=iso=>{const d=Math.floor((Date.now()-new Date(iso))/864e5);return d<=0?'today':d===1?'yesterday':d+' days ago';};
function fuChip(n){
  if(!FUON) return '';
  const f=FU[fuId(n)];
  if(!f||!(f.reason||f.tag)) return `<span class="fu none">+ Add note</span>`;
  return `${f.tag?`<span class="fu tag">${FUTAG[f.tag]||'Other'}</span>`:''}${f.reason?` <span class="fur" data-notr>${fuEsc(f.reason.length>70?f.reason.slice(0,68)+'…':f.reason)}</span>`:''}`;
}
function fuSummary(){
  const el=document.getElementById('fuSum'); if(!el) return;
  if(!FUON||!LASTC){el.hidden=true;return;}
  const c={open:0,following:0,resolved:0,none:0};
  LASTC.forEach(n=>{const f=FU[fuId(n)];c[(f&&(f.reason||f.tag))?(c[f.status]!=null?f.status:'open'):'none']++;});
  el.hidden=false;
  el.innerHTML=`<b>Notes</b> <span class="fu none">${c.none} without a reason yet</span> <span class="fu open">${c.open} open</span> <span class="fu following">${c.following} following up</span> <span class="fu resolved">${c.resolved} resolved</span>`;
}
function fuHTML(n){
  const f=FU[fuId(n)]||{}, nm=(()=>{try{return localStorage.getItem('fuName')||'';}catch(e){return '';}})();
  const log=(f.log||[]).map(l=>`<li><b data-notr>${fuEsc(l.by||'—')}</b> · <time data-notr>${fuEsc(String(l.at||'').slice(0,10))}</time>${l.tag?` · <span class="fu tag">${FUTAG[l.tag]||'Other'}</span>`:''}${l.cm?` · From: <span data-notr>${fuEsc(l.cm)}</span>`:''}${l.reason?`<div data-notr>${fuEsc(l.reason)}</div>`:''}</li>`).join('');
  const dis=FUCAN?'':' disabled';
  const where=FULOCAL?'Saved in this browser only. Open the dashboard from Claude to share notes with your team.':'Shared: everyone with access sees the same notes.';
  return `<div class="fubox" id="fuBox"><h4>Notes</h4>
   <p class="note">Why is this site up or down? Write the reason you were told. ${where}</p>
   <div class="fugrid">
    <label>Reason<select id="fuTag"${dis}><option value="">Choose a reason</option>${Object.keys(FUTAG).map(k=>`<option value="${k}"${f.tag===k?' selected':''}>${FUTAG[k]}</option>`).join('')}</select></label>
    <label>Told by<input id="fuCm" type="text" maxlength="80" value="${fuEsc(f.cm||'')}" placeholder="CM or person"${dis}></label>
   </div>
   <label class="fuw">Note<textarea id="fuRs" rows="3" maxlength="800" placeholder="For example: extra late shows during the holiday, AC schedule changed on 5 Oct, meter replaced"${dis}>${fuEsc(f.reason||'')}</textarea></label>
   <details class="fumore"${(f.due||(f.status&&f.status!=='open'))?' open':''}><summary>Follow-up status</summary>
    <div class="fugrid">
     <label>Status<select id="fuSt"${dis}>${Object.keys(FUST).map(k=>`<option value="${k}"${(f.status||'open')===k?' selected':''}>${FUST[k]}</option>`).join('')}</select></label>
     <label>Next follow-up<input id="fuDue" type="date" value="${fuEsc(f.due||'')}"${dis}></label>
    </div></details>
   <div class="fugrid"><label>Your name<input id="fuBy" type="text" maxlength="60" value="${fuEsc(nm)}" placeholder="Who is writing this"${dis}></label></div>
   <div class="fuact"><button type="button" class="fubtn" id="fuSave"${dis}>Save note</button>${(f.reason||f.tag)?`<button type="button" class="fubtn ghost" id="fuDel"${dis}>Delete note</button>`:''}<span class="fumsg ${FUMSG&&FUMSG.n===n?FUMSG.c:''}" id="fuMsg" role="status">${FUMSG&&FUMSG.n===n?FUMSG.t:(FUCAN?'':'You have view-only access, so you cannot edit these notes.')}</span></div>
   ${f.at?`<p class="note">Last updated ${fuAgo(f.at)}${f.by?' by ':''}<span data-notr>${fuEsc(f.by||'')}</span></p>`:''}
   ${log?`<details class="fulog"><summary>History</summary><ul>${log}</ul></details>`:''}</div>`;
}
function fuMount(n){
  FUCUR=n; FUMSG=null; if(!FUON) return;
  document.getElementById('mBody').insertAdjacentHTML('beforeend',fuHTML(n));
  fuWire(n);
}
async function fuStore(id,doc){
  if(FULOCAL){ if(doc) FU[id]=doc; else delete FU[id]; if(!fuSaveLocal()) throw {code:'storage'}; fuRefresh(); return; }
  if(doc) await DB.doc('followups/'+id).set(doc); else await DB.doc('followups/'+id).delete();
}
function fuErr(e){const c=e&&e.code; return c==='invalid_argument'?'Not saved: you only have view access. Ask the owner to make you a Contributor.':c==='storage'?'Not saved: this browser blocks storage. Copy the note somewhere safe.':'Not saved ('+(c||'error')+'). Please try again.';}
function fuWire(n){
  const b=document.getElementById('fuSave'); if(!b) return;
  const say=(t,c)=>{const m=document.getElementById('fuMsg'); if(m){m.textContent=t; m.className='fumsg '+(c||'');}};
  b.addEventListener('click',async()=>{
    const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
    const by=g('fuBy'); if(!by){say('Please add your name first.','err');document.getElementById('fuBy').focus();return;}
    if(!g('fuRs')&&!g('fuTag')){say('Choose a reason or write a note first.','err');return;}
    try{localStorage.setItem('fuName',by);}catch(e){}
    const id=fuId(n), old=FU[id]||{}, at=new Date().toISOString();
    const ent={at,by,tag:g('fuTag'),cm:g('fuCm'),reason:g('fuRs')};
    const doc={site:n,tag:ent.tag,status:g('fuSt')||'open',cm:ent.cm,reason:ent.reason,due:g('fuDue'),by,at,log:[ent,...(old.log||[])].slice(0,25)};
    b.disabled=true; say('Saving…'); FUMSG=null;
    try{await fuStore(id,doc); FUMSG={n,c:'ok',t:FULOCAL?'Saved in this browser.':'Saved. Your team can see it now.'}; say(FUMSG.t,'ok'); const bx=document.getElementById('fuBox'); if(bx&&FULOCAL){bx.outerHTML=fuHTML(n);fuWire(n);} I18N.apply();}
    catch(e){say(fuErr(e),'err');}
    const b2=document.getElementById('fuSave'); if(b2) b2.disabled=false;
  });
  const d=document.getElementById('fuDel');
  if(d) d.addEventListener('click',async()=>{
    if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to delete';setTimeout(()=>{if(d.isConnected){d.dataset.sure='';d.textContent='Delete note';}},4000);return;}
    try{await fuStore(fuId(n),null); FUMSG={n,c:'ok',t:'Note deleted.'}; if(FULOCAL){const bx=document.getElementById('fuBox'); if(bx){bx.outerHTML=fuHTML(n);fuWire(n);}} I18N.apply();}
    catch(e){say(fuErr(e),'err');}
  });
}
function fuRefresh(){
  if(typeof renderNotes==='function'){try{renderNotes();}catch(e){}}
  if(LASTC) renderConcern.apply(null,LASTC.args); fuSummary();
  if(typeof renderSites==='function'&&typeof selected==='function'){try{renderSites(selected());}catch(e){}}
  const m=document.getElementById('modal'), box=document.getElementById('fuBox');
  if(m&&!m.hidden&&box&&FUCUR&&!box.contains(document.activeElement)){box.outerHTML=fuHTML(FUCUR);fuWire(FUCUR);I18N.apply();}
}
/* copy every note as tab-separated text, ready to paste into Excel */
function fuCopyAll(){
  const rows=Object.values(FU).filter(f=>f&&(f.reason||f.tag)).sort((a,b)=>String(a.site).localeCompare(b.site));
  const t='Site\tReason\tNote\tTold by\tStatus\tUpdated\tBy\n'+rows.map(f=>[f.site,FUTAG[f.tag]||'',f.reason||'',f.cm||'',FUST[f.status]||'',String(f.at||'').slice(0,10),f.by||''].map(x=>String(x).replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  return navigator.clipboard.writeText(t).then(()=>rows.length);
}
(async()=>{try{
  if(!window.claude||!claude.use) return;
  const db=await claude.use('db'); if(!db) return; DB=DB||db;
  try{const U=await claude.use('user'); if(U&&U.can&&U.can('data.write')===false) FUCAN=false;}catch(e){}
  DB.collection('followups').onSnapshot(s=>{FULOCAL=false;FU={};s.docs.forEach(d=>{FU[d.id]=d.data();});fuRefresh();},()=>{});
}catch(e){}})();

/* ---------- Site notes: the reason behind a site's usage, for every site.
   Shared with the team through the db capability when the page runs in Claude; otherwise
   kept in this browser (localStorage). ---------- */
let FUPIC=[], FUMSG=null, FU={}, FUON=true, FUCAN=true, FUCUR=null, LASTC=null, FULOCAL=true;
const FUTAG={extra:'Extra shows / event',ac:'AC schedule or setting',reno:'Renovation / tenant works',meter:'Meter or data issue',weather:'Weather',other:'Other'};
function fuLoadLocal(){try{FU=JSON.parse(localStorage.getItem('followups.v1')||'{}')||{};}catch(e){FU={};}}
function fuSaveLocal(){try{localStorage.setItem('followups.v1',JSON.stringify(FU));return true;}catch(e){return false;}}
fuLoadLocal();
const FUMAXPIC=3, FUMAXBYTES=700000;
const fuId=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
const fuEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* A site has many notes. Each: {id, at (saved), date (optional, YYYY-MM-DD), by, tag, cm, reason}. Older single-note data still reads fine. */
const fuLocalDay=iso=>{const d=new Date(iso); if(isNaN(d)) return ''; return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fuEff=x=>x.date||fuLocalDay(x.at)||'';
function fuNotes(f){
  if(!f) return [];
  let l=Array.isArray(f.notes)?f.notes:(Array.isArray(f.log)&&f.log.length?f.log:((f.reason||f.tag)?[f]:[]));
  l=l.filter(x=>x&&(x.reason||x.tag||(x.imgs&&x.imgs.length))).map((x,i)=>({id:x.id||('o'+(x.at||'')+i),at:x.at||f.at||'',date:x.date||'',by:x.by||'',tag:x.tag||'',cm:x.cm||'',reason:x.reason||'',imgs:Array.isArray(x.imgs)?x.imgs.filter(u=>typeof u==='string'&&u.indexOf('data:image/')===0).slice(0,FUMAXPIC):[]}));
  return l.sort((a,b)=>fuEff(b).localeCompare(fuEff(a))||String(b.at).localeCompare(String(a.at)));
}
const fuLatest=n=>fuNotes(FU[fuId(n)])[0]||null;
function fuHas(n){return fuNotes(FU[fuId(n)]).length>0;}
function fuCount(){return Object.values(FU).filter(f=>fuNotes(f).length).length;}
const fuDay=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(d||''); return m?(+m[3])+' '+MN[+m[2]-1]+' '+m[1]:'';};
const FUST={open:'Open',following:'Following up',resolved:'Resolved'};
const fuAgo=iso=>{const d=Math.floor((Date.now()-new Date(iso))/864e5);return d<=0?'today':d===1?'yesterday':d+' days ago';};
function fuChip(n){
  if(!FUON) return '';
  const l=fuNotes(FU[fuId(n)]), f=l[0];
  if(!f) return `<span class="fu none">+ Add note</span>`;
  return `${f.tag?`<span class="fu tag">${FUTAG[f.tag]||'Other'}</span>`:''}${f.reason?` <span class="fur" data-notr>${fuEsc(f.reason.length>70?f.reason.slice(0,68)+'…':f.reason)}</span>`:''}${f.imgs&&f.imgs.length?` <span class="fu more">${f.imgs.length} photo${f.imgs.length>1?'s':''}</span>`:''}${l.length>1?` <span class="fu more">+${l.length-1} more</span>`:''}`;
}
function fuSummary(){
  const el=document.getElementById('fuSum'); if(!el) return;
  if(!FUON||!LASTC){el.hidden=true;return;}
  const c={open:0,following:0,resolved:0,none:0};
  LASTC.forEach(n=>{const f=FU[fuId(n)];c[fuNotes(f).length?(c[f.status]!=null?f.status:'open'):'none']++;});
  el.hidden=false;
  el.innerHTML=`<b>Notes</b> <span class="fu none">${c.none} without a reason yet</span> <span class="fu open">${c.open} open</span> <span class="fu following">${c.following} following up</span> <span class="fu resolved">${c.resolved} resolved</span>`;
}

/* Pictures: shrunk in the browser (about 1000 px, JPEG) so a few fit in a note without a file store. Up to 3 per note. */
function fuShrink(file){
  return new Promise((ok,no)=>{
    const u=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{try{
      let mx=1000,q=.72,out='';
      for(let i=0;i<4;i++){
        const k=Math.min(1,mx/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k));
        const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height);
        out=c.toDataURL('image/jpeg',q); if(out.length<110000) break; mx*=.8; q-=.08;
      }
      URL.revokeObjectURL(u); ok(out);
    }catch(e){URL.revokeObjectURL(u);no(e);}};
    im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('image'));};
    im.src=u;
  });
}
function fuThumbs(imgs){return imgs&&imgs.length?`<div class="fupics">${imgs.map((u,i)=>`<button type="button" class="fupic" data-fuimg="${i}" aria-label="Open picture ${i+1}"><img src="${u}" alt="Picture ${i+1}" loading="lazy"></button>`).join('')}</div>`:'';}
function fuLight(imgs,i){
  let o=document.getElementById('fuLight'); if(o) o.remove();
  o=document.createElement('div'); o.id='fuLight'; o.className='fulight'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Picture');
  let k=i; const draw=()=>{o.innerHTML=`<img src="${imgs[k]}" alt="Picture ${k+1} of ${imgs.length}"><button type="button" class="fulx" aria-label="Close">×</button>${imgs.length>1?`<button type="button" class="fuln" data-d="-1" aria-label="Previous">‹</button><button type="button" class="fuln r" data-d="1" aria-label="Next">›</button><span class="fulc">${k+1} / ${imgs.length}</span>`:''}`;};
  draw(); document.body.appendChild(o);
  const close=()=>{o.remove();document.removeEventListener('keydown',kd,true);};
  const kd=e=>{if(e.key==='Escape'){e.stopPropagation();close();}else if(e.key==='ArrowRight'){k=(k+1)%imgs.length;draw();}else if(e.key==='ArrowLeft'){k=(k-1+imgs.length)%imgs.length;draw();}};
  document.addEventListener('keydown',kd,true);
  o.addEventListener('click',e=>{e.stopPropagation();const n=e.target.closest('.fuln'); if(n){k=(k+ +n.dataset.d+imgs.length)%imgs.length;draw();return;} if(e.target.tagName!=='IMG') close();});
}
let FUEDIT=null;
function fuItem(x,dis){
  return `<li class="funote" data-id="${fuEsc(x.id)}"><div class="funh"><b>${fuEsc(fuDay(fuEff(x)))}</b>${x.tag?`<span class="fu tag">${FUTAG[x.tag]||'Other'}</span>`:''}<span class="funa"><button type="button" class="linkbtn" data-fuedit="${fuEsc(x.id)}"${dis}>Edit</button><button type="button" class="linkbtn" data-fudel="${fuEsc(x.id)}"${dis}>Delete</button></span></div>
   ${x.reason?`<div class="funt" data-notr>${fuEsc(x.reason)}</div>`:''}${fuThumbs(x.imgs)}
   <div class="funm" data-notr>${x.cm?'Told by '+fuEsc(x.cm)+' · ':''}${x.by?'written by '+fuEsc(x.by):''}${x.date&&fuLocalDay(x.at)!==x.date&&x.at?' · saved '+fuEsc(fuDay(fuLocalDay(x.at))):''}</div></li>`;
}
function fuHTML(n){
  const f=FU[fuId(n)]||{}, nm=(()=>{try{return localStorage.getItem('fuName')||'';}catch(e){return '';}})();
  const list=fuNotes(f), ed=FUEDIT&&list.find(x=>x.id===FUEDIT)||null, v=ed||{};
  const dis=FUCAN?'':' disabled';
  const where=FULOCAL?'Saved in this browser only. Open the dashboard from Claude to share notes with your team.':'Shared: everyone with access sees the same notes.';
  return `<div class="fubox" id="fuBox"><h4>Notes${list.length?` <span class="fu none">${list.length}</span>`:''}</h4>
   <p class="note">Why is this site up or down? Add a note each time you hear something new. ${where}</p>
   ${list.length?`<ul class="funotes">${list.map(x=>fuItem(x,dis)).join('')}</ul>`:''}
   <div class="fuform"><h5>${ed?'Edit note':(list.length?'Add another note':'Add a note')}</h5>
   <div class="fugrid">
    <label>Reason<select id="fuTag"${dis}><option value="">Choose a reason</option>${Object.keys(FUTAG).map(k=>`<option value="${k}"${v.tag===k?' selected':''}>${FUTAG[k]}</option>`).join('')}</select></label>
    <label>Told by<input id="fuCm" type="text" maxlength="80" value="${fuEsc(v.cm||'')}" placeholder="CM or person"${dis}></label>
    <label>Date (optional)<input id="fuDate" type="date" value="${fuEsc(v.date||'')}"${dis}></label>
   </div>
   <p class="note" style="margin:-4px 0 6px">Leave the date empty to use today.</p>
   <label class="fuw">Note<textarea id="fuRs" rows="3" maxlength="800" placeholder="For example: extra late shows during the holiday, AC schedule changed on 5 Oct, meter replaced"${dis}>${fuEsc(v.reason||'')}</textarea></label>
   <div class="fupick"><div class="fupt">Pictures <small>(optional, up to ${FUMAXPIC}; shrunk to save space)</small></div>
    <div class="fupics" id="fuPics">${FUPIC.map((u,i)=>`<span class="fupic"><img src="${u}" alt="Picture ${i+1}"><button type="button" class="fupx" data-fuprm="${i}" aria-label="Remove picture ${i+1}"${dis}>×</button></span>`).join('')}${FUPIC.length<FUMAXPIC?`<label class="fupadd">+ Add picture<input type="file" id="fuFile" accept="image/*" multiple hidden${dis}></label>`:''}</div></div>
   <div class="fugrid"><label>Your name<input id="fuBy" type="text" maxlength="60" value="${fuEsc(ed?(v.by||nm):nm)}" placeholder="Who is writing this"${dis}></label></div>
   <div class="fuact"><button type="button" class="fubtn" id="fuSave"${dis}>${ed?'Save changes':'Add note'}</button>${ed?`<button type="button" class="fubtn ghost" id="fuCancel">Cancel</button>`:''}<span class="fumsg ${FUMSG&&FUMSG.n===n?FUMSG.c:''}" id="fuMsg" role="status">${FUMSG&&FUMSG.n===n?FUMSG.t:(FUCAN?'':'You have view-only access, so you cannot edit these notes.')}</span></div></div>
   ${list.length?`<details class="fumore"${(f.due||(f.status&&f.status!=='open'))?' open':''}><summary>Follow-up status of this site</summary>
    <div class="fugrid">
     <label>Status<select id="fuSt"${dis}>${Object.keys(FUST).map(k=>`<option value="${k}"${(f.status||'open')===k?' selected':''}>${FUST[k]}</option>`).join('')}</select></label>
     <label>Next follow-up<input id="fuDue" type="date" value="${fuEsc(f.due||'')}"${dis}></label>
    </div><div class="fuact"><button type="button" class="fubtn ghost" id="fuStSave"${dis}>Save status</button></div></details>`:''}</div>`;
}
function fuMount(n){
  FUCUR=n; FUMSG=null; FUEDIT=null; FUPIC=[]; if(!FUON) return;
  document.getElementById('mBody').insertAdjacentHTML('beforeend',fuHTML(n));
  fuWire(n);
}
async function fuStore(id,doc){
  if(FULOCAL){ if(doc) FU[id]=doc; else delete FU[id]; if(!fuSaveLocal()) throw {code:'storage'}; fuRefresh(); return; }
  if(doc) await DB.doc('followups/'+id).set(doc); else await DB.doc('followups/'+id).delete();
}
function fuErr(e){const c=e&&e.code; if(c==='toobig') return 'Not saved: this site already has many pictures. Delete an old picture or note first.'; return c==='invalid_argument'?'Not saved: you only have view access. Ask the owner to make you a Contributor.':c==='storage'?'Not saved: this browser blocks storage. Copy the note somewhere safe.':'Not saved ('+(c||'error')+'). Please try again.';}
function fuWire(n){
  const box=document.getElementById('fuBox'); if(!box) return;
  const say=(t,c)=>{const m=document.getElementById('fuMsg'); if(m){m.textContent=t; m.className='fumsg '+(c||'');}};
  const redraw=()=>{const bx=document.getElementById('fuBox'); if(bx){bx.outerHTML=fuHTML(n);fuWire(n);} I18N.apply();};
  const id=fuId(n);
  /* save the whole site doc with a new notes list */
  const put=async(notes,extra,msg)=>{
    const old=FU[id]||{}, nn=notes.slice(0,200);
    if(nn.reduce((t,x)=>t+(x.imgs||[]).reduce((a,u)=>a+u.length,0),0)>FUMAXBYTES) throw {code:'toobig'};
    if(!nn.length){await fuStore(id,null);}
    else{const top=nn.slice().sort((a,b)=>fuEff(b).localeCompare(fuEff(a))||String(b.at).localeCompare(String(a.at)))[0];
      await fuStore(id,Object.assign({site:n,status:old.status||'open',due:old.due||'',tag:top.tag,cm:top.cm,reason:top.reason,by:top.by,at:top.at,notes:nn},extra||{}));}
    FUMSG={n,c:'ok',t:msg}; say(msg,'ok');
  };
  const b=document.getElementById('fuSave');
  b.addEventListener('click',async()=>{
    const g=k=>{const e=document.getElementById(k);return e?e.value.trim():'';};
    const by=g('fuBy'); if(!by){say('Please add your name first.','err');document.getElementById('fuBy').focus();return;}
    if(!g('fuRs')&&!g('fuTag')&&!FUPIC.length){say('Choose a reason, write a note or add a picture first.','err');return;}
    try{localStorage.setItem('fuName',by);}catch(e){}
    const cur=fuNotes(FU[id]);
    const ent={id:FUEDIT||('n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)),at:new Date().toISOString(),date:g('fuDate'),by,tag:g('fuTag'),cm:g('fuCm'),reason:g('fuRs'),imgs:FUPIC.slice(0,FUMAXPIC)};
    let list;
    if(FUEDIT){const o=cur.find(x=>x.id===FUEDIT); if(o) ent.at=o.at||ent.at; list=cur.map(x=>x.id===FUEDIT?ent:x);} else list=[ent,...cur];
    b.disabled=true; say('Saving…'); FUMSG=null;
    try{await put(list,null,FUEDIT?'Changes saved.':(FULOCAL?'Note added. Saved in this browser.':'Note added. Your team can see it now.')); FUEDIT=null; FUPIC=[]; redraw();}
    catch(e){say(fuErr(e),'err');}
    const b2=document.getElementById('fuSave'); if(b2) b2.disabled=false;
  });
  box.addEventListener('change',async e=>{
    const fi=e.target.closest&&e.target.closest('#fuFile'); if(!fi) return;
    const files=[...fi.files].slice(0,FUMAXPIC-FUPIC.length); fi.value='';
    if(!files.length) return; say('Preparing picture…');
    const sv={}; try{for(const f of files){ if(!/^image\//.test(f.type)) continue; FUPIC.push(await fuShrink(f)); }}catch(er){say('Could not read that picture. Try a JPG or PNG.','err'); }
    const keep=['fuTag','fuCm','fuDate','fuBy','fuRs']; keep.forEach(k=>{const el=document.getElementById(k);sv[k]=el?el.value:'';});
    redraw(); keep.forEach(k=>{const el=document.getElementById(k); if(el) el.value=sv[k];});
  });
  const cn=document.getElementById('fuCancel'); if(cn) cn.addEventListener('click',()=>{FUEDIT=null;FUPIC=[];FUMSG=null;redraw();});
  const ss=document.getElementById('fuStSave');
  if(ss) ss.addEventListener('click',async()=>{
    const cur=fuNotes(FU[id]); if(!cur.length) return;
    try{await put(cur,{status:document.getElementById('fuSt').value||'open',due:document.getElementById('fuDue').value||''},'Status saved.'); redraw();}
    catch(e){say(fuErr(e),'err');}
  });
  box.addEventListener('click',async e=>{
    const pr=e.target.closest('[data-fuprm]'), pv=e.target.closest('.funote [data-fuimg]');
    if(pr){FUPIC.splice(+pr.dataset.fuprm,1); const t=document.getElementById('fuRs'),v0=t?t.value:''; const sv={};['fuTag','fuCm','fuDate','fuBy'].forEach(k=>{const el=document.getElementById(k);sv[k]=el?el.value:'';}); redraw(); Object.keys(sv).forEach(k=>{const el=document.getElementById(k); if(el) el.value=sv[k];}); const t2=document.getElementById('fuRs'); if(t2) t2.value=v0; return;}
    if(pv){const li=pv.closest('.funote'), nt=fuNotes(FU[id]).find(x=>x.id===li.dataset.id); if(nt) fuLight(nt.imgs,+pv.dataset.fuimg); return;}
    const ed=e.target.closest('[data-fuedit]'), dl=e.target.closest('[data-fudel]');
    if(ed){FUEDIT=ed.dataset.fuedit; FUMSG=null; const cn0=fuNotes(FU[id]).find(x=>x.id===FUEDIT); FUPIC=cn0?cn0.imgs.slice():[]; redraw(); const t=document.getElementById('fuRs'); if(t) t.focus(); return;}
    if(dl){
      if(dl.dataset.sure!=='1'){dl.dataset.sure='1';dl.textContent='Tap again to delete';setTimeout(()=>{if(dl.isConnected){dl.dataset.sure='';dl.textContent='Delete';}},4000);return;}
      try{const cur=fuNotes(FU[id]).filter(x=>x.id!==dl.dataset.fudel); if(FUEDIT===dl.dataset.fudel) FUEDIT=null; await put(cur,null,'Note deleted.'); redraw();}
      catch(er){say(fuErr(er),'err');}
    }
  });
}
function fuRefresh(){
  if(typeof renderNotes==='function'){try{renderNotes();}catch(e){}}
  if(typeof renderTrack==='function'){try{renderTrack();}catch(e){}}
  if(LASTC) renderConcern.apply(null,LASTC.args); fuSummary();
  if(typeof renderSites==='function'&&typeof selected==='function'){try{renderSites(selected());}catch(e){}}
  const m=document.getElementById('modal'), box=document.getElementById('fuBox');
  if(m&&!m.hidden&&box&&FUCUR&&!FUEDIT&&!box.contains(document.activeElement)){box.outerHTML=fuHTML(FUCUR);fuWire(FUCUR);I18N.apply();}
}
/* copy every note as tab-separated text, ready to paste into Excel */
function fuCopyAll(){
  const rows=[]; Object.values(FU).forEach(f=>{if(f&&f.site) fuNotes(f).forEach(x=>rows.push({f,x}));});
  rows.sort((a,b)=>String(a.f.site).localeCompare(b.f.site)||fuEff(b.x).localeCompare(fuEff(a.x)));
  const t='Site\tDate\tReason\tNote\tTold by\tStatus\tWritten by\n'+rows.map(({f,x})=>[f.site,fuEff(x),FUTAG[x.tag]||'',x.reason,x.cm,FUST[f.status]||'',x.by].map(v=>String(v==null?'':v).replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  return navigator.clipboard.writeText(t).then(()=>rows.length);
}
(async()=>{try{
  if(!window.claude||!claude.use) return;
  const db=await claude.use('db'); if(!db) return; DB=DB||db;
  try{const U=await claude.use('user'); if(U&&U.can&&U.can('data.write')===false) FUCAN=false;}catch(e){}
  DB.collection('followups').onSnapshot(s=>{FULOCAL=false;FU={};s.docs.forEach(d=>{FU[d.id]=d.data();});fuRefresh();},()=>{});
}catch(e){}})();

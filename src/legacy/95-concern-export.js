/* ---------- Site Concern: email-ready image (PNG) ----------
   Drawn on a canvas so the picture is crisp and always light, whatever theme the page is in.
   Download saves a PNG; Copy puts the image on the clipboard, ready to paste into an email body. */
const CX={rows:5,notes:false,capNotes:true,capTrend:false,savN:3,capSave:true,lang:'id',edited:false};
const cxFont='Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
function cxDate(){const l=(DATA.meta&&DATA.meta.last)||''; const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(l); if(!m) return ''; return (+m[3])+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1]+' '+m[1];}
function cxWrap(ctx,text,maxW){const out=[];let line='';String(text).split(/\s+/).forEach(w=>{const t=line?line+' '+w:w; if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}); if(line) out.push(line); return out;}
function cxRR(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function cxDraw(cv,rows,opt,sav){
  sav=sav||[];
  const S=2, W=880, X=32, CW=W-X*2;
  const C={ink:'#1D1D1F',mut:'#6E6E73',soft:'#F5F5F7',track:'#E3E3E8',base:'#AFC0D8',red:'#FF3B30',amb:'#FF9F0A',up:'#D70015',upS:'#FFEFED',am:'#B26A00',amS:'#FFF3DD',blue:'#0071E3',blueS:'#E8F2FD',dn:'#1B7F37'};
  const tmp=document.createElement('canvas').getContext('2d'); tmp.font='400 13.5px '+cxFont;
  const lay=rows.map(r=>{const f=FU[fuId(r.s.n)]; const has=opt.notes&&f&&(f.reason||f.tag); const lines=has&&f.reason?cxWrap(tmp,f.reason,CW-54-24-8).slice(0,3):[]; const nh=has?(f.tag?28:0)+lines.length*19+8:0; return {r,f:has?f:null,lines,h:100+nh};});
  const m=CMETA, heroH=200, listTop=heroH+X+64, foot=110;
  const svH=sav.length?60+sav.length*84:0;
  const H=listTop+(lay.length?lay.reduce((t,l)=>t+l.h+12,0):70)+svH+foot;
  cv.width=W*S; cv.height=H*S; const ctx=cv.getContext('2d'); ctx.scale(S,S); ctx.textBaseline='alphabetic';
  ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,H);
  const T=(t,x,y,font,color,al)=>{ctx.font=font;ctx.fillStyle=color;ctx.textAlign=al||'left';ctx.fillText(t,x,y);};
  const sg=v=>(v>=0?'+':'−')+Math.abs(v*100).toFixed(1)+'%';
  // hero
  const g=ctx.createLinearGradient(X,X,X+CW,X+heroH); g.addColorStop(0,'#0A84FF'); g.addColorStop(1,'#5E5CE6');
  ctx.fillStyle=g; cxRR(ctx,X,X,CW,heroH,26); ctx.fill();
  T('SITE CONCERN · ELECTRICITY',X+28,X+40,'700 12px '+cxFont,'rgba(255,255,255,.78)');
  T('Sites above their kWh budget',X+28,X+76,'800 28px '+cxFont,'#FFFFFF');
  T('Daily usage vs FY2026 budget · data through '+cxDate()+' · '+m.n+' sites',X+28,X+100,'500 13.5px '+cxFont,'rgba(255,255,255,.85)');
  const tw=(CW-56-24)/3, ty=X+122, th=58, tile=(i,lab,val,sub,hl)=>{const x=X+28+i*(tw+12); ctx.fillStyle=hl?'#FFFFFF':'rgba(255,255,255,.18)'; cxRR(ctx,x,ty,tw,th,16); ctx.fill(); T(lab,x+16,ty+20,'700 11px '+cxFont,hl?C.mut:'rgba(255,255,255,.8)'); T(val,x+16,ty+43,'800 21px '+cxFont,hl?(m.tp>CT.lo?C.up:m.tp<-CT.lo?C.dn:C.ink):'#FFFFFF'); if(sub) T(sub,x+tw-14,ty+43,'600 12px '+cxFont,hl?C.mut:'rgba(255,255,255,.85)','right');};
  tile(0,'BUDGET kWh/DAY',fmt(m.tb),'');
  tile(1,'ACTUAL kWh/DAY',fmt(m.ta),'');
  tile(2,'VS BUDGET',sg(m.tp),(m.ta>=m.tb?'+':'−')+fmt(Math.abs(m.ta-m.tb))+'/day',true);
  // list heading
  let y=X+heroH+24;
  T('Top '+rows.length+' sites over budget',X,y+22,'800 18px '+cxFont,C.ink);
  T(m.nOver+' of '+m.n+' sites are more than 5% over · ranked by kWh/day above budget',X+CW,y+22,'500 12.5px '+cxFont,C.mut,'right');
  y=listTop;
  if(!lay.length) T('No site is more than 5% above its budget.',X,y+30,'500 15px '+cxFont,C.mut);
  const mx=Math.max(...rows.map(r=>Math.max(r.act,r.bud)),1), bx=X+54, bw=440;
  lay.forEach((L,i)=>{
    const r=L.r, hi=r.lv==='hi', col=hi?C.red:C.amb, top=y;
    ctx.fillStyle=C.soft; cxRR(ctx,X,y,CW,L.h,20); ctx.fill();
    ctx.fillStyle=hi?C.upS:C.amS; ctx.beginPath(); ctx.arc(X+26,y+34,14,0,7); ctx.fill(); T(String(i+1),X+26,y+39,'800 13px '+cxFont,hi?C.up:C.am,'center');
    T(short(r.s.n)+(r.s.partial?' *':''),bx,y+34,'700 17px '+cxFont,C.ink);
    T(r.s.r+'  ·  Budget '+fmt(r.bud)+'  →  Actual '+fmt(r.act)+' kWh/day',bx,y+54,'500 12.5px '+cxFont,C.mut);
    // bar: budget part, then the part above budget
    ctx.fillStyle=C.track; cxRR(ctx,bx,y+68,bw,10,5); ctx.fill();
    const wb=Math.max(6,bw*Math.min(r.bud,r.act)/mx), wa=bw*r.act/mx;
    ctx.fillStyle=C.base; cxRR(ctx,bx,y+68,wb,10,5); ctx.fill();
    ctx.save(); cxRR(ctx,bx,y+68,wa,10,5); ctx.clip(); ctx.fillStyle=col; ctx.fillRect(bx+bw*r.bud/mx,y+68,wa,10); ctx.restore();
    ctx.fillStyle=C.ink; ctx.fillRect(bx+bw*r.bud/mx-1,y+64,2,18);
    // right: how much per day, and the % vs budget
    const rx=X+CW-24;
    T('+'+fmt(r.ex),rx,y+42,'800 28px '+cxFont,C.ink,'right'); T('kWh/day over budget',rx,y+60,'500 12px '+cxFont,C.mut,'right');
    const pt=sg(r.p)+' vs budget'; ctx.font='700 12px '+cxFont; const pw=ctx.measureText(pt).width+22; ctx.fillStyle=hi?C.upS:C.amS; cxRR(ctx,rx-pw,y+68,pw,24,12); ctx.fill(); T(pt,rx-pw/2,y+84,'700 12px '+cxFont,hi?C.up:C.am,'center');
    let yy=y+112;
    if(L.f){
      if(L.f.tag){const tg=FUTAG[L.f.tag]||'Other'; ctx.font='700 12px '+cxFont; const w=ctx.measureText(tg).width+20; ctx.fillStyle=C.blueS; cxRR(ctx,bx,yy-14,w,22,11); ctx.fill(); T(tg,bx+10,yy+1,'700 12px '+cxFont,C.blue); if(L.f.cm) T('told by '+L.f.cm,bx+w+10,yy+1,'500 12px '+cxFont,C.mut); yy+=28;}
      L.lines.forEach(t=>{T(t,bx,yy-4,'400 13.5px '+cxFont,C.ink); yy+=19;});
    }
    y=top+L.h+12;
  });
  // saving sites
  if(sav.length){
    const gS='#E8F8ED', gC='#1B7F37', gB='#34C759';
    y+=14; T('Saving vs budget · congrats!',X,y+22,'800 18px '+cxFont,C.ink);
    T(m.nSave+' site'+(m.nSave===1?'':'s')+' more than 5% below budget',X+CW,y+22,'500 12.5px '+cxFont,C.mut,'right');
    y+=40;
    sav.forEach((r,i)=>{
      ctx.fillStyle=gS; cxRR(ctx,X,y,CW,72,20); ctx.fill();
      T('✓',X+26,y+42,'800 16px '+cxFont,gC,'center');
      T(short(r.s.n)+(r.s.partial?' *':''),bx,y+31,'700 17px '+cxFont,C.ink);
      T(r.s.r+'  ·  Budget '+fmt(r.bud)+'  →  Actual '+fmt(r.act)+' kWh/day',bx,y+52,'500 12.5px '+cxFont,C.mut);
      const rx=X+CW-24;
      T('−'+fmt(-r.ex),rx,y+36,'800 26px '+cxFont,gC,'right'); T('kWh/day below budget · '+sg(r.p),rx,y+55,'600 12px '+cxFont,C.mut,'right');
      y+=84;
    });
  }
  // footer
  const fl=cxWrap(ctx,'Budget kWh/day = FY2026 monthly budget ÷ days in the month. The black tick on each bar is the budget; the colored part is usage above it. Red: more than 10% over budget. Yellow: 5 to 10% over. '+(m.n-m.nOver)+' of '+m.n+' sites are within 5% of budget or below.'+((rows.concat(sav)).some(r=>r.s.partial)?' * Partial data for this site.':''),CW);
  ctx.font='400 12px '+cxFont; fl.forEach((t,k)=>T(t,X,y+18+k*17,'400 12px '+cxFont,C.mut));
  T('Operations · Electricity monitoring',X,y+18+fl.length*17+12,'600 11.5px '+cxFont,'#9A9AA1');
}

/* ---------- caption to send together with the image ---------- */
function cxCaption(){
  const rows=CROWS.slice(0,CX.rows), m=CMETA, id=CX.lang==='id'; if(!m||!m.n) return '';
  const nf=v=>Math.round(v).toLocaleString(id?'id-ID':'en-US'), pf=v=>(v>=0?'+':'−')+Math.abs(v*100).toFixed(0)+'%';
  const l=(DATA.meta&&DATA.meta.last)||'', mm=/^(\d{4})-(\d\d)-(\d\d)$/.exec(l);
  const MO=id?['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dt=mm?(+mm[3])+' '+MO[+mm[2]-1]+' '+mm[1]:'';
  const TGI={extra:'Tambahan jam tayang / acara',ac:'Jadwal atau setelan AC',reno:'Renovasi / pekerjaan tenant',meter:'Masalah meter atau data',weather:'Cuaca',other:'Lainnya'};
  const L=[];
  const h=new Date().getHours(), sal=id?(h<11?'Pagi':h<15?'Siang':h<18?'Sore':'Malam'):(h<12?'Good morning':h<18?'Good afternoon':'Good evening');
  L.push(id?sal+' kakak-kakak RM,':sal+', everyone,'); L.push('');
  L.push(id?`Berikut untuk site yang penggunaan listriknya di atas budget (per ${dt}):`:`Here are the sites with electricity usage above budget (as of ${dt}):`); L.push('');
  rows.forEach((r,i)=>{
    const pc=Math.abs(r.p*100).toFixed(0);
    L.push(`${i+1}. ${short(r.s.n)} (${r.s.r}): +${nf(r.ex)} kWh/${id?'hari':'day'} (+${pc}%)${CX.capTrend?(r.tr==='up'?' ↑':r.tr==='down'?' ↓':''):''}`);
    if(CX.capTrend&&r.spike){L.push('    '+(id?`${dt.replace(/ \d{4}$/,'')}: ${nf(r.last)} kWh (${pf(r.pl)} dari budget), lonjakan`:`${dt.replace(/ \d{4}$/,'')}: ${nf(r.last)} kWh (${pf(r.pl)} vs budget), spike`));}
    const f=CX.capNotes&&FU[fuId(r.s.n)]; if(f&&(f.reason||f.tag)){const tg=f.tag?((id?TGI[f.tag]:FUTAG[f.tag])||''):''; L.push('    '+(id?'Alasan: ':'Reason: ')+[tg,f.reason].filter(Boolean).join(' – ')+(f.cm?' ('+f.cm+')':''));}
  });
  if(CX.capTrend&&rows.some(r=>r.tr!=='flat')){L.push(''); L.push(id?'↑ masih naik, ↓ mulai turun (7 hari terakhir)':'↑ still rising, ↓ easing (last 7 days)');}
  L.push('');
  const sv=CX.capSave?CSAVE.slice(0,CX.savN||3):[];
  if(!sv.length){ L.push(id?'Mohon bantuannya untuk follow up-nya ya kak, terima kasih.':'Please help follow up, thank you.'); return L.join('\n'); }
  L.push(id?'Mohon bantuannya untuk follow up-nya ya kak 🙏':'Please help follow up on these 🙏'); L.push('');
  L.push(id?'Selamat juga untuk site yang berhasil hemat dari budget 🎉':'And congrats to the sites saving against budget 🎉'); L.push('');
  sv.forEach((r,i)=>L.push(`${i+1}. ${short(r.s.n)} (${r.s.r}): −${nf(-r.ex)} kWh/${id?'hari':'day'} (−${Math.abs(r.p*100).toFixed(0)}%)`));
  L.push(''); L.push(id?'Terima kasih kak, pertahankan ya!':'Thank you, keep it up!');
  return L.join('\n');
}
function cxCapRender(force){const t=document.getElementById('cxCap'); if(!t) return; if(CX.edited&&!force) return; CX.edited=false; t.value=cxCaption();}
async function cxCopyCap(){
  const t=document.getElementById('cxCap'); if(!t) return;
  try{ await navigator.clipboard.writeText(t.value); cxMsg('Caption copied.','ok','cxCapMsg'); }
  catch(e){ t.focus(); t.select(); try{ document.execCommand('copy'); cxMsg('Caption copied.','ok','cxCapMsg'); }catch(x){ cxMsg('Select the text and copy it.','err','cxCapMsg'); } }
}
function cxRender(){
  const cv=document.getElementById('cxCv'); if(!cv||!(CROWS.length||CSAVE.length)) return;
  const go=()=>{try{cxDraw(cv,CROWS.slice(0,CX.rows),CX,CSAVE.slice(0,CX.savN));}catch(e){}};
  go(); cxCapRender(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(go);
}
function cxBlob(){const cv=document.getElementById('cxCv'); return new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('blob')),'image/png'));}
function cxMsg(t,c,id){const m=document.getElementById(id||'cxMsg'); if(m){m.textContent=t;m.className='fumsg '+(c||'');}}
async function cxDownload(){
  const name='site-concern-'+((DATA.meta&&DATA.meta.last)||'latest')+'.png';
  try{
    const b=await cxBlob(); let dl=null;
    try{ if(window.claude&&claude.use) dl=await claude.use('downloads'); }catch(e){}
    if(dl){ await dl.save({filename:name,data:b}); cxMsg('Saved '+name,'ok'); return; }
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); cxMsg('Downloaded '+name,'ok');
  }catch(e){ cxMsg(e&&e.code==='declined'?'Download cancelled.':'Could not download. Right-click the image and choose Save image.','err'); }
}
async function cxCopy(){
  try{ const b=await cxBlob(); await navigator.clipboard.write([new ClipboardItem({'image/png':b})]); cxMsg('Image copied. Paste it into your email body (Ctrl+V).','ok'); }
  catch(e){ cxMsg('Copy is blocked here. Use Download image instead.','err'); }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#cxCard [data-cx], #capCard [data-cx]'); if(!b) return; const k=b.dataset.cx;
  const seg=(sel,on)=>document.querySelectorAll(sel).forEach(x=>x.setAttribute('aria-pressed',String(x===on)));
  if(k==='dl') cxDownload(); else if(k==='cp') cxCopy();
  else if(k==='s0'||k==='s3'||k==='s5'){CX.savN=k==='s0'?0:k==='s3'?3:5; seg('[data-cx^=s]:not([data-cx=sc])',b); cxRender(); cxCapRender(true);}
  else if(k==='n5'||k==='n8'){CX.rows=k==='n5'?5:8; seg('[data-cx^=n]',b); cxRender(); cxCapRender(true);}
  else if(k==='cc') cxCopyCap();
  else if(k==='cr') cxCapRender(true);
  else if(k==='lid'||k==='len'){CX.lang=k==='lid'?'id':'en'; seg('[data-cx=lid],[data-cx=len]',b); cxCapRender(true);}
  else if(k==='cn'){CX.capNotes=!CX.capNotes; b.setAttribute('aria-pressed',String(CX.capNotes)); cxCapRender(true);}
  else if(k==='cs'){CX.capSave=!CX.capSave; b.setAttribute('aria-pressed',String(CX.capSave)); cxCapRender(true);}
  else if(k==='ct'){CX.capTrend=!CX.capTrend; b.setAttribute('aria-pressed',String(CX.capTrend)); cxCapRender(true);}
});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='cxCap') CX.edited=true;});

/* ---------- Site Concern: email-ready image (PNG) ----------
   Drawn on a canvas so the picture is crisp and always light, whatever theme the page is in.
   Download saves a PNG; Copy puts the image on the clipboard, ready to paste into an email body. */
const CX={rows:5,notes:true};
const cxFont='Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
function cxDate(){const l=(DATA.meta&&DATA.meta.last)||''; const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(l); if(!m) return ''; return (+m[3])+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1]+' '+m[1];}
function cxWrap(ctx,text,maxW){const out=[];let line='';String(text).split(/\s+/).forEach(w=>{const t=line?line+' '+w:w; if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}); if(line) out.push(line); return out;}
function cxRR(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function cxDraw(cv,rows,opt){
  const S=2, W=880, P=40, C={ink:'#1D1D1F',mut:'#6E6E73',hair:'#E6E6EB',bg:'#FFFFFF',soft:'#F5F5F7',up:'#D70015',upS:'#FFEFED',dn:'#1B7F37',am:'#B26A00',amS:'#FFF3DD',red:'#FF3B30',amb:'#FF9F0A',blue:'#0071E3',blueS:'#E8F2FD'};
  const tmp=document.createElement('canvas').getContext('2d'); tmp.font='400 13px '+cxFont;
  // measure note heights first so the canvas is tall enough
  const lay=rows.map(r=>{const f=FU[fuId(r.s.n)]; const has=opt.notes&&f&&(f.reason||f.tag); let lines=[]; if(has&&f.reason) lines=cxWrap(tmp,f.reason,W-P*2-32-(f.tag?0:0)).slice(0,3); return {r,f:has?f:null,lines,h:62+(has?(f.tag?24:0)+lines.length*19+(lines.length?4:0):0)};});
  const head=170, colH=34, foot=96, H=head+colH+lay.reduce((t,l)=>t+l.h,0)+foot;
  cv.width=W*S; cv.height=H*S; const ctx=cv.getContext('2d'); ctx.scale(S,S);
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H); ctx.textBaseline='alphabetic';
  const T=(s,x,y,font,color,al)=>{ctx.font=font;ctx.fillStyle=color;ctx.textAlign=al||'left';ctx.fillText(s,x,y);};
  // header
  ctx.fillStyle=C.amb; cxRR(ctx,P,38,28,4,2); ctx.fill();
  T('ELECTRICITY · SITE CONCERN',P,66,'700 12px '+cxFont,C.mut);
  T('Sites using more electricity than expected',P,102,'800 28px '+cxFont,C.ink);
  const m=CMETA, sg=v=>(v>=0?'+':'−')+Math.abs(v*100).toFixed(1)+'%';
  T('Data through '+cxDate()+' · '+m.n+' sites',P,128,'500 14px '+cxFont,C.mut);
  // summary chips
  let cx0=P; const chip=(l,v)=>{const t=l+' '+sg(v); ctx.font='700 12.5px '+cxFont; const w=ctx.measureText(t).width+22; ctx.fillStyle=v>TH?C.upS:v<-TH?'#E8F8ED':C.soft; cxRR(ctx,cx0,140,w,24,12); ctx.fill(); T(t,cx0+11,156.5,'700 12.5px '+cxFont,v>TH?C.up:v<-TH?C.dn:C.mut); cx0+=w+8;};
  chip('October vs Sep',m.dSep); chip('vs Aug',m.dAgu); chip('vs Oct 2025',m.yoy);
  // column header
  let y=head; ctx.fillStyle=C.soft; cxRR(ctx,P-12,y,W-P*2+24,colH-6,10); ctx.fill();
  const ch='700 11px '+cxFont; T('SITE',P+32,y+19,ch,C.mut); T('OCT kWh/DAY',410,y+19,ch,C.mut,'right'); T('VS OCT 2025',500,y+19,ch,C.mut,'right'); T('VS SEP',575,y+19,ch,C.mut,'right'); T('EXCESS kWh/DAY',W-P,y+19,ch,C.mut,'right');
  y+=colH;
  const mx=Math.max(...rows.map(r=>r.ex),1);
  lay.forEach((L,i)=>{
    const r=L.r, hi=r.sig>=2, col=hi?C.red:C.amb, top=y;
    if(i>0){ctx.fillStyle=C.hair;ctx.fillRect(P,y,W-P*2,1);}
    // rank
    ctx.fillStyle=hi?C.upS:C.amS; ctx.beginPath(); ctx.arc(P+11,y+31,11,0,7); ctx.fill(); T(String(i+1),P+11,y+35.5,'800 12px '+cxFont,hi?C.up:C.am,'center');
    T(short(r.s.n)+(r.s.partial?' *':''),P+32,y+29,'700 16px '+cxFont,C.ink); T(r.s.r+(hi?' · Red':' · Yellow')+' · up in '+r.sig+' of 3',P+32,y+47,'500 12px '+cxFont,hi?C.up:C.am);
    T(fmt(r.a.okt),410,y+34,'600 15px '+cxFont,C.ink,'right');
    const pc=(v,x)=>T(sg(v),x,y+34,'700 14px '+cxFont,v>TH?C.up:v<-TH?C.dn:C.mut,'right'); pc(r.a.yoy,500); pc(r.a.mom,575);
    // excess bar + value
    const bx=600, bw=120; ctx.fillStyle=C.soft; cxRR(ctx,bx,y+25,bw,10,5); ctx.fill(); ctx.fillStyle=col; cxRR(ctx,bx,y+25,Math.max(8,bw*Math.max(0,r.ex)/mx),10,5); ctx.fill();
    T((r.ex>=0?'+':'−')+fmt(Math.abs(r.ex)),W-P,y+37,'800 20px '+cxFont,C.ink,'right');
    let yy=y+62;
    if(L.f){
      if(L.f.tag){const tg=FUTAG[L.f.tag]||'Other'; ctx.font='700 12px '+cxFont; const w=ctx.measureText(tg).width+20; ctx.fillStyle=C.blueS; cxRR(ctx,P+32,yy-12,w,22,11); ctx.fill(); T(tg,P+42,yy+3,'700 12px '+cxFont,C.blue); if(L.f.cm) T('told by '+L.f.cm,P+32+w+10,yy+3,'500 12px '+cxFont,C.mut); yy+=24;}
      L.lines.forEach(t=>{T(t,P+32,yy+2,'400 13.5px '+cxFont,C.ink); yy+=19;});
    }
    y=top+L.h;
  });
  // footer
  ctx.fillStyle=C.hair; ctx.fillRect(P,y+6,W-P*2,1);
  const fl=cxWrap(ctx,'Excess kWh/day = the site\'s October average minus what national growth ('+sg(m.natYoy)+' vs Oct 2025) would explain. Red: up more than 5% in 2 or 3 of the comparisons. Yellow: up in 1.',W-P*2);
  ctx.font='400 12px '+cxFont; fl.forEach((t,k)=>T(t,P,y+30+k*17,'400 12px '+cxFont,C.mut));
  T('Operations · Electricity monitoring',P,y+30+fl.length*17+8,'600 11.5px '+cxFont,'#9A9AA1');
}
function cxRender(){
  const cv=document.getElementById('cxCv'); if(!cv||!CROWS.length) return;
  const go=()=>{try{cxDraw(cv,CROWS.slice(0,CX.rows),CX);}catch(e){}};
  go(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(go);
}
function cxBlob(){const cv=document.getElementById('cxCv'); return new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('blob')),'image/png'));}
function cxMsg(t,c){const m=document.getElementById('cxMsg'); if(m){m.textContent=t;m.className='fumsg '+(c||'');}}
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
  const b=e.target.closest('#cxCard [data-cx]'); if(!b) return; const k=b.dataset.cx;
  if(k==='dl') cxDownload(); else if(k==='cp') cxCopy();
  else if(k==='n5'||k==='n8'){CX.rows=k==='n5'?5:8; document.querySelectorAll('#cxCard [data-cx^=n]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); cxRender();}
  else if(k==='nt'){CX.notes=!CX.notes; b.setAttribute('aria-pressed',String(CX.notes)); cxRender();}
});

function applyData(d){if(!d.weekly&&DATA&&DATA.weekly)d.weekly=DATA.weekly; DATA=d;setup();REGION='All';QUERY='';STATUS='all';EXPAND=false;document.getElementById('q').value='';document.getElementById('mq').value='';resetMomExplore();fillRegions();render();}
async function handleFile(file){
  if(!file) return; const btn=document.getElementById('updBtn'); btn.disabled=true;
  msg('Reading '+file.name+'. This takes a few seconds…');
  try{
    await loadXlsx(); const buf=await file.arrayBuffer(); await new Promise(r=>setTimeout(r,60));
    const names=XLSX.read(buf,{type:'array',bookSheets:true}).SheetNames||[];
    if(names.includes('RAW SUMMARY')){
      const ds=ElecEngine.buildDataset(XLSX,buf,{readType:'array',fileName:file.name});
      applyData(ds);
      if(APP!=='elec') setApp('elec');
      let saved=false;
      if(DB){try{await DB.collection('dashboard').doc('latest').set({json:JSON.stringify(ds),at:Date.now()});saved=true;}catch(e){}}
      msg(`Updated: data through ${dm(ds.meta.last)}, ${ds.sites.length} sites. ${saved?'Saved, so everyone who opens the dashboard sees this version.':'Shown on this screen only (saving for others is not available here).'}`,'ok');
    }else if(names.includes('SUMMARY')&&names.some(n=>/^PROD \d+/.test(n))){
      const pd=PayEngine.buildPayroll(XLSX,buf,{readType:'array',fileName:file.name});
      applyPayroll(pd); if(APP!=='pay') setApp('pay'); else render();
      const P=pd.prod[PAY.sc], la=P?lastActual(P):-1;
      msg(`Payroll updated${la>=0?': actual through '+P.weeks[la].label:''}. Kept on this device only, not shared.`,'ok');
    }else throw new Error('This file looks like neither the electricity workbook (needs a "RAW SUMMARY" sheet) nor the payroll workbook (needs "SUMMARY" and "PROD 16").');
  }catch(e){msg('Could not update from this file: '+((e&&e.message)||e),'err');}
  btn.disabled=false; document.getElementById('fileIn').value='';
}
document.getElementById('updBtn').addEventListener('click',()=>document.getElementById('fileIn').click());
document.getElementById('fileIn').addEventListener('change',e=>handleFile(e.target.files[0]));
(function(){const dv=document.getElementById('dropv');let n=0;const hasF=e=>e.dataTransfer&&[...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter',e=>{if(!hasF(e))return;e.preventDefault();n++;dv.hidden=false;});
  addEventListener('dragover',e=>{if(hasF(e))e.preventDefault();});
  addEventListener('dragleave',e=>{if(!hasF(e))return;n=Math.max(0,n-1);if(!n)dv.hidden=true;});
  addEventListener('drop',e=>{if(!hasF(e))return;e.preventDefault();n=0;dv.hidden=true;handleFile(e.dataTransfer.files[0]);});})();
(async()=>{try{
  if(!window.claude||!claude.use) return; DB=await claude.use('db'); if(!DB) return;
  DB.collection('dashboard').doc('latest').onSnapshot(s=>{ if(!s.exists) return;
    try{const d=JSON.parse(s.data().json); const cur=(DATA.meta&&DATA.meta.generatedAt)||'';
      if(d&&d.sites&&d.meta&&d.meta.generatedAt>cur){applyData(d);msg('Showing the latest saved update: data through '+dm(d.meta.last)+'.','ok');}}catch(e){} });
}catch(e){}})();
if(APP==='pay'){setApp('pay');}else render();
Router.start();
Motion.start();

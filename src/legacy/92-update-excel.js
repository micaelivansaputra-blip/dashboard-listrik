/* ---------- update from Excel ---------- */
const XLSX_SRC='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function msg(t,kind){const el=document.getElementById('updMsg');if(!t){el.hidden=true;return;}el.hidden=false;el.className='updmsg '+(kind||'');el.textContent=t;}
function loadXlsx(){return new Promise((res,rej)=>{if(window.XLSX)return res();const s=document.createElement('script');s.src=XLSX_SRC;s.onload=res;s.onerror=()=>rej(new Error('Could not load the Excel reader. Check the connection and try again.'));document.head.appendChild(s);});}
let DB=null;
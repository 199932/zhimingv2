const fs=require('fs');
const raw = JSON.parse(fs.readFileSync('/workspace/accel/patch_p1s6_p4.json','utf8'));
const p = raw.patches.find(p=>p.anchor==='build_share_card_entrance');
let depth = 0, inStr='', esc=false, buf='';
const parts=[];
for(let i=0;i<p.content.length;i++){
  const c=p.content[i];
  if(inStr){ buf+=c; if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===inStr) inStr=''; continue; }
  if(c==='"'||c==="'"||c==='`'){ inStr=c; buf+=c; continue; }
  if(c===';' && depth===0){ buf+=c; parts.push(buf); buf=''; continue; }
  if(c==='{'||c==='['||c==='('){ depth++; buf+=c; continue; }
  if(c==='}'||c===']'||c===')'){ depth--; buf+=c; continue; }
  buf+=c;
}
if(buf.trim().length) parts.push(buf);
const p3 = parts[2];
// 二分查 bad segment
function testSeg(seg){ try{ new Function(';'+seg+';'); return null; } catch(e){return e.message;} }
let l=0, r=p3.length;
// 通过逐字符扩展找到 FAIL
for(let i=1000;i<=p3.length;i+=1000){
  const e=testSeg(p3.slice(0,i));
  console.log('pos '+i+' → '+(e||'OK'));
  if(e){ break; }
}
// 1 字符 1 步 精细扫描到 1000
for(let i=1;i<=1000;i++){
  const e=testSeg(p3.slice(0,i));
  if(e){ console.log('FINE: first failure at char', i, ' → ', e);
    console.log('Char at i-1:', JSON.stringify(p3[i-2]+p3[i-1]+p3[i]+p3[i+1]));
    process.exit(0); }
}

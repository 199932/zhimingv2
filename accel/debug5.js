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
console.log('Part3 前 800 字符:');
console.log('```````````````````````````');
console.log(p3.slice(0, 800));
console.log('```````````````````````````');
// 手动取 part 3 前 6 行做 eval
const firstSix = p3.split('\n').slice(0,6).join('\n');
console.log('\nFirst 6 lines:');
console.log(firstSix);
try{ eval('0;'+firstSix+'}'); console.log('6 lines + close brace: OK'); } catch(e){ console.log('6 lines FAIL', e.message); }

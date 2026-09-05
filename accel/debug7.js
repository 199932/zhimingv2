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
function t(seg){ try{ new Function(';'+seg+';'); return null; } catch(e){return e.message;} }
// binary search within first 1000 chars
let lo=1, hi=1000, firstFail=1001;
while(lo<=hi){
  const mid=(lo+hi)>>1;
  const e=t(p3.slice(0,mid));
  if(!e) lo=mid+1; else { firstFail=mid; hi=mid-1; }
}
console.log('first fail at:', firstFail);
console.log('Context around fail (chars firstFail-12..firstFail+8):', JSON.stringify(p3.slice(firstFail-12, firstFail+8)));
console.log('Char code at fail pos:', p3.charCodeAt(firstFail-1), JSON.stringify(p3[firstFail-1]));
// 打印每个字符 charCode 找到 0x2028 / 0x2029 / 0xFEFF
for(let i=Math.max(0,firstFail-20); i<Math.min(p3.length, firstFail+30); i++){
  const c=p3.charCodeAt(i);
  if(c!==0x0a && c!==0x0d && !(c>=0x20 && c<=0x7e) && !(c>=0x3000 && c<=0x9fff)){
    console.log('SUS char at pos',i,': U+'+c.toString(16), JSON.stringify(p3.slice(i-5,i+5)));
  }
}

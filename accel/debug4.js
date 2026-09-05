const fs=require('fs');
const raw = JSON.parse(fs.readFileSync('/workspace/accel/patch_p1s6_p4.json','utf8'));
const p = raw.patches.find(p=>p.anchor==='build_share_card_entrance');
// 找 Part 3
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
const part3 = parts[2];
console.log('PART3 length=',part3.length);
// 1) 单独 new Function(body=part3) → 注意 function decl 作为 body 合法
try{ new Function(part3); console.log('A) new Function(part3): OK'); }
catch(e){ console.log('A) FAIL:', e.message); }
// 2) new Function('(function anonymous(){'+part3+'})') 看是否是 new Function 的 parameter wrapper 问题
try{ new Function('x', part3); console.log('B) new Function(param + part3): OK'); }
catch(e){ console.log('B) FAIL:', e.message); }
// 3) 直接 eval 试试：
try{ eval('0;\n'+part3); console.log('C) eval(part3 with prefix): OK'); }
catch(e){ console.log('C) FAIL:', e.message); }
// 4) 逐字符比较 part3 前 50 个字节，寻找 BOM 或不可见字符
console.log('First 30 char codes:', [...part3.slice(0,30)].map(ch=>ch.charCodeAt(0)).join(','));

const fs=require('fs');
const raw = JSON.parse(fs.readFileSync('/workspace/accel/patch_p1s6_p4.json','utf8'));
const p = raw.patches.find(p=>p.anchor==='build_share_card_entrance');
// 将 content 按语句边界拆（跳过字符串内的；字符逐一扫描）
let depth = 0, inStr='', esc=false, buf='';
const parts=[];
const s=p.content;
for(let i=0;i<s.length;i++){
  const c=s[i];
  if(inStr){
    buf+=c;
    if(esc){esc=false;continue;}
    if(c==='\\'){esc=true;continue;}
    if(c===inStr) inStr='';
    continue;
  }
  if(c==='"'||c==="'"||c==='`'){ inStr=c; buf+=c; continue; }
  if(c===';' && depth===0){ buf+=c; parts.push(buf); buf=''; continue; }
  if(c==='{'||c==='['||c==='('){ depth++; buf+=c; continue; }
  if(c==='}'||c===']'||c===')'){ depth--; buf+=c; continue; }
  buf+=c;
}
if(buf.trim().length) parts.push(buf);
console.log('Part count:', parts.length);
// 逐 parts 累积
let code='';
for(let i=0;i<parts.length;i++){
  code += parts[i];
  try{ new Function(';'+code+';'); }
  catch(e){
    console.log('FAIL at part',i+1,':',e.message);
    console.log('Part snippet(500B):', JSON.stringify(parts[i].slice(0,500)));
    process.exit(1);
  }
}
console.log('All parts parsed OK via incremental. 总 length=', code.length);

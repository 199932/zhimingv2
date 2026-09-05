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
// 不再包装：直接用 Function(body)，函数声明合法。把 seg 当函数体
function t(seg){ try{ new Function(seg); return null; } catch(e){return e.message;} }
// 先找最后一个 OK 位置（从大到小）
// 先整体
let err=t(p3);
console.log('Full p3:', err||'OK', `len=${p3.length}`);
if(!err) process.exit(0);
// 先查前 1000、2000、... 段
for(let pos=500; pos <= p3.length; pos+=500){
  const seg=p3.slice(0,pos);
  const e=t(seg);
  if(e){ console.log(`FAIL at pos<=${pos}: ${e}`);
    // binary between pos-500 and pos
    let lo=pos-500, hi=pos, ans=pos;
    while(lo<=hi){ const mid=(lo+hi)>>1; const e2=t(p3.slice(0,mid)); if(e2) ans=mid, hi=mid-1; else lo=mid+1; }
    console.log('First fail char pos:', ans);
    console.log('Snippet around fail:', JSON.stringify(p3.slice(Math.max(0,ans-30), ans+60)));
    // 扫 Unicode 非法：行分隔符 0x2028 / 段分隔符 0x2029 / BOM 0xFEFF / 其他 control
    for(let i=Math.max(0,ans-100); i<Math.min(p3.length, ans+100); i++){
      const c=p3.charCodeAt(i);
      if( (c<0x20 && c!==0x0a && c!==0x09 && c!==0x0d) || c===0x2028 || c===0x2029 || c===0xFEFF || c===0xFFFF ){
        console.log(`BANNED control at offset ${i}: U+${c.toString(16)} context=${JSON.stringify(p3.slice(Math.max(0,i-8),i+12))}`);
      }
    }
    process.exit(1);
  }
}
console.log('all prefix OK?');

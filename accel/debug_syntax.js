const fs=require('fs');
const raw = JSON.parse(fs.readFileSync('/workspace/accel/patch_p1s6_p4.json','utf8'));
const p = raw.patches.find(p=>p.anchor==='build_share_card_entrance');
try{ new Function(p.content); console.log('SYNTAX OK, length=',p.content.length); }
catch(e){
  console.error('ERR',e.message);
  const m=/(\d+)(?::(\d+))?/.exec(e.stack.split('\n')[1]);
  if(m){
    const line=parseInt(m[1],10); const col=parseInt(m[2]||'0',10);
    const lines=p.content.split('\n');
    for(let i=Math.max(0,line-3); i<Math.min(lines.length,line+2); i++){
      console.log((i+1)+': '+lines[i]);
      if(i===line-1) console.log(' '.repeat(col+String(i+1).length+2)+'^ here');
    }
  }
}

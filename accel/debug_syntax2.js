const fs=require('fs');
const raw = JSON.parse(fs.readFileSync('/workspace/accel/patch_p1s6_p4.json','utf8'));
const p = raw.patches.find(p=>p.anchor==='build_share_card_entrance');
const lines=p.content.split('\n');
// 逐行累积，看哪行开始出错
for(let i=1;i<=lines.length;i++){
  const seg = lines.slice(0,i).join('\n')+'\n';
  try{ new Function(seg); }
  catch(e){
    console.log('First broken at line',i,':',e.message);
    const a=Math.max(0,i-3); const b=Math.min(lines.length,i+2);
    lines.slice(a,b).forEach((ln,idx)=>{
      const lnNum=a+idx+1;
      console.log((lnNum===i?'>>>>> ':'     ')+String(lnNum).padStart(4,'0')+': '+ln);
    });
    process.exit(1);
  }
}
console.log('All lines syntax OK? length=',p.content.length);

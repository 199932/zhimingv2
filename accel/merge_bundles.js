// 合并 patch_p1s6_p4.json + patch_p2.json + patch_p3.json
// 规则：同 anchor 下按 [p1s6/p4 CSS + p2 CSS + p3 CSS] 顺序合并 (style_end_before)；
//       HTML: body_end_before 按 p2 → p3 顺序（p1s6 无 body HTML）
//       JS_PRE: p3 backup TYPE_LABEL → p1s6 backup TYPE_LABEL → P2 日记/排行 → P4(PWA+通知+洞察) 顺序 (后写的 IIFE monkey-patch 可访问前面符号)
//       HIST_TYPE_COLOR_AFTER: p3 inline
//       JS_INIT_END: p2 init → p3 init → p4 init (顺序重要: init 先注subtab后填默认值)
//       build_share_card_entrance: p1s6 only
//       accuracy_dashboard_entrance: p2 only
//       analyze_patterns_entrance: p4 only
//       end_of_switches_extra: p3 IIFE 6处兜底 only
const fs = require('fs');
const path = require('path');

const pA = JSON.parse(fs.readFileSync(path.join(__dirname,'patch_p1s6_p4.json'),'utf8')).patches;
const pB = JSON.parse(fs.readFileSync(path.join(__dirname,'patch_p2.json'),'utf8')); const p2=Array.isArray(pB)?pB:pB.patches;
const pC = JSON.parse(fs.readFileSync(path.join(__dirname,'patch_p3.json'),'utf8')).patches;
const all = [].concat(pA, p2, pC);
// group by anchor
const groups = {};
all.forEach(p=>{ if(!p || !p.anchor) return; (groups[p.anchor]=groups[p.anchor]||[]).push(p); });
const ORDER=['style_end_before','hist_type_color_after','type_label_before','js_pre_iife_before','end_of_switches_extra','accuracy_dashboard_entrance','analyze_patterns_entrance','build_share_card_entrance','body_end_before','js_init_end_before'];
const final=[];
ORDER.forEach(anchor=>{
  const arr=groups[anchor]; if(!arr||!arr.length) return;
  const content = arr.map(p=>p.content||'').join('\n');
  final.push({anchor, content});
  console.log('anchor:',anchor,'patch_count:',arr.length,'total_bytes:',content.length);
});
// check for unknown anchors
const known=new Set(ORDER); Object.keys(groups).forEach(k=>{if(!known.has(k))console.warn('Unknown anchor ignored:',k);});
const out={meta:{built:new Date().toISOString(),bundles:['p1s6_p4','p2','p3']},patches:final};
fs.writeFileSync(path.join(__dirname,'patches_bundle_all.json'), JSON.stringify(out,null,2),'utf8');
console.log('✅ 合并完成 /workspace/accel/patches_bundle_all.json ( '+final.length+' patches, 总内容字节数='+final.reduce((s,p)=>s+Buffer.byteLength(p.content,'utf8'),0)+' )');

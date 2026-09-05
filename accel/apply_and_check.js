// 执行所有 patch（不写回实际文件）→ 输出到 out.html，然后定位语法错误行号
const fs=require('fs');
const path=require('path');
const ANCHORS = [
  {name: 'style_end_before',    type: 'before', search: '</style>'},
  {name: 'body_end_before',     type: 'before', search: '\n</body>\n</html>'},
  {name: 'js_pre_iife_before',  type: 'before', search: '/* =========================================================\n *  E2: 输入参数校验（防NaN/乱输）'},
  {name: 'js_init_end_before',  type: 'after', search: '  try{ initLiupaiPanel(); }catch(_){}\n  try{ if(!window._calState){ window._calState={y:new Date().getFullYear(),m:new Date().getMonth()+1};} window.renderCalendar(window._calState.y, window._calState.m); }catch(_){}'},
  {name: 'type_label_before',   type: 'before', search: 'const HIST_TYPE_COLOR'},
  {name: 'hist_type_color_after', type: 'after', search: 'const HIST_TYPE_COLOR = {'},
  {name: 'build_share_card_entrance', type: 'after', search: 'function buildShareCardHTML(type, r){\n'},
  {name: 'accuracy_dashboard_entrance', type: 'after', search: 'function showAccuracyDashboard'},
  {name: 'analyze_patterns_entrance', type: 'after', search: 'function analyzeMyPatterns'},
  {name: 'end_of_switches_extra', type: 'before_regex', regex: /function\s+renderToday\b/}
];
function findAll(t,s){let i=0,h=[],f=0;while((i=t.indexOf(s,f))!==-1){h.push(i);f=i+s.length;if(h.length>5)break;}return h;}
function resolveAnchor(text,anchor){
  if(anchor.type==='before'||anchor.type==='after'){const h=findAll(text,anchor.search);if(h.length===0)return {ok:false,e:'nf'};if(h.length>1)return {ok:false,e:'multi'};return {ok:true,pos:anchor.type==='before'?h[0]:h[0]+anchor.search.length};}
  const m=anchor.regex.exec(text);if(!m)return {ok:false,e:'rxnf'};return {ok:true,pos:anchor.type==='before_regex'?m.index:m.index+m[0].length,len:m[0].length};
}
function applyPatches(src, patches){
  const resolved=patches.map(p=>{const a=ANCHORS.find(x=>x.name===p.anchor);const r=resolveAnchor(src,a);return {pos:r.pos,content:p.content||'',anchor:p.anchor};});
  resolved.sort((a,b)=>b.pos-a.pos);let out=src;resolved.forEach(r=>out=out.slice(0,r.pos)+r.content+out.slice(r.pos));
  return out;
}
const html=fs.readFileSync('/workspace/知命V2.html','utf8');
const patches = JSON.parse(fs.readFileSync('/workspace/accel/patches_bundle_all.json','utf8')).patches;
const res = applyPatches(html, patches);
fs.writeFileSync('/tmp/zhiming_after_patches.html', res);
// 提取 <script> 内容
const m=res.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('/tmp/zhiming_script.js', m[1]);
console.log('写好了 /tmp/zhiming_after_patches.html  &  /tmp/zhiming_script.js');
const {execSync}=require('child_process');
try{execSync('node --check /tmp/zhiming_script.js',{stdio:'inherit'});console.log('✅ SYNTAX OK');}
catch(err){console.log('❌ Syntax FAIL above, 行号在上面 stderr 显示'); process.exit(1);}

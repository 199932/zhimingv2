// 知命V2 · 批处理补丁引擎 (anchor_map + batch_apply_patch + light_verify)
// 用法: node /workspace/accel/batch_apply_patch.js /workspace/知命V2.html /workspace/accel/patches_bundle.json  [--write]
// 无 --write 则 dry-run 只校验锚点位置和注入后体积/语法，不写回。
const fs = require('fs');
const path = require('path');

// 锚点定义：每个锚点 = {name, type: 'before'|'after', search: 唯一字符串}
// 注入点规则：before = 在 search 前插入新内容；after = 在 search 后插入；replace = 替换 search 为 [old + new] 合并（或用 search 中 {INJECT} 占位，这里简化为 before/after）
const ANCHORS = [
  {name: 'style_end_before',    type: 'before', search: '</style>'},
  {name: 'body_end_before',     type: 'before', search: '\n</body>\n</html>'},   // 用换行包起来唯一化
  {name: 'js_pre_iife_before',  type: 'before', search: '/* =========================================================\n *  E2: 输入参数校验（防NaN/乱输）'},
  {name: 'js_init_end_before',  type: 'after', search: '  try{ initLiupaiPanel(); }catch(_){}\n  try{ if(!window._calState){ window._calState={y:new Date().getFullYear(),m:new Date().getMonth()+1};} window.renderCalendar(window._calState.y, window._calState.m); }catch(_){}'},
  {name: 'type_label_before',   type: 'before', search: 'const HIST_TYPE_COLOR'},   // TYPE_LABEL 或紧挨着的 HIST_TYPE_COLOR
  {name: 'hist_type_color_after', type: 'after', search: 'const HIST_TYPE_COLOR = {'},
  {name: 'build_share_card_entrance', type: 'after', search: 'function buildShareCardHTML(type, r){\n'},
  {name: 'accuracy_dashboard_entrance', type: 'after', search: 'function showAccuracyDashboard'},
  {name: 'analyze_patterns_entrance', type: 'after', search: 'function analyzeMyPatterns'},
  {name: 'end_of_switches_extra', type: 'before_regex', regex: /function\s+renderToday\b/}
];

function findAll(text, needle){
  let i=0, hits=[]; let from=0;
  while((i=text.indexOf(needle, from))!==-1){ hits.push(i); from=i+needle.length; if(hits.length>5)break;}
  return hits;
}
function resolveAnchor(text, anchor){
  if(anchor.type==='before' || anchor.type==='after'){
    const hits = findAll(text, anchor.search);
    if(hits.length===0) return {ok:false, error: anchor.name+' 锚点找不到: '+anchor.search.slice(0,50)};
    if(hits.length>1) return {ok:false, error: anchor.name+' 锚点有多个匹配 ('+hits.length+')，需要更唯一搜索串: '+anchor.search.slice(0,60)};
    return {ok:true, pos: anchor.type==='before'? hits[0] : hits[0]+anchor.search.length, matchLen: anchor.search.length};
  }
  if(anchor.type==='before_regex' || anchor.type==='after_regex'){
    const m = anchor.regex.exec(text);
    if(!m) return {ok:false, error: anchor.name+' regex 未匹配'};
    const pos = anchor.type==='before_regex'? m.index : m.index+m[0].length+(anchor.offset_from_match_end||0);
    return {ok:true, pos, matchLen:m[0].length, match: m[0]};
  }
  return {ok:false, error:'unknown anchor type '+anchor.type};
}

function applyPatches(src, patches){
  // patches: Array<{anchor, content}>  按位置从大到小注入避免 offset 失效
  const resolved = patches.map(p=>{
    const a = ANCHORS.find(x=>x.name===p.anchor);
    if(!a) return {err: '未知锚点 '+p.anchor};
    const r = resolveAnchor(src, a);
    if(!r.ok) return {err: r.error, anchor:p.anchor};
    return {pos: r.pos, content: p.content || '', anchor:p.anchor};
  });
  const bad = resolved.filter(r=>r.err); if(bad.length) return {ok:false, errors: bad};
  // 检查每个 pos 唯一，否则要冲突警告；允许相邻（不重叠即可）
  resolved.sort((a,b)=>b.pos-a.pos);
  let out = src;
  const applied=[];
  for(const r of resolved){
    out = out.slice(0,r.pos) + String(r.content) + out.slice(r.pos);
    applied.push({anchor:r.anchor, pos:r.pos, bytes: r.content.length});
  }
  return {ok:true, result:out, applied};
}

function verifySyntax(src_html){
  const m = src_html.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) return {ok:false, err:'<script> block 未找到'};
  try { new Function(m[1]); return {ok:true, bytes: m[1].length}; }
  catch(e){ return {ok:false, err: 'JS SyntaxError: '+e.message}; }
}
function countWindowAssigns(src_html){
  const m = src_html.match(/<script>([\s\S]*?)<\/script>/);
  if(!m) return 0;
  const re = /try\s*\{\s*window\.\s*([$\w]+)\s*=\s*\1\s*;\s*\}\s*catch\s*\(_\)\s*\{\s*\}/g;
  let count=0; const names=[]; let ma;
  while((ma=re.exec(m[1]))!==null){ count++; names.push(ma[1]); }
  return {count, names};
}

// MAIN
const [htmlPath, bundlePath] = [process.argv[2], process.argv[3]];
const WRITE = process.argv.includes('--write');
if(!htmlPath){ console.error('Usage: node batch_apply_patch.js <html> [bundle.json] [--write]'); process.exit(1);}

let html = fs.readFileSync(htmlPath,'utf8');
const synt0 = verifySyntax(html);
console.log('[PRE] 语法: '+ (synt0.ok? 'OK ('+synt0.bytes+' bytes JS)':'FAIL '+synt0.err));
if(!synt0.ok) process.exit(2);

let patches = [];
if(bundlePath && fs.existsSync(bundlePath)){
  const raw = JSON.parse(fs.readFileSync(bundlePath,'utf8'));
  patches = Array.isArray(raw)? raw : raw.patches;
  console.log('[PATCH] 载入 '+patches.length+' 个补丁包');
} else {
  console.log('[PATCH] bundle.json 未提供 → dry-run 锚点校验');
}
const anchorReport = ANCHORS.map(a=>{
  const r = resolveAnchor(html, a);
  return {name:a.name, ok:r.ok, note: r.ok? ('pos@'+r.pos): ('ERR:'+r.error)};
});
console.log('[ANCHORS] \n'+anchorReport.map(a=>'  - '+(a.ok?'✅':'❌')+' '+a.name+' '+a.note).join('\n'));
const badAnc = anchorReport.filter(a=>!a.ok);
if(badAnc.length){ process.exit(3); }

if(patches.length===0){
  // 只做锚点地图导出，便于后续快速注入
  const amap = {}; ANCHORS.forEach(a=>{ const r=resolveAnchor(html,a); amap[a.name]={pos:r.pos, type:a.type}; });
  const outMapPath = path.join(path.dirname(htmlPath),'anchor_map.json');
  fs.writeFileSync(outMapPath, JSON.stringify(amap,null,2));
  console.log('[DRY] anchor_map.json 已写入 '+outMapPath);
  process.exit(0);
}

const res = applyPatches(html, patches);
if(!res.ok){ console.error('[APPLY] 错误: '+JSON.stringify(res.errors,null,2)); process.exit(4);}
console.log('[APPLY] 注入成功: '+res.applied.length+' 补丁, 新增 '+(Buffer.byteLength(res.result,'utf8')-Buffer.byteLength(html,'utf8'))+' bytes');
const synt = verifySyntax(res.result);
console.log('[POST] 语法: '+ (synt.ok? 'OK JS '+synt.bytes+' bytes' : 'FAIL '+synt.err));
const {count, names} = countWindowAssigns(res.result);
console.log('[POST] window.X=X 挂载点: '+count+' (含新增的 '+Math.max(0,count-countWindowAssigns(html).count)+' 个新标识符)');
console.log('[POST] 总体积: '+Buffer.byteLength(res.result,'utf8')+' bytes ('+Math.round(Buffer.byteLength(res.result,'utf8')/1024)+' KB)  ≤3MB: '+ (Buffer.byteLength(res.result,'utf8')<=3145728?'OK':'FAIL'));

if(WRITE && synt.ok){
  fs.writeFileSync(htmlPath, res.result, 'utf8');
  console.log('[WRITE] 写回 '+htmlPath);
} else if(!WRITE){
  console.log('[DRY] 添加 --write 以实际写入');
}
process.exit(synt.ok?0:5);

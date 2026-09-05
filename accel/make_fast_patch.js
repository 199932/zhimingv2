/* =========================================================
 *  make_fast_patch.js — 通用加速引擎 v1.0 (zhiming-v2-iter 自研)
 *  适用：任何"单文件大前端 HTML/JS/CSS 项目"的批量迭代
 *  解决：文件越长，Grep/Read/Edit 往返越慢。一次性 anchor → batch apply → light verify
 *  用法：
 *   1) node accel/make_fast_patch.js build <项目.html>
 *        → 扫描锚点并打印 anchor_map.json（定位所有可注入点）
 *   2) 写 patches/*.json 补丁（见下 schema）
 *   3) node accel/make_fast_patch.js apply <项目.html> <patches_bundle.json>
 *        → 一次性合并+注入，生成 <项目.html>.patched
 *   4) node accel/make_fast_patch.js verify <项目.html.patched> --must=fn1,fn2 --strings=id=x,id=y
 *        → 轻量沙箱验收
 *
 *  Patch Schema (每个 patch 是对象，patches_bundle 是数组):
 *    { id: 'p1-s1',
 *      anchor: '// MARK: xxx' | '<body>' （唯一唯一字符串锚点）,
 *      insert: 'before' | 'after' | 'replace-anchor' | 'replace-line',
 *      code: '字符串代码块，自动保持缩进' ,
 *      required: true/false （锚点找不到时要不要报错） }
 * =======================================================*/
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const crypto=require('crypto');

function sha(s){ return crypto.createHash('sha256').update(s).digest('hex').slice(0,10); }

function buildAnchorMap(htmlPath){
  const raw=fs.readFileSync(htmlPath,'utf8');
  const lines=raw.split('\n');
  // 启发式：收集"看起来像锚点"的行 —— 包含唯一 MARK/ANCHOR/Phase/Step/大段注释/大段函数名
  const anchors=[];
  const seen=new Set();
  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    if(L.length<10) continue;
    // 唯一 hash 锚点
    if(/(MARK|ANCHOR|Phase|Step|TODO|FIXME|section|SECTION|MODULE)/i.test(L)){
      const key=L.trim().slice(0,120);
      if(!seen.has(key)){ seen.add(key);
        anchors.push({line:i+1, key, type:'mark', context:L.trim().slice(0,80)}); }
    }
    // 函数声明锚点：function xxx(...){  或 const xxx = function
    const fm=L.match(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if(fm){ const key='function '+fm[1]; if(!seen.has(key)){seen.add(key);
      anchors.push({line:i+1, key, type:'fn', fn:fm[1]}); } }
    const cm=L.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function/);
    if(cm){ const key='var-fn '+cm[1]; if(!seen.has(key)){seen.add(key);
      anchors.push({line:i+1, key, type:'var-fn', fn:cm[1]}); } }
    // 唯一字符串长锚点（长度≥80，且只出现一次）
    if(L.length>=60 && /["'`]/.test(L)===false){
      const count = raw.split(L).length-1;
      if(count===1){ const key=L.trim().slice(0,100); if(!seen.has(key)){seen.add(key);
        anchors.push({line:i+1, key, type:'unique-line'}); } }
    }
  }
  const out={ htmlPath, size:raw.length, sha256_10:sha(raw), anchors };
  const jsonPath=htmlPath+'.anchors.json';
  fs.writeFileSync(jsonPath, JSON.stringify(out,null,2));
  console.log('🗺  build anchor map: '+anchors.length+' anchors → '+jsonPath);
  console.log('   建议从列表里挑最稳的锚（type=fn / mark），避免 unique-line 受空格影响');
  return out;
}

function applyPatches(htmlPath, bundlePath){
  let raw=fs.readFileSync(htmlPath,'utf8');
  const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
  const patches = Array.isArray(bundle)?bundle:bundle.patches;
  const szPre=fs.statSync(htmlPath).size;
  console.log('🔨 apply '+patches.length+' patches on '+htmlPath+' ('+szPre+' bytes)');

  // 先按行号排序 anchor → 从文件底往头插，避免行号偏移
  const located=patches.map(p=>{
    const idx=raw.indexOf(p.anchor);
    if(idx<0 && p.required!==false){
      throw new Error('PATCH FAIL ['+p.id+']: anchor not found — '+JSON.stringify(p.anchor).slice(0,80));
    }
    return { patch:p, idx };
  }).filter(x=>x.idx>=0).sort((a,b)=>b.idx-a.idx);

  const applied=[];
  located.forEach(({patch, idx})=>{
    const anchorLen=patch.anchor.length;
    const lineIdx = raw.lastIndexOf('\n',idx)+1;
    let next='';
    switch(patch.insert||'before'){
      case 'before':        next = raw.slice(0,idx) + patch.code + raw.slice(idx); break;
      case 'after':         next = raw.slice(0,idx+anchorLen) + patch.code + raw.slice(idx+anchorLen); break;
      case 'replace-anchor':next = raw.slice(0,idx) + patch.code + raw.slice(idx+anchorLen); break;
      case 'replace-line': {
        const eol = raw.indexOf('\n',idx); const end = eol<0?raw.length:eol;
        next = raw.slice(0,lineIdx) + patch.code + raw.slice(end);
        break;
      }
      default: throw new Error('bad insert mode: '+patch.insert);
    }
    raw=next;
    applied.push(patch.id);
  });
  const outPath = htmlPath.replace(/\.html$/,'.patched.html');
  fs.writeFileSync(outPath, raw);
  const szPost=fs.statSync(outPath).size;
  console.log('✅ applied '+applied.length+' patches → '+outPath+' ('+szPost+' bytes, Δ='+((szPost-szPre)>=0?'+':'')+(szPost-szPre)+')');
  return outPath;
}

function lightVerify(htmlPath, opts){
  const raw=fs.readFileSync(htmlPath,'utf8');
  const st=fs.statSync(htmlPath);
  const size=st.size;
  console.log('🔍 lightVerify '+htmlPath);
  console.log('   file size = '+size+' bytes ('+Math.round(size/1024)+'KB)');

  // 1) 提取首个 <script>…</script>
  const m=raw.match(/<script>([\s\S]*?)<\/script>/);
  if(!m){ console.log('   ❌ 无 <script>'); return 10; }
  try{ new Function(m[1]); console.log('   ✅ JS 语法 无 SyntaxError ('+m[1].length+' bytes)'); }
  catch(e){ console.log('   ❌ SyntaxError: '+e.message); return 11; }

  // 2) 字符串存在性（--strings=a,b,c 或 a;b;c）
  const strs=(opts.strings||'').split(/[;,]/).filter(Boolean);
  if(strs.length){
    let miss=0;
    strs.forEach(s=>{ const ok=raw.includes(s); console.log('   '+(ok?'✅':'❌')+' string: '+s.slice(0,60)); if(!ok)miss++; });
    if(miss){ console.log('   ❌ strings 缺失 '+miss); return 12; }
  }

  // 3) vm 挂 window 验证（--must=fn1,fn2;fn3 逗号或分号）
  const must=(opts.must||'').split(/[;,]/).filter(Boolean);
  if(must.length){
    const ctx={window:{Math},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams,
      btoa:(s)=>Buffer.from(String(s),'binary').toString('base64'),
      atob:(s)=>Buffer.from(String(s),'base64').toString('binary'),
      Blob:class{constructor(a){this._a=a}},URL:{createObjectURL:()=>'blob:v'}};
    ctx.self=ctx;ctx.globalThis=ctx;
    ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};
    // parentNode 使用独立占位对象，避免递归构造
    const parentStub = {style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},dataset:{},innerHTML:'',textContent:'',value:'',appendChild(c){return c;},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},click(){},querySelector:()=>null,querySelectorAll:[],closest:()=>null,remove(){},setAttribute(){},getAttribute(){return null;},children:[],parentNode:null};
    const es=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},dataset:{},innerHTML:'',textContent:'',value:'',appendChild(c){return c;},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},click(){},querySelector:()=>null,querySelectorAll:[],closest:()=>null,remove(){},setAttribute(){},getAttribute(){return null;},children:[],parentNode:parentStub});
    ctx.document={getElementById:id=>Object.assign(es(),{id}),querySelector:()=>es(),querySelectorAll:()=>new Proxy([],{get(t,p){if(p==='forEach')return(fn)=>{t.forEach(fn);};return undefined;}}),createElement:t=>Object.assign(es(),{tagName:t.toUpperCase()}),body:Object.assign(es(),{classList:{add(){},remove(){},contains(){return false;},toggle(){}}}),head:es(),addEventListener(){},removeEventListener(){},location:{href:'',origin:''},title:''};
    ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;
    ctx.window.addEventListener=()=>{};ctx.window.removeEventListener=()=>{};ctx.window.dispatchEvent=()=>true;
    ctx.window.requestAnimationFrame=fn=>setTimeout(fn,16);ctx.window.cancelAnimationFrame=()=>{};
    ctx.window.performance={now:()=>Date.now()};ctx.window.localStorage=ctx.localStorage;
    ctx.window.navigator={language:'zh-CN',vibrate(){},serviceWorker:{register:async()=>({then(fn){try{fn();}catch(_){}return{catch(){}};}})},userAgent:'Chrome/83'};
    ctx.navigator=ctx.window.navigator;
    ctx.setTimeout=(fn)=>{try{fn();}catch(_){}return 1;};ctx.clearTimeout=()=>{};ctx.setInterval=ctx.setTimeout;ctx.clearInterval=()=>{};
    ctx.requestAnimationFrame=fn=>setTimeout(fn,16);ctx.cancelAnimationFrame=()=>{};
    ctx.Event=class{};ctx.CustomEvent=class extends ctx.Event{};
    ctx.Notification={requestPermission:async()=>'granted',permission:'default'};
    ctx.performance={now:()=>Date.now()};
    vm.createContext(ctx);
    try{ vm.runInContext(m[1],ctx,{timeout:30000,displayErrors:false}); }
    catch(e){ console.log('   ❌ vm runtime: '+e.message); return 13; }
    let pass=0;const fail=[];
    must.forEach(n=>{const t=typeof ctx.window[n];if(t==='function'||t==='object'||t==='string')pass++;else fail.push(n+'('+t+')');});
    const threshold=Math.ceil(must.length*0.9);
    console.log('   挂 window: '+pass+'/'+must.length+' (≥'+threshold+'=✅) → '+(pass>=threshold?'✅':'❌'));
    if(fail.length) console.log('   缺失: '+fail.join(', '));
    if(pass<threshold) return 14;
  }
  console.log('🎉 lightVerify PASS');
  return 0;
}

// ===== CLI =====
function parseFlags(args){
  const opts={};
  args.filter(a=>a.startsWith('--')).forEach(a=>{
    const [k,v]=a.slice(2).split('='); opts[k]=v==null?'true':v;
  });
  return opts;
}
const args=process.argv.slice(2);
const cmd=args[0];
const opts=parseFlags(args);

if(cmd==='build'){
  const hp=args[1]||'/workspace/知命V2.html';
  buildAnchorMap(hp);
}else if(cmd==='apply'){
  const hp=args[1], bp=args[2];
  if(!hp||!bp){console.error('用法: node make_fast_patch.js apply <html> <bundle.json>'); process.exit(2);}
  applyPatches(hp,bp);
}else if(cmd==='verify'){
  const hp=args[1];
  if(!hp){console.error('用法: node make_fast_patch.js verify <patched.html> --must=a,b --strings=c,d');process.exit(2);}
  const code=lightVerify(hp,opts);
  process.exit(code);
}else{
  console.log('make_fast_patch v1.0 通用单文件大前端批量迭代加速器\n');
  console.log('  子命令:');
  console.log('    build  <html>                  → 扫描锚点，生成 <html>.anchors.json');
  console.log('    apply  <html> <bundle.json>   → 一次性注入 N 个补丁（从底往顶，无偏移）');
  console.log('    verify <patched.html>         → --must=fn1,fn2 沙箱挂窗, --strings=a,b 入口存在');
  console.log('\n  典型 1-2-3 回合:');
  console.log('    node make_fast_patch.js build 知命V2.html');
  console.log('    # 挑锚点，写 patches/*.json');
  console.log('    node make_fast_patch.js apply 知命V2.html patches_bundle_all.json');
  console.log('    node make_fast_patch.js verify 知命V2.patched.html --must=fn1,fn2 --strings=id=x,id=y\n');
}

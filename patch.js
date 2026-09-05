const fs = require('fs');
const PATH = '/workspace/知命V2.html';
let html = fs.readFileSync(PATH, 'utf8');

console.log('Original size:', html.length, 'bytes');
let sizeOrig = html.length;

// ============ E1.1: Insert errBox HTML after <body ...> ============
const errBoxHTML = `<div id="errBox" style="display:none;position:fixed;top:0;left:0;right:0;z-index:99999;background:#D32F2F;color:#fff;padding:10px 14px;font:13px/1.5 -apple-system,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35);">
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
    <div>
      <div style="font-weight:800;">🚨 知命V2检测到异常（不影响使用）</div>
      <div id="errBoxMsg" style="margin-top:4px;word-break:break-all;opacity:.95;max-height:88px;overflow:auto;"></div>
      <div style="margin-top:6px;opacity:.8;font-size:11px;">请点击右侧按钮复制错误信息 → 发给开发者即可定位</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
      <button onclick="copyErrInfo()" style="background:#fff;color:#D32F2F;border:none;border-radius:6px;height:28px;padding:0 10px;font-weight:700;cursor:pointer;">📋 复制</button>
      <button onclick="document.getElementById('errBox').style.display='none'" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:6px;height:26px;padding:0 10px;cursor:pointer;">✕</button>
    </div>
  </div>
</div>
`;

// Insert right after <body class="theme-light">\n
const bodyTag = /(<body class="theme-light">\n)/;
if (!bodyTag.test(html)) { console.error('ERR: <body> tag not found'); process.exit(1); }
html = html.replace(bodyTag, '$1' + errBoxHTML);

console.log('After E1.1:', html.length);

// ============ E1.2/E1.3: Insert JS right after DEBUG=false ============
const e1js = `
const ZHIMING_BUILD = 'v2.9.0-20260829';

// ===== E1: 全局错误拦截 =====
window._errLog=[];
function _formatErr(title, msg, url, ln, col, stack){
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const tm = new Date().toLocaleString();
  const ver = typeof ZHIMING_BUILD !== 'undefined' ? ZHIMING_BUILD : '?';
  const info =
    '=== 知命V2 异常报告 ===\\n'+
    'Build: '+ver+'\\n'+
    'Time : '+tm+'\\n'+
    'UA   : '+ua+'\\n'+
    '错误 : '+title+'\\n'+
    '信息 : '+(msg||'-')+'\\n'+
    '位置 : '+(url||'-')+':'+(ln||'-')+':'+(col||'-')+'\\n'+
    '堆栈 : '+(stack||'-')+'\\n'+
    '最近上下文:\\n' +
    (window._errLog.slice(-5).map((l,i)=>'  ['+(window._errLog.length-5+i)+'] '+l).join('\\n') || '  (空)');
  return info;
}
function showErrBox(msg){
  try{
    document.getElementById('errBoxMsg').innerText = msg.substring(0,220);
    document.getElementById('errBox').style.display='block';
  }catch(e){}
}
function copyErrInfo(){
  const last = window._errLog.slice(-1)[0] || '';
  const info = _formatErr('LastError', last, '', '', '', new Error().stack||'');
  try{
    const t = document.createElement('textarea');
    t.value = info; document.body.appendChild(t); t.select();
    document.execCommand('copy'); document.body.removeChild(t);
    showToast('📋 错误信息已复制，发给开发者即可秒定位','success',2500);
  }catch(e){
    try{ prompt('请全选复制以下错误信息：', info); }catch(_){}
  }
}
window.addEventListener('error', function(e){
  const msg = [e.message, e.filename, e.lineno, e.colno, e.error&&e.error.stack].filter(x=>x).join(' | ');
  window._errLog.push('ERR '+msg);
  showErrBox(msg);
}, true);
window.addEventListener('unhandledrejection', function(e){
  const msg = typeof e.reason === 'string' ? e.reason : (e.reason&&e.reason.stack ? e.reason.stack : String(e.reason||''));
  window._errLog.push('REJ '+msg);
  showErrBox('Promise未捕获: ' + msg.substring(0,180));
}, true);

// ===== E1b: 关键函数调用轨迹（最多记15条，便于复盘上下文）=====
function _traceCall(fnName){ window._errLog.push('CALL '+fnName+' @'+new Date().toLocaleTimeString()); if(window._errLog.length>80) window._errLog.splice(0,window._errLog.length-80); }

(function(){
  const names = ['calcBazi','runBacktest','calcGongzhen','calcWuge','calcZhouyi','calcQimen','calcXiaoliuren','calcCezi','drawTarot','renderZodiac','renderAlmanac','calcMeihua','calcLingshu','gongzhenCalc','renderToday','switchTab'];
  names.forEach(n=>{
    const orig = window[n]; if(typeof orig!=='function') return;
    window[n] = function(){
      _traceCall(n);
      try { return orig.apply(this, arguments); }
      catch(err){
        window._errLog.push('THROW in '+n+': '+(err&&err.message)+' '+(err&&err.stack));
        showErrBox('【'+n+'】异常: '+(err&&err.message));
        throw err;
      }
    };
  });
})();
`;

const debugLine = /(const DEBUG=false;[^\n]*\n)/;
if (!debugLine.test(html)) { console.error('ERR: DEBUG=false line not found'); process.exit(1); }
html = html.replace(debugLine, '$1' + e1js);

console.log('After E1.2+E1.3:', html.length);

// ============ E2: runInlineSelfCheck function - insert BEFORE init() ============
const selfCheckFn = `
function runInlineSelfCheck(){
  const failures = [];
  const pushFail = (id, actual, expect) => failures.push({id, actual, expect});
  try{
    const ja = [
      {y:2024,i:2, expH:16, expM:26, name:'2024立春'},
      {y:2024,i:11,expH:22, expM:50, name:'2024夏至'},
      {y:1989,i:12,expH:11, expM:19, name:'1989小暑'},
      {y:1990,i:20,expH:20, expM:45, name:'1990立冬'},
      {y:2000,i:5, expH:15, expM:35, name:'2000春分'},
    ];
    ja.forEach(c=>{ try{
      const d=getJieqi(c.y,c.i); if(!d)return pushFail('JQ:'+c.name,'null','Date');
      if(d.getHours()!==c.expH) pushFail('JQ:'+c.name+':hour', d.getHours(), c.expH);
      if(d.getMinutes()!==c.expM) pushFail('JQ:'+c.name+':minute', d.getMinutes(), c.expM);
    }catch(e){ pushFail('JQ:'+c.name, 'err:'+e.message, 'Date');} });
    try{
      if(typeof calcLingshu === 'function'){
        const ls9 = calcLingshu(1986,9,12);
        if(ls9.lifeNumber!==9) pushFail('LS:1986-09-12 命数', ls9.lifeNumber, 9);
        if(ls9.talents.join('')!=='36') pushFail('LS:1986-09-12 天赋', ls9.talents.join(''), '36');
      }
    }catch(e){pushFail('LS calc', 'err:'+e.message, 'ok');}
    try{
      if(typeof calcMeihua === 'function'){
        const mh = calcMeihua({mode:'num', num1:3, num2:7, dontSave:true});
        if(mh.tiYongLabel!=='用生体' || mh.levelColor!=='good2') pushFail('MH:3/7 用生体大吉', mh.tiYongLabel+'/'+mh.levelColor, '用生体/good2');
      }
    }catch(e){pushFail('MH calc','err:'+e.message,'ok');}
    try{
      if(typeof baziCalc === 'function'){
        const bz = baziCalc({year:2000,month:1,day:1,hour:12,minute:0,gender:'male',cityLng:116.4,dontSave:true});
        if(!bz||!bz.dGZ||!bz.dGZ.match(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/)) pushFail('Bazi:2000-01-01日柱', bz&&bz.dGZ, '甲子表格式');
      }
    }catch(e){pushFail('Bazi JD calc','err:'+e.message,'ok');}
    try{
      if(typeof renderTarotFaceSVG === 'function'){
        if(!renderTarotFaceSVG(0).includes('<svg')) pushFail('SVG:0愚者','无<svg>','含<svg>');
        if(!renderTarotFaceSVG(21).includes('<svg')) pushFail('SVG:21世界','无<svg>','含<svg>');
        if(!renderTarotFaceSVG(77).includes('<svg')) pushFail('SVG:77星币国王','无<svg>','含<svg>');
      }
    }catch(e){pushFail('SVG render','err:'+e.message,'ok');}
  }catch(e){failures.push({id:'SELFCHECK_THROW', actual:'err:'+e.message, expect:'no throw'});}

  try{
    const old = document.getElementById('selfCheckBar');
    if(old) old.remove();
    const bar = document.createElement('div');
    bar.id='selfCheckBar';
    if(failures.length===0){
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:#2E7D32;color:#fff;padding:6px 12px;font:12px sans-serif;display:flex;justify-content:space-between;';
      bar.innerHTML = '<div>✅ 知命V2 算法自检 PASS（'+(ja.length+5)+' 项断言） Build '+ZHIMING_BUILD+'</div>'+
        '<button onclick="document.getElementById(\\'selfCheckBar\\').remove()" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:4px;padding:2px 8px;cursor:pointer;">✕</button>';
    }else{
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#E65100;color:#fff;padding:6px 10px;font:12px/1.45 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);';
      const list = failures.slice(0,10).map(f=>'· '+f.id+': 实际='+f.actual+' 期望='+f.expect).join('<br>');
      const more = failures.length>10 ? '<br>...还有 '+(failures.length-10)+' 条</div>' : '';
      bar.innerHTML =
        '<div style="font-weight:800;">🧨 知命V2 自检发现 '+failures.length+' 项问题（可能是算法bug）</div>'+
        '<div style="margin-top:3px;max-height:120px;overflow:auto;word-break:break-all;">'+list+more+'</div>'+
        '<div style="margin-top:5px;display:flex;gap:6px;">'+
        '<button onclick="(function(){const d=document.createElement(\\'div\\');d.innerText=\\'FAILURES:\\\\n\\'+JSON.stringify(runInlineSelfCheck.__last||[],null,2);const bar=document.getElementById(\\'selfCheckBar\\');bar.appendChild(d);})()" style="background:#fff;color:#E65100;border:0;border-radius:4px;padding:3px 8px;font-weight:700;">📋 复制详情</button>'+
        '<button onclick="document.getElementById(\\'selfCheckBar\\').remove()" style="background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:4px;padding:3px 8px;">✕</button>'+
        '</div>';
      runInlineSelfCheck.__last = failures;
    }
    const checkInterval = setInterval(()=>{
      if(document.body){document.body.appendChild(bar);clearInterval(checkInterval);}
    },10); setTimeout(()=>clearInterval(checkInterval),500);
  }catch(e){}
  return failures;
}
`;

// Find "function init(){" and insert selfCheckFn before it
const initFn = /(function init\(\)\{)/;
if (!initFn.test(html)) { console.error('ERR: init() not found'); process.exit(1); }
html = html.replace(initFn, selfCheckFn + '\n$1');

console.log('After E2 selfCheckFn:', html.length);

// E2: Modify init() to call runInlineSelfCheck() as first line
// Replace "function init(){\n  initKeyboardFix();" with "function init(){\n  runInlineSelfCheck();\n  initKeyboardFix();"
const initBody = /(function init\(\)\{\n)(  initKeyboardFix\(\);)/;
if (!initBody.test(html)) { console.error('ERR: init() body pattern not found'); process.exit(1); }
html = html.replace(initBody, '$1  runInlineSelfCheck();\n$2');
console.log('After E2 init call:', html.length);

// ============ E2: Input validation wrappers ============
// Insert these as IIFE right before the patchScroll IIFE (which is at ~4950, the code starting with "// patchScroll...")
const inputValidators = `
/* =========================================================
 *  E2: 输入参数校验（防NaN/乱输）
 * =======================================================*/
(function(){
  const _chkDate = (y,m,d,h,minute) => {
    if(!(y>=1900&&y<=2100)) return false;
    if(!(m>=1&&m<=12)) return false;
    if(!(d>=1&&d<=31)) return false;
    if(h!==undefined && !(h>=0&&h<=23)) return false;
    if(minute!==undefined && !(minute>=0&&minute<=59)) return false;
    return true;
  };
  const _readBazi = () => {
    try{
      const y=+document.getElementById("bz-year").value;
      const m=+document.getElementById("bz-month").value;
      const d=+document.getElementById("bz-day").value;
      const h=+document.getElementById("bz-hour").value;
      const mn=+document.getElementById("bz-minute").value;
      return _chkDate(y,m,d,h,mn);
    }catch(_){return false;}
  };
  const _readQM = () => {
    try{
      const y=+document.getElementById("qm-year").value;
      const m=+document.getElementById("qm-month").value;
      const d=+document.getElementById("qm-day").value;
      const h=+document.getElementById("qm-hour").value;
      const mn=+document.getElementById("qm-minute").value;
      return _chkDate(y,m,d,h,mn);
    }catch(_){return false;}
  };
  const _readGZ = () => {
    try{
      const y=+document.getElementById("gz-year").value;
      const m=+document.getElementById("gz-month").value;
      const d=+document.getElementById("gz-day").value;
      const h=+document.getElementById("gz-hour").value;
      const mn=+document.getElementById("gz-minute").value;
      return _chkDate(y,m,d,h,mn);
    }catch(_){return false;}
  };
  const _readXLR = () => {
    try{
      const y=+document.getElementById("xlr-year").value;
      const m=+document.getElementById("xlr-month").value;
      const d=+document.getElementById("xlr-day").value;
      const h=+document.getElementById("xlr-hour").value;
      return _chkDate(y,m,d,h,undefined);
    }catch(_){return false;}
  };
  const _readMH = () => {
    try{
      const y=+document.getElementById("mh-year").value;
      const m=+document.getElementById("mh-month").value;
      const d=+document.getElementById("mh-day").value;
      const h=+document.getElementById("mh-hour").value;
      if(document.getElementById("mh-mode-num")&&document.getElementById("mh-mode-num").checked) return true;
      return _chkDate(y,m,d,h,undefined);
    }catch(_){return false;}
  };
  if (typeof window.calcBazi === 'function'){
    const _o = window.calcBazi;
    window.calcBazi = function(){
      if(!_readBazi()){ showToast('输入非法：日期范围错误','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcQimen === 'function'){
    const _o = window.calcQimen;
    window.calcQimen = function(){
      if(!_readQM()){ showToast('输入非法：日期范围错误','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcGongzhen === 'function'){
    const _o = window.calcGongzhen;
    window.calcGongzhen = function(){
      if(!_readGZ()){ showToast('输入非法：日期范围错误','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcXiaoliuren === 'function'){
    const _o = window.calcXiaoliuren;
    window.calcXiaoliuren = function(){
      if(!_readXLR()){ showToast('输入非法：日期范围错误','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcMeihua === 'function'){
    const _o = window.calcMeihua;
    window.calcMeihua = function(){
      if(!_readMH()){ showToast('输入非法：日期范围错误','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcLingshu === 'function'){
    const _o = window.calcLingshu;
    window.calcLingshu = function(y,m,d){
      if(!(y>=1850&&y<=2100)||!(m>=1&&m<=12)||!(d>=1&&d<=31)){ showToast('请输入正确的出生日期','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
  if (typeof window.calcCezi === 'function'){
    const _o = window.calcCezi;
    window.calcCezi = function(){
      let txt='';
      try{ txt = document.getElementById("cz-input").value.trim(); }catch(_){}
      if(!txt){ showToast('请输入一个汉字','warn'); return; }
      return _o.apply(this, arguments);
    };
  }
})();

`;

// Find the patchScroll comment/function pattern. Look for the line before "patchScroll('calcBazi'"
// which is inside an IIFE. Search for the distinctive pattern.
const patchScrollAnchor = /(\s*patchScroll\('calcBazi',\s*'bz-result',\s*60\);)/;
if (!patchScrollAnchor.test(html)) { console.error('ERR: patchScroll anchor not found'); process.exit(1); }
html = html.replace(patchScrollAnchor, inputValidators + '$1');
console.log('After E2 input validators:', html.length);

// ============ E4 CSS: Add to end of <style> section ============
const e4css = `
/* ============================================================ */
/* Section CSS-14 错误面板(E1)/自检横幅(E2)/Debug浮标(E4)      */
/* ============================================================ */
.result-wrap { position:relative; }
.result-debug-toggle { position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:50%;
  background:var(--card); border:1px solid var(--line); color:var(--text-hint); font-size:12px; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; line-height:1;}
.result-debug-panel { position:absolute; top:34px; right:8px; width:300px; background:var(--card); border:1px solid var(--line); border-radius:8px; padding:10px; font-size:11px; color:var(--text-hint); box-shadow:var(--shadow); z-index:10; display:none; line-height:1.5;}
.result-debug-panel.open { display:block; }
.result-debug-panel .dbg-btn { background:var(--pri-light); color:var(--pri-dark); border:none; border-radius:4px; padding:3px 8px; cursor:pointer; font-weight:700; font-size:11px; margin-top:6px;}
`;

// Find </style> on line by itself
const styleEnd = /(\n<\/style>\n)/;
if (!styleEnd.test(html)) { console.error('ERR: </style> not found'); process.exit(1); }
html = html.replace(styleEnd, e4css + '$1');
console.log('After E4 CSS:', html.length);

// ============ E4 JS: Debug toggle helpers + export function ============
const e4js = `
/* =========================================================
 *  E4: 结果区Debug浮标 & 导出
 * =======================================================*/
function _hash32(str){
  str = String(str||'');
  let h = 2166136261 >>> 0;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function _collectInputHash(moduleId){
  try{
    const map = {
      'bz-result': ['bz-year','bz-month','bz-day','bz-hour','bz-minute','bz-gender','bz-city','bz-customLng'],
      'qm-result': ['qm-year','qm-month','qm-day','qm-hour','qm-minute','qm-gender','qm-city','qm-question'],
      'gz-result': ['gz-question','gz-year','gz-month','gz-day','gz-hour','gz-minute','gz-city','gz-gender'],
      'wg-result': ['wg-surname','wg-givenname'],
      'zy-result': ['zy-yao1','zy-yao2','zy-yao3','zy-yao4','zy-yao5','zy-yao6','zy-question'],
      'xlr-result': ['xlr-year','xlr-month','xlr-day','xlr-hour','xlr-question'],
      'cz-result': ['cz-input'],
      'mh-result': ['mh-mode-num','mh-mode-time','mh-num1','mh-num2','mh-year','mh-month','mh-day','mh-hour','mh-question'],
      'tarot-result': ['tarot-count'],
      'zodiac-result': ['zodiac-sign','zodiac-type'],
      'ls-result': ['ls-year','ls-month','ls-day'],
    };
    const ids = map[moduleId] || [];
    const parts = ids.map(id=>{
      const el = document.getElementById(id); if(!el) return id+'=?';
      if(el.type==='radio'||el.type==='checkbox'){
        const ckd = document.querySelector('input[name="'+el.name+'"]:checked'); return id+'='+(ckd?ckd.value:'none');
      }
      return id+'='+el.value;
    }).join('|');
    return _hash32(parts)+'';
  }catch(e){ return 'err:'+e.message; }
}
function _getActiveTabs(){
  try{
    const pg = document.querySelector('.btab.active'); const main = pg?pg.dataset.page:'?';
    const st = document.querySelector('.subtab.active'); const sub = st?st.dataset.sec:'-';
    return main + ' / ' + sub;
  }catch(_){ return '?/?'; }
}
function ensureResultDebugToggle(resultId, moduleName, startTimeMs){
  try{
    const wrap = document.getElementById(resultId); if(!wrap) return;
    wrap.classList.add('result-wrap');
    if(wrap.querySelector('.result-debug-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'result-debug-toggle';
    btn.type = 'button';
    btn.innerHTML = '🔧';
    btn.title = 'Debug信息';
    const durationMs = startTimeMs? (Date.now()-startTimeMs)+'ms' : '-';
    btn.onclick = function(e){
      e.stopPropagation();
      let panel = wrap.querySelector('.result-debug-panel');
      if(panel){ panel.classList.toggle('open'); return; }
      panel = document.createElement('div');
      panel.className = 'result-debug-panel';
      const err3 = (window._errLog||[]).slice(-3).map((l,i)=>'  ['+((window._errLog||[]).length-3+i)+'] '+l).join('\\n') || '  (空)';
      panel.innerHTML =
        '<div style="font-weight:700;color:var(--pri);margin-bottom:4px;">🔧 Debug 信息</div>'+
        '<div>Build: '+ZHIMING_BUILD+'</div>'+
        '<div>当前: '+_getActiveTabs()+'</div>'+
        '<div>模块: '+moduleName+'</div>'+
        '<div>输入哈希: '+_collectInputHash(resultId)+'</div>'+
        '<div>耗时: '+durationMs+'</div>'+
        '<div style="margin-top:4px;">最近错误 ('+((window._errLog||[]).length)+' total):</div>'+
        '<pre style="margin:2px 0;padding:4px;background:var(--track-bg);border-radius:4px;overflow:auto;font-size:10px;white-space:pre-wrap;word-break:break-all;">'+err3+'</pre>'+
        '<button class="dbg-btn" onclick="exportDebugTxt()">📤 一键导出 debug.txt</button>';
      wrap.appendChild(panel);
      panel.classList.add('open');
    };
    wrap.appendChild(btn);
  }catch(_){}
}
function exportDebugTxt(){
  try{
    const lines = [];
    lines.push('=== 知命V2 Debug Export ===');
    lines.push('Build: '+ZHIMING_BUILD);
    lines.push('Time : '+new Date().toLocaleString());
    lines.push('UA   : '+navigator.userAgent);
    lines.push('当前Tabs: '+_getActiveTabs());
    lines.push('');
    lines.push('--- localStorage ---');
    try{
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        let v = localStorage.getItem(k);
        if(v && v.length > 500) v = v.substring(0,500)+'...[truncated total '+v.length+' bytes]';
        lines.push('['+k+'] = '+v);
      }
    }catch(e){ lines.push('localStorage err: '+e.message); }
    lines.push('');
    lines.push('--- _errLog (最近15条) ---');
    (window._errLog||[]).slice(-15).forEach((l,i)=>{
      lines.push('  ['+((window._errLog||[]).length-15+i)+'] '+l);
    });
    const txt = lines.join('\\n');
    const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zhimingv2-debug-'+Date.now()+'.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    showToast('📤 已导出 debug.txt','success',2000);
  }catch(e){
    try{ prompt('请复制以下Debug内容：', String(e&&e.message||e)); }catch(_){}
  }
}
(function(){
  const RESULT_MAP = {
    'bz-result':'八字排盘','qm-result':'奇门遁甲','gz-result':'共振判定','wg-result':'姓名五格',
    'zy-result':'六十四卦','xlr-result':'小六壬','cz-result':'测字','mh-result':'梅花易数',
    'tarot-result':'塔罗牌','zodiac-result':'星座运势','ls-result':'生命灵数','almanac-body':'黄历',
    'bt-result':'回测'
  };
  window._ensureDebugOnAllResults = function(){
    Object.entries(RESULT_MAP).forEach(([rid, mname])=>{
      const el = document.getElementById(rid);
      if(el && el.innerHTML.trim().length>10) ensureResultDebugToggle(rid, mname, 0);
    });
  };
  // Hook into patchScroll: monkey-patch patchScroll to add timing + debug toggle
  if(typeof window.patchScroll !== 'undefined' || typeof patchScroll !== 'undefined'){
    // patchScroll is already applied via IIFE; hook ensureResultDebugToggle at scroll time
    const origSTS = window.scrollToResult || scrollToResult;
    if(typeof origSTS === 'function'){
      const _wrapped = function(rid){
        const mname = RESULT_MAP[rid] || rid;
        const t0 = window._dbgStart && window._dbgStart[rid] ? window._dbgStart[rid] : 0;
        setTimeout(()=>ensureResultDebugToggle(rid, mname, t0), 60);
        return origSTS.apply(this, arguments);
      };
      window.scrollToResult = _wrapped;
    }
  }
  // Record start time: hook into setBtnLoading pattern
  const origSBL = window.setBtnLoading || setBtnLoading;
  if(typeof origSBL === 'function'){
    window._dbgStart = {};
    window.setBtnLoading = function(btn, loading){
      if(btn && loading){
        const form = btn.closest('form') || btn.closest('.section') || btn.closest('.page');
        if(form){
          const allMap = {'bz-':'bz-result','qm-':'qm-result','gz-':'gz-result','wg-':'wg-result',
            'zy-':'zy-result','xlr-':'xlr-result','cz-':'cz-result','mh-':'mh-result','ls-':'ls-result'};
          Object.entries(allMap).forEach(([pf,rid])=>{
            if(form.querySelector('[id^="'+pf+'"]')){ window._dbgStart[rid] = Date.now(); }
          });
        }
      }
      return origSBL.apply(this, arguments);
    };
  }
  // Apply debug toggle to static results (almanac/today) at DOMContentLoaded
  const _origInit = typeof window.init === 'function' ? window.init : null;
  if(_origInit){
    document.addEventListener('DOMContentLoaded', ()=>{
      setTimeout(()=>{
        ensureResultDebugToggle('almanac-body','黄历',0);
      }, 500);
    });
  }
})();
`;

// Insert E4 JS right before "/* 暴露到全局" comment at ~line 5157
const exposeAnchor = /(\n\/\* 暴露到全局)/;
if (!exposeAnchor.test(html)) { console.error('ERR: expose anchor not found'); process.exit(1); }
html = html.replace(exposeAnchor, '\n' + e4js + '$1');
console.log('After E4 JS:', html.length);

// ============ E4: Also enhance the drawTarot/renderZodiac/custom wrappers to call ensureResultDebugToggle ============
// Find section:  const _dt = window.drawTarot;
// Add ensureResultDebugToggle inside finally block after scroll
const drawTarotPatch = /(try\{ scrollToResult\('tarot-result'\); \}catch\(e\)\{\}\n\s+if\(rEl\)\{rEl\.classList\.remove\('result-loading'\);rEl\.classList\.add\('result-show'\);\}\n\s+setTimeout\(\(\)=>\{ setBtnLoading\(btn, false\); \}, 200\);\n\s+\}, 1200\);)/;
if (drawTarotPatch.test(html)) {
  html = html.replace(drawTarotPatch, "try{ scrollToResult('tarot-result'); }catch(e){}\n        if(rEl){rEl.classList.remove('result-loading');rEl.classList.add('result-show');ensureResultDebugToggle('tarot-result','塔罗牌',window._dbgStart&&window._dbgStart['tarot-result']||0);}\n        setTimeout(()=>{ setBtnLoading(btn, false); }, 200);\n      }, 1200);");
  console.log('After E4 drawTarot patch:', html.length);
} else {
  console.log('WARN: drawTarotPatch pattern not matched, skipping');
}

// Zodiac patch: scrollToResult('zodiac-result')
const zodiacPatch = /(scrollToResult\('zodiac-result'\);\n\s+if\(rEl\)\{rEl\.classList\.remove\('result-loading'\);rEl\.classList\.add\('result-show'\);\})/;
if (zodiacPatch.test(html)) {
  html = html.replace(zodiacPatch, "scrollToResult('zodiac-result');\n      if(rEl){rEl.classList.remove('result-loading');rEl.classList.add('result-show');ensureResultDebugToggle('zodiac-result','星座运势',0);}");
  console.log('After E4 zodiac patch:', html.length);
} else {
  console.log('WARN: zodiacPatch pattern not matched, skipping');
}

// Almanac-body: switchAlmanac
const swAlmPatch = /(setTimeout\(\)=>scrollToResult\('almanac-body'\), 50\);)/;
if (swAlmPatch.test(html)) {
  html = html.replace(swAlmPatch, "setTimeout(()=>{scrollToResult('almanac-body');ensureResultDebugToggle('almanac-body','黄历',0);}, 50);");
  console.log('After E4 switchAlmanac patch:', html.length);
} else {
  console.log('WARN: switchAlmanac patch pattern not matched, skipping');
}

// ============ E3.1 CSS section anchors - at style start and logical split points ============
// Find style start after <style>\n
const cssStart = /(<style>\n)(:root, body\.theme-light)/;
if (cssStart.test(html)) {
  html = html.replace(cssStart, `$1/* ============================================================ */\n/* Section CSS-01 全局变量与主题 (light/dark/today/cn/wu/al)   */\n/* ============================================================ */\n$2`);
} else { console.log('WARN: cssStart not matched'); }
console.log('After CSS-01 anchor:', html.length);

// CSS-02 通用组件 - before `.topbar{` (this is the 1st major component after vars)
const css02 = /(\n\.topbar\{position:sticky)/;
if (css02.test(html)) {
  html = html.replace(css02, `\n/* ============================================================ */\n/* Section CSS-02 通用组件 (card/form/input/button/modal)       */\n/* ============================================================ */$1`);
} else { console.log('WARN: css02 anchor not matched'); }
console.log('After CSS-02 anchor:', html.length);

// CSS-03 八字/五格/回测 - before `.pillars{`
const css03 = /(\n\.pillars\{display:grid)/;
if (css03.test(html)) {
  html = html.replace(css03, `\n/* ============================================================ */\n/* Section CSS-03 八字/五格/回测                                */\n/* ============================================================ */$1`);
} else { console.log('WARN: css03 anchor not matched'); }
console.log('After CSS-03 anchor:', html.length);

// CSS-04 奇门/小六壬/测字/梅花 - before `.fangwei-grid{`
const css04 = /(\n\.fangwei-grid\{display:grid)/;
if (css04.test(html)) {
  html = html.replace(css04, `\n/* ============================================================ */\n/* Section CSS-04 奇门/小六壬/测字/梅花                         */\n/* ============================================================ */$1`);
} else { console.log('WARN: css04 anchor not matched'); }
console.log('After CSS-04 anchor:', html.length);

// CSS-05 塔罗/星座/灵数 - before `.bottom-tabs{` (bottom-tabs comes after almanac content, actually let me find a better marker)
// Actually let me just use later CSS markers. Let me check the style order: we already have fangwei-grid -> bottom-tabs is later.
// Let me search for `.copy-bar{` which is after the modules
const css06 = /(\n\.copy-bar\{position:sticky)/;
if (css06.test(html)) {
  html = html.replace(css06, `\n/* ============================================================ */\n/* Section CSS-05 塔罗/星座/灵数 + 复制栏/说明                 */\n/* ============================================================ */$1`);
} else { console.log('WARN: css05 anchor (copy-bar) not matched'); }
console.log('After CSS-05 anchor:', html.length);

// CSS-07 黄历 + CSS-08 are probably interleaved. For remaining let's attach before modal
const css09 = /(\n\.modal-mask\{position:fixed)/;
if (css09.test(html)) {
  html = html.replace(css09, `\n/* ============================================================ */\n/* Section CSS-09 历史Modal/词典/档案/日记/PWA提示              */\n/* ============================================================ */$1`);
} else { console.log('WARN: css09 anchor (modal-mask) not matched'); }
console.log('After CSS-09 anchor:', html.length);

// CSS-15 END 移动端适配 (before @media at end of style - this is too vague, skip)
// Instead, attach CSS-12/13 by finding .hist-filter
const css12 = /(\n\.hist-filter\{display:flex)/;
if (css12.test(html)) {
  html = html.replace(css12, `\n/* ============================================================ */\n/* Section CSS-09b 历史列表/搜索过滤                            */\n/* ============================================================ */$1`);
} else { console.log('WARN: css12 anchor (hist-filter) not matched'); }
console.log('After CSS-12 anchor:', html.length);

// ============ E3.2 JS section anchors ============
// JS-00 + JS-01 is already done (DEBUG + E1 code we inserted)
// JS-02 数据常量 before Phase 1.5 comment which is before TEXT
const js02 = /(\n\/\* =+\n \*  Phase 1\.5)/;
if (js02.test(html)) {
  html = html.replace(js02, `\n/* ============================================================ */\n/* Section JS-02 数据常量 (CITIES/64卦/78塔罗/81数理/纳音/...)  */\n/* ============================================================ */$1`);
} else { console.log('WARN: js02 TEXT anchor not matched'); }
console.log('After JS-02 anchor:', html.length);

// JS-03 基础算法 before "Phase 1.2 真太阳时校正" (which is actually getJieqi, let me find that pattern)
const js03 = /(\n\/\* =+\n \*  Phase 1\.2 真太阳时校正)/;
if (js03.test(html)) {
  html = html.replace(js03, `\n/* ============================================================ */\n/* Section JS-03 基础算法 (节气/真太阳时/JD/干支/五行/农历)      */\n/* ============================================================ */$1`);
} else { console.log('WARN: js03 真太阳时 anchor not matched'); }
console.log('After JS-03 anchor:', html.length);

// JS-04 核心模块 (八字+回测/五格/周易) - before calcBazi function
const js04 = /(\nfunction calcBazi\(\)\{)/;
if (js04.test(html)) {
  html = html.replace(js04, `\n/* ============================================================ */\n/* Section JS-04 核心模块 (八字+回测/五格/周易)                 */\n/* ============================================================ */$1`);
} else { console.log('WARN: js04 calcBazi anchor not matched'); }
console.log('After JS-04 anchor:', html.length);

// JS-05 核心模块 (奇门/小六壬/测字/梅花) - before calcQimen
const js05 = /(\nfunction calcQimen\(\)\{)/;
if (js05.test(html)) {
  html = html.replace(js05, `\n/* ============================================================ */\n/* Section JS-05 核心模块 (奇门/小六壬/测字/梅花)               */\n/* ============================================================ */$1`);
} else { console.log('WARN: js05 calcQimen anchor not matched'); }
console.log('After JS-05 anchor:', html.length);

// JS-06 核心模块 (塔罗/星座/灵数) - before drawTarot
const js06 = /(\nfunction drawTarot\(\)\{)/;
if (js06.test(html)) {
  html = html.replace(js06, `\n/* ============================================================ */\n/* Section JS-06 核心模块 (塔罗/星座/灵数)                      */\n/* ============================================================ */$1`);
} else { console.log('WARN: js06 drawTarot anchor not matched'); }
console.log('After JS-06 anchor:', html.length);

// JS-07 核心模块 (共振判定) - before gongzhenCalc
const js07 = /(\nfunction gongzhenCalc\(question, y, m, d, h, minute, city, gender\)\{)/;
if (js07.test(html)) {
  html = html.replace(js07, `\n/* ============================================================ */\n/* Section JS-07 核心模块 (共振判定/算法)                       */\n/* ============================================================ */$1`);
} else { console.log('WARN: js07 gongzhenCalc anchor not matched'); }
console.log('After JS-07 anchor:', html.length);

// JS-08 Tab切换 - before "Tab & Section 切换" comment
const js08 = /(\n\/\* =+\n \*  Tab & Section 切换)/;
if (js08.test(html)) {
  html = html.replace(js08, `\n/* ============================================================ */\n/* Section JS-08 主Tab+子Tab切换/导航/手势/键盘修复             */\n/* ============================================================ */$1`);
} else { console.log('WARN: js08 Tab切换 anchor not matched'); }
console.log('After JS-08 anchor:', html.length);

// JS-10 全局功能 - before "字段映射（草稿绑定用）"
const js10 = /(\n\/\* =+\n \*  字段映射（草稿绑定用）)/;
if (js10.test(html)) {
  html = html.replace(js10, `\n/* ============================================================ */\n/* Section JS-10 全局功能 (草稿/复制/分享卡/存档/复盘标记)      */\n/* ============================================================ */$1`);
} else { console.log('WARN: js10 DRAFT_FIELDS anchor not matched'); }
console.log('After JS-10 anchor:', html.length);

// JS-11 今日首页 + 黄历 - before renderToday function
const js11 = /(\nfunction renderToday\(\)\{)/;
if (js11.test(html)) {
  html = html.replace(js11, `\n/* ============================================================ */\n/* Section JS-11 今日首页 + 黄历渲染                           */\n/* ============================================================ */$1`);
} else { console.log('WARN: js11 renderToday anchor not matched'); }
console.log('After JS-11 anchor:', html.length);

// JS-14/JS-15/JS-16: 我们的 selfcheck, batch自测日志, 暴露全局
// Actually, runInlineSelfCheck is already placed before init() and init calls it, 
// init has self tests and expose global is after. Let's mark them:
const js14 = /(\nfunction runInlineSelfCheck\(\)\{)/;
if (js14.test(html)) {
  html = html.replace(js14, `\n/* ============================================================ */\n/* Section JS-14 算法自检横幅 E2 runInlineSelfCheck             */\n/* ============================================================ */$1`);
} else { console.log('WARN: js14 selfCheck anchor not matched (already has our label probably)'); }
console.log('After JS-14 anchor:', html.length);

// ============ E3.3: Compress 3+ consecutive empty lines to 2 ============
// Replace \n\n\n+ (3 or more newlines) with \n\n (exactly 2)
let beforeCompress = html.length;
let prev = -1;
let iter = 0;
// Loop to ensure full compression
while (prev !== html.length && iter < 5) {
  prev = html.length;
  html = html.replace(/\n\n\n+/g, '\n\n');
  iter++;
}
console.log(`After E3.3 compress (${iter} passes): ${beforeCompress} -> ${html.length}, saved ${beforeCompress - html.length} bytes`);

// ============ Final write + stats ============
fs.writeFileSync(PATH, html, 'utf8');
const finalSize = html.length;
console.log('\n=== SUMMARY ===');
console.log(`Original:  ${sizeOrig} bytes`);
console.log(`Final:     ${finalSize} bytes`);
console.log(`Delta:     ${finalSize - sizeOrig >= 0 ? '+' : ''}${finalSize - sizeOrig} bytes (${((finalSize - sizeOrig)/sizeOrig*100).toFixed(2)}%)`);
console.log(`Expected:  +9~12KB net; Actual: +${Math.round((finalSize - sizeOrig)/1024)}KB`);

// Count lines for sanity
const lines = html.split('\n').length;
console.log(`Lines:     ${lines}`);

// Sanity checks (should all pass)
const checks = [
  ['errBox id=errBox', /id="errBox"/.test(html)],
  ['errBoxMsg', /id="errBoxMsg"/.test(html)],
  ['copyErrInfo fn', /function copyErrInfo\(\)/.test(html)],
  ['ZHIMING_BUILD defined', /const ZHIMING_BUILD = 'v2\.9\.0-20260829'/.test(html)],
  ['_traceCall fn', /function _traceCall\(fnName\)/.test(html)],
  ['showErrBox fn', /function showErrBox\(msg\)/.test(html)],
  ['runInlineSelfCheck fn', /function runInlineSelfCheck\(\)/.test(html)],
  ['init() calls runInlineSelfCheck', /function init\(\)\{\s*\n\s*runInlineSelfCheck\(\);/.test(html)],
  ['calcBazi input wrapper', /window\.calcBazi = function\(\)\{/.test(html)],
  ['calcCezi input wrapper', /window\.calcCezi = function\(\)\{/.test(html)],
  ['ensureResultDebugToggle fn', /function ensureResultDebugToggle\(resultId, moduleName, startTimeMs\)/.test(html)],
  ['exportDebugTxt fn', /function exportDebugTxt\(\)/.test(html)],
  ['_hash32 fn', /function _hash32\(str\)/.test(html)],
  ['result-debug-toggle CSS', /\.result-debug-toggle \{/.test(html)],
  ['result-debug-panel CSS', /\.result-debug-panel \{/.test(html)],
  ['CSS-01 section anchor', /Section CSS-01 全局变量与主题/.test(html)],
  ['Section JS-02 data consts', /Section JS-02 数据常量/.test(html)],
  ['Section JS-03 base algo', /Section JS-03 基础算法/.test(html)],
  ['Section JS-04 八字', /Section JS-04 核心模块/.test(html)],
  ['Section JS-07 共振', /Section JS-07 核心模块 \(共振判定/.test(html)],
  ['Self test console (not injected yet)', true],
];
let pass = 0, fail = 0;
console.log('\n=== SANITY CHECKS ===');
checks.forEach(([name, ok]) => {
  if(ok){ pass++; console.log('  ✅ '+name); }
  else{ fail++; console.log('  ❌ '+name); }
});
console.log(`\nChecks: ${pass} pass, ${fail} fail`);
if(fail>0){ console.log('\n⚠ Some checks failed - review output above'); process.exit(2); }
console.log('\n✓ All structural checks pass. JS syntax check is next (via node --check on extracted script).');

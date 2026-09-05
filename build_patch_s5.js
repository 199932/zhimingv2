const fs = require('fs');

const s5Anchor = "  const PRE = ['calcBazi','calcQimen','calcGongzhen','calcWuge','calcZhouyi','calcXiaoliuren','calcCezi','calcMeihua','calcLingshu','drawTarot','renderZodiac','renderAlmanac','baziCalc','qimenCalc','gongzhenCalc','switchTab','switchSec','renderToday','runBacktest','validateJieqi','renderTarotFaceSVG','hashScore','detectZodiacIdx','trueSolarTime','getJieqi','dayGZ','ganZhiFromIndex','copyResult','saveHistory','loadHistory','renderHistory','restoreHistory','openHistory','toggleTheme','toggleDark','init',";

const s5Code = `
/* =========================================================
   UX Smooth — 14 个核心函数（G1/G2/G3/G4 共用）
   每一个声明后立即 try{window.xxx=xxx}catch(_){}，
   兼容 Chrome 83 WebView 作用域隔离。
   ========================================================= */

/* -------- G1: 首屏骨架 + 启动分帧辅助 -------- */
function paintPrimaryActionsSkeleton(){
  try{
    const zone = document.getElementById("primaryActionZone");
    if(!zone) return;
    // 如果4个按钮已经存在（非首帧无骨架模式）→ 不画
    if(zone.querySelectorAll && zone.querySelectorAll('.pab').length >= 4) return;
    zone.innerHTML = ''
      +'<button class="pab pab-cn" type="button" disabled><span class="emj sk" style="width:22px;height:22px;"></span><span class="sk" style="width:80px;height:14px;"></span></button>'
      +'<button class="pab pab-wu" type="button" disabled><span class="emj sk" style="width:22px;height:22px;"></span><span class="sk" style="width:80px;height:14px;"></span></button>'
      +'<button class="pab pab-al" type="button" disabled><span class="emj sk" style="width:22px;height:22px;"></span><span class="sk" style="width:80px;height:14px;"></span></button>'
      +'<button class="pab pab-qc" type="button" disabled><span class="emj sk" style="width:22px;height:22px;"></span><span class="sk" style="width:100px;height:14px;"></span></button>';
  }catch(_){}
}
try{ window.paintPrimaryActionsSkeleton = paintPrimaryActionsSkeleton; }catch(_){}

/* -------- G1/G4: 快速命令面板 -------- */
function openQuickCmd(preFill){
  try{
    const m = document.getElementById("quickCmdModal");
    const input = document.getElementById("qc_input");
    if(!m || !input) return;
    m.classList.add("show");
    (function hideOld(){
      if(window.visualViewport && typeof window.visualViewport.addEventListener === 'function'){
        try{ window.visualViewport.addEventListener('resize', _qcPosFix, {passive:true}); }catch(_){}
      }
    })();
    setTimeout(function(){ input.focus(); if(preFill){input.value=String(preFill);_renderQcCandidates();} else{_renderQcCandidates();} }, 30);
  }catch(_){}
}
try{ window.openQuickCmd = openQuickCmd; }catch(_){}

function closeQuickCmd(){
  try{
    const m = document.getElementById("quickCmdModal");
    const input = document.getElementById("qc_input");
    if(m) m.classList.remove("show");
    if(input) input.value = "";
    try{ window.visualViewport && typeof window.visualViewport.removeEventListener === 'function' && window.visualViewport.removeEventListener('resize', _qcPosFix); }catch(_){}
  }catch(_){}
}
try{ window.closeQuickCmd = closeQuickCmd; }catch(_){}

function executeQuickCmd(rawKeyword){
  try{
    const keyword = (rawKeyword == null ? "" : String(rawKeyword)).trim();
    if(!keyword){ closeQuickCmd(); return false; }
    // 1. 精确词典/反馈：词典型 命令前缀 "词典 XXX" "查 XXX"
    const dictM = keyword.match(/^(词典|查|搜索|词汇|术语)\\s*(.+)$/);
    if(dictM){ try{ window.openGlossary && window.openGlossary(dictM[2]); }catch(_){} closeQuickCmd(); _qcRecordRecency(keyword); return true; }
    // 2. 精确匹配 cmd 字段
    const list = (typeof QC_CMDS !== 'undefined') ? QC_CMDS : (window.QC_CMDS||[]);
    let hit = list.filter(function(x){ return (x.cmd||'')===keyword || (x.label||'')===keyword; })[0];
    if(!hit){
      // 3. indexOf 模糊：包含 cmd 或 label 或 sub 任何字段
      hit = list.filter(function(x){
        return ((x.cmd  && x.cmd.indexOf(keyword) >= 0) ||
                (x.label&& x.label.indexOf(keyword)>= 0) ||
                (x.sub  && x.sub.indexOf(keyword)  >= 0));
      }).sort(function(a,b){
        // cmd 命中优先于 label 命中优先于 sub 命中
        function sc(x){ return ((x.cmd.indexOf(keyword)>=0)?0:99) + ((x.label.indexOf(keyword)>=0)?0:99) + (((x.sub||'').indexOf(keyword)>=0)?0:99); }
        return sc(a)-sc(b);
      })[0];
    }
    if(hit && typeof hit.run === 'function'){
      try{ hit.run(); }catch(err){ try{ showErrBanner('命令执行失败了，点重试看看', err); }catch(_x){} }
      closeQuickCmd(); _qcRecordRecency(keyword); return true;
    }
    // 4. 没命中：反馈人类口语
    try{ showToastBottom('没有命中「'+keyword+'」，试试：八字 / 塔罗 / 黄历 / 词典 + 术语'); }catch(_){}
    return false;
  }catch(e){ try{ showErrBanner('命令面板出错了', e); }catch(_){} return false; }
}
try{ window.executeQuickCmd = executeQuickCmd; }catch(_){}

/* （内部辅助）候选列表渲染；单独挂便于外部重写 */
function _renderQcCandidates(){
  try{
    const ul = document.getElementById("qc_candidates");
    const input = document.getElementById("qc_input");
    if(!ul || !input) return;
    const kw = (input.value||"").trim();
    const list = (typeof QC_CMDS !== 'undefined') ? QC_CMDS : (window.QC_CMDS||[]);
    // 先取最近5条
    let recents = [];
    try{ const s = localStorage.getItem(QC_RECENTS_KEY); if(s) recents = JSON.parse(s) || []; }catch(_){ recents = []; }
    if(!Array.isArray(recents)) recents = [];
    let rows;
    if(!kw){
      rows = recents.slice(0,5).map(function(x){return {k:'⏱', label:'最近：'+x, sub:'', run:function(){ executeQuickCmd(x); }};}).concat(
        list.slice(0,8).map(function(x){ return {k:x.k||"", label:x.label, sub:x.sub||'', run:x.run}; })
      );
    } else {
      rows = list
        .map(function(x){
          const a=(x.cmd||'').indexOf(kw)>=0?0:(x.label||'').indexOf(kw)>=0?1:(((x.sub||'').indexOf(kw)>=0)?2:99);
          return Object.assign({}, x, {_a:a});
        })
        .filter(function(x){return x._a < 99;})
        .sort(function(a,b){return a._a-b._a;})
        .slice(0,8);
    }
    if(!rows.length){ ul.innerHTML = '<li class="qc-row"><span class="k">💡</span><span class="lbl">没找到相关命令</span><span class="sub">试试「八字」「每日塔罗」「黄历」「词典 七杀」</span></li>'; return; }
    ul.innerHTML = rows.map(function(x,i){
      return '<li class="qc-row '+(i===0?'active':'')+'" data-qc-idx="'+i+'"><span class="k">'+(x.k||'•')+'</span><span class="lbl">'+(x.label||'')+'</span><span class="sub">'+(x.sub||'')+'</span></li>';
    }).join("");
    // 挂点击
    const lis = ul.querySelectorAll ? ul.querySelectorAll('li[data-qc-idx]') : [];
    for(var i=0;i<lis.length;i++){
      (function(li, row){
        li.addEventListener && li.addEventListener('click', function(){ if(typeof row.run==='function'){ try{ row.run(); closeQuickCmd(); _qcRecordRecency((input.value||'').trim()||row.cmd); }catch(_){closeQuickCmd();} } }, false);
      })(lis[i], rows[i]);
    }
    window.__qcRows = rows;
  }catch(_){}
}
try{ window._renderQcCandidates = _renderQcCandidates; }catch(_){}

/* （内部辅助）命令面板最近 5 条记忆 */
function _qcRecordRecency(kw){
  if(!kw) return;
  try{
    let arr = [];
    try{ const s = localStorage.getItem(QC_RECENTS_KEY); if(s){ arr = JSON.parse(s)||[]; if(!Array.isArray(arr)) arr=[]; } }catch(_){ arr = []; }
    arr = [kw].concat(arr.filter(function(x){return x !== kw;})).slice(0,5);
    localStorage.setItem(QC_RECENTS_KEY, JSON.stringify(arr));
  }catch(_){}
}
try{ window._qcRecordRecency = _qcRecordRecency; }catch(_){}

/* （内部辅助）命令面板键盘适配 + 可视区适配（触屏软键盘防遮挡） */
function _qcPosFix(){
  try{
    const m = document.getElementById("quickCmdModal");
    if(!m) return;
    if(window.visualViewport){ m.style.paddingTop = Math.max(12, Math.floor(window.visualViewport.height*0.18)) + "px"; }
  }catch(_){}
}
try{ window._qcPosFix = _qcPosFix; }catch(_){}

/* -------- G2: 草稿自动保存+恢复（10 类排盘） -------- */
function autosaveDraft(type, fields){
  if(!type || typeof type !== 'string' || !fields || typeof fields !== 'object') return;
  try{
    const key = DRAFT_KEY_PREFIX + type;
    const payload = JSON.stringify({fields: fields, ts: Date.now()});
    localStorage.setItem(key, payload);
    localStorage.setItem(key + DRAFT_DIRTY_SUFFIX, '1');
    localStorage.setItem(key + UX_LAST_INTERACT_SUFFIX, String(Date.now()));
  }catch(_){}
}
try{ window.autosaveDraft = autosaveDraft; }catch(_){}

function restoreDraft(type, fieldElementMap){
  if(!type) return null;
  try{
    const key = DRAFT_KEY_PREFIX + type;
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.fields) return null;
    // 若有 fieldElementMap（{字段名: DOM 元素或选择器字符串}），自动回填
    if(fieldElementMap && typeof fieldElementMap === 'object'){
      var keys = Object.keys(fieldElementMap);
      for(var i=0;i<keys.length;i++){
        try{
          var k = keys[i];
          var el = fieldElementMap[k];
          if(typeof el === 'string') el = document.querySelector(el);
          if(!el || !('value' in el)) continue;
          if(typeof parsed.fields[k] !== 'undefined'){ el.value = String(parsed.fields[k]); }
          else if(typeof parsed.fields[k.replace(/^id#/,'')] !== 'undefined'){ el.value = String(parsed.fields[k.replace(/^id#/,'')]); }
        }catch(_x){}
      }
    }
    return parsed.fields;
  }catch(_){ return null; }
}
try{ window.restoreDraft = restoreDraft; }catch(_){}

/* （内部）根据 DRAFT_FIELDS 配置生成该类型的字段 → DOM 选择器映射表；挂到 window 以便外部单测 */
function _draftBuildSelectorMap(type){
  try{
    const D = (typeof DRAFT_FIELDS !== 'undefined') ? DRAFT_FIELDS : (window.DRAFT_FIELDS||null);
    if(!D) return {};
    const def = D[type];
    if(!def) return {};
    const fields = def.fields || {};
    const names = Object.keys(fields);
    const map = {};
    for(var i=0;i<names.length;i++){
      var n = names[i];
      var f = fields[n];
      var id = (f && f.id) ? f.id : null;
      if(!id){ continue; }
      map[n] = '#' + id;
    }
    return map;
  }catch(_){ return {}; }
}
try{ window._draftBuildSelectorMap = _draftBuildSelectorMap; }catch(_){}

function bindDraftAutosaveFor(type, inputSelectorMapOverride){
  try{
    const selMap = (inputSelectorMapOverride && typeof inputSelectorMapOverride === 'object')
      ? inputSelectorMapOverride
      : _draftBuildSelectorMap(type);
    if(!selMap || typeof selMap !== 'object') return;
    const names = Object.keys(selMap);
    if(!names.length) return;
    let timer = null;
    function collect(){
      try{
        const fields = {};
        for(var i=0;i<names.length;i++){
          var n = names[i];
          var el = selMap[n];
          if(typeof el === 'string') el = document.querySelector(el);
          if(!el) continue;
          fields[n] = ('checked' in el && (el.type === 'checkbox' || el.type === 'radio')) ? el.checked : (el.value || '');
        }
        autosaveDraft(type, fields);
        try{ localStorage.setItem(DRAFT_KEY_PREFIX+type+UX_LAST_INTERACT_SUFFIX, String(Date.now())); }catch(_){}
        // 记脏（用于 profile 联动判断）
        try{ localStorage.setItem(DRAFT_KEY_PREFIX+type+DRAFT_DIRTY_SUFFIX,'1'); }catch(_){}
      }catch(_){}
    }
    for(var j=0;j<names.length;j++){
      var n2 = names[j];
      var el2 = selMap[n2];
      if(typeof el2 === 'string') el2 = document.querySelector(el2);
      if(!el2) continue;
      (function(el){
        try{
          el.addEventListener && el.addEventListener('input', function(){
            clearTimeout(timer);
            timer = setTimeout(collect, DRAFT_DEBOUNCE_MS || 500);
          }, false);
          el.addEventListener && el.addEventListener('change', collect, false);
        }catch(_x){}
      })(el2);
    }
    // 首次启动：尝试自动恢复
    restoreDraft(type, selMap);
  }catch(_){}
}
try{ window.bindDraftAutosaveFor = bindDraftAutosaveFor; }catch(_){}

/* -------- G3: 五格单行输入智能拆分 -------- */
function resolveWugeInput(singleLine){
  var src = (singleLine == null) ? '' : String(singleLine);
  var out = { surname:null, given:null, gender:null, genderSrc:'guess', ok:false, note:'', src: src };
  if(!src || !src.trim()){ out.note = '请输入姓名（可加性别，如：张三丰男 / Alice Smith female）'; return out; }
  src = src.replace(/\\s+/g,' ').trim();
  // 1) 末尾性别中/英关键词
  var G_MAP_CN = {'男':'男','先生':'男','帅哥':'男','男宝':'男','女生':'女','女士':'女','美女':'女','女宝':'女','女':'女'};
  var G_MAP_EN = {'male':'男','m':'男','boy':'男','man':'男','he':'男','guy':'男','gentleman':'男','female':'女','f':'女','girl':'女','woman':'女','ms':'女','miss':'女','she':'女','lady':'女','madam':'女','mrs':'女'};
  var t1 = src.split(/[ ,，、\\s]+/).filter(Boolean);
  // 先剥离尾部性别
  var gender = null, genderSrc='guess';
  function stripGender(tokArr){
    // 从尾部 pop 一个性别 token 最多一次
    if(!tokArr.length) return tokArr;
    var last = tokArr[tokArr.length-1];
    var lastL = last.toLowerCase();
    if(G_MAP_CN[last]){ gender = G_MAP_CN[last]; genderSrc='tail-cn'; tokArr.pop(); }
    else if(G_MAP_EN[lastL]){ gender = G_MAP_EN[lastL]; genderSrc='tail-en'; tokArr.pop(); }
    return tokArr;
  }
  var toks = stripGender(t1.slice(0));
  var joined = toks.join('').replace(/[ ,，、]/g,'');
  // 中文路径：全为 CJK 字符
  var isCjk = /^[\\u4e00-\\u9fa5·•]+$/.test(joined);
  var surname = null, given = null;
  if(isCjk){
    // 复姓优先识别
    var list = (typeof WUGE_COMPOUND_SURNAMES !== 'undefined') ? WUGE_COMPOUND_SURNAMES : (window.WUGE_COMPOUND_SURNAMES||[]);
    var matched2 = list.filter(function(s2){return joined.slice(0,2) === s2;})[0];
    if(matched2 && joined.length >= 3){
      surname = matched2; given = joined.slice(2);
    } else if(joined.length >= 2){
      // 默认单字姓
      surname = joined.charAt(0); given = joined.slice(1);
    } else if(joined.length === 1){
      surname = joined; given = '';
    } else {
      surname = ''; given = '';
    }
    out.ok = !!surname && !!given || joined.length >= 1;
    out.note = (matched2?'识别复姓「'+matched2+'」':'按单字姓拆分') + (gender?'，性别：'+gender:'（未识别性别，可写\"张三丰男\"或手动填）');
  } else {
    // 英文/拼音路径：空格切 surname = 最后一个，given = 前面所有（或 reverse? 西方 order: Alice Smith → Alice given, Smith surname）
    if(!toks.length){ toks = joined.split(/\\s+/).filter(Boolean); }
    if(toks.length === 0){ out.note = '姓名为空'; return out; }
    if(toks.length === 1){
      // 没空格：当作只有 surname 的情况（或只有 name，不确定）
      given = toks[0]; surname = '';
      out.ok = true; out.note = '未检测到空格，已填到「名」；如果想拆姓+名，请写\"姓 名 性别\"如：Smith Alice female';
    } else {
      surname = toks[toks.length-1];
      given = toks.slice(0, toks.length-1).join(' ');
      out.ok = true;
      out.note = '英文/拼音：姓氏 = 最后一个空格后（'+surname+'），名 = 前面（'+given+'）' + (gender?'，性别：'+gender:'');
    }
  }
  out.surname = surname; out.given = given; out.gender = gender; out.genderSrc = genderSrc || out.genderSrc;
  return out;
}
try{ window.resolveWugeInput = resolveWugeInput; }catch(_){}

function bindWugeSingleLineInput(){
  try{
    // 在 sec-cn2 五格表单开头插入单行输入 UI（如果还没插入过）
    const host = document.getElementById('sec-cn2');
    if(!host || host.querySelector('.wuge-single')) return;
    // 取 sec-cn2 第一个子节点（或 form-row 之前）插入
    const first = host.firstElementChild;
    const wrap = document.createElement('div');
    wrap.className = 'wuge-single-wrap';
    wrap.innerHTML = ''
      +'<div class="wuge-single-hint">👉 单行输入更快：格式如「张三丰 男」「欧阳克 男」「Alice Smith female」 <span class="toggle-manual" onclick="var s=this.closest(\\'#sec-cn2\\'); if(!s) return; var rows=s.querySelectorAll(\\'.form-row\\'); for(var i=0;i<rows.length;i++){ var st=rows[i].style; st.display=(st.display===\\'none\\'?\\'\\':\\'none\\');}">点这里手动拆姓/名/性别</span></div>'
      +'<div class="wuge-single">'
      +'  <input id="wuge-single-line" type="text" placeholder="例：张三丰 男 / Alice Smith female" autocomplete="off">'
      +'  <button type="button" onclick="window.applyWugeSingleLine()">识别 → 填充</button>'
      +'</div>';
    if(first) host.insertBefore(wrap, first); else host.appendChild(wrap);
    // 回车=应用
    var inp = document.getElementById('wuge-single-line');
    if(inp){
      inp.addEventListener && inp.addEventListener('keydown', function(e){ if(e && e.key === 'Enter'){ e.preventDefault && e.preventDefault(); window.applyWugeSingleLine && window.applyWugeSingleLine(); } }, false);
    }
  }catch(_){}
}
try{ window.bindWugeSingleLineInput = bindWugeSingleLineInput; }catch(_){}

/* （内部）应用单行拆分结果到 DRAFT_FIELDS.wuge 的三个控件 id */
function applyWugeSingleLine(){
  try{
    const inp = document.getElementById('wuge-single-line');
    if(!inp){ return; }
    const r = resolveWugeInput(inp.value || '');
    // 定位 wuge 三个控件（基于 DRAFT_FIELDS.wuge.fields）
    const D = (typeof DRAFT_FIELDS !== 'undefined') ? DRAFT_FIELDS : (window.DRAFT_FIELDS||null);
    var idSurname = null, idGiven = null, idGender = null;
    if(D && D.wuge && D.wuge.fields){
      var f = D.wuge.fields;
      // wuge 字段命名：一般 surname/name/gender；如不匹配也试试其它常见名
      idSurname = (f.surname && f.surname.id) || null;
      idGiven   = (f.name && f.name.id) || (f.given && f.given.id) || null;
      idGender  = (f.gender && f.gender.id) || null;
    }
    // 如果 DRAFT_FIELDS 没定义，用历史上的惯例 id 兜底：wuge_surname/wuge_name/gender_wuge
    if(!idSurname) idSurname = 'wuge_surname';
    if(!idGiven)   idGiven   = 'wuge_name';
    if(!idGender)  idGender  = 'gender_wuge';
    var eS = document.getElementById(idSurname);
    var eG = document.getElementById(idGiven);
    var eX = document.getElementById(idGender);
    if(eS && r.surname != null){ eS.value = String(r.surname); _fireChange(eS); }
    if(eG && r.given   != null){ eG.value = String(r.given);   _fireChange(eG); }
    if(eX && r.gender){
      // 性别控件可能是 <select> 或 <input>；尝试直接 value='男'/'女'；如果是 radio 则找对应 radio 并 checked
      if(eX.tagName === 'SELECT' || eX.type === 'text'){ eX.value = r.gender; _fireChange(eX); }
      else if(eX.type === 'radio'){
        var name = eX.name;
        if(name){
          var radios = document.querySelectorAll('input[type=radio][name="'+name+'"]');
          for(var i=0;i<radios.length;i++){ if(radios[i].value === r.gender || radios[i].value === (r.gender==='男'?'male':'female')){ radios[i].checked = true; _fireChange(radios[i]); break; } }
        }
      }
    }
    try{ showToastBottom(r.ok ? ('✅ ' + (r.note || '已填入下方姓/名/性别，可直接点「计算姓名五格」')) : ('⚠️ ' + (r.note || '无法识别'))); }catch(_){}
  }catch(_){}
}
try{ window.applyWugeSingleLine = applyWugeSingleLine; }catch(_){}

/* （内部辅助）触发 change/input 事件（使 onChange 回调正常跑） */
function _fireChange(el){
  try{
    if(typeof Event === 'function'){
      try{ el.dispatchEvent(new Event('change', {bubbles:true})); }catch(_){}
      try{ el.dispatchEvent(new Event('input',  {bubbles:true})); }catch(_){}
    }
  }catch(_){}
}
try{ window._fireChange = _fireChange; }catch(_){}

/* -------- G3: 默认当前时间 + 记上次城市 -------- */
function applySmartDefaultsToForms(scopeType){
  try{
    const now = new Date();
    const Y = now.getFullYear();
    const M = String(now.getMonth()+1).padStart(2,'0');
    const D = String(now.getDate()).padStart(2,'0');
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const ISO = Y + '-' + M + '-' + D + 'T' + h + ':' + m;
    const YMD_LIST = [Y, M, D, h, m];
    // 覆盖所有 type=datetime-local / date / time 输入：如果 value 为空 → 填默认（scopeType=null=全局，否则只填该类型）
    var q = 'input[type="datetime-local"], input[type="date"], input[type="time"]';
    var nodes = document.querySelectorAll ? document.querySelectorAll(q) : [];
    for(var i=0;i<nodes.length;i++){
      var n = nodes[i];
      if(!n || n.value) continue; // 已填的不改
      if(scopeType){
        // scopeType 只填归属 section 内：如果该 input 不在 sec-<对应type> 下，跳过
        var sec = n.closest ? n.closest('[id^="sec-"]') : null;
        if(!sec) continue;
        // 不需要精确定位 type→section；如果在该 section 就填
      }
      try{
        if(n.type === 'datetime-local'){ n.value = ISO; }
        else if(n.type === 'date'){ n.value = Y + '-' + M + '-' + D; }
        else if(n.type === 'time'){ n.value = h + ':' + m; }
      }catch(_x){}
    }
    // 八字/奇门/回测等的 Y/M/D/h/min 数字字段：空值 → 填当前（只对 4 位数 year 开头的字段）
    var fillNum = function(sel, val){
      try{
        var el = document.querySelectorAll ? document.querySelectorAll(sel) : [];
        for(var i=0;i<el.length;i++){ var e=el[i]; if(!e || e.value !== '') continue; e.value = val; }
      }catch(_){}
    };
    fillNum('input[id$="_Y"][type="number"]', Y);
    fillNum('input[id$="-Y"][type="number"]', Y);
    fillNum('input[id$="_M"][type="number"]', Number(M));
    fillNum('input[id$="-M"][type="number"]', Number(M));
    fillNum('input[id$="_D"][type="number"]', Number(D));
    fillNum('input[id$="-D"][type="number"]', Number(D));
    fillNum('input[id$="_h"][type="number"]', Number(h));
    fillNum('input[id$="-h"][type="number"]', Number(h));
    fillNum('input[id$="_minute"][type="number"]', Number(m));
    fillNum('input[id$="-minute"][type="number"]', Number(m));
    // 记住上次城市
    try{
      var lastCity = localStorage.getItem(LAST_CITY_KEY);
      if(lastCity){
        // 对 gongzhen.city / DRAFT_FIELDS.bazi.city 等 city 字段赋值
        var cityInputs = document.querySelectorAll ? document.querySelectorAll('input[type="text"][id*="city" i], select[id*="city" i]') : [];
        for(var j=0;j<cityInputs.length;j++){
          var c = cityInputs[j];
          if(!c || c.value) continue;
          c.value = lastCity; _fireChange(c);
        }
      }
    }catch(_c){}
    // 起卦快捷按钮：如果是周易/梅花/大六壬页面且当前无「现在起卦/选时间起卦」按钮，则插入
    try{ _ensureGuaQuickButtons(); }catch(_x2){}
  }catch(_){}
}
try{ window.applySmartDefaultsToForms = applySmartDefaultsToForms; }catch(_){}

/* （内部）周易/梅花/大六壬 → 「现在 / 选时间」两个快捷按钮 */
function _ensureGuaQuickButtons(){
  // 对三个 section：cn3（周易）、cn6（梅花）、cn7（大六壬）
  var secIds = ['sec-cn3','sec-cn6','sec-cn7'];
  for(var i=0;i<secIds.length;i++){
    try{
      var sec = document.getElementById(secIds[i]);
      if(!sec) continue;
      if(sec.querySelector && sec.querySelector('.gua-quick-actions')) continue;
      var bar = document.createElement('div');
      bar.className = 'gua-quick-actions shouyao-actions';
      bar.innerHTML = ''
        +'<button type="button" class="secondary" onclick="window.applyGuaNow(\\''+secIds[i]+'\\');">⚡ 现在起卦</button>'
        +'<button type="button" class="secondary" onclick="window.applyGuaPick(\\''+secIds[i]+'\\');">🗓 选日期时间</button>';
      // 插入第一个按钮之前（form-row 末尾或 section 开头）
      var firstBtn = sec.querySelector ? sec.querySelector('button.btn-primary, button.btn-secondary') : null;
      if(firstBtn && firstBtn.parentNode){ firstBtn.parentNode.insertBefore(bar, firstBtn); }
      else if(sec.firstElementChild){ sec.insertBefore(bar, sec.firstElementChild); }
      else sec.appendChild(bar);
    }catch(_x){}
  }
}
try{ window._ensureGuaQuickButtons = _ensureGuaQuickButtons; }catch(_){}

function applyGuaNow(secId){
  try{
    applySmartDefaultsToForms(); // 把该 section 里所有 Y/M/D/h 输入填成现在
    try{ showToastBottom('已填入当前时间，直接点「排盘/起卦」即可'); }catch(_){}
    var sec = document.getElementById(secId); if(!sec) return;
    try{ sec.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){}
  }catch(_){}
}
try{ window.applyGuaNow = applyGuaNow; }catch(_){}

function applyGuaPick(secId){
  try{
    var sec = document.getElementById(secId);
    if(!sec) return;
    // 把该 section 里的第一个数字 input 替换/辅助弹一个原生 datetime-local input 选择器（在 section 顶部插入临时 input 触发选择）
    var picker = document.createElement('input');
    picker.type = 'datetime-local';
    picker.style.position = 'fixed';
    picker.style.top = '-100px';
    picker.style.left = '0';
    picker.style.opacity = '0';
    picker.style.pointerEvents = 'none';
    var now = new Date();
    picker.value = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')
      +'T'+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    document.body.appendChild(picker);
    picker.addEventListener && picker.addEventListener('change', function(){
      try{
        var v = picker.value || '';
        if(!v){ document.body.removeChild(picker); return; }
        var parts = v.split(/[-T:]/); // Y M D h m
        if(parts.length >= 5){
          var Y = Number(parts[0]), M = Number(parts[1]), D = Number(parts[2]), h = Number(parts[3]), m = Number(parts[4]);
          // 填对应 section 里的 Y/M/D/h/minute 数字输入
          var id = secId;
          function fill(suffix, val){
            try{
              var sel = '#'+secId+' input[id$="'+suffix+'"][type="number"]';
              var ns = document.querySelectorAll ? document.querySelectorAll(sel) : [];
              for(var i=0;i<ns.length;i++){ ns[i].value = val; _fireChange(ns[i]); }
            }catch(_){}
          }
          fill('_Y', Y); fill('-Y', Y); fill('_M', M); fill('-M', M); fill('_D', D); fill('-D', D); fill('_h', h); fill('-h', h); fill('_minute', m); fill('-minute', m);
          showToastBottom('已选 '+v+' → 直接点「起卦」');
        }
      }catch(_){}
      try{ document.body.removeChild(picker); }catch(_){}
    }, false);
    // 强制触发 picker（大部分现代浏览器支持；Chrome 83 WebView 一般也支持）
    try{ picker.focus && picker.focus(); }catch(_){}
    try{ if(picker.showPicker){ picker.showPicker(); } else if(picker.click){ picker.click(); } else { try{ showToastBottom('请手动在 section 顶部选时间'); }catch(_x){} document.body.removeChild(picker); } }
    catch(_fallback){ try{ document.body.removeChild(picker); }catch(_x2){} }
  }catch(_){}
}
try{ window.applyGuaPick = applyGuaPick; }catch(_){}

/* -------- G2 / G4: 结果页底部「下一步建议条」+ 历史对比双栏 -------- */
function buildResultNextSteps(hostEl, resultId, type){
  try{
    if(!hostEl) return;
    if(hostEl.querySelector && hostEl.querySelector('.result-next-steps')) return; // 去重
    var host = hostEl;
    var wrap = document.createElement('div');
    wrap.className = 'result-next-steps';
    var typeLabel = (TYPE_LABEL && TYPE_LABEL[type]) ? TYPE_LABEL[type] : '占卜';
    wrap.innerHTML = ''
      +'<button type="button" class="rns rns-primary" onclick="window.__rnsSave && window.__rnsSave(\\''+String(resultId||'').replace(/'/g,'&#39;')+'\\',\\''+String(type||'').replace(/'/g,'&#39;')+'\\', this);">💾 保存到历史</button>'
      +'<button type="button" class="rns" onclick="window.openCompareModal && window.openCompareModal(\\''+String(type||'').replace(/'/g,'&#39;')+'\\');">⚖ 对比上次同类型</button>'
      +'<button type="button" class="rns" onclick="window.onShareCardClick && window.onShareCardClick(this, \\''+String(type||'').replace(/'/g,'&#39;')+'\\');">🖼 生成分享卡</button>'
      +'<button type="button" class="rns rns-hint" onclick="window.copyResult && window.copyResult(\\''+String(resultId||'').replace(/'/g,'&#39;')+'\\', this);">📋 复制文字</button>';
    host.appendChild(wrap);
  }catch(_){}
}
try{ window.buildResultNextSteps = buildResultNextSteps; }catch(_){}

/* （内部）RNS: save 入口实际调用 saveHistory 封装 + 调 markCompareId */
function __rnsSave(resultId, type, btnEl){
  try{
    // 若该条已在 HIST 里（由主流程 saveHistory 保存过）→ 只给提示
    var ok = false;
    try{
      var hist = (typeof loadHistory === 'function') ? loadHistory() : (window.loadHistory && window.loadHistory());
      if(Array.isArray(hist)){
        ok = hist.some(function(h){ return h && (h.id === resultId || String(h.id||'')===String(resultId||'NOMATCH')); });
      }
    }catch(_x){}
    if(ok){ try{ showToastBottom('这条 '+((TYPE_LABEL&&TYPE_LABEL[type])||'占卜')+' 已经在历史里啦 ✔️'); }catch(_t){} return; }
    // 否则尝试让用户触发原保存按钮（通常是历史/保存按钮在结果底部的老按钮）
    try{
      var host = btnEl ? btnEl.closest && btnEl.closest('.result, section, #result-'+String(type||'')) : null;
      if(host){
        var old = host.querySelectorAll ? host.querySelectorAll('button[onclick*="saveHistory"], button[onclick*="保存"]') : [];
        if(old && old.length){ old[0].click(); return; }
      }
      showToastBottom('请先点排盘按钮，产生结果后会自动保存～');
    }catch(_){}
  }catch(_){}
}
try{ window.__rnsSave = __rnsSave; }catch(_){}

function markCompareId(id){
  if(!id) return;
  try{
    var arr = [];
    try{ var s = localStorage.getItem(CMP_IDS_KEY); if(s){ arr = JSON.parse(s) || []; if(!Array.isArray(arr)) arr = []; } }catch(_){ arr = []; }
    // 不重复
    if(arr[arr.length-1] !== id){
      arr.push(id);
      if(arr.length > 2) arr = arr.slice(arr.length - 2);
    }
    localStorage.setItem(CMP_IDS_KEY, JSON.stringify(arr));
  }catch(_){}
}
try{ window.markCompareId = markCompareId; }catch(_){}

function openCompareModal(type){
  try{
    var m = document.getElementById("compareModal");
    if(!m) return;
    // 取最近 2 条同类型
    var arr = [];
    try{ var s = localStorage.getItem(CMP_IDS_KEY); if(s){ arr = JSON.parse(s) || []; if(!Array.isArray(arr)) arr=[]; } }catch(_){ arr = []; }
    var hist = [];
    try{ hist = (typeof loadHistory === 'function' ? loadHistory() : (window.loadHistory&&window.loadHistory())) || []; }catch(_){ hist = []; }
    var left, right;
    if(arr.length === 2){
      left  = hist.filter(function(h){ return h && h.id === arr[0]; })[0];
      right = hist.filter(function(h){ return h && h.id === arr[1]; })[0];
    }
    if(!left || !right){
      // fallback: 从历史里选最近 2 条 type 匹配
      var same = hist.filter(function(h){ return h && (!type || h.type === type); }).sort(function(a,b){ return (b.ts||0)-(a.ts||0); }).slice(0,2);
      left = same[1]; right = same[0];
    }
    var LT = document.getElementById("cmLTitle"), LM = document.getElementById("cmLMeta"), LB = document.getElementById("cmLBody");
    var RT = document.getElementById("cmRTitle"), RM = document.getElementById("cmRMeta"), RB = document.getElementById("cmRBody");
    function fillOne(h, T, Meta, Body, labelSide){
      if(!h){ T.textContent = labelSide + '：（无数据）'; Meta.textContent=''; Body.innerHTML='<div class="hint">还没有同类型的第二条历史。多算两次再来对比吧～</div>'; return; }
      var tt = new Date(h.ts||0);
      T.textContent = labelSide + '：' + ((TYPE_LABEL&&TYPE_LABEL[h.type])||h.type||'占卜') + (h.accuracy?('  '+({hit:'🟢准',miss:'🔴不准',pending:'🟡待'}[h.accuracy]||'')):'');
      Meta.textContent = tt.getFullYear()+'/'+String(tt.getMonth()+1).padStart(2,'0')+'/'+String(tt.getDate()).padStart(2,'0')+' '+String(tt.getHours()).padStart(2,'0')+':'+String(tt.getMinutes()).padStart(2,'0') + (h.input?' · 输入：'+String(h.input).slice(0,40):'');
      try{
        var summary = (typeof summarizeHist === 'function') ? summarizeHist(h) : (window.summarizeHist&&window.summarizeHist(h));
        var sumHTML = '';
        if(summary){ sumHTML = '<div style="margin-bottom:8px;padding:6px 8px;border-radius:8px;background:var(--card);border:1px solid var(--line);"><b>摘要：</b>'+summary+'</div>'; }
        Body.innerHTML = sumHTML + (h.result ? String(h.result).replace(/<script/gi,'&lt;script').slice(0, 1200) : '（无输出文本）');
      }catch(_x1){ Body.textContent='（载入失败）'; }
    }
    fillOne(left,  LT, LM, LB, '上次');
    fillOne(right, RT, RM, RB, '这次');
    // Diff bar
    var bar = document.getElementById("compareDiffBar");
    if(bar){
      var sameType = left && right && left.type === right.type;
      var sameAcc  = left && right && left.accuracy === right.accuracy && left.accuracy != null;
      var msg = '';
      if(!sameType){ msg = '⚠️ 两次类型不同（'+(left?left.type:'?')+' vs '+(right?right.type:'?')+'），只建议横向参考。'; bar.style.display='block'; }
      else if(sameAcc){ msg = '两次复盘结论一致：'+({hit:'🟢都准',miss:'🔴都不准',pending:'🟡都待验证'}[left.accuracy]||'—'); bar.style.display='block'; }
      else if(left && right && left.accuracy && right.accuracy){ msg = '两次复盘结论相反：上次'+({hit:'🟢准',miss:'🔴不准',pending:'🟡待'}[left.accuracy]||'—')+' / 这次'+({hit:'🟢准',miss:'🔴不准',pending:'🟡待'}[right.accuracy]||'—'); bar.style.display='block'; }
      else{ bar.style.display='none'; }
      if(msg) bar.textContent = msg;
    }
    m.classList.add("show");
  }catch(e){ try{ showErrBanner('打开对比浮层失败', e); }catch(_){} }
}
try{ window.openCompareModal = openCompareModal; }catch(_){}

function closeCompareModal(){
  try{ var m=document.getElementById("compareModal"); if(m) m.classList.remove("show"); }catch(_){}
}
try{ window.closeCompareModal = closeCompareModal; }catch(_){}

/* -------- G2: 历史筛选 + 批量删除 -------- */
function toggleBatchDeleteHistory(){
  try{
    var host = document.getElementById("histModal") || document.body;
    if(!host) return;
    var bar = host.querySelector ? host.querySelector('.batch-bar') : null;
    if(!bar){
      // 创建 batch-bar，放在 histModal 顶部（或 hist 列表前）
      bar = document.createElement('div');
      bar.className = 'batch-bar';
      bar.innerHTML = ''
        +'<div class="l"><label style="display:flex;align-items:center;gap:6px;"><input id="histBatchAll" type="checkbox"> <b>全选</b> <span style="margin-left:6px;">所选 <span id="histBatchCount">0</span> 条</span></label></div>'
        +'<div class="r">'
        +'  <button type="button" onclick="window.closeBatchDeleteHistory && window.closeBatchDeleteHistory()">取消</button>'
        +'  <button type="button" class="danger" onclick="window.applyBatchDeleteHistory && window.applyBatchDeleteHistory()">🗑 删除选中</button>'
        +'</div>';
      var anchor = host.querySelector ? (host.querySelector('#histListWrap, #historyList, .history-list') || host.firstElementChild) : host.firstElementChild;
      if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore(bar, anchor); }
      else host.appendChild(bar);
      // 全选
      var allChk = document.getElementById("histBatchAll");
      if(allChk){
        allChk.addEventListener && allChk.addEventListener('change', function(){
          var cs = host.querySelectorAll ? host.querySelectorAll('input[type="checkbox"].hist-del-chk') : [];
          for(var i=0;i<cs.length;i++){ cs[i].checked = allChk.checked; }
          _histBatchCount();
        }, false);
      }
    }
    bar.classList.remove('hide');
    // 给每个历史条目加 checkbox
    _injectHistDelCheckboxes();
    // 加筛选 tab（today/7d/30d/all）
    _ensureHistFilterTabs();
  }catch(_){}
}
try{ window.toggleBatchDeleteHistory = toggleBatchDeleteHistory; }catch(_){}

function closeBatchDeleteHistory(){
  try{
    var host = document.getElementById("histModal") || document.body;
    var bar = host.querySelector ? host.querySelector('.batch-bar') : null;
    if(bar) bar.classList.add('hide');
    // 移除所有 checkbox
    var cs = host.querySelectorAll ? host.querySelectorAll('input.hist-del-chk, .hist-item-row input[type="checkbox"]') : [];
    for(var i=0;i<cs.length;i++){ var p = cs[i].parentNode; if(p && cs[i].classList.contains('hist-del-chk')) p.removeChild(cs[i]); else if(cs[i].classList.contains('hist-del-chk')){ try{ cs[i].remove(); }catch(_){} } }
    // 去掉包裹 hist-item-row 的外层
    var rows = host.querySelectorAll ? host.querySelectorAll('.hist-item-row') : [];
    for(var j=0;j<rows.length;j++){
      var r = rows[j]; var parent = r.parentNode;
      while(r.firstChild){ parent.insertBefore(r.firstChild, r); }
      parent.removeChild(r);
    }
  }catch(_){}
}
try{ window.closeBatchDeleteHistory = closeBatchDeleteHistory; }catch(_){}

function applyBatchDeleteHistory(){
  try{
    var host = document.getElementById("histModal") || document.body;
    var ids = [];
    var cs = host.querySelectorAll ? host.querySelectorAll('input[type="checkbox"].hist-del-chk:checked') : [];
    for(var i=0;i<cs.length;i++){ if(cs[i].value) ids.push(cs[i].value); }
    if(!ids.length){ try{ showToastBottom('还没选择要删除的历史条目'); }catch(_t){} return; }
    var msg = '确定删除选中的 '+ids.length+' 条占卜记录？这个操作不可撤销。';
    if(typeof confirm === 'function'){
      if(!confirm(msg)) return;
    } else {
      // 没有 confirm 直接给 banner 提示
      try{ showToastBottom('当前环境无 confirm，跳过'); }catch(_t){ return; }
    }
    var hist = [];
    try{ hist = (typeof loadHistory === 'function' ? loadHistory() : (window.loadHistory&&window.loadHistory())) || []; }catch(_){}
    if(!Array.isArray(hist)) hist = [];
    var delSet = {};
    for(var k=0;k<ids.length;k++) delSet[ids[k]] = true;
    hist = hist.filter(function(h){ return !h || !delSet[h.id]; });
    try{
      (typeof saveHistory === 'function') ? saveHistory.__writeAll && saveHistory.__writeAll(hist) : null;
    }catch(_x1){}
    // fallback: 如果 saveHistory 没 __writeAll，就用 localStorage 直接写 key
    try{ localStorage.setItem('zhiming_v2_history', JSON.stringify(hist)); }catch(_x2){}
    try{ if(window.renderHistory) window.renderHistory(); showToastBottom('已删除 '+ids.length+' 条'); }catch(_x3){}
    // 重新注入 checkbox 和 count
    setTimeout(function(){ try{ _injectHistDelCheckboxes(); _histBatchCount(); }catch(_){} }, 120);
  }catch(e){ try{ showErrBanner('批量删除失败', e); }catch(_){} }
}
try{ window.applyBatchDeleteHistory = applyBatchDeleteHistory; }catch(_){}

/* （内部）为历史条目注入复选框 */
function _injectHistDelCheckboxes(){
  try{
    var host = document.getElementById("histModal") || document.body;
    var list = host.querySelectorAll ? host.querySelectorAll('.history-item, .hist-item, [data-hist-id]') : [];
    for(var i=0;i<list.length;i++){
      var item = list[i];
      if(item.querySelector && item.querySelector('input.hist-del-chk')) continue;
      var id = item.getAttribute ? (item.getAttribute('data-hist-id') || item.dataset && item.dataset.histId) : null;
      if(!id) continue;
      // 把 item 的所有子节点包进 .hist-item-row + 最前加 checkbox
      var wrap = document.createElement('div'); wrap.className = 'hist-item-row';
      var chk = document.createElement('input'); chk.type='checkbox'; chk.className='hist-del-chk'; chk.value = id;
      chk.addEventListener && chk.addEventListener('change', _histBatchCount, false);
      wrap.appendChild(chk);
      while(item.firstChild){ wrap.appendChild(item.firstChild); }
      item.appendChild(wrap);
    }
    _histBatchCount();
  }catch(_){}
}
try{ window._injectHistDelCheckboxes = _injectHistDelCheckboxes; }catch(_){}

function _histBatchCount(){
  try{
    var host = document.getElementById("histModal") || document.body;
    var cnt = host.querySelectorAll ? host.querySelectorAll('input.hist-del-chk:checked').length : 0;
    var el = document.getElementById("histBatchCount");
    if(el) el.textContent = String(cnt);
  }catch(_){}
}
try{ window._histBatchCount = _histBatchCount; }catch(_){}

/* （内部）历史页顶部筛选：Today / 7d / 30d / All */
function _ensureHistFilterTabs(){
  try{
    var host = document.getElementById("histModal");
    if(!host) return;
    if(host.querySelector && host.querySelector('.hist-filter-tabs')) return;
    var bar = document.createElement('div');
    bar.className = 'hist-filter-tabs';
    bar.style.cssText = 'display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap;';
    var tabs = [['today','今日（默认）'],['7d','最近 7 天'],['30d','最近 30 天'],['all','全部']];
    try{
      var cur = localStorage.getItem(HIST_FILTER_KEY) || 'today';
      bar.innerHTML = tabs.map(function(t){
        var active = (cur === t[0]) ? 'background:var(--pri);color:#fff;border-color:transparent;' : 'background:var(--card);color:var(--text);';
        return '<button type="button" data-hist-filter="'+t[0]+'" style="flex:1;min-width:72px;height:32px;border-radius:8px;border:1px solid var(--line);'+active+'font-weight:600;cursor:pointer;font-size:12px;" onclick="window.applyHistFilter && window.applyHistFilter(\\''+t[0]+'\\', this);">'+t[1]+'</button>';
      }).join('');
      // 找到 batch-bar 后插入（batch-bar 在上，筛选在下）
      var bb = host.querySelector ? host.querySelector('.batch-bar') : null;
      if(bb && bb.parentNode){ bb.parentNode.insertBefore(bar, bb.nextSibling); }
      else if(host.firstElementChild){ host.insertBefore(bar, host.firstElementChild); }
      else host.appendChild(bar);
      // 默认立即应用
      applyHistFilter(cur);
    }catch(_x){}
  }catch(_){}
}
try{ window._ensureHistFilterTabs = _ensureHistFilterTabs; }catch(_){}

function applyHistFilter(range, btnEl){
  try{
    if(range !== 'today' && range !== '7d' && range !== '30d' && range !== 'all') range = 'today';
    try{ localStorage.setItem(HIST_FILTER_KEY, range); }catch(_){}
    var host = document.getElementById("histModal");
    if(!host) return;
    // 激活样式
    var btns = host.querySelectorAll ? host.querySelectorAll('button[data-hist-filter]') : [];
    for(var i=0;i<btns.length;i++){
      var b = btns[i];
      if(b.getAttribute('data-hist-filter') === range){
        b.style.background = 'var(--pri)'; b.style.color = '#fff'; b.style.borderColor = 'transparent';
      } else {
        b.style.background = 'var(--card)'; b.style.color = 'var(--text)'; b.style.borderColor = 'var(--line)';
      }
    }
    // 对 history 条目按日期显隐（简单做法：每个条目判断 ts）
    var now = Date.now();
    var DAY = 24*3600*1000;
    var lo = 0;
    if(range === 'today'){
      var d0 = new Date(); d0.setHours(0,0,0,0); lo = d0.getTime();
    } else if(range === '7d'){ lo = now - 7*DAY; }
    else if(range === '30d'){ lo = now - 30*DAY; }
    var items = host.querySelectorAll ? host.querySelectorAll('.history-item, .hist-item') : [];
    // 只对能读到 data-hist-id 的条目生效；没法读 ts 兜底全部显示
    var histMap = {};
    try{
      var hist = (typeof loadHistory === 'function' ? loadHistory() : (window.loadHistory&&window.loadHistory())) || [];
      for(var j=0;j<hist.length;j++){ if(hist[j] && hist[j].id) histMap[hist[j].id] = hist[j]; }
    }catch(_x1){}
    var shown = 0, total = 0;
    for(var k=0;k<items.length;k++){
      var it = items[k];
      var id = it.getAttribute ? it.getAttribute('data-hist-id') : null;
      if(!id){ continue; }
      total++;
      var h = histMap[id];
      var show = true;
      if(h && typeof h.ts === 'number'){ show = (range === 'all' ? true : h.ts >= lo); }
      else if(range === 'all') show = true;
      else show = true; // 拿不到时间就不隐（兜底）
      it.style.display = show ? '' : 'none';
      if(show) shown++;
    }
    try{ showToastBottom(range === 'all' ? ('显示全部 '+total+' 条') : ('显示 '+shown+' / '+total+' 条')); }catch(_t){}
  }catch(_){}
}
try{ window.applyHistFilter = applyHistFilter; }catch(_){}

/* -------- G4: 错误口语横幅 + 重试 + 反馈 -------- */
function showErrBanner(msgShort, err){
  try{
    var b = document.getElementById("errBanner");
    if(!b) return;
    var msg = (msgShort && typeof msgShort === 'string') ? msgShort : '发生了小错误';
    var detail = '';
    if(err && typeof err === 'object'){
      var m = String(err.message || '');
      // humanize
      if(/ReferenceError:[\\s\\S]*is not defined/i.test(m)){
        var fname = (m.match(/ReferenceError:\\s*([\\w_$]+)\\s+is\\s+not\\s+defined/i) || [])[1] || '';
        msg = '「'+fname+'」加载失败了（点重试可再加载一次）';
      } else if(/split.*of\\s*null|Cannot read propert(y|ies).*split.*null/i.test(m)){
        msg = '有一项日期或字段还没填好～点重试继续填写';
      } else if(/SyntaxError/i.test(m)){
        msg = '脚本加载异常，刷新一下通常就好了';
      } else if(m){
        msg = msg + '（' + m.slice(0, 40) + (m.length>40?'…':'') + '）';
      }
      detail = String(err.stack || m);
    }
    var html = ''
      +'<div class="row">'
      +'  <div class="msg"><span class="t">🤏</span><span>'+msg.replace(/</g,'&lt;')+'</span></div>'
      +'  <div class="btns">'
      +'    <button type="button" class="b-retry" onclick="window.retryLastAction && window.retryLastAction();">重试</button>'
      +'    <button type="button" class="b-fb"    onclick="window.executeQuickCmd && window.executeQuickCmd(\\'反馈\\');">反馈</button>'
      +'    <button type="button" class="b-close"   onclick="window.dismissErrBanner && window.dismissErrBanner();">✕</button>'
      +'  </div>'
      +'</div>'
      + (detail ? ('<div class="detail">'+detail.replace(/</g,'&lt;')+'</div>') : '');
    b.innerHTML = html;
    document.body.classList.add('banner-show');
    b.classList.add('show');
    clearTimeout(window.__ebTimer);
    // 3.5s 自动隐藏除非人点了
    window.__ebTimer = setTimeout(function(){ dismissErrBanner(false); }, 3500);
  }catch(_){}
}
try{ window.showErrBanner = showErrBanner; }catch(_){}

function dismissErrBanner(manual){
  try{
    var b = document.getElementById("errBanner");
    if(b){
      b.classList.remove("show");
      if(manual !== false){ clearTimeout(window.__ebTimer); }
    }
    document.body.classList.remove('banner-show');
  }catch(_){}
}
try{ window.dismissErrBanner = dismissErrBanner; }catch(_){}

function retryLastAction(){
  try{
    dismissErrBanner();
    var fn = window.__lastAction;
    if(typeof fn === 'function'){ try{ fn(); return; }catch(e){ showErrBanner('重试再次失败', e); return; } }
    // fallback：如果没记录，就切换回 today 重画今日
    try{ if(window.renderToday){ window.renderToday(); showToastBottom('已重画今日页'); return; } }catch(_x2){}
    showToastBottom('没有可重试的上一步，请重新操作');
  }catch(_){}
}
try{ window.retryLastAction = retryLastAction; }catch(_){}

/* -------- G4: 底部轻 toast -------- */
function showToastBottom(text, timeoutMs){
  try{
    if(!text) return;
    var t = document.getElementById('toastBottom');
    if(!t){
      t = document.createElement('div');
      t.id = 'toastBottom';
      t.className = 'toast-bottom';
      document.body.appendChild(t);
    }
    t.textContent = String(text).slice(0, 200);
    t.classList.add('show');
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(function(){
      var tt = document.getElementById('toastBottom'); if(tt) tt.classList.remove('show');
    }, typeof timeoutMs === 'number' ? timeoutMs : 1800);
  }catch(_){}
}
try{ window.showToastBottom = showToastBottom; }catch(_){}

/* -------- G4: 后退键提示「草稿已保存」（非阻塞） -------- */
function bindBackPressHint(){
  try{
    if(window.__bpHooked) return;
    // 只在支持 history.pushState 的环境加
    if(typeof history === 'undefined' || !history || typeof history.pushState !== 'function') return;
    var pushed = false;
    function pushOnce(){
      if(pushed) return;
      try{ history.pushState({zhiming:'stub'}, '', location.hash || '#'); pushed = true; }catch(_){}
    }
    pushOnce();
    window.addEventListener && window.addEventListener('popstate', function(){
      try{
        pushed = false;
        // 非阻塞 toast：草稿检查
        var any = false;
        var TYPES = (typeof DRAFT_TYPES !== 'undefined') ? DRAFT_TYPES : (window.DRAFT_TYPES || []);
        for(var i=0;i<TYPES.length;i++){
          try{ if(localStorage.getItem(DRAFT_KEY_PREFIX + TYPES[i])){ any = true; break; } }catch(_x){}
        }
        showToastBottom(any ? '✅ 草稿已自动保存，下次打开自动恢复' : '👌 收到，已退出');
      }catch(_){}
      // 再次压栈，允许下次提示
      setTimeout(pushOnce, 80);
    }, false);
    // 每次进入 today 页再 push 一次（切 tab 会清）
    try{
      var _orig = window.switchTab;
      if(typeof _orig === 'function'){
        window.switchTab = function(){
          var r = _orig.apply(this, arguments);
          setTimeout(pushOnce, 0);
          return r;
        };
      }
    }catch(_x){}
    window.__bpHooked = true;
  }catch(_){}
}
try{ window.bindBackPressHint = bindBackPressHint; }catch(_){}

/* -------- G4: 档案跨 Tab 联动事件分发/订阅 -------- */
function dispatchAndSubscribeProfileChange(){
  try{
    // 1) monkey-patch setActiveProfile：成功后 dispatch CustomEvent
    var SAP = window.setActiveProfile;
    if(typeof SAP === 'function' && !SAP.__patched){
      window.setActiveProfile = function(pid){
        var before = window._activeProfileId;
        var r = SAP.apply(this, arguments);
        var after = window._activeProfileId;
        if(before !== after || pid){
          try{ document.dispatchEvent(new CustomEvent('profile-changed', {detail:{profileId: after || pid}})); }catch(_){}
        }
        return r;
      };
      window.setActiveProfile.__patched = true;
      try{ window.setActiveProfile = window.setActiveProfile; }catch(_){}
    }
    // 1b) 新建/保存档案成功后也触发（如果有 saveProfile / addProfile）
    ['saveProfile','addProfile'].forEach(function(fnName){
      try{
        var fn = window[fnName];
        if(typeof fn === 'function' && !fn.__patchedEvt){
          window[fnName] = function(){
            var r = fn.apply(this, arguments);
            setTimeout(function(){
              try{
                var cur = window._activeProfileId;
                document.dispatchEvent(new CustomEvent('profile-changed', {detail:{profileId: cur}}));
              }catch(_){}
            }, 30);
            return r;
          };
          window[fnName].__patchedEvt = true;
        }
      }catch(_){}
    });
    // 2) 订阅：给 8 个需要档案字段的表单填值（如果当前表单没有用户最近手填痕迹）
    document.addEventListener && document.addEventListener('profile-changed', function(ev){
      try{
        var pid = ev && ev.detail && ev.detail.profileId;
        var p = _getProfileByIdSafe(pid);
        if(!p) return;
        var TYPES_TOUCH_PROFILE = ['bazi','wuge','lingshu','daliuren','meihua','qimen','bazi_ht','zhouyi'];
        for(var i=0;i<TYPES_TOUCH_PROFILE.length;i++){
          var t = TYPES_TOUCH_PROFILE[i];
          try{ _applyProfileToDraft(t, p); }catch(_){}
        }
      }catch(_){}
    }, false);
  }catch(_){}
}
try{ window.dispatchAndSubscribeProfileChange = dispatchAndSubscribeProfileChange; }catch(_){}

/* （内部）读档案 + 空值保护 */
function _getProfileByIdSafe(pid){
  try{
    var list = (typeof loadProfiles === 'function') ? loadProfiles() : (window.loadProfiles && window.loadProfiles());
    if(!pid){ pid = window._activeProfileId; }
    if(!Array.isArray(list) || !pid) return null;
    return list.filter(function(x){ return x && x.id === pid; })[0] || list[0] || null;
  }catch(_){ return null; }
}
try{ window._getProfileByIdSafe = _getProfileByIdSafe; }catch(_){}

/* （内部）按 type 把档案 p 的 name/gender/y/m/d/h/minute/city 填进对应表单字段，用户最近手填过就只给横幅提示「点这里覆盖」 */
function _applyProfileToDraft(type, p){
  try{
    if(!type || !p) return;
    // 判断最近手填：该 type 的 _dirty==='1' 且 lastin 距现在 <= PROFILE_LINK_IDLE_MS
    var key = DRAFT_KEY_PREFIX + type;
    var dirty = null; var lastin = null;
    try{ dirty = localStorage.getItem(key + DRAFT_DIRTY_SUFFIX); }catch(_){}
    try{ lastin = Number(localStorage.getItem(key + UX_LAST_INTERACT_SUFFIX) || 0); }catch(_){}
    var recentlyEdited = (dirty === '1' && lastin && (Date.now() - lastin) <= (PROFILE_LINK_IDLE_MS || 30000));
    // 解析字段名 → value（依据 DRAFT_FIELDS.<type>）
    var D = (typeof DRAFT_FIELDS !== 'undefined') ? DRAFT_FIELDS : (window.DRAFT_FIELDS || null);
    if(!D) return;
    var def = D[type];
    if(!def) return;
    var fields = def.fields || {};
    var names = Object.keys(fields);
    var anyFilled = false;
    for(var i=0;i<names.length;i++){
      var n = names[i];
      var f = fields[n]; if(!f) continue;
      var id = f.id; if(!id) continue;
      var val = _profileFieldValue(p, n);
      if(val == null) continue;
      var el = document.getElementById(id); if(!el) continue;
      if(recentlyEdited){
        // 手填过 → 标记覆盖提示：不改值
        anyFilled = true;
        el.style.outline = '1px dashed var(--pri)';
        el.title = '检测到切换档案，点此提示后右键/双击用档案值覆盖';
        (function(el2, val2){
          var once = function(){ try{ el2.value = val2; el2.style.outline=''; el2.title=''; _fireChange(el2); }catch(_){} el2.removeEventListener('dblclick', once); };
          el2.addEventListener && el2.addEventListener('dblclick', once, false);
        })(el, val);
      } else {
        el.value = String(val);
        _fireChange(el);
      }
    }
    if(recentlyEdited && anyFilled){
      try{ showToastBottom('检测到你刚才在 '+((TYPE_LABEL&&TYPE_LABEL[type])||type)+' 手填过字段，双击虚线框可覆盖为档案值'); }catch(_){}
    }
  }catch(_){}
}
try{ window._applyProfileToDraft = _applyProfileToDraft; }catch(_){}

/* （内部）档案字段 p 的 name/gender/y/m/d/h/minute/city 对应 DRAFT_FIELDS 键名的统一映射 */
function _profileFieldValue(p, fieldKey){
  if(!p) return null;
  // DRAFT_FIELDS.<type> 的 key 惯例：name/surname（姓名/姓）、gender、year/y、month/m、day/d、hour/h、minute/min、city
  var k = String(fieldKey||'').toLowerCase();
  if(k === 'name' || k === 'fullname' || k === 'full_name'){ return p.name || null; }
  if(k === 'surname'){
    // 档案里一般只有 full name：使用 resolveWugeInput 拆 surname
    var r = resolveWugeInput((p.name||'') + (p.gender ? (' ' + p.gender) : ''));
    return r.surname || null;
  }
  if(k === 'given'){
    var r2 = resolveWugeInput((p.name||'') + (p.gender ? (' ' + p.gender) : ''));
    return r2.given || null;
  }
  if(k === 'gender' || k === 'sex'){ return p.gender || null; }
  if(k === 'year' || k === 'y'){ return p.y != null ? p.y : null; }
  if(k === 'month' || k === 'm'){ return p.m != null ? p.m : null; }
  if(k === 'day' || k === 'd'){ return p.d != null ? p.d : null; }
  if(k === 'hour' || k === 'h'){ return p.h != null ? p.h : null; }
  if(k === 'minute' || k === 'min' || k === 'mm'){ return p.minute != null ? p.minute : null; }
  if(k === 'city' || k === 'cityname' || k === 'location'){ return p.city || null; }
  return null;
}
try{ window._profileFieldValue = _profileFieldValue; }catch(_){}

function switchProfileAllTabs(profileId){
  try{
    if(typeof window.setActiveProfile === 'function'){
      window.setActiveProfile(profileId);
      // 兜底：再手动 dispatch 一次（以防 __patched 未生效）
      try{ document.dispatchEvent(new CustomEvent('profile-changed', {detail:{profileId: profileId}})); }catch(_){}
      showToastBottom('已切换档案，正在联动所有表单…');
    }
  }catch(_){}
}
try{ window.switchProfileAllTabs = switchProfileAllTabs; }catch(_){}
`;

const s5Patch = [
  {
    id: "ux5_functions",
    anchor: s5Anchor,
    insert: "before",
    code: s5Code,
    required: true
  }
];

fs.writeFileSync('/workspace/accel/patches/ux5_functions.json', JSON.stringify(s5Patch, null, 2));
console.log('✅ Step5 patch written: /workspace/accel/patches/ux5_functions.json');
console.log('   anchor length:', s5Anchor.length, 'chars');
console.log('   code length:', s5Code.length, 'chars');

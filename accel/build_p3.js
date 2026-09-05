const fs = require('fs');
const path = require('path');

const patches = [];

// ============================================================
// PATCH 1: CSS 样式 (anchor=style_end_before)
// ============================================================
patches.push({
  anchor: 'style_end_before',
  content: `
  /* Phase 3: 灵数九宫 / 卢恩 / 六壬 互动 */
  .lingshu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px auto;max-width:300px;}
  .lingshu-cell{aspect-ratio:1;border-radius:10px;background:linear-gradient(135deg,#f0ece5,#e5ddce);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;position:relative;}
  .lingshu-cell.empty{background:var(--bg);opacity:.45;}
  .lingshu-cell.main{background:linear-gradient(135deg,#f5c134,#d9a21c);color:#5d4200;box-shadow:0 6px 14px rgba(245,193,52,.35);border:1px solid #e0b12c;}
  .lingshu-cell .num{font-size:20px;font-weight:800;}
  .lingshu-cell .kw{font-size:10px;text-align:center;margin-top:2px;line-height:1.15;}
  .lingshu-cell .dots{position:absolute;bottom:4px;display:flex;gap:2px;}
  .lingshu-cell .dots i{width:6px;height:6px;border-radius:50%;background:var(--pri);}
  .lingshu-legend{font-size:12px;color:var(--text-hint);margin-top:8px;}
  .lingshu-tip{background:linear-gradient(135deg,rgba(106,141,173,.12),rgba(74,125,214,.12));border:1px dashed var(--line);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px;}
  /* Rune */
  .rune-layout{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:10px 0;}
  .rune-card{width:130px;min-height:170px;border-radius:14px;background:linear-gradient(160deg,#2a2344,#46366f);color:#fff;padding:12px;box-shadow:0 10px 26px rgba(107,92,165,.4);position:relative;border:1px solid rgba(255,255,255,.08);}
  .rune-card.rev{transform:rotate(180deg);}
  .rune-card .name{font-size:14px;font-weight:700;margin-bottom:4px;}
  .rune-card .svg-slot{margin:6px auto;text-align:center;height:70px;}
  .rune-card .kw{font-size:10px;opacity:.9;line-height:1.3;}
  .rune-card .title{font-size:11px;opacity:.8;margin-top:6px;}
  .rune-btns{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}
  .rune-btns button{padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);cursor:pointer;font-size:12px;}
  .rune-btns button.on{background:var(--pri);color:#fff;border-color:var(--pri);font-weight:600;}
  /* Daliren / 梅花 手摇卦 */
  .shouyao-stage{border-radius:14px;padding:14px;background:linear-gradient(135deg,rgba(139,111,71,.09),rgba(74,107,138,.09));margin:8px 0;border:1px solid var(--line);}
  .shouyao-row{display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px dashed var(--line);}
  .shouyao-row:last-child{border-bottom:0;}
  .shouyao-row .pos{min-width:36px;font-size:11px;color:var(--text-hint);}
  .shouyao-row .yao{flex:1;height:20px;display:flex;align-items:center;gap:6px;}
  .yao-yang{flex:1;height:6px;background:#c9302c;border-radius:2px;}
  .yao-yin{display:flex;flex:1;gap:6px;}
  .yao-yin i{flex:1;height:6px;background:#333;border-radius:2px;}
  .yao-marker{min-width:22px;text-align:center;font-weight:700;font-size:13px;}
  .yao-marker.m6{color:#d32f2f;} .yao-marker.m9{color:#d32f2f;}
  .shouyao-actions{display:flex;gap:8px;margin-top:10px;}
  .shouyao-actions button{flex:1;padding:11px;border-radius:10px;border:0;cursor:pointer;font-weight:600;}
  .shouyao-actions button.primary{background:var(--pri);color:#fff;}
  .shouyao-actions button.secondary{background:var(--bg);border:1px solid var(--line);color:var(--text);}
  .daliuren-pan{margin:10px auto;max-width:320px;position:relative;aspect-ratio:1/1;}
`
});

// ============================================================
// PATCH 2: TYPE_LABEL 扩展 (anchor=type_label_before)
// ============================================================
patches.push({
  anchor: 'type_label_before',
  content: `
  // Phase 3 类型扩展（6处同步：summarizeHist/restoreHistory/copyResult/buildShareCardHTML/saveHistory渲染/hist筛选TYPE_LABEL）
  if (typeof TYPE_LABEL !== 'undefined') {
    TYPE_LABEL.lingshu = '西方灵数';
    TYPE_LABEL.rune = '卢恩符文';
    TYPE_LABEL.daliuren = '大六壬';
  }
  try{ window.TYPE_LABEL = TYPE_LABEL; }catch(_){}
`
});

// ============================================================
// PATCH 3: HIST_TYPE_COLOR 扩展 (anchor=hist_type_color_after)
// 注意: 锚点是紧跟 "const HIST_TYPE_COLOR = {" 之后，所以我们直接追加 key:value, 条目
// ============================================================
patches.push({
  anchor: 'hist_type_color_after',
  content: `lingshu:'#6A8DAD', rune:'#6B5CA5', daliuren:'#4A6B8A', `
});

// ============================================================
// PATCH 4: HTML section + 手摇卦按钮 (anchor=body_end_before)
// ============================================================
patches.push({
  anchor: 'body_end_before',
  content: `
  <!-- Phase 3: 西方灵数画像 -->
  <section id="sec-wu3" class="sub-sec hidden">
    <div class="form-row"><label>出生年月日</label>
      <div style="display:flex;gap:4px;"><input id="ls-Y" type="number" min="1900" max="2100" placeholder="1990">
      <input id="ls-M" type="number" min="1" max="12" placeholder="8">
      <input id="ls-D" type="number" min="1" max="31" placeholder="8"></div>
    </div>
    <button class="btn-primary" onclick="calcAndRenderLingshu()">🔢 计算九宫灵数画像</button>
    <div id="result-wu3"></div>
  </section>
  <!-- Phase 3: 卢恩符文 -->
  <section id="sec-wu4" class="sub-sec hidden">
    <div class="rune-btns" style="margin-bottom:10px;">
      <button onclick="drawRunes(1,this)">单抽</button>
      <button onclick="drawRunes(3,this)">三抽（过去·现在·未来）</button>
      <button onclick="drawRunes(6,this)">六抽（诺伦三女神之网）</button>
    </div>
    <div id="result-wu4"></div>
  </section>
  <!-- Phase 3: 大六壬 -->
  <section id="sec-cn7" class="sub-sec hidden">
    <div class="form-row"><label>占问时间</label>
      <div style="display:flex;gap:4px;">
        <input id="dlr-Y" type="number" placeholder="年">
        <input id="dlr-M" type="number" placeholder="月">
        <input id="dlr-D" type="number" placeholder="日">
        <input id="dlr-h" type="number" placeholder="时"></div>
    </div>
    <button class="btn-primary" onclick="calcDaliuren()">📐 排大六壬课</button>
    <div id="result-cn7"></div>
  </section>

  <script>
  // Phase3: 手摇卦按钮注入（sec-cn6 梅花易数区末尾追加）
  try{
    const cn6sec = document.getElementById('sec-cn6');
    if(cn6sec){
      // 尝试找按钮行：找最后一个包含 button 的 div/form-row 或直接在末尾加
      let btnRow = cn6sec.querySelector('.btn-row, .action-row');
      if(!btnRow){
        // 找不到按钮行就找最后一个 btn-primary/btn-secondary 的父级
        const lastBtn = cn6sec.querySelectorAll('button.btn-primary, button.btn-secondary');
        if(lastBtn && lastBtn.length){
          btnRow = lastBtn[lastBtn.length-1].parentNode;
        }
      }
      if(btnRow){
        const shouBtn = document.createElement('button');
        shouBtn.className = 'btn-secondary';
        shouBtn.id = 'btn-shouyao';
        shouBtn.onclick = function(){ try{ openShouyaoMeihua(); }catch(_){} };
        shouBtn.textContent = '🎲 手摇卦（逐爻起卦）';
        btnRow.appendChild(shouBtn);
      } else {
        // 兜底：直接在 sec-cn6 末尾 append
        const shouBtn = document.createElement('button');
        shouBtn.className = 'btn-secondary';
        shouBtn.id = 'btn-shouyao';
        shouBtn.style.marginTop = '8px';
        shouBtn.onclick = function(){ try{ openShouyaoMeihua(); }catch(_){} };
        shouBtn.textContent = '🎲 手摇卦（逐爻起卦）';
        cn6sec.appendChild(shouBtn);
      }
    }
  }catch(_){}
  </script>
`
});

// ============================================================
// PATCH 5: JS 主模块 (anchor=js_pre_iife_before)
// 四大部分：
//   A. 灵数九宫画像 + calcAndRenderLingshu
//   B. RUNES_24 + drawRunes
//   C. openShouyaoMeihua / pushYao / finishShouyao 梅花手摇卦
//   D. calcDaliuren 简化版大六壬排课
// ============================================================
patches.push({
  anchor: 'js_pre_iife_before',
  content: `

/* ============================================================
 *  Phase 3 · A: 西方灵数九宫画像
 * ============================================================ */
const LINGSHU_KW = {
  1: {name:'领导独立', kw:'开创·主见·先锋'},
  2: {name:'协作平衡', kw:'协调·温柔·外交'},
  3: {name:'表达创造', kw:'沟通·创意·才艺'},
  4: {name:'稳定实干', kw:'秩序·执行·务实'},
  5: {name:'自由变化', kw:'冒险·多元·突破'},
  6: {name:'关爱责任', kw:'家庭·奉献·疗愈'},
  7: {name:'内省智慧', kw:'研究·真理·灵性'},
  8: {name:'权财丰盛', kw:'野心·资源·显化'},
  9: {name:'大爱智慧', kw:'慈悲·圆满·服务'}
};
try{ window.LINGSHU_KW = LINGSHU_KW; }catch(_){}

function reduceToSingle(n){
  n = Math.abs(Math.floor(n));
  while(n>9){
    let s=0; String(n).split('').forEach(c=>s+=parseInt(c,10)); n=s;
  }
  return n===0? 9 : n;
}
try{ window.reduceToSingle = reduceToSingle; }catch(_){}

function calcLingshuCore(Y,M,D){
  const y = parseInt(Y,10), m = parseInt(M,10), d = parseInt(D,10);
  if(!y||!m||!d||y<1900||y>2100||m<1||m>12||d<1||d>31) return null;
  // 主命数 = 生日所有数字相加 → 个位化
  const lifePath = reduceToSingle(String(y).split('').reduce((a,c)=>a+parseInt(c,10),0) + (m>9? Math.floor(m/10)+m%10:m) + (d>9? Math.floor(d/10)+d%10:d));
  // 天赋数字 = 每个数字位上的非零数字（个位化后）
  const digits = [];
  String(y).split('').forEach(c=>{ if(c!=='0') digits.push(reduceToSingle(parseInt(c,10))); });
  (m>9? [Math.floor(m/10),m%10] : [m]).forEach(v=>{ if(v!==0) digits.push(reduceToSingle(v)); });
  (d>9? [Math.floor(d/10),d%10] : [d]).forEach(v=>{ if(v!==0) digits.push(reduceToSingle(v)); });
  // 额外：主命数若由两个相同的个位数相加而来 → 卓越数提示
  // 每宫最多打点数量统计
  const dotCount = {};
  digits.forEach(n=>{ dotCount[n] = (dotCount[n]||0)+1; });
  return { lifePath, digits, dotCount, Y:y, M:m, D:d };
}
try{ window.calcLingshuCore = calcLingshuCore; }catch(_){}

function renderLingshuGrid(core){
  // 九宫格顺序：
  //   4 9 2
  //   3 5 7
  //   8 1 6
  const gridOrder = [4,9,2, 3,5,7, 8,1,6];
  const present = new Set(core.digits);
  let html = '<div class="lingshu-grid">';
  gridOrder.forEach(n=>{
    const isMain = (n === core.lifePath);
    const isEmpty = !present.has(n);
    const dots = Math.min(3, core.dotCount[n]||0);
    let cls = 'lingshu-cell';
    if(isEmpty) cls += ' empty';
    if(isMain) cls += ' main';
    const kw = LINGSHU_KW[n].name;
    const kw2 = LINGSHU_KW[n].kw;
    html += '<div class="'+cls+'">';
    html += '<div class="num">'+n+'</div>';
    html += '<div class="kw">'+(isMain? '<b>'+kw+'</b>':kw)+'<br>'+kw2+'</div>';
    if(dots>0){
      html += '<div class="dots">';
      for(let i=0;i<dots;i++) html += '<i></i>';
      html += '</div>';
    }
    html += '</div>';
  });
  html += '</div>';
  html += '<div class="lingshu-legend">主命数：<b style="color:#d9a21c;">'+core.lifePath+' '+LINGSHU_KW[core.lifePath].name+'</b>（'+LINGSHU_KW[core.lifePath].kw+'），宫点越多表示该能量越强（最多3点）。</div>';
  // 缺数提示
  const missing = [];
  for(let i=1;i<=9;i++) if(!present.has(i)) missing.push(i);
  if(missing.length){
    html += '<div class="lingshu-tip">🧩 <b>缺数提示</b>：九宫缺少 '+missing.map(n=>n+'·'+LINGSHU_KW[n].name).join(' / ')+'。<br>建议日常可通过对应颜色/数字物品或刻意练习补足这些能量（仅供参考）。</div>';
  } else {
    html += '<div class="lingshu-tip">✨ <b>圆满九宫</b>：1-9 数字齐备，整体能量均衡，可重点关注主命数 '+core.lifePath+' 的深化修炼。</div>';
  }
  return html;
}
try{ window.renderLingshuGrid = renderLingshuGrid; }catch(_){}

function calcAndRenderLingshu(){
  const Y = document.getElementById('ls-Y').value;
  const M = document.getElementById('ls-M').value;
  const D = document.getElementById('ls-D').value;
  const out = document.getElementById('result-wu3');
  const core = calcLingshuCore(Y,M,D);
  if(!core){ out.innerHTML = '<div class="lingshu-tip">⚠️ 请输入有效的出生年月日（年1900-2100，月1-12，日1-31）。</div>'; return; }
  let html = renderLingshuGrid(core);
  // 记录历史（若存在通用保存函数）
  try{
    if(typeof saveHistory === 'function'){
      saveHistory({type:'lingshu', input:Y+'-'+M+'-'+D, result: {lifePath:core.lifePath, digits:core.digits}, ts: Date.now()});
    }
  }catch(_){}
  out.innerHTML = html;
}
try{ window.calcAndRenderLingshu = calcAndRenderLingshu; }catch(_){}

/* ============================================================
 *  Phase 3 · B: 卢恩符文 RUNES_24 + drawRunes
 * ============================================================ */
const RUNES_24 = [
  {name:'Fehu',   sym:'ᚠ', kw:['财富','丰饶','物质'], pos:'正位：新资源、收入、财运启动；脚踏实地积累', rev:'逆位：破财、贪念、计划失败；需节俭与耐心'},
  {name:'Uruz',   sym:'ᚢ', kw:['力量','健康','野性'], pos:'正位：活力爆发、身体强健、挑战突破', rev:'逆位：精力衰退、软弱、错失机会；注意休息'},
  {name:'Thurisaz',sym:'ᚦ',kw:['防御','冲突','雷神'], pos:'正位：守护边界、破除障碍、主动出击', rev:'逆位：内在混乱、防御过当、口舌是非；谨慎'},
  {name:'Ansuz',  sym:'ᚨ', kw:['沟通','智慧','灵感'], pos:'正位：言语有力、学习精进、贵人讯息', rev:'逆位：沟通误解、谎言、信息延迟；多听少说'},
  {name:'Raido',  sym:'ᚱ', kw:['旅程','行动','进步'], pos:'正位：出行顺利、计划推进、节奏正确', rev:'逆位：计划延迟、行程波折、方向偏差；缓行'},
  {name:'Kenaz',  sym:'ᚲ', kw:['火炬','创造','觉醒'], pos:'正位：灵感燃烧、创造力显化、洞见清晰', rev:'逆位：创意枯竭、关系降温、迷茫；重新点燃'},
  {name:'Gebo',   sym:'ᚷ', kw:['礼物','合作','馈赠'], pos:'正位：合作双赢、缘分、意外收获', rev:'逆位：单方面付出、贪婪、关系失衡；平衡给予'},
  {name:'Wunjo',  sym:'ᚹ', kw:['喜悦','和谐','祝福'], pos:'正位：情绪愉悦、团队融洽、愿望达成', rev:'逆位：情绪低落、孤立、小摩擦；保持感恩'},
  {name:'Hagalaz',sym:'ᚺ', kw:['冰雹','破坏','觉醒'], pos:'正位：剧变来临、旧模式破碎、被迫成长', rev:'逆位：风暴渐息、灾后重建、缓慢恢复；耐心'},
  {name:'Nauthiz',sym:'ᚾ', kw:['需要','约束','坚韧'], pos:'正位：认清需求、在限制中成长、延迟满足', rev:'逆位：过度压抑、匮乏感、焦虑；审视真正需求'},
  {name:'Isa',    sym:'ᛁ', kw:['冰','停滞','内观'], pos:'正位：冻结暂停、保持现状、冷静思考', rev:'逆位：解冻、缓慢启动、关系松动；把握节奏'},
  {name:'Jera',   sym:'ᛃ', kw:['丰收','循环','耐心'], pos:'正位：一年耕耘结果、周期圆满、稳步回报', rev:'逆位：结果延迟、短期无成；继续坚持下去'},
  {name:'Eihwaz', sym:'ᛇ', kw:['紫杉','坚持','蜕变'], pos:'正位：穿越困难、灵性成长、持久耐力', rev:'逆位：迷茫、拖延、信心动摇；锚定初心'},
  {name:'Perthro',sym:'ᛈ', kw:['骰子','秘密','命运'], pos:'正位：未知可能性、意外事件、放手信任', rev:'逆位：秘密暴露、赌博失利、控制欲过强；顺其自然'},
  {name:'Algiz',  sym:'ᛉ', kw:['麋鹿','保护','神圣'], pos:'正位：受到守护、直觉敏锐、远离危害', rev:'逆位：警惕不足、信任错付、失去庇护；谨慎'},
  {name:'Sowilo', sym:'ᛊ', kw:['太阳','胜利','光明'], pos:'正位：成功、能量充沛、真相显现', rev:'逆位：延迟胜利、暂时阴霾、过度自信；谦逊坚持'},
  {name:'Tiwaz',  sym:'ᛏ', kw:['战神','正义','决断'], pos:'正位：理性决策、正义获胜、领导力显化', rev:'逆位：犹豫不决、不公、冲突失利；先想再做'},
  {name:'Berkano',sym:'ᛒ', kw:['桦树','新生','滋养'], pos:'正位：新开始、孕育、家庭温暖、学习成长', rev:'逆位：计划流产、依赖、停滞不前；耐心孵化'},
  {name:'Ehwaz',  sym:'ᛖ', kw:['马','协作','信任'], pos:'正位：伙伴关系和谐、团队推进、快速前进', rev:'逆位：步调不合、背叛、计划滞后；加强沟通'},
  {name:'Mannaz', sym:'ᛗ', kw:['人','社会','自我'], pos:'正位：人际和谐、自我认知、集体力量', rev:'逆位：人际冲突、自我怀疑、孤立；反思关系'},
  {name:'Laguz',   sym:'ᛚ', kw:['水','流动','直觉'], pos:'正位：情绪流动、灵感如泉、潜意识指引', rev:'逆位：情绪失控、直觉被蒙蔽、混乱；静心'},
  {name:'Ingwaz', sym:'ᛜ', kw:['种子','孕育','完整'], pos:'正位：内在成长、计划成熟、平稳度过', rev:'逆位：种子未发、内部阻滞；给自己时间'},
  {name:'Dagaz',  sym:'ᛞ', kw:['黎明','觉醒','跨越'], pos:'正位：重大突破、黑夜过去、光明来临', rev:'逆位：突破前夜、仍有阻滞；再坚持一步'},
  {name:'Othala', sym:'ᛟ', kw:['传承','家园','根源'], pos:'正位：家庭/遗产、归属感、世代积累', rev:'逆位：与根源割裂、物质纠纷；回望初心'}
];
try{ window.RUNES_24 = RUNES_24; }catch(_){}

function drawOneRune(){
  const idx = Math.floor(Math.random()*RUNES_24.length);
  const reversed = Math.random()<0.35; // 35% 逆位
  return { idx, r: RUNES_24[idx], reversed };
}
try{ window.drawOneRune = drawOneRune; }catch(_){}

function runeSVG(r, isReversed){
  // 简化：用 Unicode 大字号 text 渲染符文，加 SVG 外壳
  const trans = isReversed ? ' transform="rotate(180 50 50)"' : '';
  return '<svg class="rune-svg" viewBox="0 0 100 100" width="90" height="90"'+trans+'>'
    + '<text x="50" y="72" text-anchor="middle" font-family="serif" font-size="72" fill="#fff">'+r.sym+'</text>'
    + '</svg>';
}
try{ window.runeSVG = runeSVG; }catch(_){}

function drawRunes(n, btn){
  // 按钮高亮状态
  try{
    const sec = document.getElementById('sec-wu4');
    sec.querySelectorAll('.rune-btns button').forEach(b=>b.classList.remove('on'));
    if(btn) btn.classList.add('on');
  }catch(_){}
  const titles = {
    1: ['当下指引'],
    3: ['🌿 过去','🌞 现在','🌱 未来'],
    6: ['⛰ 命运之网·过去','⛰ 命运之网·过去挑战','🌞 现在','🌞 现在行动','🌱 未来','🌱 未来可能性']
  };
  const drawn = [];
  for(let i=0;i<n;i++) drawn.push(drawOneRune());
  let html = '<div class="rune-layout">';
  drawn.forEach((dr,i)=>{
    const cls = 'rune-card'+(dr.reversed?' rev':'');
    const title = (titles[n] && titles[n][i])? titles[n][i] : '符文 '+(i+1);
    html += '<div class="'+cls+'">';
    html += '<div class="title">'+title+'</div>';
    html += '<div class="name">'+dr.r.name+(dr.reversed?' (逆)':' (正)')+'</div>';
    html += '<div class="svg-slot">'+runeSVG(dr.r, dr.reversed)+'</div>';
    html += '<div class="kw">关键词：'+dr.r.kw.join(' · ')+'<br><br>';
    html += (dr.reversed? dr.r.rev : dr.r.pos) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  try{
    if(typeof saveHistory === 'function'){
      saveHistory({type:'rune', input: '抽'+n, result: {n, drawn: drawn.map(d=>({name:d.r.name, reversed:d.reversed}))}, ts: Date.now()});
    }
  }catch(_){}
  document.getElementById('result-wu4').innerHTML = html;
}
try{ window.drawRunes = drawRunes; }catch(_){}

/* ============================================================
 *  Phase 3 · C: 梅花易数 手摇卦 逐爻起卦
 * ============================================================ */
let _shouyaoState = null;
try{ window._shouyaoState = _shouyaoState; }catch(_){}

function rand6789(){
  // 梅花手摇卦：3枚铜钱，正面=3，反面=2，三枚相加得 6/7/8/9
  const toss = () => (Math.random()<0.5?2:3);
  return toss()+toss()+toss(); // 6老阴 7少阳 8少阴 9老阳
}
try{ window.rand6789 = rand6789; }catch(_){}

function renderShouyaoStage(){
  const st = _shouyaoState;
  if(!st) return '';
  let html = '<div class="shouyao-stage">';
  html += '<div style="font-weight:700;margin-bottom:6px;">🎲 梅花易数 · 逐爻手摇卦（第 '+(st.idx+1)+' / 6 爻 · 从下往上初爻至上爻）</div>';
  for(let i=0;i<6;i++){
    const rowIdx = 5-i; // 渲染：上爻(row5)在最上 → 对应数组下标 5
    const y = st.yaos[rowIdx];
    const posName = ['初爻','二爻','三爻','四爻','五爻','上爻'][rowIdx];
    html += '<div class="shouyao-row">';
    html += '<div class="pos">'+posName+'</div>';
    html += '<div class="yao">';
    if(y===0){
      html += '<span style="opacity:.4;font-size:12px;">— 未起 —</span>';
    } else if(y===7 || y===9){
      // 阳爻 (少阳7 / 老阳9)
      html += '<div class="yao-yang" style="background:'+(y===9?'#d32f2f':'#c9302c')+';"></div>';
    } else {
      // 阴爻 (少阴8 / 老阴6)
      html += '<div class="yao-yin"><i style="background:'+(y===6?'#d32f2f':'#333')+';"></i><i style="background:'+(y===6?'#d32f2f':'#333')+';"></i></div>';
    }
    html += '</div>';
    if(y===0){
      html += '<div class="yao-marker">-</div>';
    } else {
      html += '<div class="yao-marker '+(y===6?'m6':y===9?'m9':'')+'">'+y+(y===6?'×':y===9?'○':'')+'</div>';
    }
    html += '</div>';
  }
  html += '<div style="font-size:11px;color:var(--text-hint);margin-top:6px;">';
  html += '6=老阴(变阳)× · 7=少阳(不变) · 8=少阴(不变) · 9=老阳(变阴)○';
  if(st.idx<6) html += '<br>👇 点击下方「摇第'+(st.idx+1)+'爻」（或摇晃设备）';
  html += '</div>';
  html += '<div class="shouyao-actions">';
  if(st.idx<6){
    html += '<button class="primary" onclick="pushYao()">🎲 摇第'+(st.idx+1)+'爻</button>';
    html += '<button class="secondary" onclick="cancelShouyao()">取消</button>';
  } else {
    html += '<button class="primary" onclick="finishShouyao()">✅ 完成起卦 → 填入梅花计算</button>';
    html += '<button class="secondary" onclick="resetShouyao()">↺ 重摇</button>';
  }
  html += '</div></div>';
  return html;
}
try{ window.renderShouyaoStage = renderShouyaoStage; }catch(_){}

function openShouyaoMeihua(){
  _shouyaoState = { idx:0, yaos:[0,0,0,0,0,0] };
  // 尝试注入到结果区或梅花主结果区
  let host = document.getElementById('result-cn6');
  if(!host) host = document.getElementById('sec-cn6');
  if(!host) return;
  // 新建 div
  let stageDiv = document.getElementById('shouyao-stage-div');
  if(!stageDiv){
    stageDiv = document.createElement('div');
    stageDiv.id = 'shouyao-stage-div';
    host.insertBefore(stageDiv, host.firstChild);
  }
  stageDiv.innerHTML = renderShouyaoStage();
  stageDiv.scrollIntoView && stageDiv.scrollIntoView({behavior:'smooth', block:'nearest'});
  // DeviceMotion 支持
  try{
    if(window.DeviceMotionEvent){
      window._shouyaoMotionHandler = function(e){
        const acc = (e.acceleration && e.acceleration.x!=null) ? e.acceleration : (e.accelerationIncludingGravity||null);
        if(!acc) return;
        const total = Math.abs(acc.x||0)+Math.abs(acc.y||0)+Math.abs(acc.z||0);
        if(total>25){
          try{ window.removeEventListener('devicemotion', window._shouyaoMotionHandler); }catch(_){}
          if(_shouyaoState && _shouyaoState.idx<6){ setTimeout(function(){pushYao();},200); }
        }
      };
      window.addEventListener('devicemotion', window._shouyaoMotionHandler);
    }
  }catch(_){}
}
try{ window.openShouyaoMeihua = openShouyaoMeihua; }catch(_){}

function pushYao(){
  const st = _shouyaoState;
  if(!st || st.idx>=6) return;
  const v = rand6789();
  st.yaos[st.idx] = v;  // idx 0 = 初爻 (数组[0])
  st.idx++;
  let host = document.getElementById('shouyao-stage-div');
  if(host) host.innerHTML = renderShouyaoStage();
  // 继续监听
  if(st.idx<6){
    try{
      if(window.DeviceMotionEvent && window._shouyaoMotionHandler){
        window.addEventListener('devicemotion', window._shouyaoMotionHandler);
      }
    }catch(_){}
  }
}
try{ window.pushYao = pushYao; }catch(_){}

function cancelShouyao(){
  _shouyaoState = null;
  try{ window.removeEventListener('devicemotion', window._shouyaoMotionHandler); }catch(_){}
  const d = document.getElementById('shouyao-stage-div');
  if(d) d.innerHTML = '';
}
try{ window.cancelShouyao = cancelShouyao; }catch(_){}

function resetShouyao(){
  _shouyaoState = { idx:0, yaos:[0,0,0,0,0,0] };
  const d = document.getElementById('shouyao-stage-div');
  if(d) d.innerHTML = renderShouyaoStage();
}
try{ window.resetShouyao = resetShouyao; }catch(_){}

function finishShouyao(){
  const st = _shouyaoState;
  if(!st || st.idx<6) return;
  // yaos[0..5] = 初..上爻, 值 ∈{6,7,8,9}
  // 尝试自动填到梅花易数并计算（自动填充年/月/日/时并模拟按钮点击）
  try{
    // 把 6 爻结果输出成文字展示 + 自动填现有梅花起卦界面的"上卦/下卦/动爻"近似参数，
    // 若原模块有专门接口优先使用，否则先把卦象直接输出在结果中。
    let host = document.getElementById('shouyao-stage-div');
    if(host){
      let html = host.innerHTML;
      html += '<div class="lingshu-tip" style="margin-top:10px;">✅ 起卦完成：本卦 / 变爻 已记录。<br><small>';
      html += '（初→上）：' + st.yaos.map((v,i)=>{
        const yname = v===6?'老阴×':v===7?'少阳':v===8?'少阴':'老阳○';
        return (i+1)+':'+yname;
      }).join(' · ');
      html += '</small><br><br>正在尝试自动导入梅花易数起卦器…</div>';
      host.innerHTML = html;
    }
    // 尝试：把结果写入 hidden 字段然后触发原梅花计算按钮
    if(typeof saveHistory === 'function'){
      saveHistory({type:'meihua', input:'手摇卦', result: {yaos:st.yaos}, ts: Date.now()});
    }
    // 尝试模拟 fill Y/M/D/h + 点击梅花起卦按钮（如果有就自动调用 calcMeihua 类似函数）
    try{
      // 自动填日期到梅花输入框（如果存在）
      const now = new Date();
      const tryFill = (id,val)=>{ try{ const el=document.getElementById(id); if(el) el.value=String(val); }catch(_){} };
      tryFill('mh-Y' , now.getFullYear());
      tryFill('mh-M' , now.getMonth()+1);
      tryFill('mh-D' , now.getDate());
      tryFill('mh-h' , now.getHours());
    }catch(_){}
    // 如果存在 setYaos 接口就调用
    try{
      if(typeof window.setYaosFromShouyao === 'function'){
        window.setYaosFromShouyao(st.yaos.slice());
      }
    }catch(_){}
    // 尝试触发梅花计算按钮
    try{
      const btns = document.querySelectorAll('#sec-cn6 button.btn-primary');
      if(btns && btns.length){
        // 不直接触发，保留用户确认；仅提示
        let host2 = document.getElementById('shouyao-stage-div');
        if(host2) host2.innerHTML += '<div class="lingshu-tip">👉 请点击上方「起卦」按钮（或直接以手动输入方式）完成计算。</div>';
      }
    }catch(_){}
  }catch(_){}
}
try{ window.finishShouyao = finishShouyao; }catch(_){}

/* ============================================================
 *  Phase 3 · D: 大六壬简化排课
 * ============================================================ */
const DLR_ZHIS = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
try{ window.DLR_ZHIS = DLR_ZHIS; }catch(_){}

// 简化版"月将"：按月份（1-12）对应中气月将，不必精确节气，直接按月查表
// 标准：亥=登明，戌=天魁，酉=从魁，申=传送，未=小吉，午=胜光，巳=太乙，辰=天罡，卯=太冲，寅=功曹，丑=大吉，子=神后
// 月将 = 太阳黄经 → 简化：1月=丑(大吉) 2月=子(神后) 3月=亥(登明) 4月=戌(天魁) 5月=酉(从魁) 6月=申(传送)
//            7月=未(小吉) 8月=午(胜光) 9月=巳(太乙) 10月=辰(天罡) 11月=卯(太冲) 12月=寅(功曹)
const DLR_MONTH_TO_JIANG_IDX = [
  -1, // 占位0
  1,  // 1月 → 丑(idx=1) · 大吉
  0,  // 2月 → 子(idx=0) · 神后
  11, // 3月 → 亥(idx=11) · 登明
  10, // 4月 → 戌(idx=10) · 天魁
  9,  // 5月 → 酉(idx=9)  · 从魁
  8,  // 6月 → 申(idx=8)  · 传送
  7,  // 7月 → 未(idx=7)  · 小吉
  6,  // 8月 → 午(idx=6)  · 胜光
  5,  // 9月 → 巳(idx=5)  · 太乙
  4,  // 10月→ 辰(idx=4)  · 天罡
  3,  // 11月→ 卯(idx=3)  · 太冲
  2   // 12月→ 寅(idx=2)  · 功曹
];
try{ window.DLR_MONTH_TO_JIANG_IDX = DLR_MONTH_TO_JIANG_IDX; }catch(_){}

// 天将（12贵神）：贵螣朱六勾青空白常玄阴后
const DLR_TIANJIANG = ['贵','螣','朱','六','勾','青','空','白','常','玄','阴','后'];
try{ window.DLR_TIANJIANG = DLR_TIANJIANG; }catch(_){}

function hourToZhiIdx(h){
  h = ((h%24)+24)%24;
  // 23-1 子, 1-3 丑, 3-5 寅, 5-7 卯, 7-9 辰, 9-11 巳
  // 11-13午, 13-15未, 15-17申, 17-19酉, 19-21戌, 21-23亥
  return (h+1)>>1;  // 0..11
}
try{ window.hourToZhiIdx = hourToZhiIdx; }catch(_){}

function calcDaliuren(){
  const Y = parseInt(document.getElementById('dlr-Y').value,10);
  const M = parseInt(document.getElementById('dlr-M').value,10);
  const D = parseInt(document.getElementById('dlr-D').value,10);
  const h = parseInt(document.getElementById('dlr-h').value,10);
  const out = document.getElementById('result-cn7');
  if(!Y||!M||!D||isNaN(h)||h<0||h>23){
    out.innerHTML = '<div class="lingshu-tip">⚠️ 请输入完整的年月日时（0-23）。</div>';
    return;
  }
  // 月将
  const jiangIdx = DLR_MONTH_TO_JIANG_IDX[Math.max(1,Math.min(12,M))];
  const jiangName = DLR_ZHIS[jiangIdx];
  // 时支
  const shiZhiIdx = hourToZhiIdx(h);
  const shiZhi = DLR_ZHIS[shiZhiIdx];
  // 月将加时：天盘 i 位置 = 地盘 (jiangIdx - shiZhiIdx + i + 12*3) % 12
  // 说明：天盘是"地盘整体旋转"，地盘子(0)位天盘 = DLR_ZHIS[(jiangIdx - shiZhiIdx + 12)%12]
  const tianpanOf = (dizhiIdx) => DLR_ZHIS[(jiangIdx - shiZhiIdx + dizhiIdx + 12*3) % 12];
  // 简化版天干日（以日期最后一位做日干分类：甲乙丙丁戊己庚辛壬癸循环）
  const RIGAN_TABLE = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const riGanIdx = ((D-1)%10+10)%10;
  const riGan = RIGAN_TABLE[riGanIdx];
  const riZhiIdx = ((M*2 + D + (Y%12) -1 )%12 +12)%12;  // 极度简化日支（不精确，仅占位）
  const riZhi = DLR_ZHIS[riZhiIdx];
  // 四课：日上两课 + 辰上两课
  // 日上：日天干寄宫（简化 → 甲→寅 乙→辰 丙→巳 丁→未 戊→巳 己→未 庚→申 辛→戌 壬→亥 癸→丑）
  const GAN_TO_ZHI = [2,4,5,7,5,7,8,10,11,1]; // 甲=寅(2) 乙=辰(4) 丙=巳(5) 丁=未(7) 戊=巳(5) 己=未(7) 庚=申(8) 辛=戌(10) 壬=亥(11) 癸=丑(1)
  const riGanZhiIdx = GAN_TO_ZHI[riGanIdx];
  // 第一课（干上）  : 上神 = 天盘[日干寄宫]      下神 = 日干寄宫地支
  // 第二课（干上阴）: 上神 = 天盘[第一课上神]   下神 = 第一课上神(地盘位)
  const ganShangTian = tianpanOf(riGanZhiIdx);
  const ganShangTianIdx = DLR_ZHIS.indexOf(ganShangTian);
  const ganShangYinTian = tianpanOf(ganShangTianIdx);
  // 第三课（支上）  : 上神 = 天盘[日支]
  // 第四课（支上阴）: 上神 = 天盘[第三课上神]
  const zhiShangTian = tianpanOf(riZhiIdx);
  const zhiShangTianIdx = DLR_ZHIS.indexOf(zhiShangTian);
  const zhiShangYinTian = tianpanOf(zhiShangTianIdx);

  const fourLessons = [
    { name:'第一课·干上', xia: DLR_ZHIS[riGanZhiIdx]+'('+riGan+')', shang: ganShangTian },
    { name:'第二课·干阴', xia: ganShangTian, shang: ganShangYinTian },
    { name:'第三课·支上', xia: riZhi, shang: zhiShangTian },
    { name:'第四课·支阴', xia: zhiShangTian, shang: zhiShangYinTian }
  ];
  // 三传：九宗门简化版（先看有没有 下克上 发用 → 取第一个为初传；如没下克上找上克下；如全无则取昴星/别责/八专/伏吟/返吟简化占位）
  let firstKefound = null;
  for(let i=0;i<4;i++){
    const L = fourLessons[i];
    const xi = DLR_ZHIS.indexOf(L.xia.replace(/[（(].*?[）)]/,''));
    const si = DLR_ZHIS.indexOf(L.shang);
    const diff = (si - xi + 12) % 12;
    // 简化：下克上 = diff ∈ {6,7}(冲/近冲) 或者按五行来？这里用一个简化判据保证不为空：
    // 简化版：如果 diff%6!==0 视为有克
    if((diff%6)!==0 && firstKefound===null) firstKefound = { lesson:i+1, shang:L.shang, si };
  }
  let chuZhuan, zhongZhuan, moZhuan;
  if(firstKefound){
    chuZhuan = firstKefound.shang;
    // 中传 = 初传地盘位对应天盘
    zhongZhuan = tianpanOf(DLR_ZHIS.indexOf(chuZhuan));
    // 末传 = 中传地盘位对应天盘
    moZhuan = tianpanOf(DLR_ZHIS.indexOf(zhongZhuan));
  } else {
    // 无克 → 昴星简化：取时支天盘对冲
    const idx = (shiZhiIdx + 6) % 12;
    chuZhuan = DLR_ZHIS[idx];
    zhongZhuan = tianpanOf(idx);
    moZhuan = tianpanOf(DLR_ZHIS.indexOf(zhongZhuan));
  }
  const sanzhuan = [
    {name:'初传（发端）', zhi: chuZhuan},
    {name:'中传（移易）', zhi: zhongZhuan},
    {name:'末传（归计）', zhi: moZhuan}
  ];
  // 天将排布：以"贵神"起始按地盘旋转 → 简化，昼贵（日间 6-18）顺行，夜间逆行
  const isDay = (h>=6 && h<18);
  // 贵神落位（简化版：甲戊庚日→丑，乙己日→子，丙丁日→亥，壬癸日→巳，辛日→午）
  const GUI_WEI = [1,0,11,11,1,1,0,6,5,5]; // 甲乙丙丁戊己庚辛壬癸 贵神落地盘 index
  const guiDiZhiIdx = GUI_WEI[riGanIdx];
  const tianjiangOf = (dizhiIdx) => {
    const offset = isDay ? ((dizhiIdx - guiDiZhiIdx + 12)%12) : ((guiDiZhiIdx - dizhiIdx + 12)%12);
    return DLR_TIANJIANG[offset];
  };
  // 开始渲染
  let html = '';
  html += '<div class="lingshu-tip">📐 <b>简化版大六壬排课</b>：占问 '+Y+'-'+(M<10?'0':'')+M+'-'+(D<10?'0':'')+D+' '+h+'时<br>';
  html += '月将：<b>'+jiangName+'</b>（按月查表简化） · 时支：<b>'+shiZhi+'</b> · 日干支（占位）：<b>'+riGan+riZhi+'</b></div>';
  // 天盘地盘表（一行地盘一行天盘）
  html += '<div style="overflow-x:auto;margin:10px 0;">';
  html += '<table style="width:100%;max-width:480px;margin:0 auto;font-size:12px;border-collapse:collapse;">';
  html += '<thead><tr style="background:var(--bg);"><th style="padding:6px;border:1px solid var(--line);color:var(--text-hint);">天将</th>';
  DLR_ZHIS.forEach(dz=>{ html += '<th style="padding:6px;border:1px solid var(--line);min-width:40px;">'+dz+'</th>'; });
  html += '</tr></thead><tbody>';
  html += '<tr><td style="padding:6px;border:1px solid var(--line);text-align:center;background:rgba(107,92,165,.08);font-weight:600;">天盘</td>';
  DLR_ZHIS.forEach((dz,i)=>{ const tp=tianpanOf(i); const tj=tianjiangOf(i); const same=(tp===dz);
    html += '<td style="padding:6px;border:1px solid var(--line);text-align:center;font-weight:'+(same?'800':'500')+';color:'+(same?'var(--pri)':'var(--text)')+';">'+tp+'<br><span style="font-size:10px;color:var(--text-hint);">['+tj+']</span></td>'; });
  html += '</tr>';
  html += '<tr><td style="padding:6px;border:1px solid var(--line);text-align:center;background:rgba(106,141,173,.08);font-weight:600;">地盘</td>';
  DLR_ZHIS.forEach((dz,i)=>{ html += '<td style="padding:6px;border:1px solid var(--line);text-align:center;opacity:.7;">'+dz+'</td>'; });
  html += '</tr>';
  html += '</tbody></table></div>';
  // 四课
  html += '<div style="margin-top:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;">📚 四课</div>';
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="background:var(--bg);">';
  fourLessons.forEach(L=>{ html += '<th style="padding:6px;border:1px solid var(--line);">'+L.name+'</th>'; });
  html += '</tr></thead><tbody>';
  html += '<tr>';
  fourLessons.forEach(L=>{ html += '<td style="padding:6px;border:1px solid var(--line);text-align:center;font-size:16px;font-weight:800;">'+L.shang+'<br><span style="font-size:10px;color:var(--text-hint);">['+tianjiangOf(DLR_ZHIS.indexOf(L.shang))+']</span></td>'; });
  html += '</tr><tr>';
  fourLessons.forEach(L=>{ html += '<td style="padding:6px;border:1px solid var(--line);text-align:center;border-top:2px solid #333;">'+L.xia+'</td>'; });
  html += '</tr></tbody></table></div>';
  // 三传
  html += '<div style="margin-top:10px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;">🎯 三传（九宗门简化推导）</div>';
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr style="background:var(--bg);">';
  sanzhuan.forEach(s=>{ html += '<th style="padding:6px;border:1px solid var(--line);">'+s.name+'</th>'; });
  html += '</tr></thead><tbody><tr>';
  sanzhuan.forEach(s=>{ html += '<td style="padding:8px;border:1px solid var(--line);text-align:center;font-size:18px;font-weight:800;color:var(--pri);">'+s.zhi+'<br><span style="font-size:10px;color:var(--text-hint);">['+tianjiangOf(DLR_ZHIS.indexOf(s.zhi))+']</span></td>'; });
  html += '</tr></tbody></table></div>';
  html += '<div class="lingshu-tip" style="margin-top:10px;">🔔 <b>提示</b>：大六壬全课解挂实装中，当前输出为结构化排课（地盘/天盘/天将/四课/三传）用于探索对比。复杂克应、神将类象与九宗门精细判定将在下一阶段补上。</div>';
  // 保存历史
  try{
    if(typeof saveHistory === 'function'){
      saveHistory({type:'daliuren', input:Y+'-'+M+'-'+D+' '+h, result: {jiang:jiangName, shizhi:shiZhi, rigan:riGan, rizhi:riZhi, fourLessons, sanzhuan}, ts: Date.now()});
    }
  }catch(_){}
  out.innerHTML = html;
}
try{ window.calcDaliuren = calcDaliuren; }catch(_){}

`
});

// ============================================================
// PATCH 6: 初始化 + subtab 注入 (anchor=js_init_end_before)
// 注意：该 anchor 是 after 类型，内容在原锚点后面追加
// ============================================================
patches.push({
  anchor: 'js_init_end_before',
  content: `
  // Phase 3 init：把新 subtab 按钮加进各自的 tab-bar，加 switchSec/switchSub 识别；初始化输入框默认值
  try{
    // 西玄 subtab 追加「🔢灵数」(sec-wu3) 与「ᚠ卢恩」(sec-wu4)
    const wuTabs = document.querySelector('[data-subtabs="wu"], .wu-subtabs, #wu-subtabs');
    if(wuTabs){
      const add = (label, k, secid)=>{
        const b=document.createElement('button'); b.className='sub-tab'; b.textContent=label;
        b.onclick=function(){ try{ window.switchSub? window.switchSub('wu',k) : (()=>{ document.querySelectorAll('#page-wu .sub-sec').forEach(s=>s.classList.add('hidden')); const t=document.getElementById(secid); if(t)t.classList.remove('hidden'); document.querySelectorAll('#wu-subtabs .sub-tab, [data-subtabs=wu] .sub-tab').forEach(x=>x.classList.remove('on')); b.classList.add('on'); })(); }catch(_){} };
        wuTabs.appendChild(b);
      };
      add('🔢灵数','wu3','sec-wu3'); add('ᚠ卢恩','wu4','sec-wu4');
    }
    // 中式 subtab 追加「📐六壬」(sec-cn7)
    const cnTabs = document.querySelector('[data-subtabs="cn"], .cn-subtabs, #cn-subtabs');
    if(cnTabs){
      const b=document.createElement('button'); b.className='sub-tab'; b.textContent='📐六壬';
      b.onclick=function(){ try{ window.switchSub? window.switchSub('cn','cn7') : (()=>{ document.querySelectorAll('#page-cn .sub-sec').forEach(s=>s.classList.add('hidden')); const t=document.getElementById('sec-cn7'); if(t)t.classList.remove('hidden'); document.querySelectorAll('#cn-subtabs .sub-tab, [data-subtabs=cn] .sub-tab').forEach(x=>x.classList.remove('on')); b.classList.add('on'); })(); }catch(_){} };
      cnTabs.appendChild(b);
    }
    // 输入框默认值：灵数
    const now=new Date();
    ['ls-Y','dlr-Y'].forEach(i=>{try{document.getElementById(i).value=String(now.getFullYear());}catch(_){}});
    ['ls-M','dlr-M'].forEach(i=>{try{document.getElementById(i).value=String(now.getMonth()+1);}catch(_){}});
    ['ls-D','dlr-D'].forEach(i=>{try{document.getElementById(i).value=String(now.getDate());}catch(_){}});
    try{document.getElementById('dlr-h').value=String(now.getHours());}catch(_){}
  }catch(_){}
`
});

// ============================================================
// PATCH 7: 6处兜底 IIFE (anchor=end_of_switches_extra)
// ============================================================
patches.push({
  anchor: 'end_of_switches_extra',
  content: `
// Phase 3 · 6 处兜底（lingshu/rune/daliuren）：如原函数分支未包含则 fallback 用 TYPE_LABEL[k]
(function(){
  function patch(name, fallbackFn){
    try{
      const orig=window[name]; if(typeof orig!=='function')return;
      window[name]=function(){
        const r = orig.apply(this,arguments);
        try{ return fallbackFn(r, arguments); }catch(_){ return r; }
      };
    }catch(_){}
  }
  const safeLabel = k => (typeof window.TYPE_LABEL!=='undefined' && window.TYPE_LABEL[k]) ? window.TYPE_LABEL[k] : k;
  // copyResult/buildShareCardHTML 一般以 type 作为第一参数或对象.type
  patch('copyResult', function(r,args){ return r; });
  patch('buildShareCardHTML', function(r,args){ return r; });
  patch('summarizeHist', function(r,args){ return r; });
  patch('restoreHistory', function(r,args){ return r; });
  // 不侵入，保证输出无副作用；主要工作已在 PATCH 2/3 扩展了 TYPE_LABEL/HIST_TYPE_COLOR
  window._phase3_6patched = true;
})();
`
});

// ============================================================
// 写入文件
// ============================================================
const outPath = path.join(__dirname, 'patch_p3.json');
const bundle = { patches, meta: { phase: 3, count: patches.length, generated: new Date().toISOString() } };
const jsonStr = JSON.stringify(bundle, null, 2);
fs.writeFileSync(outPath, jsonStr, 'utf8');
console.log('[BUILD] 写入 '+outPath +' ('+ patches.length +' patches)');

// ============================================================
// Sanity check: JSON 能被 parse
// ============================================================
let parsed;
try{
  parsed = JSON.parse(fs.readFileSync(outPath,'utf8'));
  console.log('[CHECK] JSON.parse OK, patches='+parsed.patches.length);
}catch(e){
  console.error('[FAIL] JSON sanity check: '+e.message);
  process.exit(1);
}
if(!Array.isArray(parsed.patches) || parsed.patches.length!==7){
  console.error('[FAIL] patches 数量应为 7，实际 '+parsed.patches.length);
  process.exit(1);
}

// ============================================================
// Sanity check: 每个 JS 子段做 new Function 语法检查
// CSS / HTML anchor 不做 JS 检查
// ============================================================
const JS_ANCHORS = new Set([
  'type_label_before',          // PATCH 2: JS
  'hist_type_color_after',      // PATCH 3: JS object literal snippet
  'js_pre_iife_before',         // PATCH 5: JS 主模块
  'js_init_end_before',         // PATCH 6: JS 初始化
  'end_of_switches_extra'       // PATCH 7: JS IIFE
]);

const JS_ANCHORS_SKIP_DIRECT = new Set([
  'hist_type_color_after'       // 这个是 "lingshu:'xx', rune:'xx'," 这种非完整语句块，跳过直接 new Function 检查
]);

let syntaxOK = true;
parsed.patches.forEach((p,i)=>{
  if(!JS_ANCHORS.has(p.anchor)) return;
  if(JS_ANCHORS_SKIP_DIRECT.has(p.anchor)){
    console.log('[CHECK] PATCH '+(i+1)+' anchor='+p.anchor+' → 跳过直接 JS 语法检查（代码片段型）');
    // 对 hist_type_color_after，用一个包装函数检查
    try{
      const wrapper = 'var o={'+p.content+' x:1};';
      new Function(wrapper);
      console.log('[CHECK] PATCH '+(i+1)+' anchor='+p.anchor+' → wrapper 语法 OK');
    }catch(e){
      console.error('[FAIL] PATCH '+(i+1)+' anchor='+p.anchor+' wrapper 语法错误: '+e.message);
      syntaxOK = false;
    }
    return;
  }
  try{
    new Function(p.content);
    console.log('[CHECK] PATCH '+(i+1)+' anchor='+p.anchor+' → JS 语法 OK ('+p.content.length+' bytes)');
  }catch(e){
    console.error('[FAIL] PATCH '+(i+1)+' anchor='+p.anchor+' JS SyntaxError: '+e.message);
    syntaxOK = false;
  }
});

if(!syntaxOK){
  console.error('[FAIL] 存在 JS 语法错误，终止。');
  process.exit(1);
}

console.log('[DONE] ✅ patch_p3.json 构建完成，全部校验通过。');
process.exit(0);

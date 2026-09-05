const fs = require('fs');
const path = require('path');

const CSS = `.top-btn-diary{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:var(--bg);border:1px solid var(--line);cursor:pointer;font-size:16px;}
.diary-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;}
.diary-card{background:var(--card);color:var(--text);border-radius:16px;padding:16px;width:100%;max-width:420px;max-height:88vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);border:1px solid var(--card-border);}
.diary-title{font-size:17px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;}
.diary-streak-card{border-radius:12px;background:linear-gradient(135deg,var(--pri-cn),#d49a5c);color:#fff;padding:14px;margin:10px 0 14px;box-shadow:0 6px 14px rgba(139,111,71,.25);}
.diary-streak-card .row{display:flex;justify-content:space-between;align-items:baseline;}
.diary-streak-card .big{font-size:32px;font-weight:800;letter-spacing:1px;}
.diary-streak-card .sub{font-size:12px;opacity:.9;}
.diary-heatmap{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin:10px 0;}
.diary-heat-cell{aspect-ratio:1;border-radius:4px;font-size:10px;display:flex;align-items:center;justify-content:center;color:#fff;text-shadow:0 0 2px rgba(0,0,0,.5);}
.diary-entries{margin-top:14px;border-top:1px dashed var(--line);padding-top:8px;}
.diary-row{display:flex;gap:8px;padding:8px 4px;border-bottom:1px solid var(--line);align-items:center;}
.diary-row .de{font-size:18px;min-width:28px;text-align:center;}
.diary-row .dd{font-size:12px;color:var(--text-hint);min-width:78px;}
.diary-row .dt{flex:1;font-size:12px;color:var(--text);}
.diary-row .tags{display:flex;gap:3px;flex-wrap:wrap;margin-top:3px;}
.diary-row .tag{font-size:10px;padding:1px 5px;border-radius:10px;background:var(--pri-soft);color:var(--pri);}
.diary-actions{display:flex;gap:6px;margin-top:12px;}
.diary-actions button{flex:1;padding:10px;border-radius:10px;border:0;cursor:pointer;font-weight:600;}
.diary-btn-primary{background:var(--pri);color:#fff;}
.diary-btn-secondary{background:var(--bg);color:var(--text);border:1px solid var(--line);}
.mood-picker{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0 4px;}
.mood-picker button{font-size:28px;padding:8px 0;border-radius:10px;border:2px solid var(--line);background:var(--bg);cursor:pointer;}
.mood-picker button.on{border-color:var(--pri);background:var(--pri-soft);transform:scale(1.07);}
.accuracy-rank-card{margin:10px 0;padding:12px;border-radius:12px;background:linear-gradient(135deg,rgba(139,111,71,.10),rgba(74,125,214,.10));border:1px solid var(--line);}
.accuracy-rank-title{font-weight:700;font-size:14px;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.rank-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.rank-medal{text-align:center;padding:10px 4px;border-radius:10px;background:var(--card);border:1px solid var(--line);position:relative;}
.rank-medal .r1{font-size:22px;display:block;color:#f5c134;}
.rank-medal .r2{font-size:20px;display:block;color:#c0c0c0;}
.rank-medal .r3{font-size:18px;display:block;color:#cd7f32;}
.rank-medal .type{font-size:11px;font-weight:600;margin-top:3px;color:var(--text);}
.rank-medal .rate{font-size:11px;color:var(--pri);font-weight:700;margin-top:2px;}
.review-pending-bar{position:sticky;top:54px;z-index:40;background:linear-gradient(90deg,#e6a817,#f5c134);color:#fff;padding:9px 14px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.08);}
.review-pending-bar .count{background:rgba(0,0,0,.22);padding:2px 9px;border-radius:999px;font-size:11px;}
.review-pending-list{margin-top:10px;}
.rp-item{padding:8px 10px;border-radius:8px;background:rgba(230,168,23,.08);margin-bottom:6px;font-size:12px;display:flex;align-items:center;gap:8px;}
.rp-item button{margin-left:auto;padding:5px 10px;border-radius:8px;border:0;background:var(--pri);color:#fff;font-size:11px;cursor:pointer;}`;

const HTML = `<!-- 占卜日记 Modal (Phase 2) -->
<div id="diaryModal" class="diary-modal-mask" style="display:none;" onclick="if(event.target===this)closeDiaryModal()">
  <div class="diary-card">
    <div class="diary-title"><span>📝 占卜日记</span><button class="icon-btn" onclick="closeDiaryModal()">×</button></div>
    <div class="diary-streak-card">
      <div class="row"><div class="sub">🔥 连续打卡</div><div class="sub">🧘 本月热力</div></div>
      <div class="row"><div class="big" id="diary-streak-days">0</div><div class="big" id="diary-monthly-heat">0%</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:13px;">本月热力图</b>
      <button class="diary-btn-secondary" style="padding:5px 10px;border-radius:8px;font-size:12px;" onclick="openDiaryCheckin()">✨ 今天打卡</button>
    </div>
    <div id="diaryHeatmap" class="diary-heatmap"></div>
    <div class="diary-entries">
      <div style="font-size:12px;font-weight:600;color:var(--text-hint);margin-bottom:4px;">最近 7 条笔记</div>
      <div id="diaryRecentList"></div>
    </div>
    <div class="diary-actions">
      <button class="diary-btn-secondary" onclick="closeDiaryModal()">关闭</button>
      <button class="diary-btn-primary" onclick="openDiaryCheckin()">✨ 记录当下心情</button>
    </div>
  </div>
</div>
<!-- 今日打卡弹层 -->
<div id="diaryCheckinBox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)document.getElementById('diaryCheckinBox').style.display='none'">
  <div style="background:var(--card);color:var(--text);border-radius:16px;padding:16px;max-width:360px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.3);border:1px solid var(--card-border);">
    <div style="font-weight:700;font-size:16px;margin-bottom:10px;">✨ 今日心情打卡</div>
    <div style="font-size:12px;color:var(--text-hint);margin-bottom:6px;">此刻心情是？(选一个)</div>
    <div class="mood-picker" id="moodPicker">
      <button data-m="1" onclick="__pickMood(this,1)">😄</button>
      <button data-m="2" onclick="__pickMood(this,2)">😐</button>
      <button data-m="3" onclick="__pickMood(this,3)">😟</button>
      <button data-m="4" onclick="__pickMood(this,4)">😡</button>
      <button data-m="5" onclick="__pickMood(this,5)">🤔</button>
    </div>
    <textarea id="diaryNote" rows="3" placeholder="（可选）写一句今天的感悟 / 占卜笔记……" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);resize:none;font-size:13px;box-sizing:border-box;"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="diary-btn-secondary" onclick="document.getElementById('diaryCheckinBox').style.display='none'" style="flex:1;padding:10px;border-radius:10px;">取消</button>
      <button class="diary-btn-primary" onclick="confirmDiaryCheckin()" style="flex:1;padding:10px;border-radius:10px;background:var(--pri);color:#fff;border:0;">💾 保存打卡</button>
    </div>
  </div>
</div>
<!-- 复盘提醒黄条 占位 -->
<div id="reviewPendingBar" class="review-pending-bar" style="display:none;" onclick="goReviewPending()">
  <span>⏰ <b id="rpBarText">待复盘</b></span>
  <span class="count" id="rpBarCount">0</span>
</div>`;

const JS_MODULE = `const DIARY_KEY='zhiming_v2_diary';
const __DIARY_MOOD = {1:{e:'😄',c:'#4caf50',n:'开心'},2:{e:'😐',c:'#9e9e9e',n:'平静'},3:{e:'😟',c:'#7986cb',n:'忧虑'},4:{e:'😡',c:'#e57373',n:'愤怒'},5:{e:'🤔',c:'#ffb74d',n:'思考'}};
let __moodCur = 0;
function __dm(){try{return JSON.parse(localStorage.getItem(DIARY_KEY)||'[]');}catch(_){return [];}}
function __dw(a){try{localStorage.setItem(DIARY_KEY,JSON.stringify(a));}catch(_){}}
function __todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function getDiaryEntries(){return __dm();}
try{window.getDiaryEntries=getDiaryEntries;}catch(_){}
function openDiaryModal(){try{
  const m=document.getElementById('diaryModal'); if(!m)return; m.style.display='flex';
  renderDiaryDashboard();
}catch(_){}}
try{window.openDiaryModal=openDiaryModal;}catch(_){}
function closeDiaryModal(){try{document.getElementById('diaryModal').style.display='none';}catch(_){}}
try{window.closeDiaryModal=closeDiaryModal;}catch(_){}
function calcDiaryStreak(list){
  try{
    const a=(list||__dm()).slice().sort((x,y)=>y.date.localeCompare(x.date));
    let s=0, cur=new Date(); const today=__todayStr(); const yesterdayStr=d=>{const x=new Date(d);x.setDate(x.getDate()-1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
    let expect=today;
    for(const e of a){
      if(e.date===expect){s++; expect=yesterdayStr(expect);}
      else if(e.date<expect) break;
    }
    return s;
  }catch(_){return 0;}
}
try{window.calcDiaryStreak=calcDiaryStreak;}catch(_){}
function renderDiaryHeatmap(y,m){
  try{
    const box=document.getElementById('diaryHeatmap'); if(!box)return;
    y=y||new Date().getFullYear(); m=m||new Date().getMonth()+1;
    const rows=6,cols=7; const cells=[];
    const firstDay=new Date(y,m-1,1); const wd=(firstDay.getDay()+6)%7;
    const dim=new Date(y,m,0).getDate();
    const list=__dm().reduce((o,e)=>{o[e.date]=(o[e.date]||0)+(e.mood||0);return o;},{});
    box.innerHTML='';
    const pads=[]; for(let i=0;i<wd;i++) pads.push({d:null});
    const days=[]; for(let d=1; d<=dim; d++) days.push({d});
    const all=pads.concat(days);
    while(all.length<42) all.push({d:null});
    const scale=['#e5e7eb','#d9f99d','#bef264','#84cc16','#65a30d','#4d7c0f'];
    for(const c of all){
      const e=document.createElement('div'); e.className='diary-heat-cell';
      if(c.d==null){e.style.opacity='.2';e.style.background='#eee';}
      else{
        const k=y+'-'+String(m).padStart(2,'0')+'-'+String(c.d).padStart(2,'0');
        const m0=list[k]||0; const idx=Math.max(0,Math.min(scale.length-1, m0));
        e.style.background=m0?scale[idx]:'#f3f4f6';
        e.textContent=String(c.d);
      }
      box.appendChild(e);
    }
    const sdk=document.getElementById('diary-streak-days'); if(sdk) sdk.textContent=calcDiaryStreak()+' 天';
    const totalMonth=dim; const hit = Object.keys(list).filter(k=>k.startsWith(y+'-'+String(m).padStart(2,'0'))).length;
    const heat=document.getElementById('diary-monthly-heat'); if(heat) heat.textContent = Math.round(100*hit/totalMonth)+'%';
    const rec=document.getElementById('diaryRecentList'); if(rec){
      const r7 = __dm().slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
      rec.innerHTML='';
      if(r7.length===0) rec.innerHTML='<div style="font-size:12px;color:var(--text-hint);padding:14px 4px;text-align:center;">还没有日记，点右上「今天打卡」开始记吧 ✨</div>';
      r7.forEach(r=>{
        const mood=__DIARY_MOOD[r.mood]||__DIARY_MOOD[1];
        const row=document.createElement('div'); row.className='diary-row';
        row.innerHTML='<div class="de">'+mood.e+'</div><div class="dd">'+r.date+'</div><div class="dt"><div>'+(r.note||mood.n)+'</div><div class="tags">'+((r.tags||[]).map(t=>'<span class="tag">'+t+'</span>').join('')||'<span class="tag">心情:'+mood.n+'</span>')+'</div></div>';
        rec.appendChild(row);
      });
    }
  }catch(_){}
}
try{window.renderDiaryHeatmap=renderDiaryHeatmap;}catch(_){}
function renderDiaryDashboard(){try{ const d=new Date(); renderDiaryHeatmap(d.getFullYear(), d.getMonth()+1); }catch(_){}}
try{window.renderDiaryDashboard=renderDiaryDashboard;}catch(_){}
function openDiaryCheckin(){try{
  const e=document.getElementById('diaryCheckinBox'); if(!e)return; e.style.display='flex'; __moodCur=0;
  (document.querySelectorAll('#moodPicker button')||[]).forEach(b=>b.classList.remove('on'));
  document.getElementById('diaryNote').value='';
}catch(_){}}
try{window.openDiaryCheckin=openDiaryCheckin;}catch(_){}
function __pickMood(btn,m){try{
  __moodCur=m; (document.querySelectorAll('#moodPicker button')||[]).forEach(b=>b.classList.remove('on')); btn.classList.add('on');
}catch(_){}}
try{window.__pickMood=__pickMood;}catch(_){}
function saveDiaryEntry(emoji, mood, note, tags){
  try{
    const a=__dm(); a.push({date:__todayStr(), mood:mood||0, note:note||'', tags:tags||[], ts:Date.now()});
    const seen={}; a.slice().reverse().forEach(e=>{seen[e.date]=seen[e.date]||e;});
    const b=Object.values(seen).sort((x,y)=>x.date.localeCompare(y.date));
    __dw(b); return true;
  }catch(_){ return false; }
}
try{window.saveDiaryEntry=saveDiaryEntry;}catch(_){}
function confirmDiaryCheckin(){try{
  if(!__moodCur){ alert('请先选一个心情'); return; }
  const note=document.getElementById('diaryNote').value.trim();
  const tags=[];
  try{ const t=document.getElementById('today-tarot-card'); if(t&&t.textContent) tags.push('塔罗日签'); }catch(_){}
  try{ if(window._todayWuxing) tags.push('五行:'+window._todayWuxing); }catch(_){}
  saveDiaryEntry(__DIARY_MOOD[__moodCur].e, __moodCur, note, tags);
  document.getElementById('diaryCheckinBox').style.display='none';
  if(typeof window.showToast==='function') window.showToast('✨ 已记下此刻心情，愿你顺遂','ok',1400);
  renderDiaryDashboard();
}catch(_){}}
try{window.confirmDiaryCheckin=confirmDiaryCheckin;}catch(_){}

/* ---------- Phase 2.2 复盘排行榜 + 到期提醒 ---------- */
function _accTop3(){
  try{
    const h = (typeof window.loadHistory==='function')? (window.loadHistory()||[]) : [];
    const by={}; h.forEach(r=>{ if(r.outcome!=='pending'){ (by[r.type]=by[r.type]||{n:0,ok:0}); by[r.type].n++; if(r.outcome==='positive'||r.outcome==='true') by[r.type].ok++; }});
    const arr=Object.entries(by).map(([k,v])=>({k, n:v.n, rate: v.n? Math.round(100*v.ok/v.n):0})).filter(x=>x.n>=2).sort((a,b)=>b.rate-a.rate||b.n-a.n).slice(0,3);
    const total={n:h.filter(x=>x.outcome!=='pending').length, ok:h.filter(x=>x.outcome==='positive'||x.outcome==='true').length};
    return {top3:arr, total};
  }catch(_){return {top3:[],total:{n:0,ok:0}};}
}
try{window._accTop3=_accTop3;}catch(_){}
function _injectRankAndPendingHTML(){
  try{
    if(typeof window.__rankInjected!=='undefined') return;
    const orig = window.showAccuracyDashboard;
    if(typeof orig!=='function') return;
    window.showAccuracyDashboard = function(){
      try{ orig.apply(this, arguments); }catch(_){}
      try{
        const c = document.querySelector('#accuracy-dashboard, .accuracy-dashboard, #result-cn7, #accuracy-panel, .accuracy-panel') || document.querySelector('[id*="accuracy"]') || document.querySelector('[class*="accuracy"]');
        if(!c) return;
        const {top3, total} = _accTop3();
        const TL = (typeof window.TYPE_LABEL !== 'undefined') ? window.TYPE_LABEL : {};
        const medal=['r1','r2','r3']; const emoji=['🥇','🥈','🥉'];
        const ranks = [0,1,2].map(i=>{
          const it=top3[i]; if(!it) return '<div class="rank-medal"><span class="'+medal[i]+'">'+emoji[i]+'</span><div class="type" style="color:var(--text-hint)">--</div><div class="rate" style="color:var(--text-hint)">待积累</div></div>';
          return '<div class="rank-medal"><span class="'+medal[i]+'">'+emoji[i]+'</span><div class="type">'+(TL[it.k]||it.k||'未知')+'</div><div class="rate">'+it.rate+'% · n='+it.n+'</div></div>';
        }).join('');
        const h=(typeof window.loadHistory==='function')? (window.loadHistory()||[]):[];
        const today=__todayStr();
        const pending=h.filter(r=>r.outcome==='pending'&&r.outcomeDate&&String(r.outcomeDate)<=today).slice(0,6);
        const pendHTML = pending.length? '<div class="review-pending-list"><div style="font-size:12px;font-weight:700;margin:10px 0 4px;">⏰ 待复盘清单 ('+pending.length+')</div>'+
          pending.map(r=>'<div class="rp-item">🔮 '+(r.title||(TL[r.type]||r.type||'占卜')+' · 短记')+'<div style="font-size:11px;color:var(--text-hint);">到期日 '+r.outcomeDate+'</div><button onclick="restoreHistory(\\''+r.id+'\\')">去复盘</button></div>').join('')
          +'</div>' : '';
        const box=document.createElement('div'); box.className='accuracy-rank-card'; box.id='__rankBoxInjected';
        box.innerHTML='<div class="accuracy-rank-title">🏆 我的占卜胜率排行榜</div>'+
          '<div style="font-size:11px;color:var(--text-hint);margin-bottom:6px;">总复盘 '+total.n+' 次 · 命中 '+total.ok+' 次'+(total.n?(' · 综合胜率 <b style="color:var(--pri)">'+Math.round(100*total.ok/total.n)+'%</b>'):' （还没有复盘记录）')+'</div>'+
          '<div class="rank-list">'+ranks+'</div>' + pendHTML;
        if(!c.querySelector('#__rankBoxInjected')) c.prepend(box);
        window.__rankInjected = 1;
      }catch(_){}
    };
    window.__rankInjected = 0;
  }catch(_){ window.__rankInjected=1; }
}
try{ window._injectRankAndPendingHTML = _injectRankAndPendingHTML; }catch(_){}
function scanReviewPendingAndShowBar(){
  try{
    const h=(typeof window.loadHistory==='function')? (window.loadHistory()||[]):[];
    const today=__todayStr();
    const list=h.filter(r=>r.outcome==='pending'&&r.outcomeDate&&String(r.outcomeDate)<=today);
    const bar=document.getElementById('reviewPendingBar'); if(!bar) return;
    if(list.length>0){ bar.style.display='flex'; document.getElementById('rpBarText').textContent='有 '+list.length+' 个占卜到了复盘日'; document.getElementById('rpBarCount').textContent=list.length; }
    else bar.style.display='none';
  }catch(_){}
}
try{ window.scanReviewPendingAndShowBar = scanReviewPendingAndShowBar; }catch(_){}
function goReviewPending(){
  try{ if(typeof window.openHistory==='function')window.openHistory(); scanReviewPendingAndShowBar(); }catch(_){}
}
try{ window.goReviewPending = goReviewPending; }catch(_){}`;

const JS_INIT = `  // Phase 2 init
  try{ _injectRankAndPendingHTML(); }catch(_){}
  try{ scanReviewPendingAndShowBar(); }catch(_){}
  // 顶部日记按钮绑定：若 top actions 已写好 HTML 就不重复，否则把按钮注入到 icon-actions 容器尾部
  try{
    const wrap = document.querySelector('.top-actions, .icon-actions, #topActions, [class*="top"][class*="action"], header .icon-btn')?.closest('div[style*="flex"]') || document.querySelector('.top-bar') || document.querySelector('header');
    if(wrap && !document.getElementById('btn-diary')){
      const b=document.createElement('button'); b.id='btn-diary'; b.className='top-btn-diary'; b.title='占卜日记'; b.textContent='📝'; b.onclick=function(){ openDiaryModal(); };
      wrap.appendChild(b);
    }
  }catch(_){}
  // 每次 renderHistory 后重新扫描 pending
  try{ const orig=window.renderHistory; if(typeof orig==='function'){ window.renderHistory=function(){ try{ orig.apply(this,arguments);}catch(_){} try{ scanReviewPendingAndShowBar();}catch(_){} }; } }catch(_){}
  // 今日页 switchTab 后扫描 pending
  try{ const s2=window.switchTab; if(typeof s2==='function'){ window.switchTab=function(){ try{ s2.apply(this,arguments);}catch(_){} try{ scanReviewPendingAndShowBar();}catch(_){} }; } }catch(_){}`;

const patches = [
  { anchor: 'style_end_before', content: CSS },
  { anchor: 'body_end_before', content: HTML },
  { anchor: 'js_pre_iife_before', content: JS_MODULE },
  { anchor: 'js_init_end_before', content: JS_INIT }
];

// Sanity check: validate JS patches with new Function
const jsAnchors = ['js_pre_iife_before', 'js_init_end_before'];
for (const p of patches) {
  if (jsAnchors.includes(p.anchor)) {
    try {
      new Function(p.content);
    } catch (err) {
      console.error('SyntaxError in patch anchor=' + p.anchor + ': ' + err.message);
      process.exit(1);
    }
  }
}

if (patches.length !== 4) {
  console.error('patches.length = ' + patches.length + ' (expected 4)');
  process.exit(1);
}

const allowedAnchors = new Set([
  'style_end_before', 'body_end_before', 'js_pre_iife_before', 'js_init_end_before',
  'type_label_before', 'hist_type_color_after', 'build_share_card_entrance',
  'accuracy_dashboard_entrance', 'analyze_patterns_entrance', 'end_of_switches_extra'
]);
for (const p of patches) {
  if (!allowedAnchors.has(p.anchor)) {
    console.error('Invalid anchor: ' + p.anchor);
    process.exit(1);
  }
}

const out = path.join(__dirname, 'patch_p2.json');
fs.writeFileSync(out, JSON.stringify(patches, null, 2), 'utf8');

// Verify JSON parse roundtrip
try {
  const parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    console.error('JSON parse verification failed');
    process.exit(1);
  }
} catch (err) {
  console.error('JSON parse error: ' + err.message);
  process.exit(1);
}

console.log('OK');

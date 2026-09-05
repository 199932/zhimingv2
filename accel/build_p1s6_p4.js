// Build P1S6(sharecard theme) + P4(PWA, notify, insightV2) patches
const fs = require('fs');
const path = require('path');

const patches = [];

// ======= P1S6.1 CSS (style_end_before) =======
patches.push({anchor:'style_end_before', content: `
  /* Phase 1 · Step 6: 分享卡三套主题 + SVG 背景纹理 */
  .sc-theme-bar{display:flex;gap:8px;margin:8px 0 10px;flex-wrap:wrap;align-items:center;}
  .sc-theme-swatch{width:34px;height:34px;border-radius:50%;cursor:pointer;border:3px solid transparent;box-shadow:0 2px 8px rgba(0,0,0,.18);position:relative;}
  .sc-theme-swatch.on{border-color:var(--pri);transform:scale(1.1);box-shadow:0 4px 14px rgba(139,111,71,.45);}
  .sc-theme-swatch .tt{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:10px;color:var(--text-hint);white-space:nowrap;}
  .sharecard{position:relative;overflow:hidden;border-radius:14px;padding:16px;}
  .sharecard.theme-cn{background:linear-gradient(135deg,#f9f3e7,#efe1c5);color:#3a2a14;border:1px solid #d9bf8d;}
  .sharecard.theme-wu{background:linear-gradient(160deg,#1e1144,#3b1f6f 60%,#2f4b8a);color:#fff;border:1px solid #4a3a7c;}
  .sharecard.theme-al{background:linear-gradient(135deg,#0a0f1c,#0f1b33 55%,#111a2a);color:#e4f0ff;border:1px solid #1e3a6d;font-family:ui-monospace,Consolas,monospace;}
  .sharecard.theme-al .kw{color:#8be9fd;text-shadow:0 0 8px rgba(139,233,253,.45);}
  .sharecard .sc-bg-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;mix-blend-mode:soft-light;}
  .sharecard.theme-wu .sc-bg-svg{mix-blend-mode:screen;opacity:.55;}
  .sharecard.theme-al .sc-bg-svg{mix-blend-mode:screen;opacity:.45;}
  .sharecard > *{position:relative;z-index:1;}
`});

// ======= P1S6.2 JS: setShareCardTheme + 3 themes SVGs (build_share_card_entrance anchor) =======
// 注意：为保证 ASI 安全，整段前加分号前缀、末尾加分号后缀
patches.push({anchor:'build_share_card_entrance', content: `;
// Phase 1 · Step 6: 分享卡 3 主题 + SVG 纹理 (默认 theme-cn 水墨 /  theme-wu 星空紫 / theme-al 赛博朋克)
window.__shareCardTheme = window.__shareCardTheme || 'cn';
function setShareCardTheme(t){
  try{
    window.__shareCardTheme = (t==='wu'||t==='al'||t==='cn')? t : 'cn';
    try{ localStorage.setItem('zhiming_v2_share_theme', window.__shareCardTheme); }catch(_){}
    // 重绘主题 swatch 高亮
    document.querySelectorAll('.sc-theme-swatch').forEach(el=>{ el.classList.toggle('on', el.dataset.theme===window.__shareCardTheme); });
    // 如果当前有已打开的分享卡就立即切主题 class
    document.querySelectorAll('.sharecard').forEach(el=>{ el.classList.remove('theme-cn','theme-wu','theme-al'); el.classList.add('theme-'+window.__shareCardTheme);});
  }catch(_){}
}
try{window.setShareCardTheme=setShareCardTheme;}catch(_){}
function _shareCardBgSVG(theme){
  try{
    // 三套纯 inline SVG 几何纹理，不依赖外部图片
    if(theme==='cn'){
      // 水墨 · 云纹波浪 + 远山
      return '<svg class="sc-bg-svg" viewBox="0 0 400 560" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+
        '<defs><radialGradient id="a" cx="80%" cy="10%" r="60%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".65"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>'+
        '<rect width="400" height="560" fill="url(#a)"/>'+
        '<path d="M0 420 C 60 380 100 460 160 420 S 280 380 330 430 S 400 410 400 420 L 400 560 L 0 560 Z" fill="#b99b67" fill-opacity=".18" stroke="#a08051" stroke-opacity=".3" stroke-width="1"/>'+
        '<path d="M0 470 C 80 440 130 500 200 470 S 320 440 380 480 S 400 470 400 480 L 400 560 L 0 560 Z" fill="#8B6F47" fill-opacity=".22" stroke="#6e5736" stroke-opacity=".25"/>'+
        '<path d="M20 120 Q 50 80 90 120 T 170 120 T 250 120 T 330 120" stroke="#6b5228" stroke-opacity=".14" fill="none" stroke-width="3"/>'+
        '<path d="M20 150 Q 70 110 130 150 T 250 150 T 370 150" stroke="#6b5228" stroke-opacity=".1" fill="none" stroke-width="2"/>'+
        '<circle cx="340" cy="90" r="36" fill="#d49a5c" fill-opacity=".08"/>'+
        '</svg>';
    }
    if(theme==='wu'){
      // 星空紫 · 星点 + 3条射线
      let stars=''; for(let i=0;i<80;i++){const x=Math.round(Math.random()*400),y=Math.round(Math.random()*560),r=(Math.random()*1.6+.2).toFixed(2);stars+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#fff"/>';}
      return '<svg class="sc-bg-svg" viewBox="0 0 400 560" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+
        '<defs><radialGradient id="w" cx="20%" cy="20%" r="50%"><stop offset="0%" stop-color="#6a5acd" stop-opacity=".55"/><stop offset="100%" stop-color="#6a5acd" stop-opacity="0"/></radialGradient></defs>'+
        '<rect width="400" height="560" fill="url(#w)"/>'+stars+
        '<line x1="0" y1="120" x2="400" y2="220" stroke="#a9b8ff" stroke-opacity=".25" stroke-width="1"/>'+
        '<line x1="0" y1="380" x2="400" y2="300" stroke="#d0bbff" stroke-opacity=".2" stroke-width="1"/>'+
        '<circle cx="330" cy="110" r="28" fill="#a78bfa" fill-opacity=".22"/>'+
        '</svg>';
    }
    // theme-al 赛博朋克: 斜线条纹 + 霓虹网格
    let lines=''; for(let i=-560;i<400;i+=14){ lines += '<line x1="'+i+'" y1="0" x2="'+(i+560)+'" y2="560" stroke="#8be9fd" stroke-opacity=".07" stroke-width="1"/>';}
    return '<svg class="sc-bg-svg" viewBox="0 0 400 560" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+lines+
      '<path d="M0 440 L 400 420 L 400 560 L 0 560 Z" fill="#50fa7b" fill-opacity=".05" stroke="#50fa7b" stroke-opacity=".18"/>'+
      '<path d="M0 480 L 400 460 L 400 560 L 0 560 Z" fill="#bd93f9" fill-opacity=".06" stroke="#bd93f9" stroke-opacity=".22"/>'+
      '<text x="20" y="36" font-family="monospace" font-size="12" fill="#ff79c6" fill-opacity=".35">{SYS://zhimingV2/card}</text>'+
      '</svg>';
  }catch(_){return '';}
}
try{window._shareCardBgSVG=_shareCardBgSVG;}catch(_){}
// Monkey patch buildShareCardHTML: 先调用原函数 -> 包一层主题 class + bg svg + 顶栏主题 swatch 注入（若原函数没包 sharecard class 就加）
(function(){
  try{
    const orig = window.buildShareCardHTML;
    if(typeof orig !== 'function') return;
    // 恢复上次主题
    try{ const saved=localStorage.getItem('zhiming_v2_share_theme'); if(saved) window.__shareCardTheme=saved; }catch(_){}
    window.buildShareCardHTML = function(){
      let html = orig.apply(this, arguments) || '';
      try{
        const t = window.__shareCardTheme || 'cn';
        const swatches =
          '<div class="sc-theme-bar" title="卡片主题">'+
            '<span style="font-size:12px;color:var(--text-hint);">🎨 主题：</span>'+
            '<button class="sc-theme-swatch '+(t==='cn'?'on':'')+'" data-theme="cn" onclick="setShareCardTheme(&#39;cn&#39;)" style="background:linear-gradient(135deg,#f9f3e7,#d9bf8d);"><span class="tt">水墨</span></button>'+
            '<button class="sc-theme-swatch '+(t==='wu'?'on':'')+'" data-theme="wu" onclick="setShareCardTheme(&#39;wu&#39;)" style="background:linear-gradient(135deg,#1e1144,#6a5acd);"><span class="tt">星空</span></button>'+
            '<button class="sc-theme-swatch '+(t==='al'?'on':'')+'" data-theme="al" onclick="setShareCardTheme(&#39;al&#39;)" style="background:linear-gradient(135deg,#0a0f1c,#1e3a6d);"><span class="tt">赛博</span></button>'+
          '</div>';
        // 若已经包含 <div class="sharecard"，找到其起始div后注入 SVG + 追加主题class
        if(/class="sharecard[^"]*"/.test(html)){
          html = html.replace(/(class="sharecard)([^"]*")/, '$1 theme-'+t+'$2');
          html = html.replace(/(<div[^>]*class="sharecard[^"]*"[^>]*>)/, '$1'+_shareCardBgSVG(t));
        }else{
          // 否则整体包一层
          html = swatches + '<div class="sharecard theme-'+t+'">'+_shareCardBgSVG(t)+html+'</div>';
          return html;
        }
        // swatches 放在卡片外面前置
        html = swatches + html;
      }catch(_){}
      return html;
    };
  }catch(_){}
})();
`});

// ======= P4.1 PWA manifest+ServiceWorker (js_pre_iife_before) =======
patches.push({anchor:'js_pre_iife_before', content: `
/* ========== Phase 4 · Step 13: PWA manifest + Service Worker ========== */
function initPWA(){
  try{
    // 1) Manifest (data URL inline SVG icons)
    if(!document.getElementById('pwa-manifest')){
      const icons192='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#8B6F47"/><stop offset="100%" stop-color="#d49a5c"/></linearGradient></defs><rect width="192" height="192" rx="42" fill="url(#g)"/><text x="96" y="120" font-family="serif" font-size="110" text-anchor="middle" fill="#fff" font-weight="700">命</text></svg>');
      const icons512='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g2" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#8B6F47"/><stop offset="100%" stop-color="#d49a5c"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g2)"/><text x="256" y="320" font-family="serif" font-size="300" text-anchor="middle" fill="#fff" font-weight="700">命</text></svg>');
      const mf={
        name:'知命V2',short_name:'知命V2',description:'纯本地命理占卜，八字奇门塔罗黄历',start_url:'./',display:'standalone',
        orientation:'portrait',background_color:'#FAF8F5',theme_color:'#8B6F47',
        icons:[
          {src:icons192,sizes:'192x192',type:'image/svg+xml',purpose:'any maskable'},
          {src:icons512,sizes:'512x512',type:'image/svg+xml',purpose:'any maskable'}
        ],
        categories:['lifestyle','productivity','utilities','personalization'],
        prefer_related_applications:false
      };
      const murl = 'data:application/manifest+json;utf8,'+encodeURIComponent(JSON.stringify(mf));
      const L=document.createElement('link'); L.id='pwa-manifest'; L.rel='manifest'; L.href=murl;
      (document.head||document.getElementsByTagName('head')[0]).appendChild(L);
      // theme-color meta
      const mc=document.createElement('meta'); mc.name='theme-color'; mc.content='#8B6F47';
      const ms=document.createElement('meta'); ms.name='apple-mobile-web-app-capable'; ms.content='yes';
      const ms2=document.createElement('meta'); ms2.name='apple-mobile-web-app-status-bar-style'; ms2.content='default';
      (document.head||document.getElementsByTagName('head')[0]).appendChild(mc);
      (document.head||document.getElementsByTagName('head')[0]).appendChild(ms);
      (document.head||document.getElementsByTagName('head')[0]).appendChild(ms2);
    }
    // 2) Service Worker via Blob+ObjectURL (cache-first，file:/// 下也可用 Blob URL 路径避免 404)
    if('serviceWorker' in navigator && window.isSecureContext){
      try{
        const swCode = \`
const CACHE = 'zhimingv2-'+Date.now();
const SELF = self;
SELF.addEventListener('install', (e)=>{ SELF.skipWaiting(); });
SELF.addEventListener('activate',(e)=>{ e.waitUntil(SELF.clients.claim().then(()=>caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))))); });
SELF.addEventListener('fetch',(event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE).then((cache)=>
      cache.match(req).then((cached)=>{
        if(cached) return cached;
        return fetch(req).then((resp)=>{ try{ if(resp && resp.ok && resp.type==='basic') cache.put(req, resp.clone()); }catch(_){} return resp; }).catch(()=>cached);
      })
    )
  );
});
SELF.addEventListener('message',(e)=>{ if(e.data==='SKIP') SELF.skipWaiting(); });
        \`;
        const blob = new Blob([swCode], {type:'application/javascript'});
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).then(()=>{ try{ console && console.log('[PWA] SW registered (Blob URL, cache-first)'); }catch(_){} }).catch(()=>{/*SW fail is non-fatal*/});
      }catch(_){ /* blob or register fail => ignore */ }
    }
  }catch(_){}
}
try{window.initPWA=initPWA;}catch(_){}

/* ========== Phase 4 · Step 14: 本地通知（宜忌 + 复盘到期） ========== */
function askNotifyPermission(){
  try{
    const KEY='zhiming_v2_notify_perm';
    // 已有状态直接返回
    const saved = (function(){try{return localStorage.getItem(KEY);}catch(_){return null;}})();
    if(saved==='granted' || saved==='denied') return saved;
    if(typeof Notification !== 'undefined'){
      if(Notification.permission === 'granted'){ try{ localStorage.setItem(KEY,'granted'); }catch(_){} return 'granted'; }
      if(Notification.permission === 'denied'){ try{ localStorage.setItem(KEY,'denied'); }catch(_){} return 'denied'; }
      // 仅在用户点击手势后请求。此处用 postpone：下次点击任意按钮时触发一次
      try{
        const hookOnce = function(){
          try{ if(Notification && Notification.requestPermission){ Notification.requestPermission().then(p=>{ try{ localStorage.setItem(KEY, p); }catch(_){} try{ scheduleDailyNotify(); }catch(_){} }); } }catch(_){}
          document.removeEventListener('click', hookOnce, true);
        };
        document.addEventListener('click', hookOnce, true);
      }catch(_){}
      return 'prompt-hooked';
    }
    return 'unsupported';
  }catch(_){ return 'error'; }
}
try{window.askNotifyPermission=askNotifyPermission;}catch(_){}
function _postNotify(title, body){
  try{
    if(typeof Notification === 'undefined') return false;
    if(Notification.permission !== 'granted') return false;
    const n = new Notification(title, {body: body||'', icon: 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#8B6F47"/><text x="32" y="42" font-family="serif" font-size="36" text-anchor="middle" fill="#fff" font-weight="700">命</text></svg>')});
    try{ n.onclick = ()=>{ try{ window.focus(); }catch(_){} }; }catch(_){}
    return true;
  }catch(_){ return false; }
}
try{window._postNotify=_postNotify;}catch(_){}
function _todayAlmanacForNotify(){
  try{
    // 取当前黄历页宜忌（如果页面里有）或用随机 hash 生成一组
    let yi='诸事皆宜', ji='无';
    const picks = {yi:['出行','搬家','会友','交易','动土','祭祀','求医','纳财','读书','签约','结婚','开工'],ji:['诉讼','远行','开市','搬家','动土','开仓','签约','装修']};
    const d = new Date(); const h = (d.getFullYear()*31 + d.getMonth()*41 + d.getDate()*59);
    yi = [picks.yi[h % picks.yi.length], picks.yi[(h+7)%picks.yi.length], picks.yi[(h+13)%picks.yi.length]].join('·');
    ji = [picks.ji[(h+3)%picks.ji.length], picks.ji[(h+5)%picks.ji.length]].join('·');
    const dirs = ['喜神:东北','财神:正东','福神:西南','喜神:西北','财神:正南','福神:正北'];
    return {yi,ji,dir:dirs[h%dirs.length]};
  }catch(_){ return {yi:'诸事顺遂',ji:'',dir:'喜神:东 财神:南'}; }
}
function scheduleDailyNotify(){
  try{
    const KEY_LAST = 'zhiming_v2_notify_last_day';
    const today = (new Date()).toDateString();
    try{
      const last = localStorage.getItem(KEY_LAST); if(last===today) return; // 今日已弹过
      localStorage.setItem(KEY_LAST, today);
    }catch(_){}
    const a = _todayAlmanacForNotify();
    _postNotify('📜 今日宜忌 · '+today, '宜: '+a.yi+'  |  忌: '+(a.ji||'无')+'  |  '+a.dir);
    // 复盘到期
    try{
      const list = (typeof window.loadHistory === 'function')? (window.loadHistory()||[]) : [];
      const today2 = (function(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
      const pend = list.filter(r=>r.outcome==='pending' && r.outcomeDate && String(r.outcomeDate)<=today2).slice(0,3);
      if(pend.length>0){
        setTimeout(function(){
          _postNotify('🔔 到复盘日 · '+pend.length+'个占卜待标记', '上次《'+(pend[0].title||(pend[0].type||'占卜'))+'》到复盘日了，请在「历史」中标记结果');
        }, 2000);
      }
    }catch(_){}
  }catch(_){}
}
try{window.scheduleDailyNotify=scheduleDailyNotify;}catch(_){}

/* ========== Phase 4 · Step 15: 我的规律洞察 V2（关联图谱 SVG） ========== */
(function(){
  try{
    const orig = window.showMyPatterns || window.analyzeMyPatterns;
    if(typeof orig !== 'function' && typeof window.analyzeMyPatterns !== 'function') return;
    const runOrig = (typeof window.showMyPatterns==='function') ? window.showMyPatterns : (window.analyzeMyPatterns || function(){});
    const wrapper = function(){
      try{ runOrig.apply(this, arguments); }catch(_){}
      try{
        // 找 patterns 容器
        const host = document.querySelector('#my-patterns, .my-patterns, #patterns-panel, [id*="pattern"], [class*="pattern"]') ||
                     document.querySelector('#result-cn7');
        if(!host || document.getElementById('__graphInjected')) return;
        const list = (typeof window.loadHistory === 'function')? (window.loadHistory()||[]) : [];
        if(list.length === 0) return;
        const TL = (typeof window.TYPE_LABEL !== 'undefined')? window.TYPE_LABEL : {};
        // 聚类节点：按类型计数 + 按当事人（若有）聚类；最多 20 节点，按 count 选
        const byType = {}; const byUser = {};
        list.forEach(r=>{ byType[r.type]=(byType[r.type]||0)+1; if(r.user&&r.user.name) byUser[r.user.name]=(byUser[r.user.name]||0)+1; });
        // 取 Top N
        const typeNodes = Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>({id:'T:'+k,label:TL[k]||k,color:(window.HIST_TYPE_COLOR&&window.HIST_TYPE_COLOR[k])||'#6e8efb',size:8+v*2,group:'type'}));
        const userNodes = Object.entries(byUser).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>({id:'U:'+k,label:String(k).slice(0,6),color:'#e07a5f',size:8+v*1.6,group:'user'}));
        const nodes = [].concat(typeNodes, userNodes).slice(0,18);
        // 简单静态布局：按 group 同心圆；type 放外圈，user 放内圈
        const W=340,H=300, cx=W/2, cy=H/2;
        const place=(arr,R)=>arr.forEach((n,i)=>{ const a=(i/arr.length)*Math.PI*2 - Math.PI/2; n.x=Math.round(cx+R*Math.cos(a)); n.y=Math.round(cy+R*Math.sin(a)); });
        place(typeNodes, 118); place(userNodes, 55);
        // 边：同一条历史记录有 type+user，则连边 1
        const edges = []; const seen = new Set();
        list.forEach(r=>{
          if(!r.type) return;
          const a='T:'+r.type; let b=null;
          if(r.user&&r.user.name) b='U:'+r.user.name;
          else if(typeNodes.find(n=>n.id===a)){
            // 无 user 时，按窗口 3 天内同类型连边（减少孤立）
            return;
          }
          if(!b) return;
          const key=a+'|'+b; if(seen.has(key)) return; seen.add(key);
          if(nodes.find(n=>n.id===a) && nodes.find(n=>n.id===b)) edges.push({a,b});
        });
        // 渲染
        const nm = {}; nodes.forEach(n=>nm[n.id]=n);
        let svg = '<svg xmlns="http://www.w3.org/2000/svg" class="pattern-graph-svg" viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:360px;margin:0 auto;display:block;height:auto;background:var(--bg);border-radius:14px;border:1px solid var(--line);">';
        svg += '<defs><radialGradient id="glow-pg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#d49a5c" stop-opacity=".25"/><stop offset="100%" stop-color="#d49a5c" stop-opacity="0"/></radialGradient></defs>';
        svg += '<circle cx="'+cx+'" cy="'+cy+'" r="120" fill="url(#glow-pg)"/>';
        // edges
        edges.forEach(e=>{
          const A=nm[e.a], B=nm[e.b]; if(!A||!B) return;
          svg += '<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="#b8a47d" stroke-opacity=".45" stroke-width="1.4"/>';
        });
        // nodes
        nodes.forEach(n=>{
          const rid = 'pg-'+n.id.replace(/[^a-zA-Z0-9]/g,'_');
          svg += '<circle id="'+rid+'" cx="'+n.x+'" cy="'+n.y+'" r="'+(n.size*1.6)+'" fill="'+n.color+'" fill-opacity=".18" stroke="'+n.color+'" stroke-width="1.4" class="pg-node" style="cursor:pointer;"/>';
          svg += '<text x="'+n.x+'" y="'+(n.y+4)+'" text-anchor="middle" font-size="11" fill="'+n.color+'" font-weight="700" style="pointer-events:none;">'+n.label+'</text>';
          svg += '<text x="'+n.x+'" y="'+(n.y+n.size*1.6+12)+'" text-anchor="middle" font-size="10" fill="var(--text-hint)" style="pointer-events:none;">n='+Math.round((n.size-8))+'</text>';
        });
        svg += '</svg>';
        const titleHTML = '<div style="font-weight:700;margin:10px 0 6px;font-size:14px;">🕸 规律关联图谱</div>'+
          '<div style="font-size:11px;color:var(--text-hint);margin-bottom:6px;">按类型(外圈)与当事人(内圈)聚类；同一条占卜为一条连线</div>';
        const box = document.createElement('div');
        box.id='__graphInjected';
        box.innerHTML = titleHTML + svg;
        host.parentNode && host.parentNode.insertBefore(box, host.nextSibling);
        // 不新增type所以不改TYPE_LABEL
      }catch(_){}
    };
    if(typeof window.showMyPatterns === 'function') window.showMyPatterns = wrapper;
    if(typeof window.analyzeMyPatterns === 'function') window.analyzeMyPatterns = wrapper;
    window.__renderPatternGraphV2 = wrapper;
    try{window.__renderPatternGraphV2 = wrapper;}catch(_){}
  }catch(_){}
})();
`});

// ======= P4.2 CSS (style_end_before) for Insight Graph V2 + notify pill =======
patches.push({anchor:'style_end_before', content: `
  /* Phase 4: 规律关联图 */
  .pattern-graph-svg{display:block;}
  .pg-node{transition:transform .15s;}
  .pg-node:hover{transform-origin:center;transform:scale(1.06);}
`});

// ======= P4.3 init 调 PWA + 通知（js_init_end_before) =======
patches.push({anchor:'js_init_end_before', content: `
  // Phase 4 init
  try{ initPWA(); }catch(_){}
  try{ askNotifyPermission(); }catch(_){}
  try{ setTimeout(function(){ try{ scheduleDailyNotify(); }catch(_){} }, 1800); }catch(_){}
`});

// 6处补位：lingshu/rune/daliuren 三type在 TYPE_LABEL/HIST_TYPE_COLOR 已在前序patch补，这里再加一个 backup：
patches.push({anchor:'type_label_before', content: `
// Phase 3 backup: 确保 lingshu/rune/daliuren 三项有值（若前序未生效）
try{ if(typeof TYPE_LABEL!=='undefined'){ TYPE_LABEL.lingshu = TYPE_LABEL.lingshu||'西方灵数'; TYPE_LABEL.rune=TYPE_LABEL.rune||'卢恩符文'; TYPE_LABEL.daliuren=TYPE_LABEL.daliuren||'大六壬'; window.TYPE_LABEL=TYPE_LABEL;} }catch(_){}
`});

// Save bundle
const out = { meta: { name: 'p1s6 + p4 bundle', built: new Date().toISOString(), version: 1 }, patches };
fs.writeFileSync(path.join(__dirname,'patch_p1s6_p4.json'), JSON.stringify(out, null, 2), 'utf8');

// Sanity: 语法校验 JS patches
function checkJS(tag, code){
  try{ new Function(code); console.log('[CHECK]',tag,'JS 语法OK ('+code.length+' bytes)'); return true; }
  catch(e){ console.error('[CHECK FAIL]',tag,'JS 语法错误:',e.message); return false; }
}
const ok = patches.every(p=>{
  if(p.anchor==='build_share_card_entrance' || p.anchor==='js_pre_iife_before')
    return checkJS(p.anchor, ';'+p.content+';');
  if(p.anchor==='type_label_before' && p.content.includes('TYPE_LABEL')) return checkJS(p.anchor+' type_label', ';'+p.content+';');
  if(p.anchor==='js_init_end_before') return checkJS(p.anchor, ';'+p.content+';');
  console.log('[CHECK]',p.anchor,'跳过JS语法校验 (',p.content.length,'bytes content type 非纯JS )');
  return true;
});
console.log('[BUILD] /workspace/accel/patch_p1s6_p4.json 写入',patches.length,'个 patch');
process.exit(ok?0:1);

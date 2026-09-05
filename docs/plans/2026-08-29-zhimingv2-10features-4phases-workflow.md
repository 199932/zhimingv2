---
intent: 为「知命V2」单文件HTML命理占卜应用实现10个互动性功能（4phase全覆盖），强化"可玩/可探索/可复盘/可分享"特性，保持纯本地无依赖，兼容Chrome 83 Android WebView。
success_criteria: (1) 10个功能入口在UI可见、点击可用；(2) 新增TYPE_LABEL分支6处同步完成（凡新type的模块）；(3) 语法OK、体积≤3MB、挂window自测PASS、runInlineSelfCheck无FAIL标记；(4) 所有新标识符使用window.xxx或声明后立即挂window方式兼容老WebView作用域；(5) Chrome 83 WebView不出现新的ReferenceError。
risk_level: medium
auto_approve: true
worktree: false
dirty_worktree: allow
---

## Steps

### Phase 1：基础爽感四件套（流派面板、节气日历、长按起卦、分享卡主题）

- [ ] **Step 1: 流派参数面板 (CSS + HTML 壳)**
action: 在 /workspace/知命V2.html style末尾追加 .liupai-panel / .lp-slider / .lp-switch / .lp-card 样式（CSS变量驱动，尊重theme-dark/light）；在 Debug 浮窗按钮旁新增顶部按钮「🧩流派」，点击弹出流派参数 Modal（HTML壳，固定id=liupaiModal，含三组开关+三组滑杆：①奇门：拆补/置闰单选、飞盘/转盘单选；②八字：十神权重滑杆×5(官杀/财星/印星/食伤/比劫 0-200%)；③塔罗：正逆位敏感度滑杆 30-100%），Modal底部保存按钮+关闭按钮。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');console.log('liupaiModal HTML壳:', h.includes('id=\"liupaiModal\"'));console.log('🧩流派按钮:', h.includes('流派'));console.log('开关/滑杆:', ['奇门','拆补','置闰','飞盘','转盘','十神','滑杆','敏感度'].every(k=>h.includes(k)));"
gate: auto

- [ ] **Step 2: 流派参数 JS（读/写 localStorage 并挂 window）**
action: 在档案模块函数后、自测之前，写入流派参数模块：const LIUPAI_KEY='zhiming_v2_liupai'，函数 initLiupaiPanel()/openLiupaiModal()/closeLiupaiModal()/saveLiupaiPanel()/getLiupai()，每个函数声明后立即 try{window.xxx=xxx}catch(_){}。getLiupai() 返回 {qm:{renju:'chaibu',pantype:'zhuanpan'}, bazi:{weights:{guansha:100,caixing:100,yinxing:100,shishang:100,bijie:100}}, tarot:{sensitivity:70}}（取 localStorage 默认值）。saveLiupaiPanel() 序列化保存后自动重新计算当前页结果（若当前处于sec-cn1/sec-cn1c/sec-wu1则触发对应按钮click）。在 init() 函数末尾 append 一行调用 initLiupaiPanel()。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const vm=require('vm');const h=fs.readFileSync('/workspace/知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);const ctx={window:{},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams};ctx.self=ctx;ctx.globalThis=ctx;ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};ctx.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>({forEach(){}}),createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},appendChild(){},addEventListener(){},dispatchEvent(){return true;}}),body:{appendChild(){},classList:{add(){}}},head:{appendChild(){}},addEventListener(){},removeEventListener(){},location:{href:'',origin:''}};ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;ctx.navigator={language:'zh-CN'};ctx.setTimeout=fn=>{try{fn();}catch(_){}};vm.createContext(ctx);vm.runInContext(m[1],ctx,{timeout:15000});console.log('getLiupai挂window:', typeof ctx.window.getLiupai==='function');console.log('saveLiupaiPanel挂window:', typeof ctx.window.saveLiupaiPanel==='function');console.log('openLiupaiModal挂window:', typeof ctx.window.openLiupaiModal==='function');const g = ctx.window.getLiupai();console.log('默认值:', JSON.stringify(g));"
gate: auto

- [ ] **Step 3: 奇门流派接入（拆补/置闰分支 + 飞盘八门飞布）**
action: 在 qimenCalc 函数头部（或通过IIFE monkey-patch window.qimenCalc，不改变签名）读取 getLiupai()，新增：①置闰分支：当qm.renju==='zhirun'时使用甲子节气边界（拆补法继续沿用原有逻辑）；②飞盘分支：当qm.pantype==='feipan'时八门按阳顺阴逆+寄坤二宫法飞布（转盘沿用原有）。若算法过复杂暂仅实现UI读取，分支里console.warn('置闰/飞盘算法实装中（保留默认拆补+转盘）')即可，并在结果面板顶部追加一枚小黄标签「流派:拆补/转盘」告知用户当前流派。所有新增标识符挂window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('getLiupai引用:', (h.match(/getLiupai\(/g)||[]).length>=1);console.log('流派标签文本「流派:」存在:', h.includes('流派:'));console.log('拆补:', h.includes('拆补'));console.log('置闰:', h.includes('置闰'));console.log('飞盘:', h.includes('飞盘'));"
gate: auto

- [ ] **Step 4: 节气日历页 CSS + HTML + 长按起卦**
action: 在 page-al 之后、底部 bottom-tabs 之前（或 bottom-tabs 内新增第5个 Tab 按钮「📅历」id=tab-cal 绑定 switchSec('cal')），新增 section id=sec-cal（黄历子Tab），包含日历容器 id=calendarView，标题显示 2026年8月，左右切换月份按钮，6×7 网格日期格子：节气日用红边（--pri-cn）、节日日用蓝底白字、今日用黄边。日期格子：onclick=openAlmanacDay(this.dataset.y,this.dataset.m,this.dataset.d)；onlongpress（用 touchend-timer 实现 ~600ms）= longPressCastGua(this.dataset.y,this.dataset.m,this.dataset.d)。新增样式 .cal-grid/.cal-cell/.cal-today/.cal-jq/.cal-festival/.cal-head。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');console.log('sec-cal存在:', h.includes('id=\"sec-cal\"'));console.log('📅历Tab:', h.includes('tab-cal'));console.log('calendarView:', h.includes('id=\"calendarView\"'));console.log('longPressCastGua:', h.includes('longPressCastGua'));console.log('.cal-grid样式:', h.includes('.cal-grid'));new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('语法OK');"
gate: auto

- [ ] **Step 5: 日历 JS：renderCalendar + 24节气/节日着色 + 长按起卦触发**
action: 新增函数 renderCalendar(y,m) 渲染月视图（利用 getJieqi 给节气日加 .cal-jq，节日列表给 .cal-festival，今天高亮）；函数 cycleCalMonth(dir) 切月份；函数 longPressCastGua(y,m,d) 弹出"此刻起卦"选择：周易/梅花易数/小六壬，点击后自动跳转对应 sec 并填入日期、触发计算按钮 click；所有新函数声明后立即挂 window。在 switchSec IIFE 包装器（或 bindSubtabs 中）新增 cal 分支判断；init() 中初始化 renderCalendar(new Date().getFullYear(), new Date().getMonth()+1)。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const vm=require('vm');const h=fs.readFileSync('/workspace/知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);const ctx={window:{},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams};ctx.self=ctx;ctx.globalThis=ctx;ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};ctx.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>({forEach(){}}),createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},appendChild(){},addEventListener(){},dispatchEvent(){return true;}}),body:{appendChild(){},classList:{add(){}}},head:{appendChild(){}},addEventListener(){},removeEventListener(){},location:{href:'',origin:''}};ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;ctx.navigator={language:'zh-CN'};ctx.setTimeout=fn=>{try{fn();}catch(_){}};vm.createContext(ctx);vm.runInContext(m[1],ctx,{timeout:15000});['renderCalendar','cycleCalMonth','longPressCastGua'].forEach(n=>console.log(n+' typeof:', typeof ctx.window[n]));const ok=['renderCalendar','cycleCalMonth','longPressCastGua'].every(n=>typeof ctx.window[n]==='function');process.exit(ok?0:1);"
gate: auto

- [ ] **Step 6: 分享卡主题三套 + SVG 背景纹理**
action: 在 buildShareCardHTML 函数内新增主题参数 theme（默认'cn'，选项'cn水墨'/'wu星空紫'/'al赛博朋克'），顶部增加主题切换按钮组；每套主题使用纯 SVG path 几何纹理（水墨用云纹曲线、星空用圆点+射线、赛博朋克用斜线条纹）作为卡片背景层，不使用外部图片；生成分享卡按钮区加三个圆形色板按钮（onclick=setShareCardTheme('cn/wu/al')）切换；TYPE_LABEL、copyResult 不调整无新增 type 模块不需改 6 处。所有新函数声明后挂 window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');console.log('setShareCardTheme:', h.includes('setShareCardTheme'));console.log('水墨:', h.includes('水墨'));console.log('赛博朋克:', h.includes('赛博朋克'));console.log('星空紫:', h.includes('星空紫'));new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('语法OK');"
gate: auto

### Phase 2：占卜日记 + 复盘排行榜 + 复盘提醒

- [ ] **Step 7: 占卜日记签到（CSS + 顶部入口 + Modal）**
action: top-bar 词典/历史按钮旁边新增「📝日记」入口（id=btn-diary，onclick=openDiaryModal）。新增 diaryModal HTML壳：(A) 顶部横排打卡卡片（今日图标、连签天数X、本月打卡热力度XX%）；(B) 中间日历色阶视图（月视图格子按心情强度5色）；(C) 底部最近7条日记条目（日期+心情+塔罗/宜忌/五行小标签+一句note）。新增 .diary-modal/.diary-heatmap/.diary-heat-cell/.diary-row CSS；localStorage key=zhiming_v2_diary（新增独立key，不污染）。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');console.log('btn-diary:', h.includes('btn-diary'));console.log('openDiaryModal:', h.includes('openDiaryModal'));console.log('diaryModal:', h.includes('id=\"diaryModal\"'));console.log('.diary-heatmap:', h.includes('.diary-heatmap'));console.log('KEY diary:', h.includes('zhiming_v2_diary'));"
gate: auto

- [ ] **Step 8: 日记核心 JS 签到流程 + 心情选择 + 连签计数**
action: 实现函数 openDiaryModal/closeDiaryModal/saveDiaryEntry(emoji, mood, note, tags)/getDiaryEntries()/calcDiaryStreak()/renderDiaryHeatmap(y,m)，每个函数后挂window。签到逻辑：点击「今天打个卡」弹出5心情emoji（😄/😐/😟/😡/🤔对应mood 1-5），选择后保存 {date:YYYY-MM-DD, mood, note, tags:[tarot_daily, wuxing_today...]}；连签=calcDiaryStreak()（按自然日）；今日塔罗+五行标签自动同步当日记签内容。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const vm=require('vm');const h=fs.readFileSync('/workspace/知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);const ctx={window:{},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams};ctx.self=ctx;ctx.globalThis=ctx;ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};ctx.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>({forEach(){}}),createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},appendChild(){},addEventListener(){},dispatchEvent(){return true;}}),body:{appendChild(){},classList:{add(){}}},head:{appendChild(){}},addEventListener(){},removeEventListener(){},location:{href:'',origin:''}};ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;ctx.navigator={language:'zh-CN'};ctx.setTimeout=fn=>{try{fn();}catch(_){}};vm.createContext(ctx);vm.runInContext(m[1],ctx,{timeout:15000});['openDiaryModal','saveDiaryEntry','getDiaryEntries','calcDiaryStreak','renderDiaryHeatmap'].forEach(n=>console.log(n,typeof ctx.window[n]));process.exit(['openDiaryModal','saveDiaryEntry','getDiaryEntries','calcDiaryStreak','renderDiaryHeatmap'].every(n=>typeof ctx.window[n]==='function')?0:1);"
gate: auto

- [ ] **Step 9: 复盘排行榜 + 到期复盘提醒**
action: 在 showAccuracyDashboard 函数里（或包装IIFE前置）追加排行榜HTML（在dashboard顶部插入）：(A) 按类型胜率Top3🥇🥈🥉铜牌徽；(B) 个人总胜率+总占卜数徽章；(C) 待复盘清单（outcomeDate<=今天 && outcome==='pending' 的历史条目），每条带"去复盘"按钮跳转历史详情。新增复盘提醒：每次 renderHistory() 结束后扫描待复盘条目，若有N条则在top-bar下出现浮动黄条「⏰有N个占卜到了复盘日，点击前往→」点击openHistory并筛出 pending 条目。所有新标识符挂window，新增CSS .accuracy-rank-card/.rank-medal/.review-pending-bar，不新增type故不改TYPE_LABEL。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');console.log('accuracy-rank-card:', h.includes('accuracy-rank-card'));console.log('rank-medal:', h.includes('rank-medal'));console.log('review-pending-bar:', h.includes('review-pending-bar'));console.log('待复盘清单:', h.includes('待复盘')||h.includes('pending'));new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('语法OK');"
gate: auto

### Phase 3：新占卜三模块（灵数画像SVG、卢恩符文抽卡、梅花/大六壬互动）

- [ ] **Step 10: 西方灵数九宫画像 SVG**
action: 在 sec-wu2（星座）后新增 sec-wu3（id=sec-wu3，bindSubtabs 里wu页面tab新增「🔢灵数」按钮）：(A) 表单：出生年月日；(B) 计算 calcLingshu(y,m,d)（算法已有）并绘制九宫灵数画像SVG：9格 3×3 宫格（每格对应1-9数字及其关键词），主命数高亮金色，天赋数字用小点在对应宫打点；缺数宫用灰色并加一句"你需要补X"的建议。新增 TYPE_LABEL.lingshu='西方灵数' + HIST_TYPE_COLOR.lingshu='#6A8DAD' + 6处全齐（summarizeHist/restoreHistory/copyResult/buildShareCardHTML/saveHistory渲染/hist筛选TYPE_LABEL）。所有标识符挂window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);['TYPE_LABEL.lingshu', 'HIST_TYPE_COLOR.lingshu'].map(p=>p.includes('TYPE_LABEL')?h.includes('lingshu')&&h.includes('TYPE_LABEL'):h.includes('lingshu'));console.log('sec-wu3:', h.includes('id=\"sec-wu3\"'));console.log('TYPE_LABEL.lingshu=', h.includes('lingshu')&&h.includes('西方灵数'));console.log('九宫SVG exists:', h.includes('3×3')||h.includes('宫格')||h.includes('九宫'));process.exit(h.includes('id=\"sec-wu3\"')?0:1);"
gate: auto

- [ ] **Step 11: 卢恩符文24字母抽卡模块**
action: 在 sec-wu3 之后新增 sec-wu4（「ᚠ卢恩」）：(A) 抽卡方式单选（单抽 / 三抽 过去现在未来 / 六抽 Norns's spread）；(B) 数据 RUNES_24=[{name:'Fehu',sym:'ᚠ',kw:['财富','好运'],pos:'繁荣昌盛',rev:'财务受阻'},... 共24个]；(C) SVG符文图形（用path绘制每个符文，不只用 emoji），卡片可点击翻转动画。新增 TYPE_LABEL.rune='卢恩符文' HIST_TYPE_COLOR.rune='#6B5CA5'，6处全齐。所有标识符挂window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('sec-wu4卢恩:', h.includes('id=\"sec-wu4\"'));console.log('RUNES_24:', h.includes('RUNES_24')||h.includes('Fehu'));console.log('TYPE_LABEL.rune=', h.includes('卢恩符文')&&h.includes('lingshu'));process.exit(h.includes('id=\"sec-wu4\"')?0:1);"
gate: auto

- [ ] **Step 12: 梅花易数+大六壬 互动起卦（手势/摇一摇+盘面SVG）**
action: (A) 在梅花易数结果区域上方新增「🎲 手摇卦」按钮：点击启动 DeviceMotion（无则回退 tap 6次 逐爻生成），每次tap决定一爻（6/9变爻，7/8不变），并用动画逐爻飞入卦盘 SVG。(B) 新增大六壬模块 sec-cn7（「📐六壬」）：12 神将 64 课用纯SVG 绘制天地盘（同心圆4层：地盘12支、天盘12支、天将12神、四课三传）。算法部分使用简化版"月将加时起天盘"，若算法复杂则结果区先输出"当前天盘:X 地盘:Y 四课:P1-P4 三传:C1-C3 结构化结果"并提示「全课解挂实装中」。新增 TYPE_LABEL.daliuren='大六壬' HIST_TYPE_COLOR.daliuren='#4A6B8A'，6处全齐；梅花易数已存在类型不用加。所有标识符挂window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('sec-cn7六壬:', h.includes('id=\"sec-cn7\"'));console.log('TYPE_LABEL.daliuren=', h.includes('大六壬')&&h.includes('daliuren'));console.log('手摇卦:', h.includes('手摇卦')||h.includes('DeviceMotion'));console.log('天地盘:', h.includes('天盘')&&h.includes('地盘'));process.exit(h.includes('id=\"sec-cn7\"')?0:1);"
gate: auto

### Phase 4：PWA + 本地通知 + 规律洞察关联图

- [ ] **Step 13: PWA manifest + Service Worker（单文件内嵌）**
action: 脚本启动时检测 window.isSecureContext，若支持则将 manifest 作为 data:application/manifest+json;base64,... URL 动态注入 <link rel=manifest id=pwa-manifest>；manifest字段含 name:知命V2 / short_name:知命V2 / start_url:./ / display:standalone / background_color:#FAF8F5 / theme_color:#8B6F47 / icons:[192,512] 使用 data:image/svg+xml;utf8,<svg xmlns=...> （内联SVG图标，不用外部图片）。Service Worker 不使用外部 sw.js 路径（避免file:///失败），改为用 navigator.serviceWorker.register(URL.createObjectURL(new Blob([swCode],{type:'application/javascript'}))) 动态注册；SW 内部仅缓存自身资源，使用 cache-first 策略。新增 initPWA() 函数（如已存在则IIFE包装扩展），init() 末尾调用。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('initPWA typeof=', typeof h.match(/initPWA\s*\(/)?'functionish':'no');console.log('manifest data:', h.includes('application/manifest+json')||h.includes('name\":\"知命V2'));console.log('service worker Blob:', h.includes('Blob')&&h.includes('serviceWorker'));console.log('SVG icons:', h.includes('image/svg+xml'));process.exit((h.includes('知命V2')&&h.includes('serviceWorker'))?0:1);"
gate: auto

- [ ] **Step 14: 本地通知（每日宜忌 + 复盘到期）**
action: 新增 2 个函数：askNotifyPermission()（首次问用户授权，存储状态 localStorage:zhiming_v2_notify_perm）；scheduleDailyNotify() 每天 08:00 用 setTimeout+差值计算 + Notification API 弹今日宜忌通知（标题「今日宜X忌Y」，body 用今日喜神/财神方位）；另外当历史条目 outcomeDate 到期时，页面下次 load 或切历史时弹 Notification「🔔 到复盘日了：上次占卜《XXX》请标记结果」。所有新函数挂 window；在 initPWA 之后调用 askNotifyPermission()。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const vm=require('vm');const h=fs.readFileSync('/workspace/知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);const ctx={window:{},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams,Blob:class{},URL:{createObjectURL(){return'blob:test';}}};ctx.self=ctx;ctx.globalThis=ctx;ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};ctx.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>({forEach(){}}),createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},appendChild(){},addEventListener(){},dispatchEvent(){return true;}}),body:{appendChild(){},classList:{add(){}}},head:{appendChild(){}},addEventListener(){},removeEventListener(){},location:{href:'',origin:''}};ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;ctx.navigator={language:'zh-CN',serviceWorker:{register:async()=>({then(){return{catch(){}}}})}};ctx.Notification={requestPermission:async()=>'granted',permission:'default'};ctx.setTimeout=fn=>{try{fn();}catch(_){}return 1;};ctx.clearTimeout=()=>{};vm.createContext(ctx);vm.runInContext(m[1],ctx,{timeout:15000});console.log('askNotifyPermission:', typeof ctx.window.askNotifyPermission);console.log('scheduleDailyNotify:', typeof ctx.window.scheduleDailyNotify);process.exit((typeof ctx.window.askNotifyPermission==='function'&&typeof ctx.window.scheduleDailyNotify==='function')?0:1);"
gate: auto

- [ ] **Step 15: 我的规律洞察 V2（力导向关联SVG）**
action: 在 analyzeMyPatterns 函数（或 IIFE monkey-patch showMyPatterns）后追加「关联图谱」Tab 视图：用纯 SVG 实现极简力导向节点图（节点=命例，按类型着色；边=两个命例共享标签/相同当事人/相同时间窗口）；节点可点击直接打开历史详情。算法：遍历所有历史条目 N，对 N ≤ 30 直接输出按类型半径聚类的静态节点图（力导向若计算复杂则使用预布局聚类 SVG，保证结果不空）。新增 .pattern-graph-svg / .pg-node / .pg-edge CSS。不新增type故不改TYPE_LABEL。所有标识符挂window。
loop: false
verify:
  type: shell
  command: node -e "const fs=require('fs');const h=fs.readFileSync('/workspace/知命V2.html','utf8');new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1]);console.log('pattern-graph-svg CSS:', h.includes('pattern-graph-svg'));console.log('关联图谱文本:', h.includes('关联图谱'));console.log('pg-node CSS:', h.includes('pg-node'));process.exit(h.includes('关联图谱')?0:1);"
gate: auto

### Cross-cut：体积/语法/挂载 最终验收

- [ ] **Step 16: 最终集成验收 + 报告**
action: 运行以下4条验证并截图：(A) wc -l -c ≤3MB；(B) new Function(script) 语法通过；(C) 42个核心新函数 typeof window.xxx==='function' 通过率 ≥ 38/42；(D) runInlineSelfCheck 结果不含 FAIL 或任何 ReferenceError 文本。
loop: false
verify:
  type: shell
  command: node -e "
const fs=require('fs');const vm=require('vm');const st=fs.statSync('/workspace/知命V2.html');console.log('体积:',st.size,'bytes (',Math.round(st.size/1024),'KB) ≤3MB:',st.size<=3145728);if(st.size>3145728)process.exit(1);
const h=fs.readFileSync('/workspace/知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('语法OK');
const must=[
  'openLiupaiModal','saveLiupaiPanel','getLiupai',
  'renderCalendar','cycleCalMonth','longPressCastGua','setShareCardTheme',
  'openDiaryModal','saveDiaryEntry','getDiaryEntries','calcDiaryStreak','renderDiaryHeatmap',
  'askNotifyPermission','scheduleDailyNotify'
];const ctx={window:{},console,Date,Math,JSON,Object,Array,RegExp,Map,Set,String,Number,Boolean,parseInt,parseFloat,isNaN,isFinite,Error,TypeError,ReferenceError,SyntaxError,Promise,encodeURIComponent,decodeURIComponent,URLSearchParams,Blob:class{},URL:{createObjectURL(){return'';}}};ctx.self=ctx;ctx.globalThis=ctx;ctx.localStorage={_m:new Map(),getItem(k){return this._m.has(k)?this._m.get(k):null;},setItem(k,v){this._m.set(k,String(v));}};ctx.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>({forEach(){}}),createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},dataset:{},appendChild(){},addEventListener(){},dispatchEvent(){return true;}}),body:{appendChild(){},classList:{add(){}}},head:{appendChild(){}},addEventListener(){},removeEventListener(){},location:{href:'',origin:''}};ctx.addEventListener=()=>{};ctx.removeEventListener=()=>{};ctx.dispatchEvent=()=>true;ctx.navigator={language:'zh-CN',serviceWorker:{register:async()=>({then(){return{catch(){}}}})}};ctx.Notification={requestPermission:async()=>'granted',permission:'default'};ctx.setTimeout=fn=>{try{fn();}catch(_){}return 1;};ctx.clearTimeout=()=>{};vm.createContext(ctx);vm.runInContext(m[1],ctx,{timeout:20000});
let ok=0;const miss=[];must.forEach(n=>{if(typeof ctx.window[n]==='function')ok++;else miss.push(n);});console.log('核心新函数:',ok+'/'+must.length,(miss.length?'❌缺: '+miss.join(','):'✅'));if(ok<must.length-4)process.exit(2);
if(typeof ctx.window.runInlineSelfCheck==='function'){const r=ctx.window.runInlineSelfCheck();console.log('runInlineSelfCheck:',typeof r==='string'&&r.length>300?r.slice(0,200):r);if(/FAIL|ReferenceError/.test(String(r)))process.exit(3);}else console.log('(runInlineSelfCheck undefined,跳过)');
console.log('ALL CHECK PASSED ✓');
"
gate: auto

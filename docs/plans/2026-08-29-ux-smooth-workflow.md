---
intent: 把知命V2从「功能齐全但每步都要思考」的原型感，打磨成「打开就能用、犯错能回退、结果自动留存、天天开不烦」的日常app质感。
success_criteria: 14 条UX改进点全部落地（首屏行动区/结果引导条/10类草稿自动保存/历史筛选与批量删/双栏对比浮层/档案跨Tab联动/五格单行智能拆分/默认当前时间+记上次城市/起卦快捷/错误口语横幅+重试/后退不丢草稿/快速命令面板/启动分帧）。体积≤3MB/语法OK/挂窗36+/自检无FAIL/冒烟12项。
risk_level: low
auto_approve: true
worktree: false
branch: hotl/ux-smooth-feature
---

## Steps

- [ ] **Step 1: Baseline 基线快照 + 锚点地图**
action: 运行 wc -l -c 知命V2.html 记下行数/体积基线；跑 `node accel/make_fast_patch.js build 知命V2.html` 生成 anchors.json。确保语法 OK（new Function 无错），并输出 anchor_map 关键锚点（style结束/top-bar下/pre-IIFE/TYPE_LABEL后/setActiveProfile函数/init函数/每个 renderXxx 结果注入点）。
loop: false
verify:
  type: shell
  command: "node -e \"const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('SYNTAX_OK baseline lines=%d size=%d', h.split('\\n').length, Buffer.byteLength(h));\" && test -f 知命V2.html.anchors.json"

- [ ] **Step 2: Patch UX1 - 样式注入**
action: 在 `</style>` 前注入 7 组新样式：.primary-action（4 大按钮栅格 + 48px） / .result-next-steps（结果底部横条） / #quickCmdModal（输入+候选 Esc 关闭） / #compareModal（双栏 50/50 + 评分差条） / #errBanner（sticky top 40px 淡入淡出） / .batch-bar（历史页顶多选栏 44px） / .toast-bottom（后退提示 3s 淡出）。全部挂到现有 CSS 变量系统，不新增色源。保存为 accel/patches/ux1_style.json，anchor 选 `</style>` 前 15 chars 唯一串 type=unique-line。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux1_style.json 2>&1 | tail -5 && grep -c '\\.primary-action' 知命V2.patched.html && grep -c '#errBanner' 知命V2.patched.html && grep -c '#compareModal' 知命V2.patched.html && grep -c '#quickCmdModal' 知命V2.patched.html && grep -c 'result-next-steps' 知命V2.patched.html && grep -c 'batch-bar' 知命V2.patched.html && grep -c 'toast-bottom' 知命V2.patched.html > /tmp/u1.txt; cat /tmp/u1.txt; test $(awk '{s+=$1}END{print s}' /tmp/u1.txt) -ge 7"

- [ ] **Step 3: Patch UX2 - HTML 骨架注入**
action: 生成 accel/patches/ux2_html.json 并 apply，anchor 选 `<!-- Modal 层 END -->` 或 body 内 top-bar 之后主容器之前的稳定位置。插入 4 节点：① `<div class="primary-action">` 4 个大按钮（八字/每日塔罗/今日黄历/快速起卦），每个 onclick=window[...] ② `<div id="quickCmdModal" class="qc-modal hidden">` 骨架含 input#qc_input + ul#qc_candidates + 底部关闭 ③ `<div id="compareModal" class="cm-modal hidden">` 双栏 + top 关闭条 + bottom 重新对比按钮 ④ `<div id="errBanner" class="err-banner hidden"></div>`。insert=after 或 before 取决于 anchor 选择（必须 unique-line 保证不偏移）。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.patched.html accel/patches/ux2_html.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; for s in 'class=\"primary-action\"' 'id=\"quickCmdModal\"' 'id=\"compareModal\"' 'id=\"errBanner\"' '快速起卦' '八字排盘'; do n=$(grep -c \"$s\" 知命V2.html); echo \"$s=$n\"; test $n -ge 1 || exit 2; done"

- [ ] **Step 4: Patch UX3 - 常量 & 新 key 声明**
action: 生成 accel/patches/ux3_const.json，anchor 选 `const HIST_TYPE_COLOR = ` 或其后紧跟着的下一个 const 声明（type=fn/mark 或 unique-line）。insert=after。追加：① `const QC_CMDS = [{cmd,label,run(){}}, ...]`（12 条：算八字/算奇门/算周易/算五格/算小六壬/算测字/算塔罗圣三角/算每日塔罗/算星座/看黄历/打开词典/打开历史/快速起卦/今日）。② `const DRAFT_DEBOUNCE_MS = 500`。③ `const CMP_IDS_KEY='zhiming_v2_cmp_ids'` 等 7 个 key name 常量统一在这里集中声明，避免散点硬编码。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux3_const.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; for s in 'QC_CMDS\\s*=' 'DRAFT_DEBOUNCE_MS' 'CMP_IDS_KEY'; do n=$(grep -cE \"$s\" 知命V2.html); echo \"$s=$n\"; test $n -ge 1 || exit 2; done"

- [ ] **Step 5: Patch UX4 - 档案跨 Tab 联动 monkey-patch**
action: 生成 accel/patches/ux4_profile.json。定位 setActiveProfile / 新建档案成功处（读 DRAFT_FIELDS.profile 附近或 loadProfiles 成功回调），用 `const _orig = window.setActiveProfile; window.setActiveProfile = function(id){ const R=_orig.apply(this,arguments); try{document.dispatchEvent(new CustomEvent('profile-changed',{detail:{profileId: id}}));}catch(_){} return R; };` 做包装；同时在 8 个需要档案字段的表单（八字/回测/共振/五格/灵数/大六壬/梅花/奇门）对应 script 初始化后，追加 `document.addEventListener('profile-changed', e => { const p = getProfileById(e.detail.profileId) || {}; applyProfileToDraft('<type>', p); })`。R2 风险（用户正在填被覆盖）的防护：`applyProfileToDraft` 内读 `draftChanged = localStorage['zhiming_v2_draft_<type>_dirty']==='1' && Date.now()-lastInputAt<30_000`，若为真则改用轻提示横幅「检测到切换档案 → 点这里用档案值覆盖」，不直接写。同步挂 switchProfileAllTabs(id)。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux4_profile.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; grep -cE 'profile-changed' 知命V2.html | grep -qE '^[2-9]' && echo OK_listeners && grep -cE 'switchProfileAllTabs\\s*=|function switchProfileAllTabs' 知命V2.html | grep -q 1 && echo OK_switchFn && grep -cE 'applyProfileToDraft' 知命V2.html | grep -qE '[2-9]'"

- [ ] **Step 6: Patch UX5 - 新增 14 个核心函数（挂 window）**
action: 生成 accel/patches/ux5_functions.json，anchor 选 `PRE = [` 之前的独立函数声明区（type=fn 附近）。insert=before。注入 14 个函数，每个声明后立即 `try{window.xxx=xxx}catch(_){}`：① paintPrimaryActionsSkeleton ② openQuickCmd/closeQuickCmd/executeQuickCmd（候选读 QC_CMDS，indexOf 评分，模糊匹配）③ autosaveDraft / restoreDraft / bindDraftAutosaveFor（debounce DRAFT_DEBOUNCE_MS，读 localStorage key=草稿类型前缀）④ resolveWugeInput(singleLine)（中文复姓优先识别/空格拆英文，兜底 {surname:null, given:src, gender:null}）⑤ bindWugeSingleLineInput（读 sec-cn1b 内新增单行输入框→resolve→写 DRAFT_FIELDS.wuge.surname/given/gender，切换开关保留双行手动拆分）⑥ applySmartDefaultsToForms（所有 datetime 输入默认当前 new Date().toISOString().slice(0,16)，city 读 last_city_key 预置）⑦ buildResultNextSteps(hostEl, resultId, type)（4 按钮：保存/对比/分享/复制；对比=打开 compareModal 用最近 2 条同类型 cmp_ids）⑧ markCompareId(id) / openCompareModal / closeCompareModal ⑨ toggleBatchDeleteHistory / applyBatchDeleteHistory ⑩ showErrBanner(msgShort, errObj)（重写 copyErrInfo 的 alert→横幅 + 重试按钮 retryLastAction = 调用全局 window.__lastAction||no-op；dismissErrBanner）⑪ retryLastAction ⑫ bindBackPressHint（pushState + popstate → toast 「草稿已保存」，无阻塞）⑬ renderCompareBar ⑭ dispatchAndSubscribeProfileChange（UX4 里的 addEventListener 抽成函数）。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux5_functions.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; for f in paintPrimaryActionsSkeleton openQuickCmd executeQuickCmd autosaveDraft restoreDraft bindDraftAutosaveFor resolveWugeInput bindWugeSingleLineInput applySmartDefaultsToForms buildResultNextSteps markCompareId openCompareModal toggleBatchDeleteHistory showErrBanner retryLastAction bindBackPressHint; do grep -qE \"window\\.$f\\s*=|window\\['$f'\\]\" 知命V2.html || (echo MISSING_$f && exit 2); done; echo ALL_FN_BOUNT; node -e \"const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('SYNTAX_OK')\""

- [ ] **Step 7: Patch UX6 - 启动时绑定（草稿自动保存/默认值/后退/单行五格）**
action: 生成 accel/patches/ux6_bindings.json，anchor 选 init 声明（`function init(){`）前的 PRE IIFE 末尾段或 mark=PRE_ARRAY_END。insert=before。注入 `(function bootstrapUXBindings(){ try{ bindDraftAutosaveFor('bazi', {...map}); ... 共 10 类 }catch(_){_log('draft bind err',_.message)}; try{ applySmartDefaultsToForms(); }catch(_){} try{ bindBackPressHint(); }catch(_){} try{ bindWugeSingleLineInput(); }catch(_){} // 档案联动 try{ dispatchAndSubscribeProfileChange(); }catch(_){} })();`。关键：bindDraftAutosaveFor 内 input 选择器必须与现有 10 类表单的 id 精确匹配（读 DRAFT_FIELDS.<type> 的字段名 → 对 DRAFT_FIELDS.bazi 用 #bazi_name / #bazi_year 之类或 id 命名惯例去读，不写死具体字段以防后续新增）。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux6_bindings.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; grep -c 'bootstrapUXBindings' 知命V2.html | grep -q 1 && echo OK_bootstrap && grep -cE 'bindDraftAutosaveFor\\(\\s*[\"\\x27]' 知命V2.html | grep -qE '[1-9]' && echo OK_draft_types && node -e \"const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('SYNTAX_OK')\""

- [ ] **Step 8: Patch UX7 - 启动顺序优化（骨架优先 → 分帧）**
action: 生成 accel/patches/ux7_init.json。用包装 init 和 renderToday 的方式（const _origInit = init; window.init=function(){ ... }）。init 新流程：先 paintPrimaryActionsSkeleton()（顶栏 4 大按钮立即出来）→ 原来的 _origInit() 里包含 switchTab('today') → renderToday() 被包：renderToday 内先读 window.__todayFirstFrameDone 真假；if false 只画 1/5 两个主卡组件并 requestAnimationFrame(下一帧画 2/3/4/6/7/8)；第一帧结束设置 __todayFirstFrameDone=true。确保 renderToday 调用者（switchTab on today/回测）不会因为分帧而空窗：骨架节点在 HTML 里先插好（paintPrimaryActionsSkeleton 做的事），widget 容器用 min-height 防止跳动。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux7_init.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; grep -cE 'paintPrimaryActionsSkeleton\\(\\)' 知命V2.html | grep -qE '^[1-9]' && echo OK_paint && grep -cE '__todayFirstFrameDone' 知命V2.html | grep -qE '[1-9]' && echo OK_flag && node -e \"const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('SYNTAX_OK')\""

- [ ] **Step 9: Patch UX8 - 结果页注入 next-steps + 对比自动标记**
action: 生成 accel/patches/ux8_resultside.json，anchor 选 buildShareCardHTML 声明后或 saveHistory 成功分支内（insert=after 或 monkey-patch），两个包装：① saveHistory wrapper：调用完真实 saveHistory 并拿到 result.id 后执行 markCompareId(result.id)；② buildShareCardHTML 之后（或 enhanceResultHtml 出口处）执行：如果宿主元素存在且没有 .result-next-steps 子节点，就用 buildResultNextSteps(hostEl, id, type) 在底栏注入。另一个包装：copyErrInfo 原函数（就是异常报告里 copyErrInfo）→ 原本的 alert/展示改成调用 showErrBanner('操作失败了：' + humanize(err.message), err)；humanize 做 3 条映射：ReferenceError: x is not defined →「有个叫x的功能没有成功加载，点重试看看」TypeError: Cannot read .split of null →「日期还没选好，点重试或去草稿填完整」SyntaxError →「脚本加载异常，刷新页面试试」其余一律「出错啦，下面是详细信息供反馈」→ 横幅里有「重试」= retryLastAction() +「反馈」= 打开 quickCmd 预置「反馈 …」关键词。另最后：历史页默认筛 today：在 renderHistory 前读 zhiming_v2_history_filter_today 并初始=today；顶部加 4 段按钮(今日/7d/30d/全部)；底部加 batch-bar 多选和 applyBatchDeleteHistory 按钮。
loop: false
verify:
  type: shell
  command: "node accel/make_fast_patch.js apply 知命V2.html accel/patches/ux8_resultside.json 2>&1 | tail -3; mv -f 知命V2.patched.html 知命V2.html; for s in 'markCompareId\\(' 'buildResultNextSteps\\(' 'showErrBanner\\(' 'humanize' 'zhiming_v2_history_filter_today' 'applyBatchDeleteHistory'; do c=$(grep -cE \"$s\" 知命V2.html); echo \"$s=$c\"; test $c -ge 1 || exit 2; done; node -e \"const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('SYNTAX_OK')\""

- [ ] **Step 10: 大语法 + window 挂窗 36+ 检查**
action: 执行 `node accel/final_verify.js`；若挂窗通过率 <36 或自检有 FAIL，按 fastpatch+error-fix skill 诊断（一般是 A1 函数后未挂 window 或 A4 注入嵌套进 IIFE 里了），修完重跑，直到 FINAL_EXIT=0。再用 fastpatch 的 verify 追加 --must 中列出 14 个新增函数名和 --strings 覆盖设计 success_criteria 中的 12 条中文入口字符串。
loop: until final_verify exits 0 && fastpatch verify exits 0
max_iterations: 3
verify:
  type: shell
  command: "node accel/final_verify.js; EXIT1=$?; node accel/make_fast_patch.js verify 知命V2.html --must=paintPrimaryActionsSkeleton,openQuickCmd,closeQuickCmd,executeQuickCmd,autosaveDraft,restoreDraft,bindDraftAutosaveFor,resolveWugeInput,bindWugeSingleLineInput,applySmartDefaultsToForms,buildResultNextSteps,markCompareId,openCompareModal,closeCompareModal,toggleBatchDeleteHistory,applyBatchDeleteHistory,showErrBanner,dismissErrBanner,retryLastAction,bindBackPressHint,dispatchAndSubscribeProfileChange,switchProfileAllTabs --strings='今日我想算;快速命令;查看最近两次对比;批量删除;草稿已自动保存;下一步;重试;反馈;单行姓名输入;现在起卦;选日期时间;今日筛选' > /tmp/v.txt 2>&1; EXIT2=$?; tail -30 /tmp/v.txt; echo EXIT1=$EXIT1 EXIT2=$EXIT2; test $EXIT1 -eq 0 -a $EXIT2 -eq 0"

- [ ] **Step 11: 功能冒烟 12 项（vm 沙箱 + DOM 桩）**
action: 写一次性脚本 accel/ux_smoke12.js（做完可以删），模拟 Chrome 83 作用域桩：① 画首屏 → paintPrimaryActionsSkeleton() 后 4 个按钮 DOM 存在；② openQuickCmd() 无异常 executeQuickCmd('算八字') 会触发 switchTab('cn') 且 switchSec('cn1')；③ autosaveDraft('bazi',{name:'张三'}) → localStorage zhiming_v2_draft_bazi 能读；④ restoreDraft 把值回填；⑤ resolveWugeInput('张三丰男') === {surname:'张',given:'三丰',gender:'男'}; resolveWugeInput('Alice Smith female') === {surname:'Smith',given:'Alice',gender:'女'}; ⑥ applySmartDefaultsToForms：所有 datetime-local input 默认值非空（>=今天0点 <=今天+1天 之间）；⑦ buildResultNextSteps(hostEl,'xx','bazi')：hostEl 里出现 4 个按钮且有 onclick= 保存/对比/分享/复制字样；⑧ showErrBanner('x',{message:'TypeError: Cannot read property split of null'}) → errBanner 的 innerHTML 里出现「日期还没选好」或「重试」字，dismissErrBanner() 后它是 hidden 类；⑨ bindBackPressHint() 不抛，模拟 popstate 不会阻塞；⑩ switchProfileAllTabs(demoId)：触发 CustomEvent profile-changed 且事件被记录；⑪ openCompareModal 不崩且 DOM 结构出现两栏；⑫ toggleBatchDeleteHistory 后 histModal 里出现 batch-bar。全部通过=12/12✅。
loop: false
verify:
  type: shell
  command: "node accel/ux_smoke12.js 2>&1 | tee /tmp/smoke.txt; PASS=$(grep -cE '^✅' /tmp/smoke.txt); FAIL=$(grep -cE '^❌' /tmp/smoke.txt); echo PASS=$PASS FAIL=$FAIL; test $PASS -ge 12 -a $FAIL -eq 0"

- [ ] **Step 12: 交付物打包 + 体积 check**
action: `cp 知命V2.html 知命V2.html.uxsmooth`；打印最终 wc -l -c 数字；启动 8765 端口的 http.server（若已有则跳过）。记录结果。
loop: false
verify:
  type: artifact
  path: .
  assert:
    kind: matches-glob
    value: "知命V2.html.uxsmooth"
gate: human

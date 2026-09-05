---
intent: |
  执行知命V2路线图 v2.10「体验打磨版」的 15 条改进项 (#1-#15)：
  (A) 前置首帧二帧拆分基础设施 (#15)，
  (B) 八字/奇门/塔罗/XLR/周易 5 算法 × 3 条行动建议 + 择日推荐器 + 换一批 (#1-#7)，
  (C) PNG保存 + Hash直达链接 + Hash自动回填 + 微信分享版 (#8-#11)，
  (D) 12枚成就徽章 + 100句每日slogan + 连签30天解锁霓虹赛博主题 (#12-#14)。
  全程坚守 single_file / ≤1869KB (相对当前 +1000KB 预算) / Chrome83兼容 / 零联网 / 旧签名不破坏。
success_criteria:
  - v2.10 release gate G-v2.10-release 通过：真机冒烟 8 清单全 ✅
  - final_verify exit=0，syntax=0 err，文件体积 wc -c ≤ 1,869,000 字节
  - 15 项功能全实装：5 算法建议条都有 3 条、择日返回 3 天、3 个分享按钮都不报错、
    hash 回填 1 秒内、徽章首占者点亮、slogan 有文字、三帧骨架实际生效
  - 函数挂 window 覆盖率：本阶段新增 20+ 函数全部显式挂载 `window.X = X`，挂窗自检过
  - 新增 localStorage key: zhiming_v2_achievements / zhiming_v2_streak / zhiming_v2_theme /
    zhiming_v2_fs（v3 用但先占好命名空间避免 future 冲突）均在 source code grep 得到
risk_level: medium
auto_approve: true
---

## Steps

- [ ] **Step 1: 记录 v2.10 启动基线 (bytes / syntax / final_verify)**
action: |
  在 /workspace/accel/ 下新建 baselines/ 目录，写文件 baselines/v2_10_start.json，包含 {
    bytes, syntax_ok, final_verify_exit, ts: new Date().toISOString()
  }。三条采集命令：
  1) wc -c /workspace/知命V2.html → bytes
  2) node -e '抽取<script>拼接new Function(s)→syntax ok/no error' → syntax_ok:true/false
  3) node /workspace/accel/final_verify.js; echo $? → final_verify_exit
  mkdir -p /workspace/accel/baselines /workspace/backup。
loop: false
verify:
  type: artifact
  path: accel/baselines/v2_10_start.json
  assert:
    kind: exists

- [ ] **Step 2: 定位关键注入锚点 (行号写进 accel/v2_10_anchors.json)**
action: |
  Grep 下列锚点，输出 {行号, 锚点} JSON 到 accel/v2_10_anchors.json：
  - init_entry: 'function init()' 首个声明行号
  - init_tail: init() 函数内最后一次 renderToday / switchTab / renderWidgets 大集群尾部 } 前 5 行的前一行 (即可以追加 rAF2 的位置)
  - topbar: 'top-bar' 或 renderTopbar 函数行 (无则用 'primary-action' 首次匹配的 div 前一行)
  - bazi_tail: renderBaziResult 内 'baziResult.appendChild' 前一行
  - qimen_tail: renderQimenResult 内 'qimenResult.appendChild' 前一行
  - tarot_tail: renderTarotResult 内 'tarotResult.appendChild' 前一行
  - xlr_tail: renderXlrResult 内 'xlrResult.appendChild' 前一行
  - zhouyi_tail: renderZhouyiResult 内 'zhouyiResult.appendChild' 前一行
  - share_card_btn_bar: buildShareCardHTML 内 class='share-actions' 或按钮容器 div 末尾
  - profile_gallery: renderProfile 内 个人信息卡片 div 底部 (无则用 history 页个人头像下方)
  - text_const_tail: 'window.TEXT = {' 末尾 '};' 前一行
  - copyResult: 'function copyResult' 声明行号
  - almanac_switchTab: "case 'almanac':" 或 switchTab 中 'almanac' branch 末尾
  - liupai_theme: 流派参数面板内 theme/主题 选项组位置
  grep 命令：每个锚点用 grep -nE 'pattern' | head -1 抽第一个匹配。输出 JSON。
loop: false
max_iterations: 3
verify:
  type: artifact
  path: accel/v2_10_anchors.json
  assert:
    kind: json-keys
    value: ["init_entry","init_tail","bazi_tail","qimen_tail","tarot_tail","xlr_tail","zhouyi_tail","share_card_btn_bar","text_const_tail","copyResult","almanac_switchTab","liupai_theme"]

- [ ] **Step 3: 创建 v2_10_all.json 空 patch 容器 + v2_10_budget.txt 账本**
action: |
  1) echo '[]' > /workspace/accel/patches/v2_10_all.json
  2) 写 /workspace/accel/v2_10_budget.txt 初始三行：
     cap_bytes: 1869000
     start_bytes: (读 Step1 的 baseline bytes 数值填入)
     remaining: (cap - start)
     milestone: 初始化
  3) patch 命名约定：此后每步若产生注入代码，优先用 fastpatch JSON 追加到 accel/patches/ 下独立小文件
     (如 step15_perf_first_paint_split.json)，验证通过后再把 {patch} append 到 v2_10_all.json 汇总。
loop: false
verify:
  - type: artifact
    path: accel/patches/v2_10_all.json
    assert:
      kind: exists
  - type: artifact
    path: accel/v2_10_budget.txt
    assert:
      kind: contains-line-regex
      value: "^remaining"

- [ ] **Step 4: #15 perf_first_paint_split — 注入 paintPrimaryActionsSkeleton / paintRaf1 / paintRaf2 三函数壳**
action: |
  在 /workspace/知命V2.html script 段末尾 (</script> 标签前 1 行) 追加三个独立函数：
  1) function paintPrimaryActionsSkeleton(){ 在 .primary-action 区插入 4 个灰色占位块 (loading skeletons) }
  2) function paintRaf1Widgets(){ 首帧只画 4 个主卡: renderToday 内黄历主卡(非全页)/塔罗今日/运势条/今日宜忌；不渲染趋势图/次要组件 }
  3) function paintRaf2Widgets(){ 二帧画: 今日趋势图/其余次要小卡/历史摘要卡/绑定 QC 面板快捷键 }
  每函数后立刻写 `window.paintPrimaryActionsSkeleton = paintPrimaryActionsSkeleton` 等三连挂。
  兼容：如果 renderToday/ renderTarotToday 等函数在 paintRaf1 调用时还没初始化 (极少见)，则 setTimeout(16) 再试一次。
  同步写入 step15_skeleton.patch 到 accel/patches/ 并 append 到 v2_10_all.json。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c '^window.paintPrimaryActionsSkeleton = ' 知命V2.html && grep -c '^window.paintRaf1Widgets = ' 知命V2.html && grep -c '^window.paintRaf2Widgets = ' 知命V2.html

- [ ] **Step 5: #15 perf_first_paint_split — 改写 init() 为 rAF 三阶段**
action: |
  定位 init() 函数 (anchors.init_entry)。把 init 函数体尾部原本一长串同步 renderXxx / renderToday /
  renderWidgets / bindQCShortcuts 调用替换为：
    paintPrimaryActionsSkeleton();                  // 立刻骨架 (阶段0)
    requestAnimationFrame(()=>{
      paintRaf1Widgets();                            // Frame1: 4主卡
      requestAnimationFrame(()=>{
        paintRaf2Widgets();                          // Frame2: 全组件 + hash loader (step20将来放这里)
      });
    });
  重要：原来的 renderToday 等不得遗漏；需要把原来的同步调用分到 paintRaf1Widgets / paintRaf2Widgets 中。
  若原 init 尾部还有 initProfiles / initDebugPanel / initPWA 等，保留原样。
  再次语法检查：node -e 'new Function(抽取script)'。
  写入 step15_init_raf.patch 并 append 汇总。
loop: until syntax passes
max_iterations: 3
verify:
  - type: shell
    command: cd /workspace && node -e 'const s=require("fs").readFileSync("知命V2.html","utf8");const code=s.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,"").replace(/<\/script>$/,"")).join("\n");new Function(code);console.log("syntax ok");'
  - type: shell
    command: cd /workspace && grep -nE 'requestAnimationFrame' 知命V2.html | wc -l

- [ ] **Step 6: #15 perf_first_paint_split — 首屏访问 rAF1/2 只用到安全子集常量 (Chrome83 & 兼容 v3 lazy)**
action: |
  静态代码审查 paintRaf1Widgets / paintRaf2Widgets：确保这两个函数内的调用链不访问
  `TEXT.almanac / TAROT_DATA / RUNES_24` (这些是 v3 计划 lazy 的大常量；如果 rAF1 用到了，
  那 lazy 会炸)。
  若发现有依赖 TAROT_DATA 的 "今日塔罗" 渲染 → 降级 paintRaf1 只画骨架 + 标题占位，
  paintRaf2 再真渲（延迟 16ms 用户无感，且避免 v3 lazy 回归风险）。
  修改后写 step15_safe_subset.patch 汇总。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -nE 'TEXT\.almanac|TAROT_DATA|RUNES_24' 知命V2.html | grep -E 'paintRaf[12]' | wc -l | xargs test "0" =

- [ ] **Step 7: #1-#5 行动建议 — 数据层 TEXT.actSuggest 75+ 条基础规则库**
action: |
  在 anchors.text_const_tail (window.TEXT 常量末尾) 注入 TEXT.actSuggest = {
    bazi: { missing:[15条五行缺→颜色/方位], strong:[15条十神强弱→行动], yi_ji:true },
    qimen: [15条 八门值符组合→建议],
    tarot: { 过去:[5条底线话术], 现在:[5条], 未来:[5条] },
    xlr:  { 大安:[5场景], 留连:[5], 速喜:[5], 赤口:[5], 小吉:[5], 空亡:[5] },
    zhouyi: 64卦 ×1主建议 (取卦名+动爻分支模板，≤10KB，非64×1都精确写)
  }。
  总大小预估 ≤ 15KB；如果 grep "TEXT.actSuggest =" 后字节差 > 20KB → 精简文案。
  写 step07_actsuggest_data.patch + append 汇总。更新 budget.txt remaining。
loop: false
max_iterations: 2
verify:
  - type: shell
    command: cd /workspace && node -e 'const s=require("fs").readFileSync("知命V2.html","utf8");const code=s.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,"").replace(/<\/script>$/,"")).join("\n");new Function(code);console.log("syntax ok");'
  - type: shell
    command: cd /workspace && grep -c 'TEXT\.actSuggest' 知命V2.html

- [ ] **Step 8: #1 act_suggest_bazi — 八字结果追加 3 条行动建议**
action: |
  新增函数 renderActSuggestBazi({wuxingMissing, shiShenTop, yi, ji}) → 返回 div.act-suggest-box，
  内容: 标题「今日具体行动建议」+ 3 条 li，每条 emoji + 建议文字。
  规则：缺X行→建议色/方位；十神强→事项；首宜+首忌→一条。
  挂 window，然后在 anchors.bazi_tail (八字 appendChild 前) 先 appendChild(actBox)。
  写 step08_bazi_act.patch 汇总。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderActSuggestBazi' 知命V2.html && grep -c 'act-suggest-box' 知命V2.html

- [ ] **Step 9: #2 act_suggest_qimen — 奇门结果追加建议条**
action: |
  新增 renderActSuggestQimen({zhifu, zhishi, bamenPattern}) → div.act-suggest-box。
  从 TEXT.actSuggest.qimen 取值：值符+生门=主动出击；值符+死门=守成；白虎猖狂=慎出行等；
  若组合不在表里 → fallback 通用 3 条。
  挂 window；anchors.qimen_tail 注入。step09_qimen_act.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderActSuggestQimen' 知命V2.html

- [ ] **Step 10: #3 act_suggest_tarot — 塔罗三张牌 (过/现/未) 各配 1 条建议**
action: |
  新增 renderActSuggestTarot([{pos, card}]) → 给每张 result card 追加子节点 .act-line：
  位置名 + emoji + 建议文字 (从 TEXT.actSuggest.tarot[位置名] 取变种，按 card.reversed 切换消极版本)。
  挂 window。anchors.tarot_tail 注入调用。step10_tarot_act.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderActSuggestTarot' 知命V2.html

- [ ] **Step 11: #4 act_suggest_xlr — 小六壬 6 卦 各 5 场景建议**
action: |
  新增 renderActSuggestXlr({daxian}) → div.act-suggest-box 3 条 (按 daxian 对应场景 5 取前 3)。
  挂 window。anchors.xlr_tail 注入。step11_xlr_act.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderActSuggestXlr' 知命V2.html

- [ ] **Step 12: #5 act_suggest_zhouyi — 周易卦 + 动爻建议**
action: |
  新增 renderActSuggestZhouyi({guaName, dongYaoIdx, dongYaoText})
  → 主建议 = TEXT.actSuggest.zhouyi[guaName]；动爻存在时额外 "次建议：因动爻 {dongYaoText} → + 变种句"。
  共 2 条或 3 条。挂 window。anchors.zhouyi_tail 注入。step12_zhouyi_act.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderActSuggestZhouyi' 知命V2.html

- [ ] **Step 13: #7 act_suggest_switch — 建议条「换一批」+ LRU 3-stack 去重**
action: |
  1) 新建函数 rerollActSuggest(box, category, seedOffset) 挂 window：
     - 读 TEXT.actSuggest[category] 的 15 条变种库
     - LRU = window._actLRU = (window._actLRU||[])，保留最近 3 组 (每组 3 条联合字符串)
     - 洗牌后排除与前 3 组完全相同的组合
     - 替换 box 里的 li 文本
  2) 修改 step 8-12 所有 .act-suggest-box 的生成模板，在右上角加小按钮
     `<button class="btn-mini act-reroll" data-cat="bazi">换一批</button>`
  3) 事件委托：document.addEventListener('click', (e)=>{ if(e.target.matches('.act-reroll')) rerollActSuggest(...) })
  step13_reroll.patch 汇总。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'act-reroll' 知命V2.html && grep -c 'rerollActSuggest' 知命V2.html

- [ ] **Step 14: M1 Gate — 结果深度初体验人工审核**
action: |
  在本地浏览器 (若能打开) 或 真机上，用 5 个典型输入各排一盘：
  八字 (张三 1990-01-01 12:00 男)、奇门 (现在问事)、塔罗 3 张、小六壬、周易。
  检查清单：
  ☑ 5 种结果都能看到 2-3 条具体行动建议
  ☑ 每条建议右上角有「换一批」按钮，点一次后文字至少有 1 条不同
  ☑ Chrome 83 console 没有 ReferenceError / TypeError (打开调试面板看)
  ☑ 文件体积还没爆预算 (wc -c < 1600000 at this M1 point)
  本 step 由你真人 gate。
loop: false
gate: human
verify:
  type: human-review
  check: 上述 5 条清单全过。若不通过，给出要改的具体条目/文案。

- [ ] **Step 15: #6 day_picker — 择日推荐器 Modal UI 壳 + 2 个入口**
action: |
  1) 新建 buildDayPickerModal() → 返回：
     - 标题栏「📅 找合适的日子」+ X 关闭
     - 任务类型 Radio 6 项 (搬家/签约/装修/出差/探亲/约会)
     - 日期范围 "未来 N 天" slider (默认 30，范围 7-90)
     - 开始计算按钮 → 调 dayPickerRun(task, days) 并渲染结果
  2) 入口 1：Primary Action Zone 的"黄历"按钮长按 500ms 弹出 Modal (mouse/touchstart touchend timer)
  3) 入口 2：任意排盘结果页 "下一步" 栏加按钮「📅 找合适的日子」
  4) 挂 window.openDayPicker / closeDayPicker / buildDayPickerModal。
  step15_daypicker_ui.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'openDayPicker' 知命V2.html

- [ ] **Step 16: #6 day_picker — 打分引擎 dayPickerScore + Top3 卡片渲染**
action: |
  新建 dayPickerScore(task, ymd) {
    加权 4 维度:
      年柱五行匹配 (20%) = 当事人档案(如有)年干 vs 该年年支 生/克
      日柱五行 (20%) = 日干对任务的喜忌 (搬家→戊土/土; 签约→金/官; 装修→木; 出差→水/驿; 探亲→火/合; 约会→木/桃花)
      宜忌首条匹配 (30%) = 当日黄历宜/忌是否支持任务
      喜神财神方位 (10%) = 若有任务主目的地=方位则加权
    返回 { score 0-100, reasons[str] }
  }
  dayPickerRun(task, days) 生成 N 天 ymd 数组 → 并行打分 → sort desc → 取前 3。
  renderDayPickerResult(top3) → 3 张卡片每条 1 句理由。三函数全挂 window。
  step16_daypicker_engine.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'dayPickerScore' 知命V2.html && grep -c 'dayPickerRun' 知命V2.html

- [ ] **Step 17: #8 share_png_save — saveShareCardPNG 三层兜底生成函数**
action: |
  新增 saveShareCardPNG():
    路径 A: 取 buildShareCardHTML 结果 innerHTML → 生成 `<svg xmlns=.. width=750 height=1200><foreignObject>` 包装 →
      new Image src = "data:image/svg+xml;base64," + btoa(svgText) → onload 后 canvas 750x1200 drawImage →
      canvas.toDataURL("image/png") → `<a download="zhiming_share_YYYYMMDD_HHmm.png">` click。
    路径 B: 若 A 抛错 (Chrome 83 WebView 常见 CORS/foreignObject 限制) → fallback 到直接下载 SVG
      (将 SVG XML 直接写成 Blob URL a download .svg，手机相册/文件管理器可打开)
    路径 C: 若 B 也失败 → 非阻塞 alert("请手动截图分享卡区域发送")。
  挂 window。step17_png_save.patch。
loop: false
max_iterations: 3
verify:
  type: shell
  command: cd /workspace && grep -c 'saveShareCardPNG' 知命V2.html && grep -c 'foreignObject\|fallback\|手动截图' 知命V2.html

- [ ] **Step 18: #8 share_png_save — 把「💾 保存 PNG」按钮加到分享卡按钮栏**
action: |
  修改 buildShareCardHTML 内的分享卡按钮动作区 (anchors.share_card_btn_bar)：
  在原 "3 套主题循环切换" 按钮和 "复制结果" 按钮之间，追加两个并排按钮：
    <button class="btn share-png" onclick="saveShareCardPNG()">💾 保存 PNG</button>
    <button class="btn share-hash" onclick="copyShareHashLink()">🔗 复制直达链接</button>
    <button class="btn share-wx" onclick="copyResultWeChat()">📋 复制分享版</button>
  三个按钮样式统一与原 "复制结果" 相同。注意：本步先加按钮 DOM，后 3 步会实现 copyShareHashLink / copyResultWeChat。
  step18_share_buttons.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'saveShareCardPNG()' 知命V2.html && grep -c 'copyShareHashLink()' 知命V2.html && grep -c 'copyResultWeChat()' 知命V2.html

- [ ] **Step 19: #9 share_hash_generate — copyShareHashLink hash 生成函数 + base64 压缩**
action: |
  新建 hashParamsFromForm(type)：读当前 Tab 对应表单域 (bazi: n/b/h/g/cid; qimen: q_ts; tarot: 无参但要记 shuffle seed? 直接记 3 张牌 ids 顺序; xlr: xlr_ts; zhouyi: question + guaMethod + seed) →
  生成 { t: type, ...fields } 对象 → JSON → btoa (latin1) → 拼 hash: '#/?d=' + b64。
  copyShareHashLink()：读 hash → navigator.clipboard.writeText(fullURL) || fallback: prompt("复制链接", fullURL)。
  两函数都挂 window。step19_hash_gen.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'hashParamsFromForm' 知命V2.html && grep -c 'copyShareHashLink' 知命V2.html

- [ ] **Step 20: #10 share_hash_autoload — init() 尾部 rAF2 末尾加 hash 加载器**
action: |
  在 init 内 paintRaf2Widgets() 回调末尾追加：
  if(location.hash && location.hash.includes('?')) loadFromHash();
  新建 loadFromHash() 挂 window：
    parse: 取 hash 中 'd=' base64 → atob → JSON.parse → o = {t, ...fields}
    若 t 合法 → switchTab(对应模块名映射: bazi→'bazi', qimen→'qimen', tarot→'tarot', xlr→'xlr', zhouyi→'zhouyi')
    → 回填表单域 (document.getElementById(对应 input id).value = o.xxx)
    → setTimeout(()=>(calc按钮.click() 或 直调 calcXxx 双入口), 100ms)
  兼容：若 hash parse fail → catch 静默，不污染 UI。
  step20_hash_load.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'loadFromHash' 知命V2.html

- [ ] **Step 21: #11 share_copy_result_enhance — copyResultWeChat 精简版 ≤180 字**
action: |
  在 anchors.copyResult (原 copyResult 函数下方) 新增 copyResultWeChat()：
    取当前结果核心文本 → 去掉所有 SVG ASCII 装饰符号 ◈▦▣◉☷☳ 等 (正则 [^\u4e00-\u9fff0-9A-Za-z，。！？、：；""''（）《》,\.!\?:;\-\s] → '')
    → 保留算法名+姓名+结果首段+建议条首条 → 截断 ≤ 180 字 → 复制到剪贴板 (fallback prompt)。
  挂 window。step21_wx_copy.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'copyResultWeChat' 知命V2.html

- [ ] **Step 22: M2 Gate — 分享 + 择日联调体验 人工审核**
action: |
  在真机或本地浏览器上跑如下清单：
  ☑ 八字排一盘 → 点「保存 PNG」：至少走到 B 方案 (SVG 下载) 不报错
  ☑ 点「复制直达链接」：复制成功 (prompt 或系统剪贴板 toast)
  ☑ 新开页/同一窗口刷新到 hash：1 秒内跳到对应 Tab + 表单已填 + 结果已出
  ☑ 点「复制分享版」：粘贴出来 ≤ 180 字，不含 ◈▦ 装饰符号
  ☑ 择日推荐器两个入口 (黄历长按/结果页下一步) 都能打开 Modal → 选「搬家」跑 → 返回 Top3 卡片
  ☑ 本步结束时 wc -c ≤ 1,700,000 (给 D 阶段留 169KB)
loop: false
gate: human
verify:
  type: human-review
  check: 以上 6 条全过；如需要调整文案/尺寸/按钮样式具体反馈。

- [ ] **Step 23: #12 achievements_12_badges — 12 枚徽章常量 (BADGES[12])**
action: |
  在 TEXT 常量挂完后 (anchors.text_const_tail 下方独立 window.BADGES = [...]) 注入 12 枚对象：
  每枚 = { id, name, desc, cond, svg }。
  cond = 解锁条件 predicate 字符串 (后面步骤会 eval/case switch 使用)。
  svg = 内联 64×64 简笔画 path 定义 (8 字形徽章外形 + 汉字/符号)，
  用 `<svg viewBox="0 0 64 64"><circle cx=32 cy=32 r=28 .../><text x=32 y=40 ...>初</text></svg>` 风格，
  每枚 ≤ 300 字节，12 枚合计 ≤ 5KB。
  ID 清单 (同 roadmap)：初占者/多面手/月签王/复盘达人/深夜占卜师/塔罗常客/奇门高手/空亡避坑/卜者仁心/持之以恒/词典学者/隐藏·牌灵降临。
  挂 window.BADGES。step23_badges_const.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'window.BADGES' 知命V2.html && node -e 'const s=require("fs").readFileSync("知命V2.html","utf8");const code=s.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,"").replace(/<\/script>$/,"")).join("\n");new Function(code+"\nif(BADGES.length!==12)throw new Error(\"BADGES count=\"+BADGES.length)");console.log("BADGES=12 ok");'

- [ ] **Step 24: #12 条件引擎 — awardBadge / checkBadgesUnlocked / localStorage**
action: |
  在排盘成功回调统一处 (例如：每一个 calcXxx 包装器 if(r.ok) 之后) 加调用：
    checkBadgesUnlocked({algorithm, timestamp, result=r, historyCount:loadHistory().length})
  新建 checkBadgesUnlocked(ctx) 挂 window：
    加载 unlocks = new Set(JSON.parse(localStorage.zhiming_v2_achievements||'[]'))
    对 BADGES 逐枚 switch(cond) 判定，若满足且未解锁 → awardBadge(badge)
  新建 awardBadge(badge) 挂 window：
    把 id 存入 unlocks → write back → toast 浮层 "🎖️ 获得徽章：XXX" (3 秒自动淡出)
    → 调 renderBadgesGallery() 若当前正处于成就画廊页
  step24_engine.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'checkBadgesUnlocked' 知命V2.html && grep -c 'awardBadge' 知命V2.html && grep -c 'zhiming_v2_achievements' 知命V2.html

- [ ] **Step 25: #12 徽章画廊 — 个人页下方 3×4 grid**
action: |
  新建 renderBadgesGallery(parentEl) 挂 window：
    生成 `<div class="badges-gallery" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">`
    对每枚徽章: 已解锁 = 彩图 + 名字；未解锁 = silhouette (opacity=0.2 + grayscale + '???')。
    加标题 "我的徽章"。
  在个人 Profile Tab (renderProfile 或 profile-tab) 主卡下方追加调用 renderBadgesGallery(profileTabEl)。
  如果项目还没 profile-tab → fallback：在历史 Tab 右侧个人信息卡下方渲染。
  step25_gallery.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'renderBadgesGallery' 知命V2.html && grep -c 'badges-gallery' 知命V2.html

- [ ] **Step 26: #13 daily_slogan_100 — TEXT.slogans 100 句东方禅语库**
action: |
  在 TEXT 常量末尾加 TEXT.slogans = [100 句]。
  每句 ≤ 30 字；风格：东方禅意 + 现代心理学 (示例："不急，今天宜慢慢想")。
  总大小 ≤ 100×50 = 5000 字节。
  step26_slogans_data.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && node -e 'const s=require("fs").readFileSync("知命V2.html","utf8");const code=s.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,"").replace(/<\/script>$/,"")).join("\n");new Function(code+"\nif(TEXT.slogans.length!==100)throw new Error(\"slogans count=\"+TEXT.slogans.length)");console.log("slogans=100 ok");'

- [ ] **Step 27: #13 slogan 渲染 + date seed 保证当日一致**
action: |
  新建 getTodaySlogan() 挂 window：
    取 today = new Date().toISOString().slice(0,10)
    seed = int(hash(today)) / 2^32 (hash 用 djb2: for(c in str) h=((h<<5)-h)+c)
    取 slogans[Math.floor(seed * TEXT.slogans.length)]
  在 top-bar 中部 (anchors.topbar 位置) 追加 .slogan-bar，class="text-xs opacity-80 text-center"，
  内容 = getTodaySlogan()；宽度限 60% 避免遮挡两侧按钮。
  step27_slogan_render.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'getTodaySlogan' 知命V2.html && grep -c 'slogan-bar' 知命V2.html

- [ ] **Step 28: #14 streak_30_unlock_theme — 连签计数 addStreakCount()**
action: |
  新建 addStreakCount(dateStr=new Date().toISOString().slice(0,10)) 挂 window：
    读 streak = JSON.parse(localStorage.zhiming_v2_streak || '{"last":"","count":0}')
    if (last == dateStr) return streak (已签过)
    else if (昨天) streak.count++
    else streak.count = 1
    streak.last = dateStr
    write localStorage; return streak
  在 anchors.almanac_switchTab (进入黄历 Tab 的分支末尾) 调 addStreakCount()。
  首次调后 awardBadge("持之以恒") 触发条件在 step24 引擎里补 case：if streak.count ≥ 7 → "持之以恒"。
  step28_streak_count.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'addStreakCount' 知命V2.html && grep -c 'zhiming_v2_streak' 知命V2.html

- [ ] **Step 29: #14 主题三段选择器 (米黄/墨夜/霓虹赛博) + streak≥30 自动解锁**
action: |
  在 anchors.liupai_theme (流派参数面板主题位置) 追加：
    <div class="theme-picker">
      <span>主题：</span>
      <button data-th="0">米黄</button>
      <button data-th="1">墨夜</button>
      <button data-th="2" id="theme-neon-btn" class="theme-lock">
        霓虹赛博 <small>[连签 30 天解锁]</small>
      </button>
    </div>
  新增 switchTheme(idx) 挂 window：
    若 idx=2 且 streak.count<30 → toast "再坚持 N 天解锁" 并 return
    否则 body.classList 切换 (theme-light/theme-dark/theme-neon)
    写入 localStorage.zhiming_v2_theme
  CSS 末尾追加 body.theme-neon { --primary:#0ff; --accent:#f0f; --bg:#0a0a1f; ... } 取 cyberpunk 主题配色变量。
  step29_theme_switch.patch。
loop: false
verify:
  type: shell
  command: cd /workspace && grep -c 'switchTheme' 知命V2.html && grep -c 'theme-neon' 知命V2.html && grep -c 'zhiming_v2_theme' 知命V2.html

- [ ] **Step 30: 新函数挂窗 & Chrome 83 兼容终检 (本阶段挂窗清单)**
action: |
  执行挂窗完整性检查：
  grep 每个函数声明 function X( ，确认下一行有 `window.X = X;`。
  本轮强制要求挂窗的函数名单 (20 条最低)：
  paintPrimaryActionsSkeleton, paintRaf1Widgets, paintRaf2Widgets,
  renderActSuggestBazi, renderActSuggestQimen, renderActSuggestTarot, renderActSuggestXlr, renderActSuggestZhouyi,
  rerollActSuggest,
  buildDayPickerModal, openDayPicker, closeDayPicker, dayPickerScore, dayPickerRun, renderDayPickerResult,
  saveShareCardPNG, hashParamsFromForm, copyShareHashLink, loadFromHash, copyResultWeChat,
  awardBadge, checkBadgesUnlocked, renderBadgesGallery,
  getTodaySlogan, addStreakCount, switchTheme。
  缺一个就补齐，写 step30_missing_hooks.patch。
loop: until all 27 functions 挂窗
max_iterations: 2
verify:
  type: shell
  command: cd /workspace && for f in paintPrimaryActionsSkeleton paintRaf1Widgets paintRaf2Widgets renderActSuggestBazi renderActSuggestQimen renderActSuggestTarot renderActSuggestXlr renderActSuggestZhouyi rerollActSuggest buildDayPickerModal openDayPicker dayPickerScore dayPickerRun renderDayPickerResult saveShareCardPNG hashParamsFromForm copyShareHashLink loadFromHash copyResultWeChat awardBadge checkBadgesUnlocked renderBadgesGallery getTodaySlogan addStreakCount switchTheme; do grep -c "window.$f = $f" 知命V2.html > /dev/null || { echo MISSING $f; exit 1; }; done; echo ALL_HOOKED

- [ ] **Step 31: 三联验收 — Syntax + final_verify + vm self-check**
action: |
  三联同时跑：
  (1) Syntax: node -e '抽取全部<script>→new Function(...)'，0 error。
  (2) Final verify: node /workspace/accel/final_verify.js → exit code 0。
  (3) vm self-check: 用 sandbox (若有) 或 browser 跑 runInlineSelfCheck() → 所有算法旧断言 (XLR basic / QM calc / Tarot draw3 & schema) 仍然 PASS；新条不 fail (允许 "not implemented yet" 只要不 throw)。
  任一失败 → 退回修复，直到三项全绿。
loop: until all 3 pass
max_iterations: 5
verify:
  - type: shell
    command: cd /workspace && node accel/final_verify.js 2>&1 | tail -20 && echo EXIT=$?
  - type: shell
    command: cd /workspace && node -e 'const s=require("fs").readFileSync("知命V2.html","utf8");const code=s.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,"").replace(/<\/script>$/,"")).join("\n");new Function(code);console.log("SYNTAX OK");'
  - type: artifact
    path: 知命V2.html
    assert:
      kind: size-lte-bytes
      value: 1869000

- [ ] **Step 32: 体积记账 v2_10_budget.txt 更新 & 熔断检查**
action: |
  写入新行到 accel/v2_10_budget.txt：
    now_bytes: `wc -c 知命V2.html`
    used_delta: (now_bytes - start_bytes)
    remaining: (cap_bytes - now_bytes)
    milestone: 三联验收通过
  熔断检查：若 remaining < 0 → 立刻暂停 step 33+，先做瘦身 (移除重复文案/简化 SVG)，直到 remaining ≥ 0。
  若 remaining > 0 → 继续。
loop: until remaining >= 0
max_iterations: 3
verify:
  type: shell
  command: cd /workspace && tail -n 6 accel/v2_10_budget.txt && node -e '
    const s=require("fs").readFileSync("accel/v2_10_budget.txt","utf8");
    const m=s.match(/^remaining\s*:\s*(-?\d+)/m);if(!m)process.exit(2);
    const v=+m[1];console.log("remaining bytes:",v);process.exit(v>=0?0:1);
  '

- [ ] **Step 33: G-v2.10-release 真机冒烟验收 (人工 Gate)**
action: |
  在 Chrome 83 Android WebView 真机 (或该机器上次你提交 bug 报告的同款设备) 上执行 8 条冒烟清单：
  ① 冷启动打开 → 肉眼可见三阶段 (骨架 1s → 4 主卡 1.5s → 全组件 2s)，FCP < 3s
  ② 八字排盘：张三 1990-01-01 12:00 男 → 结果页有 3 条建议 + "换一批" 点 3 次不重复同一套
  ③ 塔罗抽 3 张 → 每张都有 "建议：X" 行
  ④ 择日推荐器：选搬家 → 3 天排序卡片含 1 句理由
  ⑤ 保存 PNG / 复制直达链接 / 复制分享版 三按钮：每个点击后不 throw，至少走到 fallback SVG 下载或 prompt fallback
  ⑥ 取 ⑤ 生成的 hash URL 粘到新窗口 → 1 秒内跳到对应 Tab + 表单填值 + 结果出 (不白屏)
  ⑦ 首排盘后 toast 有 "🎖️ 获得徽章：初占者"；打开个人页看到 12 格画廊 (首格亮其余灰)
  ⑧ 顶部 slogan-bar 有一行中文 slogan 文字显示
  ⑧ 条清单全部通过 → Gate 通过。
  不通过 → 具体哪几条失败 + 截图，退回对应 step 修。
loop: false
gate: human
verify:
  type: human-review
  check: 真机 8 条全 ✅ ，无 console.error/throw 跳出异常报告 v2 浮层

- [ ] **Step 34: v2.10 发布备份 + 大 patch 汇总 + 发布标记写入**
action: |
  1) 合并所有 step*.patch 到 accel/patches/v2_10_all.json (去重后数组按锚点偏移倒序排序)
     → 倒序是 make_fast_patch 要求 (防止高位注入后低位行号失效，如引擎已实现就保持一致)
  2) cp /workspace/知命V2.html /workspace/backup/知命V2.v2.10.html
  3) 写 accel/baselines/v2_10_release.json：
     { bytes, syntax_ok: true, final_verify_exit: 0, date: today, smoke_pass: true,
       new_keys: ['zhiming_v2_achievements','zhiming_v2_streak','zhiming_v2_theme','zhiming_v2_fs'],
       new_window_fns_count: 27,
       v2_10_items_claimed_complete: ['#1','#2','#3','#4','#5','#6','#7','#8','#9','#10','#11','#12','#13','#14','#15'] }
  4) 更新 accel/v2_10_budget.txt 末尾追加 milestone: v2.10 released。
loop: false
verify:
  - type: artifact
    path: backup/知命V2.v2.10.html
    assert:
      kind: exists
  - type: artifact
    path: accel/baselines/v2_10_release.json
    assert:
      kind: exists
  - type: artifact
    path: accel/patches/v2_10_all.json
    assert:
      kind: exists

- [ ] **Step 35: 收尾 — 清理 step*.patch 临时 & 准备 G2 → v2.11 handoff 文档摘要**
action: |
  1) 把所有 accel/patches/step*_*.json 移动到 accel/patches/v2_10_attic/ (保留历史，不删)
  2) 写 accel/handover_v2_10_to_v2_11.txt：
     a. v2.10 已完成 (15 条清单打钩)
     b. v2.11 强依赖 (G2 gate 检查项清单 对齐 roadmap Governance)：
        - v2.10 在真机跑 3+ 天 bug 清零 & final_verify 仍 exit=0
        - 体积 now_bytes 到 v2.10 实际结束值 → v2.11 预算上限 800KB 可分配
        - 强依赖 #15 perf_first_paint_split 已 done ✅ (v2.11 再加 4 算法分支不会卡顿)
        - 强依赖 #12 成就系统壳已 done ✅ (v2.11 发 "词典学者")
        - 强依赖 #10 hash_generate 已 done ✅ (v2.11 新手引导生成复习链接)
     c. open questions 回传 roadmap 文档 7.2 Q1/Q2/Q3 留给 v2.11 child design 回答。
  本 step 通过后，v2.10 工作流收尾；下一步可选：你批 G2 → 我写 v2.11 child design → writing-plans v2.11。
loop: false
verify:
  type: artifact
  path: accel/handover_v2_10_to_v2_11.txt
  assert:
    kind: exists

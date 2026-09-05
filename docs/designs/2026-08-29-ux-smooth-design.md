---
design_type: feature
created_at: 2026-08-29
---

# 知命V2「使用端顺滑化」Feature Design

> 解决问题：「每次重填、看完结果不知道怎么办、被打断回来全空、报错是术语、切Tab不联动」等产品级摩擦点。不新增模块数量，专注现有模块的操作体验。

## Intent Contract
```yaml
intent: 把知命V2从「功能齐全但每步都要思考」的原型感，打磨成「打开就能用、犯错能回退、结果自动留存、天天开不烦」的日常app质感。
constraints:
  - 单文件 HTML 架构，纯前端零联网，体积 ≤ 3MB。
  - 所有 zhiming-v2-iter skill 中列的 FIXED 函数签名、localStorage key、TYPE_LABEL 字典不变。
  - 新增 localStorage key 只加不复用：草稿 / 最近对比 / 快速命令面板偏好，独立命名。
  - 不删除任何现有 HTML id/class，避免破坏已有 onclick。
  - Chrome 83 WebView 必须兼容：新函数立即挂 window；新全局变量一律挂 window._xxx；onclick 只调用 window 上的符号。
success_criteria:
  - 新用户首屏 3 秒内出现「今日我想算：八字/塔罗/黄历/抽签」4 个显眼入口（Primary Action Zone）。
  - 所有 8 种需要填表单的排盘（八字/回测/五格/周易/奇门/小六壬/测字/灵数/大六壬/梅花）都具备草稿自动保存 + 切回页面恢复，失焦后最多 500ms 写入；刷新/杀进程后重开能恢复。
  - 排盘结果页底部出现「下一步建议条」：① 保存到历史 ② 一键对比最近一次同类型 ③ 分享 ④ 抄结果 — 对应现有按钮，但做默认值和引导文案重写。
  - 档案切换后，切到任何中式/西玄/共振Tab，都会自动把当前档案的姓名/性别/出生/城市填进去（跨Tab联动）。
  - 起名五格：单行「姓名 + 性别」输入，自动识别姓/名拆分（中文 2-3 字姓识别，英文字符串 split 空格）。
  - 日期时间默认值：用客户端当前时间代替 12:00 中午；城市默认值如果上次填过就记住上次（localStorage 独立 key）。
  - 起卦入口新增「现在起卦 / 选日期时间」两个按钮，后者直接显示原生日期时间选择器，不要求走节气 Tab。
  - 异常：`copyErrInfo` 弹窗改口语 + 重试/反馈按钮；不再出现 `ERR Uncaught ReferenceError` 这种工程师语气。
  - 启动性能：renderToday 前把 8 个 renderWidget_* 替换成惰性挂载到 DOMContentLoaded 之后，首屏 LCP 提前（目前脚本结尾 init() 挂 DOMContentLoaded，保持但优化预渲染顺序）。
  - 顶部区域新增「快速命令面板」入口（🔍按钮）：支持 "算八字" / "算塔罗圣三角" / "看黄历" / "查 甲子" / "词典 七杀" 等 10+ 命令，按回车直达；也可点二级 Tab 之外的快捷跳转。
  - 历史页默认按「今天」筛选，顶部时间条分 Today / 7天 / 30天 / 全部；底部有批量删除勾选框。
  - 退出：点浏览器后退/手机返回键，若有草稿未保存且未产出结果，弹一个「草稿已保存」的轻提示而非 confirm（不要阻塞）。
risk_level: low — 全部是前端交互层改造，不改算法；最坏情况就是某条 UI 分支不显示，不影响排盘正确性。
```

## Verification Contract
```yaml
verify_steps:
  - 体积/语法：
    - wc -c 知命V2.html < 3145728
    - new Function(抽取的script) 无 SyntaxError
  - 挂窗：
    - final_verify.js --must 追加 14 个新符号 (showQuickAction/openQuickCmd/switchProfileAllTabs/
      autosaveDraft/restoreDraft/resolveWugeInput/setDatetimeNow/buildResultNextSteps/dialogOk/
      startCompareWithPrevious/toggleBatchDeleteHistory/dismissErrBanner/onHistoryFilterToday)
    - 挂窗通过率 ≥ 36/40（含旧 33）。
  - 数据结构：
    - 新 localStorage key 列表独立：
      zhiming_v2_draft_<type> / zhiming_v2_last_compare_id / zhiming_v2_qc_recents /
      zhiming_v2_last_city / zhiming_v2_cmp_ids（最多 2）/ zhiming_v2_history_filter_today
    - 旧 key 结构不变。
  - UI 入口字符串：
    - --strings 新增：今日我想算 / 快速命令 / 查看最近两次对比 / 批量删除 / 草稿已自动保存 /
      下一步 / 重试 / 反馈 / 单行姓名输入 / 现在起卦 / 选日期时间 / 今日筛选
    - 每条至少出现 1 次。
  - 算法/副作用：
    - runInlineSelfCheck 无 FAIL / 无 ReferenceError。
    - 旧 TYPE_LABEL / HIST_TYPE_COLOR 分支 12 个全部 ✓。
  - 沙箱冒烟：
    - openQuickCmd() 无崩；resolveWugeInput('张三丰男') 正确拆 {surname:'张', given:'三丰', gender:'男'}
      ，resolveWugeInput('Alice Smith female') 正确拆 {surname:'Smith', given:'Alice', gender:'女'}。
    - switchProfileAllTabs(<non-default-profile>) 后：DRAFT_FIELDS.name.onChange 文本值
      等于 profile.name（8 个表单各自的联动断言）。
```

## Governance Contract
```yaml
approval_gates:
  - 本 feature design 审过（现在这步）。
  - 执行 workflow 完成后交付前，用户在真机点一遍「新手4入口 → 填单 → 出结果 → 下一步 → 对比历史」做冒烟。
rollback:
  - 每个子步都用 fastpatch 的 patch JSON 方式注入；若坏了直接 revert 对应 patch 而非手改。
  - 关键：新增的 DRAFT_FIELDS monkey-patch 用 const _orig = window.fn; window.fn = wrapper 方式，
    回滚只需删掉重写即可，不污染原始 DRAFT_FIELDS 声明。
ownership: 本项目唯一 stakeholder = 你（用户）；工程化侧由子代理执行，我做总控 + 终验。
```

## Scope

| # | In Scope（做） | Out of Scope（不做，本期） |
|---|---|---|
| G1 新手启动 | ① 首屏 Primary Action Zone 「今日我想算」4 入口；② 结果页「下一步建议条」重引导。 | 不做用户账号/云同步/教程长视频/引导遮罩。 |
| G2 高频反复 | ③ 10 类草稿自动保存+恢复（含切Tab/刷新/杀进程）；④ 历史页默认今天筛选 + 7/30/全部 + 批量删；⑤ 结果页「和上次同类型对比」双栏浮层。 | 不做云端历史、标签/收藏夹/评论。 |
| G3 表单联动 | ⑥ 档案切换后全 Tab 联动填值；⑦ 五格自动拆 姓/名/性别 单行输入；⑧ 日期时间默认值 = 当前设备时间；⑨ 记住上次城市；⑩ 起卦入口增加「现在 / 选时间」一键。 | 不做 OCR / 相册生日识别 / 地理位置自动拿城市。 |
| G4 隐性体验 | ⑪ 异常提示口语化 + 重试/反馈；⑫ 后退键不丢草稿（轻 toast 提示草稿已存）；⑬ 顶部快速命令面板（10+ 命令直达）；⑭ 启动顺序优化：先画首屏 4 入口骨架再重算今日组件。 | 不做 Service Worker 再调优（Phase4 已交付），也不做字体/图片资源拆分。 |

约束总计：**14 条可验证改进点**。

## Decisions

| # | Decision | Choice | Rejected Alternatives | 为什么选 |
|---|---|---|---|---|
| D1 | UX 改进形态 | 增量注入（不重写现有函数签名，仅加 IIFE wrapper + 新HTML节点） | 一次性重构所有 renderToday/Form/Tab | 降低风险，出问题可回滚单条 patch。 |
| D2 | 草稿存储结构 | 独立 key `zhiming_v2_draft_<type>`，值 = JSON{fields, ts} | 合并进 hist/profiles 或 draft 对象 | 不污染老数据结构，删草稿不会误伤历史。 |
| D3 | 五格单行识别规则 | 中文字符串：2 字姓优先（欧阳/司马/上官/…）+ 回退 1 字姓；英文字母：空格切 surname=最后一个 | 做机器学习姓名分类库 | 简单规则覆盖 98%，且失败可手动编辑（保留旧双行 UI 做兜底）。 |
| D4 | 跨 Tab 档案联动时机 | 在 setActiveProfile 成功返回后 dispatch CustomEvent `profile-changed`，各 Tab 表单 listener 订阅写值 | 每个 onclick 改 active profile 都手动刷 10 个表单 | 解耦：以后加新模块只需订阅事件，不用改 setActiveProfile 原函数。 |
| D5 | 异常提示视觉 | 顶部半透明横幅（sticky）3.5 秒后自动淡出，不是 alert 阻塞 | 底部 toast / 新 Modal 详情页 | 首屏错误能立刻看见并点"重试"，且不打断正在写的表单输入。 |
| D6 | 快速命令面板实现 | 纯 JS：一个 `<input>` + 模糊匹配候选 list，回车选中。候选在脚本里挂一个静态数组 + 最近 5 条历史。 | 引入 fuse.js 模糊匹配库 | 单文件不能加外部库；用朴素 indexOf + 评分完全够用。 |
| D7 | 历史对比形态 | 浮层 `compareModal`，左右两栏分别渲染 `buildShareCardHTML(id1)` + `buildShareCardHTML(id2)`，中间一条评分差对比条；限制最多同时存 2 个 compare ID。 | 导出图片 / 打开新页 / 双 Tab | 现有 buildShareCardHTML 已经高度浓缩，直接复用最省力。 |
| D8 | 启动顺序优化 | 在 init() 里先调 `paintPrimaryActionsSkeleton()` 写 innerHTML → 再把 renderToday 的 8 个 widget 用 requestAnimationFrame 分两帧画（1,5 先 → 2,3,4,6,7,8 后），比原一次性全量 innerHTML 快。 | 不优化首屏，等 WebView 自己画 | 目标是「打开立刻看到能点的东西」，哪怕今日黄历稍后才出。 |

## Surface

### Storage（新增 key，不影响现有）
- `zhiming_v2_draft_bazi` / `_bazi_ht` / `_wuge` / `_zhouyi` / `_qimen` / `_xiaoliuren` / `_cezi` / `_lingshu` / `_daliuren` / `_meihua`：JSON{fields, ts}，每次 input 500ms debounce 写；页面打开/切 Tab 自动 restore。
- `zhiming_v2_last_city`：最近一次成功选过的 `CITIES[i][0]`。
- `zhiming_v2_cmp_ids`：长度 2 数组，`[oldId, newId]`，新结果产生后自动替换旧；超过 2 时先 shift。
- `zhiming_v2_qc_recents`：长度 5 字符串数组，快速命令面板最近执行的命令关键字。
- `zhiming_v2_history_filter_today`：'today' | '7d' | '30d' | 'all'，历史页筛选器持久化。

### HTML 新增节点
- `.primary-action` 顶部行动区，位于 top-bar 下、主容器前，4 个大按钮 48px 高：
  - 八字排盘 → switchTab('cn')+switchSec('cn1')
  - 每日塔罗 → switchTab('wu')+switchSec('wu1')+抽 1 张
  - 今日黄历 → switchTab('al')
  - 快速起卦 → openQuickCmd() 预置 `起卦`
- `quickCmdModal`：输入框 + 候选列表 + 键盘 Esc 关闭 + 回车直达。
- `compareModal`：双栏浮层，顶部"关闭"按钮、底部"关闭/重新对比"按钮。
- 每个表单页底部追加一行 `.result-next-steps`（八字/回测/五格/周易/奇门/小六壬/测字/塔罗/灵数/大六壬/梅化），按钮顺序：保存并归档 · 对比上次 · 分享卡 · 复制文字。
- 五格输入上方追加 `.wuge-single` 单行输入；旧双行 UI 折叠进「👉 手动拆分姓/名」可展开。
- 起卦按钮追加 `now起卦` / `选时间起卦` 两个快捷（覆盖周易/梅花/大六壬三个卦类Tab）。
- 异常横幅 `errBanner`：绝对定位 top:0 left:0 right:0 z-index 9999，`dismiss + 重试 + 反馈`。

### JS 新增函数（必须挂 window）
- `paintPrimaryActionsSkeleton()` → 首屏第一帧画
- `openQuickCmd() / closeQuickCmd() / executeQuickCmd(keyword)`
- `autosaveDraft(type, fields) / restoreDraft(type, fieldElementMap)`
- `bindDraftAutosaveFor(type, inputSelectorMap)` → 给每种排盘表单统一挂 input 监听
- `dispatchAndSubscribeProfileChange()` → monkey-patch setActiveProfile/新建档案成功处 dispatch `profile-changed`；各表单 listenner 订阅
- `switchProfileAllTabs(profileId)` → 直接对外入口
- `resolveWugeInput(oneLineStr)` → {surname, given, gender, genderSrc}
- `bindWugeSingleLineInput()` → 挂单行输入到 DRAFT_FIELDS.wuge
- `applySmartDefaultsToForms()` → 当前时间 + 记住上次城市
- `buildResultNextSteps(hostEl, resultId, type)` → 给结果区底注入 .result-next-steps
- `markCompareId(id) / openCompareModal / closeCompareModal`
- `toggleBatchDeleteHistory() / applyBatchDeleteHistory()`
- `showErrBanner(msgShort, err) / dismissErrBanner / retryLastAction` → 口语化错误 + 重试
- `bindBackPressHint()` → popstate 时 toast 「草稿已保存」（无阻塞）
- 改造 `init()`：先画骨架 → rAF1 画 4 个今日主卡组件 → rAF2 画剩下 4 个次要组件 + 快速命令面板快捷键绑定

### Files Touched
只改一个文件：`知命V2.html`。通过 zhiming-v2-fastpatch 的 `apply` 倒序注入 8 个 patch：
- P-UX1: `<style>` 末尾追加 UX 样式（primary-action / next-steps / qc-modal / compare-modal / errBanner / batch-bar / toast）
- P-UX2: `<body>` 顶部 top-bar 后插入 Primary Action Zone 骨架 + 新 3 个模态（quickCmd/compare）+ errBanner 空壳
- P-UX3: TYPE_LABEL 后面挂 QC_CMDS 候选常量 + DRAFT_DEBOUNCE_MS = 500
- P-UX4: setActiveProfile/saveProfile 的 monkey-patch（dispatch event）
- P-UX5: 函数声明段：14 个新增函数（挂 window）
- P-UX6: init() 前：bindDraftAutosaveFor × 10 类表单；applySmartDefaultsToForms；bindBackPressHint；bindWugeSingleLineInput；
- P-UX7: init() wrapper（先骨架后分帧）+ renderToday 包装（8 widget 分帧）
- P-UX8: buildShareCardHTML 包装（结果区注入 result-next-steps）+ saveHistory 成功后自动 markCompareId

## Risks & Open Questions

| # | Risk | 概率 | 影响 | 对策 |
|---|---|---|---|---|
| R1 | 草稿自动保存频率太高（input 连续写 localStorage）→ 老手机卡顿 | 中 | 低 | 统一 debounce 500ms；对 textarea 再独立 throttle 800ms。 |
| R2 | 跨 Tab 联动把用户正在手填的字段给冲掉 | 中 | 高 | 订阅 `profile-changed` 时加条件：只有目标表单所有字段都 = 空或 = 默认值 或 用户最后交互距今 >30 秒才自动覆盖；否则给一个顶部轻提示「检测到切换档案，点击这里把 X 字段替换为档案值」。 |
| R3 | resolveWugeInput 单行拆分规则误判（极少见复姓+3字名=2+2 or 1+3） | 中 | 低 | 单行输入失败时自动展开下方手动拆分双行，并把用户输入带进去填；不阻塞。 |
| R4 | 启动优化把 renderToday 拆分成 2 帧 → 可能今日卡片短暂空白 | 低 | 低 | 骨架屏每个 widget 占固定高度，空时显示渐变遮罩；用户感知是"更快出界面"不是"空白"。 |
| R5 | 异常横幅把 top-bar 完全挡住 | 低 | 低 | 横幅高度 40px；top-bar margin-top 40px 只在 show 时加类；dismiss 立刻清掉。 |
| R6 | 快速命令面板在触屏手机上键盘占屏幕一半 → 候选被遮住 | 中 | 低 | 候选最多 6 条；且每条高度 40px；若超过屏幕一半，候选区固定到键盘上方的安全区；Chrome 支持 visualViewport API，可直接用。 |

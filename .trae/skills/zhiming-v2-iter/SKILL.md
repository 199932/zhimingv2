---
name: "zhiming-v2-iter"
description: "迭代开发「知命V2」单文件HTML命理占卜应用。当用户提出给知命/知命V2加功能、改算法、调UI、扩数据、加模块时立即调用。"
---

# 知命 V2 应用迭代技能

## 一、应用基本定位

- **交付形态**：单个 `.html` 文件（单文件打包，零外部依赖、零CDN、零网络请求、纯本地）。
- **技术栈**：HTML5 + CSS3（CSS变量双主题） + Vanilla JS，不引入任何框架。
- **运行环境**：手机浏览器竖屏直接打开，触控友好，按钮≥44px。
- **体积红线**：最终 HTML 必须 ≤ 3 MB（3,145,728 bytes）。说明：500KB 是微信/弱网/老旧手机全场景的安全甜点位（默认推荐尽量控制在 1MB 内）；放开到 3MB 后可容纳 PWA 离线缓存、更精细的 SVG 图形、音频 Base64、紫微/梅花等新模块的大段数据。绘图仍然必须纯 SVG path/circle/polyline/rect 手写，不可引外部图片或图表库。
- **文件路径**：工作区根目录 `/workspace/知命V2.html`（这是唯一要修改的目标文件，永远不要改「知命.html」原版）。

## 二、必须严格遵守的不变约束（任何迭代都不得破坏）

### 2.1 全局架构（文件内代码位置固定约定）
```
知命V2.html 内部分区：
┌──────────────────────────────────────────────────────────┐
│ 1. <style>                                                │
│    - CSS变量 (.theme-light/.theme-dark/.theme-today/      │
│       .theme-cn/.theme-wu/.theme-al)                     │
│    - 通用 .card/.form-row/.button/.btab/.subtab          │
│    - 各模块专属样式 (.qm-grid/.today-card/.widget 等)     │
│ 2. <body> HTML结构                                        │
│    - 顶部 top-bar: 🌙深色 / 👤档案 / 📖词典 / 📚历史 / ⚖回测 │
│    - 主容器 #app: 4个.page today/cn/wu/al                │
│    - page-cn 子Tab: cn1(八字)/cn1b(回测)/cn1c(共振)/     │
│                    cn2(五格)/cn3(周易)/cn4(奇门)/         │
│                    cn5(小六壬)/cn6(测字)                  │
│    - page-wu 子Tab: wu1(塔罗)/wu2(星座)                   │
│    - page-al (黄历)                                       │
│    - 底部 bottom-tabs: 🏠今日 / ☯中式 / ✦西玄 / ❖黄历    │
│    - Modal层: histModal/profileModal/glossaryModal       │
│ 3. <script>                                               │
│    - 数据常量: CITIES/TERM_GLOSSARY+TERM_CATEGORY/        │
│       ZHOUYI_64/TAROT_DATA(78)/XIAOLIUREN_DATA(6)/       │
│       WUGE_81/TYPE_LABEL/HIST_TYPE_COLOR/ZODIAC_12       │
│    - 基础算法: getJieqi/trueSolarTime/dayGZ/ganZhi+JD/    │
│       hashScore/detectZodiacIdx                          │
│    - 核心模块: baziCalc → qimenCalc → calcZhouyi →       │
│       calcWuge → calcXiaoliuren → calcCezi →             │
│       drawTarot(+renderTarotFaceSVG) → renderZodiac →    │
│       renderAlmanac → gongzhenCalc(四法共振)              │
│    - 全局功能: switchTab/bindSubtabs(today/cn/wu/al)、    │
│       saveHistory/loadHistory/renderHistory/             │
│       restoreHistory/openHistory/                        │
│       showAccuracyDashboard/showMyPatterns(🧠规律)/      │
│       renderTrendCharts(📈趋势：饼/雷达/折线)/renderTimeline│
│       openGlossary(📖词典286条+分类搜索+相关跳转)        │
│       档案系统 loadProfiles/setActiveProfile + 联填表单 │
│       renderToday(今日1主卡+8小组件网格)                  │
│       generateShareCardImage + buildShareCardHTML(11型)  │
│       enhanceResultHtml(wrapTerms术语气泡+                │
│       addVerdictBadge🟢🟡🔴色标)                          │
│       copyResult(📋复制)+onShareCardClick(🖼PNG)         │
│       toggleTheme/toggleDark/init()                      │
│    - 自测: validateJieqi(5锚点)/runBacktest(6案例)/      │
│       phase6/batch1/batch2/batch3/batchA/batchB/batchC   │
└──────────────────────────────────────────────────────────┘
```

### 2.2 不改变既有函数签名（只能做 IIFE monkey-patch 扩展）
以下函数签名/行为**不可修改**，需要扩展时用 `const _orig = fn; window.fn = (...args)=>{..._orig(...)}` 包装：
`baziCalc, qimenCalc, calcZhouyi, drawTarot, renderZodiac, renderAlmanac, calcXiaoliuren, calcCezi, gongzhenCalc, switchTab, switchSec, bindSubtabs, toggleTheme, toggleDark, saveHistory, loadHistory, renderHistory, restoreHistory, openHistory, copyResult, renderToday, init, runBacktest, validateJieqi, renderTarotFaceSVG, hashScore, detectZodiacIdx, trueSolarTime, getJieqi, dayGZ, ganZhiFromIndex`

### 2.3 不重写的全局 CSS 变量
```css
:root / body.theme-light   --bg:#FAF8F5 --card:#FFFFFF --text:#1F1A14 --text-hint:#776E5E --pri-cn:#8B6F47 --pri-wu:#6B5CA5 --pri-al:#A0522D --pri-today:#4A6B8A --pri:随主Tab变 --line:#E8E2D6 --card-border:#EEE7D5 --card-shadow:rgba(100,80,50,.05)
body.theme-dark           --bg:#1A1814 --card:#2A2620 --text:#EDE4D2 --text-hint:#9A9182 --pri-cn:#B89260 --pri-wu:#9488C5 --pri-al:#C27B40 --pri-today:#7A9AB8 --line:#3A3530 --card-border:#3C3730 --card-shadow:rgba(0,0,0,.35)
```

### 2.4 历史记录 localStorage key 固定
```
zhiming_v2_history      → [{id,ts,type,input,result,note,accuracy,prediction,outcome,outcomeDate,tags}]
zhiming_v2_profiles     → [{id,emoji,name,gender,y,m,d,h,minute,city,note}]
zhiming_v2_active_profile → id字符串
zhiming_zodiac_idx      → 0-11 上次选中的星座
zhiming_theme           → 'dark' / 'light'
zhiming_tarot_layout    → 'single'/'triangle'/'choice' 上次牌阵
zhiming_hist_filter     → 历史筛选器
zhiming_zodiac_period   → 0/1/2（今日/本周/本月）
```
新增数据必须新增独立 key，不可复用或污染已有 key 的结构字段名。

### 2.5 历史 TYPE_LABEL 固定前缀
```
{bazi:"八字排盘",wuge:"姓名五格",zhouyi:"周易起卦",qimen:"奇门遁甲",xiaoliuren:"小六壬",cezi:"测字",tarot:"韦特塔罗",tarot_daily:"每日塔罗",zodiac:"十二星座",almanac:"黄历",gongzhen:"共振判定"}
```
加新模块必须**同步加**：TYPE_LABEL[x] / HIST_TYPE_COLOR[x]（16进制色）/ summarizeHist 分支 / restoreHistory 分支（切回对应页面+填充表单并触发计算）/ copyResult 分支 / buildShareCardHTML 类型分支。

## 三、迭代工作流

### 3.1 开始前检查
1. `wc -l -c /workspace/知命V2.html` 确认当前行数与大小。
2. 抽取 `<script>` 内全部代码用 `new Function(code)` 做语法预检查，确认起点是无语法错误的干净基线。
3. 用 Grep 定位要改的区域（不要凭猜测硬插入）：
   - 新样式：在 `<style>` 末尾的最后批次注释段追加。
   - 新 HTML：对应 `.page` 里的子Tab顺序按规范插入（共振在回测之后；新中式模块加在测字后面；西玄在星座后面）。不要删已有节点 id，所有已有 section id（sec-cn1…/sec-wu*）必须保留。
   - 新JS常量：`TYPE_LABEL/HIST_TYPE_COLOR`后紧跟追加；新算法函数写在 `copyResult` 之前，或 batch*SelfTest 之前。
   - 自测：固定顺序 `batchXSelfTest` IIFE 在最末尾（但必须早于 `init()` 自动调用）。

### 3.2 编辑规范
- **永远用「Read → 精确 unique old_string → Edit」流程**，禁止 Write 覆盖整个 HTML（1000行+的 Write 容易把其它编辑内容弄丢）。
- 一次只改一个独立功能点；拆成多次子代理 run 并行要确保改的区域完全不重叠。
- 如果需要在已有大函数（如 `renderHistory/showAccuracyDashboard/renderToday/copyResult`）内加几行分支判断，且无法用字符串唯一定位，改用「在该函数声明后面加一个 IIFE 包装重写」模式：
  ```js
  (()=>{const _orig=window.renderToday; window.renderToday=(...A)=>{ /* 前置逻辑 */ const R=_orig(...A); /* 后置逻辑 */ return R;};})();
  ```
  包装函数名必须保持不变，外部调用不感知。

### 3.3 算法新增/复核约束
- **节气**：必须复用 `getJieqi(year,jqIdx)`（5个锚点 0min 偏差），禁止重写节气表。
- **真太阳时**：必须走 `trueSolarTime(beijingTime, lngE)`（含EoT+1986-1991夏令时），禁止自己手动算经度差。
- **奇门**：必须「拆补法 + 转盘 + 阳顺阴逆」，三元/局数表 `QM_YANG_12JU/QM_YIN_12JU` 固定；九星/八门/八神飞布必须一致顺逆。
- **八字日柱**：JD 公式固定，禁止手动修常量。验证 1989-07-07 午时边界必须正确区分庚午/辛未月。
- **周易**：动爻只有 6/9 变，7/8 不变。
- **塔罗逆位**：必须结合位置语义（过去位逆=未消化课题），不能简单关键字反转。

### 3.4 结束前验证（必跑 4 条）
```bash
wc -l -c /workspace/知命V2.html   # 大小必须 ≤500KB，超了必须压缩文案/简化SVG
node -e "const fs=require('fs');const h=fs.readFileSync('知命V2.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('语法OK');"
# 新函数必须挂 window：在 batchXSelfTest 里打印 typeof xxx === 'function'
# 新增 type 必须：TYPE_LABEL/HIST_TYPE_COLOR/summarizeHist/restoreHistory/copyResult/sharecard 6处全齐
```
任何一条不通过，回滚到本次编辑前的干净代码（或只改最小必要片段），不要带病交付。

## 四、可迭代功能池（按历史需求优先顺序）
下次用户说「给知命加点功能」时优先建议：
1. **PWA manifest + Service Worker**（离线安装到桌面图标）
2. **本地定时通知**（每日宜忌推送）
3. **流派参数面板**（奇门拆补/置闰/飞盘/转盘切换；八字十神权重）
4. **占卜日记**：历史记录+复盘标记+当日心情 整合为一本日记视图
5. **节日/节气提醒日历**
6. **紫微斗数 / 梅花易数 / 大六壬 / 西方灵数 / 卢恩符文**（新模块按 TYPE_LABEL 扩展流程）

## 五、禁止踩的坑
- 禁止引外部 CDN（Google Fonts / Tailwind / Chart.js / html2canvas 都不行）。
- 禁止把 emoji 当图形：所有必须可缩放的牌/图，统一用 SVG。
- 禁止把用户输入当 `innerHTML` 直接插入；question/姓名/备注 必须 `escapeHTML`。
- 禁止删除/重命名任何已有 id/class；新增 id 必须带前缀避免冲突：`sec-cn*`/`sec-wu*`/`page-*`/`widget-*`/`modal-*`。
- 禁止写 `eval/new Function(用户输入)`。
- 禁止 `localStorage.clear()` 清空他人数据；删除必须精确到单条记录 key-value 替换。

## 六、交付话术模板
每次迭代完成后给用户回复必须包含：
1. 最终文件行数/KB 数 + 语法校验结果。
2. 本次新增功能清单（入口在哪、效果、数据来源）。
3. 4条验证点的数字结果。
4. 下次可选建议。

严禁只说"做完了"不贴验证数据，也严禁不说明新按钮的入口位置。

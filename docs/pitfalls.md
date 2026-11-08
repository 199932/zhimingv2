# 知命V2 坑账本（pitfalls）

> 每条都是真实踩过的坑，按发现顺序编号。任何 agent / 贡献者改代码前应通读一遍。
> 引用格式：`坑42`。新坑追加到末尾，编号递增。最后更新：2026-11-09（1~94 条沉淀 + SW/构建改造日）。

## 判别与验证（最高频）

- **坑1** 隐藏/移除类修复，断言必须「元素不存在/视觉截图」，禁止「选择器没匹配到」当证据（streak 假绿事故）。
- **坑2** 一次改动碰多锚点，每锚独立验证（ZHIMING_BUILD 漂移 8 轮才暴露）。
- **坑3** 构建拆分类改动必须截图看首屏——纯视觉 bug 不报错。
- **坑4** patch 落盘后立即 rg 读回断言 + 锚点核对；沙箱文件系统会异步回滚吞内容。
- **坑5** 线上功能终极证据 = 无头浏览器开线上 URL 实测渲染，源码串比对不算数。
- **坑6** readback 断言失败必须 exit 1 中止 + 重试循环，不许带病继续。
- **坑7** node --check 语法 OK ≠ 运行 OK，必须浏览器 typeof。
- **坑8** 块替换后 rg 数关键函数定义次数（应为 1，重复定义会静默覆盖）。
- **坑9** 注入锚点用「唯一相邻对」——src 模板串里可能含字面 `</body>`。
- **坑10** terser 会内联删除局部函数定义；产物完整性断言用字符串常量（卡片标题等）+ window.* 属性名 + 行为验证。
- **坑11** 504 断链后先 git status / rg 验证实际状态再幂等补跑（命令可能已执行完）。
- **坑12** 子页签/弹层类新功能首次上线必须点开 + 截图内容本身，只验入口卡 = 假绿。
- **坑13** catch(_) 吞错会让一切字符串断言失效——跨 IIFE 复用工具函数先确认同作用域，否则内联自给自足。
- **坑14** heredoc 里正则只写一层 `\`；mock 数据 key 先 rg 真实结构。
- **坑15** 新 window 函数定义必须插在宿主函数闭合之后，插进体内 = typeof undefined + 点击静默无效。
- **坑16** build 与 node --check 顺序执行不能 `||`（build 失败仍 check 旧产物）；双分支渲染函数逐分支过 checklist。
- **坑17** headless 截图对准：switchTab + 强制显示目标 sec（closest('.section') 拿真实 id）+ scrollIntoView，或 screenshot --full + PIL 裁剪。
- **坑18** 长 sleep 等 CDN 的命令 504 高发——断链后先验实际状态再幂等补跑。
- **坑19** 断言选择器先 dump 实际 DOM 再写（假阴性三连皆因 id 在别的元素上）。
- **坑20** textContent 混内联 script 源码——用元素级查询。
- **坑21** curl 拉 GH Pages >1MB 必截断——线上 JS 终验一律 playwright typeof（或 Range 分段）。
- **坑22** python patch 被 assert 拦截 = 整包未写盘，但同一 bash 链后续命令照跑（build 出旧产物）——fail-fast 后整套重写 + 读回。
- **坑23** 「线上没看到 X」先全新 context 复现，分清代码坏 vs 本地状态挡。
- **坑24** 跨午夜时段「每日一次」flag 加时段桶后缀。
- **坑25** file:// 跨刷新验证起 http.server。
- **坑26** 程序调用 switchSec 不触发 click——wrapper + click 双钩子。
- **坑27** 函数探针逐层 typeof 打印 > 推理（catch 吞错掩盖真相）。
- **坑28** 压缩单行文件出现次数用 `rg -o X | wc -l`（rg -c 按行恒 1）。
- **坑29** 复杂验证链弃零散 CLI，改 python playwright 脚本一气呵成（screenshot/eval 同会话）。
- **坑30** 页面是 .page 壳懒隐藏长滚动结构，验证走真实渲染链：click → 壳 block + scrollIntoView → 视口截。
- **坑31** rg 显示层会吞字符序列（如 `[m`/`[hi`）——断言只信 rg -l/-c 的 rc，或用 python re.search 读真实字节一锤定音。
- **坑32** push 凭证用已存 credential store（见仓库外 AGENTS.md），输出仍须脱敏。
- **坑33** mock 深夜时段 = addInitScript hook Date 构造 + now（横幅四锚：出现/重现/切页保持/白天不出现）。
- **坑34** 引用既有接口先 rg 函数名 + 返回字段双向验证；typeof 防御检查静默 fallback 会藏 bug 9 天（solarToLunar 幽灵接口）。
- **坑35** 本地验证至少跑一遍真实 UI 键入链——直接塞 localStorage 是盲区。
- **坑36** 本地 http.server 也走 SW 缓存——unregister 后再验。
- **坑37** 504 风暴期：长 sleep + 外网命令拆短；断链 echo 探活幂等补跑。
- **坑38** 产物断言锚先查真实渲染文案再写（动态标题段换内容常量锚）。

## 命名与作用域

- **坑39** 新增 window.* 函数前 rg 全文件查重名，输出禁止截断（_chartYearHTML 撞名把流年天象静默覆盖）。
- **坑40** 新模块命名先 rg `window\._XX` 查全前缀命名空间——两字符缩写全高危（_xi 撞喜神渲染器、_pd 被宅况占用），≥4 字符或全拼。
- **坑41** script 块内 document/window 级 addEventListener 必须幂等防重（build.js 将同一块拼进两处 = 双份执行，委托 double 注册翻转 2 次互相抵消）。
- **坑42** 逐元素绑定对 innerHTML 重渲染脆弱，一律 document 级委托 + closest。
- **坑43** 切页兜底清弹层须「esc 栈 + 类名扫描 + 已知独立弹窗」三管齐下（dayPickerModal 跨页漂移）。
- **坑44** 跨函数复用变量先查声明位置（var 在别的函数体内 = 摸不到）。
- **坑45** 函数标记用 fn._tag（dataset 是 Element 的）。
- **坑46** 全局名占用先 rg 定义行（决策币 flipCoin 覆盖周易版 = 手动摇卦死功能存活多日）。
- **坑47** onclick 引用函数必须显式挂 window，线上验真逐按钮 typeof（_wuTone 裸函数五音钮全静默——同卡 A 钮能响 ≠ B 钮能响）。
- **坑48** 新全局函数必须插宿主函数体外（插体内 = 懒渲染未跑 typeof undefined）。
- **坑49** terser 内联局部函数后，跨作用域 let 变量 TDZ 炸——辅助函数挂 window 防内联。
- **坑50** 函数被内联后局部变量摸不到，数据源一律 localStorage 字面量直读自给自足。

## 渲染与 DOM

- **坑51** renderGrow 双分支渲染（无档案/有档案）改一支 = 另一支全红，两支各接一次。
- **坑52** 嵌套 span 父元素禁 textContent 整写（吞子元素）。
- **坑53** JS 字符串拼 HTML 的属性闭合无编译期检查——patch 后 rg 引号自查写进习惯（style 引号未闭合吞后续 DOM）。
- **坑54** details 折叠子元素带 display 值（如 display:grid）会覆盖 UA 收起隐藏——收起态照样可见，必须配对写 `.fold:not([open])>.child{display:none}`。
- **坑55** flex 容器里 `.btn-primary{width:100%}` 强制独占一行（按钮组 104px 元凶）——内联 width:auto + flex 覆写。
- **坑56** grid 全宽卡（grid-column:1/-1）切断 auto-flow 配对——排布先看谁占整行，相邻半宽卡配对 + 全宽殿后。
- **坑57** 裸 fixed div 弹层是 esc 栈/mask 类/已知弹窗三管兜底的盲区（breath-ov 全屏孤岛）——弹层家族盘点要含「无类名裸 div」，新弹层必须在 esc + 切页两处显式注册。
- **坑58** 跨模块双数据源只在单点写入 = 切档/改档后滞留旧值（zhiming_bazi_v1 副本洞）——副本类存储必须挂主档变更双钩同步。
- **坑59** 容器 id 与 JS 查询名不一致 = getElementById null 静默 return 空卡。
- **坑60** 挂载链 patch 会挤丢既有调用——挂载后 rg 逐调用计数核验（musicRender 丢失险）。
- **坑61** 行级 patch 模式：多行 fallback 形态不一时 python 行定位 + 对调 > 字符串 replace。
- **坑62** 多行 try 结构的 patch 锚必须含 catch 闭合整段——esc 锚拆走原行 catch = try 无 catch，node --check 才炸。先读真实字节再 patch。

## 交互与传感器

- **坑63** 「模式卡」Start 函数自查四件套：On=true / Hold=false / timer 清 / base 清，对照同类卡逐行 diff。
- **坑64** pointer 类交互 headless 测试一律 dispatchEvent PointerEvent（playwright mouse API 不触发 pointerdown）。
- **坑65** 传感器 headless 测法 = 合成 DeviceMotionEvent/OrientationEvent dispatch + 阈值逻辑函数化探针。
- **坑66** null 帧必跳过（(null||0)=0 → 偏基线 9.8 误判）；阈值写偏离量 |mag-9.8| 非绝对值。
- **坑67** 阈值推导先算量纲（z*z0≈±96 写成 ±625 = 永不触发）。
- **坑68** fake media device 的 RMS 是间歇脉冲不可测音频链——挂 window._xxRef 钩子 mock getByteTimeDomainData。
- **坑69** mock AudioAnalyser 必须设 window._xxAnalyserRef + fftSize（漏 fftSize = NaN 毒化频段 idx 全链）。
- **坑70** 「此刻最该做」类时段规则验证必须显式传 hour 或 hook Date（沙箱深夜时钟骗过一轮：22 点深夜规则接管，白天场景全假阴性）。
- **坑71** 体感「存在时间短」≠ timeout——先查重现 flag。
- **坑72** switchTab 假 key 假绿——'tw' 非 tab key（真 key=today/cn/wu/al/cal/grow/health），不抛错返回 undefined，必须验 DOM 效果。
- **坑73** switchSec 是两参签名 (page, sec)，单参静默无效。
- **坑74** 测试场景自身也审查量纲/时间维度（CV 传间隔当时间戳；防抖测试两次 evaluate 全落 120ms 窗内 = 行为对场景错）。
- **坑75** 排盘按钮无 id 一律 onclick 直调 window.calcBazi/calcWuge/calcGongzhen；排盘类验证必须显式 set 表单再 calc（mock 档案 ≠ 表单值，fillFormWithProfile 有时序）。
- **坑76** 档案 mock 必须 playwright addInitScript 在 boot 前塞（getActiveProfile 读内存态，localStorage 直塞无效；传语句块非箭头函数值）。
- **坑77** python replace 长行拼接会把锚后原行尾部重复拼上——整行匹配或 replace 后整行读回。
- **坑78** CLI 写入必须回读验证（错误语法被 `||echo` 吞掉）。

## 数据与天文

- **坑79** 天文/数值内核上线必须逐天体对照权威星历——物理不变量（金星距日≤47°/水星≤28°）是免费单测（planetGeo 减号 = 内行星错 11 天）。
- **坑80** 外网星历下载失败时 web_search 权威换座表 + python 复刻双符号对比定案。
- **坑81** mock 档案 ≠ 排盘表单值（fillFormWithProfile 时序）——排盘类验证显式 set 表单再 calc。
- **坑82** 虚岁/周岁/年三元转换点显式注释（startYear=PY+虚岁 = 整体后移 1 年的 off-by-one 源）。
- **坑83** 跨模块星座名统一去「座」尾再比较。
- **坑84** REINJ 断言计数先 rg 实测（想当然计数 = false 吓人但无害）。
- **坑85** 命名 def/call 成对断言（_koujiRender ≠ _kjRender 笔误 rg 计数当场抓）。

## 发布与 CDN

- **坑86** Pages 部署队列卡死（push 后 25 分钟不出、last-modified 停旧版）——空 commit kick 两次 3 分钟生效，已成标准动作。
- **坑87** 升版三件套断言对象 = sw.js(CACHE) / app.js(BUILD) / index.html(徽章) 各验各的。
- **坑88** CDN 边缘可能 index 新 / 旧文件交错——关键符号在哪个产物文件就验哪个文件。
- **坑89** python re.search 读真实字节判别，完全绕开 rg 显示层吞字符（坑31 判别法升级版）。
- **坑90** 升级已存在注入块时 already 检测必须用块级唯一特征（块头注释/init 函数名），用新增内容特征 = 旧块漏检重复注入。
- **坑91** 验证正则按实际分支文案写，断言前先看被测字符串本身。
- **坑92** terser 引号统一（产物断言单引号 0 命中 ≠ 没落盘——先看双引号转写形态再判，假阴性不慌）。
- **坑93** 「注释与实现不一致」是独立债种：SW 注释写 network-first/SWR 实为「缓存命中也 await 一次网络往返」（2026-11-09 外测实锤）——复核代码路径，永远不信注释。
- **坑94** 知识必须在仓库内：账本/build 脚本在仓库外 = agent 每轮开局失忆，修过的 bug 复发（本条即本文件存在的原因）。

## 2026-11-09 基建改造新增（95+）

- **坑95** 内容哈希构建（app.<hash8>.js）：SW CACHE 版本由 build.js 注入哈希——漏升版本号物理不可能；哈希资源 cache-first（URL 即版本），index.html 与其余静态 SWR 秒回 + 后台刷新。
- **坑96** app.js 旧文件名是兼容产物：过渡期双产（新 index 引哈希版，旧缓存 index 引 app.js），下一版删。

# 渲染与 DOM

> 本文件为分域账本，索引与必读集见 [docs/pitfalls.md](../pitfalls.md)。新坑追加到末尾，编号递增。

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

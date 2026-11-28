# 判别与验证

> 本文件为分域账本，索引与必读集见 [docs/pitfalls.md](../pitfalls.md)。新坑追加到末尾，编号递增。

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

- **坑95** 内容哈希构建（app.<hash8>.js）：SW CACHE 版本由 build.js 注入哈希——漏升版本号物理不可能；哈希资源 cache-first（URL 即版本），index.html 与其余静态 SWR 秒回 + 后台刷新。
- **坑96** app.js 旧文件名是兼容产物：过渡期双产（新 index 引哈希版，旧缓存 index 引 app.js），下一版删。
- **坑100** 大重构前先做「引用矩阵×体量分布」量化勘察：Block1 深拆勘察结论=617 函数长尾无巨块、聚类外部引用 47~163 处耦合密——**量化否决白做**（_traceCall 的"16KB"还是区间切分假象）。重构决策以数据为准，不以「大」直觉为准。

- **坑151b·contrast 的子签盲区**：视觉/对比度扫描只 switchTab 到 7 个顶层 tab——sub-sec 子签深处的浅底卡（坑125 家族高发地）永远不被扫到，零隐形是假绿。修法：每 tab 切换后把该页全部 .sub-sec 临时展开再扫；反向验证证明扫描器活性（注入坏节点必抓）。

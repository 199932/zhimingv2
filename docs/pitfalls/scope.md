# 命名与作用域

> 本文件为分域账本，索引与必读集见 [docs/pitfalls.md](../pitfalls.md)。新坑追加到末尾，编号递增。

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

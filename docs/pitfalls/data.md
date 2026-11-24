# 数据与天文

> 本文件为分域账本，索引与必读集见 [docs/pitfalls.md](../pitfalls.md)。新坑追加到末尾，编号递增。

- **坑79** 天文/数值内核上线必须逐天体对照权威星历——物理不变量（金星距日≤47°/水星≤28°）是免费单测（planetGeo 减号 = 内行星错 11 天）。
- **坑80** 外网星历下载失败时 web_search 权威换座表 + python 复刻双符号对比定案。
- **坑81** mock 档案 ≠ 排盘表单值（fillFormWithProfile 时序）——排盘类验证显式 set 表单再 calc。
- **坑82** 虚岁/周岁/年三元转换点显式注释（startYear=PY+虚岁 = 整体后移 1 年的 off-by-one 源）。
- **坑83** 跨模块星座名统一去「座」尾再比较。
- **坑84** REINJ 断言计数先 rg 实测（想当然计数 = false 吓人但无害）。
- **坑85** 命名 def/call 成对断言（_koujiRender ≠ _kjRender 笔误 rg 计数当场抓）。

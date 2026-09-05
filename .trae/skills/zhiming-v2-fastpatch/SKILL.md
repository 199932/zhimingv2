---
name: "zhiming-v2-fastpatch"
description: "知命V2 单文件大前端批量迭代加速：锚点扫描、倒序批量注入补丁、Chrome83兼容沙箱全量验收。用户要求给知命/知命V2加功能、改算法、调UI、扩数据、修bug时立即调用。"
---

# 知命V2 快速补丁 Skill

## 目标
把"给知命V2.html加新功能/修bug"从原先 Grep→Read→Edit→写验证脚本的线性 N 次往返，压缩为 **1 build → 1 apply → 1 verify** 共 3 条命令、≤30 秒完成。

## 触发时机（必启）
以下任一情况发生，**必须第一时间调用本 skill，不要再走手工 Edit/Grep/Read 循环**：
1. 用户说：给知命 / 知命V2 / 知命.html / 知命V2.html 加任何功能；
2. 用户说：改 / 调 / 优化 / 修复 / 修 / patch / 打补丁；
3. 用户贴异常报告（ReferenceError / TypeError / 白屏 / 按钮点了没反应）；
4. 用户要加新模块、新算法、新 tab、新 section、新样式主题。

## 固定工作流（3 步 + 可选预览）

### Step A — 先确认目标文件 & 锚点扫描
```
node accel/make_fast_patch.js build 知命V2.html
# 产物：知命V2.html.anchors.json（锚点列表，line/key/type=fn|mark|unique-line）
```
- 挑锚优先级：**type=fn**（function 声明，唯一稳定）> **type=mark**（Phase/Step/MARK/ANCHOR 注释） > **type=unique-line**（空格影响可能导致失效，慎用）。
- 若需要的注入点附近没有好锚，可在 apply 前先做一次性微小 Edit 插入 `/* MARK: <模块名> anchor */`，然后重新 build。

### Step B — 写补丁并批量注入
补丁写在 `accel/patches/<模块id>.json`，每个对象 schema：
```json
{ "id":        "p3-wu5-crystal",
  "anchor":    "function drawRunes(theme){",
  "insert":    "before | after | replace-anchor | replace-line",
  "code":      "/* 要注入的完整代码块 — 会原样插入，自己处理缩进和换行 */\n",
  "required":  true }
```
- 多个补丁合并成 `accel/patches_bundle_all.json`（顶层数组）。
- **关键原则**：补丁 anchor 按"文件里从尾到头"排序执行，自动避免前面插入导致后续 anchor 找不到 —— `make_fast_patch apply` 内置倒序。
- 注入：
```
node accel/make_fast_patch.js apply 知命V2.html accel/patches_bundle_all.json
# 产物：知命V2.patched.html，带 Δ=+xxx bytes
```
- 如果补丁要求 `insert: replace-line` 且锚点横跨多行，请改用 unique-line 或在原文件补一次性 MARK 注释锚。

### Step C — 轻量全量验收（≤5 秒出结果，exit 0 才交付）
```
node accel/make_fast_patch.js verify 知命V2.patched.html \
     --must=新函数1,新函数2,新函数3 \
     --strings=入口id_a;入口id_b;按钮data-x
```
- `--must` 列出新挂 window 的符号名，**阈值自动 ≥90% 且 ≥30 个**（不足 30 时取 90%）；
- `--strings` 列出必须存在于 HTML 的关键字符串（HTML id / class / 入口按钮文本 等），分号或逗号都行；
- 必查三件套：①JS 语法 SyntaxError × ②入口字符串存在 × ③vm 沙箱挂窗。其中沙箱**已预置 Chrome 83 WebView 兼容桩**（btoa/atob/Blob/URL/serviceWorker/Notification/localStorage/DOM 最小化占位），和线上真机行为一致。
- 若仍有失败，直接在沙箱里按缺失符号反查 IIFE early return → 用"先挂 noop / 独立 fallback 入口再重写 wrapper"修（这次 `__renderPatternGraphV2` 的经典解法）。

### Step D（可选）— 启动预览交付
```
python3 -m http.server 8765 --bind 0.0.0.0
# 然后 OpenPreview http://localhost:8765/知命V2.patched.html
```

## Chrome 83 WebView 兼容的 4 条铁律（新功能必须遵守）
违反任何一条，真机 90% 概率抛 `ReferenceError: xxx is not defined`：
1. **函数声明后立即挂 window**：`function X(){…} try{ window.X=X; }catch(_){}`
2. **所有全局 `let / const` 业务变量改为 `window._xxx` 初始化**，并用 `\b_xxx\b` 正则把引用全替换成 `window._xxx`
3. **IIFE 里的 early return 前先赋值 window**（`__renderPatternGraphV2` 教训：即便原函数不存在，也要挂 noop/fallback 独立入口）
4. **DRAFT_FIELDS / 配置对象里的 onChange 函数引用必须改成字符串**，运行时 `window[onChangeStr](...)` 延迟调用；不要提前求值。

## 体积 & 结构约束
- 单文件 `知命V2.html` 总大小 **≤3MB**（硬上限，超过必须压缩 SVG/星点 for 循环或换更紧凑字符串拼接）；
- 新 type 入库必改 2 处：`TYPE_LABEL.<type>` + `HIST_TYPE_COLOR.<type>`，否则历史页不显示标签、图谱聚类配色为空。
- 新功能入口：按钮/卡片带 `onclick="window['fnName']()"`（不要直接写裸函数名，兼容 Chrome 83 WebView）。

## 异常报告 → 30 秒定位速查
拿到用户贴的 `=== 知命V2 异常报告 ===`：
1. 看 **错误** 行的函数名 F；
2. `Grep -n "function F\b"` → 找到声明位置；
3. 看声明后面 3 行有没有 `try{window.F=F}catch(_){}`，没有 = 立即补上；
4. 看 F 里面引用的全局变量名 V 是 `_xxx` 形式 —— 查前 50 行里有没有 `window._xxx = …`，没有 = 变量作用域隔离 bug，按铁律2修；
5. 如果 `onclick=xxx` 在 HTML 属性里，xxx 必须已挂 window（挂了还报 = 挂 window 的位置在调用之后，移到挂 PRE 数组里）。

## PRE 快速挂载协议
文件开头有一个 IIFE 内 `PRE` 数组（`const PRE = [fnName1, fnName2, ...]` → `for(const f of PRE) try{window[f.name]=f;}catch(_){}`），新增函数时**直接加进数组**比分散 `window.F=F` 可靠，因为 PRE 在 init() 前集中执行。

## 不要做的事
- ✗ 不要手工 `Edit` 文件体做 5 处以上的改动，改之前先打补丁 JSON，能走 apply 绝不走 Edit；
- ✗ 不要在 `new Function()` 验证通过后就交付，必须走 vm+DOM stub 的 verify；
- ✗ 不要把补丁 anchor 选在 1-2 行的短注释后面；选 20+ chars 唯一字符串更稳；
- ✗ 不要让 apply 失败后继续 deliver（`required:true` 缺失会直接抛 Error，不要把 required 全改成 false）。

## 交付前自检清单（每条 ✅ 才能给用户）
- [ ] `node accel/make_fast_patch.js verify ...` exit=0
- [ ] 新增功能对应的 HTML 入口字符串都在 `--strings` 里且 ✅
- [ ] 新增符号都在 `--must` 且挂窗 100%（不满足 ≥90% 就查上面 Chrome 83 铁律）
- [ ] 体积 ≤3MB（`ls -la` 一眼看）
- [ ] python3 http.server 已开 + OpenPreview 链接可用

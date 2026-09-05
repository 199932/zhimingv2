---
name: "zhiming-v2-error-fix"
description: "知命V2 异常报告 30 秒快速定位并修复：ReferenceError/TypeError/白屏/按钮无反应。用户贴「知命V2 异常报告」文本或图片里的信息时立即调用；配合 zhiming-v2-fastpatch 做批量补漏+验收。"
---

# 知命V2 异常报告快速修复 Skill

## 触发条件（用户一旦贴了以下内容，**必须先启用本 skill**，不要按一般 bug 去排查）
- 完整的 `=== 知命V2 异常报告 ===` 块（含 Build / Time / UA / 错误 / 位置 / 堆栈 / 最近上下文）；
- 口头描述但含关键信息："报 `ReferenceError: xxx is not defined` 在 Chrome 83 WebView 上"；
- "白屏 / 按钮点了没反应 / tab 切不过去 / 生成分享卡报错 / 点流派弹窗没反应" 等运行时问题；
- 你自己在 final_verify / make_fast_patch verify 里发现 ❌ 缺失符号 / ❌ 自检有 FAIL marker / ❌ SyntaxError。

## 先读异常报告，提炼 5 个结构化字段（必须记下来）
从异常报告里提取：

| 字段名 | 提取方式 | 作用 |
|---|---|---|
| `BUILD` | `Build: vX.Y.Z-yyyymmdd` 后半段数字 | 确定你修的是哪版文件，避免改错旧版本 |
| `UA` | `UA: ... Chrome/xx.x ...` | **关键**：Chrome 83.0 WebView = 作用域隔离模式；Chrome ≥95 = 正常 |
| `ERR_MSG` | `错误 : ... 信息 : ERR Uncaught <Type>: <Msg>` 中的 `<Type>` 和 `<Msg>` | 判定 Error 类型 |
| `SRC_LINE` | `信息` 行最后 `|<行号>|<列号>|` + `位置` 行，或堆栈最后一行 | 定位文件内具体行 |
| `RECENT_CTX` | `最近上下文: [N] <kind> <fn> @<时间>` 最后几条 | 找到失败前调用链 |

## 诊断决策树（按优先级自上而下，命中即修）

### 【A】类型 = ReferenceError（90% 概率命中）

#### A1. 消息形如 `xxx is not defined`，xxx 是**函数名**
→ 根因：Chrome 83 WebView 作用域隔离导致 `function xxx(){}` 没自动挂 window 或 HTML 属性 onclick 提前求值。
1. `Grep -n "^function xxx\b"` → 找声明行 L；
2. 看 L 之后 **3 行内**是否存在 `try{ window.xxx=xxx; }catch(_){}`；
3. 不存在 → **立即追加**，并把该函数加入文件开头的 `PRE` 数组（若 PRE 数组存在）；
4. 若错误位置在 `DRAFT_FIELDS.<x>.onChange`、`OPTIONS.<x>.validate` 这类对象字段：把函数引用改成字符串 `"xxx"`，调用侧用 `window[onChangeStr](arg)` 延迟求值（本次 onGzCityChange 的根因）。

#### A2. 消息形如 `_xxx is not defined`，_xxx 是**带下划线的短变量**
→ 根因：Chrome 83 WebView 中 `HTMLDocument.init / onclick` 回调里访问不到后声明的 `let / const _xxx`。
1. `Grep -n "let _xxx\b\|const _xxx\b\|var _xxx\b"` → 所有声明行；
2. 把每个声明的 `let _xxx = ` 改成 `window._xxx = `（保留右值）；
3. `Grep -n "\b_xxx\b"` → 所有引用点，统计数量；
4. 用正则替换把 `\b_xxx\b`（排除字符串里的字面量、注释）全部变成 `window._xxx`；
5. 同组变量（`_activeProfileId / _profiles / _draft / _today / _viewState`）一次性扫 5+ 个；
6. 修完 `new Function(script)` 语法验证必过；然后跑 `make_fast_patch verify`。

#### A3. 消息形如 `renderWidget_xxx is not defined`，错误栈里有 `renderToday / renderXxx` 调用它
→ 根因：函数是"延迟声明"，但 renderToday 已被事件触发；或 PRE 数组 eval 访问顶层作用域失败（Chrome83）。
1. 找 `renderWidget_xxx` 声明；
2. 在声明后**立即**挂 window；
3. 把调用方的 `renderWidget_xxx(r)` 改成 `(window['renderWidget_xxx']||function(){return '';})(r)`；
4. 同类 `renderWidget_5score/renderWidget_almanac/renderWidget_weather`… 8 个一起检查，保证全覆盖。

#### A4. 新模块里的函数（你之前刚刚注入的）报 `is not defined`
→ 根因：注入锚点选错 → 代码被塞进某个函数体内，形成作用域嵌套（本次 `_shareCardBgSVG` 教训）。
1. `Grep -n "^function _shareCardBgSVG"` → 看声明行的前 10 行是否在 `{ … }` 里面太深；
2. 数前 10 行的 `{` 和 `}` 差值；若不平衡就是嵌套；
3. **移到顶层作用域**：放在 `/* MARK: PRE IIFE before */` 或 `</script>` 之前那一段最稳妥；
4. 移完重新挂 window。

---

### 【B】类型 = TypeError
常见 3 种：
- **`Cannot read properties of null (reading 'innerHTML' / 'parentNode' / 'classList')`** → DOM 元素还没生成就被调用了。修法：调用前加 `const el = document.getElementById('x'); if(!el) return;`。
- **`xxx is not a function`** → 你以为是函数的符号实际被赋值成 object/string。用 `Grep -n "window.xxx ="` 看最近一次赋值是否是函数。
- **`Cannot read properties of undefined (reading '0' / '1' / 'length')`** → 排盘算法返回空数组但下游没判空。修法：`(arr||[])[0]` 或 `if(!arr || !arr.length) return fallback`。

---

### 【C】类型 = SyntaxError
- 说明注入的补丁代码缺括号/逗号/引号；
- 直接跑 `node -e "new Function(require('fs').readFileSync('知命V2.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1])"` 定位行号；
- 回滚最后一次 apply，重审 patch.code 是否有遗漏的 `}`。

---

### 【D】"按钮点了没反应" / "tab 切过去白屏" 无异常报告
1. 先检查 HTML 属性 onclick 的函数是否在 window：`Grep -n "onclick=\"xxx("` → 取 xxx → 查 `typeof window.xxx === 'function'`；
2. 若函数名没挂 → 按 A1 修；
3. 若挂了还不行 → 进函数体内第一行加 `console.trace()` 或在沙箱里 `ctx.window.xxx()` 手动调看 throw；
4. 常见二级错误：函数内部访问 `localStorage` 失败（沙箱里需 stub）或 `querySelector('#x')` 返回空（元素因为 PRE 数组阶段还没生成 HTML 结构）。

## 修复后的强制验收
每修完 **≤2 分钟内**必须跑完 3 个命令（用另一个 skill：zhiming-v2-fastpatch）：

```bash
# 1) 语法
node -e "new Function(require('fs').readFileSync('知命V2.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1])" && echo SYNTAX_OK

# 2) 挂窗（把刚修的函数名/变量放进 --must）
node accel/make_fast_patch.js verify 知命V2.html \
  --must=onGzCityChange,renderWidget_5score,_activeProfileId,__renderPatternGraphV2 \
  --strings=liupaiModal;diaryModal;page-cal

# 3) 完整大验收
node accel/final_verify.js
```
- `final_verify.js` 的 exit code 必须 = **0**；
- 若只剩挂窗单项不通过 → 按 A4 查"是不是塞进 IIFE 里了"；
- 若 `runInlineSelfCheck` 含 FAIL/ReferenceError → 进自检日志定位排盘模块（一般是边界年 1989/2000/2024 节气问题或空数组越界）。

## 交付形式
修完不要只说"修好了"，要说：
1. 根因一句话（A1/A2/A3/A4/B/C/D 哪类，哪个变量哪个函数）；
2. 修了哪些文件哪个范围（行号区间）；
3. final_verify 的 exit code = 0 截图或最后几行；
4. 预览地址（http://localhost:8765/知命V2.html，若 8765 没起就 `python3 -m http.server 8765`）。

## 速查表：本项目历史上出现过的坑（一键套用）
| 错误 | 根因分类 | 修复模板 |
|---|---|---|
| `onGzCityChange is not defined @ DRAFT_FIELDS.onChange` | A1+DRAFT_FIELDS | onChange 改为字符串 `"onGzCityChange"`；调用侧 `window[v.onChange]?.(newVal)`；8 个关联函数挂 PRE |
| `renderWidget_5score is not defined @ renderToday` | A3 | 8 个 renderWidget_* 声明后立即挂 window；renderToday 调用改 `window['fn']||()=>''` |
| `_activeProfileId is not defined @ HTMLDocument.init` | A2 | 5 个 `let _xxx` 改 `window._xxx = `；全文件 58 处 `\b_xxx\b` 替换为 `window._xxx` |
| `_shareCardBgSVG is not defined` 但代码里明明有 | A4 | grep 前 10 行确认嵌套；搬到 `/* PRE IIFE */` 顶层前；挂 window |
| `__renderPatternGraphV2 is not defined` vm 沙箱缺 | A1 + early return | IIFE 开头先 `window.__renderPatternGraphV2 = noop`，分支里再重写 wrapper/renderOnly |

## 禁止事项
- ✗ 不要在 `console.log`、注释里改一堆无关东西混淆 diff；
- ✗ 不要一次叠 2 个以上 unrelated 修复，一个异常报告 → 一组提交型改动；
- ✗ 不要跳过 final_verify 直接交付（Chrome 83 真机坑 90% 是沙箱能查到的）；
- ✗ 不要把 `let/const` 继续用于跨回调的全局变量，一律 `window._xxx`。

---
name: "zhiming-v2-algo-selfcheck"
description: "知命V2 算法自检异常清单极速修复：定位L90xx断言行、D/A/B类根因最小补丁、补兼容字段/双入口模式，跑语法+vm断言+final_verify三联验收。用户贴「算法自检异常清单」含失败条目或口头提XLR/QM/Tarot自检失败时立即调用，是zhiming-v2-error-fix的算法专用分支。"
---

# 知命V2 算法自检异常清单极速修复 Skill

（本 Skill 是 `zhiming-v2-error-fix` 的算法断言专用分支：前者处理运行时 ReferenceError/TypeError/白屏，本 Skill 处理「runInlineSelfCheck 算法自检模块」输出的 FAIL 条目——两者不要混用。）

## 触发条件（用户一旦出现以下任一，**必须先启用本 Skill**）
1. 贴出完整 `=== 知命V2 算法自检异常清单 ===` 块（含 Build / Time / UA / 失败条目数 / [N] 名称 + 实际 + 期望）；
2. 口头出现「算法自检没过 / 清单里还有几条失败 / 自检 FAIL 标红」且提到 `XLR / QM / 奇门 / Tarot / 塔罗 / 小六壬 / 八字 / Bazi / 大六壬 / DLR / 梅花易数 / MHY / 紫微` 等算法模块关键词；
3. `final_verify.js` 的 `runInlineSelfCheck` 段检测到 FAIL marker 且不是 ReferenceError（若是 ReferenceError→直接走 zhiming-v2-error-fix）。

## 先读清单，提炼 4 个结构化字段

| 字段名 | 提取方式 | 作用 |
|---|---|---|
| `BUILD` | `Build : vX.Y.Z-yyyymmdd` 末尾 8 位日期 | 锁定正在迭代的源文件版本（必须和磁盘 `知命V2.html` 一致，否则问用户是否要把磁盘代码覆盖更新到清单 Build） |
| `FAIL_COUNT` | `失败条目数: <N>` | 控制改动粒度：≤2 条用 Edit 直接补；≥3 条走 `zhiming-v2-fastpatch` 打包 |
| `FAIL_ITEMS[]` | 每个 `[N] <名称>` 块，取「实际」「期望」 | `name` 映射到断言位置（见下表），`actual` / `expected` 用正则判断模式 |
| `UA_CHROME` | `UA: ... Chrome/(\d+)` 主版本号 | 若 ≤ 83：修复方案中函数**必须显式 `window.xxx = xxx`**，且变量一律避免 `let/const` 顶层延后访问 |

## 第一步：定位「断言位置」——从失败名称反推 L90xx 代码行

`runInlineSelfCheck` 集中在 `/workspace/知命V2.html` 第 8960–9080 行区间（以 `pushFail(` 为唯一锚点）。拿到 `FAIL_ITEMS[i].name` 直接 `Grep -n "pushFail('<name>'"` 即可得到**断言条件本身**，这是「期望」的权威来源——永远不要凭"我觉得应该返回什么"改算法，必须按文件里的断言条件改。

常见条目对照表（固化历史修复，命中可直接走对应流程）：

| 失败名称 | Grep pushFail 参数 | 断言条件原文要点 | 最常见根因分类 |
|---|---|---|---|
| `XLR basic` | `'XLR basic'` | `!r \|\| !r.daxian \|\| !/^(大安\|留连\|速喜\|赤口\|小吉\|空亡)$/.test(r.daxian)` → **期望 r.daxian ∈ 六神** | D 类：包装器拦截直调传参 / 函数无返回对象（不是算法不输出，是函数返回 undefined） |
| `QM calc` | `'QM calc'` | 先 `try/catch`，若 `err`→失败；**再**校验 `q.ju` regex 和 `q.pan typeof` → **期望 err==null 且 ju 形如「阳三」** | A1 类主函数漏声明变量（如 `__lp`）；D 类包装器 DOM 校验拦截对象传参 |
| `QM:<year>` | `'QM:<year>'`（如 `QM:2024`） | `!q \|\| !q.ju \|\| ... \|\| !q.pan \|\| typeof q.pan!=='object'` → **期望 ju+pan 两字段同时存在** | 纯算法 `qimenCalc()` 返回结构和断言不匹配（juNum/dun 散列未合成 `ju`；九宫散列未聚合 `pan`）→ 需补**兼容字段层** |
| `Tarot:draw3` | `'Tarot:draw3'` | `t=drawTarot(3); if(!Array.isArray(t)\|\|t.length!==3)` → **期望返回 length=3 的数组** | D 类：函数零参 DOM 事件签名，不接受参数、也无 `return` |
| `Tarot:draw3 schema` | `'Tarot:draw3 schema'` | `t.some(c=> !(c && typeof c.name==='string' && typeof c.reversed==='boolean'))` → **每张牌必须含 name:string + reversed:boolean** | `shufflePick` 只构造 `{id, reversed}`，漏从 `TAROT_DATA[id].name` 挂 name 字段（下游用 t.name 取中文名） |
| `Bazi 1989` / `Bazi <YYYY>` | `'Bazi <YYYY>'` | `b.pillars[0..3].gz` 各等于预期字符串 → **四柱干支精确匹配** | 节气时间分辨率不够（只用 Day 未用到小时 JD）→ 节气前/后日当天出错 |
| `DLR basic` | `'DLR basic'` | 天盘/地盘/四课/三传 9 宫非空 | 包装器拦截传参 + 历史 `daliurenCalc()` 纯函数返回 shape 与断言聚合键不一致 |
| `Meihua basic` | `'Meihua basic'` | 本卦/互卦/变卦 三卦 hexagram code 合法 + 动爻 1..6 | 梅花易数起卦函数的「动爻」输出字段名与断言 `dongYao` 不一致 → 补兼容字段 |

## 第二步：诊断决策树（按 D → A → C 的优先级命中即修）

### 【D】签名 / 结构不匹配（60% 概率，自检最多发）
自检模块用"直调传参"方式调用排盘函数，用户交互走"读 DOM 渲染"。大多数算法函数的默认签名是**零参 DOM 事件回调**，导致：
- (D1) **参数传不进去**：包装层 `window.xxx = wrap(orig)` 里硬编码了 `_readXLR()` 之类的 DOM 校验，没有「对象参数→绕过 DOM」分支；
- (D2) **函数无返回值**：DOM 事件函数把结果写 innerHTML / appendChild，忘了 `return resultObj`；
- (D3) **返回 shape 和断言不兼容**：核心算法返回散列字段（`dun`+`juNum`、`tianpan/bamen/dipan`），断言期望聚合键（`ju="阳三"`、`pan={tianpan,bamen,dipan,...}`）。

**修复三板斧：**
1. **双入口包装器**（修 D1）：在 PRE IIFE 层的 `window.calcXxx` 函数开头插入对象参数探测：
   ```js
   const a = arguments[0];
   const isDirect = (arguments.length>=1) && a && typeof a==='object' &&
     (!isNaN(+a.year) && !isNaN(+a.month) && !isNaN(+a.day) && !isNaN(+a.hour));
   if(!isDirect && !_readXxx()){ showToast('输入非法','warn'); return; }
   return _o.apply(this, arguments);
   ```
   对应探测键按模块替换：XLR→`month,day,hour`，Bazi→`year,month,day,hour,gender`，Meihua→`question`，DLR→`year,month,day,hour`。
2. **主函数显式 return**（修 D2）：计算逻辑末尾先生成 `const resultObj = {所有断言需要的键}`，`if(isDirect) return resultObj;`，**DOM 渲染后也再 `return resultObj`**（双保险）。
3. **兼容字段层**（修 D3）：在**调用纯算法**之后、`_lastXxxResult=r` 之前**立即插入**：
   ```js
   // 补 ju: 阴阳+中文数字 合成键
   if(r && r.juNum!==undefined && !r.ju){
     const _JU_CN = ['','一','二','三','四','五','六','七','八','九'];
     r.ju = (r.dun==='YANG'?'阳':'阴') + (_JU_CN[r.juNum] || String(r.juNum));
   }
   // 补 pan: 九宫散字段聚合对象
   if(r && r.tianpan && !r.pan){
     r.pan = { tianpan:r.tianpan, bamen:r.bamen, dipan:r.dipan, bashen:r.bashen, tianpanXing:r.tianpanXing, tianpanGan:r.tianpanGan };
   }
   ```
   其它模块同理：从散字段合成断言期望的聚合键。**只加不减**——不删除现有顶层键，避免下游 render 回归。

### 【A】主函数漏声明变量（25% 概率，Qimen / 奇门相关多发）
自检调用是纯 JS 环境，没有 `onclick 事件延迟执行`，这会让函数体内对未声明变量的引用**立即抛 ReferenceError**（用户 DOM 模式下可能被 try/catch 吞了而看不到）。
- 典型如 QM：`__lp`（流派配置常量）、`DEFAULT_LIU_PAI`（无流派 fallback）。
- 修复：在 `function calcXxx()` 开头，参考**同级算法**（如 `calcBazi`）和**纯算法内**（如 `qimenCalc`）的用法补上：
  ```js
  function calcQimen(){
    const __lp = (typeof window.getLiupai === 'function') ? window.getLiupai() : DEFAULT_LIU_PAI;
    // ...
  }
  ```

### 【C】数据生成函数的返回 shape 缺字段（15% 概率，Tarot / 随机抽选类多发）
断言在**数组元素级别**要求某个字段（如 `card.name`），但构造函数（如 `shufflePick`）当初是只供 DOM 渲染 SVG 的最简版本，少挂了字段。
- 修复：在数据构造 map 里，从权威数据表（如 `TAROT_DATA[id]`）补取缺失字段：
  ```js
  return picked.map(id=>{
    const t = TAROT_DATA[id];   // 权威数据源
    return { id, name: t ? t.name : ("牌"+id), reversed: Math.random()<0.4 };
  });
  ```
  **权威数据源优先**——不要手写中文映射表，避免和页面内实际使用的名称不一致。

## 第三步：三联验收（每个修复块 2 分钟内必跑）

用 `RunCommand` 一条命令把三段用分号串起来，避免上下文切换。

### (1) 语法检查（零容忍）
```bash
node -e "new Function(require('fs').readFileSync('知命V2.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1])" && echo SYNTAX_OK
```
若 SyntaxError，**立即回滚最后一次 Edit**，检查是否遗漏逗号/括号或引入了 TypeScript 标注（`as any` / `: any[]` 一律禁止出现）。

### (2) VM 沙箱"断言行对齐"验证（核心）
用 Node `vm.createContext` 启动**最小 DOM stub**（关键：给 `querySelectorAll` 返回的假 NodeList 补 `Symbol.iterator`，否则 `for...of btns` 会抛 `btns is not iterable` 假阴性；`localStorage._m` 给 Map 兜底），然后**直接把 fail 列表里的失败条目按断言行原文写断言**，输出 PASS/FAIL：
- XLR：`const x = window.calcXiaoliuren({month:1,day:1,hour:11}); assert.ok(['大安','留连','速喜','赤口','小吉','空亡'].includes(x.daxian))`
- QM：`const q = window.calcQimen({year:2024,month:2,day:4,hour:10,dontSave:true}); assert.match(q.ju, /^[阴阳][一二三四五六七八九]$/); assert.equal(typeof q.pan, 'object')`
- Tarot 数量：`const t = window.drawTarot(3); assert.equal(t.length, 3)`
- Tarot schema：`assert.ok(t.every(c => typeof c.name==='string' && typeof c.reversed==='boolean'))`

断言**必须用 pushFail 原文对应的逻辑**，不能自造（比如 ju regex 就必须是那串中文数字枚举的 regex，不能简单非空）。如果断言失败但语法 OK → 说明修错了字段名/层级，回到第二步决策树再定位。

### (3) 全量验收
```bash
node accel/final_verify.js
```
- 要求 exit code = **0**；
- `新函数/常量挂 window` 必须 ≥ 30/33（若挂窗项减少，按 zhiming-v2-error-fix A1/A4 查是不是把函数塞错了嵌套作用域）；
- `runInlineSelfCheck` 的输出可以有 FAIL marker，但只能是"沙箱 stub 不完整"造成的假阴性（比如 `btns is not iterable`）——这一点通过 (2) 里的 vm 自定义断言 PASS 即可确认；若 final_verify 中的 self-check 有 ReferenceError → 走 zhiming-v2-error-fix A 系列处理。

## 第四步：交付（四件套，不说"修好了"）
1. **根因一句话**：D/A/C 哪类 + 哪个函数/哪个字段；
2. **修改范围**：文件路径 + 行号区间（用 [display_name](file:///abs/path#Lstart-Lend) 可点击链接），改动几处；
3. **三联验收结果**：贴 vm 断言的 PASS 清单 + final_verify 最后 8 行（含 `ALL PASSED ✓` / `exit 0` 行）；
4. **预览 URL**：先 `curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8766/知命V2.html` 确认服务存活，再 `OpenPreview` 交付 `http://localhost:8766/知命V2.html`，并提示用户「清缓存刷新一次」才能看到清单清零。

## 严格禁止项
- ✗ 不要修改 `runInlineSelfCheck` 的断言条件来"凑 PASS"——永远修算法/包装层，不改裁判；
- ✗ 不要删除纯算法原返回的散列顶层键（juNum/dun/tianpan/bamen 等下游 render 在用），只能**追加**兼容字段；
- ✗ 不要引入 TS 类型标注（`as` / `?:` / `: type`），本项目是纯 JS；
- ✗ 不要一次叠三个以上不相关模块的改动；FAIL_COUNT ≥ 3 时必须用 `zhiming-v2-fastpatch` 打包多个独立 patch 再一次性注入，避免手动 Edit 串冲突；
- ✗ 不要省略三联验收里的"断言行对齐 vm 验证"——final_verify 的 self-check 在沙箱里会因 stub 不全漏报/误报，自定义断言才是真相。

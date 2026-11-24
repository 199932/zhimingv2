# 交互与传感器

> 本文件为分域账本，索引与必读集见 [docs/pitfalls.md](../pitfalls.md)。新坑追加到末尾，编号递增。

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

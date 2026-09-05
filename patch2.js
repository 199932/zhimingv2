const fs = require('fs');
const PATH = '/workspace/知命V2.html';
let html = fs.readFileSync(PATH, 'utf8');
console.log('Start size:', html.length);

// Fix 1: switchAlmanac wrapper - add ensureResultDebugToggle call after scrollToResult
const pat1 = /(setTimeout\(\)=>scrollToResult\('almanac-body'\), 50\);)/;
if (pat1.test(html)) {
  html = html.replace(pat1, "setTimeout(()=>{scrollToResult('almanac-body');ensureResultDebugToggle('almanac-body','黄历',0);}, 50);");
  console.log('Fix 1 applied: switchAlmanac debug toggle');
} else { console.log('WARN: Fix 1 pattern did not match'); }

// Fix 2: Add self-test console.logs at end of init() - after "草稿:" log and before the getComputedStyle block
const pat2 = /(_log\('草稿:'.*fillFromDraft === 'function'\);)/;
if (pat2.test(html)) {
  html = html.replace(pat2, `$1
  _log('错误拦截:', typeof showErrBox === 'function', typeof copyErrInfo === 'function');
  _log('算法自检:', typeof runInlineSelfCheck === 'function', typeof ZHIMING_BUILD !== 'undefined' ? ZHIMING_BUILD : '?');
  _log('函数签名完整性: calcBazi='+(typeof calcBazi)+' calcQimen='+(typeof calcQimen)+' calcMeihua='+(typeof calcMeihua)+' calcLingshu='+(typeof calcLingshu));
  _log('Debug浮标: ensureResultDebugToggle='+(typeof ensureResultDebugToggle)+' exportDebugTxt='+(typeof exportDebugTxt)+' _hash32='+(typeof _hash32));`);
  console.log('Fix 2 applied: self-test console logs');
} else { console.log('WARN: Fix 2 pattern did not match'); }

// Also, the user mentioned calcGongzhen/calcWuge/calcZhouyi function signature check is redundant but fine.

fs.writeFileSync(PATH, html, 'utf8');
console.log('Final size:', html.length);

// Re-validate syntax
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(m){
  const tmp = '/tmp/extracted2.js';
  fs.writeFileSync(tmp, m[1]);
  const {execSync} = require('child_process');
  try{ execSync('node --check '+tmp, {stdio:'inherit'}); console.log('✅ Syntax check still pass'); }
  catch(e){ console.log('❌ Syntax check failed'); process.exit(1); }
}
console.log('✓ follow-up patches applied');

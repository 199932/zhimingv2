/* 知命V2 构建脚本：src/index.html → 根产物（index.html + assets/app.js + assets/style.css）
 * 用法：node build.js
 * 维护流：改 src/index.html → node build.js → 提交（产物自动生成，勿手改根产物）
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src', 'index.html');
const ASSETS = path.join(ROOT, 'assets');
const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n');

// ---------- 1. 提取主样式块（行首 <style> 到缩进 </style>，跳过 boot 内联样式） ----------
let styleStart = -1, styleEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '<style>' && styleStart < 0 && i > 30) { styleStart = i; break; }
}
for (let i = styleStart + 1; i < lines.length; i++) {
  if (lines[i].trim() === '</style>') { styleEnd = i; break; }
}
if (styleStart < 0 || styleEnd < 0) { console.error('style block not found'); process.exit(1); }
const styleBlock = lines.slice(styleStart, styleEnd + 1).join('\n');
const styleInner = styleBlock.replace(/^\s*<style>/, '').replace(/<\/style>\s*$/, '');

// ---------- 2. 提取两个主 script 块（按行号锚：块1 常量区起、块2 Phase3 起） ----------
// 块定位：找行内容完全等于 '<script>' 的行（主块），及缩进 '  <script>'（Phase3 块）
const scriptBlocks = [];
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === '<script>' || t === '<script type="text/javascript">') {
    // 找闭合
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '</script>') {
        scriptBlocks.push({ start: i, end: j });
        i = j;
        break;
      }
    }
  }
}
if (scriptBlocks.length !== 2) { console.error('expect 2 main script blocks, got', scriptBlocks.length); process.exit(1); }
const jsParts = scriptBlocks.map(b => lines.slice(b.start + 1, b.end).join('\n'));

// ---------- 3. 组装 app.js ----------
const appJs = '/* 知命V2 应用脚本（由 build.js 从 src/index.html 生成，勿手改） */\n'
  + '/* ==== Block 1: 主逻辑 ==== */\n' + jsParts[0]
  + '\n/* ==== Block 2: Phase3 注入 & boot 移除 ==== */\n' + jsParts[1] + '\n';
fs.mkdirSync(ASSETS, { recursive: true });
fs.writeFileSync(path.join(ASSETS, 'app.js'), appJs);

// ---------- 4. 压缩 app.js（terser compress，不 mangle 保 onclick/全局名） ----------
let appOut = appJs;
try {
  const tmp = path.join(ROOT, 'assets', '.app.tmp.js');
  fs.writeFileSync(tmp, appJs);
  execSync('npx terser ' + tmp + ' -c passes=2 --ecma 2017 -o ' + path.join(ASSETS, 'app.js') + ' 2>&1', { cwd: ROOT, stdio: 'pipe' });
  fs.unlinkSync(tmp);
  appOut = fs.readFileSync(path.join(ASSETS, 'app.js'), 'utf8');
  console.log('terser ok:', (appJs.length / 1024).toFixed(0) + 'KB ->', (appOut.length / 1024).toFixed(0) + 'KB');
} catch (e) {
  console.warn('terser failed, fallback to raw:', String(e.message).slice(0, 200));
  // app.js 已是原始版
}

// ---------- 5. 压缩 style.css（去块注释+行尾空白+压缩空行） ----------
const css = styleInner
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim() !== '').join('\n');
fs.writeFileSync(path.join(ASSETS, 'style.css'), '/* 知命V2 样式（由 build.js 生成，勿手改） */\n' + css + '\n');
console.log('style.css:', (css.length / 1024).toFixed(0) + 'KB');

// ---------- 6. 改写 HTML ----------
let html = src.split('\n').join('\n');
// 6a. 主样式块 → link（保留行首缩进位置）
const styleLines = lines.slice(styleStart, styleEnd + 1);
html = html.replace(styleBlock, '<link rel="stylesheet" href="assets/style.css">');
// 6b. 两个 script 块：块1 位置放 app.js 引用，块2 整体删除
const b1full = lines.slice(scriptBlocks[0].start, scriptBlocks[0].end + 1).join('\n');
const b2full = lines.slice(scriptBlocks[1].start, scriptBlocks[1].end + 1).join('\n');
if (html.indexOf(b1full) < 0 || html.indexOf(b2full) < 0) { console.error('block replace miss'); process.exit(1); }
html = html.replace(b1full, '<script src="assets/app.js" defer></script>');
html = html.replace(b2full, '<!-- Block2 已合并进 assets/app.js -->');

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('index.html:', (html.length / 1024).toFixed(0) + 'KB');
console.log('BUILD OK');

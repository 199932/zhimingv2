/* 知命V2 构建脚本：src/index.html → 根产物（index.html + assets/app.js + assets/style.css）
 * 用法：node build.js
 * 维护流：改 src/index.html → node build.js → 提交（产物自动生成，勿手改根产物）
 * 2026-10-18: app.js 输出带 defer（性能优化 v2.34.0），产物后处理兜底防漏
 */
const crypto = require('crypto');
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
if (scriptBlocks.length < 3) { console.error('expect >=3 main script blocks (主逻辑/Phase3/养生/星盘...), got', scriptBlocks.length); process.exit(1); }
const jsParts = scriptBlocks.map(b => lines.slice(b.start + 1, b.end).join('\n'));

// ---------- 3. 组装 app.js（Block1+2 核心；Block3=mod-health、Block4=mod-chart、Block5~12=mod-extra 按需加载） ----------
const MODS = [
  ['health', 3, '/* 知命V2 养生调理模块（懒加载，勿手改） */\n'],
  ['chart',  4, '/* 知命V2 星盘模块（懒加载，勿手改） */\n'],
  ['extra', null, '/* 知命V2 附加模块合集（食单/睡前/合盘/小卡，懒加载，勿手改） */\n']
];
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

// ---------- 4b. 内容哈希产物 + mod 分块 + SW 注入 + sitemap lastmod（漏升版本号物理不可能） ----------
// mod 分块产物（各自 terser+hash）
const MOD_URLS = {};
for (const [mname, bidx, header] of MODS) {
  const src = header + (bidx ? jsParts[bidx-1] : jsParts.slice(4).map((p,i)=>'\n/* ==== Block '+(i+5)+': 附加 ==== */\n'+p).join(''));
  const tmpM = path.join(ROOT, 'assets', '.mod.tmp.js');
  fs.writeFileSync(tmpM, src);
  const mh = path.join(ASSETS, 'mod-' + mname + '.js');
  try {
    execSync('npx terser ' + tmpM + ' -c passes=2 --ecma 2017 -o ' + mh + ' 2>&1', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) { fs.copyFileSync(tmpM, mh); console.warn('terser mod-' + mname + ' failed, raw fallback'); }
  fs.unlinkSync(tmpM);
  const mtxt = fs.readFileSync(mh, 'utf8');
  const mhash = crypto.createHash('sha256').update(mtxt).digest('hex').slice(0, 8);
  const mout = 'assets/mod-' + mname + '.' + mhash + '.js';
  fs.writeFileSync(path.join(ROOT, mout), mtxt);
  fs.unlinkSync(mh);
  MOD_URLS[mname] = mout;
  console.log(mout + ':', (mtxt.length / 1024).toFixed(0) + 'KB');
}
// 清理旧 mod 哈希产物
fs.readdirSync(ASSETS).filter(f => /^mod-[a-z]+\.[0-9a-f]{8}\.js$/.test(f) && !Object.values(MOD_URLS).includes('assets/' + f)).forEach(f => fs.unlinkSync(path.join(ASSETS, f)));

// loader 注入 app.js（__ensureMod + MOD_URLS）
const loaderJs = '\n/* ==== 模块懒加载器（build 注入） ==== */\n'
  + 'window.__MOD_URLS=' + JSON.stringify(MOD_URLS) + ';\n'
  + 'window.__mods={};\n'
  + 'window.__ensureMod=function(n){ return window.__mods[n]||(window.__mods[n]=new Promise(function(res,rej){ var sc=document.createElement("script"); sc.src=window.__MOD_URLS[n]; sc.onload=function(){res()}; sc.onerror=function(){ delete window.__mods[n]; rej(new Error("mod load fail: "+n)); }; document.head.appendChild(sc); })); };\n';
const APPHASH = crypto.createHash('sha256').update(appOut).digest('hex').slice(0, 8);
const appHashed = 'app.' + APPHASH + '.js';
fs.writeFileSync(path.join(ASSETS, 'app.js'), appOut + loaderJs);
fs.writeFileSync(path.join(ASSETS, appHashed), appOut + loaderJs);
console.log('assets/' + appHashed + ':', ((appOut.length + loaderJs.length) / 1024).toFixed(0) + 'KB (hash=' + APPHASH + ')');

// sw.js：CACHE 版本=哈希、PRECACHE 注入哈希文件名（sw.js 字节随构建变化 → 浏览器自动检测更新）
const SWP = path.join(ROOT, 'sw.js');
let swTxt = fs.readFileSync(SWP, 'utf8');
swTxt = swTxt.replace(/const CACHE = '[^']+';/, "const CACHE = 'zhiming_v2_" + APPHASH + "';");
if (!swTxt.includes("zhiming_v2_" + APPHASH)) { console.error('sw CACHE inject miss'); process.exit(1); }
swTxt = swTxt.replace(/'\.\/assets\/app(\.[0-9a-f]{8})?\.js'/, "'./assets/" + appHashed + "'"); // 幂等：兼容首次(app.js)与二次(旧hash)
swTxt = swTxt.replace(/'(\.\/)?assets\/mod-[a-z]+\.[0-9a-f]{8}\.js'(,\s*)?/g, ""); // 幂等：先清全部旧 mod 条目（兼容有/无./前缀）
for (const mv of Object.values(MOD_URLS)) {
  if (!swTxt.includes(mv.replace('assets/', './assets/'))) swTxt = swTxt.replace("'./assets/style.css'", "'./" + mv + "', './assets/style.css'");
}
if (!swTxt.includes(appHashed)) { console.error('sw PRECACHE inject miss'); process.exit(1); }
fs.writeFileSync(SWP, swTxt);
// 清理旧哈希产物（保留 app.js 兼容旧缓存 index）
fs.readdirSync(ASSETS).filter(f => /^app\.[0-9a-f]{8}\.js$/.test(f) && f !== appHashed).forEach(f => fs.unlinkSync(path.join(ASSETS, f)));

// sitemap lastmod = 构建日（防过期）
const SMP = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(SMP)) {
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // 上海时区
  let sm = fs.readFileSync(SMP, 'utf8');
  sm = sm.replace(/<lastmod>[^<]+<\/lastmod>/g, '<lastmod>' + today + '</lastmod>');
  fs.writeFileSync(SMP, sm);
}

// ---------- 5. 压缩 style.css（去块注释+行尾空白+压缩空行） ----------
const css = styleInner
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim() !== '').join('\n');
fs.writeFileSync(path.join(ASSETS, 'style.css'), '/* 知命V2 样式（由 build.js 生成，勿手改） */\n' + css + '\n');
console.log('style.css:', (css.length / 1024).toFixed(0) + 'KB');

// ---------- 6. 改写 HTML ----------
let html = src.split('\n').join('\n');
html = html.split('assets/app.js').join('assets/' + appHashed);
// 6a. 主样式块 → link（保留行首缩进位置）
const styleLines = lines.slice(styleStart, styleEnd + 1);
html = html.replace(styleBlock, '<link rel="stylesheet" href="assets/style.css">');
// 6b. 全部主 script 块：块1 位置放 app.js 引用，其余块全部删除（合并进 app.js，消双份执行+瘦身HTML）
const b1full = lines.slice(scriptBlocks[0].start, scriptBlocks[0].end + 1).join('\n');
if (html.indexOf(b1full) < 0) { console.error('block1 replace miss'); process.exit(1); }
html = html.replace(b1full, '<script src="assets/' + appHashed + '" defer></script>');
for (let k = 1; k < scriptBlocks.length; k++) {
  const bkFull = lines.slice(scriptBlocks[k].start, scriptBlocks[k].end + 1).join('\n');
  if (html.indexOf(bkFull) < 0) { console.error('block' + (k + 1) + ' replace miss'); process.exit(1); }
  html = html.replace(bkFull, '<!-- Block' + (k + 1) + ' 已合并进 assets/app.js -->');
}

fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('index.html:', (html.length / 1024).toFixed(0) + 'KB');
console.log('BUILD OK');

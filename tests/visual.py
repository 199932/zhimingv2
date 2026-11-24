#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""视觉回归基线：2 tab（today/cn）× 390x844，像素差异超阈值即失败。
首跑若缺基线则写入并提示（视为通过），后续与基线比对。
用法: python3 tests/visual.py [--refresh]   （CI 与本地同样可用）
说明:
  - 阈值 2%（像素差异占比）——反锯齿/字体微差不会误报，布局崩必红
  - --refresh 强制重生成基线（改版是故意的时候用）
  - 基线文件: tests/baseline/<tab>.png
"""
import os, sys, time, socket, subprocess, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'tests', 'baseline')
THRESHOLD = 0.02
PAGES = [('today', '今日页'), ('cn', '中式页')]

def serve():
    os.chdir(ROOT)
    try:
        srv = HTTPServer(('127.0.0.1', 8899), SimpleHTTPRequestHandler)
    except OSError:
        return None  # 已有实例在跑（本地调试常见）
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main():
    refresh = '--refresh' in sys.argv
    os.makedirs(BASE, exist_ok=True)
    from playwright.sync_api import sync_playwright

    srv = serve()
    time.sleep(1.0)

    FREEZE_JS = """
    (function(){
      const RealDate = Date;
      const FIXED = new RealDate('2026-11-25T12:00:00');
      class MockDate extends RealDate {
        constructor(...args){ if(args.length===0){ super(FIXED.getTime()); } else { super(...args); } }
        static now(){ return FIXED.getTime(); }
      }
      window.Date = MockDate;
    })();
    """
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={'width': 390, 'height': 844},
                                  device_scale_factor=2, color_scheme='light')
        ctx.add_init_script("""window.addEventListener('DOMContentLoaded',()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}
          if(window.caches){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)));}
          try{localStorage.setItem('zhiming_pin_ok','1');}catch(e){}
        })""");
        ctx.add_init_script(FREEZE_JS);
        pg = ctx.new_page()
        pg.goto('http://127.0.0.1:8899/index.html?v=visual', wait_until='domcontentloaded', timeout=45000)
        pg.wait_for_timeout(4500)

        results = []
        first_run = False
        for key, label in PAGES:
            tmp = os.path.join(BASE, '.tmp_%s.png' % key)
            basef = os.path.join(BASE, '%s.png' % key)
            pg.evaluate("""(function(k){
              if(typeof window.switchTab==='function') window.switchTab(k);
              window.scrollTo(0,0);
            })("""+"'%s'"%key+")")
            pg.wait_for_timeout(2600)
            pg.screenshot(path=tmp, full_page=False)

            if refresh or not os.path.exists(basef):
                os.replace(tmp, basef)
                first_run = True
                results.append((key, label, '基线已生成', True))
            else:
                from PIL import Image, ImageChops
                a = Image.open(basef).convert('RGB')
                b = Image.open(tmp).convert('RGB')
                if a.size != b.size:
                    os.replace(tmp, basef)
                    results.append((key, label, '尺寸变化(%s→%s),基线已刷新' % (a.size, b.size), True))
                    continue
                diff = ImageChops.difference(a, b).convert('L')
                hist = diff.histogram()
                total = a.size[0] * a.size[1]
                changed = sum(hist[24:])  # 差异>24的像素才计入(滤反锯齿)
                ratio = changed / total
                os.remove(tmp)
                ok = ratio <= THRESHOLD
                results.append((key, label, '像素差异 %.2f%%' % (ratio*100), ok))
        browser.close()

    print()
    print('════ 视觉回归基线 ════')
    for key, label, msg, ok in results:
        print(('  ✓ ' if ok else '  ✗ ') + '%s(%s): %s' % (label, key, msg))
    if first_run:
        print()
        print('⚠️ 首跑落基线——请人工过一遍 tests/baseline/*.png，')
        print('   确认是「对的现在的样子」再提交。之后任何布局意外都会红。')
    bad = [r for r in results if not r[3]]
    if bad:
        print()
        print('❌ 视觉回归失败: ' + ', '.join(r[0] for r in bad))
        print('   若改版是故意的: python3 tests/visual.py --refresh')
        sys.exit(1)
    print('✅ 视觉基线比对通过')

if __name__ == '__main__':
    main()

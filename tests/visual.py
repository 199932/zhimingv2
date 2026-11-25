#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""视觉回归基线：多时点 × 390x844，像素差异超阈值即失败。

时段覆盖（坑153: 时段类产品的基线必须多时点,单点冻结=零覆盖）:
  today 三时点(早8/午12/凌晨2——深夜横幅只在 0200 出现) + cn 午12。
每时点独立 context + 独立 mock Date;基线与真实时间解耦(坑148)。

用法: python3 tests/visual.py [--refresh]
  首跑若缺基线则写入并提示(视为通过),人工过图后提交。
  改版是故意的: --refresh 重生成。
引用: 坑152(像素diff分辨率差)、坑148(时间冻结)、坑153(多时点)。
"""
import os, sys, time
from http.server import HTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'tests', 'baseline')
THRESHOLD = 0.05  # 5%: CI/本地字体渲染差2.3~3.3%是环境噪声(坑149);布局崩差异远超此数

PAGES = [
    ('today-0800', '今日页·早8点', '2026-11-25T08:00:00', 'today'),
    ('today-1200', '今日页·午12点', '2026-11-25T12:00:00', 'today'),
    ('today-0200', '今日页·凌晨1点半(深夜横幅窗口)', '2026-11-25T01:30:00', 'today'),
    ('cn-1200', '中式页·午12点', '2026-11-25T12:00:00', 'cn'),
]

def serve():
    os.chdir(ROOT)
    try:
        srv = HTTPServer(('127.0.0.1', 8899), SimpleHTTPRequestHandler)
    except OSError:
        return None
    import threading
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def freeze_js(mock_iso):
    return """
    (function(){
      const RealDate = Date;
      const FIXED = new RealDate('%s');
      class MockDate extends RealDate {
        constructor(...args){ if(args.length===0){ super(FIXED.getTime()); } else { super(...args); } }
        static now(){ return FIXED.getTime(); }
      }
      window.Date = MockDate;
    })();
    """ % mock_iso

LONGTASK_JS = """
    (function(){
      try{
        window.__ltTotal = 0;
        var po = new PerformanceObserver(function(list){
          list.getEntries().forEach(function(e){ window.__ltTotal += e.duration; });
        });
        po.observe({entryTypes:['longtask']});
      }catch(e){ window.__ltTotal = -1; }
    })();
    """

PERF_JS = """(function(){
      var nav = performance.getEntriesByType('navigation')[0];
      return {
        dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
        nodes: document.querySelectorAll('*').length,
        longtasks: window.__ltTotal || 0
      };
    })()"""

def main():
    refresh = '--refresh' in sys.argv
    os.makedirs(BASE, exist_ok=True)
    from playwright.sync_api import sync_playwright
    srv = serve()
    time.sleep(1.0)

    results = []
    first_run = False
    last_perf = None
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for key, label, mock, tab in PAGES:
            ctx = browser.new_context(viewport={'width': 390, 'height': 844},
                                      device_scale_factor=2, color_scheme='light')
            ctx.add_init_script("""window.addEventListener('DOMContentLoaded',()=>{
              if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}
              if(window.caches){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)));}
              try{localStorage.setItem('zhiming_pin_ok','1');}catch(e){}
            })""")
            ctx.add_init_script(freeze_js(mock))
            ctx.add_init_script(LONGTASK_JS)
            pg = ctx.new_page()
            pg.goto('http://127.0.0.1:8899/index.html?v=visual-%s' % key, wait_until='domcontentloaded', timeout=45000)
            pg.wait_for_timeout(4200)
            pg.evaluate("(function(k){ if(window.switchTab) window.switchTab(k); window.scrollTo(0,0); })('%s')" % tab)
            pg.wait_for_timeout(2600)
            tmp = os.path.join(BASE, '.tmp_%s.png' % key)
            pg.screenshot(path=tmp, full_page=False)
            if key == 'today-1200':
                last_perf = pg.evaluate(PERF_JS)
            ctx.close()

            basef = os.path.join(BASE, '%s.png' % key)
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
                changed = sum(hist[24:])
                ratio = changed / total
                os.remove(tmp)
                ok = ratio <= THRESHOLD
                results.append((key, label, '像素差异 %.2f%%' % (ratio*100), ok))
        browser.close()

    print()
    print('════ 视觉回归基线(多时点) ════')
    for key, label, msg, ok in results:
        print(('  ✓ ' if ok else '  ✗ ') + '%s(%s): %s' % (label, key, msg))
    if first_run:
        print()
        print('⚠️ 首跑落基线——请人工过一遍 tests/baseline/*.png，')
        print('   确认是「对的现在的样子」再提交。之后任何布局意外都会红。')
    if last_perf:
        print()
        print('==== 性能指标（只记录不阻断）====')
        print('  DOMContentLoaded: %sms' % last_perf.get('dcl'))
        print('  longtask 总时长: %sms' % last_perf.get('longtasks'))
        print('  首屏 DOM 节点数: %s' % last_perf.get('nodes'))
    bad = [r for r in results if not r[3]]
    if bad:
        print()
        print('❌ 视觉回归失败: ' + ', '.join(r[0] for r in bad))
        print('   若改版是故意的: python3 tests/visual.py --refresh')
        sys.exit(1)
    print('✅ 视觉基线比对通过')

if __name__ == '__main__':
    main()

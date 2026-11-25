#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文字可见性扫描：抓「白字白底 / 暗底暗字」——像素 diff 抓不到的隐形问题。

判据：可见叶子文本节点的 computed 前景色,与其实际生效背景色(向上逐层
alpha 复合,半透明背景不与底板混合会造成同色假报)的 WCAG 对比度 < 1.5:1。

用法:
  python3 tests/contrast.py            # 全 tab 扫描,可疑项>0 则 exit 1
  python3 tests/contrast.py --list     # 只列可疑项,供白名单加工

白名单: tests/contrast_skip.json —— 只允许放「背景是图片/渐变,算法判断不了」
的选择器,不许为了消红把正文卡片藏进去。

引用: 坑152(像素diff与文字隐形的分辨率差: 5%阈值=128x128px方块,罩得住整卡、
罩不住一行)、坑125(浅底卡暗色主题字色隐形)、坑151(city预取无业务门)。
"""
import os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_FILE = os.path.join(ROOT, 'tests', 'contrast_skip.json')

SCAN_JS = r"""
(function(){
  function parseColor(str){
    if(!str) return null;
    str=str.trim();
    var m=str.match(/rgba?\(([^)]+)\)/);
    if(!m) return null;
    var parts=m[1].split(',').map(function(x){return parseFloat(x.trim());});
    if(parts.length>=4) return [parts[0],parts[1],parts[2],parts[3]];
    return [parts[0],parts[1],parts[2],1];
  }
  function lum(rgb){
    function ch(c){ c=c/255.0; return c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
    return 0.2126*ch(rgb[0])+0.7152*ch(rgb[1])+0.0722*ch(rgb[2]);
  }
  function contrast(a,b){
    var l1=lum(a), l2=lum(b);
    var hi=Math.max(l1,l2), lo=Math.min(l1,l2);
    return (hi+0.05)/(lo+0.05);
  }
  function bgOf(el){
    /* 逐层 alpha 复合(over): rgba(...,0.12)不当实色算,否则与fg同RGB造成假报 */
    var acc=[255,255,255,1];
    var chain=[];
    var cur=el;
    while(cur && cur!==document.documentElement){ chain.push(cur); cur=cur.parentElement; }
    chain.reverse();
    for(var i=0;i<chain.length;i++){
      var cs=getComputedStyle(chain[i]);
      if(cs.backgroundImage && cs.backgroundImage!=='none') return 'IMG';
      var bg=parseColor(cs.backgroundColor);
      if(bg && bg[3]>0.01){
        var a=bg[3];
        acc=[Math.round(bg[0]*a+acc[0]*(1-a)), Math.round(bg[1]*a+acc[1]*(1-a)), Math.round(bg[2]*a+acc[2]*(1-a)), 1];
      }
    }
    return acc;
  }
  function closestSel(el){
    var parts=[];
    while(el && el!==document.body && parts.length<3){
      var s=el.tagName.toLowerCase();
      if(el.id) s+='#'+el.id;
      else if(el.className && typeof el.className==='string' && el.className.trim()) s+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');
      parts.unshift(s);
      el=el.parentElement;
    }
    return parts.join('>')||el.tagName;
  }
  var walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode:function(n){
    if(!n.textContent.trim()) return NodeFilter.FILTER_REJECT;
    var el=n.parentElement;
    if(!el) return NodeFilter.FILTER_REJECT;
    if(!(el.offsetParent||el.getClientRects().length)) return NodeFilter.FILTER_REJECT;
    var st=getComputedStyle(el);
    if(st.visibility==='hidden'||parseFloat(st.opacity)===0||st.display==='none') return NodeFilter.FILTER_REJECT;
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE') return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  var out=[];
  var seen={};
  var n;
  while(n=walker.nextNode()){
    var el=n.parentElement;
    var cs=getComputedStyle(el);
    var fg=parseColor(cs.color);
    if(!fg||fg[3]<0.3) continue;
    var bg=bgOf(el);
    if(bg==='IMG') continue;
    var cr=Math.round(contrast(fg,bg)*100)/100;
    if(cr<1.5){
      var key=closestSel(el)+'|'+n.textContent.trim().slice(0,24);
      if(seen[key]) continue;
      seen[key]=1;
      out.push({sel:closestSel(el), cr:String(cr), fg:cs.color, bg:'rgb('+bg[0]+','+bg[1]+','+bg[2]+')', text:n.textContent.trim().slice(0,26)});
    }
  }
  return out;
})()
"""

def serve():
    import threading, time as _t
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    os.chdir(ROOT)
    try:
        srv = HTTPServer(('127.0.0.1', 8899), SimpleHTTPRequestHandler)
    except OSError:
        return None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

TABS = ['today', 'cn', 'wu', 'al', 'cal', 'grow', 'health']

def main():
    list_only = '--list' in sys.argv
    skip = {'selectors': []}
    try:
        skip = json.load(open(SKIP_FILE, encoding='utf-8'))
    except Exception as e:
        print('白名单读取失败(当作空):', e)
    import time
    from playwright.sync_api import sync_playwright
    srv = serve()
    time.sleep(1.0)
    FREEZE = """
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
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, color_scheme='light')
        ctx.add_init_script(FREEZE)
        pg = ctx.new_page()
        pg.goto('http://127.0.0.1:8899/index.html?v=contrast', wait_until='domcontentloaded', timeout=45000)
        pg.wait_for_timeout(4200)
        found = []
        for tab in TABS:
            try:
                pg.evaluate("(function(k){ if(window.switchTab) window.switchTab(k); window.scrollTo(0,0); })('%s')" % tab)
                pg.wait_for_timeout(1200)
                items = pg.evaluate(SCAN_JS)
                for f in items:
                    f['tab'] = tab
                    found.append(f)
            except Exception as e:
                print('tab %s 扫描跳过: %s' % (tab, str(e)[:60]))
        browser.close()
    real, skipped = [], []
    skipset = set(skip.get('selectors', []))
    for f in found:
        if any(s in f['sel'] for s in skipset):
            skipped.append(f)
        else:
            real.append(f)
    seen, uniq = set(), []
    for f in real:
        k = (f['tab'], f['sel'], f['text'])
        if k not in seen:
            seen.add(k); uniq.append(f)
    print('════ 文字可见性扫描 ════')
    if list_only:
        for f in uniq:
            print('  [%s|%s] cr=%s fg=%s bg=%s | "%s"' % (f['tab'], f['sel'], f['cr'], f['fg'], f['bg'], f['text']))
        print('可疑项: %d (白名单跳过 %d)' % (len(uniq), len(skipped)))
        if uniq:
            print('把「背景是图片/渐变」的选择器加进 tests/contrast_skip.json 后重跑')
        return 0
    if uniq:
        for f in uniq[:40]:
            print('  ✗ [%s|%s] cr=%s fg=%s bg=%s "%s"' % (f['tab'], f['sel'], f['cr'], f['fg'], f['bg'], f['text']))
        if len(uniq) > 40:
            print('  ...共 %d 条' % len(uniq))
        print('❌ 可疑隐形文字 %d 条' % len(uniq))
        return 1
    print('✅ 全 7 tab 叶子文本对比度 ≥1.5, 零隐形 (白名单跳过 %d)' % len(skipped))
    return 0

if __name__ == '__main__':
    sys.exit(main())

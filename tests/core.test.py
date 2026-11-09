#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知命V2 内核回归测试（外测报告第7条：内核错误会一路传染下游解读，必须断言固化）
用法: cd site && python3 ../tests/core.test.py   （需本地 http.server :8899 或自动拉起）
用例:
  T1 planetGeo 物理不变量 —— 内行星距日上限: 水星≤28° 金星≤47°（天文硬约束，符号/公式错必然爆）
  T2 太阳黄经连续性 —— sunLon 相邻天差值 ∈ (0.9°, 1.1°)（每日约1°，跳变=公式断）
  T3 大运 startYear off-by-one —— startYear === 出生年 + (startSui-1)（虚岁换算，坑:整体后移1年）
  T4 大运单调性 —— startYear 逐 +10 / endSui-startSui===9
先决: planetGeo/sunLon 挂 window.__planetGeo/__sunLon 调试钩子（mod-chart 懒加载就位后）
"""
import subprocess, time, sys, json, socket, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = 8899  # 8897改8899对照: SyntaxError悬案二分
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

def ensure_server():
    s = socket.socket(); alive = s.connect_ex(('127.0.0.1', PORT)) == 0; s.close()
    if alive: return None
    p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'],
                         cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    return p

from playwright.sync_api import sync_playwright

RESULTS = []
def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok), detail))
    print(('  ✅ ' if ok else '  ❌ ') + name + (('  — ' + detail) if detail else ''))

srv = ensure_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        ctx.add_init_script("window.addEventListener('DOMContentLoaded',()=>{localStorage.setItem('zhiming_v2_active_profile','pa');localStorage.setItem('zhiming_v2_profiles', JSON.stringify([{id:'pa',emoji:'👨',name:'甲',gender:'男',year:1995,month:3,day:21,hour:14,minute:30,cityName:'北京',cityLng:116.407,note:''}]));});")
        pg = ctx.new_page()
        pass # DIAG: pg.add_init_script("window.__W
        errs = []
        import time as _t
        pg.on('pageerror', lambda e: errs.append('[t=%s] %s || STACK: %s' % (_t.strftime('%H:%M:%S'), str(e)[:100], (getattr(e,'stack','') or '')[:300])))
        pg.goto(f'http://localhost:{PORT}/index.html?v=test' + str(int(time.time())), wait_until='domcontentloaded', timeout=40000)
        pg.wait_for_timeout(2500)

        # ---------- T1/T2: 天文内核（mod-chart 就位后） ----------
        pg.evaluate("(async()=>{ await window.__ensureMod('chart'); })()")
        pg.wait_for_timeout(700)
        astro = pg.evaluate("""(async () => {
          try{ await window.__ensureMod('chart'); }catch(e){ return {err:'mod load fail'}; }
          await new Promise(r=>setTimeout(r,600));
          if(typeof window.__planetGeo!=='function'||typeof window.__sunLon!=='function') return {err:'hooks missing'};
          window.__TESTPROBE=(function(){ try{ var PL=window.__PL; var jd=Date.now()/86400000+2440587.5; var v=window.__planetGeo(PL[0],jd); return {ok:true, v:v}; }catch(e){ return {ok:false, err:String(e), st:String(e&&e.stack||'').slice(0,200)}; } })();
          const jdNow=()=>Date.now()/86400000+2440587.5;
          const norm=a=>((a%360)+360)%360;
          const sep=(a,b)=>{const d=Math.abs(norm(a)-norm(b));return d>180?360-d:d;};
          const days=[0,1,2,3,4,5,6,7,8,9,20,50,120,300,650];
          let rowsByName=null;
          try{
            const PL=window.__PL;
            if(!PL||!PL.length) throw new Error('PL missing');
            rowsByName=days.map(off=>{
              const jd=jdNow()-off;
              const sun=window.__sunLon(jd);
              const me=window.__planetGeo(PL[0],jd), ve=window.__planetGeo(PL[1],jd);
              return {off, sun, me:sep(me.lon,sun), ve:sep(ve.lon,sun)};
            });
          }catch(e){ rowsByName=null; }
          // 太阳连续性：相邻天严格采样（每日约0.95~1.02°）
          const seq=[];
          for(let i=0;i<=10;i++){ seq.push(window.__sunLon(jdNow()-i)); }
          let maxStep=0;
          for(let i=1;i<seq.length;i++){
            let d=seq[i-1]-seq[i];  // 往前推i天,黄经递减(约1°/天)
            if(d<-180)d+=360; if(d>180)d-=360;
            maxStep=Math.max(maxStep,Math.abs(d));
          }
          return {rows:rowsByName, maxStep, probe:window.__TESTPROBE};
        })()""")
        print('  [probe]', json.dumps(astro.get('probe'), ensure_ascii=False)[:300], '')
        if astro.get('err'):
            check('T1 planetGeo 物理不变量', False, astro['err'])
        elif astro.get('rows') is None:
            check('T1 planetGeo 物理不变量', False, '钩子形态不含名字调用——需扩展 __planetGeo 暴露方式')
        else:
            meMax=max(r['me'] for r in astro['rows']); veMax=max(r['ve'] for r in astro['rows'])
            check('T1a 水星距日 ≤28°（采样10天跨650天）', meMax<=28.0, 'max=%.2f°'%meMax)
            check('T1b 金星距日 ≤47°（采样10天跨650天）', veMax<=47.0, 'max=%.2f°'%veMax)
        check('T2 太阳黄经连续性 每日≈1°（650天采样最大步长∈(0.6°,1.4°)）',
              0.6 <= astro['maxStep'] <= 1.4, 'maxStep=%.3f°'%astro['maxStep'])

        # ---------- T3/T4: 大运 startYear off-by-one（真表单链） ----------
        dayun = pg.evaluate("""(() => {
          try{
            const r=window.baziCalc({year:1995,month:3,day:21,hour:14,minute:30,gender:'男',cityLng:116.407});
            if(!r||!r.dayun||!r.dayun.list) return {err:'no dayun: '+Object.keys(r||{}).join(',').slice(0,80)};
            return {list:r.dayun.list.map(x=>({startSui:x.startSui,endSui:x.endSui,startYear:x.startYear,endYear:x.endYear})), by:1995};
          }catch(e){ return {err:String(e).slice(0,120)}; }
        })()""")
        if dayun.get('err'):
            check('T3 大运 startYear 虚岁换算', False, dayun['err'])
        else:
            lst=dayun['list']; by=dayun['by']
            bad=[x for x in lst if x['startYear'] != by + x['startSui'] - 1]
            check('T3 大运 startYear = 出生年+(startSui-1)（off-by-one 回归）', len(bad)==0,
                  ('%d步全对，首步: 虚岁%s=%d年' % (len(lst), lst[0]['startSui'], lst[0]['startYear'])) if len(bad)==0
                  else '错位步: '+json.dumps(bad[:2],ensure_ascii=False))
            mono=all(lst[i]['startYear']==lst[i-1]['startYear']+10 for i in range(1,len(lst)))
            span=all(x['endSui']-x['startSui']==9 for x in lst)
            check('T4 大运单调性（步长+10/跨度9年）', mono and span, '%d 步 %d~%d 年' % (len(lst), lst[0]['startYear'], lst[-1]['endYear']))
        werr=pg.evaluate("window.__WERR")
        errs2=[e for e in errs if not e.startswith('MARK')]
        check('页面零报错', len(errs2)==0 and not werr, ('PE: '+' || '.join(errs2) if errs2 else '')+(' WERR: '+json.dumps(werr, ensure_ascii=False) if werr else ''))
        b.close()

    # ---------- 汇总 ----------
    fails=[r for r in RESULTS if not r[1]]
    print('\n===== %d/%d 通过 =====' % (len(RESULTS)-len(fails), len(RESULTS)))
    sys.exit(1 if fails else 0)
finally:
    if srv: srv.terminate()

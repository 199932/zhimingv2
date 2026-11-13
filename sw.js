const CACHE = 'zhiming_v2_8a4db19b';
const PRECACHE = ['./', './index.html', './widget.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './donate-qr.png', './assets/app.8a4db19b.js', './assets/mod-health.1f87171c.js', './assets/mod-chart.9a5c3ace.js', './assets/mod-extra.cc83b40e.js', './assets/style.css', './og-card.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .catch(() => {})          // 预缓存失败不阻塞安装（网络首次访问时兜底缓存）
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 2026-11-09 重写（坑93）：旧实现缓存命中也 await 一次网络往返，弱网等满全程——注释与实现不一致。
  // 现策略：哈希资源（URL即版本）cache-first 纯秒回；其余（页面/静态）SWR——缓存命中立即返回+后台刷新，离线兜底保留。
  const isHashed = /\/assets\/app[.-][0-9a-f]{8}\.js$/.test(url.pathname);
  const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      if (!isHashed) {
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
        }).catch(() => {});
      }
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      }
      return res;
    } catch (err) {
      if (isPage) {
        const pageFallback = await caches.match('./index.html');
        if (pageFallback) return pageFallback;
      }
      // 非页面资源离线且无缓存：让请求自然失败由浏览器处理
      throw err;
    }
  })());
});
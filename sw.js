const CACHE = 'zhiming_v2_sw_v21';
const PRECACHE = ['./', './index.html', './widget.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './donate-qr.png'];

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

  // 页面与静态资源 stale-while-revalidate：有缓存立即返回（秒开），后台静默更新供下次生效；无缓存走网络
  const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      fetch(req).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {});
      }).catch(() => {});
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
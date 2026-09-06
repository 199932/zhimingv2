const CACHE = 'zhiming_v2_sw_v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只缓存同域 HTML 请求
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) return;
  e.respondWith(
    fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('./')))
  );
});

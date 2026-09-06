const CACHE = 'zhiming_v2_sw_v3';
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
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) return;
  // 绕过浏览器 HTTP 缓存，强制从服务器拿最新版
  const freshReq = new Request(req.url, { cache: 'no-store' });
  e.respondWith(
    fetch(freshReq).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('./')))
  );
});

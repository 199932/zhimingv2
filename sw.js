const CACHE = 'zhiming_v2_sw_v4';
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

  // 页面与静态资源统一 network-first：在线时永远拿最新版，离线时回退缓存
  const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
      }
      return res;
    }).catch(() =>
      caches.match(req).then(m => m || (isPage ? caches.match('./index.html') : undefined))
    )
  );
});
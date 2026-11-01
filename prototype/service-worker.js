/* 知识星图 PWA Service Worker
   - 预缓存应用外壳，离线可直接打开
   - 导航请求 network-first，静态资源 cache-first
   - 发布快照 network-first，避免访客看到旧数据
   - 更新应用时请同步修改 CACHE_VERSION
*/
const CACHE_VERSION = 'kn-v1.1.0-3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20',
  './designs/designs.css?v=20',
  './obsidian.css?v=20',
  './vendor/3d-force-graph.min.js?v=20',
  './vendor/jszip.min.js?v=20',
  './data.js?v=20',
  './published-vault.js?v=20',
  './markdown.js?v=20',
  './app.js?v=20',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/service-worker.js')) return;

  // 发布快照会被 owner 直接替换；用 network-first，避免访客一直看到旧数据
  if (url.pathname.endsWith('/published-vault.js')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      })
  );
});

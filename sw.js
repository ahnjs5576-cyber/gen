/* 옷짝 오프라인 캐시. 앱 셸은 미리 받아 두고, 나머지는 네트워크 우선으로 가져온다.
 * SDK 번들은 AI 분석을 처음 쓸 때 받아서 캐시에 넣는다. */
const VERSION = 'otjjak-v1';
const SHELL = ['./', './index.html', './styles.css', './engine.js', './ai.js', './app.js', './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // API 호출은 건드리지 않는다
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});

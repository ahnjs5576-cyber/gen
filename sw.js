// 오프라인 캐시: 앱 셸과 콘텐츠를 미리 받아 두고, 네트워크가 되면 최신본으로 갱신한다.
const CACHE = 'haru-cs-v1';
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'icon.svg', 'manifest.webmanifest',
  'content/algorithm.js', 'content/os.js', 'content/database.js',
  'content/architecture.js', 'content/ml.js', 'content/dl.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // moss-keeper/ 는 48MB짜리 단편 영상 페이지라 앱 캐시에 넣지 않는다.
  if (new URL(e.request.url).pathname.includes('/moss-keeper/')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

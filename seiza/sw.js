/* AI星座  オフラインで使うための最小限のサービスワーカー
   記録は localStorage にあるので、ここではアプリの本体だけを持っておきます。 */
var CACHE = 'seiza-v3';
var FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/style.css',
  './assets/skills.js',
  './assets/badges.js',
  './assets/store.js',
  './assets/calc.js',
  './assets/map.js',
  './assets/link.js',
  './assets/app.js',
  './assets/icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* 通信できるときは新しいほうを取りに行き、だめならキャッシュを返す */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* 自分のファイルだけ扱う。外から読んだものは端末に残さない */
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});

/* いっこまえ  圏外でも ひらくための さいしょうげんの サービスワーカー
   きろくは localStorage にあるので、ここでは アプリの本体だけを もっておきます。 */
var CACHE = 'ikkomae-v1';
var FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/style.css',
  './assets/themes.js',
  './assets/store.js',
  './assets/game.js',
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

/* 通信できるときは 新しいほうを 取りに行き、だめなら キャッシュを 返す */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* 自分の ファイルだけ あつかう */
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

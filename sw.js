const CACHE_NAME = 'flourish-v2';
const DATA_CACHE = 'flourish-data-v2';
const SHELL = [
  './',
  './index.html',
  './404.html',
  './flourish-v4.css',
  './flourish-v4.js',
  './manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) {
      return c.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME && k !== DATA_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  var isData = url.pathname.indexOf('/data/') !== -1;

  if (isData) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(DATA_CACHE).then(function(c) {
          c.put(e.request, clone).catch(function(){});
        });
        return res;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          return new Response('{error:"offline"}', { status: 503 });
        });
      })
    );
    return;
  }

  // Network-first for shell assets (CSS/JS/HTML) so updates propagate quickly
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c) {
          c.put(e.request, clone).catch(function(){});
        });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

const CACHE_NAME = "questup-pwa-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/favicon-32.png?v=3",
  "./icons/apple-touch-icon-180.png?v=3",
  "./icons/icon-192.png?v=3",
  "./icons/icon-512.png?v=3",
  "./icons/icon-maskable-512.png?v=3"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put("./index.html", clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});

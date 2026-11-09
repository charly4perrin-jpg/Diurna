// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'diurna-6e5ce584ec';
const SHELL = ["./","en/","2026/11/09/","en/2026/11/09/","archives/","en/archives/","methode/","en/method/","manifest.webmanifest","en/manifest.webmanifest","icons/favicon.svg","assets/css/site.css?v=6e5ce584ec","assets/js/i18n.js?v=6e5ce584ec","assets/js/common.js?v=6e5ce584ec","assets/js/globe.js?v=6e5ce584ec","assets/js/home.js?v=6e5ce584ec","assets/js/reader.js?v=6e5ce584ec","assets/js/modules.js?v=6e5ce584ec","assets/js/search.js?v=6e5ce584ec","assets/js/live.js?v=6e5ce584ec","assets/js/map.js?v=6e5ce584ec","assets/js/locator.js?v=6e5ce584ec","assets/vendor/d3-array.min.js?v=6e5ce584ec","assets/vendor/d3-geo.min.js?v=6e5ce584ec","assets/vendor/topojson-client.min.js?v=6e5ce584ec","assets/world.json","assets/fonts/archivo.woff2","assets/fonts/newsreader-italic.woff2","assets/fonts/newsreader-text.woff2"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' || url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});

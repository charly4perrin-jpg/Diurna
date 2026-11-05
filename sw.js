// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'diurna-125e0e9b05';
const SHELL = ["./","en/","2026/11/05/","en/2026/11/05/","archives/","en/archives/","methode/","en/method/","manifest.webmanifest","en/manifest.webmanifest","icons/favicon.svg","assets/css/site.css?v=125e0e9b05","assets/js/i18n.js?v=125e0e9b05","assets/js/common.js?v=125e0e9b05","assets/js/globe.js?v=125e0e9b05","assets/js/home.js?v=125e0e9b05","assets/js/reader.js?v=125e0e9b05","assets/js/modules.js?v=125e0e9b05","assets/js/search.js?v=125e0e9b05","assets/vendor/d3-array.min.js?v=125e0e9b05","assets/vendor/d3-geo.min.js?v=125e0e9b05","assets/vendor/topojson-client.min.js?v=125e0e9b05","assets/world.json","assets/fonts/archivo-latin-standard-normal.woff2","assets/fonts/newsreader-latin-standard-italic.woff2","assets/fonts/newsreader-latin-standard-normal.woff2"];
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

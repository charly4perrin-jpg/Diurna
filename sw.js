// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'diurna-7b4b518bce', PAGES = 'diurna-pages', MAX = 160;
const SHELL = ["./","en/","2026/11/09/","en/2026/11/09/","archives/","en/archives/","methode/","en/method/","hors-ligne/","en/offline/","manifest.webmanifest","en/manifest.webmanifest","icons/favicon.svg","assets/css/site.css?v=7b4b518bce","assets/js/i18n.js?v=7b4b518bce","assets/js/common.js?v=7b4b518bce","assets/js/globe.js?v=7b4b518bce","assets/js/home.js?v=7b4b518bce","assets/js/reader.js?v=7b4b518bce","assets/js/modules.js?v=7b4b518bce","assets/js/search.js?v=7b4b518bce","assets/js/live.js?v=7b4b518bce","assets/js/map.js?v=7b4b518bce","assets/js/locator.js?v=7b4b518bce","assets/js/quiz.js?v=7b4b518bce","assets/js/stories.js?v=7b4b518bce","assets/js/notfound.js?v=7b4b518bce","assets/js/offline.js?v=7b4b518bce","assets/vendor/d3-array.min.js?v=7b4b518bce","assets/vendor/d3-geo.min.js?v=7b4b518bce","assets/vendor/topojson-client.min.js?v=7b4b518bce","assets/world.json","assets/fonts/archivo.woff2","assets/fonts/atkinson-next.woff2","assets/fonts/newsreader-italic.woff2","assets/fonts/newsreader-text.woff2"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== PAGES).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
async function keep(req, res) {
  const c = await caches.open(PAGES);
  await c.put(req, res);
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) await c.delete(k);
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' || url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); keep(req, copy); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: req.mode !== 'navigate' }).then((r) => r || (req.mode === 'navigate' ? caches.match(url.pathname.includes('/en/') ? 'en/offline/' : 'hors-ligne/') : undefined))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type !== 'save' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(PAGES).then(async (c) => {
    let n = 0;
    for (const u of d.urls.slice(0, 120)) { try { const res = await fetch(u); if (res.ok) { await c.put(u, res); n++; } } catch (_) {} }
    if (e.source) e.source.postMessage({ type: 'saved', n });
  }));
});

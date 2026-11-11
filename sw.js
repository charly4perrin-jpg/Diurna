// Généré par tools/build.mjs — ne pas modifier à la main.
const CACHE = 'diurna-3d629a5614', PAGES = 'diurna-pages', MAX = 160;
const SHELL = ["./","en/","2026/11/11/","en/2026/11/11/","archives/","en/archives/","methode/","en/method/","hors-ligne/","en/offline/","manifest.webmanifest","en/manifest.webmanifest","icons/favicon.svg","assets/css/site.css?v=3d629a5614","assets/js/i18n.js?v=3d629a5614","assets/js/common.js?v=3d629a5614","assets/js/globe.js?v=3d629a5614","assets/js/home.js?v=3d629a5614","assets/js/reader.js?v=3d629a5614","assets/js/modules.js?v=3d629a5614","assets/js/search.js?v=3d629a5614","assets/js/live.js?v=3d629a5614","assets/js/map.js?v=3d629a5614","assets/js/locator.js?v=3d629a5614","assets/js/quiz.js?v=3d629a5614","assets/js/stories.js?v=3d629a5614","assets/js/notfound.js?v=3d629a5614","assets/js/mylist.js?v=3d629a5614","assets/js/settings.js?v=3d629a5614","assets/js/passport.js?v=3d629a5614","assets/js/game.js?v=3d629a5614","assets/js/offline.js?v=3d629a5614","assets/vendor/d3-array.min.js?v=3d629a5614","assets/vendor/d3-geo.min.js?v=3d629a5614","assets/vendor/topojson-client.min.js?v=3d629a5614","assets/world.json","assets/fonts/archivo.woff2","assets/fonts/atkinson-next.woff2","assets/fonts/newsreader-italic.woff2","assets/fonts/newsreader-text.woff2"];
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
// Mise en cache automatique de l'édition du matin (appli installée, navigateurs qui le permettent)
// et, seulement si le lecteur l'a demandé, une notification quand une nouvelle édition paraît.
const SETTINGS = 'diurna-settings';
async function settings() { const r = await (await caches.open(PAGES)).match(SETTINGS); return r ? r.json() : {}; }
async function saveSettings(v) { await (await caches.open(PAGES)).put(SETTINGS, new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json' } })); }
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'diurna-edition') return;
  e.waitUntil((async () => {
    const rt = await (await fetch('data/routes.json', { cache: 'no-store' })).json();
    const st = await settings(), lang = st.lang === 'en' ? 'en' : 'fr';
    const days = Object.keys(rt[lang] || {}).sort(), d = days[days.length - 1];
    if (!d) return;
    const c = await caches.open(PAGES);
    for (const u of [...Object.values(rt[lang][d]), lang === 'en' ? 'en/' : './']) { try { const r = await fetch(u); if (r.ok) await c.put(new Request(new URL(u, location.href)), r); } catch (_) {} }
    if (st.notify && st.last !== d && self.registration.showNotification) {
      let body = '';
      try { body = (await (await fetch(lang === 'en' ? 'data/en/latest.json' : 'data/latest.json', { cache: 'no-store' })).json()).headline || ''; } catch (_) {}
      await self.registration.showNotification('Diurna', { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'diurna-' + d, data: { url: lang === 'en' ? 'en/' : './' } });
    }
    await saveSettings({ ...st, last: d });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(new URL((e.notification.data && e.notification.data.url) || './', location.href).href));
});
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'settings') { e.waitUntil(settings().then((st) => saveSettings({ ...st, notify: !!d.notify, lang: d.lang }))); return; }
  if (d.type !== 'save' || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(PAGES).then(async (c) => {
    let n = 0;
    for (const u of d.urls.slice(0, 120)) { try { const res = await fetch(u); if (res.ok) { await c.put(u, res); n++; } } catch (_) {} }
    if (e.source) e.source.postMessage({ type: 'saved', n });
  }));
});

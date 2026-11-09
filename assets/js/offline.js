/* Page « Hors connexion » : liste les éditions gardées sur l'appareil. */
(function () {
  'use strict';
  const list = document.getElementById('offList');
  if (!list || !('caches' in window)) return;
  caches.open('diurna-pages').then((c) => c.keys()).then((keys) => {
    const pages = keys.map((k) => new URL(k.url)).filter((u) => /\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(u.pathname) && !/\/(quiz|stories|imprimer|print)\/$/.test(u.pathname));
    const isEn = TP.LANG === 'en';
    const mine = pages.filter((u) => u.pathname.includes('/en/') === isEn);
    if (!mine.length) return;
    mine.sort((a, b) => b.pathname.localeCompare(a.pathname));
    list.innerHTML = mine.slice(0, 60).map((u) => {
      const m = u.pathname.match(/(\d{4})\/(\d{2})\/(\d{2})\/([a-z0-9-]+)\/$/);
      const d = `${m[1]}-${m[2]}-${m[3]}`, title = m[4].replace(/-/g, ' ');
      return `<li><a href="${u.pathname}"><time datetime="${d}">${TP.t(TP.day(d))}</time><span class="h">${TP.t(title.charAt(0).toUpperCase() + title.slice(1))}</span></a></li>`;
    }).join('');
  }).catch(() => {});
})();

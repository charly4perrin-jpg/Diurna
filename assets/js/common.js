/* Outils partagés par toutes les pages. */
(function (global) {
  'use strict';
  const ROOT = document.body.dataset.root || './';

  // Typographie française : espaces insécables, apostrophe typographique.
  function fr(s) {
    return String(s ?? '')
      .replace(/'/g, '’')
      .replace(/ ([?!;])/g, ' $1')
      .replace(/ :/g, ' :')
      .replace(/« /g, '« ')
      .replace(/ »/g, ' »');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (s) => esc(fr(s));

  const utc = (d) => { const p = String(d).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
  const F = {
    long: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dm: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    dmy: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    my: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    hm: new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' })
  };
  function day(d, ref) {
    const parts = String(d).split('-');
    if (parts.length === 2) return F.my.format(utc(d));
    return (ref && String(ref).slice(0, 4) === parts[0] ? F.dm : F.dmy).format(utc(d));
  }
  const longDate = (d) => F.long.format(utc(d));
  const hour = (iso) => F.hm.format(new Date(iso)).replace(':', ' h ');
  const dayCount = (since, today) => Math.floor((utc(today) - utc(since)) / 864e5) + 1;
  const nf = new Intl.NumberFormat('fr-FR');

  async function json(path) {
    const r = await fetch(ROOT + path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + path);
    return r.json();
  }

  const ICONS = {
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    recenter: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // Installation comme application (Android, Chrome, Edge).
  let deferred = null;
  global.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    document.querySelectorAll('.install').forEach((b) => { b.hidden = false; });
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.install');
    if (!b || !deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (_) {}
    deferred = null;
    document.querySelectorAll('.install').forEach((x) => { x.hidden = true; });
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    global.addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));
  }

  global.TP = { ROOT, fr, esc, t, day, longDate, hour, dayCount, nf, json, icon, utc };
})(window);

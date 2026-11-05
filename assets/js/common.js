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
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // Drapeau d'un pays (entrée de data/countries.json). Décoratif : le nom du pays est toujours à côté.
  const flag = (c, cls) => c && c.flag
    ? `<img class="flag${cls ? ' ' + cls : ''}" src="${ROOT}assets/flags/${c.flag}" alt="" width="20" height="15" loading="lazy" decoding="async">`
    : '';

  // Population à la manière de la presse : « 92,4 millions », « 1,4 milliard », « 560 000 ».
  const dec1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  function population(n) {
    if (!n) return '';
    if (n >= 1e9) { const v = n / 1e9; return `${dec1.format(v)} milliard${v >= 2 ? 's' : ''}`; }
    if (n >= 1e6) { const v = n / 1e6; return `${v >= 100 ? Math.round(v) : dec1.format(v)} million${v >= 2 ? 's' : ''}`; }
    return nf.format(Math.round(n / 1000) * 1000);
  }

  // Préférences du lecteur, sur cet appareil uniquement.
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tp.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('tp.' + k, JSON.stringify(v)); } catch (_) {} }
  };

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

  global.TP = { ROOT, fr, esc, t, day, longDate, hour, dayCount, nf, json, icon, utc, flag, population, store };
})(window);

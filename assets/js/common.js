/* Outils partagés par toutes les pages : langue, typographie, dates, nombres, drapeaux, préférences. */
(function (global) {
  'use strict';
  const ROOT = document.body.dataset.root || './';
  const LANG = document.documentElement.lang === 'en' ? 'en' : 'fr';
  const DICT = (global.I18N || {})[LANG] || {};
  const LOC = LANG === 'en' ? 'en-GB' : 'fr-FR';
  const DATA = LANG === 'en' ? 'data/en/' : 'data/';

  // Texte d'interface, avec remplacement des {variables}.
  const L = (k, v) => String(DICT[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] !== undefined ? v[x] : ''));

  // Typographie : en français, espaces insécables et apostrophe typographique ; en anglais, l'apostrophe seulement.
  function typo(s) {
    s = String(s ?? '').replace(/'/g, '’');
    if (LANG !== 'fr') return s;
    return s.replace(/ ([?!;])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (s) => esc(typo(s));

  const utc = (d) => { const p = String(d).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
  const F = {
    long: new Intl.DateTimeFormat(LOC, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dm: new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    dmy: new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    dmyl: new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    my: new Intl.DateTimeFormat(LOC, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    hm: new Intl.DateTimeFormat(LOC, { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Paris' })
  };
  function day(d, ref) {
    const parts = String(d).split('-');
    if (parts.length === 2) return F.my.format(utc(d));
    return (ref && String(ref).slice(0, 4) === parts[0] ? F.dm : F.dmy).format(utc(d));
  }
  const dayLong = (d) => F.dmyl.format(utc(d));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const longDate = (d) => cap(F.long.format(utc(d)));
  const hour = (iso) => { const h = F.hm.format(new Date(iso)); return LANG === 'fr' ? h.replace(':', ' h ') : h; };
  const dayCount = (since, today) => Math.floor((utc(today) - utc(since)) / 864e5) + 1;
  const nf = new Intl.NumberFormat(LOC);
  const dec1 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 1 });
  const dec2 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 2 });
  // Nombre entier avec espace fine (français) ou virgule (anglais) comme séparateur de milliers.
  const int = (n) => (LANG === 'fr' ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : nf.format(Math.round(n)));

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
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  // Drapeau d'un pays (entrée de data/countries.json). Décoratif : le nom du pays est toujours à côté.
  const flag = (c, cls) => c && c.flag
    ? `<img class="flag${cls ? ' ' + cls : ''}" src="${ROOT}assets/flags/${c.flag}" alt="" width="20" height="15" loading="lazy" decoding="async">`
    : '';
  // Champ d'un pays dans la langue de la page (nom, capitale, langues, monnaies, continent).
  const cfield = (c, k) => (c ? (LANG === 'en' && c.en && c.en[k] !== undefined ? c.en[k] : c[k]) : undefined);

  // Population à la manière de la presse : « 92,4 millions », « 1.4 billion », « 560 000 ».
  function population(n) {
    if (!n) return '';
    if (n >= 1e9) { const v = n / 1e9; return `${dec1.format(v)} ${L(v >= 2 ? 'billions' : 'billion')}`; }
    if (n >= 1e6) { const v = n / 1e6; return `${v >= 100 ? Math.round(v) : dec1.format(v)} ${L(v >= 2 ? 'millions' : 'million')}`; }
    return int(Math.round(n / 1000) * 1000);
  }

  // Préférences du lecteur, sur cet appareil uniquement.
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tp.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('tp.' + k, JSON.stringify(v)); } catch (_) {} }
  };

  // Changement de langue : on mémorise le choix et on garde le sujet ouvert (#3) et l'archive (?d=).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.lang');
    if (!a) return;
    store.set('lang', a.getAttribute('hreflang'));
    a.href = a.href.split(/[?#]/)[0] + location.search + location.hash;
  });

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

  global.TP = { ROOT, LANG, LOC, DATA, L, fr: typo, typo, esc, t, day, dayLong, longDate, hour, dayCount, nf, dec1, dec2, int, json, icon, utc, flag, cfield, population, store, cap };
})(window);

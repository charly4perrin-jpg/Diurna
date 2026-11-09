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
    share: '<path d="M12 15V3M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>',
    listen: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M12 13v5M9.5 15.5h5"/>',
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

  // Mesure d'audience anonyme (GoatCounter, sans cookie, seulement si le site l'a activée).
  // Un événement n'est qu'un compteur : son nom et un libellé, jamais rien sur le lecteur.
  // Noms utilisés : fiche-ouverte, pays-clique, quiz-termine, partage, changement-langue,
  // installation-appli, inscription-newsletter, et module/<nom> pour chaque module interactif.
  const pending = [];
  function track(name, label) {
    const ev = { path: name, title: String(label || name).slice(0, 80), event: true };
    const gc = global.goatcounter;
    if (gc && typeof gc.count === 'function') { try { gc.count(ev); } catch (_) {} } else if (pending.length < 30) pending.push(ev);
  }
  global.addEventListener('load', () => {
    const gc = global.goatcounter;
    if (gc && typeof gc.count === 'function') pending.splice(0).forEach((ev) => { try { gc.count(ev); } catch (_) {} });
  });
  // Chaque module n'est compté qu'une fois par sujet affiché.
  const seen = new Set();
  const trackOnce = (name, label) => { if (seen.has(name + label)) return; seen.add(name + label); track(name, label); };

  // Partager : la feuille de partage du téléphone, sinon le lien est copié.
  async function share(title, url) {
    if (navigator.share) {
      try { await navigator.share({ title, url }); track('partage', 'natif'); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    try { await navigator.clipboard.writeText(url); track('partage', 'lien copié'); return 'copied'; } catch (_) { return 'failed'; }
  }

  // Changement de langue : on mémorise le choix et on garde le sujet ouvert (#3) et l'archive (?d=).
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.lang');
    if (!a) return;
    store.set('lang', a.getAttribute('hreflang'));
    track('changement-langue', 'vers ' + a.getAttribute('hreflang'));
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
  global.addEventListener('appinstalled', () => track('installation-appli'));

  // Jours de lecture (série) et pays suivis : gardés sur l'appareil seulement.
  const parisDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(d || new Date());
  function visit() {
    const days = new Set(store.get('days', [])), today = parisDay();
    if (!days.has(today)) { days.add(today); store.set('days', [...days].sort().slice(-60)); }
  }
  function streak() {
    const days = new Set(store.get('days', []));
    let n = 0, d = new Date();
    if (!days.has(parisDay(d))) d = new Date(d - 864e5);
    while (days.has(parisDay(d))) { n++; d = new Date(d - 864e5); }
    return n;
  }
  const follows = () => store.get('follow', []);
  function paintFollow() {
    const f = new Set(follows());
    document.querySelectorAll('[data-follow]').forEach((b) => {
      const on = f.has(b.dataset.follow);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('on', on);
      const sp = b.querySelector('span'); if (sp) sp.textContent = L(on ? 'following' : 'follow');
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-follow]');
    if (!b) return;
    const f = new Set(follows()), id = b.dataset.follow;
    if (f.has(id)) f.delete(id); else { f.add(id); track('module/suivre-pays', id); }
    store.set('follow', [...f]);
    paintFollow();
  });
  document.addEventListener('DOMContentLoaded', paintFollow);

  // Garder les 7 dernières éditions hors connexion (à la demande du lecteur seulement).
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-offline-save]');
    if (!b || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg || !reg.active) return;
    const label = b.querySelector('span');
    label.textContent = L('offlineSaving'); b.disabled = true;
    try {
      const rt = await json('data/routes.json');
      const days = Object.keys(rt[LANG] || {}).sort().slice(-7);
      const urls = days.flatMap((d) => Object.values(rt[LANG][d])).map((p) => ROOT + p);
      urls.push(ROOT + (LANG === 'en' ? 'en/' : ''));
      navigator.serviceWorker.addEventListener('message', function on(ev) {
        if (!ev.data || ev.data.type !== 'saved') return;
        navigator.serviceWorker.removeEventListener('message', on);
        label.textContent = L('offlineSaved', { n: ev.data.n }); track('module/hors-ligne', String(ev.data.n));
      });
      reg.active.postMessage({ type: 'save', urls });
    } catch (_) { label.textContent = L('offlineSave'); b.disabled = false; }
  });

  // Mode jour / nuit (la nuit reste le défaut) et taille du texte : réglages gardés sur l'appareil.
  const root = document.documentElement;
  const themeMeta = () => { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = root.dataset.theme === 'day' ? '#F6F2EA' : '#070C1D'; };
  const themeLabel = () => document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-label', root.dataset.theme === 'day' ? b.dataset.night : b.dataset.day));
  themeMeta(); themeLabel();
  const SIZES = ['', 'l', 'xl'];
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-theme-toggle]')) {
      const day = root.dataset.theme !== 'day';
      if (day) root.dataset.theme = 'day'; else delete root.dataset.theme;
      store.set('theme', day ? 'day' : null); if (!day) try { localStorage.removeItem('tp.theme'); } catch (_) {}
      themeMeta(); themeLabel(); track('module/theme', day ? 'jour' : 'nuit');
      document.dispatchEvent(new CustomEvent('tp:theme'));
    }
    if (e.target.closest('[data-textsize]')) {
      const next = SIZES[(SIZES.indexOf(root.dataset.size || '') + 1) % SIZES.length];
      if (next) root.dataset.size = next; else delete root.dataset.size;
      if (next) store.set('size', next); else try { localStorage.removeItem('tp.size'); } catch (_) {}
      track('module/taille-texte', next || 'normal');
    }
  });
  document.addEventListener('submit', (e) => { if (e.target.matches && e.target.matches('[data-newsletter]')) track('inscription-newsletter', LANG); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    global.addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));
  }

  // L'édition affichée est-elle en retard ? (après 7 h 45, heure de Paris, celle du jour devrait être là)
  function stale(date) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (k) => (parts.find((p) => p.type === k) || {}).value;
    const today = `${g('year')}-${g('month')}-${g('day')}`, mins = Number(g('hour')) * 60 + Number(g('minute'));
    return !!date && date < today && mins >= 7 * 60 + 45;
  }
  const methodHref = () => ROOT + (LANG === 'en' ? 'en/method/' : 'methode/');
  const aiLabel = () => `<span class="ai-label">${t(L('aiLabel'))} · <a href="${methodHref()}">${t(L('aiMore'))}</a></span>`;

  global.TP = { ROOT, LANG, LOC, DATA, L, fr: typo, typo, esc, t, day, dayLong, longDate, hour, dayCount, nf, dec1, dec2, int, json, icon, utc, flag, cfield, population, store, cap, stale, aiLabel, track, trackOnce, share, visit, streak, follows, paintFollow, parisDay };
})(window);

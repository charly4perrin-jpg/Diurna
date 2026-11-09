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
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
    shuffle: '<path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 2.8-1.6 3.9-3.6M14 9.6C15 8 16 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3"/>',
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
  // Sans feuille de partage (ordinateur), un petit menu propose de copier le lien ou de l'envoyer.
  async function share(title, url, anchor) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title, url }); track('partage', 'natif'); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    if (anchor) { sharePop(anchor, title, url); return 'menu'; }
    try { await navigator.clipboard.writeText(url); track('partage', 'lien copié'); return 'copied'; } catch (_) { return 'failed'; }
  }
  let spop = null;
  function closeSharePop() { if (spop) { spop.remove(); spop = null; } }
  function sharePop(anchor, title, url) {
    closeSharePop();
    const u = encodeURIComponent(url), tt = encodeURIComponent(title);
    const links = [['X', `https://x.com/intent/post?text=${tt}&url=${u}`], ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ['Bluesky', `https://bsky.app/intent/compose?text=${encodeURIComponent(title + ' ' + url)}`], ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`], [L('shareMail'), `mailto:?subject=${tt}&body=${u}`]];
    spop = document.createElement('div');
    spop.className = 'share-pop'; spop.setAttribute('role', 'dialog'); spop.setAttribute('aria-label', L('shareMenu'));
    spop.innerHTML = `<button type="button" class="sp-copy">${icon('share')}<span>${t(L('shareCopy'))}</span></button>${links.map(([n, h]) => `<a href="${esc(h)}" target="_blank" rel="noopener" data-net="${esc(n)}">${t(n)}</a>`).join('')}`;
    anchor.insertAdjacentElement('afterend', spop);
    spop.querySelector('.sp-copy').addEventListener('click', async (e) => {
      const sp = e.currentTarget.querySelector('span');
      try { await navigator.clipboard.writeText(url); sp.textContent = L('shareCopied'); track('partage', 'lien copié'); } catch (_) { sp.textContent = url; }
    });
    spop.addEventListener('click', (e) => { const a = e.target.closest('a[data-net]'); if (a) { track('partage', a.dataset.net); setTimeout(closeSharePop, 100); } });
    spop.querySelector('.sp-copy').focus();
  }
  document.addEventListener('click', (e) => { if (spop && !e.target.closest('.share-pop') && !e.target.closest('[data-share]')) closeSharePop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && spop) closeSharePop(); });

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

  // Réglages de lecture : thème, taille du texte, police, interligne, animations. Gardés sur l'appareil seulement.
  // Le script en tête de page applique déjà ces réglages avant l'affichage ; ici, on les change.
  const root = document.documentElement;
  const mqLight = global.matchMedia('(prefers-color-scheme: light)');
  const PREFS = {
    theme: [['night', 'thNight'], ['day', 'thDay'], ['auto', 'thAuto']],
    size: [['', 'szN'], ['l', 'szL'], ['xl', 'szXL']],
    font: [['', 'fontPress'], ['legible', 'fontLegible']],
    lh: [['', 'lhN'], ['airy', 'lhAiry']],
    motion: [['', 'mtAuto'], ['reduce', 'mtReduce']],
    focus: [['', 'focusOff'], ['on', 'focusOn']]
  };
  const pref = (k) => store.get(k, '') || (k === 'theme' ? 'night' : '');
  const themeMeta = () => { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = root.dataset.theme === 'day' ? '#F6F2EA' : '#070C1D'; };
  function applyPrefs() {
    const th = pref('theme');
    if (th === 'day' || (th === 'auto' && mqLight.matches)) root.dataset.theme = 'day'; else delete root.dataset.theme;
    for (const k of ['size', 'font', 'lh', 'motion', 'focus']) { const v = pref(k); if (v) root.dataset[k] = v; else delete root.dataset[k]; }
    themeMeta();
    document.dispatchEvent(new CustomEvent('tp:theme'));
  }
  const reducedMotion = () => root.dataset.motion === 'reduce' || global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setPref(k, v) {
    if (!v || (k === 'theme' && v === 'night')) { try { localStorage.removeItem('tp.' + k); } catch (_) {} } else store.set(k, v);
    applyPrefs(); track('module/reglages', k + ':' + (v || 'defaut'));
  }
  themeMeta();
  if (mqLight.addEventListener) mqLight.addEventListener('change', () => { if (pref('theme') === 'auto') applyPrefs(); });
  let panel = null, opener = null;
  const syncPanel = () => panel.querySelectorAll('input').forEach((i) => { i.checked = pref(i.name.slice(3)) === i.value; });
  const prefsFields = () => Object.entries(PREFS).map(([k, opts]) => `<fieldset><legend>${t(L('prefs_' + k))}</legend><div class="pseg">${opts.map(([v, lab]) => `<label><input type="radio" name="pf-${k}" value="${v}"><span>${t(L(lab))}</span></label>`).join('')}</div></fieldset>`).join('');
  // Réglages affichés dans une page (Réglages) plutôt que dans le panneau.
  function mountPrefs(host) {
    host.innerHTML = prefsFields();
    host.querySelectorAll('input').forEach((i) => { i.checked = pref(i.name.slice(3)) === i.value; });
    host.addEventListener('change', (e) => { const i = e.target; if (i.name && i.name.indexOf('pf-') === 0) setPref(i.name.slice(3), i.value); });
  }
  function buildPanel() {
    const el = document.createElement('div');
    el.className = 'prefs'; el.id = 'prefs'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'prefs-h');
    el.innerHTML = `<h2 id="prefs-h">${t(L('prefs'))}</h2><button class="p-close" type="button" aria-label="${esc(L('close'))}">${icon('close')}</button>` +
      prefsFields() +
      `<p class="p-note">${t(L('prefsNote'))} <button class="p-reset" type="button">${t(L('prefsReset'))}</button></p>`;
    el.addEventListener('change', (e) => { const i = e.target; if (i.name && i.name.indexOf('pf-') === 0) setPref(i.name.slice(3), i.value); });
    el.querySelector('.p-close').addEventListener('click', closePanel);
    el.querySelector('.p-reset').addEventListener('click', () => { Object.keys(PREFS).forEach((k) => { try { localStorage.removeItem('tp.' + k); } catch (_) {} }); applyPrefs(); syncPanel(); });
    document.body.appendChild(el);
    return el;
  }
  function openPanel(btn) {
    panel = panel || buildPanel(); syncPanel(); opener = btn; panel.hidden = false;
    document.querySelectorAll('[data-prefs]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    (panel.querySelector('input:checked') || panel.querySelector('input')).focus();
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.querySelectorAll('[data-prefs]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (opener && document.contains(opener)) opener.focus();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prefs]');
    if (b) { e.preventDefault(); if (panel && !panel.hidden) closePanel(); else openPanel(b); return; }
    if (panel && !panel.hidden && !e.target.closest('.prefs')) closePanel();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel && !panel.hidden) { e.stopImmediatePropagation(); closePanel(); } }, true);
  document.addEventListener('submit', (e) => { if (e.target.matches && e.target.matches('[data-newsletter]')) track('inscription-newsletter', LANG); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    global.addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}));
  }

  // Un sujet au hasard, parmi toutes les éditions de la langue de la page.
  async function randomStory() {
    try {
      const rt = await json('data/routes.json'), days = Object.keys(rt[LANG] || {});
      const d = days[Math.floor(Math.random() * days.length)], ranks = Object.keys(rt[LANG][d]).filter((k) => k !== 'bref');
      track('module/hasard', LANG);
      location.href = ROOT + rt[LANG][d][ranks[Math.floor(Math.random() * ranks.length)]];
    } catch (_) {}
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-random]')) { e.preventDefault(); randomStory(); } });

  // « Garder pour plus tard » : la liste reste sur l'appareil, et le sujet est gardé hors connexion.
  const savedList = () => store.get('saved', []);
  function paintSaved() {
    const have = new Set(savedList().map((x) => x.p));
    document.querySelectorAll('[data-save]').forEach((b) => {
      let it = null; try { it = JSON.parse(b.dataset.save); } catch (_) {}
      const on = !!it && have.has(it.p);
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
      const sp = b.querySelector('span'); if (sp) sp.textContent = L(on ? 'saved' : 'save');
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-save]');
    if (!b) return;
    let it; try { it = JSON.parse(b.dataset.save); } catch (_) { return; }
    const list = savedList(), i = list.findIndex((x) => x.p === it.p);
    if (i >= 0) list.splice(i, 1); else { list.unshift({ ...it, at: Date.now() }); track('module/garder', it.c || ''); }
    store.set('saved', list.slice(0, 200));
    paintSaved();
    if (i < 0 && navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'save', urls: [ROOT + it.p] });
  });
  document.addEventListener('DOMContentLoaded', paintSaved);

  // Palette « Aller à… » (Ctrl K, ⌘ K ou /) : sujets, pays, dossiers, glossaire et pages, sans quitter le clavier.
  let pal = null, palIx = null, palSel = 0, palItems = [];
  const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const KINDS = { s: 'kindStory', c: 'kindCountry', d: 'kindDossier', g: 'kindGloss', f: 'kindPage', a: 'kindAction' };
  function palActions() {
    const P = LANG === 'en' ? 'en/' : '';
    return [
      { k: 'a', t: L('random'), run: randomStory },
      { k: 'a', t: L('prefs'), run: () => { closePalette(); const b = document.querySelector('[data-prefs]'); if (b) b.click(); } },
      { k: 'f', t: L('myList'), p: LANG === 'en' ? 'en/my-list/' : 'ma-liste/' },
      { k: 'f', t: L('navMap'), p: LANG === 'en' ? 'en/map/' : 'carte/' },
      { k: 'f', t: L('navArchives'), p: P + 'archives/' }
    ];
  }
  function palRender() {
    const q = pal.querySelector('input').value.trim(), w = norm(q).split(/\s+/).filter(Boolean);
    let list = [];
    if (!w.length) list = palActions();
    else if (palIx) {
      list = palActions().concat(palIx).map((it) => {
        const hay = norm(`${it.t} ${it.n || ''} ${it.o || ''}`);
        if (!w.every((x) => hay.includes(x))) return null;
        return [(norm(it.t).startsWith(w[0]) ? 4 : 0) + ({ f: 3, a: 3, c: 2, d: 2, g: 1, s: 0 }[it.k] || 0), it];
      }).filter(Boolean).sort((a, b) => b[0] - a[0] || String(b[1].d || '').localeCompare(String(a[1].d || ''))).slice(0, 8).map((x) => x[1]);
      list.push({ k: 'a', t: L('palSearchAll', { q }), p: (LANG === 'en' ? 'en/search/' : 'recherche/') + '?q=' + encodeURIComponent(q) });
    }
    palItems = list; palSel = 0;
    pal.querySelector('ul').innerHTML = list.map((it, i) => `<li role="option" id="pal-${i}" aria-selected="${i === 0}" data-i="${i}"><span class="pk">${t(L(KINDS[it.k]))}</span><span class="pt">${t(it.t)}</span>${it.d ? `<time>${t(day(it.d))}</time>` : ''}</li>`).join('');
    pal.querySelector('input').setAttribute('aria-activedescendant', list.length ? 'pal-0' : '');
  }
  function palMove(d) {
    if (!palItems.length) return;
    palSel = (palSel + d + palItems.length) % palItems.length;
    pal.querySelectorAll('[role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === palSel)));
    const cur = pal.querySelector(`#pal-${palSel}`); cur.scrollIntoView({ block: 'nearest' });
    pal.querySelector('input').setAttribute('aria-activedescendant', 'pal-' + palSel);
  }
  function palGo(i) {
    const it = palItems[i]; if (!it) return;
    track('module/palette', it.k);
    if (it.run) { it.run(); return; }
    location.href = ROOT + it.p;
  }
  let palOpener = null;
  function openPalette() {
    palOpener = document.activeElement;
    if (!pal) {
      pal = document.createElement('div');
      pal.className = 'pal'; pal.hidden = true;
      pal.innerHTML = `<div class="pal-box" role="dialog" aria-modal="true" aria-label="${esc(L('palTitle'))}"><div class="pal-in">${icon('search')}<input type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${esc(typo(L('palPh')))}" aria-label="${esc(L('palTitle'))}"></div><ul id="pal-list" role="listbox"></ul><p class="pal-hint">${t(L('palHint'))}</p></div>`;
      document.body.appendChild(pal);
      const inp = pal.querySelector('input');
      inp.addEventListener('input', palRender);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); palGo(palSel); }
      });
      pal.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) palGo(Number(li.dataset.i)); else if (!e.target.closest('.pal-box')) closePalette(); });
    }
    pal.hidden = false; document.documentElement.classList.add('pal-on');
    const inp = pal.querySelector('input'); inp.value = ''; palRender(); inp.focus();
    if (!palIx) json(DATA + 'search.json').then((ix) => { palIx = ix; palRender(); }).catch(() => {});
  }
  function closePalette() {
    if (!pal || pal.hidden) return;
    pal.hidden = true; document.documentElement.classList.remove('pal-on');
    if (palOpener && palOpener.focus) palOpener.focus();
  }
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (pal && !pal.hidden) closePalette(); else openPalette(); return; }
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape' && pal && !pal.hidden) { e.stopImmediatePropagation(); closePalette(); }
  }, true);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-palette]'); if (b) { e.preventDefault(); openPalette(); } });

  // Copier une adresse ou un code (pages Flux, Presse) ; imprimer sans script en ligne.
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy], [data-copy-from]');
    if (b) {
      const v = b.dataset.copy || (document.getElementById(b.dataset.copyFrom) || {}).textContent || '';
      try { await navigator.clipboard.writeText(v); const old = b.textContent; b.textContent = L('copied'); setTimeout(() => { b.textContent = old; }, 1800); } catch (_) {}
      return;
    }
    if (e.target.closest('[data-print]')) window.print();
  });

  // Une nouvelle édition est parue pendant que la page était ouverte (ou depuis son chargement) : on le signale.
  function checkNewEdition() {
    const el = document.querySelector('.edition-line[data-date]') || (document.body.dataset.latest === '1' ? document.body : null);
    const shown = el && el.dataset.date;
    if (!shown || document.querySelector('.new-ed')) return;
    fetch(ROOT + DATA + 'latest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((ed) => {
      if (!ed || !ed.date || ed.date <= shown || document.querySelector('.new-ed')) return;
      const box = document.createElement('div');
      box.className = 'new-ed'; box.setAttribute('role', 'status');
      box.innerHTML = `<span>${t(L('newEd', { d: dayLong(ed.date) }))}</span><a class="btn" href="${ROOT}${LANG === 'en' ? 'en/' : ''}">${t(L('newEdGo'))}${icon('right')}</a><button type="button" class="p-close" aria-label="${esc(L('close'))}">${icon('close')}</button>`;
      box.querySelector('.p-close').addEventListener('click', () => box.remove());
      document.body.appendChild(box);
      track('module/nouvelle-edition', ed.date);
    }).catch(() => {});
  }
  global.addEventListener('load', () => setTimeout(checkNewEdition, 4000));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNewEdition(); });

  // L'édition affichée est-elle en retard ? (après 7 h 45, heure de Paris, celle du jour devrait être là)
  function stale(date) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (k) => (parts.find((p) => p.type === k) || {}).value;
    const today = `${g('year')}-${g('month')}-${g('day')}`, mins = Number(g('hour')) * 60 + Number(g('minute'));
    return !!date && date < today && mins >= 7 * 60 + 45;
  }
  const methodHref = () => ROOT + (LANG === 'en' ? 'en/method/' : 'methode/');
  const aiLabel = () => `<span class="ai-label">${t(L('aiLabel'))} · <a href="${methodHref()}">${t(L('aiMore'))}</a></span>`;

  global.TP = { ROOT, LANG, LOC, DATA, L, fr: typo, typo, esc, t, day, dayLong, longDate, hour, dayCount, nf, dec1, dec2, int, json, icon, utc, flag, cfield, population, store, cap, stale, aiLabel, track, trackOnce, share, visit, streak, follows, paintFollow, parisDay, pref, setPref, reducedMotion, paintSaved, savedList, randomStory, openPalette, mountPrefs, PREFS };
})(window);

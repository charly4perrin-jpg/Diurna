/* Page Réglages : réglages de lecture, langue, lecture, pays suivis, alertes, export et effacement des données locales. */
(function () {
  'use strict';
  const { t, L, LANG, ROOT, store, flag, json, cfield } = TP;
  const $ = (id) => document.getElementById(id);
  TP.mountPrefs($('setPrefs'));

  let countries = {};
  function stats() {
    const quiz = Object.keys(store.get('quiz', {})).length, pp = Object.keys(store.get('passport', {})).length;
    $('setStats').innerHTML = [[L('setDays'), store.get('days', []).length], [L('setStreak'), TP.streak()], [L('setQuiz'), quiz], [L('setCountries'), pp]]
      .map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${TP.int(v)}</dd></div>`).join('');
  }
  function follows() {
    const f = TP.follows();
    $('setFollow').innerHTML = f.length ? f.map((id) => `<li class="ml-row"><span class="h">${flag(countries[id])}${t(cfield(countries[id], 'name') || id)}</span><button class="act quiet" type="button" data-unfollow="${id}">${t(L('remove'))}</button></li>`).join('')
      : `<li class="ml-empty">${t(L('setFollowNone'))}</li>`;
  }
  $('setFollow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-unfollow]'); if (!b) return;
    store.set('follow', TP.follows().filter((x) => x !== b.dataset.unfollow)); follows();
  });

  // Alertes de nouvelle édition : synchronisation périodique et notification, seulement si le navigateur le permet.
  const can = 'serviceWorker' in navigator && 'periodicSync' in (window.ServiceWorkerRegistration ? ServiceWorkerRegistration.prototype : {}) && 'Notification' in window;
  const abtn = $('setAlertsBtn'), amsg = $('setAlertsMsg');
  const paintAlert = () => { const on = store.get('notify', false); abtn.textContent = L(on ? 'setAlertsOff' : 'setAlertsOn'); abtn.setAttribute('aria-pressed', String(on)); };
  if (!can) { abtn.hidden = true; amsg.textContent = L('setAlertsNo'); } else paintAlert();
  abtn.addEventListener('click', async () => {
    const on = !store.get('notify', false);
    const reg = await navigator.serviceWorker.ready;
    if (on) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { amsg.textContent = L('setAlertsDenied'); return; }
      try { await reg.periodicSync.register('diurna-edition', { minInterval: 6 * 3600e3 }); } catch (_) { amsg.textContent = L('setAlertsNo'); return; }
      amsg.textContent = L('setAlertsOk'); TP.track('module/alertes', 'on');
    } else { try { await reg.periodicSync.unregister('diurna-edition'); } catch (_) {} amsg.textContent = ''; }
    store.set('notify', on);
    if (reg.active) reg.active.postMessage({ type: 'settings', notify: on, lang: LANG });
    paintAlert();
  });

  // Export, import et effacement : toutes les clés « tp. » de cet appareil, rien d'autre.
  const msg = $('setDataMsg');
  function dump() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('tp.') === 0 && !/^tp\.(wx\.|capitals)/.test(k)) o[k] = localStorage.getItem(k); } } catch (_) {} return o; }
  $('setExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ diurna: 1, date: new Date().toISOString(), data: dump() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `diurna-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('setImport').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j || j.diurna !== 1 || typeof j.data !== 'object') throw new Error('bad');
      Object.entries(j.data).forEach(([k, v]) => { if (k.indexOf('tp.') === 0 && typeof v === 'string') localStorage.setItem(k, v); });
      msg.textContent = L('setImported'); setTimeout(() => location.reload(), 900);
    } catch (_) { msg.textContent = L('setImportBad'); }
    e.target.value = '';
  });
  $('setClear').addEventListener('click', () => { $('setClearSure').hidden = false; $('setClearSure').focus(); });
  $('setClearSure').addEventListener('click', () => {
    try { Object.keys(dump()).concat(Object.keys(localStorage).filter((k) => k.indexOf('tp.') === 0)).forEach((k) => localStorage.removeItem(k)); } catch (_) {}
    if ('caches' in window) caches.delete('diurna-pages').catch(() => {});
    $('setClearSure').hidden = true; msg.textContent = L('setCleared'); stats(); follows(); TP.mountPrefs($('setPrefs'));
    document.documentElement.removeAttribute('data-theme'); ['size', 'font', 'lh', 'motion', 'focus'].forEach((k) => delete document.documentElement.dataset[k]);
  });

  stats(); follows();
  json('data/countries.json').then((cs) => { countries = cs; follows(); }).catch(() => {});
})();

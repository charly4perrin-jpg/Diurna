/* Heure locale et météo d'un pays (sa capitale), depuis le navigateur, sans clé ni cookie.
   Données : Open-Meteo (licence CC BY 4.0). Seule la position de la capitale est envoyée.
   La position est gardée sur l'appareil ; la météo, trente minutes. */
(function (global) {
  'use strict';
  const WMO = {
    fr: { 0: 'ciel dégagé', 1: 'plutôt dégagé', 2: 'partiellement nuageux', 3: 'couvert', 45: 'brouillard', 48: 'brouillard givrant', 51: 'bruine légère', 53: 'bruine', 55: 'bruine dense', 56: 'bruine verglaçante', 57: 'bruine verglaçante', 61: 'pluie faible', 63: 'pluie', 65: 'forte pluie', 66: 'pluie verglaçante', 67: 'pluie verglaçante', 71: 'neige faible', 73: 'neige', 75: 'forte neige', 77: 'grains de neige', 80: 'averses', 81: 'averses', 82: 'violentes averses', 85: 'averses de neige', 86: 'averses de neige', 95: 'orage', 96: 'orage et grêle', 99: 'orage et grêle' },
    en: { 0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'showers', 81: 'showers', 82: 'violent showers', 85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail' }
  };
  const get = (k) => { try { return JSON.parse(localStorage.getItem('tp.' + k)); } catch (_) { return null; } };
  const set = (k, v) => { try { localStorage.setItem('tp.' + k, JSON.stringify(v)); } catch (_) {} };
  const pending = new Map();

  async function place(id, meta) {
    const all = get('capitals') || {};
    if (all[id]) return all[id];
    const name = (meta.en && meta.en.capital) || meta.capital;
    if (!name || !meta.a2) return null;
    const q = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name.replace(/ \(.*\)$/, ''))}&count=1&language=en&countryCode=${meta.a2.toUpperCase()}`;
    const r = await fetch(q).then((x) => x.json());
    const hit = r && r.results && r.results[0];
    if (!hit) return null;
    all[id] = { lat: hit.latitude, lon: hit.longitude, tz: hit.timezone };
    set('capitals', all);
    return all[id];
  }

  async function now(id, meta) {
    const cached = get('wx.' + id);
    if (cached && Date.now() - cached.at < 30 * 60e3) return cached;
    const p = await place(id, meta);
    if (!p) return null;
    const q = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const r = await fetch(q).then((x) => x.json());
    if (!r || !r.current) return null;
    const out = { at: Date.now(), tz: r.timezone || p.tz, temp: r.current.temperature_2m, code: r.current.weather_code, day: r.current.is_day };
    set('wx.' + id, out);
    return out;
  }

  // Renvoie « 14 h 05 · 22 °C, ciel dégagé » (ou null si indisponible).
  TP.live = function (id, meta) {
    if (!meta) return Promise.resolve(null);
    if (!pending.has(id)) pending.set(id, now(id, meta).catch(() => null).finally(() => setTimeout(() => pending.delete(id), 1000)));
    return pending.get(id).then((w) => {
      if (!w) return null;
      const lang = TP.LANG === 'en' ? 'en' : 'fr';
      let time = '';
      try { time = new Intl.DateTimeFormat(TP.LOC, { hour: 'numeric', minute: '2-digit', timeZone: w.tz }).format(new Date()); } catch (_) {}
      if (lang === 'fr') time = time.replace(':', ' h ');
      const temp = `${Math.round(w.temp)} °C`;
      return { time, temp, sky: WMO[lang][w.code] || '', day: !!w.day, text: [time, `${temp}${WMO[lang][w.code] ? ', ' + WMO[lang][w.code] : ''}`].filter(Boolean).join(' · ') };
    });
  };
})(window);

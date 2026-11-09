// Tests du site construit : node --test tests/*.test.mjs
// Vérifient ce qui doit rester vrai après chaque édition : textes FR/EN complets, pages présentes,
// liens internes valides, sécurité des pages, données et flux lisibles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const SKIP = new Set(['node_modules', '.git', 'tools', 'tests', 'og', 'icons', 'out', '.github', 'assets']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) && dir === root) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const pages = walk(root);
const rel = (p) => path.relative(root, p);
// Pages de redirection (sans en-tête ni politique de sécurité) : elles ne font que renvoyer ailleurs.
const REDIRECTS = new Set(['globe/index.html', 'en/edition/index.html', 'quiz/index.html', 'en/quiz/index.html']);

test('textes de l’interface : mêmes clés en français et en anglais', () => {
  const I = require('../assets/js/i18n.js');
  const fr = Object.keys(I.fr), en = Object.keys(I.en);
  assert.deepEqual(fr.filter((k) => !en.includes(k)), [], 'clés absentes en anglais');
  assert.deepEqual(en.filter((k) => !fr.includes(k)), [], 'clés absentes en français');
});

test('les éditions passent le vérificateur', () => {
  execFileSync('node', [path.join(root, 'tools/validate.mjs')], { stdio: 'pipe' });
});

test('chaque adresse de data/routes.json existe', () => {
  const rt = JSON.parse(fs.readFileSync(path.join(root, 'data/routes.json'), 'utf8'));
  const missing = [];
  for (const lang of Object.keys(rt)) for (const d of Object.keys(rt[lang])) for (const p of Object.values(rt[lang][d])) if (!fs.existsSync(path.join(root, p, 'index.html'))) missing.push(p);
  assert.deepEqual(missing, []);
});

test('chaque page : langue, titre, politique de sécurité, aucun script dans les attributs', () => {
  const bad = [];
  for (const f of pages) {
    const h = fs.readFileSync(f, 'utf8'), r = rel(f);
    if (!/<html lang="(fr|en)"/.test(h)) bad.push(`${r} : langue`);
    if (!/<title>[^<]+<\/title>/.test(h)) bad.push(`${r} : titre`);
    if (/\son(click|load|error|submit|change)=/.test(h)) bad.push(`${r} : script dans un attribut`);
    if (!REDIRECTS.has(r) && !/http-equiv="Content-Security-Policy"/.test(h)) bad.push(`${r} : CSP absente`);
  }
  assert.deepEqual(bad, []);
});

test('liens internes : chaque lien relatif mène à un fichier existant', () => {
  const dead = new Set();
  for (const f of pages) {
    if (rel(f) === '404.html') continue; // liens absolus vers le chemin du site en ligne
    const h = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    for (const m of h.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|tel:|data:|#|\/\/|javascript:)/.test(u) || u.includes('${')) continue;
      const clean = decodeURIComponent(u.split(/[?#]/)[0]);
      if (!clean) continue;
      const target = path.resolve(path.dirname(f), clean);
      const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
      if (!ok) dead.add(`${rel(f)} → ${u}`);
    }
  }
  assert.deepEqual([...dead].slice(0, 20), []);
});

test('données JSON lisibles', () => {
  const files = ['data/latest.json', 'data/en/latest.json', 'data/routes.json', 'data/map.json', 'data/en/map.json', 'data/search.json', 'data/glossary.json', 'data/outlets.json', 'data/sources.json', 'data/changelog.json', 'feed.json', 'en/feed.json', 'manifest.webmanifest', 'en/manifest.webmanifest', 'status.json'];
  for (const f of files) assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')), f);
});

test('flux, plans du site et OPML complets', () => {
  const ends = { 'feed.xml': '</rss>', 'atom.xml': '</feed>', 'en/feed.xml': '</rss>', 'all.xml': '</rss>', 'corrections/feed.xml': '</rss>', 'sitemap.xml': '</urlset>', 'news-sitemap.xml': '</urlset>', 'flux.opml': '</opml>', 'en/feeds.opml': '</opml>' };
  for (const [f, end] of Object.entries(ends)) {
    const x = fs.readFileSync(path.join(root, f), 'utf8').trim();
    assert.ok(x.startsWith('<?xml') && x.endsWith(end), f);
  }
});

test('chaque adresse du plan du site existe', () => {
  const site = JSON.parse(fs.readFileSync(path.join(root, 'site.json'), 'utf8'));
  const base = site.url.replace(/\/$/, '');
  const x = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const missing = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(base + '/', '')).filter((p) => !fs.existsSync(path.join(root, p, 'index.html')) && !fs.existsSync(path.join(root, p)));
  assert.deepEqual(missing, []);
});

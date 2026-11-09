// Contrôle qualité du site : accessibilité (axe-core) et validité HTML (validateur Nu du W3C).
// node tools/quality.mjs <adresse du site> [--axe] [--html]   (sans option : les deux)
// Il faut axe-core et vnu-jar installés (npm i --no-save axe-core vnu-jar) et Java pour le HTML.
// Ne bloque jamais rien : écrit un résumé (et le résumé du workflow sur GitHub) et sort avec 0.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(process.cwd(), 'noop.js'));
const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8080/').replace(/\/?$/, '/');
const want = (k) => !args.some((a) => a.startsWith('--')) || args.includes(k);
const out = [];
const say = (s = '') => { out.push(s); console.log(s); };

// Pages contrôlées : les pages fixes et le dernier jour dans les deux langues.
const routes = JSON.parse(fs.readFileSync(path.join(root, 'data/routes.json'), 'utf8'));
const pages = ['', 'en/', 'carte/', 'en/map/', 'archives/', 'pays/', 'dossiers/', 'recherche/', 'a-propos/', 'methode/',
  'semaine/', 'chiffres/', 'lettre/', 'presse/', 'corrections/', 'status/', 'confidentialite/', 'en/about/'];
for (const lang of ['fr', 'en']) {
  const r = routes[lang];
  const d = Object.keys(r).sort().pop();
  pages.push(r[d][1], r[d][3], r[d].bref, r[d].bref + 'quiz/');
}
const extra = ['accessibilite/', 'en/accessibility/', 'sources/', 'couverture/', 'en/coverage/', 'glossaire/', 'pays/israel/', 'dossiers/'].filter((p) => fs.existsSync(path.join(root, p, 'index.html')));
pages.push(...extra);

if (want('--axe')) {
  let axeSrc;
  try { axeSrc = fs.readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8'); } catch (_) { say('axe-core absent : accessibilité non contrôlée.'); }
  if (axeSrc) {
    const { chromium } = req('playwright');
    const browser = await chromium.launch();
    const found = new Map(); // id → {impact, help, pages:Set, nodes, sample}
    for (const [vp, list] of [[{ width: 390, height: 844 }, pages], [{ width: 1280, height: 800 }, pages.slice(0, 6)]]) {
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
      for (const p of list) {
        const page = await ctx.newPage();
        try {
          await page.goto(base + p, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(600);
          await page.addScriptTag({ content: axeSrc });
          const res = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] }));
          for (const v of res.violations) {
            const f = found.get(v.id) || { impact: v.impact, help: v.help, pages: new Set(), nodes: 0, sample: '' };
            f.pages.add(`${p || '/'} (${vp.width})`);
            f.nodes += v.nodes.length;
            if (!f.sample) f.sample = v.nodes[0].target.join(' ') + ' — ' + (v.nodes[0].failureSummary || '').split('\n').slice(0, 2).join(' ');
            found.set(v.id, f);
          }
        } catch (e) { say(`! ${p} : ${e.message.split('\n')[0]}`); }
        await page.close();
      }
      await ctx.close();
    }
    await browser.close();
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const list = [...found.entries()].sort((a, b) => order[a[1].impact] - order[b[1].impact]);
    say(`## Accessibilité (axe-core, WCAG 2.2 AA) — ${pages.length} pages`);
    if (!list.length) say('Aucun problème détecté.');
    for (const [id, f] of list) say(`- **${f.impact}** \`${id}\` : ${f.help} — ${f.nodes} élément(s), ${f.pages.size} page(s), ex. ${[...f.pages].slice(0, 3).join(', ')}\n  ${f.sample.slice(0, 260)}`);
  }
}

if (want('--html')) {
  let jar;
  try { jar = req('vnu-jar'); } catch (_) { say('vnu-jar absent : HTML non validé.'); }
  if (jar) {
    const files = [...new Set([...pages.map((p) => path.join(root, p, 'index.html')), path.join(root, '404.html')])].filter((f) => fs.existsSync(f));
    // Propriétés CSS valides que le validateur ne connaît pas encore (paint-order est dans SVG 2 et CSS Fill and Stroke).
    const KNOWN = '.*paint-order.*';
    // Le validateur écrit son rapport JSON sur la sortie d'erreur.
    const run = spawnSync('java', ['-jar', jar, '--format', 'json', '--errors-only', '--filterpattern', KNOWN, ...files], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const json = (run.stderr || '').slice((run.stderr || '').indexOf('{')) || run.stdout;
    let msgs = [];
    try { msgs = JSON.parse(json).messages || []; } catch (_) { say('Validateur HTML : sortie illisible.'); }
    const by = new Map();
    for (const m of msgs) {
      const k = m.message.replace(/“[^”]*”/g, '“…”');
      const f = by.get(k) || { n: 0, files: new Set(), ex: m };
      f.n++; f.files.add(path.relative(root, decodeURIComponent((m.url || '').replace('file:', ''))));
      by.set(k, f);
    }
    say(`\n## Validité HTML (validateur Nu du W3C) — ${files.length} fichiers`);
    if (!by.size) say('Aucune erreur.');
    for (const [k, f] of by) say(`- ${f.n}× ${k} — ex. ${[...f.files][0]} l. ${f.ex.lastLine} : \`${(f.ex.extract || '').replace(/\s+/g, ' ').slice(0, 120)}\``);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');

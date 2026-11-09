// Captures d'écran pour le manifeste de l'appli et la page Presse : node tools/screens.mjs <adresse du site>
// Écrit icons/screens/*.webp (à relancer de temps en temps, pas chaque jour).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'http://127.0.0.1:8791/').replace(/\/?$/, '/');
const routes = JSON.parse(fs.readFileSync(path.join(root, 'data/routes.json'), 'utf8')).fr;
const last = Object.keys(routes).sort().pop();
const out = path.join(root, 'icons/screens');
fs.mkdirSync(out, { recursive: true });
const shots = [
  ['mobile-home', '', { width: 390, height: 844 }, 2],
  ['mobile-story', routes[last][1], { width: 390, height: 844 }, 2],
  ['desktop-edition', routes[last][1], { width: 1440, height: 900 }, 1]
];
const b = await chromium.launch();
for (const [name, p, vp, dpr] of shots) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, locale: 'fr-FR', ...(vp.width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const pg = await ctx.newPage();
  await pg.goto(base + p, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1800);
  const png = path.join(out, name + '.png');
  await pg.screenshot({ path: png });
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').save('${png.replace('.png', '.webp')}', 'WEBP', quality=80)`]);
  fs.unlinkSync(png);
  await ctx.close();
}
await b.close();
console.log('Captures écrites dans icons/screens/');

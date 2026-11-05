// Test de bout en bout du site : node tools/e2e.mjs <url du site>
// Ouvre l'accueil, l'édition (globe) et une fiche, en français puis en anglais.
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://127.0.0.1:8080/').replace(/\/?$/, '/');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const browser = await chromium.launch();
for (const [lang, locale, home, edition] of [['fr', 'fr-FR', '', 'globe/'], ['en', 'en-GB', 'en/', 'en/edition/']]) {
  const ctx = await browser.newContext({ locale, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(base + home, { waitUntil: 'networkidle' });
  ok((await page.locator('h1').first().innerText()).trim().length > 10, `${lang} accueil : titre de une absent`);
  ok(await page.locator('.summary li').count() === 5, `${lang} accueil : il faut 5 sujets au sommaire`);
  ok(await page.locator('#coverGlobe svg path.g-land').count() > 100, `${lang} accueil : le globe ne s'affiche pas`);

  await page.goto(base + edition + '#2', { waitUntil: 'networkidle' });
  await page.waitForSelector('.article h2', { timeout: 15000 }).catch(() => {});
  ok(await page.locator('.article h2').count() === 1, `${lang} fiche : titre de l'article absent`);
  ok(await page.locator('.mods .mod').count() >= 2, `${lang} fiche : modules absents`);
  ok(await page.locator('#globe svg path.g-land').count() > 100, `${lang} édition : le globe ne s'affiche pas`);
  ok(await page.locator('.ai-label').count() >= 1, `${lang} fiche : label IA absent`);
  await page.locator('.step[data-step="6"]').click();
  ok(await page.locator('.brief li').count() >= 2, `${lang} En bref : vide`);

  ok(errors.length === 0, `${lang} : erreurs JavaScript — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();

if (fails.length) { console.error(fails.map((f) => '✗ ' + f).join('\n')); process.exit(1); }
console.log(`OK — accueil, globe, fiche et En bref fonctionnent en français et en anglais (${base}).`);

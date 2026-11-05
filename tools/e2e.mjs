// Test de bout en bout du site : node tools/e2e.mjs <url du site>
// Ouvre l'accueil, l'ancienne adresse /globe/#2 (redirigée vers la page du sujet), passe d'un sujet
// à l'autre, revient en arrière, puis teste la recherche, en français puis en anglais.
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://127.0.0.1:8080/').replace(/\/?$/, '/');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const browser = await chromium.launch();
for (const [lang, locale, home, edition, search, q] of [['fr', 'fr-FR', '', 'globe/', 'recherche/', 'soudan'], ['en', 'en-GB', 'en/', 'en/edition/', 'en/search/', 'sudan']]) {
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
  await page.waitForURL(/\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/, { timeout: 15000 }).catch(() => {});
  const storyUrl = page.url();
  ok(/\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/$/.test(storyUrl), `${lang} : /globe/#2 ne mène pas à la page du sujet (${storyUrl})`);
  await page.waitForSelector('.article h2', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.mods .mod + .mod', { timeout: 15000 }).catch(() => {});
  ok(await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.some((e) => JSON.parse(e.textContent)['@type'] === 'NewsArticle')), `${lang} fiche : JSON-LD NewsArticle absent`);
  ok(await page.locator('.step[data-step="2"][aria-current="step"]').count() === 1, `${lang} fiche : le sujet 2 n'est pas sélectionné`);
  ok(await page.locator('.article h2').count() === 1, `${lang} fiche : titre de l'article absent`);
  ok(await page.locator('.mods .mod').count() >= 2, `${lang} fiche : modules absents`);
  ok(await page.locator('#globe svg path.g-land').count() > 100, `${lang} édition : le globe ne s'affiche pas`);
  ok(await page.locator('.ai-label').count() >= 1, `${lang} fiche : label IA absent`);
  await page.locator('.step[data-step="6"]').click();
  ok(await page.locator('.brief li').count() >= 2, `${lang} En bref : vide`);
  ok(/\/\d{2}\/$/.test(page.url()), `${lang} En bref : l'adresse ne change pas (${page.url()})`);
  await page.goBack();
  await page.waitForTimeout(400);
  ok(page.url() === storyUrl && await page.locator('.step[data-step="2"][aria-current="step"]').count() === 1, `${lang} : le retour arrière ne revient pas au sujet 2`);

  await page.goto(base + search + '?q=' + q, { waitUntil: 'networkidle' });
  await page.waitForSelector('#results li', { timeout: 10000 }).catch(() => {});
  ok(await page.locator('#results li').count() >= 1, `${lang} recherche : aucun résultat pour « ${q} »`);

  ok(errors.length === 0, `${lang} : erreurs JavaScript — ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();

if (fails.length) { console.error(fails.map((f) => '✗ ' + f).join('\n')); process.exit(1); }
console.log(`OK — accueil, globe, fiche et En bref fonctionnent en français et en anglais (${base}).`);

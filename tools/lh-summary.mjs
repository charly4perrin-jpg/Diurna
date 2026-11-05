// Résumé lisible des mesures Lighthouse (médiane des passages) : node tools/lh-summary.mjs [.lighthouseci]
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || '.lighthouseci';
const runs = fs.readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const by = new Map();
for (const r of runs) { const u = r.finalDisplayedUrl || r.finalUrl || r.requestedUrl; if (!by.has(u)) by.set(u, []); by.get(u).push(r); }
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (x) => Math.round(x * 100);
console.log('Lighthouse, mobile (simulation 4G lente, processeur ralenti), médiane de ' + (runs.length / Math.max(by.size, 1)) + ' passages');
console.log('Page | Perf | Access. | Bonnes pratiques | SEO | LCP | CLS | TBT | Poids total');
for (const [u, rs] of by) {
  const c = (k) => pct(med(rs.map((r) => r.categories[k].score || 0)));
  const a = (k) => med(rs.map((r) => (r.audits[k] && r.audits[k].numericValue) || 0));
  console.log(`${u.replace(/^https?:\/\/[^/]+/, '')} | ${c('performance')} | ${c('accessibility')} | ${c('best-practices')} | ${c('seo')} | ${(a('largest-contentful-paint') / 1000).toFixed(1)} s | ${a('cumulative-layout-shift').toFixed(3)} | ${Math.round(a('total-blocking-time'))} ms | ${Math.round(a('total-byte-weight') / 1024)} Ko`);
}

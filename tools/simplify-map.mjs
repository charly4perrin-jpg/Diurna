// Carte du globe, allégée : node tools/simplify-map.mjs (à relancer seulement si la carte source change)
// Part de tools/map-src/world-110m.json (Natural Earth 1:110m via world-atlas, avec les codes et noms
// ajoutés par Diurna), retire l'objet « land » (inutilisé), simplifie les tracés en gardant 30 % des
// points les plus significatifs, puis quantifie les coordonnées sur une grille de 10 000 × 10 000.
// Nécessite : npm install --no-save topojson-simplify@3.0.3 topojson-client@3.1.0
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { presimplify, simplify, quantile } = require('topojson-simplify');
const { quantize } = require('topojson-client');
const src = new URL('./map-src/world-110m.json', import.meta.url), out = new URL('../assets/world.json', import.meta.url);
let topo = JSON.parse(fs.readFileSync(src, 'utf8'));
delete topo.objects.land;
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.3));
topo = quantize(topo, 1e4);
fs.writeFileSync(out, JSON.stringify(topo));
console.log(`assets/world.json : ${(fs.statSync(src).size / 1000).toFixed(0)} ko → ${(fs.statSync(out).size / 1000).toFixed(0)} ko`);

# Trois Phrases

Un quotidien international bref : cinq sujets chaque matin, écrits comme un article de presse, et un globe pour les situer.

Site statique publié avec GitHub Pages, installable comme application (PWA).

## Structure

| Dossier | Contenu |
| --- | --- |
| `data/` | Les éditions (`editions/AAAA-MM-JJ.json`), la dernière (`latest.json`) et la liste (`index.json`) |
| `assets/` | Feuille de style, scripts, polices auto-hébergées, carte du monde |
| `tools/` | `validate.mjs` (vérifie les données) et `build.mjs` (génère les pages) |
| `EDITORIAL.md` | Charte éditoriale et format des données — à lire avant toute nouvelle édition |

## Publier une édition

```sh
node tools/validate.mjs   # doit répondre OK
node tools/build.mjs      # régénère index.html, globe/, archives/, methode/, sw.js
git add -A && git commit -m "Édition du AAAA-MM-JJ" && git push
```

Aucune dépendance à installer : Node 18 ou plus suffit.

## Données pays

- `data/countries.json` : capitale, population, langues, monnaie, continent et drapeau de chaque pays du globe. Généré par `node tools/countries.mjs <countries.json> <population.csv>` à partir de [mledoze/countries](https://github.com/mledoze/countries) et des données de population de la Banque mondiale ([datasets/population](https://github.com/datasets/population)). À relancer une fois par an.
- `data/gov.json` : dirigeants et régime des pays de l'édition, vérifiés chaque jour par la mise à jour automatique (voir `EDITORIAL.md`).
- `assets/flags/` : drapeaux de [flag-icons](https://github.com/lipis/flag-icons) (licence MIT) ; les plus lourds sont convertis en WebP.

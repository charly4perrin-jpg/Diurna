# Trois Phrases

L'actualité du monde chaque matin : cinq sujets, trois phrases chacun, et un globe pour voir où ça se passe.

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

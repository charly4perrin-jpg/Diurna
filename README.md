# Diurna

**Le monde, chaque jour, en trois phrases.** Un quotidien international bref : cinq sujets chaque matin, écrits comme un article de presse, et un globe pour les situer.

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

## Configuration : `site.json`

Une seule ligne à changer pour déménager le site : `url` (sans barre finale). Tout le reste du site
utilise des chemins relatifs. Les comptes externes restent éteints tant que leur champ est vide.

| Champ | Rôle |
|---|---|
| `url` | adresse publique du site (`https://diurna.world` quand le domaine sera branché) |
| `legacy` | anciennes adresses, contrôlées par le workflow « Contrôle en ligne » |
| `domain` | domaine choisi : le contrôle en ligne vérifie ses DNS |
| `repo` | dépôt GitHub (formulaire « Signaler une erreur ») |
| `contact` | adresse e-mail publique de contact (mentions légales, confidentialité, « Ton avis ? » si pas de Tally) |
| `goatcounter` | code du site GoatCounter (`diurna` pour `https://diurna.goatcounter.com`) : active la mesure d'audience |
| `buttondown` | nom d'utilisateur Buttondown : affiche le formulaire d'inscription |
| `newsletter` | `{ "mode": "draft" ou "send", "langs": ["fr"] }` : brouillon (par défaut) ou envoi automatique |
| `tally` | identifiant du formulaire Tally (`https://tally.so/r/XXXX`) pour « Ton avis ? » |
| `kofi` | identifiant Ko-fi : affiche « Soutenir Diurna » dans le pied de page |
| `support` | `false` masque le lien de soutien même si `kofi` est rempli |
| `sponsor` | `{ "enabled": false, "name": "", "url": "" }` : bandeau « Édition soutenue par… » |
| `license`, `license_en` | licence des textes, affichée dans les mentions légales |
| `googleVerification` | jeton de vérification Google Search Console (méthode « balise HTML ») |

Secrets GitHub Actions (jamais dans le site) : `BUTTONDOWN_API_KEY` pour déposer l'e-mail du jour.

## Workflows

- **Publier** : valide l'édition et les liens, construit, déploie (si Pages est en mode « GitHub Actions »), alerte en cas d'échec.
- **Données chiffrées** : marchés, taux, inflation, catastrophes, chaque matin.
- **Diffusion** : carrousel de 6 images 1080 × 1350 avec légende, et e-mail du jour, à télécharger dans « Artifacts ».
- **Surveillance** : vérifie matin et soir que l'édition du jour est en ligne.
- **Contrôle en ligne** : preuves du site public (codes HTTP, balises, données structurées, flux validés par le W3C).

## Performance

- Polices : `python3 tools/fonts.py` produit, depuis les polices complètes de `tools/fonts-src/`, trois fichiers
  WOFF2 allégés (79 ko au total) dans `assets/fonts/`.
- Carte : `node tools/simplify-map.mjs` simplifie et quantifie `tools/map-src/world-110m.json` vers `assets/world.json`.
- Le CSS est écrit dans chaque page par `tools/build.mjs` (pas de requête bloquante) ; le globe, d3 et les modules
  se chargent une fois le texte affiché, et le globe de l'accueil ne commence à tourner qu'après quelques secondes.
- Le workflow **Performance** mesure le site public avec Lighthouse (mobile) après chaque mise en ligne.

## Pages et fonctions ajoutées (novembre 2026)

- **Lecture** : temps de lecture, glossaire (`data/glossary.json`), écoute, taille du texte, mode jour, sujets lus,
  balayage, raccourcis clavier (`?`), version imprimable (`/AAAA/MM/JJ/imprimer/`).
- **Globe** : page Carte (`/carte/`, chaleur 7/30 jours, rejeu, recherche, jour/nuit, météo des capitales par Open-Meteo),
  légende, plein écran, carte de situation des pages pays.
- **Revenir** : quiz du jour (`/quiz/` mène au dernier), série, pays suivis, agenda `.ics`, `/semaine/`, `/chiffres/`,
  frise des dossiers, « Hier dans Diurna », partage d'un passage.
- **Diffusion** : image de la une, stories (`/AAAA/MM/JJ/stories/`), lecture hors connexion (bouton dans « En bref »),
  manifeste enrichi (`tools/screens.mjs` pour les captures), carrousel 1080 × 1920, légendes LinkedIn et X,
  lettre du jour (`/lettre/`), page Presse, flux JSON et flux par pays, chiffres clés sur À propos.
- **Confiance** : mises à jour datées (`updates`), page Corrections, sources de référence (`data/sources.json`),
  historique de publication (`data/history.json`), contrôle mensuel des liens (workflow « Liens des archives »).

## Ajouts du 9 novembre (lots 6 à 10)

- **Finition et accessibilité** : réglages de lecture (bouton Aa : thème, taille, police Atkinson Hyperlegible, interligne,
  animations, globe masqué), mode contraste élevé, page Accessibilité, page 404 bilingue.
- **Comprendre** : « Les faits » / « L'analyse », encadré Couverture (`data/outlets.json`), « Avant, dans Diurna »
  (`data/xtra/`), pages Nos sources (`/sources/`), Baromètre de couverture (`/couverture/`), Glossaire (`/glossaire/`),
  fiches pays et dossiers enrichies, liens entre pays sur la carte, édition en une minute.
- **Navigation** : palette « Aller à… » (Ctrl K ou /), recherche filtrée et tolérante aux fautes, calendrier des archives,
  sujet au hasard, progression de lecture, « Garder » et Ma liste (`/ma-liste/`), préchargement et transitions.
- **Ouverture et sécurité** : `llms.txt`, `edition.md` par jour et `latest.md`, Données ouvertes (`/donnees/`), widget
  (`/widget/`), Flux et OPML (`/flux/`), flux des corrections, CSP avec empreintes des scripts, `security.txt`,
  `humans.txt`, Nouveautés (`/nouveautes/`, contenu dans `data/changelog.json`).
- **Appli et outils** : Réglages (`/reglages/`, export et effacement des données), avis de nouvelle édition,
  synchronisation périodique et alerte sur demande, quiz de la semaine (`/semaine/quiz/`), passeport (`/passeport/`),
  jeu « Où est-ce ? » (`/jeu/`).
- **Contrôles** : workflow « Qualité » (axe-core, validateur Nu du W3C, détecteur Impeccable, `tools/quality.mjs`),
  workflow « Tests » (`node --test tests/*.test.mjs`).

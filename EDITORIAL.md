# Diurna — charte éditoriale et format des données

Ce fichier fait foi pour chaque mise à jour du site. Toute édition qui ne respecte pas
ces règles ou ce format doit être corrigée avant publication (`node tools/validate.mjs`).

## 1. La promesse au lecteur

- Un quotidien international court, écrit comme un journal de référence (modèle : *Le Monde*,
  *La Matinale*, *The Economist*). Lecteurs adultes, curieux, qui n'ont pas le temps de tout suivre.
- Une édition se lit en **cinq minutes** : **5 essentiels** + **En bref** (3 ou 4 lignes) + **À venir**.
- Le cœur de chaque sujet tient en **trois phrases** rédigées, qui forment un paragraphe continu.

## 2. Choisir les 5 essentiels

1. **Croiser les unes.** Un sujet entre dans les essentiels s'il est traité en tête par au moins
   trois de ces rédactions : Reuters, Associated Press, AFP, BBC, Le Monde, The Economist,
   Al Jazeera, The New York Times, Financial Times, France 24, The Guardian, NPR.
   Quand un site n'est pas lisible, passer par la recherche (titre + date) ou par les revues
   de presse (Anadolu « Morning Briefing », 10 Things, CFR Global Conflict Tracker).
2. **Préférer le concret.** Un sujet passe s'il change quelque chose *cette semaine* : un vote,
   une décision, des combats, un prix, une date. Une tendance de fond sans événement du jour
   va dans « À venir » ou attend.
3. **Rang = importance du jour** (1 = le plus important). Les rangs 1 à 4 sont les sujets
   dominants de l'actualité internationale.
4. **Le rang 5 est toujours « Loin des caméras »** : une crise grave peu couverte par les médias
   français (Soudan, RD Congo, Sahel, Haïti, Birmanie, Yémen, Éthiopie, Pakistan-Afghanistan…).
   On fait tourner ces crises d'une semaine à l'autre.
5. **France.** Le site parle du monde : l'actualité française ne passe en essentiel que si elle a
   une portée internationale ; sinon une ligne dans En bref suffit.
6. **Continuité.** Un sujet peut rester plusieurs jours de suite. On réécrit les trois phrases
   dès que la situation bouge ; sinon on garde le texte et on met à jour `context`.

## 3. Écrire

Le ton est celui d'un quotidien de référence : précis, sobre, élégant. Jamais de tutoiement,
jamais de vouvoiement non plus : on écrit de manière impersonnelle, à la troisième personne.

**Structure d'un sujet**
- `section` : la rubrique (Europe, Moyen-Orient, Afrique, Amériques, Asie-Pacifique, International).
- `title` : un vrai titre de presse, informatif, 8 à 16 mots, qui dit le fait et son enjeu
  (« En Ukraine, la Russie s'en prend au réseau électrique avant de nouveaux pourparlers »).
  Pas de jeu de mots, pas de question rhétorique, sauf exception justifiée.
- `standfirst` (chapô) : deux phrases qui résument le sujet pour qui ne lira que cela.
- `body` : **trois phrases**, qui s'enchaînent comme un paragraphe d'article. La première pose
  le fait du jour, daté et situé ; la deuxième en donne les causes et les enjeux ; la troisième
  ouvre sur la suite. Chaque phrase fait 20 à 55 mots.
- `figure` : le **chiffre du jour**, tiré du texte ou des sources du sujet, jamais calculé au jugé.
  `value` (1 à 4 mots : « 53 », « ≈ 100 $ », « 13 millions »), `label` (ce qu'il mesure),
  `compare` (facultatif, une comparaison qui lui donne du sens : « contre environ 72 $ avant la guerre »).
- `analysis` : un intertitre court et un paragraphe de décryptage (70 à 150 mots) qui apporte
  ce que le lecteur ne trouvera pas dans le fait brut : un contexte, un mécanisme, une perspective.
- `keys` : deux ou trois « clés », chacune avec un titre nominal (« Le rôle du Qatar »,
  « Le calendrier ») et deux phrases d'explication. Pas de questions naïves.

**Règles de style**
- Nommer les personnes avec leur fonction à la première occurrence (« le chef de la diplomatie
  iranienne, Abbas Araghtchi ») ; dates et lieux précis.
- Graphies françaises de presse : Kiev, Abou Dhabi, Nétanyahou, Al-Bourhane, Hemetti, El-Fasher.
- Neutralité : chiffres, accusations et revendications toujours attribués (« selon le ministère
  de la santé de Gaza », « Téhéran affirme »). Pas d'adjectif d'opinion.
- Tout est reformulé : aucune phrase reprise d'une source, citations de quelques mots au plus,
  entre guillemets français.
- Uniquement des faits vérifiés dans au moins une source fiable, ou bien établis.
- Typographie française : espace insécable avant « : ; ? ! », guillemets « », apostrophe ’
  (le site l'applique automatiquement à l'affichage).

## 3 bis. Types d'actualité et modules

Chaque sujet reçoit 1 à 3 **types**, le principal d'abord : `conflict`, `election`, `economy`,
`diplomacy`, `disaster`, `society`. La fiche affiche automatiquement les modules de ces types,
dans `modules`. **Règle absolue : un module n'est écrit que si ses données sont vérifiées et
sourcées.** Sinon on l'omet : jamais de module vide, jamais de chiffre estimé, jamais de citation.

| Module | Pour | Contenu |
|---|---|---|
| `toll` | conflit, catastrophe | bilans chiffrés, chacun avec `value`, `label`, `by` (qui l'avance), `date` |
| `places` | conflit, catastrophe | lieux cités : `name`, `coords` [lon, lat] vérifiées, `note` |
| `sides` | conflit | camps (`groups` : `name`, `lead`, `ids`, `note`, `backers` [{`id`, `note`}]) et `mediators` |
| `vote` | élection | `title`, `date`, `asOf`, `system`, `note`, `bodies` [{`name`, `total`, `majority`, `parties` [{`name`, `value`, `color`}], `rest`}] |
| `scenarios` | élection | « ce qui change si… » : `items` [{`if`, `then`}], uniquement des conséquences établies ou attribuées |
| `table` | diplomatie | pays à la table (`ids`, `host`), `positions` [{`who`, `wants`}], `next` {`d`, `t`} |
| `impact` | tous | « ce que ça change pour toi » : 15 à 70 mots, un effet concret et chiffré pour un jeune en France (en anglais : en Europe), écrit de façon impersonnelle |
| `market` | économie | `{ "series": "brent", "from": "AAAA-MM-JJ", "mark": { "d": "…", "label": "…" } }` : la courbe vient de `data/markets.json` |
| `rate` | économie | `{ "currency": "USD" }` : taux BCE, seulement pour les monnaies publiées par la BCE |
| `inflation` | économie | `{}` : dernier chiffre de la Banque mondiale pour le pays |
| `help` | catastrophe, crise humanitaire | `{ "orgs": [...] }`, uniquement parmi `icrc`, `ifrc`, `msf`, `unicef`, `wfp`, `unhcr`, `crf` |
| `actors`, `dates` | société | acteurs (`name`, `role`) ; trois dates (`d`, `t`) |

- Chaque module porte une `source` { `name`, `url` } (ou une source par élément), sauf
  `market`, `rate`, `inflation` et `help`, alimentés par les données publiques ou une liste fermée.
- Le compteur de durée vient de `since` ; le chiffre du jour de `figure`.
- `colors` des partis : `blue`, `red`, `amber`, `green`, `violet`, `grey`.
- Les données chiffrées publiques (`data/markets.json`, `data/indicators.json`, `data/hazards.json`)
  sont récupérées chaque matin vers 5 h 30 par la GitHub Action « Données chiffrées » : ne pas les
  modifier à la main.

## 3 ter. L'édition anglaise

Chaque édition existe aussi en anglais, dans `data/en/editions/<date>.json` (copie dans
`data/en/latest.json`, liste dans `data/en/index.json`). Mêmes rangs, mêmes pays, même numéro,
même structure et mêmes modules que l'édition française.

- Elle est **écrite pour un lecteur anglophone**, pas traduite mot à mot : anglais britannique,
  ton d'un quotidien de référence (*The Economist*, *The Guardian*), graphies anglaises (Kyiv,
  Netanyahu, al-Burhan, Hemedti), chiffres à l'anglaise (15,172 ; $107 ; €2.29).
- `impact` vise un jeune Européen en général, pas seulement un Français.
- Les champs de `data/gov.json` existent en anglais : `regime_en`, `role_en`, et `name_en` quand
  la graphie anglaise d'un nom diffère.

## 4. Fichiers

```
data/latest.json                 l'édition du jour (copie exacte du fichier daté)
data/editions/AAAA-MM-JJ.json    une édition par jour, jamais modifiée après coup
                                 (sauf mise à jour du soir le même jour)
data/index.json                  liste des éditions, la plus récente en premier
data/en/…                        la même chose en anglais (latest.json, editions/, index.json)
data/gov.json                    dirigeants et régime des pays cités, vérifiés (voir ci-dessous)
data/countries.json              fiche fixe de chaque pays (capitale, population…) : ne pas modifier
                                 à la main, regénérée par tools/countries.mjs
```

### Dirigeants et régime : `data/gov.json`

Chaque pays des **5 essentiels** doit y figurer, vérifié depuis moins de 30 jours (le validateur
le refuse sinon). Pour chaque pays de l'édition : vérifier dans une source récente qui dirige
le pays, mettre à jour l'entrée si besoin, et passer `checked` à la date du jour. Les pays d'En bref
peuvent y être ajoutés de la même façon.

```json
"IRN": { "regime": "République islamique",
         "leaders": [ { "role": "Guide suprême", "name": "Mojtaba Khamenei" },
                      { "role": "Président", "name": "Massoud Pezeshkian" } ],
         "checked": "2026-11-05",
         "source": { "name": "…", "url": "https://…" } }
```

- Un ou deux dirigeants : le chef de l'exécutif réel, et le chef de l'État s'il est distinct et
  significatif. Fonctions en français, sans majuscule superflue (« Premier ministre », « Président »).
- Situation particulière dite dans la fonction : « Premier ministre (affaires courantes) ».
- Régime en quelques mots, neutre : « Démocratie parlementaire », « Pouvoir militaire de transition ».

### Format d'une édition

```jsonc
{
  "date": "2026-11-05",              // date de l'édition (Europe/Paris)
  "number": 1,                       // numéro, +1 à chaque nouvelle date
  "updated": "2026-11-05T07:00:00+01:00", // heure de la dernière mise à jour
  "headline": "Titre de une",        // 6 à 16 mots
  "standfirst": "Chapô de la une, deux phrases.",
  "essentials": [                    // exactement 5, triés par rank
    {
      "rank": 1,
      "id": "USA",                   // code ISO 3166-1 alpha-3 du pays principal
      "place": "États-Unis",
      "section": "Amériques",
      "focus": [-97, 39],            // optionnel : [lon, lat] où centrer le globe
      "radar": false,                // true uniquement pour le rang 5
      "title": "…",
      "standfirst": "…",
      "types": ["diplomacy", "conflict", "economy"],
      "body": ["phrase 1", "phrase 2", "phrase 3"],
      "modules": { "table": { … }, "toll": { … }, "market": { "series": "brent", "from": "2026-01-01" } },
      "figure": { "value": "≈ 100 $", "label": "le prix du baril de Brent", "compare": "contre environ 72 $ avant la guerre" },
      "since": { "date": "2026-02-28", "label": "de guerre" },  // optionnel
      "analysis": { "title": "…", "text": "…" },
      "keys": [ { "title": "…", "text": "…" } ],              // 2 ou 3
      "involved": ["IRN"],           // autres pays concernés (codes ISO)
      "zones": [ { "id": "HORMUZ", "name": "Ormuz", "coords": [56.4, 26.5] } ],  // optionnel
      "context": [ { "d": "2026-02-28", "t": "…" } ],         // 3 à 6 repères, du plus ancien
                                                               // au plus récent ; dates futures permises
      "sources": [ { "name": "Al Jazeera", "title": "…", "url": "https://…", "date": "2026-11-04" } ]
    }
  ],
  "brief": [ { "id": "BRA", "place": "Brésil", "text": "Une phrase de 20 à 45 mots.", "url": "https://…" } ],
  "agenda": [ { "d": "2026-11-10", "t": "…" } ],
  "consulted": ["Reuters", "AP", "…"]
}
```

### Format de `data/index.json`

```json
[ { "date": "2026-11-05", "number": 1, "headline": "…",
    "places": ["États-Unis", "Iran", "Ukraine", "Israël", "Soudan"] } ]
```

Codes pays : ISO alpha-3 tels qu'ils figurent dans `assets/world.json`
(Kosovo XKX, Taïwan TWN, Palestine PSE, Somaliland SOL). Les très petits pays absents de
la carte (Bahreïn, Singapour, Malte…) se placent avec `focus` et une entrée dans `zones`.

## 5. Publier

1. Écrire `data/editions/<date>.json`, copier vers `data/latest.json`, mettre à jour `data/index.json`,
   vérifier et mettre à jour `data/gov.json` pour les pays de l'édition. L'édition anglaise suit
   (même procédure dans `data/en/`).
2. `node tools/validate.mjs` doit répondre `OK`.
3. `node tools/build.mjs` régénère les pages.
4. Commit `Édition du <date>` puis push sur `main` : le site se met à jour en une à deux minutes.

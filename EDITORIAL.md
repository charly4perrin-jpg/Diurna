# Trois Phrases — charte éditoriale et format des données

Ce fichier fait foi pour chaque mise à jour du site. Toute édition qui ne respecte pas
ces règles ou ce format doit être corrigée avant publication (`node tools/validate.mjs`).

## 1. La promesse au lecteur

- Lecteurs : 18-25 ans, francophones, qui ne suivent pas l'actualité au quotidien.
- Une édition se lit en **3 minutes** : **5 essentiels** + **En bref** (3 ou 4 lignes) + **À venir**.
- Chaque essentiel tient en **trois phrases** : ce qui se passe, pourquoi, et maintenant.

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

- Français simple. Chaque sigle est expliqué la première fois (« les FSR, des paramilitaires »).
- **Une phrase = une idée**, idéalement 20 à 40 mots, jamais plus de 45.
  - `what` : le fait du jour, daté si utile.
  - `why` : la cause, l'enjeu, qui veut quoi.
  - `next` : la prochaine étape concrète, une date si possible.
- Neutralité : pas d'adjectif d'opinion ; chiffres de victimes, accusations et revendications
  toujours attribués (« selon le ministère de la Santé de Gaza », « l'Iran affirme »).
- Tout est reformulé : aucune phrase copiée d'une source, citations de quelques mots au plus.
- Uniquement des faits vérifiés dans au moins une source fiable du jour, ou bien établis.
- Typographie française : espace insécable avant « : ; ? ! », guillemets « ».
- Titres : 4 à 9 mots, sans point final, informatifs (pas de jeu de mots obscur).

### Questions préparées (`qa`)
Trois par essentiel. Questions qu'un lecteur de 20 ans se pose vraiment :
« Ça me concerne comment ? », « C'est quoi … ? », « Qui se bat contre qui ? »,
« Pourquoi on en parle si peu ? ». Réponses de 2 ou 3 phrases, mêmes règles d'écriture.

## 4. Fichiers

```
data/latest.json                 l'édition du jour (copie exacte du fichier daté)
data/editions/AAAA-MM-JJ.json    une édition par jour, jamais modifiée après coup
                                 (sauf mise à jour du soir le même jour)
data/index.json                  liste des éditions, la plus récente en premier
```

### Format d'une édition

```jsonc
{
  "date": "2026-11-05",              // date de l'édition (Europe/Paris)
  "number": 1,                       // numéro, +1 à chaque nouvelle date
  "updated": "2026-11-05T12:40:00+01:00", // heure de la dernière mise à jour
  "headline": "Titre du jour",       // 6 à 12 mots
  "lede": "Deux phrases qui résument la journée.",
  "essentials": [                    // exactement 5, triés par rank
    {
      "rank": 1,
      "id": "USA",                   // code ISO 3166-1 alpha-3 du pays principal
      "place": "États-Unis",         // nom affiché
      "focus": [-98, 39],            // optionnel : [lon, lat] où centrer le globe
      "radar": false,                // true uniquement pour le rang 5
      "title": "…",
      "what": "…", "why": "…", "next": "…",
      "since": { "date": "2026-02-28", "label": "de guerre" },  // optionnel : « Jour N » + label
      "involved": ["IRN"],           // autres pays concernés (codes ISO), colorés en clair
      "zones": [ { "id": "HORMUZ", "name": "Ormuz", "coords": [56.4, 26.5] } ],  // optionnel
      "qa": [ { "q": "…", "a": "…" } ],                  // exactement 3
      "context": [ { "d": "2026-02-28", "t": "…" } ],    // 3 à 6 dates, de la plus ancienne
                                                          // à la plus récente ; dates futures permises
      "sources": [ { "name": "Al Jazeera", "title": "…", "url": "https://…", "date": "2026-11-04" } ]
                                                          // 2 à 5 articles réellement lus
    }
  ],
  "brief": [                         // 3 ou 4 lignes
    { "id": "BRA", "place": "Brésil", "text": "Une phrase.", "url": "https://…" }
  ],
  "agenda": [                        // 3 à 5 rendez-vous à venir
    { "d": "2026-11-10", "t": "…" }
  ],
  "consulted": ["Reuters", "AP", "…"] // rédactions croisées pour cette édition
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

1. Écrire `data/editions/<date>.json`, copier vers `data/latest.json`, mettre à jour `data/index.json`.
2. `node tools/validate.mjs` doit répondre `OK`.
3. Commit `Édition du <date>` puis push sur `main` : le site se met à jour en une à deux minutes.

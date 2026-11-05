// Pages « À propos », « Mentions légales », « Confidentialité » et « Crédits », en français et en anglais.
// Utilisé par tools/build.mjs. Les informations personnelles de l'éditeur ne sont JAMAIS inventées :
// tant qu'un champ de site.json est vide, la page affiche un champ [À REMPLIR] bien visible.
// x = { t, site, todo, r, P, lang } : t() échappe et corrige la typographie, todo() marque un champ à remplir,
// r est le chemin vers la racine, P les adresses des pages de la langue.

const UPDATED = { fr: '5 novembre 2026', en: '5 November 2026' };
const GITHUB = 'GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis';
const GITHUB_EN = 'GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States';
const link = (href, label) => `<a href="${href}" rel="noopener" target="_blank">${label}</a>`;
const contact = (x, fr) => (x.site.contact
  ? `<a href="mailto:${x.site.contact}">${x.site.contact}</a>`
  : x.todo(fr ? 'adresse e-mail de contact (une adresse dédiée suffit, elle peut ne pas porter ton nom)' : 'contact email address (a dedicated address that does not carry your name is fine)'));
const issueUrl = (x) => `https://github.com/${x.site.repo}/issues/new?template=erreur.yml`;

module.exports = {
  about: {
    fr: (x) => { const { t } = x; return `
  <h1>À propos</h1>
  <p class="chapo">${t("Diurna est un quotidien international bref, gratuit et sans publicité : chaque matin, cinq sujets choisis en croisant les unes des grandes rédactions, chacun expliqué en trois phrases, et un globe pour les situer.")}</p>
  <h2>${t('Qui fait Diurna')}</h2>
  <p>${t("Diurna est un projet personnel, mené à titre non professionnel. Son éditeur a choisi de ne pas publier son identité, comme la loi le permet dans ce cas (voir les ")}<a href="${x.r}${x.P.legal}">${t('mentions légales')}</a>).</p>
  <p>${x.todo('facultatif : une ou deux phrases sur toi ou sur l’origine du projet, sans donnée qui t’identifie')}</p>
  <h2>${t('Comment il est fait')}</h2>
  <p>${t("La sélection et la rédaction sont confiées à un modèle d'intelligence artificielle (Claude, développé par Anthropic), qui suit une charte éditoriale publique et cite ses sources sous chaque sujet. Personne ne relit les textes avant leur publication : c'est pourquoi chaque page porte la mention « Rédigé par une IA à partir des sources citées ». Le détail est sur la page ")}<a href="${x.r}${x.P.method}">${t('Méthode')}</a>.</p>
  <h2>${t('Une erreur ?')}</h2>
  <p>${t("Si un fait, un chiffre ou une source te semble faux, signale-le avec ")}${link(issueUrl(x), t('le formulaire de correction'))}${t(" (un compte GitHub gratuit est nécessaire) ou par e-mail : ")}${contact(x, true)}.</p>
  <h2>${t('Financement')}</h2>
  <p>${t("Diurna ne vit d'aucune publicité et ne vend aucune donnée.")}${x.site.kofi ? t(" Les lecteurs qui le souhaitent peuvent soutenir le projet par un don ponctuel, sans contrepartie.") : ''}${x.site.sponsor && x.site.sponsor.enabled ? t(" Certaines éditions peuvent être soutenues par un partenaire, toujours signalé en tête de page ; il n'intervient jamais dans le choix ni dans l'écriture des sujets.") : ''}</p>`; },
    en: (x) => { const { t } = x; return `
  <h1>About</h1>
  <p class="chapo">${t("Diurna is a short daily briefing on world affairs, free and without advertising: five stories every morning, chosen by cross-checking the front pages of the major newsrooms, each explained in three sentences, with a globe to place them on.")}</p>
  <h2>${t('Who makes Diurna')}</h2>
  <p>${t("Diurna is a personal, non-professional project. Its publisher has chosen not to publish their identity, as French law allows in this case (see the ")}<a href="${x.r}${x.P.legal}">${t('legal notice')}</a>).</p>
  <p>${x.todo('optional: one or two sentences about you or how the project started, with nothing that identifies you')}</p>
  <h2>${t('How it is made')}</h2>
  <p>${t("Stories are selected and written by an artificial intelligence model (Claude, developed by Anthropic), which follows a public editorial charter and cites its sources under every story. Nobody reviews the texts before they are published, which is why every page carries the line “Written by an AI from the sources cited”. The details are on the ")}<a href="${x.r}${x.P.method}">${t('Method')}</a>${t(' page.')}</p>
  <h2>${t('Spotted a mistake?')}</h2>
  <p>${t("If a fact, a figure or a source looks wrong, report it with ")}${link(issueUrl(x), t('the correction form'))}${t(" (a free GitHub account is required) or by email: ")}${contact(x, false)}.</p>
  <h2>${t('Funding')}</h2>
  <p>${t("Diurna carries no advertising and sells no data.")}${x.site.kofi ? t(" Readers who wish to can support the project with a one-off donation, with nothing in return.") : ''}${x.site.sponsor && x.site.sponsor.enabled ? t(" Some editions may be supported by a partner, always shown at the top of the page; partners never have a say in which stories are chosen or how they are written.") : ''}</p>`; }
  },

  legal: {
    fr: (x) => { const { t } = x; return `
  <h1>Mentions légales</h1>
  <p class="chapo">${t("Informations prévues par l'article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).")}</p>
  <h2>${t('Éditeur')}</h2>
  <p>${t("Diurna est édité à titre non professionnel par une personne physique qui, conformément au II de l'article 1-1 de la LCEN, a choisi de ne pas rendre son identité publique. Les éléments permettant de l'identifier ont été communiqués à l'hébergeur ci-dessous, qui ne peut les transmettre que sur réquisition de l'autorité judiciaire.")} ${x.todo('confirme que ton compte GitHub contient bien ton identité (nom et adresse e-mail réels), ou retire cette phrase')}</p>
  <p>${t('Contact : ')}${contact(x, true)}</p>
  <h2>${t('Hébergeur')}</h2>
  <p>${t(GITHUB)}${t(' — ')}${link('https://support.github.com', 'support.github.com')}</p>
  <h2>${t('Contenus')}</h2>
  <p>${t("Les textes sont rédigés par un modèle d'intelligence artificielle (Claude, d'Anthropic) à partir des sources citées sous chaque sujet, sans relecture humaine avant publication. Les citations, chiffres et accusations sont attribués à ceux qui les avancent ; les sources liées font foi.")}</p>
  <p>${t('Licence des textes de Diurna : ')}${x.site.license ? t(x.site.license) : x.todo('choisis une licence, par exemple « Tous droits réservés » ou « CC BY 4.0 »')}</p>
  <p>${t("Les polices, la carte, les drapeaux, les bibliothèques et les données publiques utilisés restent soumis à leurs propres licences, détaillées sur la page ")}<a href="${x.r}${x.P.credits}">${t('Crédits et licences')}</a>.</p>
  <h2>${t('Données personnelles')}</h2>
  <p>${t('Voir la page ')}<a href="${x.r}${x.P.privacy}">${t('Confidentialité')}</a>.</p>
  <p class="updated">${t('Dernière mise à jour : ' + UPDATED.fr)}</p>`; },
    en: (x) => { const { t } = x; return `
  <h1>Legal notice</h1>
  <p class="chapo">${t("Information required by article 1-1 of French law no. 2004-575 of 21 June 2004 on confidence in the digital economy (LCEN).")}</p>
  <h2>${t('Publisher')}</h2>
  <p>${t("Diurna is published on a non-professional basis by a private individual who, under article 1-1 II of the LCEN, has chosen not to make their identity public. The information that identifies them has been given to the host named below, which may disclose it only at the request of a judicial authority.")} ${x.todo('confirm that your GitHub account holds your real identity (real name and email), or remove this sentence')}</p>
  <p>${t('Contact: ')}${contact(x, false)}</p>
  <h2>${t('Host')}</h2>
  <p>${t(GITHUB_EN)}${t(' — ')}${link('https://support.github.com', 'support.github.com')}</p>
  <h2>${t('Content')}</h2>
  <p>${t("The texts are written by an artificial intelligence model (Claude, by Anthropic) from the sources cited under each story, with no human review before publication. Quotes, figures and accusations are attributed to those who make them; the linked sources take precedence.")}</p>
  <p>${t('Licence for Diurna’s texts: ')}${x.site.license_en || x.site.license ? t(x.site.license_en || x.site.license) : x.todo('choose a licence, for example “All rights reserved” or “CC BY 4.0”')}</p>
  <p>${t("The fonts, map, flags, libraries and public data used remain under their own licences, listed on the ")}<a href="${x.r}${x.P.credits}">${t('Credits and licences')}</a>${t(' page.')}</p>
  <h2>${t('Personal data')}</h2>
  <p>${t('See the ')}<a href="${x.r}${x.P.privacy}">${t('Privacy')}</a>${t(' page.')}</p>
  <p class="updated">${t('Last updated: ' + UPDATED.en)}</p>`; }
  },

  privacy: {
    fr: (x) => { const { t, site } = x; return `
  <h1>Confidentialité</h1>
  <p class="chapo">${t("Diurna ne dépose aucun cookie, n'affiche aucune publicité, ne te demande aucun compte et ne vend aucune donnée. Voici, point par point, ce qui se passe quand tu lis le site.")}</p>
  <h2>${t('Sur ton appareil')}</h2>
  <p>${t("Le site garde deux préférences dans le stockage local de ton navigateur : la langue choisie et l'état, ouvert ou fermé, de la fiche pays. Pour fonctionner hors connexion, il garde aussi une copie de ses propres pages. Rien de tout cela n'est envoyé où que ce soit ; tu peux l'effacer à tout moment en supprimant les données du site dans ton navigateur.")}</p>
  <h2>${t('Mesure d’audience')}</h2>
  ${site.goatcounter ? `<p>${t("Pour savoir combien de personnes lisent Diurna et quelles fonctions servent vraiment, le site utilise ")}${link('https://www.goatcounter.com', 'GoatCounter')}${t(", un outil de statistiques sans cookie. Il ne lit ni n'écrit rien sur ton appareil et n'enregistre pas ton adresse IP : celle-ci est seulement gardée en mémoire, avec le nom de ton navigateur, pendant huit heures au plus, pour ne pas compter deux fois la même visite. Ne sont conservés que des totaux : pages vues, site d'où tu viens, type de navigateur et de système, largeur d'écran, pays et langue.")}</p>
  <p>${t("Le site compte aussi, de façon anonyme, quelques gestes : ouverture d'une fiche, pays touché sur le globe, partage, changement de langue, installation de l'application, inscription à la newsletter et utilisation de chaque module interactif. Aucun de ces comptages n'est rattaché à une personne.")}</p>
  <p>${t("Ces statistiques sont hébergées par GoatCounter dans l'Union européenne (Finlande et Allemagne) et ne sont partagées avec personne. Le bref traitement de ton adresse IP repose sur l'intérêt légitime de l'éditeur à connaître son audience (article 6.1.f du RGPD). ")}${link('https://www.goatcounter.com/privacy', t('Politique de confidentialité de GoatCounter'))}.</p>` : `<p>${t("Aucune mesure d'audience n'est active pour l'instant.")}</p>`}
  <h2>${t('Hébergement')}</h2>
  <p>${t("Le site est hébergé par GitHub Pages. Comme tout hébergeur, GitHub enregistre l'adresse IP des visiteurs pour des raisons de sécurité. ")}${link('https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement', t('Déclaration de confidentialité de GitHub'))}.</p>
  ${site.buttondown ? `<h2>${t('Newsletter')}</h2>
  <p>${t("Si tu t'inscris à la newsletter, ton adresse e-mail est conservée par Buttondown, le service d'envoi, uniquement pour t'envoyer l'édition du jour. Chaque e-mail contient un lien de désinscription ; ton adresse est alors supprimée de la liste. Cette inscription repose sur ton consentement. ")}${link('https://buttondown.com/legal/privacy', t('Politique de confidentialité de Buttondown'))}.</p>` : ''}
  ${site.tally ? `<h2>${t('Formulaire « Ton avis ? »')}</h2>
  <p>${t("Les réponses au formulaire de retour sont recueillies par Tally et lues par l'éditeur seul. Ne laisse ton adresse e-mail que si tu souhaites une réponse. ")}${link('https://tally.so/help/privacy-policy', t('Politique de confidentialité de Tally'))}.</p>` : ''}
  <h2>${t('Liens vers d’autres sites')}</h2>
  <p>${t("Les sources citées sous chaque sujet mènent vers d'autres sites, qui appliquent leurs propres règles. Les polices, la carte et les drapeaux sont servis par Diurna lui-même : aucune autre ressource externe n'est chargée.")}</p>
  <h2>${t('Tes droits')}</h2>
  <p>${t("Tu peux demander l'accès à tes données, leur rectification ou leur effacement, ou t'opposer à leur traitement, en écrivant à ")}${contact(x, true)}${t(". Tu peux aussi saisir la ")}${link('https://www.cnil.fr/fr/plaintes', 'CNIL')}.</p>
  <p class="updated">${t('Dernière mise à jour : ' + UPDATED.fr)}</p>`; },
    en: (x) => { const { t, site } = x; return `
  <h1>Privacy</h1>
  <p class="chapo">${t("Diurna sets no cookies, shows no advertising, asks for no account and sells no data. Here is, point by point, what happens when you read the site.")}</p>
  <h2>${t('On your device')}</h2>
  <p>${t("The site keeps two preferences in your browser’s local storage: the language you chose and whether the country profile is open or closed. To work offline, it also keeps a copy of its own pages. None of this is sent anywhere; you can clear it at any time by deleting the site’s data in your browser.")}</p>
  <h2>${t('Audience measurement')}</h2>
  ${site.goatcounter ? `<p>${t("To know how many people read Diurna and which features are actually used, the site uses ")}${link('https://www.goatcounter.com', 'GoatCounter')}${t(", a cookie-free analytics tool. It neither reads nor writes anything on your device and does not store your IP address: the address is only held in memory, with your browser name, for up to eight hours so the same visit is not counted twice. Only totals are kept: pages viewed, the site you came from, browser and system type, screen width, country and language.")}</p>
  <p>${t("The site also counts a few actions anonymously: opening a story, tapping a country on the globe, sharing, switching language, installing the app, signing up to the newsletter and using each interactive module. None of these counts is linked to a person.")}</p>
  <p>${t("These statistics are hosted by GoatCounter in the European Union (Finland and Germany) and are shared with no one. The brief processing of your IP address is based on the publisher’s legitimate interest in knowing its audience (article 6(1)(f) GDPR). ")}${link('https://www.goatcounter.com/privacy', t('GoatCounter’s privacy policy'))}.</p>` : `<p>${t("No audience measurement is active at the moment.")}</p>`}
  <h2>${t('Hosting')}</h2>
  <p>${t("The site is hosted on GitHub Pages. Like any host, GitHub logs visitors’ IP addresses for security purposes. ")}${link('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', t('GitHub’s privacy statement'))}.</p>
  ${site.buttondown ? `<h2>${t('Newsletter')}</h2>
  <p>${t("If you sign up to the newsletter, your email address is kept by Buttondown, the sending service, solely to send you the day’s edition. Every email contains an unsubscribe link, which removes your address from the list. Signing up is based on your consent. ")}${link('https://buttondown.com/legal/privacy', t('Buttondown’s privacy policy'))}.</p>` : ''}
  ${site.tally ? `<h2>${t('“Your thoughts?” form')}</h2>
  <p>${t("Answers to the feedback form are collected by Tally and read by the publisher alone. Only leave your email address if you would like a reply. ")}${link('https://tally.so/help/privacy-policy', t('Tally’s privacy policy'))}.</p>` : ''}
  <h2>${t('Links to other sites')}</h2>
  <p>${t("The sources cited under each story lead to other sites, which apply their own rules. Fonts, the map and flags are served by Diurna itself: no other external resource is loaded.")}</p>
  <h2>${t('Your rights')}</h2>
  <p>${t("You can ask to access, correct or delete your data, or object to its processing, by writing to ")}${contact(x, false)}${t(". You can also complain to the French data protection authority, the ")}${link('https://www.cnil.fr/en/home', 'CNIL')}.</p>
  <p class="updated">${t('Last updated: ' + UPDATED.en)}</p>`; }
  },

  credits: {
    fr: (x) => { const { t } = x; const row = (what, who, lic) => `<div><dt>${t(what)}</dt><dd>${who} · <span class="lic">${t(lic)}</span></dd></div>`; return `
  <h1>Crédits et licences</h1>
  <p class="chapo">${t("Diurna repose sur des polices, des cartes, des bibliothèques et des données publiques mises à disposition par d'autres. Les voici, avec leur licence.")}</p>
  <h2>${t('Polices')}</h2>
  <dl class="credits">
    ${row('Newsreader (titres et textes)', `${link('https://github.com/productiontype/Newsreader', 'Production Type')}`, 'SIL Open Font License 1.1')}
    ${row('Archivo (interface)', `${link('https://github.com/Omnibus-Type/Archivo', 'Omnibus-Type')}`, 'SIL Open Font License 1.1')}
  </dl>
  <h2>${t('Carte et drapeaux')}</h2>
  <dl class="credits">
    ${row('Contours des pays', `${link('https://www.naturalearthdata.com', 'Natural Earth')} ${t('via')} ${link('https://github.com/topojson/world-atlas', 'world-atlas')} (Mike Bostock)`, 'domaine public ; world-atlas : licence ISC')}
    ${row('Drapeaux', `${link('https://github.com/lipis/flag-icons', 'flag-icons')} (Panayiotis Lipiridis)`, 'licence MIT')}
  </dl>
  <p>${t("Les frontières de la carte sont celles de Natural Earth et n'expriment aucune position de Diurna sur les territoires contestés.")}</p>
  <h2>${t('Bibliothèques')}</h2>
  <dl class="credits">
    ${row('Projection du globe', `${link('https://github.com/d3/d3-geo', 'd3-geo')} ${t('et')} ${link('https://github.com/d3/d3-array', 'd3-array')} (Mike Bostock)`, 'licence ISC')}
    ${row('Lecture de la carte', `${link('https://github.com/topojson/topojson-client', 'topojson-client')} (Mike Bostock)`, 'licence ISC')}
  </dl>
  <h2>${t('Données')}</h2>
  <dl class="credits">
    ${row('Capitales, langues, monnaies', `${link('https://github.com/mledoze/countries', 'mledoze/countries')}`, 'Open Database License (ODbL) 1.0')}
    ${row('Population, inflation', `${link('https://data.worldbank.org', t('Banque mondiale'))}`, 'CC BY 4.0')}
    ${row('Taux de change', `${link('https://data.ecb.europa.eu', t('Banque centrale européenne'))}`, 'réutilisation libre avec mention de la source')}
    ${row('Prix du pétrole (Brent)', `${link('https://www.eia.gov', t('Agence américaine d’information sur l’énergie (EIA)'))} ${t('via')} ${link('https://fred.stlouisfed.org', 'FRED')}`, 'domaine public')}
    ${row('Séismes', `${link('https://earthquake.usgs.gov', 'USGS')}`, 'domaine public')}
    ${row('Alertes de catastrophes', `${link('https://www.gdacs.org', 'GDACS')} ${t('(Nations unies et Commission européenne)')}`, 'conditions d’utilisation du GDACS')}
    ${row('Dirigeants et régimes', t('vérifiés à chaque édition dans les sources indiquées sur chaque fiche pays'), 'liens fournis')}
  </dl>
  <h2>${t('Textes et images')}</h2>
  <p>${t("Les textes sont rédigés par Claude (Anthropic) à partir des sources citées sous chaque sujet ; les extraits ne sont jamais recopiés. Diurna ne publie aucune photographie : les images de partage sont dessinées automatiquement à partir du titre et du chiffre du jour.")}</p>`; },
    en: (x) => { const { t } = x; const row = (what, who, lic) => `<div><dt>${t(what)}</dt><dd>${who} · <span class="lic">${t(lic)}</span></dd></div>`; return `
  <h1>Credits and licences</h1>
  <p class="chapo">${t("Diurna is built on fonts, maps, libraries and public data made available by others. Here they are, with their licences.")}</p>
  <h2>${t('Fonts')}</h2>
  <dl class="credits">
    ${row('Newsreader (headlines and text)', `${link('https://github.com/productiontype/Newsreader', 'Production Type')}`, 'SIL Open Font License 1.1')}
    ${row('Archivo (interface)', `${link('https://github.com/Omnibus-Type/Archivo', 'Omnibus-Type')}`, 'SIL Open Font License 1.1')}
  </dl>
  <h2>${t('Map and flags')}</h2>
  <dl class="credits">
    ${row('Country outlines', `${link('https://www.naturalearthdata.com', 'Natural Earth')} via ${link('https://github.com/topojson/world-atlas', 'world-atlas')} (Mike Bostock)`, 'public domain; world-atlas: ISC licence')}
    ${row('Flags', `${link('https://github.com/lipis/flag-icons', 'flag-icons')} (Panayiotis Lipiridis)`, 'MIT licence')}
  </dl>
  <p>${t("The borders on the map are those of Natural Earth and imply no position by Diurna on disputed territories.")}</p>
  <h2>${t('Libraries')}</h2>
  <dl class="credits">
    ${row('Globe projection', `${link('https://github.com/d3/d3-geo', 'd3-geo')} and ${link('https://github.com/d3/d3-array', 'd3-array')} (Mike Bostock)`, 'ISC licence')}
    ${row('Map decoding', `${link('https://github.com/topojson/topojson-client', 'topojson-client')} (Mike Bostock)`, 'ISC licence')}
  </dl>
  <h2>${t('Data')}</h2>
  <dl class="credits">
    ${row('Capitals, languages, currencies', `${link('https://github.com/mledoze/countries', 'mledoze/countries')}`, 'Open Database License (ODbL) 1.0')}
    ${row('Population, inflation', `${link('https://data.worldbank.org', 'World Bank')}`, 'CC BY 4.0')}
    ${row('Exchange rates', `${link('https://data.ecb.europa.eu', 'European Central Bank')}`, 'free reuse with attribution')}
    ${row('Oil price (Brent)', `${link('https://www.eia.gov', 'US Energy Information Administration (EIA)')} via ${link('https://fred.stlouisfed.org', 'FRED')}`, 'public domain')}
    ${row('Earthquakes', `${link('https://earthquake.usgs.gov', 'USGS')}`, 'public domain')}
    ${row('Disaster alerts', `${link('https://www.gdacs.org', 'GDACS')} (United Nations and European Commission)`, 'GDACS terms of use')}
    ${row('Leaders and governments', t('checked for every edition against the sources shown on each country profile'), 'links provided')}
  </dl>
  <h2>${t('Texts and images')}</h2>
  <p>${t("The texts are written by Claude (Anthropic) from the sources cited under each story; passages are never copied. Diurna publishes no photographs: share images are drawn automatically from the headline and the number of the day.")}</p>`; }
  }
};

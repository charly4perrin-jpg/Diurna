// Texte de la page Méthode (FR et EN). Utilisé par tools/build.mjs.
module.exports = {
  fr: (t) => `
  <h1>Méthode</h1>
  <p class="chapo">${t("Diurna est un quotidien international bref : cinq sujets chaque matin, choisis en croisant les unes des grandes rédactions, et une carte pour les situer.")}</p>

  <section class="origin" aria-labelledby="h-origin">
    <p class="inscr" aria-hidden="true">ACTA<span>·</span>DIVRNA</p>
    <h2 id="h-origin">Pourquoi Diurna</h2>
    <p>${t("En 59 av. J.-C., Jules César, alors consul, fait afficher chaque jour dans les lieux publics de Rome les ")}<em>Acta Diurna</em>${t(", « les actes du jour » : décisions politiques, procès, naissances, mariages et décès. Recopiées et diffusées, ces nouvelles étaient lues, rapporte l'historien Tacite, jusque dans les provinces et les armées. On y voit souvent le premier journal de l'histoire.")}</p>
    <p>${t("Diurna reprend l'idée, deux mille ans plus tard : chaque jour, le monde expliqué en trois phrases.")}</p>
  </section>

  <h2>Le choix des sujets</h2>
  <p>${t("Un sujet entre dans l'édition lorsqu'il est traité en tête par au moins trois rédactions de référence : Reuters, Associated Press, AFP, BBC, Le Monde, The Economist, Al Jazeera, The New York Times, Financial Times, France 24, The Guardian ou NPR.")}</p>
  <p>${t("La priorité va aux faits qui changent la situation dans la semaine : un vote, une décision, des combats, une négociation, une échéance. Les tendances de fond attendent qu'un événement les ramène au premier plan.")}</p>
  <p>${t("Le cinquième sujet, « Loin des caméras », est réservé à une crise grave peu couverte par la presse française : Soudan, République démocratique du Congo, Sahel, Haïti, Birmanie, Yémen. Il change d'une semaine à l'autre.")}</p>

  <h2>L'écriture</h2>
  <p>${t("Chaque sujet suit la forme d'un article court : un titre, un chapô, un paragraphe de trois phrases qui pose le fait, en donne les causes et en ouvre la suite, puis une analyse. Selon la nature de l'actualité (conflit, élection, économie, diplomatie, catastrophe, société), la fiche ajoute des modules : bilan, lieux, résultats, positions des parties, courbes.")}</p>
  <p>${t("Les chiffres, accusations et revendications sont attribués à ceux qui les avancent. Un module ne s'affiche que si ses données sont sourcées. Les textes sont rédigés à partir des sources citées, sans reprise de leurs phrases.")}</p>

  <h2>Les données</h2>
  <p>${t("Les chiffres de référence viennent de sources publiques, récupérées automatiquement chaque matin : la Banque mondiale (population, inflation), la Banque centrale européenne (taux de change), l'Agence américaine d'information sur l'énergie (prix du pétrole), l'USGS et le GDACS (catastrophes naturelles). Chaque module indique sa source et sa date.")}</p>

  <h2>La fabrication</h2>
  <p>${t("L'édition est préparée chaque matin vers 7 heures, heure de Paris, en français puis en anglais, et révisée le soir lorsqu'un événement majeur survient. La sélection et la rédaction sont assurées par un modèle d'intelligence artificielle (Claude, développé par Anthropic), selon une charte éditoriale publique. En cas de doute sur un fait, les sources liées sous chaque sujet font foi.")}</p>

  <h2>Installer l'application</h2>
  <ul>
    <li><strong>${t('Android, Chrome ou Edge')}</strong>${t(" : bouton « Installer l'appli » en haut de page, ou menu du navigateur, puis « Installer ».")}</li>
    <li><strong>iPhone</strong>${t(" : dans Safari, bouton Partager, puis « Sur l'écran d'accueil ».")}</li>
  </ul>`,
  en: (t) => `
  <h1>Method</h1>
  <p class="chapo">${t("Diurna is a short daily briefing on world affairs: five stories every morning, chosen by cross-checking the front pages of the major newsrooms, and a globe to place them on.")}</p>

  <section class="origin" aria-labelledby="h-origin">
    <p class="inscr" aria-hidden="true">ACTA<span>·</span>DIVRNA</p>
    <h2 id="h-origin">Why Diurna</h2>
    <p>${t("In 59 BC, Julius Caesar, then consul, had the ")}<em>Acta Diurna</em>${t(", “the daily acts”, posted every day in the public places of Rome: political decisions, trials, births, marriages and deaths. Copied and passed on, they were read, the historian Tacitus reports, as far away as the provinces and the legions. They are often described as the first newspaper in history.")}</p>
    <p>${t("Diurna picks up the idea two thousand years later: every day, the world explained in three sentences.")}</p>
  </section>

  <h2>How stories are chosen</h2>
  <p>${t("A story makes the edition when at least three leading newsrooms run it at the top: Reuters, Associated Press, AFP, the BBC, Le Monde, The Economist, Al Jazeera, The New York Times, the Financial Times, France 24, The Guardian or NPR.")}</p>
  <p>${t("Priority goes to events that change the situation within the week: a vote, a decision, fighting, a negotiation, a deadline. Long-running trends wait until an event brings them back to the fore.")}</p>
  <p>${t("The fifth story, “Out of the spotlight”, is kept for a serious crisis that gets little coverage in the European press: Sudan, the Democratic Republic of the Congo, the Sahel, Haiti, Myanmar, Yemen. It rotates from week to week.")}</p>

  <h2>How it is written</h2>
  <p>${t("Each story takes the form of a short article: a headline, a standfirst, a three-sentence paragraph that sets out the facts, explains the causes and looks ahead, then an analysis. Depending on the kind of news (conflict, election, economy, diplomacy, disaster, society), the page adds modules: casualty figures, places, results, each side's demands, charts.")}</p>
  <p>${t("Figures, accusations and claims are attributed to those who make them. A module only appears when its data is sourced. The English edition is written for English-speaking readers in its own right, not translated word for word from the French.")}</p>

  <h2>The data</h2>
  <p>${t("Reference figures come from public sources, collected automatically every morning: the World Bank (population, inflation), the European Central Bank (exchange rates), the US Energy Information Administration (oil prices), the USGS and GDACS (natural disasters). Every module shows its source and date.")}</p>

  <h2>How it is made</h2>
  <p>${t("The edition is prepared every morning at around 7am Paris time, in French and then in English, and revised in the evening if a major event occurs. Selection and writing are done by an artificial intelligence model (Claude, developed by Anthropic), following a public editorial charter. Where a fact is in doubt, the sources linked under each story take precedence.")}</p>

  <h2>Install the app</h2>
  <ul>
    <li><strong>${t('Android, Chrome or Edge')}</strong>${t(": the “Install the app” button at the top of the page, or the browser menu, then “Install”.")}</li>
    <li><strong>iPhone</strong>${t(": in Safari, tap Share, then “Add to Home Screen”.")}</li>
  </ul>`
};

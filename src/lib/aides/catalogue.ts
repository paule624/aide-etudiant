import {
  calculerEchelon,
  calculerPointsDeCharge,
  MONTANTS_ECHELON,
  type Echelon,
} from "./bareme";
import type { Aide, Evaluation, Profil } from "./types";

// --- Shared eligibility helpers ---------------------------------------------

const non = (...raisons: string[]): Evaluation => ({
  statut: "non_eligible",
  detail: "",
  raisons,
});

const estDansLeSup = (p: Profil) => p.niveau !== "terminale" || p.neoBachelier;

export function bcsIneligibilite(p: Profil): string[] {
  const r: string[] = [];
  if (p.age >= 35) r.push("Il faut avoir moins de 35 ans au 1er septembre.");
  if (p.nationalite === "hors_ue")
    r.push("Étudiants hors UE : réservé aux résidents en France depuis au moins 2 ans (foyer fiscal).");
  if (p.alternance) r.push("Les apprentis ne peuvent pas cumuler bourse et contrat d'apprentissage.");
  if (!p.etablissementHabilite)
    r.push("La formation doit être habilitée à recevoir des boursiers.");
  if (p.niveau === "doctorat") r.push("Le doctorat n'ouvre pas droit à la bourse sur critères sociaux.");
  return r;
}

export function echelonBourse(p: Profil): Echelon | null {
  if (bcsIneligibilite(p).length) return null;
  const { total } = calculerPointsDeCharge(p);
  return calculerEchelon(p.revenuBrutGlobalParents, total);
}

const estBoursier = (p: Profil) => echelonBourse(p) !== null;

const SMIC_BRUT_MENSUEL = 1823.03;

// Indicative rent ceilings used by CAF (single person), € / month
const PLAFOND_LOYER_APL = { idf: 335, grande_ville: 292, autre: 274 } as const;
const FORFAIT_CHARGES = 60;

export function estimerAPL(p: Profil): number {
  if (p.logement === "parents" || p.loyer <= 0) return 0;
  const coef = p.logement === "colocation" ? 0.75 : 1;
  const plafondLoyer = PLAFOND_LOYER_APL[p.zone] * coef;
  const base = Math.min(p.loyer, plafondLoyer) + FORFAIT_CHARGES;
  let aide = base * 0.75 - 40;
  // Own earnings above ~8 k€/year reduce the benefit
  const revenus = p.revenusActiviteNetMensuel * 12 + (p.alternance ? p.salaireAlternanceBrut * 0.78 * 12 : 0);
  if (revenus > 8000) aide -= (revenus - 8000) * 0.03;
  return Math.max(0, Math.min(Math.round(aide), 320));
}

// --- Catalogue ---------------------------------------------------------------

export const AIDES: Aide[] = [
  {
    id: "bcs",
    nom: "Bourse sur critères sociaux",
    organisme: "Crous",
    categorie: "bourse",
    resume: "Aide principale de l'État, versée sur 10 mois selon les revenus des parents et les points de charge.",
    montant: "1 454 € à 6 335 € / an (échelons 0bis à 7)",
    conditions: [
      "Moins de 35 ans au 1er septembre",
      "Formation initiale habilitée (hors apprentissage)",
      "Revenu brut global des parents (N-2) sous le plafond",
      "Dossier Social Étudiant (DSE) du 1er mars au 31 mai",
    ],
    lien: "https://www.messervices.etudiant.gouv.fr",
    cumul: "Cumulable avec APL, aide au mérite, aides à la mobilité.",
    compteDansTotal: true,
    evaluer: (p) => {
      const ko = bcsIneligibilite(p);
      if (ko.length) return non(...ko);
      if (p.independant)
        return {
          statut: "possible",
          detail: "Situation d'indépendance : dossier étudié au cas par cas (voir aide annuelle FNAU).",
          raisons: ["En cas de rupture familiale, le Crous peut ne pas retenir les revenus des parents."],
        };
      const { total, detail } = calculerPointsDeCharge(p);
      const ech = calculerEchelon(p.revenuBrutGlobalParents, total);
      const pts = `${total} point(s) de charge${detail.length ? ` (${detail.map((d) => `${d.libelle} : ${d.points}`).join(", ")})` : ""}`;
      if (!ech) return non(`Revenus au-dessus du plafond de l'échelon 0bis avec ${pts}.`);
      const montant = MONTANTS_ECHELON[ech];
      return {
        statut: "eligible",
        montantAnnuel: montant,
        detail: `Échelon ${ech} — ${Math.round(montant / 10)} € / mois sur 10 mois`,
        raisons: [pts],
      };
    },
  },
  {
    id: "exoneration",
    nom: "Exonération frais d'inscription & CVEC",
    organisme: "Établissement / Crous",
    categorie: "bourse",
    resume: "Les boursiers ne paient ni les droits d'inscription en université publique ni la CVEC.",
    montant: "≈ 283 € (licence) à 359 € (master) / an",
    conditions: ["Être boursier sur critères sociaux (dès l'échelon 0bis)"],
    lien: "https://cvec.etudiant.gouv.fr",
    compteDansTotal: true,
    evaluer: (p) => {
      if (!estBoursier(p)) return non("Réservé aux boursiers sur critères sociaux.");
      const droits = p.niveau === "M1" || p.niveau === "M2" ? 254 : 178;
      return {
        statut: "eligible",
        montantAnnuel: droits + 105,
        detail: `Droits ${droits} € + CVEC 105 € économisés (université publique)`,
        raisons: ["Boursier : exonération automatique."],
      };
    },
  },
  {
    id: "merite",
    nom: "Aide au mérite",
    organisme: "Crous",
    categorie: "bourse",
    resume: "Complément de bourse pour les bacheliers mention Très Bien.",
    montant: "900 € / an (9 × 100 €), jusqu'à 3 ans en licence",
    conditions: ["Mention « Très bien » au bac (session de l'année)", "Être boursier sur critères sociaux"],
    lien: "https://www.etudiant.gouv.fr/fr/aide-au-merite-1432",
    compteDansTotal: true,
    evaluer: (p) => {
      if (!p.mentionTB) return non("Nécessite une mention Très Bien au bac.");
      if (!estBoursier(p)) return non("Réservé aux boursiers sur critères sociaux.");
      if (!["terminale", "L1", "L2", "L3"].includes(p.niveau))
        return non("Versée pendant les années de licence uniquement.");
      return { statut: "eligible", montantAnnuel: 900, detail: "9 mensualités de 100 €", raisons: ["Boursier + mention TB."] };
    },
  },
  {
    id: "apl",
    nom: "Aide au logement (APL / ALS)",
    organisme: "CAF",
    categorie: "logement",
    resume: "Réduit le loyer chaque mois, en résidence Crous comme dans le parc privé.",
    montant: "≈ 100 à 300 € / mois",
    conditions: ["Être locataire ou colocataire (bail à son nom)", "Logement décent, ressources modestes", "Sans condition de nationalité pour les résidents réguliers"],
    lien: "https://www.caf.fr/allocataires/mes-services-en-ligne/estimer-vos-droits/simulation-aide-au-logement",
    cumul: "Cumulable avec la bourse. Si vous touchez l'APL, vos parents perdent la part fiscale/allocations liées.",
    compteDansTotal: true,
    evaluer: (p) => {
      if (p.logement === "parents") return non("Vous vivez chez vos parents.");
      if (p.loyer <= 0) return { statut: "possible", detail: "Renseignez un loyer pour estimer.", raisons: [] };
      const m = estimerAPL(p);
      if (m <= 0) return non("Ressources trop élevées au regard du loyer (estimation).");
      return {
        statut: "eligible",
        montantAnnuel: m * 12,
        detail: `≈ ${m} € / mois (estimation, à confirmer sur caf.fr)`,
        raisons: [`Loyer ${p.loyer} €, ${p.logement === "colocation" ? "colocation" : p.logement === "crous" ? "résidence Crous" : "location"}.`],
      };
    },
  },
  {
    id: "visale",
    nom: "Garantie Visale",
    organisme: "Action Logement",
    categorie: "logement",
    resume: "Caution locative gratuite : remplace le garant auprès du propriétaire.",
    montant: "Gratuit — loyer garanti jusqu'à 1 000 € (IDF) / 840 € / 680 €",
    conditions: ["18 à 30 ans", "Sans condition de ressources", "À demander avant la signature du bail"],
    lien: "https://www.visale.fr",
    compteDansTotal: false,
    evaluer: (p) => {
      if (p.age < 18 || p.age > 30) return non("Réservé aux 18-30 ans.");
      if (p.logement === "parents") return { statut: "possible", detail: "Utile si vous cherchez un logement.", raisons: [] };
      return { statut: "eligible", detail: "Garantie gratuite, pas de versement", raisons: ["18-30 ans, sans condition de ressources."] };
    },
  },
  {
    id: "mobili-jeune",
    nom: "Mobili-Jeune",
    organisme: "Action Logement",
    categorie: "logement",
    resume: "Prise en charge d'une partie du loyer pour les alternants.",
    montant: "10 à 100 € / mois (max 1 100 € / an)",
    conditions: ["Moins de 30 ans", "Alternance dans une entreprise privée", "Salaire ≤ 120 % du SMIC", "Locataire"],
    lien: "https://www.actionlogement.fr/l-aide-mobili-jeune",
    compteDansTotal: true,
    evaluer: (p) => {
      if (!p.alternance) return non("Réservé aux alternants.");
      if (p.age >= 30) return non("Réservé aux moins de 30 ans.");
      if (p.salaireAlternanceBrut > SMIC_BRUT_MENSUEL * 1.2) return non("Salaire supérieur à 120 % du SMIC.");
      if (p.logement === "parents") return non("Il faut être locataire.");
      return { statut: "eligible", montantAnnuel: 1100, detail: "Jusqu'à 100 € / mois", raisons: ["Alternant, salaire ≤ 120 % SMIC."] };
    },
  },
  {
    id: "mobilite-parcoursup",
    nom: "Aide à la mobilité Parcoursup",
    organisme: "Crous",
    categorie: "mobilite",
    resume: "Coup de pouce pour les néo-bacheliers boursiers qui s'installent dans une autre académie.",
    montant: "500 € (versement unique)",
    conditions: ["Lycéen boursier", "Formation Parcoursup acceptée hors de son académie", "Demande du 1er juin au 15 janvier"],
    lien: "https://www.etudiant.gouv.fr/fr/aide-la-mobilite-parcoursup-1447",
    compteDansTotal: true,
    evaluer: (p) => {
      if (p.niveau !== "terminale" && !p.neoBachelier) return non("Réservé aux néo-bacheliers.");
      if (!p.changeAcademie) return non("Il faut changer d'académie.");
      if (!estBoursier(p)) return { statut: "possible", detail: "Si vous étiez boursier au lycée.", raisons: ["Condition : bourse de lycée."] };
      return { statut: "eligible", montantAnnuel: 500, detail: "Versement unique", raisons: ["Néo-bachelier boursier changeant d'académie."] };
    },
  },
  {
    id: "mobilite-master",
    nom: "Aide à la mobilité en master",
    organisme: "Crous",
    categorie: "mobilite",
    resume: "Aide pour les boursiers qui changent de région académique entre la licence et le M1.",
    montant: "1 000 € (versement unique)",
    conditions: ["Titulaire d'une licence", "Boursier", "Inscrit en M1 dans une autre région académique l'année suivant la licence"],
    lien: "https://www.etudiant.gouv.fr/fr/aide-la-mobilite-en-master-1504",
    compteDansTotal: true,
    evaluer: (p) => {
      if (p.niveau !== "M1") return non("Réservé aux entrants en M1.");
      if (!p.changeAcademie) return non("Il faut changer de région académique.");
      if (!estBoursier(p)) return non("Réservé aux boursiers.");
      return { statut: "eligible", montantAnnuel: 1000, detail: "Versement unique", raisons: ["Boursier en M1 dans une nouvelle région académique."] };
    },
  },
  {
    id: "ami",
    nom: "Aide à la mobilité internationale",
    organisme: "Établissement / MESR",
    categorie: "mobilite",
    resume: "Complément pour les boursiers qui partent étudier ou faire un stage à l'étranger.",
    montant: "400 € / mois, 2 à 9 mois",
    conditions: ["Boursier sur critères sociaux", "Mobilité de 2 à 9 mois dans le cadre du cursus", "Selon les crédits de l'établissement"],
    lien: "https://www.etudiant.gouv.fr/fr/aide-la-mobilite-internationale-1422",
    cumul: "Cumulable avec Erasmus+ et la bourse.",
    compteDansTotal: true,
    evaluer: (p) => {
      if (p.moisMobiliteInternationale < 2) return non("Pas de mobilité internationale de 2 mois ou plus prévue.");
      if (!estBoursier(p)) return non("Réservé aux boursiers (voir Erasmus+ et aides régionales).");
      const mois = Math.min(p.moisMobiliteInternationale, 9);
      return { statut: "eligible", montantAnnuel: mois * 400, detail: `${mois} × 400 € (nombre de mois fixé par l'établissement)`, raisons: ["Boursier en mobilité."] };
    },
  },
  {
    id: "erasmus",
    nom: "Bourse Erasmus+",
    organisme: "Agence Erasmus+ / établissement",
    categorie: "mobilite",
    resume: "Bourse européenne pour un séjour d'études ou de stage dans un pays partenaire.",
    montant: "≈ 200 à 600 € / mois selon le pays",
    conditions: ["Établissement titulaire de la charte Erasmus+", "Mobilité de 2 à 12 mois"],
    lien: "https://agence.erasmusplus.fr",
    compteDansTotal: false,
    evaluer: (p) =>
      p.moisMobiliteInternationale >= 2
        ? { statut: "possible", detail: "Montant selon pays et établissement", raisons: ["Mobilité internationale prévue."] }
        : non("Pas de mobilité internationale prévue."),
  },
  {
    id: "passeport-mobilite",
    nom: "Passeport Mobilité Études",
    organisme: "LADOM",
    categorie: "mobilite",
    resume: "Prise en charge du billet d'avion pour les étudiants ultramarins qui étudient hors de leur territoire.",
    montant: "Billet A/R pris en charge (100 % pour les boursiers)",
    conditions: ["Résider en outre-mer", "Études impossibles sur place", "Moins de 26 ans"],
    lien: "https://www.ladom.fr",
    compteDansTotal: false,
    evaluer: (p) =>
      p.outreMer && p.age < 26
        ? { statut: "eligible", detail: estBoursier(p) ? "Billet pris en charge à 100 %" : "Prise en charge partielle", raisons: ["Étudiant ultramarin."] }
        : non("Réservé aux étudiants ultramarins de moins de 26 ans."),
  },
  {
    id: "repas",
    nom: "Repas Crous à 1 €",
    organisme: "Crous",
    categorie: "vie_quotidienne",
    resume: "Depuis le 4 mai 2026, le repas complet au restaurant universitaire est à 1 € pour tous les étudiants.",
    montant: "≈ 2,30 € économisés par repas",
    conditions: ["Être étudiant", "Carte étudiante + compte Izly"],
    lien: "https://www.crous.fr",
    compteDansTotal: false,
    evaluer: (p) =>
      estDansLeSup(p)
        ? { statut: "eligible", detail: "≈ 400 € / an pour 5 repas / semaine", raisons: ["Ouvert à tous les étudiants."] }
        : non("Réservé aux étudiants."),
  },
  {
    id: "pass-culture",
    nom: "Pass Culture",
    organisme: "Ministère de la Culture",
    categorie: "vie_quotidienne",
    resume: "Crédit pour livres, concerts, cinéma, cours...",
    montant: "150 € à 18 ans",
    conditions: ["Avoir 18 ans", "Résider en France"],
    lien: "https://pass.culture.fr",
    compteDansTotal: true,
    evaluer: (p) =>
      p.age === 18
        ? { statut: "eligible", montantAnnuel: 150, detail: "Crédit utilisable 2 ans", raisons: ["18 ans."] }
        : non("Réservé aux jeunes de 18 ans."),
  },
  {
    id: "css",
    nom: "Complémentaire santé solidaire",
    organisme: "Assurance Maladie",
    categorie: "sante",
    resume: "Mutuelle gratuite ou à moins d'1 €/jour selon les ressources.",
    montant: "Gratuite sous 10 421 € / an de ressources, sinon ≈ 8 € / mois",
    conditions: ["Ressources sous les plafonds", "Demande individuelle si indépendant ou plus de 25 ans"],
    lien: "https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante",
    compteDansTotal: false,
    evaluer: (p) => {
      const autonome = p.independant || p.age >= 25 || p.logement !== "parents";
      if (!autonome) return { statut: "possible", detail: "Via le foyer de vos parents", raisons: ["Rattaché au foyer parental."] };
      if (p.ressourcesAnnuelles === 0)
        return { statut: "possible", detail: "Renseignez vos ressources annuelles pour estimer", raisons: [] };
      if (p.ressourcesAnnuelles <= 10421)
        return { statut: "eligible", detail: "Gratuite (ressources ≤ 10 421 €)", raisons: [`Ressources déclarées : ${p.ressourcesAnnuelles} € / an.`] };
      if (p.ressourcesAnnuelles <= 14068)
        return { statut: "eligible", detail: "Participation ≈ 8 € / mois", raisons: [`Ressources déclarées : ${p.ressourcesAnnuelles} € / an.`] };
      return non("Ressources au-dessus des plafonds.");
    },
  },
  {
    id: "prime-activite",
    nom: "Prime d'activité",
    organisme: "CAF",
    categorie: "emploi",
    resume: "Complément de revenu pour les étudiants qui travaillent (job ou alternance).",
    montant: "Variable, souvent 100 à 250 € / mois",
    conditions: ["18 ans ou plus", "Revenus d'activité ≥ 1 117 € net / mois (moyenne sur 3 mois)"],
    lien: "https://www.caf.fr/allocataires/aides-et-demarches/droits-et-prestations/vie-professionnelle/la-prime-d-activite",
    compteDansTotal: false,
    evaluer: (p) => {
      if (p.age < 18) return non("18 ans minimum.");
      const net = p.revenusActiviteNetMensuel + (p.alternance ? p.salaireAlternanceBrut * 0.78 : 0);
      if (net >= 1117.26)
        return { statut: "eligible", detail: "Montant à simuler sur caf.fr", raisons: [`Revenus d'activité ≈ ${Math.round(net)} € net / mois.`] };
      return non(`Revenus d'activité (${Math.round(net)} € net/mois) sous le seuil de 1 117 €.`);
    },
  },
  {
    id: "permis-apprenti",
    nom: "Aide au permis pour apprentis",
    organisme: "ASP / France compétences",
    categorie: "emploi",
    resume: "Aide forfaitaire pour financer le permis B.",
    montant: "500 € (versement unique)",
    conditions: ["Apprenti", "18 ans ou plus"],
    lien: "https://www.service-public.fr/particuliers/vosdroits/F34437",
    compteDansTotal: true,
    evaluer: (p) =>
      p.alternance && p.age >= 18
        ? { statut: "eligible", montantAnnuel: 500, detail: "Une seule fois", raisons: ["Apprenti majeur."] }
        : non("Réservé aux apprentis majeurs."),
  },
  {
    id: "transport-employeur",
    nom: "Remboursement de 50 % de l'abonnement transport",
    organisme: "Employeur",
    categorie: "emploi",
    resume: "L'employeur doit rembourser la moitié de l'abonnement aux transports en commun (ou vélo en location) de ses salariés, apprentis compris.",
    montant: "50 % de l'abonnement (ex. ≈ 44 € / mois sur un Navigo à 88,80 €)",
    conditions: ["Être salarié, apprenti ou en contrat pro", "Abonnement transport en commun pour le trajet domicile-travail"],
    lien: "https://www.service-public.fr/particuliers/vosdroits/F19846",
    compteDansTotal: false,
    evaluer: (p) =>
      p.alternance || p.revenusActiviteNetMensuel > 0
        ? { statut: "eligible", detail: "Obligatoire pour l'employeur, sur justificatif", raisons: [p.alternance ? "Alternant salarié." : "Salarié (job étudiant)."] }
        : non("Réservé aux salariés et alternants."),
  },
  {
    id: "forfait-mobilites",
    nom: "Forfait mobilités durables",
    organisme: "Employeur",
    categorie: "emploi",
    resume: "Prise en charge facultative des trajets à vélo, covoiturage, trottinette ou transports partagés.",
    montant: "Jusqu'à 600 € / an exonérés (900 € cumulé avec l'abonnement transport)",
    conditions: ["Salarié ou apprenti", "Dispositif mis en place par l'employeur (facultatif)"],
    lien: "https://www.service-public.fr/particuliers/vosdroits/F33808",
    compteDansTotal: false,
    evaluer: (p) =>
      p.alternance || p.revenusActiviteNetMensuel > 0
        ? { statut: "possible", detail: "Si votre employeur l'a mis en place", raisons: [] }
        : non("Réservé aux salariés et alternants."),
  },
  {
    id: "carte-etudiant-metiers",
    nom: "Carte d'étudiant des métiers",
    organisme: "CFA",
    categorie: "vie_quotidienne",
    resume: "Donne aux apprentis les mêmes réductions que les étudiants (resto U, cinéma, transports, logement Crous…).",
    montant: "Réductions étudiantes",
    conditions: ["Apprenti préparant un diplôme du CAP au BTS / licence pro", "Délivrée gratuitement par le CFA"],
    lien: "https://www.service-public.fr/particuliers/vosdroits/F2918",
    compteDansTotal: false,
    evaluer: (p) =>
      p.alternance
        ? { statut: "eligible", detail: "À demander à votre CFA", raisons: ["Apprenti."] }
        : non("Réservée aux apprentis."),
  },
  {
    id: "fnau-ponctuelle",
    nom: "Aide ponctuelle d'urgence (FNAU)",
    organisme: "Crous — service social",
    categorie: "urgence",
    resume: "Aide rapide en cas de difficulté passagère (perte de job, loyer impayé...).",
    montant: "Jusqu'à 3 071 € par aide",
    conditions: ["Difficulté financière avérée", "Rendez-vous avec une assistante sociale du Crous"],
    lien: "https://www.etudiant.gouv.fr/fr/aides-specifiques-ponctuelles-1418",
    cumul: "Cumulable avec la bourse.",
    compteDansTotal: false,
    evaluer: (p) =>
      estDansLeSup(p)
        ? { statut: "possible", detail: "Sur évaluation sociale", raisons: ["Ouvert à tout étudiant en difficulté."] }
        : non("Réservé aux étudiants."),
  },
  {
    id: "fnau-annuelle",
    nom: "Aide annuelle (FNAU)",
    organisme: "Crous — service social",
    categorie: "urgence",
    resume: "Équivalent d'une bourse pour les étudiants en rupture familiale ou en reprise d'études.",
    montant: "Montant d'un échelon de bourse (jusqu'à 6 335 € / an)",
    conditions: ["Rupture familiale, indépendance avérée ou reprise d'études", "Non cumulable avec la bourse"],
    lien: "https://www.etudiant.gouv.fr/fr/aides-specifiques-allocation-annuelle-1419",
    compteDansTotal: false,
    evaluer: (p) => {
      if (!p.independant) return non("Réservé aux situations de rupture familiale / indépendance.");
      if (p.age >= 35) return non("Moins de 35 ans.");
      return { statut: "possible", detail: "Montant fixé par la commission", raisons: ["Situation d'indépendance déclarée."] };
    },
  },
  {
    id: "pret-garanti",
    nom: "Prêt étudiant garanti par l'État",
    organisme: "Bpifrance + banques",
    categorie: "pret",
    resume: "Prêt sans caution ni condition de ressources, remboursement différé possible.",
    montant: "Jusqu'à 20 000 €",
    conditions: ["Moins de 28 ans", "Nationalité française ou UE/EEE", "Banques partenaires"],
    lien: "https://www.service-public.fr/particuliers/vosdroits/F986",
    compteDansTotal: false,
    evaluer: (p) => {
      if (p.age >= 28) return non("Réservé aux moins de 28 ans.");
      if (p.nationalite !== "fr_ue") return non("Nationalité française ou UE/EEE requise.");
      return { statut: "eligible", detail: "Prêt — à rembourser", raisons: ["Sans garant ni condition de ressources."] };
    },
  },
  {
    id: "regionales",
    nom: "Aides de votre région / ville",
    organisme: "Région, département, ville",
    categorie: "vie_quotidienne",
    resume: "Transport, équipement informatique, permis, mutuelle, mobilité : chaque territoire a ses dispositifs.",
    montant: "Variable",
    conditions: ["Selon la région de résidence ou d'études"],
    lien: "https://www.etudiant.gouv.fr/fr/aides-des-regions-1423",
    compteDansTotal: false,
    evaluer: () => ({ statut: "possible", detail: "À vérifier selon votre territoire", raisons: [] }),
  },
];

export const CATEGORIES: Record<Aide["categorie"], string> = {
  bourse: "Bourses",
  logement: "Logement",
  mobilite: "Mobilité",
  sante: "Santé",
  emploi: "Emploi & alternance",
  vie_quotidienne: "Vie quotidienne",
  urgence: "Urgence",
  pret: "Prêt",
};

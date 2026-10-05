import { ANNEE_UNIVERSITAIRE } from "./bareme";
import { CATEGORIES } from "./catalogue";
import { euros, simuler } from "./simulate";
import type { Profil } from "./types";

export const LIBELLES_CHAMPS: Record<keyof Profil, string> = {
  age: "Âge",
  nationalite: "Nationalité",
  niveau: "Niveau d'études",
  alternance: "Alternance",
  salaireAlternanceBrut: "Salaire d'alternance",
  etablissementHabilite: "Formation habilitée aux bourses",
  revenuBrutGlobalParents: "Revenu brut global des parents",
  enfantsACharge: "Autres enfants à charge",
  enfantsEtudiantsSup: "Enfants dans le supérieur",
  distanceKm: "Distance domicile – études",
  handicap: "Handicap",
  aidant: "Étudiant aidant",
  independant: "Indépendance / rupture familiale",
  logement: "Logement",
  loyer: "Loyer",
  zone: "Ville",
  revenusActiviteNetMensuel: "Revenus d'un job",
  ressourcesAnnuelles: "Ressources annuelles",
  neoBachelier: "Néo-bachelier",
  mentionTB: "Mention Très Bien",
  changeAcademie: "Changement d'académie",
  moisMobiliteInternationale: "Mobilité internationale",
  outreMer: "Originaire d'outre-mer",
};

const CALENDRIER = [
  "1er mars → 31 mai : Dossier Social Étudiant (bourse + logement Crous) sur messervices.etudiant.gouv.fr",
  "Dès la signature du bail : demande d'APL sur caf.fr (et Visale **avant** la signature)",
  "1er juin → 15 janvier : aide à la mobilité Parcoursup",
  "À la rentrée : aide à la mobilité master, aide au mérite (automatique si boursier)",
];

export function genererRapport(profil: Profil, opts: { nom?: string; hypotheses?: (keyof Profil)[]; lien?: string } = {}) {
  const { resultats, total } = simuler(profil);
  const eligibles = resultats.filter((r) => r.evaluation.statut === "eligible");
  const possibles = resultats.filter((r) => r.evaluation.statut === "possible");
  const l: string[] = [];

  l.push(`# ${opts.nom ?? "Simulation d'aides étudiantes"} — ${ANNEE_UNIVERSITAIRE}`, "");
  l.push(`**Total estimé : ${euros(total)} / an** (≈ ${euros(total / 12)} / mois), hors prêts et garanties.`, "");

  if (eligibles.length) {
    l.push("## Aides auxquelles vous semblez éligible", "", "| Aide | Organisme | Estimation | Détail |", "|---|---|---|---|");
    for (const r of eligibles) {
      const m = r.evaluation.montantAnnuel !== undefined ? euros(r.evaluation.montantAnnuel) : "—";
      l.push(`| [${r.nom}](${r.lien}) | ${r.organisme} | ${m} | ${r.evaluation.detail} |`);
    }
    l.push("");
    for (const r of eligibles.filter((r) => r.evaluation.raisons.length)) {
      l.push(`- **${r.nom}** : ${r.evaluation.raisons.join(" ")}`);
    }
    l.push("");
  }

  if (possibles.length) {
    l.push("## À vérifier", "");
    for (const r of possibles) {
      l.push(`- **[${r.nom}](${r.lien})** (${CATEGORIES[r.categorie]}) — ${r.evaluation.detail || r.montant}`);
    }
    l.push("");
  }

  if (opts.hypotheses?.length) {
    l.push(
      "## Hypothèses",
      "",
      `Non renseignés, valeurs par défaut utilisées : ${opts.hypotheses.map((h) => LIBELLES_CHAMPS[h]).join(", ")}.`,
      "",
    );
  }

  l.push("## Calendrier des démarches", "", ...CALENDRIER.map((c) => `- ${c}`), "");
  if (opts.lien) l.push(`[Ouvrir et ajuster cette simulation](${opts.lien})`, "");
  l.push(
    "_Estimations indicatives basées sur les barèmes publiés. Seuls le Crous, la CAF et les organismes concernés déterminent les droits réels. L'APL est une approximation : utilisez le simulateur de caf.fr._",
  );
  return l.join("\n");
}

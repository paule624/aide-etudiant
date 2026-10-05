import { AIDES } from "./catalogue";
import type { Profil, ResultatAide, Simulation } from "./types";

export const PROFIL_DEFAUT: Profil = {
  age: 18,
  nationalite: "fr_ue",
  niveau: "L1",
  alternance: false,
  salaireAlternanceBrut: 0,
  etablissementHabilite: true,
  revenuBrutGlobalParents: 30000,
  enfantsACharge: 1,
  enfantsEtudiantsSup: 0,
  distanceKm: 50,
  handicap: false,
  aidant: false,
  independant: false,
  logement: "location",
  loyer: 450,
  zone: "grande_ville",
  revenusActiviteNetMensuel: 0,
  ressourcesAnnuelles: 0,
  neoBachelier: true,
  mentionTB: false,
  changeAcademie: false,
  moisMobiliteInternationale: 0,
  outreMer: false,
};

const ORDRE = { eligible: 0, possible: 1, non_eligible: 2 } as const;

export function simuler(profil: Profil) {
  const resultats: ResultatAide[] = AIDES.map((a) => ({ ...a, evaluation: a.evaluer(profil) })).sort(
    (a, b) =>
      ORDRE[a.evaluation.statut] - ORDRE[b.evaluation.statut] ||
      (b.evaluation.montantAnnuel ?? 0) - (a.evaluation.montantAnnuel ?? 0),
  );
  const total = resultats
    .filter((r) => r.compteDansTotal && r.evaluation.statut === "eligible")
    .reduce((s, r) => s + (r.evaluation.montantAnnuel ?? 0), 0);
  return {
    resultats,
    total,
    nbEligibles: resultats.filter((r) => r.evaluation.statut === "eligible").length,
    nbPossibles: resultats.filter((r) => r.evaluation.statut === "possible").length,
  };
}

export function nouvelleSimulation(nom: string, profil: Profil = PROFIL_DEFAUT): Simulation {
  return { id: crypto.randomUUID(), nom, profil: { ...profil }, updatedAt: Date.now() };
}

export const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

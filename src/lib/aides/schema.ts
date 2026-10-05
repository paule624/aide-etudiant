import { z } from "zod";
import { PROFIL_DEFAUT } from "./simulate";
import type { Profil } from "./types";

const n = () => z.number().min(0);

// Every field is optional: missing ones fall back to PROFIL_DEFAUT and are reported as assumptions.
export const profilShape = {
  age: n().int().max(99).optional().describe("Âge au 1er septembre de l'année universitaire"),
  nationalite: z
    .enum(["fr_ue", "hors_ue_resident", "hors_ue"])
    .optional()
    .describe("fr_ue = française/UE/EEE ; hors_ue_resident = hors UE résident en France depuis 2 ans+ ; hors_ue = arrivé récemment"),
  niveau: z
    .enum(["terminale", "L1", "L2", "L3", "BTS", "M1", "M2", "doctorat"])
    .optional()
    .describe("Niveau d'études à la rentrée (BTS couvre aussi CPGE et écoles)"),
  alternance: z.boolean().optional().describe("En contrat d'apprentissage / alternance"),
  salaireAlternanceBrut: n().optional().describe("Salaire d'alternance en € brut par mois"),
  etablissementHabilite: z.boolean().optional().describe("Formation habilitée à recevoir des boursiers (vrai pour les universités publiques)"),
  revenuBrutGlobalParents: n()
    .optional()
    .describe("Revenu brut global du foyer fiscal des parents, en €/an, sur l'avis d'imposition 2025 (revenus 2024)"),
  enfantsACharge: n().int().optional().describe("Nombre d'autres enfants à charge des parents, sans compter l'étudiant"),
  enfantsEtudiantsSup: n().int().optional().describe("Parmi eux, combien sont dans l'enseignement supérieur"),
  distanceKm: n().optional().describe("Distance en km entre le domicile familial et le lieu d'études"),
  handicap: z.boolean().optional().describe("Étudiant en situation de handicap"),
  aidant: z.boolean().optional().describe("Étudiant aidant d'un proche dépendant"),
  independant: z.boolean().optional().describe("Rupture familiale ou indépendance financière avérée"),
  logement: z.enum(["parents", "crous", "location", "colocation"]).optional().describe("Type de logement pendant les études"),
  loyer: n().optional().describe("Loyer hors charges en €/mois"),
  zone: z.enum(["idf", "grande_ville", "autre"]).optional().describe("idf = Île-de-France ; grande_ville = agglo > 100 000 hab. ; autre"),
  revenusActiviteNetMensuel: n().optional().describe("Revenus d'un job étudiant en € net/mois"),
  ressourcesAnnuelles: n().optional().describe("Ressources annuelles totales de l'étudiant (pour la complémentaire santé solidaire)"),
  neoBachelier: z.boolean().optional().describe("Bac obtenu cette année"),
  mentionTB: z.boolean().optional().describe("Mention Très Bien au bac"),
  changeAcademie: z.boolean().optional().describe("Change d'académie (après le bac) ou de région académique (entrée en M1)"),
  moisMobiliteInternationale: n().int().optional().describe("Durée en mois d'une mobilité à l'étranger prévue cette année (0 si aucune)"),
  outreMer: z.boolean().optional().describe("Étudiant originaire d'outre-mer qui étudie hors de son territoire"),
  departementEtudes: z
    .string()
    .regex(/^(\d{2}|2A|2B|97\d)$/)
    .optional()
    .describe("Code INSEE du département du lieu d'études, ex. '69', '2A', '974'. Active la recherche des aides régionales, départementales et locales"),
  departementFamille: z
    .string()
    .regex(/^(\d{2}|2A|2B|97\d)$/)
    .optional()
    .describe("Code INSEE du département du domicile familial (certaines aides dépendent de la résidence des parents)"),
};

export const profilSchema = z.object(profilShape);
export type ProfilPartiel = z.infer<typeof profilSchema>;

export function completerProfil(partiel: ProfilPartiel): { profil: Profil; hypotheses: (keyof Profil)[] } {
  const hypotheses = (Object.keys(PROFIL_DEFAUT) as (keyof Profil)[]).filter((k) => partiel[k] === undefined);
  const defini = Object.fromEntries(Object.entries(partiel).filter(([, v]) => v !== undefined));
  return { profil: { ...PROFIL_DEFAUT, ...defini }, hypotheses };
}

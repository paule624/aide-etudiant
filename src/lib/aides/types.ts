export type Niveau =
  | "terminale"
  | "L1"
  | "L2"
  | "L3"
  | "BTS"
  | "M1"
  | "M2"
  | "doctorat";

export type Nationalite = "fr_ue" | "hors_ue_resident" | "hors_ue";

export type Logement = "parents" | "crous" | "location" | "colocation";

export type Zone = "idf" | "grande_ville" | "autre";

export type SituationFamiliale = "seul" | "couple" | "marie_pacse";

export type ActiviteConjoint = "actif" | "etudiant" | "chomeur" | "inactif";

export type Profil = {
  age: number;
  nationalite: Nationalite;
  niveau: Niveau;
  alternance: boolean;
  salaireAlternanceBrut: number; // monthly gross
  etablissementHabilite: boolean;

  // Family (fiscal household of the parents)
  revenuBrutGlobalParents: number; // "revenu brut global" N-2
  enfantsACharge: number; // excluding the student
  enfantsEtudiantsSup: number; // among them, enrolled in higher education
  distanceKm: number; // family home -> place of study
  handicap: boolean;
  aidant: boolean;
  independant: boolean; // family break-up / fiscal independence

  // Housing
  logement: Logement;
  loyer: number; // monthly, charges excluded
  zone: Zone;

  // Own resources
  revenusActiviteNetMensuel: number;
  ressourcesAnnuelles: number;

  // Mobility & merit
  neoBachelier: boolean;
  mentionTB: boolean;
  changeAcademie: boolean;
  moisMobiliteInternationale: number;
  outreMer: boolean;

  // Household
  situationFamiliale: SituationFamiliale;
  conjointAge: number;
  conjointActivite: ActiviteConjoint;
  conjointRevenusNetMensuel: number;

  // Territory (INSEE département codes, "" = not set)
  departementEtudes: string;
  departementFamille: string;
};

export type Simulation = {
  id: string;
  nom: string;
  profil: Profil;
  updatedAt: number;
};

export type Categorie =
  | "bourse"
  | "logement"
  | "mobilite"
  | "sante"
  | "emploi"
  | "vie_quotidienne"
  | "urgence"
  | "pret";

export type Statut = "eligible" | "possible" | "non_eligible";

export type Evaluation = {
  statut: Statut;
  montantAnnuel?: number; // estimated € per year (or one-shot)
  detail: string; // short explanation of the amount
  raisons: string[]; // why eligible / not eligible
};

export type Aide = {
  id: string;
  nom: string;
  organisme: string;
  categorie: Categorie;
  resume: string;
  montant: string; // human readable amount range
  conditions: string[];
  lien: string;
  cumul?: string;
  // Loans and guarantees are not counted in the total
  compteDansTotal: boolean;
  evaluer: (p: Profil) => Evaluation;
};

export type ResultatAide = Aide & { evaluation: Evaluation };

// --- Local / specific aids synced from betagouv/aides-jeunes ---

export type ProfilCible = "etudiant" | "lyceen" | "apprenti" | "stagiaire";

export type AideLocale = {
  id: string;
  nom: string;
  organisme: string;
  niveau: "national" | "region" | "departement" | "local";
  description: string;
  conditions: string[];
  montant?: number;
  unite?: string;
  periodicite: "annuelle" | "mensuelle" | "ponctuelle" | "autre";
  legende?: string;
  lien: string;
  ageMin?: number;
  ageMax?: number;
  regions: string[];
  departements: string[];
  communes: string[];
  profils: ProfilCible[]; // empty = open to everyone
  autresConditions: string[];
};

export type ResultatAideLocale = AideLocale & {
  statut: Exclude<Statut, "non_eligible">;
  raisons: string[];
};

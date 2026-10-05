import type { Profil } from "./types";

// Bourse sur critères sociaux — année universitaire 2026-2027
// Source: arrêté du 26 mars 2026 (plafonds inchangés), montants annuels versés en 10 mensualités.
export const ANNEE_UNIVERSITAIRE = "2026-2027";

export const ECHELONS = ["0bis", "1", "2", "3", "4", "5", "6", "7"] as const;
export type Echelon = (typeof ECHELONS)[number];

export const MONTANTS_ECHELON: Record<Echelon, number> = {
  "0bis": 1454,
  "1": 2163,
  "2": 3071,
  "3": 3828,
  "4": 4587,
  "5": 5212,
  "6": 5506,
  "7": 6335,
};

// Rows = points de charge (0..17), columns = échelons 0bis..7 (revenu brut global max, €)
const PLAFONDS: readonly (readonly number[])[] = [
  [35086, 23850, 19281, 17034, 14829, 12667, 7992, 265],
  [38966, 26500, 21423, 18921, 16472, 14077, 8872, 530],
  [42877, 29150, 23564, 20818, 18126, 15476, 9773, 795],
  [46767, 31800, 25705, 22716, 19758, 16875, 10653, 1060],
  [50668, 34450, 27846, 24603, 21412, 18285, 11533, 1325],
  [54569, 37111, 29998, 26500, 23066, 19695, 12434, 1590],
  [58459, 39761, 32139, 28376, 24709, 21105, 13324, 1855],
  [62360, 42411, 34280, 30274, 26352, 22514, 14215, 2120],
  [66261, 45061, 36422, 32171, 28005, 23914, 15094, 2385],
  [70151, 47700, 38563, 34058, 29648, 25323, 15985, 2650],
  [74052, 50361, 40704, 35955, 31291, 26733, 16865, 2915],
  [77952, 53011, 42835, 37853, 32955, 28132, 17755, 3180],
  [81843, 55650, 44976, 39739, 34588, 29542, 18645, 3445],
  [85743, 58300, 47117, 41637, 36231, 30952, 19525, 3710],
  [89634, 60971, 49269, 43513, 37895, 32362, 20426, 3975],
  [93545, 63611, 51410, 45410, 39538, 33772, 21317, 4240],
  [97435, 66261, 53551, 47308, 41170, 35181, 22196, 4505],
  [101347, 68911, 55692, 49195, 42824, 36581, 23087, 4770],
];

export const MAX_POINTS = PLAFONDS.length - 1;

export type DetailPoints = { libelle: string; points: number }[];

export function pointsDistance(km: number): number {
  if (km >= 13000) return 4;
  if (km >= 3500) return 3;
  if (km >= 250) return 2;
  if (km >= 30) return 1;
  return 0;
}

export function calculerPointsDeCharge(p: Profil): {
  total: number;
  detail: DetailPoints;
} {
  const detail: DetailPoints = [];
  const dist = pointsDistance(p.distanceKm);
  if (dist) detail.push({ libelle: `Distance ${p.distanceKm} km`, points: dist });

  const etudiants = Math.max(0, Math.min(p.enfantsEtudiantsSup, p.enfantsACharge));
  const autres = Math.max(0, p.enfantsACharge - etudiants);
  if (autres)
    detail.push({ libelle: `${autres} enfant(s) à charge`, points: autres * 2 });
  if (etudiants)
    detail.push({
      libelle: `${etudiants} enfant(s) dans le supérieur`,
      points: etudiants * 4,
    });
  if (p.handicap) detail.push({ libelle: "Situation de handicap", points: 4 });
  if (p.aidant) detail.push({ libelle: "Étudiant aidant", points: 4 });

  const brut = detail.reduce((s, d) => s + d.points, 0);
  return { total: Math.min(brut, MAX_POINTS), detail };
}

/** Highest échelon reachable for a given income, or null when above the 0bis ceiling. */
export function calculerEchelon(revenu: number, points: number): Echelon | null {
  const ligne = PLAFONDS[Math.min(Math.max(points, 0), MAX_POINTS)];
  for (let i = ECHELONS.length - 1; i >= 0; i--) {
    if (revenu <= ligne[i]) return ECHELONS[i];
  }
  return null;
}

export function plafond(points: number, echelon: Echelon): number {
  return PLAFONDS[Math.min(Math.max(points, 0), MAX_POINTS)][ECHELONS.indexOf(echelon)];
}

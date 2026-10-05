import donnees from "@/data/aides-locales.json";
import { departement, departementDeCommune, REGIONS, regionDuDepartement } from "@/lib/geo";
import type { AideLocale, Profil, ProfilCible, ResultatAideLocale } from "./types";

export const AIDES_LOCALES = donnees.aides as AideLocale[];
export const SOURCE_LOCALES = { source: donnees.source, licence: donnees.licence, commit: donnees.commit };

const ORDRE_NIVEAU = { departement: 0, region: 1, local: 2, national: 3 } as const;

export function profilsCibles(p: Profil): ProfilCible[] {
  if (p.alternance) return ["apprenti"];
  if (p.niveau === "terminale") return ["lyceen", "etudiant"];
  return ["etudiant"];
}

type Territoire = { code: string; role: string };

export function territoires(p: Profil): Territoire[] {
  const t: Territoire[] = [];
  if (p.departementEtudes) t.push({ code: p.departementEtudes, role: "lieu d'études" });
  if (p.departementFamille && p.departementFamille !== p.departementEtudes)
    t.push({ code: p.departementFamille, role: "domicile familial" });
  return t;
}

/** Local aids matching the profile's territories, profile type and age. Empty when no département is set. */
export function aidesLocalesPour(p: Profil, source: AideLocale[] = AIDES_LOCALES): ResultatAideLocale[] {
  const terr = territoires(p);
  if (!terr.length) return [];
  const cibles = profilsCibles(p);
  const resultats: ResultatAideLocale[] = [];

  for (const a of source) {
    if (a.ageMin !== undefined && p.age < a.ageMin) continue;
    if (a.ageMax !== undefined && p.age > a.ageMax) continue;
    if (a.profils.length && !a.profils.some((c) => cibles.includes(c))) continue;

    const raisons: string[] = [];
    let geo: "ok" | "commune" | null = null;
    const sansZone = !a.regions.length && !a.departements.length && !a.communes.length;

    if (sansZone) geo = "ok";
    for (const t of terr) {
      const nomDep = departement(t.code)?.nom ?? t.code;
      if (a.departements.includes(t.code)) {
        geo = "ok";
        raisons.push(`${nomDep} (${t.role})`);
      } else if (a.regions.includes(regionDuDepartement(t.code) ?? "")) {
        geo = "ok";
        raisons.push(`${REGIONS[regionDuDepartement(t.code)!]} (${t.role})`);
      } else if (a.communes.some((c) => departementDeCommune(c) === t.code)) {
        geo ??= "commune";
        raisons.push(`Certaines communes de ${nomDep} (${t.role})`);
      }
    }
    if (!geo) continue;

    if (a.profils.includes("apprenti") && cibles.includes("apprenti")) raisons.push("Réservée aux apprentis / alternants");
    if (a.ageMin !== undefined || a.ageMax !== undefined)
      raisons.push(`Âge : ${a.ageMin ?? 0}–${a.ageMax ?? "∞"} ans`);
    raisons.push(...a.autresConditions);

    const statut = geo === "ok" && !a.autresConditions.length ? "eligible" : "possible";
    resultats.push({ ...a, statut, raisons: [...new Set(raisons)] });
  }

  return resultats.sort(
    (a, b) =>
      (a.statut === b.statut ? 0 : a.statut === "eligible" ? -1 : 1) ||
      ORDRE_NIVEAU[a.niveau] - ORDRE_NIVEAU[b.niveau] ||
      (b.montant ?? 0) - (a.montant ?? 0),
  );
}

const PERIODICITE: Record<AideLocale["periodicite"], string> = {
  annuelle: " / an",
  mensuelle: " / mois",
  ponctuelle: " (ponctuel)",
  autre: "",
};

export function montantLocal(a: AideLocale): string {
  if (a.montant === undefined) return a.legende ?? "Avantage en nature / tarif réduit";
  const unite = a.unite ?? "€";
  return `${a.montant.toLocaleString("fr-FR")} ${unite}${unite === "€" ? PERIODICITE[a.periodicite] : ""}`;
}

/** Browse local aids of a département (no age / eligibility check), optionally for one profile type. */
export function aidesLocalesDuDepartement(code: string, cible?: ProfilCible): AideLocale[] {
  const region = regionDuDepartement(code);
  return AIDES_LOCALES.filter(
    (a) =>
      (!cible || !a.profils.length || a.profils.includes(cible)) &&
      (a.departements.includes(code) ||
        (region !== undefined && a.regions.includes(region)) ||
        a.communes.some((c) => departementDeCommune(c) === code)),
  ).sort((a, b) => ORDRE_NIVEAU[a.niveau] - ORDRE_NIVEAU[b.niveau] || (b.montant ?? 0) - (a.montant ?? 0));
}

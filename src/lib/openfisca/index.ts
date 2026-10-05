// Server-only: reads the OpenFisca URL and API key from the environment.
import type { Profil, ResultatOpenFisca } from "@/lib/aides/types";

const ZONE_APL = { idf: "zone_1", grande_ville: "zone_2", autre: "zone_3" } as const;
const HISTORIQUE_MOIS = 24; // APL and prime d'activité look at past resources
const TIMEOUT_MS = 8000;
// Rough net → gross ratio for a regular student job (salaried, non-apprentice)
const NET_VERS_BRUT = 1 / 0.78;

function moisPrecedents(n: number, depuis = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), 1));
  for (let i = 0; i < n; i++) {
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

function naissance(age: number, aujourdHui = new Date()): string {
  return `${aujourdHui.getUTCFullYear() - age}-01-01`;
}

export function construireSituation(p: Profil, maintenant = new Date()) {
  const mois = moisPrecedents(HISTORIQUE_MOIS, maintenant);
  const courant = mois[0];
  const parMois = <T>(v: T) => Object.fromEntries(mois.map((m) => [m, v]));
  const demande = { [courant]: null };

  const enCouple = p.situationFamiliale !== "seul";
  const statutMarital = p.situationFamiliale === "marie_pacse" ? "marie" : "celibataire";
  const brutDemandeur = p.alternance ? p.salaireAlternanceBrut : p.revenusActiviteNetMensuel * NET_VERS_BRUT;

  const individus: Record<string, Record<string, unknown>> = {
    demandeur: {
      date_naissance: { ETERNITY: naissance(p.age, maintenant) },
      activite: parMois(p.alternance || p.revenusActiviteNetMensuel > 0 ? "actif" : "etudiant"),
      etudiant: parMois(!p.alternance),
      apprenti: parMois(p.alternance),
      salaire_de_base: parMois(Math.round(brutDemandeur * 100) / 100),
      statut_marital: parMois(statutMarital),
      handicap: parMois(p.handicap),
      salaire_net: demande,
    },
  };
  const parents = ["demandeur"];

  if (enCouple) {
    individus.conjoint = {
      date_naissance: { ETERNITY: naissance(p.conjointAge || p.age, maintenant) },
      activite: parMois(p.conjointActivite),
      etudiant: parMois(p.conjointActivite === "etudiant"),
      salaire_de_base: parMois(Math.round(p.conjointRevenusNetMensuel * NET_VERS_BRUT * 100) / 100),
      statut_marital: parMois(statutMarital),
      contrat_engagement_jeune: demande,
    };
    parents.push("conjoint");
  }

  const chezParents = p.logement === "parents";
  const menage: Record<string, unknown> = {
    personne_de_reference: ["demandeur"],
    ...(enCouple ? { conjoint: ["conjoint"] } : {}),
    zone_apl: parMois(ZONE_APL[p.zone]),
    loyer: parMois(chezParents ? 0 : p.loyer),
    statut_occupation_logement: parMois(
      chezParents ? "loge_gratuitement" : p.logement === "crous" ? "locataire_foyer" : "locataire_vide",
    ),
    coloc: parMois(p.logement === "colocation"),
    logement_crous: parMois(p.logement === "crous"),
  };

  return {
    courant,
    situation: {
      individus,
      familles: {
        famille: {
          parents,
          aide_logement: demande,
          ppa: demande,
          rsa: demande,
          cmu_c: demande,
          css_participation_forfaitaire: demande,
        },
      },
      foyers_fiscaux: { foyer: { declarants: p.situationFamiliale === "marie_pacse" ? parents : ["demandeur"] } },
      menages: { menage },
    },
  };
}

type Reponse = {
  individus: Record<string, Record<string, Record<string, number>>>;
  familles: { famille: Record<string, Record<string, number | boolean>> };
};

/** Exact amounts from the self-hosted OpenFisca, or null when not configured / unreachable. */
export async function calculerOpenFisca(p: Profil): Promise<ResultatOpenFisca | null> {
  const url = process.env.OPENFISCA_URL;
  if (!url) return null;
  const { courant, situation } = construireSituation(p);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": process.env.OPENFISCA_API_KEY ?? "" },
      body: JSON.stringify(situation),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const r = (await res.json()) as Reponse;
    const f = r.familles.famille;
    const num = (v: number | boolean | undefined) => Math.round(Number(v ?? 0) * 100) / 100;
    return {
      aideLogement: num(f.aide_logement[courant]),
      ppa: num(f.ppa[courant]),
      rsa: num(f.rsa[courant]),
      cssGratuite: Boolean(f.cmu_c[courant]),
      // Despite its label, the variable holds the monthly participation (e.g. 8 € for under-30s)
      cssParticipation: num(f.css_participation_forfaitaire[courant]),
      cejConjoint: num(r.individus.conjoint?.contrat_engagement_jeune?.[courant]),
      salaireNet: num(r.individus.demandeur.salaire_net[courant]),
    };
  } catch {
    return null;
  }
}

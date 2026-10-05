/**
 * Sync local/specific aids from betagouv/aides-jeunes (AGPL-3.0) into src/data/aides-locales.json.
 * Usage: pnpm sync:aides
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parse } from "yaml";
import type { AideLocale, ProfilCible } from "../src/lib/aides/types";

const REPO = "https://github.com/betagouv/aides-jeunes.git";
const OUT = join(import.meta.dirname, "../src/data/aides-locales.json");

// Profiles from aides-jeunes that matter for a student or an apprentice
const PROFILS: Record<string, ProfilCible> = {
  enseignement_superieur: "etudiant",
  etudiant: "etudiant",
  lyceen: "lyceen",
  apprenti: "apprenti",
  professionnalisation: "apprenti",
  stagiaire: "stagiaire",
};

const GEO = new Set(["age", "regions", "departements", "communes", "epcis", "excluded_epcis", "codes_postaux"]);
const LIBELLES_CONDITIONS: Record<string, string> = {
  quotient_familial: "Quotient familial sous un plafond",
  attached_to_institution: "Être rattaché à un établissement précis",
  regime_securite_sociale: "Régime de sécurité sociale spécifique",
  situation_handicap: "Situation de handicap",
  difficultes_acces_ou_frais_logement: "Difficultés d'accès ou de frais de logement",
  statut_occupation_logement: "Statut d'occupation du logement",
  formation_sanitaire_social: "Formation sanitaire ou sociale",
  beneficiaire_rsa: "Bénéficiaire du RSA",
};

// Untyped YAML from an external repo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
const tronquer = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const str = (v: unknown) => String(v);

function main() {
  const dir = mkdtempSync(join(tmpdir(), "aides-jeunes-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
  git("clone", "--quiet", "--depth", "1", "--filter=blob:none", "--sparse", REPO, ".");
  git("sparse-checkout", "set", "data/benefits/javascript", "data/institutions");
  const commit = git("rev-parse", "HEAD");

  const institutions = new Map<string, Raw>();
  const instDir = join(dir, "data/institutions");
  for (const f of readdirSync(instDir).filter((f) => f.endsWith(".yml"))) {
    institutions.set(basename(f, ".yml"), parse(readFileSync(join(instDir, f), "utf8")));
  }

  const benDir = join(dir, "data/benefits/javascript");
  const aides: AideLocale[] = [];
  let ignorees = 0;

  for (const f of readdirSync(benDir).filter((f) => f.endsWith(".yml"))) {
    const b: Raw = parse(readFileSync(join(benDir, f), "utf8"));
    if (b.private) continue;

    const profilsBruts: Raw[] = b.profils ?? [];
    const profils = [...new Set(profilsBruts.map((p) => PROFILS[p.type]).filter(Boolean))] as ProfilCible[];
    // Aids restricted to profiles irrelevant here (job seekers, RSA...) are skipped
    if (profilsBruts.length && !profils.length) {
      ignorees++;
      continue;
    }
    const profilsAvecConditions = profilsBruts.some((p) => PROFILS[p.type] && p.conditions?.length);

    const cg: Raw[] = b.conditions_generales ?? [];
    let ageMin: number | undefined;
    let ageMax: number | undefined;
    for (const c of cg.filter((c) => c.type === "age")) {
      const v = Number(c.value);
      if (c.operator === ">=") ageMin = v;
      else if (c.operator === ">") ageMin = v + 1;
      else if (c.operator === "<=") ageMax = v;
      else if (c.operator === "<") ageMax = v - 1;
      else if (c.operator === "=") ageMin = ageMax = v;
    }
    const values = (type: string) => cg.filter((c) => c.type === type).flatMap((c) => (c.values ?? []).map(str));

    const inst = institutions.get(b.institution) ?? {};
    let regions = values("regions");
    let departements = values("departements");
    let communes = values("communes");
    // No explicit area: fall back to the institution's own territory
    if (!regions.length && !departements.length && !communes.length && inst.code_insee) {
      if (inst.type === "region") regions = [str(inst.code_insee)];
      else if (inst.type === "departement") departements = [str(inst.code_insee)];
      else if (inst.type === "commune") communes = [str(inst.code_insee)];
    }
    const zoneInconnue = !regions.length && !departements.length && !communes.length && inst.type !== "national";
    if (zoneInconnue && ["epci", "caf", "msa"].includes(inst.type)) {
      // Local body whose territory we cannot resolve offline
      ignorees++;
      continue;
    }

    const autresConditions = [
      ...new Set(
        cg
          .filter((c) => !GEO.has(c.type) && !PROFILS[c.type])
          .map((c) => LIBELLES_CONDITIONS[c.type] ?? c.type),
      ),
    ];
    if (profilsAvecConditions) autresConditions.push("Conditions supplémentaires selon le profil");

    aides.push({
      id: basename(f, ".yml"),
      nom: stripHtml(String(b.label)).replace(/^"|"$/g, ""),
      organisme: inst.name ?? b.institution,
      niveau: inst.type === "national" ? "national" : inst.type === "region" ? "region" : inst.type === "departement" ? "departement" : "local",
      description: tronquer(stripHtml(String(b.description ?? "")), 400),
      conditions: (b.conditions ?? []).map((c: unknown) => stripHtml(String(c))),
      montant: typeof b.montant === "number" ? b.montant : undefined,
      unite: b.unit ?? (b.type === "float" ? "€" : undefined),
      periodicite: b.periodicite,
      legende: b.legend ? stripHtml(String(b.legend)) : undefined,
      lien: b.teleservice ?? b.instructions ?? b.link,
      ageMin,
      ageMax,
      regions,
      departements,
      communes,
      profils,
      autresConditions,
    });
  }

  aides.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const data = { source: "betagouv/aides-jeunes", licence: "AGPL-3.0", commit, aides };
  writeFileSync(OUT, `${JSON.stringify(data)}\n`);
  console.log(`${aides.length} aides écrites (${ignorees} ignorées) depuis ${commit.slice(0, 7)} → ${OUT}`);
}

main();

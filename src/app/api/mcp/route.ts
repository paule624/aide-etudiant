import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ANNEE_UNIVERSITAIRE } from "@/lib/aides/bareme";
import { AIDES, CATEGORIES } from "@/lib/aides/catalogue";
import { aidesLocalesDuDepartement, montantLocal } from "@/lib/aides/locales";
import { genererRapport, LIBELLES_CHAMPS } from "@/lib/aides/rapport";
import { completerProfil, profilShape } from "@/lib/aides/schema";
import { lienSimulation } from "@/lib/aides/share";
import { simuler } from "@/lib/aides/simulate";
import type { AideLocale, Categorie } from "@/lib/aides/types";
import { departement } from "@/lib/geo";

// Privacy: stateless, nothing is stored and nothing is logged (no console calls in this file).
export const dynamic = "force-dynamic";

const INSTRUCTIONS = `Simulateur des aides financières pour étudiants en France (${ANNEE_UNIVERSITAIRE}).
Collectez le profil en conversation (âge, niveau, alternance, situation de couple et activité du conjoint, revenu brut global des parents, frères et sœurs, distance, logement, loyer, département d'études et département familial...) avant d'appeler simuler_aides.
Demandez toujours le département : il débloque les aides régionales, départementales et locales (transport, permis, équipement, aides aux apprentis).
Ne demandez que ce qui est utile et proposez des valeurs approximatives si l'étudiant ne sait pas.
Ce serveur ne stocke ni ne journalise aucune donnée. Rappelez que les montants sont des estimations.
Terminez en donnant le lien de simulation pour que l'étudiant puisse ajuster lui-même.`;

function creerServeur(baseUrl: string) {
  const server = new McpServer({ name: "aides-etudiantes", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "simuler_aides",
    {
      title: "Simuler les aides étudiantes",
      description:
        "Calcule l'éligibilité et le montant estimé de chaque aide (bourse Crous et échelon, APL, mérite, mobilité, CSS...) pour un profil d'étudiant. Les champs non fournis prennent une valeur par défaut, listée dans 'hypotheses'.",
      inputSchema: profilShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const { profil, hypotheses } = completerProfil(args);
      const { resultats, aidesLocales, total } = simuler(profil);
      const data = {
        totalAnnuelEstime: total,
        aides: resultats.map((r) => ({
          id: r.id,
          nom: r.nom,
          statut: r.evaluation.statut,
          montantAnnuelEstime: r.evaluation.montantAnnuel ?? null,
          compteDansTotal: r.compteDansTotal,
          detail: r.evaluation.detail,
          raisons: r.evaluation.raisons,
        })),
        aidesLocales: aidesLocales.slice(0, 40).map((a) => ({
          ...resumeLocale(a),
          statut: a.statut,
          raisons: a.raisons,
        })),
        nbAidesLocales: aidesLocales.length,
        hypotheses: hypotheses.map((h) => ({ champ: h, libelle: LIBELLES_CHAMPS[h], valeurParDefaut: profil[h] })),
        lienSimulation: lienSimulation(baseUrl, profil),
      };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.registerTool(
    "exporter_rapport",
    {
      title: "Exporter un rapport explicatif",
      description:
        "Génère un rapport Markdown prêt à partager : total estimé, aides éligibles avec explications, aides à vérifier, hypothèses, calendrier des démarches et lien vers la simulation pré-remplie.",
      inputSchema: { ...profilShape, nom: z.string().max(80).optional().describe("Titre du rapport, ex. prénom ou scénario") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ nom, ...args }) => {
      const { profil, hypotheses } = completerProfil(args);
      const lien = lienSimulation(baseUrl, profil, nom);
      return { content: [{ type: "text", text: genererRapport(profil, { nom, hypotheses, lien }) }] };
    },
  );

  server.registerTool(
    "lister_aides",
    {
      title: "Lister les aides",
      description: "Liste les aides étudiantes recensées (montants, conditions, lien de demande), éventuellement filtrées par catégorie.",
      inputSchema: {
        categorie: z.enum(Object.keys(CATEGORIES) as [Categorie, ...Categorie[]]).optional().describe("Filtrer par catégorie"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ categorie }) => {
      const aides = AIDES.filter((a) => !categorie || a.categorie === categorie).map(
        ({ id, nom, organisme, categorie, resume, montant, conditions, lien, cumul }) => ({
          id, nom, organisme, categorie: CATEGORIES[categorie], resume, montant, conditions, lien, cumul,
        }),
      );
      return { content: [{ type: "text", text: JSON.stringify(aides, null, 2) }] };
    },
  );

  server.registerTool(
    "lister_aides_locales",
    {
      title: "Lister les aides locales d'un département",
      description:
        "Parcourt les aides de la région, du département et des villes d'un département (transport, permis, équipement, logement, aides aux apprentis...), sans vérifier l'éligibilité. Source : aides-jeunes (beta.gouv).",
      inputSchema: {
        departement: z.string().regex(/^(\d{2}|2A|2B|97\d)$/).describe("Code INSEE du département, ex. '33', '2A', '974'"),
        profil: z.enum(["etudiant", "apprenti", "lyceen"]).optional().describe("Ne garder que les aides ouvertes à ce profil"),
        recherche: z.string().max(60).optional().describe("Mot-clé, ex. 'transport', 'permis', 'logement'"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ departement: code, profil, recherche }) => {
      const q = recherche?.toLowerCase();
      const aides = aidesLocalesDuDepartement(code, profil).filter(
        (a) => !q || [a.nom, a.organisme, a.description].join(" ").toLowerCase().includes(q),
      );
      const data = { departement: departement(code)?.nom ?? code, total: aides.length, aides: aides.slice(0, 60).map(resumeLocale) };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  return server;
}

function resumeLocale(a: AideLocale) {
  return {
    nom: a.nom,
    organisme: a.organisme,
    niveau: a.niveau,
    montant: montantLocal(a),
    profils: a.profils.length ? a.profils : ["tous"],
    age: a.ageMin !== undefined || a.ageMax !== undefined ? `${a.ageMin ?? 0}-${a.ageMax ?? "∞"} ans` : undefined,
    conditions: [...a.conditions, ...a.autresConditions],
    lien: a.lien,
  };
}

async function handle(req: Request) {
  const server = creerServeur(new URL(req.url).origin);
  // Stateless mode: a fresh server + transport per request, no session id
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export { handle as GET, handle as POST, handle as DELETE };

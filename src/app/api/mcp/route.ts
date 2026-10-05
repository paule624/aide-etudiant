import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { ANNEE_UNIVERSITAIRE } from "@/lib/aides/bareme";
import { AIDES, CATEGORIES } from "@/lib/aides/catalogue";
import { genererRapport, LIBELLES_CHAMPS } from "@/lib/aides/rapport";
import { completerProfil, profilShape } from "@/lib/aides/schema";
import { lienSimulation } from "@/lib/aides/share";
import { simuler } from "@/lib/aides/simulate";
import type { Categorie } from "@/lib/aides/types";

// Privacy: stateless, nothing is stored and nothing is logged (no console calls in this file).
export const dynamic = "force-dynamic";

const INSTRUCTIONS = `Simulateur des aides financières pour étudiants en France (${ANNEE_UNIVERSITAIRE}).
Collectez le profil en conversation (âge, niveau, revenu brut global des parents, frères et sœurs, distance, logement, loyer...) avant d'appeler simuler_aides.
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
      const { resultats, total } = simuler(profil);
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

  return server;
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

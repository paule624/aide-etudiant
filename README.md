# Simulateur d'aides étudiantes 2026-2027

Estime les aides auxquelles un étudiant a droit (bourse Crous, APL, mérite, mobilité, CSS…).

- `/` — simulations (stockées dans le navigateur uniquement), export JSON, rapport Markdown, lien de partage
- `/aides` — panel de toutes les aides recensées
- `/api/mcp` — serveur MCP (Streamable HTTP, sans état)

```bash
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm sync:aides   # refresh local aids from aides-jeunes
```

## Moteur

`src/lib/aides/` : `bareme.ts` (bourse sur critères sociaux), `catalogue.ts` (aides nationales), `locales.ts` (aides régionales / départementales / communales), `rapport.ts`, `share.ts`.

## Aides locales

`src/data/aides-locales.json` est généré par `scripts/sync-aides-locales.ts` à partir de [betagouv/aides-jeunes](https://github.com/betagouv/aides-jeunes) (AGPL-3.0) : aides des régions, départements et villes, filtrées sur les profils étudiant / lycéen / apprenti. Une GitHub Action ouvre chaque lundi une PR de mise à jour.

Le filtrage se fait par département (table INSEE embarquée dans `src/lib/geo.ts`, aucun appel réseau).

## MCP

Outils : `simuler_aides`, `exporter_rapport`, `lister_aides`, `lister_aides_locales`.

- Claude Code : `claude mcp add --transport http aides-etudiantes https://aide-etudiantes.vercel.app/api/mcp`
- claude.ai : Paramètres → Connecteurs → Ajouter un connecteur personnalisé → `https://aide-etudiantes.vercel.app/api/mcp`

### Confidentialité

- Le serveur MCP est sans état : aucune base, aucune session, aucun `console.log`, réponses `Cache-Control: no-store`.
- Le lien de simulation transporte le profil dans le fragment d'URL (`#p=…`), jamais envoyé au serveur.
- Sur Vercel, les logs de requêtes contiennent méthode/chemin/statut mais pas les corps de requête.
- Les informations saisies dans une conversation restent visibles par le client IA utilisé.

## Licence

AGPL-3.0 — inclut des données issues de [aides-jeunes](https://github.com/betagouv/aides-jeunes) (beta.gouv.fr, AGPL-3.0).

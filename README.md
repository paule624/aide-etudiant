# Simulateur d'aides étudiantes 2026-2027

Estime les aides auxquelles un étudiant a droit (bourse Crous, APL, mérite, mobilité, CSS…).

- `/` — simulations (stockées dans le navigateur uniquement), export JSON, rapport Markdown, lien de partage
- `/aides` — panel de toutes les aides recensées
- `/api/mcp` — serveur MCP (Streamable HTTP, sans état)

```bash
pnpm dev        # http://localhost:3000
pnpm typecheck
```

## Moteur

`src/lib/aides/` : `bareme.ts` (bourse sur critères sociaux), `catalogue.ts` (règles par aide), `rapport.ts`, `share.ts`.

## MCP

Outils : `simuler_aides`, `exporter_rapport`, `lister_aides`.

- Claude Code : `claude mcp add --transport http aides-etudiantes https://<domaine>/api/mcp`
- claude.ai : Paramètres → Connecteurs → Ajouter un connecteur personnalisé → `https://<domaine>/api/mcp`

### Confidentialité

- Le serveur MCP est sans état : aucune base, aucune session, aucun `console.log`, réponses `Cache-Control: no-store`.
- Le lien de simulation transporte le profil dans le fragment d'URL (`#p=…`), jamais envoyé au serveur.
- Sur Vercel, les logs de requêtes contiennent méthode/chemin/statut mais pas les corps de requête.
- Les informations saisies dans une conversation restent visibles par le client IA utilisé.

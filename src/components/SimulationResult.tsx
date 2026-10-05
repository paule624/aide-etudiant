"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/aides/catalogue";
import { euros, simuler } from "@/lib/aides/simulate";
import type { Profil, ResultatAide, Statut } from "@/lib/aides/types";

const LIBELLE_STATUT: Record<Statut, string> = {
  eligible: "Éligible",
  possible: "À vérifier",
  non_eligible: "Non éligible",
};

export const BADGE_STATUT: Record<Statut, string> = {
  eligible: "bg-ok/15 text-ok",
  possible: "bg-warn/15 text-warn",
  non_eligible: "bg-muted/15 text-muted",
};

export function SimulationResult({ profil }: { profil: Profil }) {
  const { resultats, total, nbEligibles, nbPossibles } = simuler(profil);
  const [voirNonEligibles, setVoirNonEligibles] = useState(false);
  const visibles = resultats.filter((r) => voirNonEligibles || r.evaluation.statut !== "non_eligible");
  const nbNon = resultats.length - nbEligibles - nbPossibles;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-accent p-5 text-white">
        <p className="text-sm opacity-80">Aides estimées sur l&apos;année</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{euros(total)}</p>
        <p className="mt-1 text-sm opacity-80">
          soit ≈ {euros(total / 12)} / mois · {nbEligibles} aide(s) éligible(s), {nbPossibles} à vérifier
        </p>
      </div>

      <ul className="space-y-2">
        {visibles.map((r) => (
          <CarteResultat key={r.id} r={r} />
        ))}
      </ul>

      {nbNon > 0 && (
        <button onClick={() => setVoirNonEligibles((v) => !v)} className="text-sm text-accent hover:underline">
          {voirNonEligibles ? "Masquer" : "Afficher"} les {nbNon} aides non éligibles
        </button>
      )}

      <p className="text-xs text-muted">
        Estimations indicatives basées sur les barèmes 2026-2027. Seuls les organismes (Crous, CAF…) déterminent vos droits réels.
        Les prêts, garanties et aides non chiffrables ne sont pas comptés dans le total.
      </p>
    </div>
  );
}

function CarteResultat({ r }: { r: ResultatAide }) {
  const [ouvert, setOuvert] = useState(false);
  const { statut, montantAnnuel, detail, raisons } = r.evaluation;

  return (
    <li className={`rounded-xl border border-line bg-surface ${statut === "non_eligible" ? "opacity-70" : ""}`}>
      <button onClick={() => setOuvert((o) => !o)} className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{r.nom}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_STATUT[statut]}`}>{LIBELLE_STATUT[statut]}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {r.organisme} · {CATEGORIES[r.categorie]}
            {detail && ` · ${detail}`}
          </p>
        </div>
        {montantAnnuel !== undefined && statut === "eligible" && (
          <span className={`shrink-0 font-semibold tabular-nums ${r.compteDansTotal ? "text-ink" : "text-muted"}`}>{euros(montantAnnuel)}</span>
        )}
      </button>
      {ouvert && (
        <div className="space-y-2 border-t border-line px-4 py-3 text-sm">
          <p className="text-ink">{r.resume}</p>
          {raisons.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {raisons.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
          <p className="text-muted">
            <span className="font-medium text-ink">Montant :</span> {r.montant}
          </p>
          <a href={r.lien} target="_blank" rel="noreferrer" className="inline-block text-accent hover:underline">
            Faire la demande →
          </a>
        </div>
      )}
    </li>
  );
}

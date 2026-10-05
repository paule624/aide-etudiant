"use client";

import { useState } from "react";
import { montantLocal } from "@/lib/aides/locales";
import type { AideLocale, ResultatAideLocale } from "@/lib/aides/types";
import { BADGE_STATUT } from "./SimulationResult";

const NIVEAU: Record<AideLocale["niveau"], string> = {
  national: "National",
  region: "Région",
  departement: "Département",
  local: "Ville / agglo",
};

export function AideLocaleCard({ aide }: { aide: AideLocale | ResultatAideLocale }) {
  const [ouvert, setOuvert] = useState(false);
  const statut = "statut" in aide ? aide.statut : undefined;

  return (
    <li className="rounded-xl border border-line bg-surface">
      <button onClick={() => setOuvert((o) => !o)} className="flex w-full items-start gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink first-letter:uppercase">{aide.nom}</span>
            {statut && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_STATUT[statut]}`}>
                {statut === "eligible" ? "Éligible" : "À vérifier"}
              </span>
            )}
            {aide.profils.includes("apprenti") && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">Alternance</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {aide.organisme} · {NIVEAU[aide.niveau]}
          </p>
        </div>
        <span className="max-w-[40%] shrink-0 text-right text-sm font-semibold text-ink">{montantLocal(aide)}</span>
      </button>
      {ouvert && (
        <div className="space-y-2 border-t border-line px-4 py-3 text-sm">
          {aide.description && <p className="text-ink">{aide.description}</p>}
          {"raisons" in aide && aide.raisons.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {aide.raisons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {aide.conditions.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-muted">
              {aide.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <a href={aide.lien} target="_blank" rel="noreferrer" className="inline-block text-accent hover:underline">
            Voir l&apos;aide →
          </a>
        </div>
      )}
    </li>
  );
}

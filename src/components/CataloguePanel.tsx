"use client";

import { useState } from "react";
import { ECHELONS, MONTANTS_ECHELON } from "@/lib/aides/bareme";
import { AIDES, CATEGORIES } from "@/lib/aides/catalogue";
import { euros } from "@/lib/aides/simulate";
import type { Categorie } from "@/lib/aides/types";

export function CataloguePanel() {
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState<Categorie | "toutes">("toutes");

  const q = recherche.trim().toLowerCase();
  const aides = AIDES.filter(
    (a) =>
      (categorie === "toutes" || a.categorie === categorie) &&
      (!q || [a.nom, a.organisme, a.resume, ...a.conditions].join(" ").toLowerCase().includes(q)),
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une aide (logement, alternance, Erasmus…)"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1">
          {(["toutes", ...Object.keys(CATEGORIES)] as (Categorie | "toutes")[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategorie(c)}
              className={`rounded-full px-3 py-1 text-xs ${categorie === c ? "bg-accent text-white" : "border border-line text-muted hover:text-ink"}`}
            >
              {c === "toutes" ? "Toutes" : CATEGORIES[c]}
            </button>
          ))}
        </div>
      </div>

      {(categorie === "toutes" || categorie === "bourse") && !q && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Bourse sur critères sociaux — montants 2026-2027</p>
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 font-medium">Échelon</th>
                {ECHELONS.map((e) => (
                  <th key={e} className="py-1 text-right font-medium">{e}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink">
              <tr className="border-t border-line">
                <td className="py-1.5 text-muted">Annuel</td>
                {ECHELONS.map((e) => (
                  <td key={e} className="py-1.5 text-right">{euros(MONTANTS_ECHELON[e])}</td>
                ))}
              </tr>
              <tr className="border-t border-line">
                <td className="py-1.5 text-muted">Mensuel (×10)</td>
                {ECHELONS.map((e) => (
                  <td key={e} className="py-1.5 text-right">{euros(MONTANTS_ECHELON[e] / 10)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted">{aides.length} aide(s)</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {aides.map((a) => (
          <article key={a.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-ink">{a.nom}</h2>
              <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{CATEGORIES[a.categorie]}</span>
            </div>
            <p className="text-xs text-muted">{a.organisme}</p>
            <p className="mt-2 text-sm text-ink">{a.resume}</p>
            <p className="mt-3 text-sm font-semibold text-accent">{a.montant}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
              {a.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            {a.cumul && <p className="mt-2 text-xs text-muted italic">{a.cumul}</p>}
            <a href={a.lien} target="_blank" rel="noreferrer" className="mt-auto pt-3 text-sm text-accent hover:underline">
              Faire la demande →
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

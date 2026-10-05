"use client";

import { useEffect, useState } from "react";
import type { Profil, ResultatOpenFisca } from "./aides/types";

const DEBOUNCE_MS = 400;

/** Exact amounts for a profile via /api/calcul; null while loading or when the service is unavailable. */
export function useOpenFisca(profil: Profil) {
  const cle = JSON.stringify(profil);
  const [etat, setEtat] = useState<{ cle: string; resultat: ResultatOpenFisca | null } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/calcul", { method: "POST", body: cle, signal: ctrl.signal });
        const data = (await res.json()) as { openfisca: ResultatOpenFisca | null };
        setEtat({ cle, resultat: data.openfisca });
      } catch {
        if (!ctrl.signal.aborted) setEtat({ cle, resultat: null });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [cle]);

  const aJour = etat?.cle === cle;
  return { openfisca: aJour ? etat.resultat : null, chargement: !aJour };
}

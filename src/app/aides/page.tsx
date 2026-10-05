import type { Metadata } from "next";
import { CataloguePanel } from "@/components/CataloguePanel";

export const metadata: Metadata = {
  title: "Panel des aides étudiantes 2026-2027",
};

export default function AidesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-ink">Panel des aides étudiantes</h1>
      <p className="mt-1 text-sm text-muted">
        Toutes les aides nationales recensées pour l&apos;année 2026-2027 : montants, conditions et lien pour faire la demande.
      </p>
      <CataloguePanel />
    </div>
  );
}

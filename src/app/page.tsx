"use client";

import { useEffect, useRef, useState } from "react";
import { SimulationForm } from "@/components/SimulationForm";
import { SimulationResult } from "@/components/SimulationResult";
import { genererRapport } from "@/lib/aides/rapport";
import { lienSimulation, lireFragment } from "@/lib/aides/share";
import { euros, nouvelleSimulation, simuler } from "@/lib/aides/simulate";
import type { Simulation } from "@/lib/aides/types";
import { useSimulations } from "@/lib/storage";

type Vue = "saisie" | "resultat";

export default function SimulationsPage() {
  const { simulations, save, remove, replaceAll } = useSimulations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vue, setVue] = useState<Vue>("saisie");
  const fileRef = useRef<HTMLInputElement>(null);
  const [copie, setCopie] = useState(false);

  // Import a simulation shared through the URL fragment (#p=...), then clean the URL
  useEffect(() => {
    const partage = lireFragment(window.location.hash);
    if (!partage) return;
    const sim = nouvelleSimulation(partage.nom ?? "Simulation partagée", partage.profil);
    save(sim);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot import on mount
    setSelectedId(sim.id);
    history.replaceState(null, "", window.location.pathname);
  }, [save]);

  const selected = simulations.find((s) => s.id === selectedId) ?? simulations[0];

  const creer = (base?: Simulation) => {
    const sim = base
      ? nouvelleSimulation(`${base.nom} (copie)`, base.profil)
      : nouvelleSimulation(`Simulation ${simulations.length + 1}`);
    save(sim);
    setSelectedId(sim.id);
    setVue("saisie");
  };

  const telecharger = (contenu: string, nomFichier: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenu], { type }));
    a.download = nomFichier;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exporter = () =>
    telecharger(JSON.stringify(simulations, null, 2), "simulations-aides-etudiantes.json", "application/json");

  const exporterRapport = (sim: Simulation) => {
    const lien = lienSimulation(window.location.origin, sim.profil, sim.nom);
    telecharger(genererRapport(sim.profil, { nom: sim.nom, lien }), `${sim.nom}.md`, "text/markdown");
  };

  const copierLien = async (sim: Simulation) => {
    await navigator.clipboard.writeText(lienSimulation(window.location.origin, sim.profil, sim.nom));
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  };

  const importer = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Simulation[];
      if (Array.isArray(data)) replaceAll(data.filter((s) => s.id && s.profil));
    } catch {
      console.error("Import failed: invalid JSON file");
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3">
        <button onClick={() => creer()} className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90">
          + Nouvelle simulation
        </button>
        <ul className="space-y-1">
          {simulations.map((s) => {
            const actif = s.id === selected?.id;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${actif ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/50"}`}
                >
                  <span className="block truncate text-sm font-medium text-ink">{s.nom}</span>
                  <span className="text-xs text-muted tabular-nums">{euros(simuler(s.profil).total)} / an</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2 text-xs">
          <button onClick={exporter} disabled={!simulations.length} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-muted hover:text-ink disabled:opacity-40">
            Exporter
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-muted hover:text-ink">
            Importer
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])} />
        </div>
        <p className="text-xs text-muted">🔒 Données stockées uniquement dans votre navigateur, rien n&apos;est envoyé sur Internet.</p>
      </aside>

      <main className="min-w-0">
        {!selected ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <p className="text-lg font-medium text-ink">Découvrez les aides auxquelles vous avez droit</p>
            <p className="mt-1 text-sm text-muted">Bourse Crous, APL, aides à la mobilité, mérite… Créez une simulation pour commencer.</p>
            <button onClick={() => creer()} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
              Créer ma première simulation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={selected.nom}
                onChange={(e) => save({ ...selected, nom: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold text-ink hover:border-line focus:border-accent focus:outline-none"
                aria-label="Nom de la simulation"
              />
              <button onClick={() => copierLien(selected)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
                {copie ? "Lien copié ✓" : "Copier le lien"}
              </button>
              <button onClick={() => exporterRapport(selected)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
                Rapport
              </button>
              <button onClick={() => creer(selected)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
                Dupliquer
              </button>
              <button
                onClick={() => {
                  remove(selected.id);
                  setSelectedId(null);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-danger hover:text-danger"
              >
                Supprimer
              </button>
            </div>

            {/* Mobile: tabs. Desktop: side by side */}
            <div className="flex gap-1 rounded-lg bg-surface p-1 lg:hidden">
              {(["saisie", "resultat"] as const).map((v) => (
                <button key={v} onClick={() => setVue(v)} className={`flex-1 rounded-md py-1.5 text-sm ${vue === v ? "bg-accent text-white" : "text-muted"}`}>
                  {v === "saisie" ? "Saisie" : "Résultat"}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className={vue === "saisie" ? "" : "hidden lg:block"}>
                <SimulationForm profil={selected.profil} onChange={(profil) => save({ ...selected, profil })} />
              </div>
              <div className={`${vue === "resultat" ? "" : "hidden lg:block"} lg:sticky lg:top-6 lg:self-start`}>
                <SimulationResult profil={selected.profil} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

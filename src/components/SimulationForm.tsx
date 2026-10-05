"use client";

import type { ReactNode } from "react";
import type { Profil } from "@/lib/aides/types";
import { DEPARTEMENTS } from "@/lib/geo";

type Props = {
  profil: Profil;
  onChange: (p: Profil) => void;
};

export function SimulationForm({ profil, onChange }: Props) {
  const set = <K extends keyof Profil>(k: K, v: Profil[K]) => onChange({ ...profil, [k]: v });

  return (
    <div className="space-y-6">
      <Section titre="Territoire" aide="Pour trouver les aides de votre région, département et ville (transport, permis, équipement…).">
        <DepartementField label="Département du lieu d'études" value={profil.departementEtudes} onChange={(v) => set("departementEtudes", v)} />
        <DepartementField label="Département du domicile familial" value={profil.departementFamille} onChange={(v) => set("departementFamille", v)} />
      </Section>

      <Section titre="Études">
        <NumberField label="Âge au 1er septembre" value={profil.age} onChange={(v) => set("age", v)} suffix="ans" />
        <SelectField
          label="Niveau à la rentrée"
          value={profil.niveau}
          onChange={(v) => set("niveau", v)}
          options={[
            ["terminale", "Terminale (entrée dans le sup)"],
            ["L1", "Licence 1 / BUT 1"],
            ["L2", "Licence 2 / BUT 2"],
            ["L3", "Licence 3 / BUT 3"],
            ["BTS", "BTS / CPGE / école"],
            ["M1", "Master 1"],
            ["M2", "Master 2"],
            ["doctorat", "Doctorat"],
          ]}
        />
        <SelectField
          label="Nationalité"
          value={profil.nationalite}
          onChange={(v) => set("nationalite", v)}
          options={[
            ["fr_ue", "Française / UE / EEE"],
            ["hors_ue_resident", "Hors UE, résident en France depuis 2 ans+"],
            ["hors_ue", "Hors UE, arrivé récemment"],
          ]}
        />
        <Toggle label="Formation habilitée aux bourses" checked={profil.etablissementHabilite} onChange={(v) => set("etablissementHabilite", v)} />
        <Toggle label="Néo-bachelier (bac obtenu cette année)" checked={profil.neoBachelier} onChange={(v) => set("neoBachelier", v)} />
        <Toggle label="Mention Très Bien au bac" checked={profil.mentionTB} onChange={(v) => set("mentionTB", v)} />
        <Toggle label="En alternance (apprentissage)" checked={profil.alternance} onChange={(v) => set("alternance", v)} />
        {profil.alternance && (
          <NumberField label="Salaire d'alternance" value={profil.salaireAlternanceBrut} onChange={(v) => set("salaireAlternanceBrut", v)} suffix="€ brut / mois" />
        )}
      </Section>

      <Section titre="Famille" aide="Le revenu brut global figure sur l'avis d'imposition 2025 (revenus 2024) de vos parents.">
        <NumberField label="Revenu brut global des parents" value={profil.revenuBrutGlobalParents} onChange={(v) => set("revenuBrutGlobalParents", v)} suffix="€ / an" step={500} />
        <NumberField label="Autres enfants à charge (hors vous)" value={profil.enfantsACharge} onChange={(v) => set("enfantsACharge", v)} />
        <NumberField label="… dont dans l'enseignement supérieur" value={profil.enfantsEtudiantsSup} onChange={(v) => set("enfantsEtudiantsSup", Math.min(v, profil.enfantsACharge))} />
        <NumberField label="Distance domicile familial → lieu d'études" value={profil.distanceKm} onChange={(v) => set("distanceKm", v)} suffix="km" step={10} />
        <Toggle label="Situation de handicap" checked={profil.handicap} onChange={(v) => set("handicap", v)} />
        <Toggle label="Étudiant aidant (proche dépendant)" checked={profil.aidant} onChange={(v) => set("aidant", v)} />
        <Toggle label="Rupture familiale / indépendant" checked={profil.independant} onChange={(v) => set("independant", v)} />
      </Section>

      <Section titre="Foyer" aide="Couple, mariage ou PACS : APL, RSA et CSS sont calculés pour tout le foyer.">
        <SelectField
          label="Situation"
          value={profil.situationFamiliale}
          onChange={(v) => set("situationFamiliale", v)}
          options={[
            ["seul", "Seul(e)"],
            ["couple", "En couple (union libre)"],
            ["marie_pacse", "Marié(e) / pacsé(e)"],
          ]}
        />
        {profil.situationFamiliale !== "seul" && (
          <>
            <NumberField label="Âge du conjoint" value={profil.conjointAge} onChange={(v) => set("conjointAge", v)} suffix="ans" />
            <SelectField
              label="Activité du conjoint"
              value={profil.conjointActivite}
              onChange={(v) => set("conjointActivite", v)}
              options={[
                ["actif", "En emploi"],
                ["etudiant", "Étudiant(e)"],
                ["chomeur", "Demandeur d'emploi"],
                ["inactif", "Sans emploi ni études"],
              ]}
            />
            {profil.conjointActivite === "actif" && (
              <NumberField label="Revenus du conjoint" value={profil.conjointRevenusNetMensuel} onChange={(v) => set("conjointRevenusNetMensuel", v)} suffix="€ net / mois" step={50} />
            )}
          </>
        )}
      </Section>

      <Section titre="Logement">
        <SelectField
          label="Type de logement"
          value={profil.logement}
          onChange={(v) => set("logement", v)}
          options={[
            ["parents", "Chez mes parents"],
            ["crous", "Résidence Crous"],
            ["location", "Location seul(e)"],
            ["colocation", "Colocation"],
          ]}
        />
        {profil.logement !== "parents" && (
          <>
            <NumberField label="Loyer hors charges" value={profil.loyer} onChange={(v) => set("loyer", v)} suffix="€ / mois" step={10} />
            <SelectField
              label="Zone APL"
              value={profil.zone}
              onChange={(v) => set("zone", v)}
              options={[
                ["idf", "Paris et petite couronne (zone 1)"],
                ["grande_ville", "Grande agglo > 100 000 hab. ou reste de l'IDF (zone 2)"],
                ["autre", "Autre commune (zone 3)"],
              ]}
            />
          </>
        )}
      </Section>

      <Section titre="Ressources personnelles">
        <NumberField label="Revenus d'un job étudiant" value={profil.revenusActiviteNetMensuel} onChange={(v) => set("revenusActiviteNetMensuel", v)} suffix="€ net / mois" step={50} />
        <NumberField label="Ressources annuelles totales (CSS)" value={profil.ressourcesAnnuelles} onChange={(v) => set("ressourcesAnnuelles", v)} suffix="€ / an" step={500} />
      </Section>

      <Section titre="Mobilité">
        <Toggle label="Je change d'académie / région académique" checked={profil.changeAcademie} onChange={(v) => set("changeAcademie", v)} />
        <NumberField label="Mobilité internationale prévue" value={profil.moisMobiliteInternationale} onChange={(v) => set("moisMobiliteInternationale", v)} suffix="mois" />
        <Toggle label="Je viens d'outre-mer" checked={profil.outreMer} onChange={(v) => set("outreMer", v)} />
      </Section>
    </div>
  );
}

function Section({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{titre}</legend>
      {aide && <p className="mb-3 text-xs text-muted">{aide}</p>}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

function NumberField({ label, value, onChange, suffix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={inputClass}
        />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function DepartementField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">— Non renseigné —</option>
        {DEPARTEMENTS.map((d) => (
          <option key={d.code} value={d.code}>
            {d.code} · {d.nom}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
    </label>
  );
}

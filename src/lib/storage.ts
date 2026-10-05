"use client";

import { useCallback, useSyncExternalStore } from "react";
import { PROFIL_DEFAUT } from "./aides/simulate";
import type { Simulation } from "./aides/types";

const KEY = "aide-etudiant:simulations";
const listeners = new Set<() => void>();
const EMPTY: Simulation[] = [];

let cacheRaw: string | null = null;
let cache: Simulation[] = EMPTY;

function read(): Simulation[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Simulation[]) : EMPTY;
    // Backfill fields added after a simulation was saved
    cache = parsed.map((s) => ({ ...s, profil: { ...PROFIL_DEFAUT, ...s.profil } }));
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(sims: Simulation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sims));
  } catch {
    // Storage unavailable (private mode): keep in memory only
    cacheRaw = null;
    cache = sims;
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSimulations() {
  const simulations = useSyncExternalStore(subscribe, read, () => EMPTY);

  const save = useCallback((sim: Simulation) => {
    const current = read();
    const exists = current.some((s) => s.id === sim.id);
    const next = { ...sim, updatedAt: Date.now() };
    write(exists ? current.map((s) => (s.id === sim.id ? next : s)) : [...current, next]);
  }, []);

  const remove = useCallback((id: string) => write(read().filter((s) => s.id !== id)), []);
  const replaceAll = useCallback((sims: Simulation[]) => write(sims), []);

  return { simulations, save, remove, replaceAll };
}

import { profilSchema, completerProfil } from "./schema";
import { PROFIL_DEFAUT } from "./simulate";
import type { Profil } from "./types";

// The profile travels in the URL fragment (#p=...), which browsers never send to the server.
const PARAM = "p";

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encoderProfil(profil: Profil): string {
  // Only keep fields that differ from defaults to keep the link short
  const diff = Object.fromEntries(
    Object.entries(profil).filter(([k, v]) => PROFIL_DEFAUT[k as keyof Profil] !== v),
  );
  return toBase64Url(JSON.stringify(diff));
}

export function decoderProfil(encoded: string): Profil | null {
  try {
    const parsed = profilSchema.safeParse(JSON.parse(fromBase64Url(encoded)));
    return parsed.success ? completerProfil(parsed.data).profil : null;
  } catch {
    return null;
  }
}

export function lienSimulation(baseUrl: string, profil: Profil, nom?: string): string {
  const params = new URLSearchParams({ [PARAM]: encoderProfil(profil) });
  if (nom) params.set("n", nom);
  return `${baseUrl.replace(/\/$/, "")}/#${params.toString()}`;
}

export function lireFragment(hash: string): { profil: Profil; nom: string | null } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const p = params.get(PARAM);
  if (!p) return null;
  const profil = decoderProfil(p);
  return profil ? { profil, nom: params.get("n") } : null;
}

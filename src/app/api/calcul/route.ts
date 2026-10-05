import { completerProfil, profilSchema } from "@/lib/aides/schema";
import { calculerOpenFisca } from "@/lib/openfisca";

// Privacy: stateless proxy to OpenFisca, nothing stored or logged.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const parsed = profilSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "profil invalide" }, { status: 400, headers: NO_STORE });
  const resultat = await calculerOpenFisca(completerProfil(parsed.data).profil);
  return Response.json({ openfisca: resultat }, { headers: NO_STORE });
}

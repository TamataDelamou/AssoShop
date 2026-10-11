import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pinResponse } from "@/lib/pin";

// Vérification du PIN : fonction SQL pin_verify (migration 0025). Le compteur
// de tentatives et le verrouillage sont tenus en base, hors de portée du client.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    pin?: unknown;
  } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const { data, error } = await supabase.rpc("pin_verify", { p_pin: pin });
  if (error) {
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
  const { status, body: payload } = pinResponse(data);
  return Response.json(payload, { status });
}

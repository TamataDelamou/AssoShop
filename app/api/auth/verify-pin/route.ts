import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/pin";
import { AUTH_CONFIG } from "@/utils/constants";

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

  if (pin.length !== AUTH_CONFIG.PIN_LENGTH || !/^\d+$/.test(pin)) {
    return Response.json({ error: "INVALID_PIN" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("pin_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data?.pin_hash || !verifyPin(pin, data.pin_hash)) {
    return Response.json({ error: "INCORRECT_PIN" }, { status: 401 });
  }

  return Response.json({ ok: true });
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/pin";
import { AUTH_CONFIG } from "@/utils/constants";

const LOCK_MS = AUTH_CONFIG.PIN_LOCK_MINUTES * 60 * 1000;

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
    .select("pin_hash, pin_attempts, pin_locked_until")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  if (data?.pin_locked_until && new Date(data.pin_locked_until) > now) {
    return Response.json({ error: "PIN_LOCKED" }, { status: 429 });
  }

  if (!data?.pin_hash || !verifyPin(pin, data.pin_hash)) {
    const attempts = (data?.pin_attempts ?? 0) + 1;
    if (attempts >= AUTH_CONFIG.MAX_PIN_ATTEMPTS) {
      await supabase
        .from("user_profiles")
        .update({
          pin_attempts: 0,
          pin_locked_until: new Date(now.getTime() + LOCK_MS).toISOString(),
        })
        .eq("user_id", user.id);
      return Response.json({ error: "PIN_LOCKED" }, { status: 429 });
    }
    await supabase
      .from("user_profiles")
      .update({ pin_attempts: attempts })
      .eq("user_id", user.id);
    return Response.json({ error: "INCORRECT_PIN" }, { status: 401 });
  }

  await supabase
    .from("user_profiles")
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq("user_id", user.id);

  return Response.json({ ok: true });
}

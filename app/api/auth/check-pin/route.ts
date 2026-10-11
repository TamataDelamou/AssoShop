import { createSupabaseServerClient } from "@/lib/supabase/server";

// État du PIN : fonction SQL pin_status (migration 0025). L'empreinte du PIN
// n'est plus lisible par les clients.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("pin_status");
  if (error) {
    return Response.json({ error: "INTERNAL" }, { status: 500 });
  }
  return Response.json({ hasPin: Boolean((data as { has_pin?: boolean } | null)?.has_pin) });
}

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("pin_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ hasPin: Boolean(data?.pin_hash) });
}

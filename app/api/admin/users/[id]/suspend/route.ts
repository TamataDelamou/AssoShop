import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext, logAudit } from "@/lib/api/admin-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;
  const { id } = await params;

  try {
    const { data } = await supabase.auth.admin.getUserById(id);
    if (!data?.user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const banned = Boolean(data.user.banned_until);
    const { error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: banned ? "none" : "876600h",
    });
    if (error) throw error;

    await logAudit(ctx, `toggle_suspend_user:${id}`, "users");

    const { data: listData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    return NextResponse.json(
      (listData?.users ?? []).map((u) => ({
        id: u.id,
        name: (u.user_metadata?.full_name as string) ?? u.email ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        role: "Membre",
        status: u.banned_until ? "suspended" : "active",
        created_at: u.created_at,
      })),
    );
  } catch (err) {
    return apiError(err);
  }
}

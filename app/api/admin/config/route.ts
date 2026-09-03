import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/auth";
import { getAdminContext } from "@/lib/api/admin-auth";

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    platform_name?: string;
    support_email?: string;
    maintenance_mode?: boolean;
    cgu_version?: string;
    legal_text?: string;
  } | null;

  try {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload?.platform_name !== undefined) {
      updates.platform_name = payload.platform_name;
    }
    if (payload?.support_email !== undefined) {
      updates.support_email = payload.support_email;
    }
    if (payload?.maintenance_mode !== undefined) {
      updates.maintenance_mode = payload.maintenance_mode;
    }
    if (payload?.cgu_version !== undefined) {
      updates.cgu_version = payload.cgu_version;
    }
    if (payload?.legal_text !== undefined) {
      updates.legal_text = payload.legal_text;
    }

    await supabase.from("admin_config").update(updates).eq("id", 1);

    const { data: cfg } = await supabase
      .from("admin_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      platform_name: cfg?.platform_name ?? "AssoShop",
      support_email: cfg?.support_email ?? "",
      maintenance_mode: cfg?.maintenance_mode ?? false,
      cgu_version: cfg?.cgu_version ?? "",
      legal_text: cfg?.legal_text ?? "",
    });
  } catch (err) {
    return apiError(err);
  }
}

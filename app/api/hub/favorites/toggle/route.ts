import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;

  const payload = (await request.json().catch(() => null)) as {
    type?: string;
    label?: string;
    detail?: string;
  } | null;
  if (!payload?.type || !payload?.label) {
    return NextResponse.json({ error: "Type et libellé requis" }, { status: 400 });
  }

  // Bascule atomique en base (fonction SQL hub_toggle_favorite, migration
  // 0028) ; renvoie la liste à jour.
  const { data, error } = await ctx.supabase.rpc("hub_toggle_favorite", {
    p_type: payload.type,
    p_label: payload.label,
    p_detail: payload.detail ?? "",
  });
  if (error) return payRpcErrorResponse(error);

  return NextResponse.json(data ?? []);
}

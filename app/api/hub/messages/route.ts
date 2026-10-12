import { NextRequest, NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;

  const payload = (await request.json().catch(() => null)) as {
    conversation_id?: string;
    body?: string;
  } | null;
  if (!payload?.conversation_id || !payload?.body?.trim()) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  // Message et aperçu de la conversation écrits ensemble (fonction SQL
  // hub_send_message, migration 0028).
  const { data, error } = await ctx.supabase.rpc("hub_send_message", {
    p_conversation_id: payload.conversation_id,
    p_body: payload.body,
  });
  if (error) {
    if (error.code === "PY018") {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }
    return payRpcErrorResponse(error);
  }

  return NextResponse.json(rpcRow(data));
}

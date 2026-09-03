import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const payload = (await request.json().catch(() => null)) as {
    conversation_id?: string;
    body?: string;
  } | null;

  try {
    if (!payload?.conversation_id || !payload?.body?.trim()) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 });
    }

    const { data: conversation } = await supabase
      .from("hub_conversations")
      .select("id")
      .eq("id", payload.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const { data: message, error } = await supabase
      .from("hub_messages")
      .insert({ conversation_id: payload.conversation_id, sender: "me", body: payload.body })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from("hub_conversations")
      .update({ last_message: payload.body, updated_at: new Date().toISOString() })
      .eq("id", payload.conversation_id);

    return NextResponse.json(message);
  } catch (err) {
    return apiError(err);
  }
}

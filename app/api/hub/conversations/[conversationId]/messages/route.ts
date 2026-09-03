import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const { conversationId } = await params;

  try {
    const { data: conversation } = await supabase
      .from("hub_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from("hub_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");

    return NextResponse.json(messages ?? []);
  } catch (err) {
    return apiError(err);
  }
}

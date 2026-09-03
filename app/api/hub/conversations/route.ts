import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const { participant } = (await request.json().catch(() => ({}))) as {
    participant?: string;
  };

  try {
    if (!participant?.trim()) {
      return NextResponse.json({ error: "Participant requis" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hub_conversations")
      .insert({ user_id: user.id, participant })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}

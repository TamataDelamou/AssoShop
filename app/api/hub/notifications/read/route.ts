import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    await supabase
      .from("hub_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}

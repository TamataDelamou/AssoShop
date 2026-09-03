import { NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";

export async function POST() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  try {
    await supabase
      .from("hub_sync_queue")
      .update({ status: "synced" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    const { data: list } = await supabase
      .from("hub_sync_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json(list ?? []);
  } catch (err) {
    return apiError(err);
  }
}

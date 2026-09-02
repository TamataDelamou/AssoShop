import { NextResponse } from "next/server";

// Pose un cookie de session démo puis redirige vers le tableau de bord.
// Permet de parcourir les écrans sans backend Supabase réel.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/dashboard", url.origin));
  response.cookies.set("demo_session", "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 heures
  });
  return response;
}

import { NextResponse } from "next/server";

// Supprime le cookie de session démo puis redirige vers la connexion.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/auth/login", url.origin));
  response.cookies.set("demo_session", "", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 0,
  });
  return response;
}

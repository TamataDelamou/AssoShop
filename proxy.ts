import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ENV_CONFIG } from "@/lib/env.config";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    ENV_CONFIG.SUPABASE_URL,
    ENV_CONFIG.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Rafraîchit la session si le token est proche de l'expiration.
  await supabase.auth.getClaims();

  return response;
}

// Les appels inter-services du Control Plane GSG (sans cookie de session),
// le webhook de confirmation des recharges et les tâches planifiées ne
// passent pas par le rafraîchissement de session Supabase.
export const config = {
  matcher: [
    "/((?!api/control-plane|api/cron|api/pay/topup/confirm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

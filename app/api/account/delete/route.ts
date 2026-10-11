import { NextResponse } from "next/server";
import { getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse } from "@/lib/api/pay-rpc";
import { parseAccountClosure } from "@/lib/account-closure";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/account/delete — l'utilisateur ferme son propre compte.
//
// La fonction SQL account_close (migration 0024) décide :
// - aucun engagement financier : le compte est supprimé ;
// - solde non nul, contribution en séquestre, commande non livrée ou part
//   dans un projet : le compte est anonymisé (nom, e-mail et téléphone
//   effacés, connexion bloquée) et son identifiant conservé pour la
//   comptabilité.
// Un trigger sur auth.users refuse de toute façon la suppression d'un compte
// engagé : en cas de course, la suppression échoue et le compte est anonymisé.
export async function POST() {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;
  const admin = createSupabaseAdminClient();

  const close = async () => {
    const { data, error } = await admin.rpc("account_close", { p_user_id: user.id });
    return { closure: error ? null : parseAccountClosure(data), error };
  };

  let { closure, error } = await close();
  if (error || !closure) return payRpcErrorResponse(error);

  if (closure.action === "delete") {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      // Un engagement est apparu entre-temps : le trigger a refusé la suppression.
      ({ closure, error } = await close());
      if (error || !closure || closure.action !== "anonymized") {
        console.error(`[compte] suppression impossible : ${deleteError.message}`);
        return NextResponse.json(
          { error: "Suppression du compte impossible pour le moment" },
          { status: 409 },
        );
      }
    }
  }

  // La session locale est fermée dans tous les cas.
  await supabase.auth.signOut().catch(() => {});

  return NextResponse.json(
    {
      action: closure.action === "delete" ? "deleted" : "anonymized",
      reasons: closure.reasons,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

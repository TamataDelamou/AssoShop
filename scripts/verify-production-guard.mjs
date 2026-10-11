// Vérifie le garde-fou « argent réel » sur un serveur lancé EN MODE PRODUCTION
// (next build puis next start) : tant que PAY_REAL_MONEY est désactivé, le
// webhook de recharge et le retrait répondent 503 et le bandeau « Paiements en
// mode test » est affiché. Avec --expect=real, vérifie l'inverse.
//
//   PAY_WEBHOOK_SECRET=... node --env-file=.env.local scripts/verify-production-guard.mjs [--expect=test|real]
//
// Crée un compte temporaire sans solde et le supprime à la fin. Aucun
// mouvement de fonds : les montants demandés dépassent toujours le solde.
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(SUPABASE_URL).hostname.split(".")[0];
const WEBHOOK_SECRET = process.env.PAY_WEBHOOK_SECRET;
const EXPECT = process.argv.includes("--expect=real") ? "real" : "test";
const PASSWORD = `Guard!${crypto.randomUUID()}`;

const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function check(name, ok, detail = "") {
  results.push(Boolean(ok));
  console.log(`  ${ok ? "[OK]   " : "[ÉCHEC]"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

function sessionCookie(session) {
  const value = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const key = `sb-${REF}-auth-token`;
  const size = 3000;
  if (value.length <= size) return `${key}=${value}`;
  const chunks = [];
  for (let i = 0; i * size < value.length; i++) {
    chunks.push(`${key}.${i}=${value.slice(i * size, (i + 1) * size)}`);
  }
  return chunks.join("; ");
}

async function call(path, { method = "GET", cookie, body, headers = {} } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { "Content-Type": "application/json", Connection: "close", ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // réponse non JSON (page HTML)
  }
  return { status: res.status, json, text };
}

async function main() {
  if (!WEBHOOK_SECRET) throw new Error("PAY_WEBHOOK_SECRET requis (identique à celui du serveur).");
  console.log(`Garde-fou argent réel — attendu : ${EXPECT === "test" ? "mode test (PAY_REAL_MONEY désactivé)" : "argent réel (PAY_REAL_MONEY=1)"}\n`);

  const email = `guard-${Date.now()}@assoshop.invalid`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw new Error(`création du compte : ${error.message}`);
  const userId = created.user.id;

  try {
    const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signError } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    if (signError) throw new Error(`connexion : ${signError.message}`);
    const cookie = sessionCookie(signIn.session);
    const bearer = { Authorization: `Bearer ${WEBHOOK_SECRET}` };

    let r = await call("/api/pay/topup/confirm", { method: "POST", headers: { Authorization: "Bearer mauvais-secret" }, body: { reference: "PAY-0000-INCONNUE" } });
    check("webhook : mauvais secret toujours refusé (401)", r.status === 401, `statut ${r.status}`);

    const webhook = await call("/api/pay/topup/confirm", { method: "POST", headers: bearer, body: { reference: "PAY-0000-INCONNUE" } });
    const withdraw = await call("/api/pay/withdraw", { method: "POST", cookie, body: { amount: 1000000, provider: "Orange Money" } });
    const page = await call("/dashboard", { cookie });
    const banner = page.text.includes("Paiements en mode test");

    if (EXPECT === "test") {
      check("webhook de recharge refusé (503, pay_test_mode)", webhook.status === 503 && webhook.json?.code === "pay_test_mode", `statut ${webhook.status} ${JSON.stringify(webhook.json)}`);
      check("retrait refusé (503, pay_test_mode)", withdraw.status === 503 && withdraw.json?.code === "pay_test_mode", `statut ${withdraw.status} ${JSON.stringify(withdraw.json)}`);
      check("message clair renvoyé", String(withdraw.json?.error ?? "").includes("Paiements en mode test"), JSON.stringify(withdraw.json));
      check("bandeau « Paiements en mode test » affiché", page.status === 200 && banner, `statut ${page.status}`);
    } else {
      check("webhook de recharge ouvert (référence inconnue : 404)", webhook.status === 404, `statut ${webhook.status} ${JSON.stringify(webhook.json)}`);
      check("retrait ouvert (solde insuffisant : 400)", withdraw.status === 400, `statut ${withdraw.status} ${JSON.stringify(withdraw.json)}`);
      check("bandeau « Paiements en mode test » absent", page.status === 200 && !banner, `statut ${page.status}`);
    }
  } finally {
    await admin.from("pay_wallets").delete().eq("user_id", userId);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    console.log(`\n  compte temporaire : ${deleteError ? `ÉCHEC ${deleteError.message}` : "supprimé"}`);
  }

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} vérifications vertes`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`ÉCHEC : ${err.message}`);
  process.exitCode = 1;
});

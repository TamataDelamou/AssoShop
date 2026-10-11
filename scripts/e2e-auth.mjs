import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Prérequis : serveur lancé avec NEXT_PUBLIC_USE_REAL_API=1 et le même
// PAY_WEBHOOK_SECRET que ce script (confirmation de la recharge).
//   PAY_WEBHOOK_SECRET=... E2E_BASE_URL=http://localhost:3000 node scripts/e2e-auth.mjs
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const EMAIL = "e2e.test@assoshop.local";
// Mot de passe aléatoire à chaque exécution : ce compte devient administrateur
// de la plateforme pendant le test, il ne doit jamais avoir de secret connu.
const PASSWORD = `E2e!${crypto.randomUUID()}`;
const WEBHOOK_SECRET = process.env.PAY_WEBHOOK_SECRET;
const PIN = "1234";

function loadEnv() {
  const path = fileURLToPath(new URL("../.env.local", import.meta.url));
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const REF = new URL(SUPABASE_URL).hostname.split(".")[0];

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(SUPABASE_URL, ANON);

const b64url = (s) => Buffer.from(s, "utf8").toString("base64url");

function buildCookies(session) {
  const value = "base64-" + b64url(JSON.stringify(session));
  const key = `sb-${REF}-auth-token`;
  const enc = encodeURIComponent(value);
  if (enc.length <= 3180) return [{ name: key, value }];
  const chunks = [];
  let rest = enc;
  let i = 0;
  while (rest.length > 0) {
    let head = rest.slice(0, 3180);
    const lastPct = head.lastIndexOf("%");
    if (lastPct > 3180 - 3) head = head.slice(0, lastPct);
    let decoded = "";
    while (head.length > 0) {
      try {
        decoded = decodeURIComponent(head);
        break;
      } catch {
        if (head.endsWith("%") && head.length > 3) head = head.slice(0, -3);
        else throw new Error("échec découpage cookie");
      }
    }
    chunks.push({ name: `${key}.${i++}`, value: decoded });
    rest = rest.slice(head.length);
  }
  return chunks;
}

async function req(path, { method = "GET", cookie = "", body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* réponse non JSON */
  }
  return { status: res.status, json };
}

async function webhook(body) {
  const res = await fetch(BASE_URL + "/api/pay/topup/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* réponse non JSON */
  }
  return { status: res.status, json };
}

async function main() {
  if (!WEBHOOK_SECRET) {
    throw new Error("PAY_WEBHOOK_SECRET requis (identique à celui du serveur).");
  }
  console.log("1. Préparation utilisateur de test (service_role)");
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  console.log("   créé:", created.user.id);

  console.log("2. Connexion signInWithPassword");
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signErr) throw signErr;
  const userId = signIn.session.user.id;
  console.log("   session OK:", userId);

  const cookies = buildCookies(signIn.session);
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  console.log("   cookie:", cookies.map((c) => c.name).join(","));

  console.log("3. Attente du serveur");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASE_URL + "/api/market/catalog");
      if (r.status === 200 || r.status === 401) {
        ready = true;
        break;
      }
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("serveur non démarré sur " + BASE_URL);
  console.log("   serveur prêt");

  const results = [];
  let r;

  r = await req("/api/market/catalog", { cookie });
  results.push(["GET /api/market/catalog (auth)", r.status === 200 && Array.isArray(r.json?.products), r.status]);

  r = await req("/api/pay/bundle", { cookie });
  results.push(["GET /api/pay/bundle (auth)", r.status === 200 && Array.isArray(r.json?.wallets), r.status]);

  r = await req("/api/market/wallet", { cookie });
  results.push(["GET /api/market/wallet (auto-création)", r.status === 200 && r.json?.balance === 0, r.status]);

  r = await req("/api/pay/topup", {
    method: "POST",
    cookie,
    body: { amount: 10000, provider: "Orange Money" },
  });
  // Depuis la migration 0019 : la recharge est créée « pending », sans crédit.
  const topupReference = r.json?.reference;
  results.push(["POST /api/pay/topup (en attente)", r.status === 200 && r.json?.status === "pending", r.status]);

  r = await req("/api/market/wallet", { cookie });
  results.push(["GET /api/market/wallet (aucun crédit avant confirmation)", r.status === 200 && r.json?.balance === 0, r.status]);

  r = await req("/api/pay/topup/confirm", {
    method: "POST",
    cookie,
    body: { reference: topupReference },
  });
  results.push(["POST /api/pay/topup/confirm (session seule refusée)", r.status === 401, r.status]);

  // Confirmation par le webhook de l'opérateur (secret serveur).
  r = await webhook({ reference: topupReference });
  results.push(["POST /api/pay/topup/confirm (webhook)", r.status === 200 && r.json?.status === "confirmed", r.status]);

  r = await webhook({ reference: topupReference });
  results.push(["POST /api/pay/topup/confirm (rejeu sans double crédit)", r.status === 200 && r.json?.status === "confirmed", r.status]);

  r = await req("/api/market/wallet", { cookie });
  results.push(["GET /api/market/wallet (solde unifié)", r.status === 200 && r.json?.balance === 9950, r.status]);

  r = await req("/api/pay/bundle", { cookie });
  const personalWallet = (r.json?.wallets ?? []).find((w) => w.type === "personal");
  results.push(["GET /api/pay/bundle (portefeuille unifié)", r.status === 200 && personalWallet?.balance === 9950, r.status]);

  r = await req("/api/hub/bundle", { cookie });
  results.push(["GET /api/hub/bundle (auth)", r.status === 200 && !!r.json?.profile, r.status]);

  r = await req("/api/hub/referrals", {
    method: "POST",
    cookie,
    body: { referred_name: "Fatoumata Camara" },
  });
  const referralId = r.json?.id;
  results.push([
    "POST /api/hub/referrals (producteur)",
    r.status === 201 && !!referralId && r.json?.status === "pending",
    r.status,
  ]);

  r = await req(`/api/hub/referrals/${referralId}/convert`, {
    method: "POST",
    cookie,
  });
  results.push([
    "POST /api/hub/referrals/convert (activation)",
    r.status === 200 && r.json?.status === "active" && r.json?.reward === 2000,
    r.status,
  ]);

  r = await req("/api/hub/sync", {
    method: "POST",
    cookie,
    body: { action: "Test hors-ligne", module: "community" },
  });
  results.push([
    "POST /api/hub/sync (producteur)",
    r.status === 201 && r.json?.status === "pending",
    r.status,
  ]);

  r = await req("/api/hub/sync/retry", { method: "POST", cookie });
  results.push([
    "POST /api/hub/sync/retry (synced)",
    r.status === 200 && (r.json ?? []).every((s) => s.status === "synced"),
    r.status,
  ]);

  r = await req("/api/hub/bundle", { cookie });
  const referralActive = (r.json?.referrals ?? []).some(
    (x) => x.id === referralId && x.status === "active",
  );
  results.push([
    "GET /api/hub/bundle (parrainage + synchro)",
    r.status === 200 && referralActive && (r.json?.sync_queue ?? []).length >= 1,
    r.status,
  ]);

  r = await req("/api/hub/favorites/toggle", {
    method: "POST",
    cookie,
    body: { type: "product", label: "Produit E2E", detail: "test" },
  });
  results.push(["POST /api/hub/favorites/toggle", r.status === 200 && Array.isArray(r.json), r.status]);

  r = await req("/api/hub/profile", {
    method: "POST",
    cookie,
    body: { city: "Conakry", language: "Français" },
  });
  results.push(["POST /api/hub/profile", r.status === 200 && r.json?.city === "Conakry", r.status]);

  await admin.from("platform_admins").delete().eq("user_id", userId);
  r = await req("/api/admin/bundle", { cookie });
  results.push(["GET /api/admin/bundle (non-admin)", r.status === 403, r.status]);

  r = await req("/api/auth/set-pin", { method: "POST", cookie, body: { pin: PIN } });
  results.push(["POST /api/auth/set-pin", r.status === 200 && r.json?.ok === true, r.status]);

  r = await req("/api/auth/verify-pin", { method: "POST", cookie, body: { pin: PIN } });
  results.push(["POST /api/auth/verify-pin (bon PIN)", r.status === 200 && r.json?.ok === true, r.status]);

  r = await req("/api/auth/verify-pin", { method: "POST", cookie, body: { pin: "9999" } });
  results.push(["POST /api/auth/verify-pin (mauvais PIN)", r.status === 401, r.status]);

  await admin.from("platform_admins").insert({ user_id: userId, role: "admin" });
  r = await req("/api/admin/bundle", { cookie });
  results.push(["GET /api/admin/bundle (admin)", r.status === 200 && !!r.json?.dashboard, r.status]);

  r = await req("/api/admin/config", {
    method: "POST",
    cookie,
    body: { platform_name: "AssoShop" },
  });
  results.push(["POST /api/admin/config (audit)", r.status === 200 && !!r.json?.platform_name, r.status]);

  // Nettoyage : le compte de test ne doit pas rester administrateur.
  await admin.from("platform_admins").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);

  console.log("\n=== Résultats E2E ===");
  let ok = true;
  for (const [label, verdict, status] of results) {
    const pass = verdict === true ? "PASS" : "FAIL";
    console.log(`  [${pass}] ${label} (HTTP ${status})`);
    if (verdict !== true) ok = false;
  }
  console.log(ok ? "\nE2E OK" : "\nE2E ÉCHEC");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("ERREUR:", e?.message ?? e);
  process.exit(1);
});

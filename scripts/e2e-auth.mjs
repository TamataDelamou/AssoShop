import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REF = "fpxgbykozzyybwhlltlo";
const BASE_URL = "http://localhost:3100";
const EMAIL = "e2e.test@assoshop.local";
const PASSWORD = "AssoShopE2E!2026";
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

async function main() {
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
      if (r.status) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
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
  results.push(["POST /api/pay/topup (sans wallet_id)", r.status === 200 && r.json?.status === "confirmed", r.status]);

  r = await req("/api/market/wallet", { cookie });
  results.push(["GET /api/market/wallet (solde unifié)", r.status === 200 && r.json?.balance === 9950, r.status]);

  r = await req("/api/pay/bundle", { cookie });
  const personalWallet = (r.json?.wallets ?? []).find((w) => w.type === "personal");
  results.push(["GET /api/pay/bundle (portefeuille unifié)", r.status === 200 && personalWallet?.balance === 9950, r.status]);

  r = await req("/api/hub/bundle", { cookie });
  results.push(["GET /api/hub/bundle (auth)", r.status === 200 && !!r.json?.profile, r.status]);

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

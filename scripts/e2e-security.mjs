// Parcours réel (API + écrans) des protections des migrations 0017 à 0020 :
// connexion, recharge en attente puis confirmée par le webhook, commande
// marché payée et partagée, journal d'audit. Les données de test sont
// supprimées à la fin (sauf audit_events, en ajout seul par conception).
//
// Prérequis : serveur lancé avec NEXT_PUBLIC_USE_REAL_API=1 et le même
// PAY_WEBHOOK_SECRET que ce script.
//   PAY_WEBHOOK_SECRET=... node --env-file=.env.local scripts/e2e-security.mjs
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR ?? null;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(SUPABASE_URL).hostname.split(".")[0];
const WEBHOOK_SECRET = process.env.PAY_WEBHOOK_SECRET;
const PASSWORD = `E2e!${crypto.randomUUID()}`;
const RUN = Date.now();

const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`  ${ok ? "[OK]   " : "[ÉCHEC]"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

function sessionCookies(session) {
  const value = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const key = `sb-${REF}-auth-token`;
  const size = 3000;
  if (value.length <= size) return [{ name: key, value }];
  const chunks = [];
  for (let i = 0; i * size < value.length; i++) {
    chunks.push({ name: `${key}.${i}`, value: value.slice(i * size, (i + 1) * size) });
  }
  return chunks;
}

async function createUser(label) {
  const email = `e2e-${label}-${RUN}@assoshop.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`création ${label} : ${error.message}`);

  const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signError } = await anon.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signError) throw new Error(`connexion ${label} : ${signError.message}`);

  const cookies = sessionCookies(signIn.session);
  return {
    id: data.user.id,
    cookies,
    cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    client: anon,
  };
}

async function api(path, { method = "GET", user, body, headers = {} } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Cookie: user.cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // réponse non JSON
  }
  return { status: res.status, json };
}

async function balance(user) {
  const { json } = await api("/api/market/wallet", { user });
  return json?.balance ?? null;
}

async function main() {
  if (!WEBHOOK_SECRET) throw new Error("PAY_WEBHOOK_SECRET requis (identique à celui du serveur).");
  const created = { users: [], orgId: null };

  try {
    console.log("\n1. Connexion");
    const buyer = await createUser("acheteur");
    const seller = await createUser("revendeur");
    created.users.push(buyer.id, seller.id);

    let r = await api("/api/pay/bundle");
    check("API refusée sans session", r.status === 401, `statut ${r.status}`);
    r = await api("/api/pay/bundle", { user: buyer });
    check("API accessible après connexion", r.status === 200 && Array.isArray(r.json?.wallets), `statut ${r.status}`);

    console.log("\n2. Recharge en attente, puis confirmation serveur");
    r = await api("/api/pay/topup", { method: "POST", user: buyer, body: { amount: 20000, provider: "Orange Money", phone: "620000000" } });
    const topup = r.json;
    check("la recharge renvoie une transaction en attente", r.status === 200 && topup?.status === "pending", `statut ${r.status}, ${topup?.status}`);
    check("aucun crédit avant confirmation", (await balance(buyer)) === 0, `solde ${await balance(buyer)}`);

    // Écriture directe avec la clé anon et le jeton de l'utilisateur (hors API).
    const direct = await buyer.client.from("pay_wallets").update({ balance: 999999 }).eq("user_id", buyer.id).select();
    check("écriture directe du solde refusée (clé anon)", Boolean(direct.error) || (direct.data ?? []).length === 0, direct.error?.message ?? "accepté !");
    const rpc = await buyer.client.rpc("pay_confirm_topup", { p_reference: topup?.reference });
    check("pay_confirm_topup refusée à l'utilisateur (clé anon)", Boolean(rpc.error), "acceptée !");
    check("solde toujours nul", (await balance(buyer)) === 0);

    r = await api("/api/pay/topup/confirm", { method: "POST", body: { reference: topup?.reference } });
    check("webhook refusé sans secret", r.status === 401, `statut ${r.status}`);
    r = await api("/api/pay/topup/confirm", { method: "POST", user: buyer, body: { reference: topup?.reference } });
    check("webhook refusé avec une simple session utilisateur", r.status === 401, `statut ${r.status}`);

    const auth = { Authorization: `Bearer ${WEBHOOK_SECRET}` };
    r = await api("/api/pay/topup/confirm", { method: "POST", headers: auth, body: { reference: topup?.reference } });
    check("webhook confirme la recharge", r.status === 200 && r.json?.status === "confirmed", `statut ${r.status}`);
    const credited = 20000 - Number(topup?.commission ?? 0);
    check("portefeuille crédité du montant net", (await balance(buyer)) === credited, `solde ${await balance(buyer)}, attendu ${credited}`);
    r = await api("/api/pay/topup/confirm", { method: "POST", headers: auth, body: { reference: topup?.reference } });
    check("rejeu du webhook sans double crédit", r.status === 200 && (await balance(buyer)) === credited, `solde ${await balance(buyer)}`);
    r = await api("/api/pay/topup/confirm", { method: "POST", headers: auth, body: { reference: "PAY-0000-INCONNUE" } });
    check("référence inconnue : 404", r.status === 404, `statut ${r.status}`);

    console.log("\n3. Commande marché");
    const { data: reseller, error: resellerError } = await admin
      .from("market_resellers")
      .insert({ user_id: seller.id, company_name: `Revendeur E2E ${RUN}`, validated_at: new Date().toISOString() })
      .select()
      .single();
    if (resellerError) throw new Error(resellerError.message);
    const { data: product, error: productError } = await admin
      .from("market_products")
      .insert({ reseller_id: reseller.id, name: `Produit E2E ${RUN}`, retail_price: 4000, wholesale_price: 3500, stock: 50, status: "published" })
      .select()
      .single();
    if (productError) throw new Error(productError.message);

    r = await api("/api/market/orders", { method: "POST", user: buyer, body: { items: [{ product_id: product.id, quantity: 2, unit_price: 1 }], total: 1 } });
    const order = r.json;
    check("commande créée, total calculé en base (8 000)", r.status === 200 && order?.total === 8000 && order?.paid === false, `statut ${r.status}, total ${order?.total}`);

    const forged = await buyer.client.from("market_orders").update({ paid: true, total: 1 }).eq("id", order?.id).select();
    check("l'acheteur ne peut pas marquer sa commande payée (clé anon)", Boolean(forged.error) || (forged.data ?? []).length === 0, "accepté !");

    r = await api(`/api/market/orders/${order?.id}/pay`, { method: "POST", user: buyer });
    check("paiement de la commande", r.status === 200 && r.json?.paid === true && r.json?.status === "confirmed", `statut ${r.status} ${JSON.stringify(r.json)}`);
    check("acheteur débité de 8 000", (await balance(buyer)) === credited - 8000, `solde ${await balance(buyer)}`);
    const { data: commissionRow } = await admin.from("admin_commissions").select("rate").eq("service", "Commission revendeur B2B").single();
    const commission = Math.round((8000 * Number(commissionRow.rate)) / 100);
    check(`revendeur crédité de 8 000 moins la commission (${commission})`, (await balance(seller)) === 8000 - commission, `solde ${await balance(seller)}`);
    r = await api(`/api/market/orders/${order?.id}/pay`, { method: "POST", user: buyer });
    check("second paiement refusé", r.status === 400, `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/deliver`, { method: "POST", user: seller, body: {} });
    check("le revendeur ne peut pas sauter à « livrée »", r.status === 409, `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/scan`, { method: "POST", user: buyer });
    check("l'acheteur ne peut pas faire avancer la commande", r.status === 403, `statut ${r.status}`);

    console.log("\n4. Organisation et journal d'audit");
    r = await api("/api/organizations", { method: "POST", user: buyer, body: { name: `Organisation E2E ${RUN}`, type: "association" } });
    created.orgId = r.json?.id ?? null;
    check("création d'organisation (le créateur devient admin)", r.status === 201 && created.orgId, `statut ${r.status} ${JSON.stringify(r.json)}`);

    const join = await seller.client.from("memberships").insert({ organization_id: created.orgId, user_id: seller.id, role: "admin" }).select();
    check("un tiers ne peut pas s'inscrire admin (clé anon)", Boolean(join.error), "accepté !");

    r = await api(`/api/organizations/${created.orgId}/members`, { method: "POST", user: buyer, body: { email: `membre-${RUN}@assoshop.invalid`, role: "member" } });
    const memberId = r.json?.id;
    check("ajout d'un membre par l'admin", r.status < 300 && memberId, `statut ${r.status} ${JSON.stringify(r.json)}`);
    r = await api(`/api/organizations/${created.orgId}/members/${memberId}`, { method: "PATCH", user: seller, body: { role: "treasurer" } });
    check("changement de rôle refusé à un non-admin (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/organizations/${created.orgId}/members/${memberId}`, { method: "PATCH", user: buyer, body: { role: "treasurer" } });
    check("changement de rôle par l'admin", r.status === 200 && r.json?.role === "treasurer", `statut ${r.status}`);

    r = await api(`/api/organizations/${created.orgId}/audit-events`, { user: buyer });
    const roleEvent = (r.json?.events ?? []).find((e) => e.event_type === "member.role_changed");
    check(
      "le journal d'audit contient le changement de rôle, avec son auteur",
      r.status === 200 && roleEvent?.actor_id === buyer.id && roleEvent?.after?.role === "treasurer",
      `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`,
    );
    r = await api(`/api/organizations/${created.orgId}/audit-events`, { user: seller });
    check("journal refusé à un non-admin (403)", r.status === 403, `statut ${r.status}`);

    const { data: personal } = await admin.from("audit_events").select("event_type").in("entity_id", [topup?.id, order?.id]);
    const types = (personal ?? []).map((e) => e.event_type);
    check(
      "événements personnels journalisés (recharge, confirmation, commande payée)",
      ["pay.topup", "pay.topup_confirmed", "market.order_paid"].every((t) => types.includes(t)),
      types.join(", "),
    );

    console.log("\n5. Écrans (navigateur)");
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await context.addCookies(buyer.cookies.map((c) => ({ ...c, url: BASE_URL })));
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 160)));

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(4000);
      check("tableau de bord accessible avec la session", page.url().includes("/dashboard"), page.url());

      await page.goto(`${BASE_URL}/dashboard/pay`);
      await page.waitForTimeout(6000);
      const payText = await page.locator("main").innerText();
      check("écran Pay : solde réel affiché", payText.replace(/\s/g, "").includes(String(credited - 8000)), payText.slice(0, 200));
      if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e-pay.png` });

      await page.goto(`${BASE_URL}/dashboard/organizations/${created.orgId}/audit`);
      await page.waitForTimeout(6000);
      const rows = await page.locator("tbody tr").count();
      const auditText = rows > 0 ? await page.locator("tbody").innerText() : "";
      check("écran Journal d'audit : événement affiché", rows >= 1 && auditText.includes("Rôle d'un membre modifié"), `${rows} ligne(s)`);
      if (SCREENSHOT_DIR) await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e-audit.png` });
      check("aucune erreur de page (hydratation comprise)", pageErrors.length === 0, pageErrors.join(" | "));
    } finally {
      await browser.close();
    }
  } finally {
    console.log("\n6. Suppression des données de test");
    if (created.orgId) {
      const { error } = await admin.from("organizations").delete().eq("id", created.orgId);
      console.log(`  organisation : ${error ? `ÉCHEC ${error.message}` : "supprimée"}`);
    }
    for (const id of created.users) {
      // Cascade : portefeuilles, transactions, commandes, compte revendeur et produits.
      const { error } = await admin.auth.admin.deleteUser(id);
      console.log(`  utilisateur ${id.slice(0, 8)} : ${error ? `ÉCHEC ${error.message}` : "supprimé"}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications vertes`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`ÉCHEC : ${err.message}`);
  process.exitCode = 1;
});

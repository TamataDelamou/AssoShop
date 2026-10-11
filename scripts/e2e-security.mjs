// Parcours réel (API + écrans) des protections des migrations 0017 à 0021 :
// connexion, recharge en attente puis confirmée par le webhook, commande
// marché payée et partagée, journal d'audit, puis stock, portefeuille
// plateforme, transfert vers un destinataire réel, commandes groupées,
// investissement, annulation et avancement logistique. Les données de test sont
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
      // Une connexion par requête : évite les « fetch failed » quand le
      // serveur de dev ferme une connexion keep-alive entre deux appels.
      Connection: "close",
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

async function platformBalance() {
  const { data } = await admin
    .from("pay_wallets")
    .select("balance")
    .eq("type", "platform")
    .maybeSingle();
  return data ? Number(data.balance) : null;
}

async function balance(user) {
  const { json } = await api("/api/market/wallet", { user });
  return json?.balance ?? null;
}

async function main() {
  if (!WEBHOOK_SECRET) throw new Error("PAY_WEBHOOK_SECRET requis (identique à celui du serveur).");
  const created = { users: [], orgId: null, projectId: null };
  const platformBefore = await platformBalance();

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

    console.log("\n5. Portefeuille plateforme et stock");
    const topupFee = Number(topup?.commission ?? 0);
    check("portefeuille plateforme présent", platformBefore !== null);
    check(
      "plateforme créditée des commissions (recharge + vente)",
      (await platformBalance()) === platformBefore + topupFee + commission,
      `solde ${await platformBalance()}, attendu ${platformBefore + topupFee + commission}`,
    );
    const hidden = await buyer.client.from("pay_wallets").select("id").eq("type", "platform");
    check("portefeuille plateforme invisible avec la clé anon", (hidden.data ?? []).length === 0, "visible !");

    const { data: stockRow } = await admin.from("market_products").select("stock").eq("id", product.id).single();
    check("stock décrémenté au paiement (50 → 48)", stockRow.stock === 48, `stock ${stockRow.stock}`);
    r = await api("/api/market/orders", { method: "POST", user: buyer, body: { items: [{ product_id: product.id, quantity: 500 }] } });
    check("commande au-delà du stock refusée (409)", r.status === 409, `statut ${r.status}`);
    const { data: lotProduct } = await admin
      .from("market_products")
      .insert({ reseller_id: reseller.id, name: `Produit lot E2E ${RUN}`, retail_price: 100, wholesale_price: 100, stock: 50, min_order_quantity: 5, status: "published" })
      .select()
      .single();
    r = await api("/api/market/orders", { method: "POST", user: buyer, body: { items: [{ product_id: lotProduct.id, quantity: 2 }] } });
    check("commande sous la quantité minimale refusée (400)", r.status === 400, `statut ${r.status}`);

    console.log("\n6. Annulation et avancement logistique");
    r = await api("/api/market/orders", { method: "POST", user: buyer, body: { items: [{ product_id: product.id, quantity: 1 }] } });
    const unpaid = r.json;
    r = await api(`/api/market/orders/${unpaid?.id}/cancel`, { method: "POST", user: seller });
    check("annulation refusée à un tiers (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/market/orders/${unpaid?.id}/cancel`, { method: "POST", user: buyer });
    check("l'acheteur annule sa commande non payée", r.status === 200 && r.json?.status === "cancelled", `statut ${r.status}`);
    r = await api(`/api/market/orders/${order?.id}/cancel`, { method: "POST", user: buyer });
    check("annulation d'une commande payée refusée (409)", r.status === 409, `statut ${r.status}`);

    r = await api(`/api/market/reseller/orders/${order?.id}/advance`, { method: "POST", user: seller, body: { status: "delivered" } });
    check("la route d'avancement refuse « livrée » (400)", r.status === 400, `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/advance`, { method: "POST", user: seller, body: { status: "arrived" } });
    check("saut d'étape refusé (409)", r.status === 409, `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/advance`, { method: "POST", user: seller, body: { status: "shipped" } });
    check("le revendeur marque la commande expédiée", r.status === 200 && r.json?.status === "shipped", `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/advance`, { method: "POST", user: seller, body: { status: "arrived" } });
    check("puis arrivée", r.status === 200 && r.json?.status === "arrived", `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/scan`, { method: "POST", user: seller });
    check("scan : prête au retrait", r.status === 200 && r.json?.status === "ready_for_pickup", `statut ${r.status}`);
    r = await api(`/api/market/reseller/orders/${order?.id}/deliver`, { method: "POST", user: seller, body: { recipient_name: "Client E2E" } });
    check("remise : livrée, sans toucher au paiement", r.status === 200 && r.json?.status === "delivered" && r.json?.paid === true && r.json?.total === 8000, `statut ${r.status}`);
    const pickup = await seller.client.from("market_pickup_records").insert({ order_id: order?.id, tracking_code: "FAUX", status: "delivered" }).select();
    check("écriture directe du suivi de retrait refusée (clé anon)", Boolean(pickup.error), "acceptée !");

    console.log("\n7. Transfert vers un destinataire réel");
    const { data: sellerMember, error: sellerMemberError } = await admin
      .from("members")
      .insert({ organization_id: created.orgId, user_id: seller.id, name: "Revendeur E2E", status: "active", role: "member" })
      .select()
      .single();
    if (sellerMemberError) throw new Error(sellerMemberError.message);

    r = await api("/api/pay/recipients", { user: buyer });
    const recipient = (r.json ?? []).find((x) => x.member_id === sellerMember.id);
    check(
      "liste des destinataires : membres des organisations communes, sans contact",
      r.status === 200 && recipient?.user_id === seller.id && !("phone" in recipient) && !("email" in recipient),
      `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`,
    );
    check("l'utilisateur n'est pas dans sa propre liste", !(r.json ?? []).some((x) => x.user_id === buyer.id));

    const buyerBeforeTransfer = await balance(buyer);
    const sellerBeforeTransfer = await balance(seller);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_member: "Revendeur E2E", amount: 1000 } });
    check("transfert vers un libellé libre refusé (400)", r.status === 400, `statut ${r.status}`);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_member_id: sellerMember.id, amount: 1000 } });
    check("transfert vers un membre", r.status === 200 && r.json?.type === "transfer" && r.json?.status === "confirmed", `statut ${r.status} ${JSON.stringify(r.json)}`);
    check("émetteur débité de 1 000", (await balance(buyer)) === buyerBeforeTransfer - 1000, `solde ${await balance(buyer)}`);
    check("destinataire crédité de 1 000", (await balance(seller)) === sellerBeforeTransfer + 1000, `solde ${await balance(seller)}`);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_user_id: buyer.id, amount: 100 } });
    check("transfert vers soi-même refusé (400)", r.status === 400, `statut ${r.status}`);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_user_id: crypto.randomUUID(), amount: 100 } });
    check("destinataire inconnu refusé (404)", r.status === 404, `statut ${r.status}`);
    r = await api("/api/pay/transfer", { method: "POST", user: seller, body: { to_member_id: memberId, amount: 100 } });
    check("membre d'une organisation non commune refusé (404)", r.status === 404, `statut ${r.status}`);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_member_id: sellerMember.id, amount: 100000000 } });
    check("transfert au-delà du solde refusé (400)", r.status === 400, `statut ${r.status}`);

    console.log("\n8. Commandes groupées et investissement");
    r = await api("/api/market/orders/group", { method: "POST", user: buyer, body: { product_id: product.id, min_participants: 2, deadline: "2099-12-31", unit_price: 1 } });
    const group = r.json;
    check("commande groupée créée au prix du produit (prix client ignoré)", r.status === 200 && group?.unit_price === 4000 && group?.status === "open", `statut ${r.status} ${JSON.stringify(group)?.slice(0, 160)}`);
    const forgedGroup = await seller.client.from("market_group_orders").update({ unit_price: 1, status: "closed" }).eq("id", group?.id).select();
    check("modification directe d'une commande groupée refusée (clé anon)", Boolean(forgedGroup.error) || (forgedGroup.data ?? []).length === 0, "acceptée !");
    r = await api(`/api/market/orders/group/${group?.id}/join`, { method: "POST", user: seller });
    check("participation : commande confirmée au minimum atteint", r.status === 200 && r.json?.status === "confirmed" && r.json?.participants === 2, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);

    r = await api("/api/market/investments", { method: "POST", user: buyer, body: { name: `Projet E2E ${RUN}`, sector: "agriculture", target_amount: 5000, profit_sharing_rules: "Règles v1" } });
    created.projectId = r.json?.id ?? null;
    check("projet d'investissement créé", r.status === 200 && created.projectId && r.json?.rules_locked === false, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    const forgedProject = await seller.client.from("market_investment_projects").update({ raised_amount: 999999, profit_sharing_rules: "piraté" }).eq("id", created.projectId).select();
    check("modification directe d'un projet refusée (clé anon)", Boolean(forgedProject.error) || (forgedProject.data ?? []).length === 0, "acceptée !");
    const forgedRules = await seller.client.rpc("market_update_investment_rules", { p_project_id: created.projectId, p_profit_sharing_rules: "piraté" });
    check("règles de répartition réservées au créateur", forgedRules.error?.code === "PY006", forgedRules.error?.code ?? "acceptée !");
    r = await api(`/api/market/investments/${created.projectId}/invest`, { method: "POST", user: seller, body: { amount: 1000 } });
    check("investissement enregistré, règles verrouillées", r.status === 200 && r.json?.raised_amount === 1000 && r.json?.rules_locked === true && r.json?.my_contribution === 1000, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    const lockedRules = await buyer.client.rpc("market_update_investment_rules", { p_project_id: created.projectId, p_profit_sharing_rules: "Règles v2" });
    check("règles figées après le premier investissement", lockedRules.error?.code === "PY019", lockedRules.error?.code ?? "acceptée !");

    const expectedBalance = await balance(buyer);

    console.log("\n9. Écrans (navigateur)");
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
      check("écran Pay : solde réel affiché", payText.replace(/\s/g, "").includes(String(expectedBalance)), payText.slice(0, 200));
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
    console.log("\n10. Suppression des données de test");
    if (created.projectId) {
      const { error } = await admin.from("market_investment_projects").delete().eq("id", created.projectId);
      console.log(`  projet d'investissement : ${error ? `ÉCHEC ${error.message}` : "supprimé"}`);
    }
    // Les commissions de test sont retirées du portefeuille plateforme.
    const platformNow = await platformBalance();
    if (platformBefore !== null && platformNow !== null && platformNow !== platformBefore) {
      const { error } = await admin
        .from("pay_wallets")
        .update({ balance: platformBefore, last_known_balance: platformBefore })
        .eq("type", "platform");
      console.log(`  portefeuille plateforme : ${error ? `ÉCHEC ${error.message}` : `remis à ${platformBefore}`}`);
    }
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

// Parcours réel (API + écrans) des protections des migrations 0017 à 0024 :
// connexion, recharge en attente puis confirmée par le webhook, commande
// marché payée et partagée, journal d'audit, puis stock, portefeuille
// plateforme, transfert vers un destinataire réel, commandes groupées,
// investissement payé (séquestre), annulation, avancement logistique et
// candidature revendeur décidée par un administrateur de la plateforme, puis
// dénouement des séquestres (remboursement, versement, bénéfices) et
// fermeture de compte (suppression ou anonymisation). Les
// données de test sont supprimées à la fin (sauf audit_events, en ajout seul
// par conception).
//
// Prérequis : serveur lancé avec NEXT_PUBLIC_USE_REAL_API=1 et les mêmes
// PAY_WEBHOOK_SECRET et CRON_SECRET que ce script.
//   PAY_WEBHOOK_SECRET=... CRON_SECRET=... node --env-file=.env.local scripts/e2e-security.mjs
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR ?? null;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REF = new URL(SUPABASE_URL).hostname.split(".")[0];
const WEBHOOK_SECRET = process.env.PAY_WEBHOOK_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;
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
    email,
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

async function escrowBalance(projectId) {
  const { data } = await admin
    .from("pay_wallets")
    .select("balance")
    .eq("type", "escrow")
    .eq("project_id", projectId)
    .maybeSingle();
  return data ? Number(data.balance) : null;
}

// Solde lu en base : reste disponible quand le compte n'a plus de session.
async function walletBalance(userId) {
  const { data } = await admin
    .from("pay_wallets")
    .select("balance")
    .eq("type", "personal")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? Number(data.balance) : null;
}

async function balance(user) {
  const { json } = await api("/api/market/wallet", { user });
  return json?.balance ?? null;
}

async function main() {
  if (!WEBHOOK_SECRET) throw new Error("PAY_WEBHOOK_SECRET requis (identique à celui du serveur).");
  if (!CRON_SECRET) throw new Error("CRON_SECRET requis (identique à celui du serveur).");
  const created = { users: [], orgId: null, projectId: null, projectIds: [], distributionIds: [], applicationId: null };
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
    const stranger = await createUser("tiers");
    created.users.push(stranger.id);
    const buyerBeforeStranger = await balance(buyer);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_user_id: stranger.id, amount: 100 } });
    check(
      "transfert par identifiant vers un compte sans organisation commune refusé (404), sans débit",
      r.status === 404 && (await balance(buyer)) === buyerBeforeStranger && (await balance(stranger)) === 0,
      `statut ${r.status}, émetteur ${await balance(buyer)}, tiers ${await balance(stranger)}`,
    );
    r = await api("/api/pay/transfer", { method: "POST", user: stranger, body: { to_user_id: buyer.id, amount: 100 } });
    check("même refus dans l'autre sens (404)", r.status === 404, `statut ${r.status}`);
    const sellerBeforeById = await balance(seller);
    r = await api("/api/pay/transfer", { method: "POST", user: buyer, body: { to_user_id: seller.id, amount: 500 } });
    check(
      "transfert par identifiant vers un membre d'une organisation commune",
      r.status === 200 && r.json?.type === "transfer" && (await balance(seller)) === sellerBeforeById + 500 && (await balance(buyer)) === buyerBeforeStranger - 500,
      `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`,
    );
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
    check("projet sans date limite refusé (400)", r.status === 400, `statut ${r.status}`);
    r = await api("/api/market/investments", { method: "POST", user: buyer, body: { name: `Projet E2E ${RUN}`, sector: "agriculture", target_amount: 5000, profit_sharing_rules: "Règles v1", deadline: "2000-01-01" } });
    check("projet à date limite passée refusé (400)", r.status === 400, `statut ${r.status}`);
    r = await api("/api/market/investments", { method: "POST", user: buyer, body: { name: `Projet E2E ${RUN}`, sector: "agriculture", target_amount: 5000, profit_sharing_rules: "Règles v1", deadline: "2099-12-31" } });
    created.projectId = r.json?.id ?? null;
    if (created.projectId) created.projectIds.push(created.projectId);
    check("projet d'investissement créé", r.status === 200 && created.projectId && r.json?.rules_locked === false, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    const forgedProject = await seller.client.from("market_investment_projects").update({ raised_amount: 999999, profit_sharing_rules: "piraté" }).eq("id", created.projectId).select();
    check("modification directe d'un projet refusée (clé anon)", Boolean(forgedProject.error) || (forgedProject.data ?? []).length === 0, "acceptée !");
    const forgedRules = await seller.client.rpc("market_update_investment_rules", { p_project_id: created.projectId, p_profit_sharing_rules: "piraté" });
    check("règles de répartition réservées au créateur", forgedRules.error?.code === "PY006", forgedRules.error?.code ?? "acceptée !");
    const investorBefore = await balance(seller);
    r = await api(`/api/market/investments/${created.projectId}/invest`, { method: "POST", user: seller, body: { amount: investorBefore + 1 } });
    check(
      "investissement au-delà du solde refusé (400), sans débit ni séquestre",
      r.status === 400 && (await balance(seller)) === investorBefore && (await escrowBalance(created.projectId)) === null,
      `statut ${r.status}, solde ${await balance(seller)}, séquestre ${await escrowBalance(created.projectId)}`,
    );
    r = await api(`/api/market/investments/${created.projectId}/invest`, { method: "POST", user: seller, body: { amount: 1000 } });
    check("investissement enregistré, règles verrouillées", r.status === 200 && r.json?.raised_amount === 1000 && r.json?.rules_locked === true && r.json?.my_contribution === 1000, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    check("investisseur débité de 1 000", (await balance(seller)) === investorBefore - 1000, `solde ${await balance(seller)}, attendu ${investorBefore - 1000}`);
    check("compte de séquestre du projet crédité de 1 000", (await escrowBalance(created.projectId)) === 1000, `séquestre ${await escrowBalance(created.projectId)}`);
    const { data: contributionRow } = await admin
      .from("market_investment_contributions")
      .select("amount, transaction_id")
      .eq("project_id", created.projectId)
      .eq("user_id", seller.id)
      .maybeSingle();
    const { data: contributionTx } = await admin
      .from("pay_transactions")
      .select("type, status, amount, module")
      .eq("id", contributionRow?.transaction_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    check(
      "la contribution référence son paiement",
      contributionRow?.amount === 1000 && contributionTx?.type === "payment" && contributionTx?.status === "confirmed" && contributionTx?.amount === 1000 && contributionTx?.module === "market",
      JSON.stringify(contributionRow),
    );
    const hiddenEscrow = await buyer.client.from("pay_wallets").select("id").eq("type", "escrow");
    check("compte de séquestre invisible avec la clé anon (créateur compris)", (hiddenEscrow.data ?? []).length === 0, "visible !");
    const lockedRules = await buyer.client.rpc("market_update_investment_rules", { p_project_id: created.projectId, p_profit_sharing_rules: "Règles v2" });
    check("règles figées après le premier investissement", lockedRules.error?.code === "PY019", lockedRules.error?.code ?? "acceptée !");

    console.log("\n9. Candidature revendeur (RG-M01)");
    const candidate = await createUser("candidat");
    const platformAdmin = await createUser("admin");
    created.users.push(candidate.id, platformAdmin.id);
    const { error: adminError } = await admin.from("platform_admins").insert({ user_id: platformAdmin.id, role: "admin" });
    if (adminError) throw new Error(`platform_admins : ${adminError.message}`);
    const resellerRows = async (userId) => {
      const { data } = await admin.from("market_resellers").select("id, validated_at").eq("user_id", userId);
      return data ?? [];
    };

    const forgedApplication = await candidate.client
      .from("market_reseller_applications")
      .insert({ user_id: candidate.id, company_name: "Faux", contact_name: "Faux", status: "approved" })
      .select();
    check("candidature « approved » écrite directement refusée (clé anon)", Boolean(forgedApplication.error), "acceptée !");

    r = await api("/api/market/reseller/application", { method: "POST", user: candidate, body: { company_name: `Société E2E ${RUN}`, contact_name: "Candidat E2E", sector: "agriculture", country: "Guinée", city: "Conakry", status: "approved" } });
    created.applicationId = r.json?.id ?? null;
    check("candidature déposée en attente (statut client ignoré)", r.status === 200 && r.json?.status === "pending" && created.applicationId, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);

    r = await api("/api/market/reseller/application/approve", { method: "POST", user: candidate });
    check("l'ancienne route d'auto-approbation n'existe plus (404)", r.status === 404, `statut ${r.status}`);
    const forgedStatus = await candidate.client.from("market_reseller_applications").update({ status: "approved" }).eq("user_id", candidate.id).select();
    check("le candidat ne peut pas modifier son statut (clé anon)", Boolean(forgedStatus.error) || (forgedStatus.data ?? []).length === 0, "accepté !");
    const forgedReseller = await candidate.client.from("market_resellers").insert({ user_id: candidate.id, company_name: "Auto-proclamé", validated_at: new Date().toISOString() }).select();
    check("création directe d'un compte revendeur refusée (clé anon)", Boolean(forgedReseller.error), "acceptée !");
    const forgedAdmin = await candidate.client.from("platform_admins").insert({ user_id: candidate.id, role: "admin" }).select();
    check("inscription directe dans platform_admins refusée (clé anon)", Boolean(forgedAdmin.error), "acceptée !");
    const forgedReview = await candidate.client.rpc("market_review_reseller_application", { p_application_id: created.applicationId, p_status: "approved" });
    check("fonction de décision refusée au candidat (clé anon)", forgedReview.error?.code === "PY006", forgedReview.error?.code ?? "acceptée !");
    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", user: candidate, body: { status: "approved" } });
    check("route de décision refusée au candidat (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", user: buyer, body: { status: "approved" } });
    check("route de décision refusée à un tiers (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", body: { status: "approved" } });
    check("route de décision refusée sans session (401)", r.status === 401, `statut ${r.status}`);
    r = await api("/api/market/reseller", { user: candidate });
    check(
      "toujours en attente et sans compte revendeur après ces tentatives",
      r.json?.application?.status === "pending" && (await resellerRows(candidate.id)).length === 0,
      `statut ${r.json?.application?.status}, ${(await resellerRows(candidate.id)).length} compte(s)`,
    );

    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", user: platformAdmin, body: { status: "pending" } });
    check("décision autre qu'approuver ou refuser rejetée (400)", r.status === 400, `statut ${r.status}`);
    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", user: platformAdmin, body: { status: "approved" } });
    const reviewed = (r.json ?? []).find?.((x) => x.id === created.applicationId);
    check("l'administrateur de la plateforme approuve la candidature", r.status === 200 && reviewed?.status === "approved", `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    const approvedResellers = await resellerRows(candidate.id);
    check("compte revendeur créé et validé", approvedResellers.length === 1 && Boolean(approvedResellers[0].validated_at), JSON.stringify(approvedResellers));
    const auditAction = `review_reseller:approved:${created.applicationId}`;
    const { data: auditRows } = await admin.from("admin_audit_logs").select("actor, action, module").eq("action", auditAction);
    check(
      "décision journalisée dans admin_audit_logs avec son auteur",
      (auditRows ?? []).length === 1 && auditRows[0].actor === platformAdmin.email && auditRows[0].module === "market",
      JSON.stringify(auditRows),
    );
    r = await api(`/api/admin/resellers/${created.applicationId}/review`, { method: "POST", user: platformAdmin, body: { status: "rejected" } });
    check("une candidature approuvée ne se rejuge pas (409)", r.status === 409, `statut ${r.status}`);

    console.log("\n10. Séquestre des investissements : dénouement tout ou rien");
    const cron = { Authorization: `Bearer ${CRON_SECRET}` };
    const settle = () => api("/api/cron/investments/settle", { method: "POST", headers: cron });
    const expire = async (projectId) => {
      const yesterday = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const { error } = await admin.from("market_investment_projects").update({ deadline: yesterday }).eq("id", projectId);
      if (error) throw new Error(`échéance : ${error.message}`);
    };
    const projectOf = async (user, projectId) => {
      const { json } = await api("/api/market/investments", { user });
      return (json ?? []).find?.((p) => p.id === projectId) ?? null;
    };

    r = await api("/api/cron/investments/settle", { method: "POST" });
    check("dénouement refusé sans secret (401)", r.status === 401, `statut ${r.status}`);
    r = await api("/api/cron/investments/settle", { method: "POST", user: buyer });
    check("dénouement refusé avec une simple session utilisateur (401)", r.status === 401, `statut ${r.status}`);
    r = await api("/api/cron/investments/settle", { method: "POST", headers: { Authorization: "Bearer faux-secret" } });
    check("dénouement refusé avec un mauvais secret (401)", r.status === 401, `statut ${r.status}`);
    const forgedSettle = await buyer.client.rpc("market_settle_due_investments");
    check("fonction de dénouement refusée à l'utilisateur (clé anon)", Boolean(forgedSettle.error), "acceptée !");

    // 10.a Objectif non atteint (1 000 collectés sur 5 000) : remboursement.
    r = await settle();
    check(
      "avant la date limite : rien n'est dénoué",
      r.status === 200 && (await escrowBalance(created.projectId)) === 1000,
      `statut ${r.status} ${JSON.stringify(r.json)}, séquestre ${await escrowBalance(created.projectId)}`,
    );
    await expire(created.projectId);
    r = await api(`/api/market/investments/${created.projectId}/invest`, { method: "POST", user: seller, body: { amount: 100 } });
    check("investissement refusé après la date limite (409)", r.status === 409, `statut ${r.status}`);
    const sellerBeforeRefund = await balance(seller);
    const platformBeforeRefund = await platformBalance();
    r = await settle();
    check("échéance passée, objectif non atteint : remboursement", r.status === 200 && r.json?.refunded === 1 && r.json?.released === 0, `statut ${r.status} ${JSON.stringify(r.json)}`);
    check(
      "investisseur remboursé intégralement, sans commission",
      (await balance(seller)) === sellerBeforeRefund + 1000 && (await escrowBalance(created.projectId)) === 0 && (await platformBalance()) === platformBeforeRefund,
      `solde ${await balance(seller)}, attendu ${sellerBeforeRefund + 1000}, séquestre ${await escrowBalance(created.projectId)}`,
    );
    const refundedView = await projectOf(seller, created.projectId);
    check("statut du projet : remboursé", refundedView?.status === "refunded", `statut ${refundedView?.status}`);
    r = await settle();
    check(
      "second passage : aucun double remboursement",
      r.status === 200 && r.json?.refunded === 0 && (await balance(seller)) === sellerBeforeRefund + 1000,
      `${JSON.stringify(r.json)}, solde ${await balance(seller)}`,
    );

    // 10.b Objectif atteint (1 000 sur 1 000) : versement au porteur.
    r = await api("/api/market/investments", { method: "POST", user: candidate, body: { name: `Projet financé E2E ${RUN}`, sector: "commerce", target_amount: 1000, profit_sharing_rules: "60 % investisseurs / 40 % porteur", deadline: "2099-12-31" } });
    const fundedId = r.json?.id ?? null;
    if (fundedId) created.projectIds.push(fundedId);
    check("second projet créé par un autre porteur", r.status === 200 && fundedId, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
    await api(`/api/market/investments/${fundedId}/invest`, { method: "POST", user: buyer, body: { amount: 600 } });
    r = await api(`/api/market/investments/${fundedId}/invest`, { method: "POST", user: seller, body: { amount: 400 } });
    check("objectif atteint : collecte close", r.status === 200 && r.json?.status === "completed" && r.json?.raised_amount === 1000, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);

    const investorView = await projectOf(buyer, fundedId);
    const myShare = (investorView?.shares ?? []).find((x) => x.is_me);
    check(
      "écran investisseur : part de chacun, commission affichée, sans identité",
      investorView?.is_owner === false &&
        investorView?.commission_rate === 1 &&
        investorView?.shares?.length === 2 &&
        myShare?.amount === 600 && myShare?.percent === 60 &&
        !("created_by" in investorView) &&
        investorView.shares.every((x) => !("user_id" in x)),
      JSON.stringify(investorView)?.slice(0, 300),
    );
    check("écran porteur : projet reconnu comme le sien", (await projectOf(candidate, fundedId))?.is_owner === true);

    r = await settle();
    check(
      "objectif atteint mais échéance non passée : séquestre conservé",
      r.status === 200 && r.json?.released === 0 && (await escrowBalance(fundedId)) === 1000,
      `${JSON.stringify(r.json)}, séquestre ${await escrowBalance(fundedId)}`,
    );
    await expire(fundedId);
    const { data: investRateRow } = await admin.from("admin_commissions").select("rate").eq("service", "Commission investissement").maybeSingle();
    const investRate = Number(investRateRow?.rate);
    const investCommission = Math.round((1000 * investRate) / 100);
    check("service « Commission investissement » configuré (1 %)", investRate === 1, `taux ${investRateRow?.rate}`);
    const platformBeforeRelease = await platformBalance();
    r = await settle();
    check("échéance passée, objectif atteint : versement", r.status === 200 && r.json?.released === 1 && r.json?.refunded === 0, `statut ${r.status} ${JSON.stringify(r.json)}`);
    check(
      `porteur crédité de 1 000 moins la commission (${investCommission})`,
      (await balance(candidate)) === 1000 - investCommission,
      `solde ${await balance(candidate)}, attendu ${1000 - investCommission}`,
    );
    check(
      "commission créditée à la plateforme, séquestre soldé",
      (await platformBalance()) === platformBeforeRelease + investCommission && (await escrowBalance(fundedId)) === 0,
      `plateforme ${await platformBalance()}, séquestre ${await escrowBalance(fundedId)}`,
    );
    check("statut du projet : financé", (await projectOf(buyer, fundedId))?.status === "funded");
    r = await settle();
    check(
      "second passage : aucun double versement",
      r.status === 200 && r.json?.released === 0 && (await balance(candidate)) === 1000 - investCommission && (await platformBalance()) === platformBeforeRelease + investCommission,
      `${JSON.stringify(r.json)}, solde ${await balance(candidate)}`,
    );

    // 10.c Bénéfices : déclaration par le porteur, validation par un admin.
    r = await api(`/api/market/investments/${fundedId}/profit`, { method: "POST", user: buyer, body: { amount: 500 } });
    check("déclaration de bénéfice refusée à un investisseur (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/market/investments/${created.projectId}/profit`, { method: "POST", user: buyer, body: { amount: 500 } });
    check("pas de bénéfice sur un projet remboursé (409)", r.status === 409, `statut ${r.status}`);
    const candidateBeforeProfit = await balance(candidate);
    const buyerBeforeProfit = await balance(buyer);
    const sellerBeforeProfit = await balance(seller);
    r = await api(`/api/market/investments/${fundedId}/profit`, { method: "POST", user: candidate, body: { amount: 500 } });
    const distributionId = r.json?.id ?? null;
    if (distributionId) created.distributionIds.push(distributionId);
    check(
      "le porteur déclare un bénéfice : en attente, sans mouvement de fonds",
      r.status === 200 && r.json?.status === "pending" && (await balance(candidate)) === candidateBeforeProfit,
      `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`,
    );
    r = await api(`/api/market/investments/${fundedId}/profit`, { method: "POST", user: candidate, body: { amount: 100 } });
    check("une seule déclaration en attente (409)", r.status === 409, `statut ${r.status}`);

    const forgedDistribution = await candidate.client.from("market_investment_distributions").update({ status: "approved" }).eq("id", distributionId).select();
    check("validation par écriture directe refusée (clé anon)", Boolean(forgedDistribution.error) || (forgedDistribution.data ?? []).length === 0, "acceptée !");
    const forgedProfitReview = await candidate.client.rpc("market_review_investment_profit", { p_distribution_id: distributionId, p_status: "approved" });
    check("fonction de validation refusée au porteur (clé anon)", forgedProfitReview.error?.code === "PY006", forgedProfitReview.error?.code ?? "acceptée !");
    r = await api(`/api/admin/investments/distributions/${distributionId}/review`, { method: "POST", user: candidate, body: { status: "approved" } });
    check("route de validation refusée au porteur (403)", r.status === 403, `statut ${r.status}`);
    r = await api(`/api/admin/investments/distributions/${distributionId}/review`, { method: "POST", user: buyer, body: { status: "approved" } });
    check("route de validation refusée à un investisseur (403)", r.status === 403, `statut ${r.status}`);
    check("aucun mouvement après ces tentatives", (await balance(buyer)) === buyerBeforeProfit && (await balance(candidate)) === candidateBeforeProfit);

    r = await api("/api/admin/bundle", { user: platformAdmin });
    const pendingInBundle = (r.json?.investment_distributions ?? []).find((d) => d.id === distributionId);
    const projectInBundle = (r.json?.investments ?? []).find((p) => p.id === fundedId);
    check(
      "back-office : déclaration à valider, séquestre et investisseurs du projet",
      r.status === 200 && pendingInBundle?.status === "pending" && pendingInBundle?.amount === 500 &&
        projectInBundle?.escrow_balance === 0 && projectInBundle?.investors_count === 2 && typeof r.json?.escrow_total === "number",
      `statut ${r.status} ${JSON.stringify(pendingInBundle)} ${JSON.stringify(projectInBundle)}`,
    );

    r = await api(`/api/admin/investments/distributions/${distributionId}/review`, { method: "POST", user: platformAdmin, body: { status: "pending" } });
    check("décision autre qu'approuver ou refuser rejetée (400)", r.status === 400, `statut ${r.status}`);
    r = await api(`/api/admin/investments/distributions/${distributionId}/review`, { method: "POST", user: platformAdmin, body: { status: "approved" } });
    check("l'administrateur de la plateforme valide la distribution", r.status === 200 && r.json?.status === "approved" && r.json?.distributed_amount === 500, `statut ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`);
    check(
      "répartition au prorata des mises (300 et 200), porteur débité de 500",
      (await balance(buyer)) === buyerBeforeProfit + 300 && (await balance(seller)) === sellerBeforeProfit + 200 && (await balance(candidate)) === candidateBeforeProfit - 500,
      `acheteur +${(await balance(buyer)) - buyerBeforeProfit}, revendeur +${(await balance(seller)) - sellerBeforeProfit}, porteur ${(await balance(candidate)) - candidateBeforeProfit}`,
    );
    r = await api(`/api/admin/investments/distributions/${distributionId}/review`, { method: "POST", user: platformAdmin, body: { status: "approved" } });
    check(
      "seconde validation refusée (409) : aucune double distribution",
      r.status === 409 && (await balance(buyer)) === buyerBeforeProfit + 300 && (await balance(candidate)) === candidateBeforeProfit - 500,
      `statut ${r.status}, acheteur +${(await balance(buyer)) - buyerBeforeProfit}`,
    );
    const profitView = await projectOf(buyer, fundedId);
    check(
      "écran investisseur : bénéfice distribué et part reçue",
      profitView?.distributions?.[0]?.status === "approved" && profitView?.distributions?.[0]?.my_share === 300,
      JSON.stringify(profitView?.distributions),
    );

    const { data: investmentEvents } = await admin.from("audit_events").select("event_type, amount").in("entity_id", [created.projectId, fundedId, distributionId]);
    const investmentTypes = (investmentEvents ?? []).map((e) => e.event_type);
    check(
      "journal d'audit : remboursement, versement et distribution",
      ["investment.refunded", "investment.released", "investment.profit_distributed"].every((t) => investmentTypes.includes(t)) && investmentTypes.length === 3,
      JSON.stringify(investmentEvents),
    );
    const { data: profitLogs } = await admin.from("admin_audit_logs").select("actor").eq("action", `review_investment_profit:approved:${distributionId}`);
    check("décision journalisée dans admin_audit_logs avec son auteur", (profitLogs ?? []).length === 1 && profitLogs[0].actor === platformAdmin.email, JSON.stringify(profitLogs));

    const expectedBalance = await balance(buyer);

    console.log("\n11. Écrans (navigateur)");
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
      const bannerText = await page.locator("body").innerText();
      check("bandeau « Paiements en mode test » affiché (PAY_REAL_MONEY désactivé)", bannerText.includes("Paiements en mode test"), bannerText.slice(0, 160));

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

    console.log("\n12. Fermeture de compte : suppression ou anonymisation");
    r = await api("/api/account/delete", { method: "POST" });
    check("fermeture de compte refusée sans session (401)", r.status === 401, `statut ${r.status}`);
    const forgedClose = await buyer.client.rpc("account_close", { p_user_id: seller.id });
    check("fonction de fermeture refusée à l'utilisateur (clé anon)", Boolean(forgedClose.error), "acceptée !");

    // Compte sans engagement : supprimé.
    r = await api("/api/account/delete", { method: "POST", user: stranger });
    const strangerAfter = await admin.auth.admin.getUserById(stranger.id);
    check(
      "compte sans engagement : supprimé",
      r.status === 200 && r.json?.action === "deleted" && !strangerAfter.data?.user,
      `statut ${r.status} ${JSON.stringify(r.json)}`,
    );
    if (!strangerAfter.data?.user) created.users = created.users.filter((id) => id !== stranger.id);

    // Compte engagé (solde, contribution en séquestre) : anonymisé.
    r = await api("/api/market/investments", { method: "POST", user: candidate, body: { name: `Projet en collecte E2E ${RUN}`, sector: "commerce", target_amount: 100000, profit_sharing_rules: "Règles", deadline: "2099-12-31" } });
    const escrowProjectId = r.json?.id ?? null;
    if (escrowProjectId) created.projectIds.push(escrowProjectId);
    r = await api(`/api/market/investments/${escrowProjectId}/invest`, { method: "POST", user: seller, body: { amount: 100 } });
    check("contribution placée en séquestre", r.status === 200 && (await escrowBalance(escrowProjectId)) === 100, `statut ${r.status}`);
    const sellerWalletBefore = await walletBalance(seller.id);

    const refusedDelete = await admin.auth.admin.deleteUser(seller.id);
    const sellerStillThere = await admin.auth.admin.getUserById(seller.id);
    check(
      "suppression d'un compte engagé refusée par la base (même avec la clé service_role)",
      Boolean(refusedDelete.error) && Boolean(sellerStillThere.data?.user) && (await walletBalance(seller.id)) === sellerWalletBefore,
      refusedDelete.error?.message ?? "supprimé !",
    );

    r = await api("/api/account/delete", { method: "POST", user: seller });
    check(
      "compte engagé : anonymisé, avec ses motifs",
      r.status === 200 && r.json?.action === "anonymized" && r.json?.reasons?.includes("escrow_contribution") && r.json?.reasons?.includes("wallet_balance"),
      `statut ${r.status} ${JSON.stringify(r.json)}`,
    );
    const { data: anonymizedAuth } = await admin.auth.admin.getUserById(seller.id);
    check(
      "identifiant conservé, e-mail et téléphone effacés, compte bloqué",
      anonymizedAuth?.user?.id === seller.id &&
        anonymizedAuth.user.email === `anonyme-${seller.id}@anonymise.invalid` &&
        !anonymizedAuth.user.phone &&
        Boolean(anonymizedAuth.user.banned_until),
      JSON.stringify({ email: anonymizedAuth?.user?.email, banned_until: anonymizedAuth?.user?.banned_until }),
    );
    const { data: anonymizedMember } = await admin.from("members").select("name, email, phone").eq("id", sellerMember.id).maybeSingle();
    check(
      "nom effacé dans l'annuaire des membres",
      anonymizedMember?.name === "Compte anonymisé" && !anonymizedMember?.email && !anonymizedMember?.phone,
      JSON.stringify(anonymizedMember),
    );
    r = await api("/api/pay/bundle", { user: seller });
    check("l'ancienne session ne donne plus accès à l'API (401)", r.status === 401, `statut ${r.status}`);
    const relogin = await seller.client.auth.signInWithPassword({ email: seller.email, password: PASSWORD });
    check("reconnexion impossible avec les anciens identifiants", Boolean(relogin.error), "connecté !");
    const { count: sellerTxCount } = await admin.from("pay_transactions").select("id", { count: "exact", head: true }).eq("user_id", seller.id);
    check(
      "solde et écritures comptables conservés",
      (await walletBalance(seller.id)) === sellerWalletBefore && (sellerTxCount ?? 0) > 0,
      `solde ${await walletBalance(seller.id)}, ${sellerTxCount} transaction(s)`,
    );
    const { data: anonymizationLogs } = await admin.from("admin_audit_logs").select("id").eq("action", `account_anonymized:${seller.id}`);
    check("anonymisation journalisée dans admin_audit_logs", (anonymizationLogs ?? []).length === 1, `${(anonymizationLogs ?? []).length} entrée(s)`);

    await expire(escrowProjectId);
    r = await settle();
    check(
      "dénouement sans erreur (200, jamais 500) : l'investisseur anonymisé est remboursé",
      r.status === 200 && r.json?.refunded === 1 && (r.json?.failed ?? []).length === 0 &&
        (await walletBalance(seller.id)) === sellerWalletBefore + 100 && (await escrowBalance(escrowProjectId)) === 0,
      `statut ${r.status} ${JSON.stringify(r.json)}, solde ${await walletBalance(seller.id)}`,
    );
  } finally {
    console.log("\n13. Suppression des données de test");
    for (const id of created.users) {
      const action = `account_anonymized:${id}`;
      await admin.from("control_plane_outbox").delete().eq("payload->record->>action", action);
      await admin.from("admin_audit_logs").delete().eq("action", action);
    }
    for (const id of created.distributionIds) {
      const action = `review_investment_profit:approved:${id}`;
      const outbox = await admin.from("control_plane_outbox").delete().eq("payload->record->>action", action);
      const logs = await admin.from("admin_audit_logs").delete().eq("action", action);
      console.log(`  journal admin de la distribution : ${logs.error || outbox.error ? `ÉCHEC ${(logs.error ?? outbox.error).message}` : "supprimé"}`);
    }
    for (const id of created.projectIds.filter((p) => p !== created.projectId)) {
      // Déclarations (et parts), puis séquestre, puis projet.
      const distributions = await admin.from("market_investment_distributions").delete().eq("project_id", id);
      const escrow = await admin.from("pay_wallets").delete().eq("type", "escrow").eq("project_id", id);
      const project = await admin.from("market_investment_projects").delete().eq("id", id);
      const failure = distributions.error ?? escrow.error ?? project.error;
      console.log(`  projet financé de test : ${failure ? `ÉCHEC ${failure.message}` : "supprimé"}`);
    }
    if (created.applicationId) {
      // Journal de la décision de test et son message en attente pour le Control Plane.
      const action = `review_reseller:approved:${created.applicationId}`;
      const outbox = await admin.from("control_plane_outbox").delete().eq("payload->record->>action", action);
      const logs = await admin.from("admin_audit_logs").delete().eq("action", action);
      console.log(`  journal admin de test : ${logs.error || outbox.error ? `ÉCHEC ${(logs.error ?? outbox.error).message}` : "supprimé"}`);
    }
    if (created.projectId) {
      // Le séquestre de test bloque la suppression du projet : il part d'abord.
      const escrow = await admin.from("pay_wallets").delete().eq("type", "escrow").eq("project_id", created.projectId);
      console.log(`  séquestre du projet : ${escrow.error ? `ÉCHEC ${escrow.error.message}` : "supprimé"}`);
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
    // Un compte au solde non nul n'est plus supprimable (0024) : les
    // portefeuilles de test partent d'abord.
    if (created.users.length > 0) {
      const { error } = await admin.from("pay_wallets").delete().in("user_id", created.users);
      console.log(`  portefeuilles de test : ${error ? `ÉCHEC ${error.message}` : "supprimés"}`);
    }
    for (const id of created.users) {
      // Cascade : transactions, commandes, compte revendeur et produits.
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

// Tests de fumée des migrations 0016 à 0028, exécutés DANS une transaction
// ouverte par l'appelant (apply-migrations.mjs) ou, lancé seul, dans une
// transaction qui se termine toujours par ROLLBACK : aucune donnée de test
// n'est conservée.
// Usage : node --env-file=.env.local scripts/smoke-migrations.mjs
import { pathToFileURL } from "node:url";
import { pgClient } from "./db-state.mjs";

const TOPUP = 10000;
const PRICE_A = 3000;
const PRICE_B = 2000;
const ORDER_TOTAL = 2 * PRICE_A + PRICE_B;

// Exécute `fn` sous l'identité d'un utilisateur (rôle + jeton simulés).
async function as(client, role, userId, fn) {
  // Comme un vrai jeton service_role, l'identité serveur n'a pas de `sub`.
  const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
  await client.query("select set_config('request.jwt.claims', $1, true)", [claims]);
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
  await client.query(`set local role ${role}`);
  try {
    return await fn();
  } finally {
    // Sans effet si la transaction est en erreur : le rollback to savepoint
    // de expectError() rétablit alors le rôle.
    await client.query("reset role").catch(() => {});
  }
}

// Renvoie l'erreur attendue (ou null si l'action a réussi), sans casser la transaction.
async function expectError(client, fn) {
  await client.query("savepoint smoke_expect");
  try {
    await fn();
    await client.query("release savepoint smoke_expect");
    return null;
  } catch (err) {
    await client.query("rollback to savepoint smoke_expect");
    await client.query("reset role");
    return err;
  }
}

async function one(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0];
}

async function balanceOf(client, userId) {
  const row = await one(
    client,
    "select balance from public.pay_wallets where user_id = $1 and type = 'personal'",
    [userId],
  );
  return row ? Number(row.balance) : null;
}

async function escrowBalance(client, projectId) {
  const row = await one(
    client,
    "select balance from public.pay_wallets where project_id = $1 and type = 'escrow'",
    [projectId],
  );
  return row ? Number(row.balance) : null;
}

async function platformBalance(client) {
  const row = await one(client, "select balance from public.pay_wallets where type = 'platform'");
  return row ? Number(row.balance) : null;
}

async function createUser(client, label) {
  const row = await one(
    client,
    `insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, now(), now())
     returning id`,
    [`smoke-${label}-${Date.now()}@assoshop.invalid`],
  );
  return row.id;
}

// Renvoie la liste [{ name, ok, detail }]. À appeler dans une transaction.
export async function runSmokeTests(client) {
  const results = [];
  const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

  const buyer = await createUser(client, "acheteur");
  const seller = await createUser(client, "revendeur");
  const outsider = await createUser(client, "tiers");
  const platformBefore = await platformBalance(client);
  check("portefeuille plateforme unique présent", platformBefore !== null);

  // ---- 1. Écriture directe dans pay_wallets refusée ----
  await as(client, "authenticated", buyer, () => client.query("select public.pay_ensure_wallet()"));
  check("portefeuille créé par pay_ensure_wallet", (await balanceOf(client, buyer)) === 0);

  let err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("update public.pay_wallets set balance = 999999 where user_id = $1", [buyer]),
    ),
  );
  check("UPDATE direct de pay_wallets refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query(
        "insert into public.pay_wallets (user_id, type, balance) values ($1, 'savings', 999999)",
        [buyer],
      ),
    ),
  );
  check("INSERT direct dans pay_wallets refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query(
        "insert into public.pay_transactions (user_id, type, amount, reference) values ($1, 'topup', 999999, 'SMOKE-FAKE')",
        [buyer],
      ),
    ),
  );
  check("INSERT direct dans pay_transactions refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");
  check("solde inchangé après les tentatives", (await balanceOf(client, buyer)) === 0);

  // ---- 2. Recharge : pending sans crédit, confirmation serveur unique ----
  const topup = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.pay_topup($1)", [TOPUP]),
  );
  const fee = Number(topup.commission);
  check("pay_topup crée une transaction pending", topup.status === "pending" && topup.type === "topup", `statut ${topup.status}`);
  check("pay_topup ne crédite rien", (await balanceOf(client, buyer)) === 0, `solde ${await balanceOf(client, buyer)}`);

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_confirm_topup($1)", [topup.reference]),
    ),
  );
  check("pay_confirm_topup refusée à un utilisateur", err?.code === "42501", err ? `${err.code} ${err.message}` : "acceptée !");

  const confirmed = await as(client, "service_role", null, () =>
    one(client, "select * from public.pay_confirm_topup($1)", [topup.reference]),
  );
  check("pay_confirm_topup (service_role) confirme", confirmed.status === "confirmed");
  check(
    "portefeuille crédité du montant net",
    (await balanceOf(client, buyer)) === TOPUP - fee,
    `solde ${await balanceOf(client, buyer)}, attendu ${TOPUP - fee}`,
  );

  await as(client, "service_role", null, () =>
    client.query("select public.pay_confirm_topup($1)", [topup.reference]),
  );
  check(
    "seconde confirmation sans double crédit",
    (await balanceOf(client, buyer)) === TOPUP - fee,
    `solde ${await balanceOf(client, buyer)}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query("select public.pay_topup(0)")),
  );
  check("pay_topup refuse un montant nul", err?.code === "PY001", err ? err.code : "accepté !");

  // ---- 3. Marché : total calculé en base, paiement partagé ----
  const reseller = await one(
    client,
    "insert into public.market_resellers (user_id, company_name, validated_at) values ($1, 'Revendeur de test', now()) returning id",
    [seller],
  );
  const productA = await one(
    client,
    "insert into public.market_products (reseller_id, name, retail_price, wholesale_price, stock, status) values ($1, 'Produit A (test)', $2, $2, 100, 'published') returning id",
    [reseller.id, PRICE_A],
  );
  const productB = await one(
    client,
    "insert into public.market_products (reseller_id, name, retail_price, wholesale_price, stock, status) values ($1, 'Produit B (test)', $2, $2, 100, 'published') returning id",
    [reseller.id, PRICE_B],
  );

  // Le navigateur tente d'imposer un prix et un total : ils doivent être ignorés.
  const items = JSON.stringify([
    { product_id: productA.id, quantity: 2, unit_price: 1, total: 1 },
    { product_id: productB.id, quantity: 1, unit_price: 1 },
  ]);
  const order = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_create_order($1::jsonb)", [items]),
  );
  check(
    "market_create_order calcule le total en base",
    Number(order.total) === ORDER_TOTAL && order.paid === false && order.status === "pending_payment",
    `total ${order.total}, attendu ${ORDER_TOTAL}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("update public.market_orders set paid = true, total = 1 where id = $1", [order.id]),
    ),
  );
  check("UPDATE direct de market_orders refusé (acheteur)", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query(
        "insert into public.market_orders (buyer_id, reseller_id, total, paid, status) values ($1, $2, 1, true, 'confirmed')",
        [buyer, reseller.id],
      ),
    ),
  );
  check("INSERT direct dans market_orders refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  const rate = Number(
    (await one(client, "select rate from public.admin_commissions where service = 'Commission revendeur B2B'"))?.rate,
  );
  const commission = Math.round((ORDER_TOTAL * rate) / 100);
  const buyerBefore = await balanceOf(client, buyer);

  const paid = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_pay_order($1)", [order.id]),
  );
  check("market_pay_order marque la commande payée", paid.paid === true && paid.status === "confirmed");
  check(
    "acheteur débité du total",
    (await balanceOf(client, buyer)) === buyerBefore - ORDER_TOTAL,
    `solde ${await balanceOf(client, buyer)}, attendu ${buyerBefore - ORDER_TOTAL}`,
  );
  check(
    `revendeur crédité du total moins la commission (${rate} % = ${commission})`,
    (await balanceOf(client, seller)) === ORDER_TOTAL - commission,
    `solde ${await balanceOf(client, seller)}, attendu ${ORDER_TOTAL - commission}`,
  );

  const lines = (
    await client.query(
      "select id, user_id, type, amount, commission from public.pay_transactions where module = 'market' and user_id in ($1, $2) order by type",
      [buyer, seller],
    )
  ).rows;
  const payment = lines.find((l) => l.type === "payment" && l.user_id === buyer);
  const receipt = lines.find((l) => l.type === "receipt" && l.user_id === seller);
  check(
    "deux lignes pay_transactions (paiement + encaissement)",
    lines.length === 2 &&
      Number(payment?.amount) === ORDER_TOTAL &&
      Number(receipt?.amount) === ORDER_TOTAL - commission &&
      Number(receipt?.commission) === commission,
    JSON.stringify(lines.map((l) => ({ type: l.type, amount: l.amount, commission: l.commission }))),
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_pay_order($1)", [order.id]),
    ),
  );
  check("second paiement de la même commande refusé", err?.code === "PY007", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_cancel_order($1)", [order.id]),
    ),
  );
  check("annulation d'une commande payée refusée", err?.code === "PY008", err ? err.code : "acceptée !");

  err = await expectError(client, () =>
    as(client, "authenticated", seller, () =>
      client.query("select public.market_advance_order($1, 'delivered')", [order.id]),
    ),
  );
  check("saut d'étape logistique refusé", err?.code === "PY008", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("select public.market_advance_order($1, 'shipped')", [order.id]),
    ),
  );
  check("avancement par un tiers refusé", err?.code === "PY006", err ? err.code : "accepté !");

  const shipped = await as(client, "authenticated", seller, () =>
    one(client, "select * from public.market_advance_order($1, 'shipped')", [order.id]),
  );
  check(
    "le revendeur avance d'une étape sans toucher à paid ni total",
    shipped.status === "shipped" && shipped.paid === true && Number(shipped.total) === ORDER_TOTAL,
  );

  // ---- 4. Adhésions : pas d'auto-promotion admin ----
  const orgId = (await one(client, "select gen_random_uuid() as id")).id;
  await as(client, "authenticated", buyer, () =>
    client.query("insert into public.organizations (id, name) values ($1, 'Organisation de test')", [orgId]),
  );
  const org = await one(client, "select created_by from public.organizations where id = $1", [orgId]);
  check("organizations.created_by renseigné automatiquement", org.created_by === buyer);

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query(
        "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin')",
        [orgId, outsider],
      ),
    ),
  );
  check(
    "un tiers ne peut pas s'inscrire admin d'une organisation qu'il n'a pas créée",
    err?.code === "42501",
    err ? `${err.code} ${err.message}` : "accepté !",
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query(
        "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin')",
        [orgId, buyer],
      ),
    ),
  );
  check("le créateur devient admin de son organisation", err === null, err ? `${err.code} ${err.message}` : "");

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query(
        "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin')",
        [orgId, outsider],
      ),
    ),
  );
  check(
    "toujours refusé une fois l'organisation dotée d'un admin",
    err?.code === "42501",
    err ? `${err.code} ${err.message}` : "accepté !",
  );

  // ---- 5. Journal d'audit et Control Plane ----
  const member = await one(
    client,
    "insert into public.members (organization_id, user_id, name, status, role) values ($1, $2, 'Membre de test', 'active', 'member') returning id",
    [orgId, outsider],
  );
  await as(client, "authenticated", buyer, () =>
    client.query("update public.members set role = 'treasurer' where id = $1", [member.id]),
  );

  const events = (
    await client.query(
      "select event_type, actor_id, organization_id, amount from public.audit_events where entity_id = any($1::uuid[]) order by created_at",
      [[topup.id, order.id, member.id, payment?.id ?? topup.id]],
    )
  ).rows;
  const types = events.map((e) => e.event_type);
  for (const expected of ["pay.topup", "pay.topup_confirmed", "pay.payment", "market.order_paid", "member.role_changed"]) {
    check(`audit_events contient ${expected}`, types.includes(expected), `reçus : ${types.join(", ")}`);
  }
  const roleEvent = events.find((e) => e.event_type === "member.role_changed");
  check(
    "l'événement de rôle porte l'auteur et l'organisation",
    roleEvent?.actor_id === buyer && roleEvent?.organization_id === orgId,
  );

  const outbox = await one(
    client,
    "select count(*)::int as n from public.control_plane_outbox where kind = 'audit_log' and payload->>'source' = 'activity' and (payload->'record'->>'entity_id')::uuid = any($1::uuid[])",
    [[topup.id, order.id, member.id, payment?.id ?? topup.id]],
  );
  check(
    "control_plane_outbox reçoit les événements (source activity)",
    outbox.n === events.length && outbox.n >= 5,
    `${outbox.n} ligne(s) pour ${events.length} événement(s)`,
  );

  const visibleToAdmin = await as(client, "authenticated", buyer, () =>
    one(client, "select count(*)::int as n from public.audit_events where organization_id = $1", [orgId]),
  );
  const visibleToOutsider = await as(client, "authenticated", outsider, () =>
    one(client, "select count(*)::int as n from public.audit_events where organization_id = $1", [orgId]),
  );
  check(
    "journal lisible par l'admin de l'organisation, pas par un tiers",
    visibleToAdmin.n >= 1 && visibleToOutsider.n === 0,
    `admin ${visibleToAdmin.n}, tiers ${visibleToOutsider.n}`,
  );

  err = await expectError(client, () =>
    client.query("update public.audit_events set amount = 0 where entity_id = $1", [member.id]),
  );
  check("audit_events en ajout seul (UPDATE refusé)", err?.code === "AU001", err ? err.code : "accepté !");
  err = await expectError(client, () =>
    client.query("delete from public.audit_events where entity_id = $1", [member.id]),
  );
  check("audit_events en ajout seul (DELETE refusé)", err?.code === "AU001", err ? err.code : "accepté !");

  const metrics = (await one(client, "select public.cp_metrics_snapshot() as m")).m;
  check(
    "cp_metrics_snapshot() répond avec audit_events_24h",
    metrics && Number(metrics.audit_events_24h) >= events.length,
    `audit_events_24h = ${metrics?.audit_events_24h}`,
  );

  // ---- 7. Portefeuille plateforme (0021) ----
  const platformAfter = await platformBalance(client);
  check(
    "portefeuille plateforme crédité des commissions (recharge + vente)",
    platformAfter === platformBefore + fee + commission,
    `solde ${platformAfter}, attendu ${platformBefore + fee + commission}`,
  );
  const platformVisible = await as(client, "authenticated", buyer, () =>
    one(client, "select count(*)::int as n from public.pay_wallets where type = 'platform'"),
  );
  check("portefeuille plateforme invisible pour un utilisateur", platformVisible.n === 0, `${platformVisible.n} ligne(s) visibles`);

  const beforeWithdraw = await platformBalance(client);
  // Depuis 0027, le retrait n'est appelable que par le serveur (service_role).
  const withdrawal = await as(client, "service_role", null, () =>
    one(client, "select * from public.pay_withdraw($1, 1000)", [buyer]),
  );
  check(
    "la commission de retrait va au portefeuille plateforme",
    (await platformBalance(client)) === beforeWithdraw + Number(withdrawal.commission) && Number(withdrawal.commission) > 0,
    `commission ${withdrawal.commission}`,
  );

  // ---- 8. Stock et quantité minimale (0021) ----
  const stockA = await one(client, "select stock from public.market_products where id = $1", [productA.id]);
  const stockB = await one(client, "select stock from public.market_products where id = $1", [productB.id]);
  check("stock décrémenté au paiement", stockA.stock === 98 && stockB.stock === 99, `A ${stockA.stock}, B ${stockB.stock}`);

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_create_order($1::jsonb)", [
        JSON.stringify([{ product_id: productA.id, quantity: 500 }]),
      ]),
    ),
  );
  check("commande au-delà du stock refusée", err?.code === "PY016", err ? err.code : "acceptée !");

  const productMin = await one(
    client,
    "insert into public.market_products (reseller_id, name, retail_price, wholesale_price, stock, min_order_quantity, status) values ($1, 'Produit lot (test)', 100, 100, 50, 5, 'published') returning id",
    [reseller.id],
  );
  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_create_order($1::jsonb)", [
        JSON.stringify([{ product_id: productMin.id, quantity: 2 }]),
      ]),
    ),
  );
  check("commande sous la quantité minimale refusée", err?.code === "PY017", err ? err.code : "acceptée !");

  // Deux commandes se partagent un stock de 3 : la seconde échoue au paiement.
  const productRare = await one(
    client,
    "insert into public.market_products (reseller_id, name, retail_price, wholesale_price, stock, status) values ($1, 'Produit rare (test)', 100, 100, 3, 'published') returning id",
    [reseller.id],
  );
  const rareItems = JSON.stringify([{ product_id: productRare.id, quantity: 2 }]);
  const first = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_create_order($1::jsonb)", [rareItems]),
  );
  const second = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_create_order($1::jsonb)", [rareItems]),
  );
  await as(client, "authenticated", buyer, () =>
    client.query("select public.market_pay_order($1)", [first.id]),
  );
  const balanceBeforeSecond = await balanceOf(client, buyer);
  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_pay_order($1)", [second.id]),
    ),
  );
  const rareStock = await one(client, "select stock from public.market_products where id = $1", [productRare.id]);
  check(
    "paiement refusé si le stock est devenu insuffisant, sans débit",
    err?.code === "PY016" && rareStock.stock === 1 && (await balanceOf(client, buyer)) === balanceBeforeSecond,
    `${err ? err.code : "accepté !"}, stock ${rareStock.stock}`,
  );

  // ---- 9. Transfert vers un destinataire réel (0021) ----
  const senderBefore = await balanceOf(client, buyer);
  const transfer = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.pay_transfer(500, $1::uuid)", [outsider]),
  );
  check(
    "transfert par identifiant utilisateur : émetteur débité, destinataire crédité",
    transfer.type === "transfer" &&
      (await balanceOf(client, buyer)) === senderBefore - 500 &&
      (await balanceOf(client, outsider)) === 500,
    `émetteur ${await balanceOf(client, buyer)}, destinataire ${await balanceOf(client, outsider)}`,
  );
  const receiptLine = await one(
    client,
    "select count(*)::int as n from public.pay_transactions where user_id = $1 and type = 'receipt' and amount = 500 and module = 'pay'",
    [outsider],
  );
  check("le destinataire a sa ligne d'encaissement", receiptLine.n === 1);

  await as(client, "authenticated", buyer, () =>
    client.query("select public.pay_transfer(200, null, $1::uuid)", [member.id]),
  );
  check(
    "transfert vers un membre d'une organisation commune",
    (await balanceOf(client, outsider)) === 700,
    `destinataire ${await balanceOf(client, outsider)}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", seller, () =>
      client.query("select public.pay_transfer(100, null, $1::uuid)", [member.id]),
    ),
  );
  check("membre d'une organisation non commune refusé", err?.code === "PY014", err ? err.code : "accepté !");

  // 0022 : par identifiant utilisateur, uniquement vers une organisation commune.
  const senderBeforeRefusal = await balanceOf(client, buyer);
  const sellerBeforeRefusal = await balanceOf(client, seller);
  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_transfer(100, $1::uuid)", [seller]),
    ),
  );
  check(
    "transfert par identifiant vers un compte sans organisation commune refusé, sans débit",
    err?.code === "PY014" &&
      (await balanceOf(client, buyer)) === senderBeforeRefusal &&
      (await balanceOf(client, seller)) === sellerBeforeRefusal,
    err ? err.code : "accepté !",
  );

  err = await expectError(client, () =>
    as(client, "authenticated", seller, () =>
      client.query("select public.pay_transfer(100, $1::uuid)", [buyer]),
    ),
  );
  check("même refus dans l'autre sens (émetteur sans organisation commune)", err?.code === "PY014", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_shares_organization($1, $2)", [buyer, seller]),
    ),
  );
  check("pay_shares_organization non appelable par un utilisateur", err?.code === "42501", err ? err.code : "acceptée !");

  // Le même compte, une fois membre de l'organisation de l'émetteur, est accepté.
  await client.query(
    "insert into public.members (organization_id, user_id, name, status, role) values ($1, $2, 'Revendeur membre (test)', 'active', 'member')",
    [orgId, seller],
  );
  const sharedTransfer = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.pay_transfer(20, $1::uuid)", [seller]),
  );
  check(
    "transfert par identifiant accepté une fois l'organisation commune",
    sharedTransfer.type === "transfer" &&
      sharedTransfer.counterparty === "Revendeur membre (test)" &&
      (await balanceOf(client, seller)) === sellerBeforeRefusal + 20 &&
      (await balanceOf(client, buyer)) === senderBeforeRefusal - 20,
    `émetteur ${await balanceOf(client, buyer)}, destinataire ${await balanceOf(client, seller)}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_transfer(100, $1::uuid)", [buyer]),
    ),
  );
  check("transfert vers soi-même refusé", err?.code === "PY013", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_transfer(100, gen_random_uuid())"),
    ),
  );
  check("destinataire inconnu refusé", err?.code === "PY014", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_transfer(100, 'Mamadou'::text)"),
    ),
  );
  check("destinataire en libellé libre impossible", err !== null, "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.pay_transfer(100000000, $1::uuid)", [outsider]),
    ),
  );
  check("transfert au-delà du solde refusé", err?.code === "PY003", err ? err.code : "accepté !");

  // ---- 10. Commandes groupées, investissement, retraits (0021) ----
  const group = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_create_group_order($1, 2)", [productA.id]),
  );
  check(
    "commande groupée créée au prix du produit",
    group.status === "open" && Number(group.unit_price) === PRICE_A && group.creator_id === buyer,
    `statut ${group.status}, prix ${group.unit_price}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("update public.market_group_orders set unit_price = 1, status = 'closed' where id = $1", [group.id]),
    ),
  );
  check("UPDATE direct d'une commande groupée refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  const joined = await as(client, "authenticated", outsider, () =>
    one(client, "select * from public.market_join_group_order($1)", [group.id]),
  );
  check("commande groupée confirmée au minimum de participants (RG-M02)", joined.status === "confirmed", `statut ${joined.status}`);

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("select public.market_close_group_order($1)", [group.id]),
    ),
  );
  check("clôture par un simple participant refusée", err?.code === "PY006", err ? err.code : "acceptée !");
  const closed = await as(client, "authenticated", seller, () =>
    one(client, "select * from public.market_close_group_order($1)", [group.id]),
  );
  check("clôture par le revendeur concerné", closed.status === "closed");

  const project = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.market_create_investment_project('Projet de test', '', 'agriculture', 5000, 'GNF', 'Règles v1', current_date + 30)"),
  );
  check("projet d'investissement créé avec son créateur", project.created_by === buyer && project.rules_locked === false);

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("update public.market_investment_projects set raised_amount = 999999, profit_sharing_rules = 'piraté' where id = $1", [project.id]),
    ),
  );
  check("UPDATE direct d'un projet refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("select public.market_update_investment_rules($1, 'piraté')", [project.id]),
    ),
  );
  check("règles modifiables par le seul créateur", err?.code === "PY006", err ? err.code : "accepté !");

  // 0022 : la contribution est payée (portefeuille débité, séquestre crédité).
  const investorBefore = await balanceOf(client, outsider);
  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () =>
      client.query("select public.market_invest($1, $2)", [project.id, investorBefore + 1]),
    ),
  );
  const untouched = await one(client, "select raised_amount, rules_locked from public.market_investment_projects where id = $1", [project.id]);
  check(
    "investissement au-delà du solde refusé, sans contribution ni débit",
    err?.code === "PY003" &&
      (await balanceOf(client, outsider)) === investorBefore &&
      Number(untouched.raised_amount) === 0 &&
      untouched.rules_locked === false &&
      (await escrowBalance(client, project.id)) === null,
    err ? err.code : "accepté !",
  );

  const invested = await as(client, "authenticated", outsider, () =>
    one(client, "select * from public.market_invest($1, 300)", [project.id]),
  );
  check("investissement enregistré, règles verrouillées (RG-M05)", Number(invested.raised_amount) === 300 && invested.rules_locked === true);
  check(
    "investisseur débité du montant investi",
    (await balanceOf(client, outsider)) === investorBefore - 300,
    `solde ${await balanceOf(client, outsider)}, attendu ${investorBefore - 300}`,
  );
  check(
    "compte de séquestre du projet crédité du même montant",
    (await escrowBalance(client, project.id)) === 300,
    `séquestre ${await escrowBalance(client, project.id)}`,
  );
  const contribution = await one(
    client,
    `select c.amount, t.type, t.status, t.amount as paid, t.module, t.user_id
     from public.market_investment_contributions c
     left join public.pay_transactions t on t.id = c.transaction_id
     where c.project_id = $1 and c.user_id = $2`,
    [project.id, outsider],
  );
  check(
    "la contribution référence son paiement (pay_transactions)",
    Number(contribution?.amount) === 300 &&
      contribution?.type === "payment" &&
      contribution?.status === "confirmed" &&
      Number(contribution?.paid) === 300 &&
      contribution?.module === "market" &&
      contribution?.user_id === outsider,
    JSON.stringify(contribution),
  );

  await as(client, "authenticated", buyer, () =>
    client.query("select public.market_invest($1, 10)", [project.id]),
  );
  const projectNow = await one(client, "select raised_amount from public.market_investment_projects where id = $1", [project.id]);
  check(
    "le séquestre égale le montant collecté après deux investisseurs",
    (await escrowBalance(client, project.id)) === 310 && Number(projectNow.raised_amount) === 310,
    `séquestre ${await escrowBalance(client, project.id)}, collecté ${projectNow.raised_amount}`,
  );

  const escrowVisible = await as(client, "authenticated", buyer, () =>
    one(client, "select count(*)::int as n from public.pay_wallets where type = 'escrow'"),
  );
  check("compte de séquestre invisible pour un utilisateur (créateur compris)", escrowVisible.n === 0, `${escrowVisible.n} ligne(s) visibles`);

  err = await expectError(client, () =>
    client.query("delete from public.market_investment_projects where id = $1", [project.id]),
  );
  check("projet non supprimable tant que son séquestre existe", err?.code === "23503", err ? err.code : "supprimé !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () =>
      client.query("select public.market_update_investment_rules($1, 'Règles v2')", [project.id]),
    ),
  );
  check("règles figées après le premier investissement", err?.code === "PY019", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", seller, () =>
      client.query(
        "insert into public.market_pickup_records (order_id, tracking_code, status) values ($1, 'FAUX', 'delivered')",
        [order.id],
      ),
    ),
  );
  check("écriture directe du suivi de retrait refusée", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  // ---- 11. Candidature revendeur (0022, RG-M01) ----
  const candidate = await createUser(client, "candidat");
  const platformAdmin = await createUser(client, "admin");
  await client.query("insert into public.platform_admins (user_id, role) values ($1, 'admin')", [platformAdmin]);
  const SUBMIT = "select * from public.market_submit_reseller_application('Société de test', 'Contact de test', 'CNI-TEST', 'agriculture', 'Guinée', 'Conakry')";
  const REVIEW = "select * from public.market_review_reseller_application($1, $2)";
  const resellerCount = async (userId) =>
    (await one(client, "select count(*)::int as n from public.market_resellers where user_id = $1", [userId])).n;

  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () =>
      client.query(
        "insert into public.market_reseller_applications (user_id, company_name, contact_name, status) values ($1, 'Faux', 'Faux', 'approved')",
        [candidate],
      ),
    ),
  );
  check("INSERT direct d'une candidature (déjà « approved ») refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  const application = await as(client, "authenticated", candidate, () => one(client, SUBMIT));
  check("candidature déposée en attente", application.status === "pending" && application.user_id === candidate, `statut ${application.status}`);

  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () =>
      client.query("update public.market_reseller_applications set status = 'approved' where user_id = $1", [candidate]),
    ),
  );
  check("le candidat ne peut pas modifier le statut de sa candidature", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () =>
      client.query(
        "insert into public.market_resellers (user_id, company_name, validated_at) values ($1, 'Auto-proclamé', now())",
        [candidate],
      ),
    ),
  );
  check("INSERT direct dans market_resellers refusé", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () =>
      client.query("insert into public.platform_admins (user_id, role) values ($1, 'admin')", [candidate]),
    ),
  );
  check("un utilisateur ne peut pas s'inscrire administrateur de la plateforme", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () => client.query(REVIEW, [application.id, "approved"])),
  );
  check("le candidat ne peut pas approuver sa candidature", err?.code === "PY006", err ? err.code : "accepté !");

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query(REVIEW, [application.id, "approved"])),
  );
  check("un tiers non administrateur ne peut pas approuver", err?.code === "PY006", err ? err.code : "accepté !");
  check("aucun compte revendeur créé par ces tentatives", (await resellerCount(candidate)) === 0);

  err = await expectError(client, () =>
    as(client, "authenticated", platformAdmin, () => client.query(REVIEW, [application.id, "pending"])),
  );
  check("décision autre qu'approuver ou refuser rejetée", err?.code === "PY009", err ? err.code : "acceptée !");

  const ownApplication = await as(client, "authenticated", platformAdmin, () => one(client, SUBMIT));
  err = await expectError(client, () =>
    as(client, "authenticated", platformAdmin, () => client.query(REVIEW, [ownApplication.id, "approved"])),
  );
  check(
    "un administrateur ne peut pas approuver sa propre candidature",
    err?.code === "PY006" && (await resellerCount(platformAdmin)) === 0,
    err ? err.code : "accepté !",
  );

  const rejected = await as(client, "authenticated", platformAdmin, () =>
    one(client, REVIEW, [application.id, "rejected"]),
  );
  check(
    "refus par un administrateur : aucun compte revendeur",
    rejected.status === "rejected" && rejected.reviewed_at !== null && (await resellerCount(candidate)) === 0,
    `statut ${rejected.status}`,
  );

  const resubmitted = await as(client, "authenticated", candidate, () => one(client, SUBMIT));
  check("une candidature refusée peut être redéposée (en attente)", resubmitted.status === "pending" && resubmitted.id === application.id);

  const approved = await as(client, "authenticated", platformAdmin, () =>
    one(client, REVIEW, [application.id, "approved"]),
  );
  const createdReseller = await one(
    client,
    `select r.id, r.validated_at, r.company_name,
            (select count(*)::int from public.market_reseller_settings s where s.reseller_id = r.id) as settings
     from public.market_resellers r where r.user_id = $1`,
    [candidate],
  );
  check(
    "approbation par un administrateur : compte revendeur validé et paramètres créés",
    approved.status === "approved" &&
      Boolean(createdReseller?.validated_at) &&
      createdReseller?.company_name === "Société de test" &&
      createdReseller?.settings === 1,
    JSON.stringify(createdReseller),
  );

  const adminEmail = (await one(client, "select email from auth.users where id = $1", [platformAdmin])).email;
  const auditRows = (
    await client.query(
      "select actor, action, module from public.admin_audit_logs where action in ($1, $2)",
      [`review_reseller:rejected:${application.id}`, `review_reseller:approved:${application.id}`],
    )
  ).rows;
  check(
    "les deux décisions sont journalisées dans admin_audit_logs, avec leur auteur",
    auditRows.length === 2 &&
      new Set(auditRows.map((r) => r.action)).size === 2 &&
      auditRows.every((r) => r.actor === adminEmail && r.module === "market"),
    JSON.stringify(auditRows),
  );

  err = await expectError(client, () =>
    as(client, "authenticated", platformAdmin, () => client.query(REVIEW, [application.id, "rejected"])),
  );
  check("une candidature approuvée ne se rejuge pas", err?.code === "PY019", err ? err.code : "accepté !");
  err = await expectError(client, () =>
    as(client, "authenticated", candidate, () => client.query(SUBMIT)),
  );
  check("une candidature approuvée ne se redépose pas", err?.code === "PY019", err ? err.code : "accepté !");

  // ---- 12. Séquestre des investissements : dénouement tout ou rien (0023) ----
  const SETTLE = "select public.market_settle_due_investments() as r";
  const settle = () => as(client, "service_role", null, async () => (await one(client, SETTLE)).r);
  const projectRow = (id) =>
    one(client, "select status, settled_at, released_amount, commission_amount, raised_amount from public.market_investment_projects where id = $1", [id]);
  const expire = (id) =>
    client.query("update public.market_investment_projects set deadline = current_date - 1 where id = $1", [id]);
  const auditOf = async (entityId, eventType) =>
    (await client.query("select amount, after from public.audit_events where entity_id = $1 and event_type = $2", [entityId, eventType])).rows;

  for (const [label, sql] of [
    ["sans date limite", "select public.market_create_investment_project('Sans échéance', '', 'commerce', 1000, 'GNF', 'Règles')"],
    ["avec une date limite non future", "select public.market_create_investment_project('Échéance du jour', '', 'commerce', 1000, 'GNF', 'Règles', current_date)"],
    ["sans montant recherché", "select public.market_create_investment_project('Sans objectif', '', 'commerce', 0, 'GNF', 'Règles', current_date + 30)"],
  ]) {
    err = await expectError(client, () => as(client, "authenticated", buyer, () => client.query(sql)));
    check(`création d'un projet ${label} refusée`, err?.code === "PY009", err ? err.code : "acceptée !");
  }

  const investRate = Number(
    (await one(client, "select rate from public.admin_commissions where service = 'Commission investissement'"))?.rate,
  );
  check("service « Commission investissement » présent (1 %)", investRate === 1, `taux ${investRate}`);
  const shownRate = await as(client, "authenticated", outsider, () =>
    one(client, "select public.market_investment_commission_rate() as rate"),
  );
  check("taux de commission lisible avant d'investir (RG-P03)", Number(shownRate.rate) === investRate, `taux ${shownRate.rate}`);

  const metricsEscrow = (await one(client, "select public.cp_metrics_snapshot() as m")).m;
  const escrowSum = Number((await one(client, "select coalesce(sum(balance), 0) as total from public.pay_wallets where type = 'escrow'")).total);
  check(
    "cp_metrics_snapshot() expose le total bloqué en séquestre",
    Number(metricsEscrow?.investment_escrow_balance) === escrowSum && escrowSum >= 310,
    `métrique ${metricsEscrow?.investment_escrow_balance}, séquestres ${escrowSum}`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query(SETTLE)),
  );
  check("dénouement non appelable par un utilisateur", err?.code === "42501", err ? err.code : "accepté !");
  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query("select public.market_settle_investment_project($1)", [project.id])),
  );
  check("dénouement d'un projet non appelable par son porteur", err?.code === "42501", err ? err.code : "accepté !");

  // 12.a Objectif non atteint : remboursement intégral.
  await settle();
  check(
    "aucun dénouement avant la date limite",
    (await projectRow(project.id)).settled_at === null && (await escrowBalance(client, project.id)) === 310,
    `séquestre ${await escrowBalance(client, project.id)}`,
  );

  await expire(project.id);
  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () => client.query("select public.market_invest($1, 10)", [project.id])),
  );
  check("investissement refusé après la date limite", err?.code === "PY019", err ? err.code : "accepté !");

  const outsiderBeforeRefund = await balanceOf(client, outsider);
  const buyerBeforeRefund = await balanceOf(client, buyer);
  const platformBeforeRefund = await platformBalance(client);
  const refundRun = await settle();
  const refundedProject = await projectRow(project.id);
  check(
    "objectif non atteint à l'échéance : projet remboursé",
    refundRun.refunded === 1 && refundRun.failed.length === 0 && refundedProject.status === "refunded" && refundedProject.settled_at !== null,
    JSON.stringify(refundRun),
  );
  check(
    "chaque investisseur remboursé intégralement, sans commission",
    (await balanceOf(client, outsider)) === outsiderBeforeRefund + 300 &&
      (await balanceOf(client, buyer)) === buyerBeforeRefund + 10 &&
      (await escrowBalance(client, project.id)) === 0 &&
      (await platformBalance(client)) === platformBeforeRefund,
    `investisseurs ${await balanceOf(client, outsider)} / ${await balanceOf(client, buyer)}, séquestre ${await escrowBalance(client, project.id)}`,
  );
  const refundLines = (
    await client.query(
      `select c.amount, c.refunded_at, t.type, t.status, t.amount as paid, t.user_id = c.user_id as same_user
       from public.market_investment_contributions c
       left join public.pay_transactions t on t.id = c.refund_transaction_id
       where c.project_id = $1`,
      [project.id],
    )
  ).rows;
  check(
    "chaque remboursement est écrit dans pay_transactions",
    refundLines.length === 2 &&
      refundLines.every((l) => l.refunded_at !== null && l.type === "receipt" && l.status === "confirmed" && Number(l.paid) === Number(l.amount) && l.same_user),
    JSON.stringify(refundLines),
  );
  const refundAudit = await auditOf(project.id, "investment.refunded");
  check(
    "audit_events contient investment.refunded",
    refundAudit.length === 1 && Number(refundAudit[0].amount) === 310 && refundAudit[0].after?.status === "refunded",
    JSON.stringify(refundAudit),
  );

  const refundRerun = await settle();
  const refundCount = await one(client, "select count(*)::int as n from public.pay_transactions where description = 'Remboursement d''investissement' and user_id in ($1, $2)", [outsider, buyer]);
  check(
    "second passage : aucun double remboursement",
    refundRerun.refunded === 0 &&
      refundCount.n === 2 &&
      (await balanceOf(client, outsider)) === outsiderBeforeRefund + 300 &&
      (await balanceOf(client, buyer)) === buyerBeforeRefund + 10 &&
      (await auditOf(project.id, "investment.refunded")).length === 1,
    `${JSON.stringify(refundRerun)}, ${refundCount.n} remboursement(s)`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query("select public.market_declare_investment_profit($1, 100)", [project.id])),
  );
  check("pas de bénéfice à déclarer sur un projet remboursé", err?.code === "PY019", err ? err.code : "accepté !");

  // 12.b Objectif atteint : versement au porteur, commission à la plateforme.
  const funded = await as(client, "authenticated", seller, () =>
    one(client, "select * from public.market_create_investment_project('Projet financé (test)', '', 'commerce', 500, 'GNF', '60 % investisseurs / 40 % porteur', current_date + 10)"),
  );
  await as(client, "authenticated", outsider, () => client.query("select public.market_invest($1, 400)", [funded.id]));
  await as(client, "authenticated", buyer, () => client.query("select public.market_invest($1, 20)", [funded.id]));
  const reached = await as(client, "authenticated", outsider, () =>
    one(client, "select * from public.market_invest($1, 100)", [funded.id]),
  );
  check("objectif atteint : collecte close, en attente de l'échéance", reached.status === "completed" && Number(reached.raised_amount) === 520, `statut ${reached.status}`);

  await settle();
  check(
    "objectif atteint mais échéance non passée : séquestre conservé",
    (await projectRow(funded.id)).settled_at === null && (await escrowBalance(client, funded.id)) === 520,
    `séquestre ${await escrowBalance(client, funded.id)}`,
  );

  await expire(funded.id);
  const investCommission = Math.round((520 * investRate) / 100);
  const sellerBeforeRelease = await balanceOf(client, seller);
  const outsiderBeforeRelease = await balanceOf(client, outsider);
  const platformBeforeRelease = await platformBalance(client);
  const releaseRun = await settle();
  const fundedProject = await projectRow(funded.id);
  check(
    "objectif atteint à l'échéance : projet financé",
    releaseRun.released === 1 && releaseRun.failed.length === 0 && fundedProject.status === "funded" && fundedProject.settled_at !== null,
    JSON.stringify(releaseRun),
  );
  check(
    `porteur crédité du séquestre moins la commission (${investRate} % = ${investCommission})`,
    (await balanceOf(client, seller)) === sellerBeforeRelease + 520 - investCommission &&
      Number(fundedProject.released_amount) === 520 - investCommission &&
      Number(fundedProject.commission_amount) === investCommission,
    `porteur ${await balanceOf(client, seller)}, attendu ${sellerBeforeRelease + 520 - investCommission}`,
  );
  check(
    "commission créditée au portefeuille plateforme, séquestre soldé, investisseurs non recrédités",
    (await platformBalance(client)) === platformBeforeRelease + investCommission &&
      (await escrowBalance(client, funded.id)) === 0 &&
      (await balanceOf(client, outsider)) === outsiderBeforeRelease,
    `plateforme ${await platformBalance(client)}, séquestre ${await escrowBalance(client, funded.id)}`,
  );
  const releaseLine = await one(
    client,
    "select count(*)::int as n, max(amount) as amount, max(commission) as commission from public.pay_transactions where user_id = $1 and type = 'receipt' and module = 'market' and description like 'Versement du séquestre%'",
    [seller],
  );
  check(
    "le versement est écrit dans pay_transactions (net et commission)",
    releaseLine.n === 1 && Number(releaseLine.amount) === 520 - investCommission && Number(releaseLine.commission) === investCommission,
    JSON.stringify(releaseLine),
  );
  const releaseAudit = await auditOf(funded.id, "investment.released");
  check(
    "audit_events contient investment.released",
    releaseAudit.length === 1 && Number(releaseAudit[0].amount) === 520 && Number(releaseAudit[0].after?.commission) === investCommission,
    JSON.stringify(releaseAudit),
  );

  const releaseRerun = await settle();
  const releaseCount = await one(client, "select count(*)::int as n from public.pay_transactions where user_id = $1 and description like 'Versement du séquestre%'", [seller]);
  check(
    "second passage : aucun double versement",
    releaseRerun.released === 0 &&
      releaseCount.n === 1 &&
      (await balanceOf(client, seller)) === sellerBeforeRelease + 520 - investCommission &&
      (await platformBalance(client)) === platformBeforeRelease + investCommission,
    `${JSON.stringify(releaseRerun)}, ${releaseCount.n} versement(s)`,
  );

  // 12.c Bénéfices : déclaration par le porteur, validation par un admin.
  const DECLARE = "select * from public.market_declare_investment_profit($1, $2)";
  const REVIEW_PROFIT = "select * from public.market_review_investment_profit($1, $2)";

  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () => client.query(DECLARE, [funded.id, 100])),
  );
  check("déclaration de bénéfice réservée au porteur", err?.code === "PY006", err ? err.code : "acceptée !");

  const sellerBeforeProfit = await balanceOf(client, seller);
  const outsiderBeforeProfit = await balanceOf(client, outsider);
  const buyerBeforeProfit = await balanceOf(client, buyer);
  const declared = await as(client, "authenticated", seller, () => one(client, DECLARE, [funded.id, 100]));
  check(
    "bénéfice déclaré en attente, sans mouvement de fonds",
    declared.status === "pending" && Number(declared.amount) === 100 && (await balanceOf(client, seller)) === sellerBeforeProfit,
    `statut ${declared.status}`,
  );
  err = await expectError(client, () =>
    as(client, "authenticated", seller, () => client.query(DECLARE, [funded.id, 50])),
  );
  check("une seule déclaration en attente par projet", err?.code === "PY019", err ? err.code : "acceptée !");

  err = await expectError(client, () =>
    as(client, "authenticated", seller, () =>
      client.query("update public.market_investment_distributions set status = 'approved' where id = $1", [declared.id]),
    ),
  );
  check("le porteur ne peut pas valider sa déclaration par écriture directe", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");
  err = await expectError(client, () =>
    as(client, "authenticated", seller, () => client.query(REVIEW_PROFIT, [declared.id, "approved"])),
  );
  check("validation refusée au porteur", err?.code === "PY006", err ? err.code : "acceptée !");
  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () => client.query(REVIEW_PROFIT, [declared.id, "approved"])),
  );
  check("validation refusée à un investisseur", err?.code === "PY006", err ? err.code : "acceptée !");
  check(
    "aucun mouvement après ces tentatives",
    (await balanceOf(client, seller)) === sellerBeforeProfit && (await balanceOf(client, outsider)) === outsiderBeforeProfit,
  );

  // Mises : tiers 500, acheteur 20 (total 520) ; 100 à répartir → 96 et 3.
  const distributed = await as(client, "authenticated", platformAdmin, () =>
    one(client, REVIEW_PROFIT, [declared.id, "approved"]),
  );
  check(
    "validation par un administrateur : répartition au prorata des mises",
    distributed.status === "approved" &&
      Number(distributed.distributed_amount) === 99 &&
      (await balanceOf(client, outsider)) === outsiderBeforeProfit + 96 &&
      (await balanceOf(client, buyer)) === buyerBeforeProfit + 3,
    `distribué ${distributed.distributed_amount}, tiers ${(await balanceOf(client, outsider)) - outsiderBeforeProfit}, acheteur ${(await balanceOf(client, buyer)) - buyerBeforeProfit}`,
  );
  check(
    "porteur débité du seul montant réparti (reliquat d'arrondi non prélevé)",
    (await balanceOf(client, seller)) === sellerBeforeProfit - 99,
    `porteur ${await balanceOf(client, seller)}, attendu ${sellerBeforeProfit - 99}`,
  );
  const shareRows = (
    await client.query(
      `select s.stake, s.amount, t.type, t.amount as paid, t.user_id = s.user_id as same_user
       from public.market_investment_distribution_shares s
       left join public.pay_transactions t on t.id = s.transaction_id
       where s.distribution_id = $1 order by s.stake desc`,
      [declared.id],
    )
  ).rows;
  check(
    "chaque part est tracée et écrite dans pay_transactions",
    shareRows.length === 2 &&
      Number(shareRows[0].stake) === 500 && Number(shareRows[0].amount) === 96 &&
      Number(shareRows[1].stake) === 20 && Number(shareRows[1].amount) === 3 &&
      shareRows.every((r) => r.type === "receipt" && Number(r.paid) === Number(r.amount) && r.same_user),
    JSON.stringify(shareRows),
  );
  const profitAudit = await auditOf(declared.id, "investment.profit_distributed");
  const profitLog = await one(client, "select count(*)::int as n from public.admin_audit_logs where action = $1", [`review_investment_profit:approved:${declared.id}`]);
  check(
    "audit_events contient investment.profit_distributed, décision journalisée",
    profitAudit.length === 1 && Number(profitAudit[0].amount) === 99 && profitLog.n === 1,
    `${JSON.stringify(profitAudit)}, ${profitLog.n} entrée(s) admin`,
  );

  err = await expectError(client, () =>
    as(client, "authenticated", platformAdmin, () => client.query(REVIEW_PROFIT, [declared.id, "approved"])),
  );
  check(
    "seconde validation refusée : aucune double distribution",
    err?.code === "PY019" &&
      (await balanceOf(client, outsider)) === outsiderBeforeProfit + 96 &&
      (await balanceOf(client, seller)) === sellerBeforeProfit - 99,
    err ? err.code : "acceptée !",
  );

  const visibleShares = async (userId) =>
    (await as(client, "authenticated", userId, () =>
      one(client, "select count(*)::int as n from public.market_investment_distribution_shares where distribution_id = $1", [declared.id]),
    )).n;
  check(
    "parts visibles du bénéficiaire et du porteur, pas d'un tiers",
    (await visibleShares(outsider)) === 1 && (await visibleShares(seller)) === 2 && (await visibleShares(candidate)) === 0,
    `investisseur ${await visibleShares(outsider)}, porteur ${await visibleShares(seller)}, tiers ${await visibleShares(candidate)}`,
  );

  // Bénéfice supérieur au solde du porteur : rien n'est distribué.
  const tooMuch = await as(client, "authenticated", seller, () => one(client, DECLARE, [funded.id, 2000000000]));
  const sellerBeforeTooMuch = await balanceOf(client, seller);
  const outsiderBeforeTooMuch = await balanceOf(client, outsider);
  err = await expectError(client, () =>
    as(client, "authenticated", platformAdmin, () => client.query(REVIEW_PROFIT, [tooMuch.id, "approved"])),
  );
  const stillPending = await one(
    client,
    "select d.status, (select count(*)::int from public.market_investment_distribution_shares s where s.distribution_id = d.id) as shares from public.market_investment_distributions d where d.id = $1",
    [tooMuch.id],
  );
  check(
    "bénéfice supérieur au solde du porteur : validation refusée, rien n'est versé",
    err?.code === "PY003" &&
      stillPending.status === "pending" &&
      stillPending.shares === 0 &&
      (await balanceOf(client, seller)) === sellerBeforeTooMuch &&
      (await balanceOf(client, outsider)) === outsiderBeforeTooMuch,
    `${err ? err.code : "acceptée !"}, statut ${stillPending.status}`,
  );
  const rejectedProfit = await as(client, "authenticated", platformAdmin, () =>
    one(client, REVIEW_PROFIT, [tooMuch.id, "rejected"]),
  );
  check(
    "refus par un administrateur : aucun mouvement",
    rejectedProfit.status === "rejected" && rejectedProfit.distributed_amount === null && (await balanceOf(client, seller)) === sellerBeforeTooMuch,
    `statut ${rejectedProfit.status}`,
  );

  // 12.d Abandon par le porteur et échéance sans contribution.
  const abandoned = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.market_create_investment_project('Projet abandonné (test)', '', 'elevage', 1000, 'GNF', 'Règles', current_date + 30)"),
  );
  const outsiderBeforeAbandon = await balanceOf(client, outsider);
  await as(client, "authenticated", outsider, () => client.query("select public.market_invest($1, 50)", [abandoned.id]));
  err = await expectError(client, () =>
    as(client, "authenticated", outsider, () => client.query("select public.market_close_investment_project($1)", [abandoned.id])),
  );
  check("abandon d'un projet réservé à son porteur", err?.code === "PY006", err ? err.code : "accepté !");
  const closedProject = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.market_close_investment_project($1)", [abandoned.id]),
  );
  check(
    "abandon par le porteur : investisseurs remboursés aussitôt",
    closedProject.status === "refunded" &&
      (await balanceOf(client, outsider)) === outsiderBeforeAbandon &&
      (await escrowBalance(client, abandoned.id)) === 0,
    `statut ${closedProject.status}, investisseur ${await balanceOf(client, outsider)}`,
  );

  const empty = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.market_create_investment_project('Projet sans investisseur (test)', '', 'elevage', 1000, 'GNF', 'Règles', current_date + 30)"),
  );
  await expire(empty.id);
  const emptyRun = await settle();
  const emptyProject = await projectRow(empty.id);
  check(
    "échéance sans contribution : projet clôturé, sans mouvement",
    emptyRun.expired === 1 && emptyRun.released === 0 && emptyRun.refunded === 0 && emptyRun.failed.length === 0 && emptyProject.status === "closed" && emptyProject.settled_at !== null,
    JSON.stringify(emptyRun),
  );

  const escrowLeft = Number((await one(client, "select coalesce(sum(balance), 0) as total from public.pay_wallets where type = 'escrow' and project_id = any($1::uuid[])", [[project.id, funded.id, abandoned.id, empty.id]])).total);
  check("plus aucun fonds bloqué sur les séquestres dénoués", escrowLeft === 0, `reste ${escrowLeft}`);

  // ---- 13. Fermeture de compte : suppression refusée, anonymisation (0024) ----
  const blockersOf = async (userId) =>
    (await one(client, "select public.account_deletion_blockers($1) as b", [userId])).b;
  const closeAccount = (userId) =>
    as(client, "service_role", null, async () =>
      (await one(client, "select public.account_close($1) as r", [userId])).r,
    );
  const authUser = (userId) =>
    one(client, "select email, phone, encrypted_password, banned_until, raw_user_meta_data from auth.users where id = $1", [userId]);
  const deleteUser = (userId) =>
    expectError(client, () => client.query("delete from auth.users where id = $1", [userId]));

  const buyerBlockers = await blockersOf(buyer);
  check(
    "motifs de blocage : solde non nul, commande non livrée, part dans un projet",
    ["wallet_balance", "undelivered_order", "project_share"].every((b) => buyerBlockers.includes(b)) && !buyerBlockers.includes("escrow_contribution"),
    buyerBlockers.join(", "),
  );
  const sellerBlockers = await blockersOf(seller);
  check(
    "le porteur d'un projet financé est engagé (part dans un projet)",
    sellerBlockers.includes("project_share") && sellerBlockers.includes("wallet_balance"),
    sellerBlockers.join(", "),
  );
  check("un compte sans engagement n'a aucun motif de blocage", (await blockersOf(candidate)).length === 0, (await blockersOf(candidate)).join(", "));

  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query("select public.account_close($1)", [buyer])),
  );
  check("account_close non appelable par un utilisateur", err?.code === "42501", err ? err.code : "acceptée !");
  err = await expectError(client, () =>
    as(client, "authenticated", buyer, () => client.query("select public.account_deletion_blockers($1)", [seller])),
  );
  check("motifs de blocage d'un tiers non consultables", err?.code === "42501", err ? err.code : "acceptés !");

  const buyerBalanceBeforeDelete = await balanceOf(client, buyer);
  err = await deleteUser(buyer);
  check(
    "suppression directe d'un compte engagé refusée par la base",
    err?.code === "AC001" && (await balanceOf(client, buyer)) === buyerBalanceBeforeDelete,
    err ? `${err.code} ${err.message}` : "supprimé !",
  );

  const cleanUser = await createUser(client, "propre");
  err = await deleteUser(cleanUser);
  const cleanLeft = await one(client, "select count(*)::int as n from auth.users where id = $1", [cleanUser]);
  check("un compte sans engagement reste supprimable", err === null && cleanLeft.n === 0, err ? `${err.code} ${err.message}` : `${cleanLeft.n} ligne(s)`);

  const candidateEmail = (await authUser(candidate)).email;
  const deletable = await closeAccount(candidate);
  check(
    "account_close : compte sans engagement à supprimer, laissé intact",
    deletable.action === "delete" && (await authUser(candidate)).email === candidateEmail,
    JSON.stringify(deletable),
  );

  // Investisseur dont la contribution est encore en séquestre.
  const escrowProject = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.market_create_investment_project('Projet en collecte (test)', '', 'commerce', 100000, 'GNF', 'Règles', current_date + 30)"),
  );
  const outsiderBeforeEscrow = await balanceOf(client, outsider);
  await as(client, "authenticated", outsider, () => client.query("select public.market_invest($1, 40)", [escrowProject.id]));
  const outsiderBlockers = await blockersOf(outsider);
  check("une contribution en séquestre bloque la suppression", outsiderBlockers.includes("escrow_contribution"), outsiderBlockers.join(", "));
  err = await deleteUser(outsider);
  check("suppression d'un investisseur en séquestre refusée par la base", err?.code === "AC001", err ? err.code : "supprimé !");

  const txBefore = (await one(client, "select count(*)::int as n from public.pay_transactions where user_id = $1", [outsider])).n;
  const anonymized = await closeAccount(outsider);
  const anonymizedUser = await authUser(outsider);
  check(
    "account_close : compte engagé anonymisé, avec ses motifs",
    anonymized.action === "anonymized" && anonymized.already === false &&
      anonymized.reasons.includes("escrow_contribution") && anonymized.reasons.includes("wallet_balance"),
    JSON.stringify(anonymized),
  );
  check(
    "identité de connexion effacée et compte bloqué",
    anonymizedUser.email === `anonyme-${outsider}@anonymise.invalid` &&
      anonymizedUser.phone === null &&
      anonymizedUser.encrypted_password === null &&
      anonymizedUser.banned_until !== null &&
      JSON.stringify(anonymizedUser.raw_user_meta_data) === "{}",
    JSON.stringify({ ...anonymizedUser, encrypted_password: anonymizedUser.encrypted_password === null ? null : "présent" }),
  );
  const anonymizedMember = await one(client, "select name, email, phone from public.members where user_id = $1", [outsider]);
  check(
    "nom, e-mail et téléphone effacés dans l'annuaire des membres",
    anonymizedMember?.name === "Compte anonymisé" && anonymizedMember?.email === null && anonymizedMember?.phone === null,
    JSON.stringify(anonymizedMember),
  );
  const txAfter = (await one(client, "select count(*)::int as n from public.pay_transactions where user_id = $1", [outsider])).n;
  const anonymizationRow = await one(client, "select reasons from public.account_anonymizations where user_id = $1", [outsider]);
  check(
    "identifiant, solde et écritures comptables conservés",
    (await balanceOf(client, outsider)) === outsiderBeforeEscrow - 40 && txAfter === txBefore && txAfter > 0 &&
      (await escrowBalance(client, escrowProject.id)) === 40 && Boolean(anonymizationRow),
    `solde ${await balanceOf(client, outsider)}, ${txAfter}/${txBefore} transaction(s)`,
  );
  const anonymizationLogs = async () =>
    (await one(client, "select count(*)::int as n from public.admin_audit_logs where action = $1", [`account_anonymized:${outsider}`])).n;
  check("anonymisation journalisée dans admin_audit_logs", (await anonymizationLogs()) === 1);

  const again = await closeAccount(outsider);
  check(
    "seconde fermeture sans effet (idempotente)",
    again.action === "anonymized" && again.already === true && (await anonymizationLogs()) === 1,
    JSON.stringify(again),
  );
  err = await deleteUser(outsider);
  check("un compte anonymisé encore engagé reste non supprimable", err?.code === "AC001", err ? err.code : "supprimé !");

  await expire(escrowProject.id);
  const anonymizedRun = await settle();
  check(
    "dénouement sans erreur pour un investisseur anonymisé : il est remboursé",
    anonymizedRun.refunded === 1 && anonymizedRun.failed.length === 0 &&
      (await balanceOf(client, outsider)) === outsiderBeforeEscrow &&
      (await escrowBalance(client, escrowProject.id)) === 0,
    `${JSON.stringify(anonymizedRun)}, solde ${await balanceOf(client, outsider)}`,
  );

  // ---- 14. Backend appelable par Flutter : PIN, profil, KYC (0025) ----
  const rpc = async (userId, sql, params = []) =>
    (await as(client, "authenticated", userId, () => one(client, `select ${sql} as r`, params))).r;
  const denied = (userId, sql, params = []) =>
    expectError(client, () => as(client, "authenticated", userId, () => client.query(sql, params)));
  const profileOf = (userId) =>
    one(client, "select pin_hash, pin_attempts, pin_locked_until, kyc_status, city, language from public.user_profiles where user_id = $1", [userId]);

  check("PIN : aucun PIN au départ", (await rpc(candidate, "public.pin_status()")).has_pin === false);
  let pin = await rpc(candidate, "public.pin_set('12')");
  check("PIN : format invalide refusé sans erreur", pin.ok === false && pin.reason === "invalid_format", JSON.stringify(pin));
  pin = await rpc(candidate, "public.pin_set('1234')");
  const storedPin = await profileOf(candidate);
  check(
    "PIN : créé, empreinte bcrypt en base (jamais le PIN en clair)",
    pin.ok === true && /^\$2[aby]\$/.test(storedPin.pin_hash ?? "") && !String(storedPin.pin_hash).includes("1234"),
    JSON.stringify(pin),
  );
  check("PIN : état « défini »", (await rpc(candidate, "public.pin_status()")).has_pin === true);

  err = await denied(candidate, "select pin_hash from public.user_profiles where user_id = $1", [candidate]);
  check("l'empreinte du PIN n'est pas lisible par son propriétaire", err?.code === "42501", err ? err.code : "lisible !");
  const ownProfile = await as(client, "authenticated", candidate, () =>
    one(client, "select count(*)::int as n from public.user_profiles where kyc_status is not null"),
  );
  check("un utilisateur ne lit que son propre profil", ownProfile.n === 1, `${ownProfile.n} ligne(s)`);
  for (const [label, sql] of [
    ["remettre à zéro son compteur de tentatives", "update public.user_profiles set pin_attempts = 0, pin_locked_until = null where user_id = $1"],
    ["s'attribuer un statut KYC vérifié", "update public.user_profiles set kyc_status = 'verified' where user_id = $1"],
    ["écrire son empreinte de PIN", "update public.user_profiles set pin_hash = 'x' where user_id = $1"],
    ["insérer son profil directement", "insert into public.user_profiles (user_id, kyc_status) values ($1, 'verified')"],
  ]) {
    err = await denied(candidate, sql, [candidate]);
    check(`écriture directe refusée : ${label}`, err?.code === "42501", err ? `${err.code} ${err.message}` : "acceptée !");
  }

  pin = await rpc(candidate, "public.pin_verify('1234')");
  check("PIN : bon PIN accepté", pin.ok === true, JSON.stringify(pin));
  const attemptsLeft = [];
  for (let i = 0; i < 4; i++) {
    pin = await rpc(candidate, "public.pin_verify('0000')");
    attemptsLeft.push(pin.reason === "incorrect" ? pin.attempts_left : pin.reason);
  }
  check("PIN : quatre échecs décomptés (4, 3, 2, 1 essais restants)", attemptsLeft.join(",") === "4,3,2,1", attemptsLeft.join(","));
  check("PIN : le compteur est tenu en base", (await profileOf(candidate)).pin_attempts === 4);
  pin = await rpc(candidate, "public.pin_verify('0000')");
  check("PIN : verrouillé au cinquième échec", pin.ok === false && pin.reason === "locked" && Boolean(pin.locked_until), JSON.stringify(pin));
  pin = await rpc(candidate, "public.pin_verify('1234')");
  check("PIN : bon PIN refusé pendant le verrouillage", pin.ok === false && pin.reason === "locked", JSON.stringify(pin));
  pin = await rpc(candidate, "public.pin_set('5678')");
  check("PIN : changement refusé pendant le verrouillage", pin.ok === false && pin.reason === "locked", JSON.stringify(pin));
  check("PIN : état « verrouillé »", (await rpc(candidate, "public.pin_status()")).locked === true);
  await client.query("update public.user_profiles set pin_locked_until = now() - interval '1 minute' where user_id = $1", [candidate]);
  pin = await rpc(candidate, "public.pin_verify('1234')");
  check("PIN : accepté de nouveau une fois le verrou expiré", pin.ok === true && (await profileOf(candidate)).pin_attempts === 0, JSON.stringify(pin));

  // Ancien PIN (empreinte scrypt du serveur Next.js) : vaut absence de PIN.
  await client.query("update public.user_profiles set pin_hash = '0a1b2c:9f8e7d' where user_id = $1", [candidate]);
  pin = await rpc(candidate, "public.pin_verify('1234')");
  check("PIN : une ancienne empreinte non convertible demande un nouveau PIN", pin.ok === false && pin.reason === "no_pin", JSON.stringify(pin));
  pin = await rpc(candidate, "public.pin_set('4321')");
  check("PIN : nouveau PIN après une ancienne empreinte", pin.ok === true && (await rpc(candidate, "public.pin_verify('4321')")).ok === true);

  const updatedProfile = await rpc(candidate, "public.profile_update('Kindia', null)");
  check(
    "profil : ville modifiée, empreinte du PIN absente de la réponse",
    updatedProfile.city === "Kindia" && !("pin_hash" in updatedProfile) && (await profileOf(candidate)).city === "Kindia",
    JSON.stringify(updatedProfile),
  );

  const kyc = await as(client, "authenticated", candidate, () => one(client, "select * from public.kyc_submit('Carte nationale')"));
  const adminKyc = await one(client, "select id, status, user_id from public.admin_kyc where user_id = $1", [candidate]);
  check(
    "KYC : demande déposée en attente, visible du back-office",
    kyc.status === "pending" && adminKyc?.status === "pending" && (await profileOf(candidate)).kyc_status === "pending",
    JSON.stringify(kyc),
  );
  err = await denied(candidate, "select public.kyc_submit('Passeport')");
  check("KYC : une seule demande en attente", err?.code === "PY019", err ? err.code : "acceptée !");
  err = await denied(candidate, "update public.hub_kyc set status = 'approved' where user_id = $1", [candidate]);
  check("KYC : l'utilisateur ne peut pas approuver sa demande", err?.code === "42501", err ? `${err.code} ${err.message}` : "accepté !");
  err = await denied(candidate, "insert into public.hub_kyc (user_id, document_type, status) values ($1, 'x', 'approved')", [candidate]);
  check("KYC : insertion directe d'une demande approuvée refusée", err?.code === "42501", err ? `${err.code} ${err.message}` : "acceptée !");

  const createdOrg = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.org_create('Organisation RPC (test)', 'association', 'Conakry')"),
  );
  const orgMembership = await one(client, "select role from public.memberships where organization_id = $1 and user_id = $2", [createdOrg.id, candidate]);
  check(
    "organisation créée avec son créateur administrateur, en une opération",
    createdOrg.status === "pending" && createdOrg.created_by === candidate && orgMembership?.role === "admin",
    JSON.stringify({ status: createdOrg.status, role: orgMembership?.role }),
  );
  err = await denied(candidate, "select public.org_create('', 'association')");
  check("organisation sans nom refusée", err?.code === "PY009", err ? err.code : "acceptée !");

  // ---- 15. Back-office en base (0025) ----
  check(
    "is_platform_admin : vrai pour un administrateur, faux sinon",
    (await rpc(platformAdmin, "public.is_platform_admin()")) === true && (await rpc(candidate, "public.is_platform_admin()")) === false,
  );

  const anyUuid = "00000000-0000-4000-8000-000000000000";
  const adminCalls = [
    ["admin_review_kyc", "select public.admin_review_kyc($1, 'approved')", [adminKyc.id]],
    ["admin_set_dispute_status", "select public.admin_set_dispute_status($1, 'resolved')", [anyUuid]],
    ["admin_review_moderation", "select public.admin_review_moderation($1, 'approved')", [anyUuid]],
    ["admin_set_commission", "select public.admin_set_commission('Commission revendeur B2B', 0)", []],
    ["admin_update_config", "select public.admin_update_config(p_maintenance_mode := true)", []],
    ["admin_update_plan", "select public.admin_update_plan($1, 1)", [anyUuid]],
    ["admin_toggle_status", "select public.admin_toggle_status('country', $1)", [anyUuid]],
    ["admin_create_category", "select public.admin_create_category('Piratée')", []],
    ["admin_set_user_suspended", "select public.admin_set_user_suspended($1, true)", [seller]],
    ["admin_users", "select public.admin_users()", []],
    ["admin_anonymized_accounts", "select public.admin_anonymized_accounts()", []],
    ["admin_overview", "select public.admin_overview()", []],
    ["admin_funds_summary", "select public.admin_funds_summary()", []],
    ["admin_investment_supervision", "select public.admin_investment_supervision()", []],
    ["admin_supervision", "select public.admin_supervision()", []],
  ];
  const notRefused = [];
  for (const [name, sql, params] of adminCalls) {
    err = await denied(candidate, sql, params);
    if (err?.code !== "PY006") notRefused.push(`${name} (${err ? err.code : "acceptée"})`);
  }
  check(`les ${adminCalls.length} fonctions du back-office refusent un non-administrateur`, notRefused.length === 0, notRefused.join(", "));
  const rateUnchanged = await one(client, "select rate from public.admin_commissions where service = 'Commission revendeur B2B'");
  check("aucun effet de ces tentatives (taux de commission inchangé)", Number(rateUnchanged.rate) === rate, `taux ${rateUnchanged.rate}`);
  for (const internal of ["select public.admin_require()", "select public.admin_log('x', 'y')"]) {
    err = await denied(platformAdmin, internal);
    check(`fonction interne non appelable : ${internal.slice(14)}`, err?.code === "42501", err ? err.code : "acceptée !");
  }

  const countAs = async (userId, table) =>
    (await as(client, "authenticated", userId, () => one(client, `select count(*)::int as n from public.${table}`))).n;
  check(
    "demandes KYC et journal du back-office : lisibles par l'administrateur seulement",
    (await countAs(platformAdmin, "admin_kyc")) >= 1 && (await countAs(candidate, "admin_kyc")) === 0 &&
      (await countAs(platformAdmin, "admin_audit_logs")) >= 1 && (await countAs(candidate, "admin_audit_logs")) === 0 &&
      (await countAs(platformAdmin, "platform_admins")) >= 1 && (await countAs(candidate, "platform_admins")) === 0,
  );
  check(
    "candidatures revendeur : l'administrateur les voit toutes, un utilisateur seulement la sienne",
    (await countAs(platformAdmin, "market_reseller_applications")) >= 2 && (await countAs(candidate, "market_reseller_applications")) === 1,
    `admin ${await countAs(platformAdmin, "market_reseller_applications")}, candidat ${await countAs(candidate, "market_reseller_applications")}`,
  );
  check(
    "taux de commission, formules, pays et opérateurs lisibles par tout utilisateur connecté",
    (await countAs(candidate, "admin_commissions")) >= 4 && (await countAs(candidate, "admin_plans")) >= 1 &&
      (await countAs(candidate, "admin_countries")) >= 1 && (await countAs(candidate, "admin_operators")) >= 1 &&
      (await countAs(candidate, "admin_config")) === 1,
  );
  err = await denied(candidate, "update public.admin_commissions set rate = 0");
  check("écriture directe d'un taux de commission refusée", err?.code === "42501", err ? err.code : "acceptée !");
  err = await denied(platformAdmin, "update public.admin_commissions set rate = 0");
  check("même un administrateur n'écrit pas directement (fonctions journalisées uniquement)", err?.code === "42501", err ? err.code : "acceptée !");
  err = await denied(platformAdmin, "select api_key from public.admin_integrations");
  const integrationNames = await countAs(platformAdmin, "admin_integrations");
  check("clé d'API des intégrations jamais lisible, même par un administrateur", err?.code === "42501" && integrationNames >= 1, err ? err.code : "lisible !");
  err = await denied(platformAdmin, "select count(*) from public.control_plane_outbox");
  check("file d'envoi du Control Plane non lisible par un client", err?.code === "42501", err ? err.code : "lisible !");

  const reviewedKyc = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_review_kyc($1, 'approved')", [adminKyc.id]),
  );
  const hubKycAfter = await one(client, "select status, reviewed_at from public.hub_kyc where id = $1", [kyc.id]);
  check(
    "KYC approuvé par un administrateur : demande et profil mis à jour",
    reviewedKyc.status === "approved" && hubKycAfter.status === "approved" && hubKycAfter.reviewed_at !== null &&
      (await profileOf(candidate)).kyc_status === "verified",
    JSON.stringify({ admin: reviewedKyc.status, hub: hubKycAfter.status }),
  );
  err = await denied(platformAdmin, "select public.admin_review_kyc($1, 'rejected')", [adminKyc.id]);
  check("KYC : une demande traitée ne se rejuge pas", err?.code === "PY019", err ? err.code : "acceptée !");

  const commissionSet = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_set_commission('Commission de test', 2.5)"),
  );
  const commissionLog = await one(client, "select severity from public.admin_audit_logs where action like 'update_commission:Commission de test:%->2.5'");
  check("commission créée par la fonction, journalisée en « warning »", Number(commissionSet.rate) === 2.5 && commissionLog?.severity === "warning", JSON.stringify(commissionSet));
  err = await denied(platformAdmin, "select public.admin_set_commission('Commission de test', 150)");
  check("taux de commission hors bornes refusé", err?.code === "PY009", err ? err.code : "accepté !");

  const configBefore = await one(client, "select platform_name, maintenance_mode from public.admin_config where id = 1");
  const configAfter = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_update_config(p_maintenance_mode := true)"),
  );
  check(
    "configuration : seul le champ fourni change",
    configAfter.maintenance_mode === true && configAfter.platform_name === configBefore.platform_name,
    JSON.stringify(configAfter),
  );

  const plan = await one(client, "select id from public.admin_plans order by monthly_price limit 1");
  const planAfter = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_update_plan($1, 12345)", [plan.id]),
  );
  check("formule : prix modifié", Number(planAfter.monthly_price) === 12345);

  const country = await one(client, "select id, status from public.admin_countries order by name limit 1");
  const toggled = await rpc(platformAdmin, "public.admin_toggle_status('country', $1)", [country.id]);
  check("pays activé / désactivé", toggled === (country.status === "active" ? "inactive" : "active"), `${country.status} -> ${toggled}`);
  err = await denied(platformAdmin, "select public.admin_toggle_status('autre', $1)", [country.id]);
  check("bascule d'un élément inconnu refusée", err?.code === "PY009", err ? err.code : "acceptée !");

  const category = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_create_category('Catégorie de test')"),
  );
  check("catégorie créée avec un identifiant technique", category.name === "Catégorie de test" && /^cat-gorie-de-test-[0-9a-f]{8}$/.test(category.slug), category.slug);

  const dispute = await one(client, "insert into public.admin_disputes (type, claimant, respondent, description, status) values ('commande', 'A', 'B', 'Litige de test', 'open') returning id");
  const disputeAfter = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_set_dispute_status($1, 'resolved')", [dispute.id]),
  );
  const moderationItem = await one(client, "insert into public.admin_moderation (type, title, author, reason, status) values ('annonce', 'Titre', 'Auteur', 'Signalement de test', 'pending') returning id");
  const moderationAfter = await as(client, "authenticated", platformAdmin, () =>
    one(client, "select * from public.admin_review_moderation($1, 'rejected')", [moderationItem.id]),
  );
  check("litige et signalement traités par leurs fonctions", disputeAfter.status === "resolved" && moderationAfter.status === "rejected");
  err = await denied(platformAdmin, "select public.admin_set_dispute_status($1, 'inconnu')", [dispute.id]);
  check("statut de litige inconnu refusé", err?.code === "PY009", err ? err.code : "accepté !");

  const suspended = await rpc(platformAdmin, "public.admin_set_user_suspended($1, true)", [candidate]);
  const bannedRow = await one(client, "select banned_until from auth.users where id = $1", [candidate]);
  check("compte suspendu par un administrateur", suspended.status === "suspended" && bannedRow.banned_until !== null);
  const restored = await rpc(platformAdmin, "public.admin_set_user_suspended($1, false)", [candidate]);
  const restoredRow = await one(client, "select banned_until from auth.users where id = $1", [candidate]);
  check("compte rétabli", restored.status === "active" && restoredRow.banned_until === null);
  err = await denied(platformAdmin, "select public.admin_set_user_suspended($1, true)", [platformAdmin]);
  check("un administrateur ne se suspend pas lui-même", err?.code === "PY006", err ? err.code : "accepté !");
  err = await denied(platformAdmin, "select public.admin_set_user_suspended($1, false)", [outsider]);
  check("un compte anonymisé ne se rétablit pas", err?.code === "PY019", err ? err.code : "accepté !");

  const usersPage = await rpc(platformAdmin, "public.admin_users('smoke-', 100, 0)");
  const anonymizedPage = await rpc(platformAdmin, "public.admin_users('anonyme-', 100, 0)");
  check(
    "liste des comptes : recherche, statut et aucune donnée d'authentification",
    usersPage.total >= 4 && usersPage.users.some((u) => u.id === platformAdmin && u.is_admin === true) &&
      anonymizedPage.users.some((u) => u.id === outsider && u.status === "anonymized") &&
      usersPage.users.every((u) => !("encrypted_password" in u) && !("pin_hash" in u)),
    `${usersPage.total} compte(s)`,
  );

  const anonymizedAccounts = await rpc(platformAdmin, "public.admin_anonymized_accounts()");
  const anonymizedOutsider = anonymizedAccounts.find((a) => a.user_id === outsider);
  check(
    "comptes anonymisés : solde restant à restituer visible",
    Number(anonymizedOutsider?.wallet_balance) === (await balanceOf(client, outsider)) && Number(anonymizedOutsider?.wallet_balance) > 0,
    JSON.stringify(anonymizedOutsider),
  );

  const funds = await rpc(platformAdmin, "public.admin_funds_summary()");
  check(
    "rapprochement : portefeuilles + séquestres + plateforme = total des fonds",
    Number(funds.user_wallets_total) + Number(funds.escrow_total) + Number(funds.platform_wallet_balance) === Number(funds.funds_total) &&
      Number(funds.platform_wallet_balance) === (await platformBalance(client)) && Number(funds.negative_wallets) === 0 &&
      Number(funds.anonymized_wallets_total) >= Number(anonymizedOutsider?.wallet_balance),
    JSON.stringify(funds),
  );
  const overview = await rpc(platformAdmin, "public.admin_overview()");
  check(
    "tableau de bord : compteurs et validations en attente",
    Number(overview.users_total) >= 5 && Number(overview.anonymized_accounts) >= 1 && Number.isInteger(Number(overview.pending_kyc)) && overview.currency === "GNF",
    JSON.stringify(overview),
  );
  const supervisionInvest = await rpc(platformAdmin, "public.admin_investment_supervision()");
  const supervisedFunded = supervisionInvest.projects.find((p) => p.id === funded.id);
  check(
    "supervision des investissements : porteur, séquestre, investisseurs, bénéfices",
    supervisedFunded?.status === "funded" && Number(supervisedFunded?.investors_count) === 2 &&
      supervisedFunded?.promoter_id === seller && supervisionInvest.distributions.length >= 2,
    JSON.stringify(supervisedFunded),
  );
  const supervision = await rpc(platformAdmin, "public.admin_supervision()");
  check(
    "supervision : toutes les associations, y compris celles dont l'administrateur n'est pas membre",
    supervision.organizations.some((o) => o.id === orgId) && supervision.organizations.some((o) => o.id === createdOrg.id),
    `${supervision.organizations.length} association(s)`,
  );

  // Fermeture de compte par l'utilisateur lui-même.
  const selfDeleted = await createUser(client, "depart");
  const closedSelf = await rpc(selfDeleted, "public.account_close_self()");
  const selfLeft = await one(client, "select count(*)::int as n from auth.users where id = $1", [selfDeleted]);
  check("fermeture par l'utilisateur : compte sans engagement supprimé", closedSelf.action === "deleted" && selfLeft.n === 0, JSON.stringify(closedSelf));
  const buyerBalanceBeforeClose = await balanceOf(client, buyer);
  const closedBuyer = await rpc(buyer, "public.account_close_self()");
  const buyerAuth = await one(client, "select email, banned_until from auth.users where id = $1", [buyer]);
  check(
    "fermeture par l'utilisateur : compte engagé anonymisé, solde conservé",
    closedBuyer.action === "anonymized" && closedBuyer.reasons.includes("wallet_balance") &&
      buyerAuth.email === `anonyme-${buyer}@anonymise.invalid` && buyerAuth.banned_until !== null &&
      (await balanceOf(client, buyer)) === buyerBalanceBeforeClose,
    JSON.stringify(closedBuyer),
  );
  err = await denied(seller, "select public.account_close($1)", [candidate]);
  check("un utilisateur ne peut fermer que son propre compte", err?.code === "42501", err ? err.code : "accepté !");

  // ---- 16. Tâches planifiées en base (0026) ----
  const jobs = (await client.query("select jobname, schedule, command from cron.job where jobname like 'assoshop-%' order by jobname")).rows;
  check(
    "deux tâches pg_cron toutes les 15 minutes (envoi au Kernel, dénouement des séquestres)",
    jobs.length === 2 && jobs.every((j) => j.schedule === "*/15 * * * *") &&
      jobs[0].jobname === "assoshop-control-plane-push" && jobs[0].command.includes("cp_trigger_push") &&
      jobs[1].jobname === "assoshop-investments-settle" && jobs[1].command.includes("market_settle_due_investments_job"),
    JSON.stringify(jobs),
  );
  for (const fn of ["market_settle_due_investments_job()", "cp_trigger_push()"]) {
    err = await denied(platformAdmin, `select public.${fn}`);
    check(`tâche planifiée non appelable par un client : ${fn}`, err?.code === "42501", err ? err.code : "acceptée !");
  }
  const pushTrigger = (await one(client, "select public.cp_trigger_push() as r")).r;
  check("envoi au Kernel : sans secret dans Vault, la tâche ne fait rien", ["skipped", "requested"].includes(pushTrigger), pushTrigger);

  // Séquestre rendu incohérent : la tâche le signale au lieu d'échouer.
  const brokenProject = await as(client, "authenticated", candidate, () =>
    one(client, "select * from public.market_create_investment_project('Projet incohérent (test)', '', 'commerce', 100000, 'GNF', 'Règles', current_date + 30)"),
  );
  await as(client, "authenticated", seller, () => client.query("select public.market_invest($1, 30)", [brokenProject.id]));
  await client.query("update public.pay_wallets set balance = balance + 1 where project_id = $1 and type = 'escrow'", [brokenProject.id]);
  await expire(brokenProject.id);
  const jobReport = (await one(client, "select public.market_settle_due_investments_job() as r")).r;
  const failureLog = await one(client, "select severity, actor from public.admin_audit_logs where action like $1", [`investment_settlement_failed:${brokenProject.id}:%`]);
  check(
    "dénouement planifié : un projet en échec est signalé (« critical ») sans bloquer la tâche",
    jobReport.failed.length === 1 && jobReport.failed[0].project_id === brokenProject.id &&
      failureLog?.severity === "critical" && failureLog?.actor === "system",
    JSON.stringify(jobReport),
  );
  // Remise en cohérence pour les contrôles finaux.
  await client.query("update public.pay_wallets set balance = balance - 1 where project_id = $1 and type = 'escrow'", [brokenProject.id]);

  const metrics2 = (await one(client, "select public.cp_metrics_snapshot() as m")).m;
  check(
    "cp_metrics_snapshot() expose platform_wallet_balance",
    Number(metrics2?.platform_wallet_balance) === (await platformBalance(client)),
    `valeur ${metrics2?.platform_wallet_balance}`,
  );

  // ---- 17. Écritures réservées aux personnes autorisées (0027) ----
  // Bloc isolé : ses variables ne croisent pas celles des sections précédentes.
  {
  // Appel d'une fonction par un utilisateur connecté.
  const call = (user, sql, params = []) => as(client, "authenticated", user, () => one(client, sql, params));
  // L'appel doit échouer avec le code attendu.
  const refused = async (name, code, user, sql, params = []) => {
    const failure = await expectError(client, () =>
      user === null
        ? client.query(sql, params)
        : as(client, "authenticated", user, () => client.query(sql, params)),
    );
    check(name, failure?.code === code, failure ? `${failure.code} ${failure.message}` : "accepté !");
  };

  const orgAdmin = await createUser(client, "org-admin");
  const president = await createUser(client, "president");
  const treasurer = await createUser(client, "tresorier");
  const alice = await createUser(client, "alice");
  const bob = await createUser(client, "bob");
  const carol = await createUser(client, "carol");
  const stranger = await createUser(client, "etranger");

  const gov = (await one(client, "insert into public.organizations (name, created_by) values ('Association de fumée', $1) returning id", [orgAdmin])).id;
  await client.query(
    "insert into public.memberships (organization_id, user_id, role) values ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member')",
    [gov, orgAdmin, alice, carol],
  );
  const memberOf = {};
  for (const [key, user, name, role] of [
    ["president", president, "Présidente", "president"],
    ["treasurer", treasurer, "Trésorier", "treasurer"],
    ["alice", alice, "Alice", "member"],
    ["bob", bob, "Bob", "member"],
    ["carol", carol, "Carol", "member"],
    ["ghost", null, "Sans compte", "member"],
  ]) {
    memberOf[key] = (
      await one(
        client,
        "insert into public.members (organization_id, user_id, name, status, role) values ($1, $2, $3, 'active', $4) returning id",
        [gov, user, name, role],
      )
    ).id;
  }

  check(
    "rôles lus en base : bureau, trésorerie, membre actif",
    (await call(president, "select public.org_is_bureau($1) as v", [gov])).v === true &&
      (await call(president, "select public.org_is_treasurer($1) as v", [gov])).v === false &&
      (await call(treasurer, "select public.org_is_treasurer($1) as v", [gov])).v === true &&
      (await call(bob, "select public.org_is_member($1) as v", [gov])).v === true &&
      (await call(bob, "select public.org_is_bureau($1) as v", [gov])).v === false &&
      (await call(stranger, "select public.org_is_member($1) as v", [gov])).v === false &&
      (await call(orgAdmin, "select public.org_is_bureau($1) as v", [gov])).v === true,
  );

  // Votes
  const election = (await one(client, "insert into public.elections (organization_id, title, position, status) values ($1, 'Bureau 2027', 'president', 'open') returning id", [gov])).id;
  const aliceCandidate = await call(alice, "select * from public.election_declare_candidacy($1)", [election]);
  check("un membre déclare sa propre candidature", aliceCandidate.member_id === memberOf.alice && aliceCandidate.votes === 0);
  await refused("candidature en double refusée", "PY019", alice, "select public.election_declare_candidacy($1)", [election]);
  await refused("un membre ne déclare pas la candidature d'un autre", "PY006", bob, "select public.election_declare_candidacy($1, $2)", [election, memberOf.carol]);
  await refused("candidature refusée à un étranger à l'organisation", "PY006", stranger, "select public.election_declare_candidacy($1)", [election]);
  const bobCandidate = await call(president, "select * from public.election_declare_candidacy($1, $2)", [election, memberOf.bob]);
  check("le bureau déclare la candidature d'un membre", bobCandidate.member_id === memberOf.bob);

  await refused("modification directe du nombre de voix refusée", "42501", alice, "update public.election_candidates set votes = 999 where id = $1", [aliceCandidate.id]);
  await refused("candidature directe (hors fonction) refusée", "42501", orgAdmin, "insert into public.election_candidates (election_id, member_id, votes) values ($1, 'x', 50)", [election]);
  await refused("bulletin direct (hors fonction) refusé", "42501", alice, "insert into public.election_votes (election_id, candidate_id, voter_id) values ($1, $2, $3)", [election, aliceCandidate.id, alice]);
  await refused("vote refusé à un étranger à l'organisation", "PY006", stranger, "select public.election_cast_vote($1, $2)", [election, aliceCandidate.id]);
  await call(alice, "select public.election_cast_vote($1, $2)", [election, bobCandidate.id]);
  await refused("second vote du même membre refusé", "PY019", alice, "select public.election_cast_vote($1, $2)", [election, aliceCandidate.id]);
  await call(bob, "select public.election_cast_vote($1, $2)", [election, bobCandidate.id]);
  await call(treasurer, "select public.election_cast_vote($1, $2)", [election, aliceCandidate.id]);
  const tally = (await client.query("select member_id, votes from public.election_candidates where election_id = $1", [election])).rows;
  check(
    "un vote par membre, compté en base",
    tally.find((t) => t.member_id === memberOf.bob)?.votes === 2 && tally.find((t) => t.member_id === memberOf.alice)?.votes === 1,
    JSON.stringify(tally),
  );
  const ownBallots = await call(bob, "select count(*)::int as n from public.election_votes where election_id = $1", [election]);
  check("chacun ne lit que son propre bulletin", ownBallots.n === 1, `${ownBallots.n} bulletin(s) visibles`);

  await refused("clôture refusée à un simple membre", "PY006", alice, "select public.election_close($1)", [election]);
  await refused("réouverture ou modification directe du scrutin refusée", "42501", orgAdmin, "update public.elections set status = 'closed' where id = $1", [election]);
  const closed = await call(president, "select * from public.election_close($1)", [election]);
  check("clôture par le président", closed.status === "closed" && closed.end_date !== null);
  await refused("vote après clôture refusé (RG-C06)", "PY019", carol, "select public.election_cast_vote($1, $2)", [election, bobCandidate.id]);
  await refused("candidature après clôture refusée", "PY019", carol, "select public.election_declare_candidacy($1)", [election]);
  await refused("voix non modifiables après clôture, même par le serveur", "PY019", null, "update public.election_candidates set votes = 50 where election_id = $1", [election]);
  await refused("scrutin clôturé non rouvrable, même par le serveur", "PY019", null, "update public.elections set status = 'open' where id = $1", [election]);

  // Signatures
  await refused("demande de signature directe (hors fonction) refusée", "42501", orgAdmin, "insert into public.signature_requests (organization_id, title) values ($1, 'Directe')", [gov]);
  await refused("demande de signature refusée à un simple membre", "PY006", alice, "select public.signature_create($1, 'expense', 'Achat', $2::uuid[])", [gov, [memberOf.president]]);
  await refused("signataire sans compte refusé", "PY009", president, "select public.signature_create($1, 'expense', 'Achat', $2::uuid[])", [gov, [memberOf.president, memberOf.ghost]]);
  await refused("demande sans signataire refusée", "PY009", president, "select public.signature_create($1, 'expense', 'Achat', '{}'::uuid[])", [gov]);
  const signature = await call(president, "select * from public.signature_create($1, 'expense', 'Achat de matériel', $2::uuid[], 'Sono', 6000000)", [gov, [memberOf.president, memberOf.treasurer]]);
  const lines = (await client.query("select user_id, name, role, signed_at from public.signature_signatories where request_id = $1", [signature.id])).rows;
  check(
    "demande et signataires créés ensemble, demandeur établi en base",
    signature.status === "pending" && signature.requested_by === "Présidente" && signature.requested_by_user_id === president &&
      lines.length === 2 && lines.every((l) => l.user_id && l.signed_at === null),
    JSON.stringify(lines),
  );
  await refused("signature refusée à qui n'est pas signataire", "PY006", alice, "select public.signature_sign($1)", [signature.id]);
  await refused("signature directe de la ligne d'un autre refusée", "42501", treasurer, "update public.signature_signatories set signed_at = now() where request_id = $1", [signature.id]);
  await refused("clôture directe de la demande refusée", "42501", alice, "update public.signature_requests set status = 'signed' where id = $1", [signature.id]);
  let signed = await call(treasurer, "select * from public.signature_sign($1)", [signature.id]);
  const signedLines = (await client.query("select user_id from public.signature_signatories where request_id = $1 and signed_at is not null", [signature.id])).rows;
  check("chacun ne signe que sa propre ligne", signed.status === "pending" && signedLines.length === 1 && signedLines[0].user_id === treasurer);
  await refused("double signature refusée", "PY019", treasurer, "select public.signature_sign($1)", [signature.id]);
  signed = await call(president, "select * from public.signature_sign($1)", [signature.id]);
  check("la demande se clôt quand toutes les lignes sont signées", signed.status === "signed" && signed.decided_at !== null);
  await refused("refus d'une demande déjà signée impossible", "PY019", president, "select public.signature_reject($1)", [signature.id]);
  const signature2 = await call(orgAdmin, "select * from public.signature_create($1, 'minutes', 'PV', $2::uuid[])", [gov, [memberOf.treasurer]]);
  await refused("refus réservé aux signataires désignés", "PY006", alice, "select public.signature_reject($1)", [signature2.id]);
  const rejected = await call(treasurer, "select * from public.signature_reject($1)", [signature2.id]);
  check("refus par un signataire désigné", rejected.status === "rejected");
  await refused("signature d'une demande refusée impossible", "PY019", treasurer, "select public.signature_sign($1)", [signature2.id]);

  // Cas sociaux
  await refused("cas social direct (hors fonction) refusé", "42501", orgAdmin, "insert into public.social_cases (organization_id, title, status, collected_amount) values ($1, 'Direct', 'funded', 999999)", [gov]);
  await refused("déclaration refusée à un étranger à l'organisation", "PY006", stranger, "select public.social_case_create($1, 'Aide', 10000)", [gov]);
  await refused("objectif nul refusé", "PY001", alice, "select public.social_case_create($1, 'Aide', 0)", [gov]);
  const socialCase = await call(alice, "select * from public.social_case_create($1, 'Hospitalisation', 10000, 'Soins', 'illness', 'Bob', $2, false)", [gov, bob]);
  check(
    "cas déclaré par un membre : soumis, rien de collecté",
    socialCase.status === "submitted" && socialCase.collected_amount === 0 && socialCase.declared_by === alice && socialCase.beneficiary_user_id === bob,
  );
  await refused("statut et montant collecté non modifiables directement", "42501", alice, "update public.social_cases set status = 'funded', collected_amount = 10000 where id = $1", [socialCase.id]);
  await refused("même l'administrateur ne modifie plus un cas directement", "42501", orgAdmin, "update public.social_cases set status = 'disbursed' where id = $1", [socialCase.id]);
  const seenByDeclarer = await call(alice, "select count(*)::int as n from public.social_cases where id = $1", [socialCase.id]);
  const seenByOther = await call(carol, "select count(*)::int as n from public.social_cases where id = $1", [socialCase.id]);
  check("cas non validé : visible du déclarant, pas des autres membres (RG-C05)", seenByDeclarer.n === 1 && seenByOther.n === 0, `déclarant ${seenByDeclarer.n}, autre ${seenByOther.n}`);
  await refused("contribution avant validation refusée", "PY019", carol, "select public.social_case_contribute($1, 1000)", [socialCase.id]);
  await refused("validation refusée à un simple membre", "PY006", alice, "select public.social_case_review($1, true)", [socialCase.id]);
  const ownCase = await call(alice, "select * from public.social_case_create($1, 'Sinistre', 5000, '', 'other', 'Trésorier', $2)", [gov, treasurer]);
  await refused("un membre du bureau ne valide pas son propre cas", "PY006", treasurer, "select public.social_case_review($1, true)", [ownCase.id]);
  const approved = await call(president, "select * from public.social_case_review($1, true, 'Accord du comité')", [socialCase.id]);
  check("validation par le comité", approved.status === "approved" && approved.committee_note === "Accord du comité");
  await refused("seconde décision du comité refusée", "PY019", president, "select public.social_case_review($1, false)", [socialCase.id]);
  const seenAfter = await call(carol, "select count(*)::int as n from public.social_cases where id = $1", [socialCase.id]);
  check("cas validé : visible des membres", seenAfter.n === 1);
  await refused("décaissement avant objectif refusé (RG-C05)", "PY019", treasurer, "select public.social_case_disburse($1)", [socialCase.id]);
  await refused("contribution refusée à un étranger à l'organisation", "PY006", stranger, "select public.social_case_contribute($1, 1000)", [socialCase.id]);
  await refused("contribution directe (hors fonction) refusée", "42501", carol, "insert into public.social_case_contributors (case_id, name, amount) values ($1, 'Carol', 10000)", [socialCase.id]);
  let funded = await call(carol, "select * from public.social_case_contribute($1, 4000)", [socialCase.id]);
  check("contribution : montant collecté calculé en base", funded.collected_amount === 4000 && funded.status === "approved");
  funded = await call(alice, "select * from public.social_case_contribute($1, 6000, true)", [socialCase.id]);
  const contributors = (await client.query("select name, amount, anonymous, user_id from public.social_case_contributors where case_id = $1 order by amount", [socialCase.id])).rows;
  check(
    "objectif atteint : cas financé, contributeur nommé en base, anonymat respecté",
    funded.collected_amount === 10000 && funded.status === "funded" &&
      contributors[0].name === "Carol" && contributors[0].user_id === carol &&
      contributors[1].name === "Donateur anonyme" && contributors[1].user_id === null,
    JSON.stringify(contributors),
  );
  const hiddenList = await call(carol, "select count(*)::int as n from public.social_case_contributors where case_id = $1", [socialCase.id]);
  const bureauList = await call(orgAdmin, "select count(*)::int as n from public.social_case_contributors where case_id = $1", [socialCase.id]);
  check("liste des contributeurs masquée si le cas l'exige, sauf au bureau (RG-C05)", hiddenList.n === 0 && bureauList.n === 2, `membre ${hiddenList.n}, bureau ${bureauList.n}`);
  await refused("décaissement refusé à un simple membre", "PY006", alice, "select public.social_case_disburse($1)", [socialCase.id]);
  const disbursed = await call(treasurer, "select * from public.social_case_disburse($1)", [socialCase.id]);
  check("décaissement par la trésorerie une fois l'objectif atteint", disbursed.status === "disbursed" && disbursed.disbursed_at !== null);
  await refused("second décaissement refusé", "PY019", treasurer, "select public.social_case_disburse($1)", [socialCase.id]);
  const caseEvents = (await client.query("select event_type from public.audit_events where entity_id = $1", [socialCase.id])).rows.map((e) => e.event_type);
  check(
    "cas social : chaque étape au journal d'audit",
    ["social_case.approved", "social_case.funded", "social_case.disbursed"].every((t) => caseEvents.includes(t)),
    caseEvents.join(", "),
  );

  // Avis (RG-M04)
  const service = await call(seller, "insert into public.market_services (provider_user_id, title, price) values ($1, 'Plomberie', 50000) returning *", [seller]);
  check("un prestataire publie toujours son service", service.title === "Plomberie" && Number(service.rating) === 0 && service.reviews_count === 0);
  await refused("un prestataire ne fixe pas sa note à la création", "42501", seller, "insert into public.market_services (provider_user_id, title, rating, reviews_count) values ($1, 'Triche', 5, 100)", [seller]);
  await refused("un prestataire ne modifie pas sa note", "42501", seller, "update public.market_services set rating = 5, reviews_count = 100 where id = $1", [service.id]);
  await refused("avis direct (hors fonction) refusé", "42501", buyer, "insert into public.market_service_reviews (service_id, author_name, rating) values ($1, 'Faux', 5)", [service.id]);
  await refused("avis refusé sans sollicitation (RG-M04)", "PY006", buyer, "select public.market_review_service($1, 5, 'Parfait')", [service.id]);
  await refused("un prestataire ne sollicite pas son propre service", "PY006", seller, "select public.market_request_service($1)", [service.id]);
  const request = await call(buyer, "select * from public.market_request_service($1, 'Fuite à réparer')", [service.id]);
  const requestAgain = await call(buyer, "select * from public.market_request_service($1)", [service.id]);
  check("sollicitation enregistrée, rejouable sans doublon", request.status === "requested" && requestAgain.id === request.id);
  await refused("sollicitation directe (hors fonction) refusée", "42501", outsider, "insert into public.market_service_requests (service_id, user_id, status) values ($1, $2, 'confirmed')", [service.id, outsider]);
  await refused("avis refusé tant que la sollicitation n'est pas confirmée", "PY006", buyer, "select public.market_review_service($1, 5)", [service.id]);
  await refused("le demandeur ne confirme pas sa propre sollicitation", "PY006", buyer, "select public.market_respond_service_request($1, true)", [request.id]);
  const requestsSeen = await call(outsider, "select count(*)::int as n from public.market_service_requests where id = $1", [request.id]);
  check("sollicitation invisible pour un tiers", requestsSeen.n === 0);
  const confirmedRequest = await call(seller, "select * from public.market_respond_service_request($1, true)", [request.id]);
  check("confirmation par le prestataire", confirmedRequest.status === "confirmed");
  await refused("note hors de 1 à 5 refusée", "PY009", buyer, "select public.market_review_service($1, 9)", [service.id]);
  const review = await call(buyer, "select * from public.market_review_service($1, 4, 'Bon travail')", [service.id]);
  const rated = await one(client, "select rating, reviews_count from public.market_services where id = $1", [service.id]);
  check(
    "avis publié après sollicitation confirmée, note recalculée en base",
    review.user_id === buyer && review.solicited === true && Number(rated.rating) === 4 && rated.reviews_count === 1,
    JSON.stringify(rated),
  );
  await refused("second avis du même utilisateur refusé", "PY019", buyer, "select public.market_review_service($1, 1)", [service.id]);
  await refused("un prestataire n'évalue pas son propre service", "PY006", seller, "select public.market_review_service($1, 5)", [service.id]);

  const shop = (await one(client, "insert into public.market_resellers (user_id, company_name) values ($1, 'Boutique de fumée') returning id", [president])).id;
  await refused("avis sur un revendeur refusé sans commande livrée", "PY006", alice, "select public.market_review_reseller($1, 5)", [shop]);
  await client.query("insert into public.market_orders (buyer_id, reseller_id, total, status, paid) values ($1, $2, 1000, 'delivered', true)", [alice, shop]);
  const shopReview = await call(alice, "select * from public.market_review_reseller($1, 3, 'Correct')", [shop]);
  const shopRating = await one(client, "select rating from public.market_resellers where id = $1", [shop]);
  check("avis sur un revendeur après commande livrée", shopReview.user_id === alice && Number(shopRating.rating) === 3);
  await refused("un revendeur n'évalue pas sa propre boutique", "PY006", president, "select public.market_review_reseller($1, 5)", [shop]);
  await refused("avis direct sur un revendeur refusé", "42501", bob, "insert into public.market_reviews (reseller_id, author_name, rating) values ($1, 'Faux', 5)", [shop]);

  // Retrait
  await refused("pay_withdraw refusée à un utilisateur, même pour son propre compte", "42501", buyer, "select public.pay_withdraw($1, 1000)", [buyer]);
  await refused("l'ancienne signature de pay_withdraw n'existe plus", "42883", buyer, "select public.pay_withdraw(1000)");
  const balanceBeforeRefusal = await balanceOf(client, buyer);
  const overdraft = await expectError(client, () =>
    as(client, "service_role", null, () => client.query("select public.pay_withdraw($1, 2000000000)", [buyer])),
  );
  check(
    "retrait serveur au-delà du solde refusé, solde intact",
    overdraft?.code === "PY003" && (await balanceOf(client, buyer)) === balanceBeforeRefusal,
    overdraft ? `${overdraft.code} ${overdraft.message}` : "accepté !",
  );
  const noWallet = await expectError(client, () =>
    as(client, "service_role", null, () => client.query("select public.pay_withdraw($1, 1000)", [stranger])),
  );
  check("retrait serveur sans portefeuille refusé", noWallet?.code === "PY002", noWallet ? `${noWallet.code} ${noWallet.message}` : "accepté !");

  // ---- 18. Opérations atomiques (0028) ----
  // Hub
  let favorites = (await as(client, "authenticated", alice, () => client.query("select * from public.hub_toggle_favorite('product', 'Riz 50 kg', 'Marché')"))).rows;
  check("favori ajouté", favorites.length === 1 && favorites[0].user_id === alice && favorites[0].detail === "Marché");
  favorites = (await as(client, "authenticated", alice, () => client.query("select * from public.hub_toggle_favorite('product', 'Riz 50 kg')"))).rows;
  check("favori retiré par la même bascule", favorites.length === 0);
  await refused("favori sans libellé refusé", "PY009", alice, "select public.hub_toggle_favorite('product', '')");

  const conversation = await call(alice, "insert into public.hub_conversations (user_id, participant) values ($1, 'Support') returning id", [alice]);
  const message = await call(alice, "select * from public.hub_send_message($1, '  Bonjour  ')", [conversation.id]);
  const preview = await one(client, "select last_message from public.hub_conversations where id = $1", [conversation.id]);
  check("message et aperçu de la conversation écrits ensemble", message.body === "Bonjour" && message.sender === "me" && preview.last_message === "Bonjour");
  await refused("message dans la conversation d'un autre refusé", "PY018", bob, "select public.hub_send_message($1, 'Intrus')", [conversation.id]);
  await refused("message vide refusé", "PY009", alice, "select public.hub_send_message($1, '   ')", [conversation.id]);

  let preferences = (await as(client, "authenticated", alice, () =>
    client.query("select * from public.hub_set_preferences($1::jsonb)", [JSON.stringify([{ channel: "sms", event_type: "payment", enabled: false }, { event_type: "meeting" }])]),
  )).rows;
  check(
    "préférences remplacées d'un bloc",
    preferences.length === 2 && preferences.find((p) => p.event_type === "payment")?.enabled === false &&
      preferences.find((p) => p.event_type === "meeting")?.channel === "in_app",
    JSON.stringify(preferences),
  );
  preferences = (await as(client, "authenticated", alice, () => client.query("select * from public.hub_set_preferences('[]'::jsonb)"))).rows;
  check("préférences vidées", preferences.length === 0);
  await refused("préférences mal formées refusées", "PY009", alice, "select public.hub_set_preferences('{}'::jsonb)");

  // Cotisations
  await refused("cotisation « payée » insérée directement refusée", "42501", alice, "insert into public.contributions (organization_id, member_id, amount, status) values ($1, $2, 5000, 'paid')", [gov, memberOf.alice]);
  await refused("déclaration de cotisation refusée à un étranger", "PY006", stranger, "select public.contribution_declare($1, $2, 5000, 'cash')", [gov, memberOf.alice]);
  await refused("méthode de paiement inconnue refusée", "PY009", alice, "select public.contribution_declare($1, $2, 5000, 'chèque')", [gov, memberOf.alice]);
  const contribution = await call(alice, "select * from public.contribution_declare($1, $2, 5000, 'online')", [gov, memberOf.alice]);
  check(
    "cotisation déclarée : en attente de la trésorerie, même « en ligne »",
    contribution.status === "pending" && contribution.paid_at === null && contribution.paid_by === "Alice" && contribution.member_id === memberOf.alice,
    JSON.stringify(contribution),
  );
  const due = await one(client, "insert into public.contributions (organization_id, member_id, amount, period_label, status) values ($1, $2, 3000, 'Mars 2026', 'due') returning id", [gov, memberOf.bob]);
  await refused("cotisation d'un autre membre non détournable", "PY009", alice, "select public.contribution_declare($1, $2, 3000, 'cash', $3)", [gov, memberOf.alice, due.id]);
  const thirdParty = await call(alice, "select * from public.contribution_declare($1, $2, 3000, 'cash', $3)", [gov, memberOf.bob, due.id]);
  check("paiement pour un tiers : payeur et bénéficiaire distincts", thirdParty.status === "pending" && thirdParty.paid_by === "Alice" && thirdParty.member_id === memberOf.bob && thirdParty.period_label === "Mars 2026");
  await refused("cotisation déjà déclarée non redéclarable", "PY019", bob, "select public.contribution_declare($1, $2, 3000, 'cash', $3)", [gov, memberOf.bob, due.id]);

  // Groupes financiers
  const groupsBefore = (await one(client, "select count(*)::int as n from public.financial_groups where organization_id = $1", [gov])).n;
  await refused("création de groupe refusée à un simple membre", "PY006", alice, "select public.group_create($1, 'Tontine', 'tontine', 10000, 'weekly', 5)", [gov]);
  await refused("groupe inséré directement refusé", "42501", orgAdmin, "insert into public.financial_groups (organization_id, name) values ($1, 'Direct')", [gov]);
  await refused("type de groupe inconnu refusé", "PY009", president, "select public.group_create($1, 'Tontine', 'loterie', 10000, 'weekly', 5)", [gov]);
  check("aucun groupe créé par les tentatives refusées", (await one(client, "select count(*)::int as n from public.financial_groups where organization_id = $1", [gov])).n === groupsBefore);
  const group = await call(president, "select * from public.group_create($1, 'Tontine du marché', 'tontine', 10000, 'weekly', 3, null, 5, '2026-11-02', $2::text[])", [gov, ["Fatou", "Moussa", "Hors quota"]]);
  const groupMembers = (await client.query("select id, name, role, user_id from public.group_members where group_id = $1", [group.id])).rows;
  const turns = (await client.query("select member_name, position, expected_date from public.group_turns where group_id = $1 order by position", [group.id])).rows;
  const settings = (await client.query("select visibility from public.group_settings where group_id = $1", [group.id])).rows;
  check(
    "groupe, créateur, membres, tours et réglages créés ensemble",
    group.status === "forming" && group.raised_amount === 0 &&
      groupMembers.length === 3 && groupMembers.find((m) => m.role === "creator")?.user_id === president &&
      turns.length === 2 && turns[0].member_name === "Fatou" && turns[1].position === 2 &&
      new Date(turns[1].expected_date) - new Date(turns[0].expected_date) === 7 * 86400000 &&
      settings.length === 1 && settings[0].visibility === "private",
    JSON.stringify({ members: groupMembers.length, turns, settings }),
  );

  const aliceGroupMember = (await one(client, "insert into public.group_members (group_id, user_id, name, role) values ($1, $2, 'Alice', 'member') returning id", [group.id, alice])).id;
  const fatou = groupMembers.find((m) => m.name === "Fatou").id;
  await refused("versement déclaré au nom d'un autre refusé", "PY006", alice, "select public.group_declare_payment($1, $2, 10000, 'cash')", [group.id, fatou]);
  await refused("versement refusé à un étranger à l'organisation", "PY006", stranger, "select public.group_declare_payment($1, $2, 10000, 'cash')", [group.id, aliceGroupMember]);
  await refused("versement inséré directement refusé", "42501", orgAdmin, "insert into public.group_payments (group_id, member_name, amount, status) values ($1, 'Direct', 999999, 'confirmed')", [group.id]);
  const groupPayment = await call(alice, "select * from public.group_declare_payment($1, $2, 10000, 'mobile', $3)", [group.id, aliceGroupMember, fatou]);
  check(
    "versement déclaré : en attente, total du groupe inchangé (RG-F05), bénéficiaire distinct (RG-F04)",
    groupPayment.status === "pending" && groupPayment.paid_at === null && groupPayment.member_name === "Alice" && groupPayment.paid_for_member_name === "Fatou" &&
      (await one(client, "select raised_amount from public.financial_groups where id = $1", [group.id])).raised_amount === 0,
    JSON.stringify(groupPayment),
  );
  await refused("validation d'un versement refusée à son auteur simple membre", "PY006", alice, "select public.group_validate_payment($1)", [groupPayment.id]);
  await refused("validation directe d'un versement refusée", "42501", orgAdmin, "update public.group_payments set status = 'confirmed' where id = $1", [groupPayment.id]);
  const validated = await call(treasurer, "select * from public.group_validate_payment($1)", [groupPayment.id]);
  check(
    "validation par la trésorerie : versement confirmé et total mis à jour ensemble",
    validated.status === "confirmed" && validated.paid_at !== null &&
      (await one(client, "select raised_amount from public.financial_groups where id = $1", [group.id])).raised_amount === 10000,
  );
  await refused("double validation refusée, total non compté deux fois", "PY019", treasurer, "select public.group_validate_payment($1)", [groupPayment.id]);
  const fatouPayment = await call(treasurer, "select * from public.group_declare_payment($1, $2, 10000, 'cash')", [group.id, fatou]);
  await call(president, "select public.group_validate_payment($1)", [fatouPayment.id]);
  check(
    "la trésorerie déclare pour un membre sans compte ; le créateur du groupe valide",
    (await one(client, "select raised_amount from public.financial_groups where id = $1", [group.id])).raised_amount === 20000,
  );
  const paymentEvents = (await client.query("select event_type from public.audit_events where entity_id = $1", [groupPayment.id])).rows;
  check("validation du versement au journal d'audit", paymentEvents.some((e) => e.event_type === "group_payment.validated"));

  // Parrainage (RG-F02)
  const digits = `2246${String(Date.now()).slice(-8)}`;
  const invitee = (
    await one(
      client,
      `insert into auth.users (id, instance_id, aud, role, email, phone, phone_confirmed_at, created_at, updated_at)
       values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, $2, now(), now(), now())
       returning id`,
      [`smoke-invite-${Date.now()}@assoshop.invalid`, digits],
    )
  ).id;
  const sponsorship = await one(
    client,
    "insert into public.sponsorship_requests (group_id, sponsor_name, invitee_name, invitee_phone, status) values ($1, 'Alice', 'Ibrahima', $2, 'pending') returning id",
    [group.id, `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`],
  );
  await refused("confirmation avant l'accord du parrain refusée", "PY019", invitee, "select public.sponsorship_confirm($1)", [sponsorship.id]);
  await refused("l'administrateur ne confirme pas à la place du nouveau membre", "42501", orgAdmin, "update public.sponsorship_requests set status = 'confirmed' where id = $1", [sponsorship.id]);
  await as(client, "authenticated", orgAdmin, () => client.query("update public.sponsorship_requests set status = 'sponsor_accepted' where id = $1", [sponsorship.id]));
  await refused("confirmation refusée à un autre que l'invité", "PY006", alice, "select public.sponsorship_confirm($1)", [sponsorship.id]);
  await refused("groupe complet : adhésion refusée", "PY019", invitee, "select public.sponsorship_confirm($1)", [sponsorship.id]);
  await client.query("update public.financial_groups set max_members = 10 where id = $1", [group.id]);
  const confirmedSponsorship = await call(invitee, "select * from public.sponsorship_confirm($1)", [sponsorship.id]);
  const joined = await one(client, "select count(*)::int as n from public.group_members where group_id = $1 and user_id = $2 and name = 'Ibrahima'", [group.id, invitee]);
  check("le nouveau membre confirme lui-même : adhésion créée (RG-F02)", confirmedSponsorship.status === "confirmed" && confirmedSponsorship.invitee_user_id === invitee && joined.n === 1);
  await refused("seconde confirmation refusée", "PY019", invitee, "select public.sponsorship_confirm($1)", [sponsorship.id]);

  // Prêts
  const loan = await one(
    client,
    "insert into public.loans (group_id, member_id, member_name, amount, interest_rate, status) values ($1, $2, 'Alice', 10000, 10, 'requested') returning id",
    [group.id, aliceGroupMember],
  );
  await refused("prêt non décidable avant confirmation du parrain (RG-F06)", "PY019", president, "select public.loan_decide($1, true)", [loan.id]);
  await client.query("update public.loans set status = 'sponsor_confirmed' where id = $1", [loan.id]);
  await refused("décision de prêt refusée à un simple membre", "PY006", alice, "select public.loan_decide($1, true)", [loan.id]);
  const ownLoan = await one(
    client,
    "insert into public.loans (group_id, member_id, member_name, amount, interest_rate, status) values ($1, $2, 'Présidente', 5000, 0, 'sponsor_confirmed') returning id",
    [group.id, groupMembers.find((m) => m.role === "creator").id],
  );
  await refused("un membre du bureau ne décide pas de son propre prêt", "PY006", president, "select public.loan_decide($1, true)", [ownLoan.id]);
  const decidedLoan = await call(president, "select * from public.loan_decide($1, true)", [loan.id]);
  const installments = (await client.query("select id, position, amount, status from public.loan_installments where loan_id = $1 order by position", [loan.id])).rows;
  check(
    "prêt approuvé et échéances créés ensemble",
    decidedLoan.status === "approved" && decidedLoan.total_due === 11000 && installments.length === 3 &&
      installments.reduce((sum, i) => sum + i.amount, 0) === 11000 && installments.every((i) => i.status === "pending"),
    JSON.stringify(installments.map((i) => i.amount)),
  );
  await refused("seconde décision sur le prêt refusée", "PY019", president, "select public.loan_decide($1, false)", [loan.id]);
  await refused("échéance insérée directement refusée", "42501", orgAdmin, "insert into public.loan_installments (loan_id, position, amount) values ($1, 4, 1)", [loan.id]);
  await refused("remboursement refusé hors trésorerie", "PY006", president, "select public.loan_repay_installment($1)", [installments[0].id]);
  await refused("échéance marquée payée directement refusée", "42501", orgAdmin, "update public.loan_installments set status = 'paid' where id = $1", [installments[0].id]);
  let repaid = await call(treasurer, "select * from public.loan_repay_installment($1)", [installments[0].id]);
  check("échéance remboursée et total du prêt mis à jour ensemble", repaid.repaid_amount === installments[0].amount && repaid.status === "approved");
  await refused("échéance déjà remboursée non rejouable", "PY019", treasurer, "select public.loan_repay_installment($1)", [installments[0].id]);
  await call(treasurer, "select public.loan_repay_installment($1)", [installments[1].id]);
  repaid = await call(treasurer, "select * from public.loan_repay_installment($1)", [installments[2].id]);
  check("prêt soldé à la dernière échéance", repaid.status === "repaid" && repaid.repaid_amount === 11000);
  const rejectedLoan = await call(orgAdmin, "select * from public.loan_decide($1, false)", [ownLoan.id]);
  const noInstallments = await one(client, "select count(*)::int as n from public.loan_installments where loan_id = $1", [ownLoan.id]);
  check("prêt refusé : aucune échéance", rejectedLoan.status === "rejected" && noInstallments.n === 0);

  // Fonds de garantie
  const claim = await one(
    client,
    "insert into public.insurance_claims (organization_id, member_id, member_name, amount, status) values ($1, $2, 'Bob', 4000, 'submitted') returning id",
    [gov, memberOf.bob],
  );
  await refused("indemnisation refusée à un simple membre", "PY006", alice, "select public.claim_decide($1, true)", [claim.id]);
  await refused("indemnisation refusée si le fonds ne la couvre pas", "PY003", president, "select public.claim_decide($1, true)", [claim.id]);
  check("demande intacte après le refus", (await one(client, "select status from public.insurance_claims where id = $1", [claim.id])).status === "submitted");
  await client.query(
    "insert into public.guarantee_fund (organization_id, balance, total_collected) values ($1, 10000, 10000) on conflict (organization_id) do update set balance = 10000, total_collected = 10000, total_used = 0",
    [gov],
  );
  await refused("décision directe sur une demande refusée", "42501", orgAdmin, "update public.insurance_claims set status = 'approved', indemnity = 999999 where id = $1", [claim.id]);
  const decidedClaim = await call(president, "select * from public.claim_decide($1, true)", [claim.id]);
  const fund = await one(client, "select balance, total_used from public.guarantee_fund where organization_id = $1", [gov]);
  check(
    "indemnité accordée et prélevée sur le fonds ensemble",
    decidedClaim.status === "approved" && decidedClaim.indemnity === 4000 && fund.balance === 6000 && fund.total_used === 4000,
    JSON.stringify(fund),
  );
  await refused("seconde décision refusée, fonds non prélevé deux fois", "PY019", president, "select public.claim_decide($1, true)", [claim.id]);
  const ownClaim = await one(
    client,
    "insert into public.insurance_claims (organization_id, member_id, member_name, amount, status) values ($1, $2, 'Présidente', 1000, 'submitted') returning id",
    [gov, memberOf.president],
  );
  await refused("un membre du bureau ne décide pas de sa propre demande", "PY006", president, "select public.claim_decide($1, true)", [ownClaim.id]);

  // Projets, réunions, mobilité
  const project = await one(client, "insert into public.projects (organization_id, name, goal_amount) values ($1, 'Forage', 3000) returning id", [gov]);
  await refused("contribution à un projet refusée à un étranger", "PY006", stranger, "select public.project_contribute($1, 1000)", [project.id]);
  await refused("contribution à un projet insérée directement refusée", "42501", orgAdmin, "insert into public.project_contributions (project_id, contributor_name, amount) values ($1, 'Direct', 999999)", [project.id]);
  let contributed = await call(bob, "select * from public.project_contribute($1, 1000)", [project.id]);
  check("contribution à un projet : montant collecté calculé en base", contributed.raised_amount === 1000 && contributed.status === "in_progress");
  contributed = await call(alice, "select * from public.project_contribute($1, 2000, true)", [project.id]);
  const projectContributors = (await client.query("select contributor_name, user_id from public.project_contributions where project_id = $1 order by amount", [project.id])).rows;
  check(
    "objectif atteint : projet terminé, contributeur nommé en base",
    contributed.raised_amount === 3000 && contributed.status === "completed" &&
      projectContributors[0].contributor_name === "Bob" && projectContributors[1].contributor_name === "Donateur anonyme" && projectContributors[1].user_id === null,
  );
  await refused("contribution à un projet terminé refusée", "PY019", bob, "select public.project_contribute($1, 500)", [project.id]);

  const meeting = await one(client, "insert into public.meetings (organization_id, title) values ($1, 'Assemblée') returning id", [gov]);
  const attendee = await one(client, "insert into public.meeting_attendees (meeting_id, name) values ($1, 'Bob') returning id", [meeting.id]);
  await refused("pointage refusé à un simple membre", "PY006", alice, "select public.meeting_check_in($1, 'present')", [attendee.id]);
  await refused("statut de présence inconnu refusé", "PY009", president, "select public.meeting_check_in($1, 'téléporté')", [attendee.id]);
  await refused("pointage direct (hors fonction) refusé", "42501", orgAdmin, "update public.meeting_attendees set status = 'present' where id = $1", [attendee.id]);
  const checkedIn = await call(president, "select * from public.meeting_check_in($1, 'present')", [attendee.id]);
  check("pointage par le bureau, horodaté en base", checkedIn.status === "present" && checkedIn.checked_in_at !== null);

  const relocation = await one(client, "insert into public.relocations (organization_id, member_id, new_city) values ($1, $2, 'Kindia') returning id", [gov, memberOf.carol]);
  await refused("décision de transfert refusée à un simple membre", "PY006", alice, "select public.transfer_decide($1, $2, 'accepted')", [gov, relocation.id]);
  await refused("décision sur un déménagement inconnu refusée", "PY018", president, "select public.transfer_decide($1, 'inconnu', 'accepted')", [gov]);
  await refused("décision de transfert insérée directement refusée", "42501", orgAdmin, "insert into public.transfer_decisions (organization_id, relocation_id, status) values ($1, $2, 'accepted')", [gov, relocation.id]);
  const transfer = await call(president, "select * from public.transfer_decide($1, $2, 'accepted', 'Parrain : Alice', 'Dossier complet')", [gov, relocation.id]);
  check(
    "décision de transfert par le bureau, signée en base",
    transfer.status === "accepted" && transfer.decided_by === "Présidente" && transfer.member_id === memberOf.carol && transfer.decided_at !== null,
    JSON.stringify(transfer),
  );
  await refused("décision de transfert non modifiable une fois prise", "PY019", president, "select public.transfer_decide($1, $2, 'rejected')", [gov, relocation.id]);

  // Comptabilité
  const movement = await one(client, "insert into public.consolidation_movements (organization_id, label, amount, date) values ($1, 'Cotisations de mars', 25000, '2026-03-31') returning id", [gov]);
  await refused("consolidation refusée hors trésorerie", "PY006", president, "select public.accounting_consolidate($1, $2::uuid[])", [gov, [movement.id]]);
  await refused("mouvement marqué consolidé directement refusé", "42501", orgAdmin, "update public.consolidation_movements set consolidated = true where id = $1", [movement.id]);
  let entries = (await as(client, "authenticated", treasurer, () => client.query("select * from public.accounting_consolidate($1, $2::uuid[])", [gov, [movement.id, movement.id]]))).rows;
  check(
    "mouvement consolidé et écriture créée ensemble",
    entries.length === 1 && entries[0].amount === 25000 && entries[0].status === "confirmed" && entries[0].validated_by === "Trésorier" &&
      (await one(client, "select consolidated from public.consolidation_movements where id = $1", [movement.id])).consolidated === true,
    JSON.stringify(entries),
  );
  entries = (await as(client, "authenticated", treasurer, () => client.query("select * from public.accounting_consolidate($1, $2::uuid[])", [gov, [movement.id]]))).rows;
  check("consolidation rejouable sans écriture en double", entries.length === 0);
  }

  // ---- 6. Soldes négatifs ----
  const negative = await one(client, "select count(*)::int as n from public.pay_wallets where balance < 0");
  check(
    "aucun portefeuille à solde négatif",
    negative.n === 0,
    negative.n === 0
      ? ""
      : `${negative.n} portefeuille(s) à solde négatif`,
  );

  return results;
}

export function printSmokeResults(results) {
  for (const r of results) {
    console.log(`  ${r.ok ? "[OK]   " : "[ÉCHEC]"} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n  ${results.length - failed}/${results.length} tests de fumée verts`);
  return failed === 0;
}

async function main() {
  const client = pgClient();
  await client.connect();
  let ok = false;
  try {
    await client.query("begin");
    console.log("Tests de fumée (transaction annulée à la fin) :\n");
    ok = printSmokeResults(await runSmokeTests(client));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
  console.log("\nROLLBACK effectué : aucune donnée de test conservée.");
  if (!ok) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(`ÉCHEC : ${err.message}`);
    process.exit(1);
  });
}

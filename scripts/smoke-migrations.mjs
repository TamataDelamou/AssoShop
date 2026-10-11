// Tests de fumée des migrations 0016 à 0026, exécutés DANS une transaction
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
  const withdrawal = await as(client, "authenticated", buyer, () =>
    one(client, "select * from public.pay_withdraw(1000)"),
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

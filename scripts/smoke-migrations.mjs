// Tests de fumée des migrations 0016 à 0022, exécutés DANS une transaction
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
    one(client, "select * from public.market_create_investment_project('Projet de test', '', 'agriculture', 5000, 'GNF', 'Règles v1')"),
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

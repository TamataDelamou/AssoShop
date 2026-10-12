// Régénère les sections de référence des documents destinés à l'équipe
// Flutter, à partir de la base (droits, politiques, signatures) et du code
// (migrations, routes Next.js de référence) :
//
//   docs/CONTRAT_BACKEND_FLUTTER.md   sections « fonctions RPC » et « tables »
//   docs/INVENTAIRE_ROUTES_API.md     inventaire des routes app/api/**
//
//   node --env-file=.env.local scripts/generate-backend-reference.mjs
//
// Lecture seule en base. Seul le texte compris entre les marqueurs
// « <!-- généré:xxx:début --> » et « <!-- généré:xxx:fin --> » est remplacé.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pgClient } from "./db-state.mjs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------- Fonctions

// Dernière définition de chaque fonction dans les migrations : commentaire,
// codes d'erreur levés et messages associés.
function parseMigrations() {
  const dir = "supabase/migrations";
  const functions = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = read(path.join(dir, file));
    const re = /create or replace function public\.([a-z_0-9]+)\(/g;
    let match;
    while ((match = re.exec(sql))) {
      const name = match[1];
      const bodyEnd = sql.indexOf("\n$$;", match.index);
      const body = sql.slice(match.index, bodyEnd === -1 ? undefined : bodyEnd);
      // Bloc de commentaires immédiatement au-dessus.
      const before = sql.slice(0, match.index).split("\n");
      before.pop();
      const comment = [];
      while (before.length > 0 && before.at(-1).startsWith("--")) {
        const line = before.pop().replace(/^--\s?/, "");
        if (/^[-=]{4,}$/.test(line.trim()) || /^\d+(\.[a-z])?\.? [A-ZÉÈÀ]/.test(line.trim())) break;
        comment.unshift(line);
      }
      const errors = new Map();
      for (const m of body.matchAll(/raise exception '((?:[^']|'')*)'[^;]*?errcode = '([A-Z]{2}\d{3})'/g)) {
        const message = m[1].replace(/''/g, "'").replace(/ \(statut %\)| \(%\)/g, "");
        if (!errors.has(m[2])) errors.set(m[2], new Set());
        errors.get(m[2]).add(message);
      }
      // Erreurs levées par les fonctions internes appelées.
      const inherited = [];
      if (body.includes("public.admin_require()")) inherited.push(["PY004", "Non authentifié"], ["PY006", "Action non autorisée"]);
      if (body.includes("public.pay_lock_wallet(")) inherited.push(["PY004", "Non authentifié"], ["PY002", "Portefeuille introuvable"]);
      if (body.includes("public.account_close(")) inherited.push(["PY018", "Compte introuvable"]);
      for (const [code, message] of inherited) {
        if (!errors.has(code)) errors.set(code, new Set());
        errors.get(code).add(message);
      }
      functions.set(name, { file, comment: comment.join(" ").replace(/\s+/g, " ").trim(), errors });
    }
  }
  return functions;
}

// Rôle de chaque fonction, rédigé pour l'équipe Flutter. À défaut, le
// commentaire de la migration est repris tel quel.
const ROLES = {
  pin_status: "État du PIN : `{ has_pin, locked, locked_until }`.",
  pin_set: "Crée ou remplace le PIN (4 chiffres) après une connexion par code. Renvoie `{ ok }` ou `{ ok: false, reason }` avec `reason` = `invalid_format` ou `locked`. Ne lève pas d'erreur pour ces cas.",
  pin_verify: "Vérifie le PIN. Renvoie `{ ok: true }`, ou `{ ok: false, reason }` avec `reason` = `incorrect` (+ `attempts_left`), `locked` (+ `locked_until`) ou `no_pin`. Cinq échecs verrouillent le PIN 15 minutes. Ne lève pas d'erreur pour un PIN faux.",
  profile_update: "Modifie la ville et / ou la langue (un paramètre à null est inchangé). Renvoie le profil, sans l'empreinte du PIN.",
  kyc_submit: "Dépose une demande de vérification d'identité, toujours « pending ». Une seule demande en attente à la fois.",
  account_close_self: "Ferme le compte de l'appelant : `{ action: 'deleted' }` s'il ne porte aucun engagement financier, sinon `{ action: 'anonymized', reasons }`. La session n'est plus valable ensuite.",
  org_create: "Crée une organisation (statut « pending ») et l'adhésion « admin » de son créateur, en une opération.",
  pay_ensure_wallet: "Renvoie le portefeuille personnel de l'appelant, en le créant s'il n'existe pas.",
  pay_generate_reference: "Utilitaire interne (référence de transaction). Sans intérêt côté client.",
  pay_service_fee: "Commission de service d'une recharge ou d'un retrait pour un montant donné : à afficher AVANT validation (RG-P03).",
  pay_topup: "Demande de recharge : crée une transaction « pending », sans crédit. Le portefeuille n'est crédité qu'à la confirmation de l'opérateur (Edge Function `pay-topup-confirm`).",
  pay_transfer: "Transfert vers un membre d'une organisation commune, désigné par sa fiche membre (`p_to_member_id`) ou son identifiant utilisateur (`p_to_user_id`). Débit et crédit dans la même transaction, sans commission. Un compte sans organisation commune donne la même erreur qu'un compte inconnu.",
  market_create_order: "Crée une commande. `p_items` = `[{ \"product_id\": uuid, \"quantity\": entier }]`. Prix et total sont calculés en base ; un seul revendeur par commande. Le stock n'est décrémenté qu'au paiement.",
  market_cancel_order: "Annulation par l'acheteur, tant que la commande n'est pas payée.",
  market_pay_order: "Paiement par l'acheteur : débit du portefeuille, crédit du revendeur moins la commission, décrément du stock.",
  market_advance_order: "Avancement logistique par le revendeur, une étape à la fois : `shipped` → `arrived` → `ready_for_pickup` (scan du colis, RG-M03) → `delivered` (remise, avec `p_recipient_name`).",
  market_create_group_order: "Crée une commande groupée ; le prix et le revendeur viennent du produit.",
  market_join_group_order: "Rejoint une commande groupée ouverte. Elle est confirmée dès le minimum de participants atteint (RG-M02).",
  market_close_group_order: "Clôture par le créateur ou le revendeur concerné.",
  market_submit_reseller_application: "Dépose (ou redépose après un refus) une candidature revendeur, toujours « pending ».",
  market_review_reseller_application: "Back-office : approuve ou refuse une candidature (`approved` / `rejected`). L'approbation crée le compte revendeur. Jamais sur sa propre candidature.",
  market_create_investment_project: "Crée un projet d'investissement. Date limite obligatoire et future, montant recherché > 0.",
  market_update_investment_rules: "Modifie les règles de répartition : porteur uniquement, et seulement avant le premier investissement (RG-M05).",
  market_close_investment_project: "Abandon par le porteur avant le dénouement : les investisseurs sont remboursés aussitôt.",
  market_invest: "Investit : débite le portefeuille et crédite le séquestre du projet. Refusé après la date limite.",
  market_investment_commission_rate: "Taux (en %) de la commission prélevée au versement d'un séquestre : à afficher avant tout investissement (RG-P03).",
  market_declare_investment_profit: "Le porteur d'un projet financé déclare un bénéfice à distribuer. Aucun mouvement de fonds avant validation par un administrateur.",
  market_review_investment_profit: "Back-office : valide (`approved`) ou refuse (`rejected`) un bénéfice déclaré. La validation débite le porteur et crédite chaque investisseur au prorata de sa mise.",
  org_is_member: "Vrai si l'appelant est membre de l'organisation (compte rattaché ou fiche de membre active).",
  org_is_bureau: "Vrai si l'appelant est administrateur de l'organisation ou membre du bureau (président, secrétaire, trésorier, adjoints) : sert à afficher les actions du bureau.",
  org_is_treasurer: "Vrai si l'appelant est administrateur de l'organisation, trésorier ou vice-trésorier : sert à afficher les validations de trésorerie.",
  org_has_role: "Vrai si l'appelant est administrateur de l'organisation ou porte l'un des rôles donnés (`president`, `secretary`, `treasurer`, …).",
  org_member_id: "Identifiant de la fiche de membre active de l'appelant dans l'organisation, ou null.",
  election_declare_candidacy: "Candidature à un scrutin ouvert. Sans `p_member_id` : l'appelant se déclare lui-même. Avec : réservé au bureau.",
  election_cast_vote: "Vote : un seul par membre et par scrutin, définitif. Le décompte est tenu en base ; le bulletin n'est lisible que par son auteur.",
  election_close: "Clôture par le président, le secrétaire ou leurs adjoints. Définitive : un scrutin clôturé n'est plus modifiable (RG-C06).",
  signature_create: "Ouvre une demande de signature (bureau). `p_signatory_member_ids` : fiches de membres actifs disposant d'un compte.",
  signature_sign: "L'appelant signe SA ligne. La demande passe à `signed` quand toutes les lignes sont signées.",
  signature_reject: "Refus par l'un des signataires désignés : la demande passe à `rejected`.",
  social_case_create: "Déclare un cas social (tout membre). Toujours `submitted` ; visible des autres membres seulement après validation (RG-C05).",
  social_case_review: "Décision du comité (bureau) : `p_approve` vrai → `approved`, faux → `rejected`. Jamais par le bénéficiaire.",
  social_case_contribute: "Contribution d'un membre à un cas validé. Le montant collecté est calculé en base ; le cas passe à `funded` quand l'objectif est atteint. Registre : aucun mouvement de portefeuille.",
  social_case_disburse: "Décaissement par le président ou la trésorerie, uniquement quand le cas est `funded`.",
  market_request_service: "Sollicite un service. Rejouable : renvoie la sollicitation en attente si elle existe.",
  market_respond_service_request: "Réponse du prestataire à une sollicitation : `p_confirm` vrai → `confirmed`, faux → `declined`.",
  market_review_service: "Avis sur un service (note de 1 à 5). Réservé à qui a une sollicitation confirmée par le prestataire (RG-M04) ; un avis par utilisateur. La note du service est recalculée en base.",
  market_review_reseller: "Avis sur un revendeur (note de 1 à 5). Réservé à qui a reçu une commande livrée de ce revendeur ; un avis par utilisateur.",
  hub_toggle_favorite: "Ajoute le favori s'il est absent, le retire sinon. Renvoie la liste à jour.",
  hub_send_message: "Ajoute un message à une conversation de l'appelant et met à jour son aperçu.",
  hub_set_preferences: "Remplace d'un bloc les préférences de notification. `p_preferences` = `[{ \"channel\": \"in_app\", \"event_type\": \"…\", \"enabled\": true }]`.",
  contribution_declare: "Déclare le paiement d'une cotisation, pour soi ou pour un tiers. Toujours `pending` : la cotisation n'est payée qu'après validation par la trésorerie.",
  group_create: "Crée un groupe financier (bureau) : groupe, créateur, membres et ordre de passage (tontine), réglages — ou rien.",
  group_is_creator: "Vrai si l'appelant est le créateur (administrateur) du groupe.",
  group_declare_payment: "Déclare un versement, pour soi (ou pour un autre membre si l'appelant est trésorier ou créateur du groupe). Toujours `pending` ; le total du groupe ne bouge qu'à la validation (RG-F05).",
  group_validate_payment: "Validation par la trésorerie ou le créateur du groupe : versement confirmé et total du groupe mis à jour ensemble.",
  sponsorship_confirm: "Le nouveau membre confirme LUI-MÊME son adhésion après l'accord du parrain (RG-F02). Il est reconnu par son compte ou par le numéro de téléphone vérifié de son compte.",
  loan_decide: "Décision du bureau sur un prêt confirmé par le parrain (RG-F06). L'approbation crée les trois échéances. Jamais sur son propre prêt.",
  loan_repay_installment: "Enregistre le remboursement d'une échéance (trésorerie). Le prêt passe à `repaid` quand tout est remboursé.",
  claim_decide: "Décision du bureau sur une demande d'indemnisation. L'indemnité est prélevée sur le fonds de garantie dans la même transaction ; refusée si le fonds ne la couvre pas.",
  project_contribute: "Contribution d'un membre à un projet en cours. Le montant collecté est calculé en base. Registre : aucun mouvement de portefeuille.",
  meeting_check_in: "Pointage d'un participant (`invited`, `present`, `absent`, `excused`) par le président, le secrétaire ou leurs adjoints.",
  transfer_decide: "Décision du bureau de l'association d'accueil sur un transfert (`pending`, `accepted`, `rejected`). Une fois prise, elle n'est plus modifiable.",
  accounting_consolidate: "Consolidation par la trésorerie : mouvements marqués consolidés et écritures créées ensemble. Rejouable sans doublon.",
  is_platform_admin: "Vrai si l'appelant est administrateur de la plateforme : sert à afficher le mode administrateur.",
  admin_overview: "Tableau de bord : compteurs, volume du mois, validations en attente.",
  admin_funds_summary: "Rapprochement du compte marchand : total des portefeuilles, des séquestres et du portefeuille plateforme, recharges en attente.",
  admin_users: "Liste paginée des comptes : `{ total, users: [{ id, name, email, phone, status, is_admin, kyc_status, created_at }] }`.",
  admin_anonymized_accounts: "Comptes anonymisés avec le solde et les mises restant à restituer.",
  admin_investment_supervision: "Projets (porteur, séquestre, investisseurs) et bénéfices déclarés : `{ escrow_total, projects, distributions }`.",
  admin_supervision: "Toutes les associations et tous les groupes financiers : `{ organizations, financial_groups }`.",
  admin_review_kyc: "Approuve ou refuse une demande KYC (`approved` / `rejected`) ; reporte la décision sur le profil de l'utilisateur.",
  admin_set_dispute_status: "Change le statut d'un litige : `open`, `in_progress`, `resolved`.",
  admin_review_moderation: "Traite un signalement : `pending`, `approved`, `rejected`.",
  admin_set_commission: "Crée ou modifie un taux de commission (0 à 100 %). Journalisé avec l'ancien et le nouveau taux.",
  admin_update_config: "Modifie la configuration générale ; un paramètre à null est inchangé.",
  admin_update_plan: "Modifie le prix mensuel d'une formule.",
  admin_toggle_status: "Active / désactive un pays (`country`), un opérateur (`operator`) ou une intégration (`integration`). Renvoie le nouveau statut.",
  admin_create_category: "Crée une catégorie de produits (avec ou sans catégorie parente).",
  admin_set_user_suspended: "Suspend ou rétablit un compte. Jamais soi-même ; un compte anonymisé ne se rétablit pas.",
};

const RPC_GROUPS = [
  ["Compte : PIN, profil, KYC, fermeture", /^(pin_|profile_|kyc_|account_close_self)/],
  ["Organisations : création et rôle de l'appelant", /^(org_create|org_is_member|org_is_bureau|org_is_treasurer|org_has_role|org_member_id)$/],
  ["Community : votes, signatures, cas sociaux, projets, réunions, mobilité", /^(election_|signature_|social_case_|project_contribute$|meeting_check_in$|transfer_decide$)/],
  ["Finance : cotisations, groupes, parrainage, prêts, solidarité, comptabilité", /^(contribution_declare|group_|sponsorship_confirm|loan_|claim_decide|accounting_consolidate)/],
  ["Hub : favoris, messages, préférences", /^hub_/],
  ["Pay : portefeuille", /^pay_/],
  ["Market : commandes", /^market_(create_order|cancel_order|pay_order|advance_order|create_group_order|join_group_order|close_group_order)$/],
  ["Market : revendeur", /^market_(submit_reseller_application|review_reseller_application)$/],
  ["Market : services et avis", /^market_(request_service|respond_service_request|review_service|review_reseller)$/],
  ["Market : investissement", /^market_(create_investment_project|update_investment_rules|close_investment_project|invest|investment_commission_rate|declare_investment_profit|review_investment_profit)$/],
  ["Back-office (administrateurs de la plateforme)", /^(admin_|is_platform_admin$)/],
];

async function rpcSection(client) {
  const parsed = parseMigrations();
  const { rows } = await client.query(`
    select p.proname as name,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as result,
           has_function_privilege('anon', p.oid, 'execute') as anon
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'execute')
      and pg_get_function_result(p.oid) not in ('trigger', 'event_trigger')
      and p.prokind = 'f'
    order by p.proname`);

  const out = [];
  const used = new Set();
  const render = (fn) => {
    const info = parsed.get(fn.name);
    const args = fn.args
      ? fn.args.split(/,\s*(?=p_|[a-z_]+ )/).map((a) => `\`${a.trim()}\``).join("<br>")
      : "—";
    const errors = info && info.errors.size > 0
      ? [...info.errors].sort().map(([code, messages]) => `\`${code}\` ${[...messages].join(" / ")}`).join("<br>")
      : "—";
    const result = fn.result.replace(/^public\./, "").replace(/^SETOF public\./, "liste de ");
    return `| \`${fn.name}\` | ${args} | \`${result}\` | ${errors} | ${ROLES[fn.name] ?? info?.comment ?? ""} |`;
  };
  for (const [title, pattern] of RPC_GROUPS) {
    const group = rows.filter((fn) => pattern.test(fn.name));
    if (group.length === 0) continue;
    out.push(`#### ${title}`, "", "| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |", "| --- | --- | --- | --- | --- |");
    for (const fn of group) {
      used.add(fn.name);
      out.push(render(fn));
    }
    out.push("");
  }
  const rest = rows.filter((fn) => !used.has(fn.name));
  if (rest.length > 0) {
    out.push("#### Prédicats et fonctions utilitaires", "", "Utilisés par les politiques d'accès ; rarement utiles à appeler directement.", "", "| Fonction | Paramètres | Retour |", "| --- | --- | --- |");
    for (const fn of rest) out.push(`| \`${fn.name}\` | ${fn.args ? `\`${fn.args}\`` : "—"} | \`${fn.result}\` |`);
    out.push("");
  }
  const anon = rows.filter((fn) => fn.anon).map((fn) => `\`${fn.name}\``);
  out.push(
    `${rows.length} fonctions sont appelables avec le jeton d'un utilisateur connecté.` +
      (anon.length > 0 ? ` Appelables aussi sans connexion, où elles renvoient toujours faux : ${anon.join(", ")}.` : " Aucune n'est appelable sans connexion."),
  );
  return out.join("\n");
}

// ------------------------------------------------------------------- Tables

const TABLE_GROUPS = [
  ["Compte et Hub", /^(user_profiles|hub_|account_)/],
  ["Organisations et membres", /^(organizations|organization_settings|memberships|members|shared_memberships|affiliations|antennas)$/],
  ["Pay", /^pay_/],
  ["Market", /^market_/],
  ["Finance (groupes, prêts, solidarité)", /^(financial_groups|group_|loans|loan_installments|guarantee_fund|insurance_|sponsorship_requests)/],
  ["Comptabilité et trésorerie", /^(accounting_entries|budget_lines|consolidation_movements|reconciliation_lines|treasury_transactions)$/],
  ["Journal d'audit", /^audit_events$/],
  ["Back-office et référentiels", /^(admin_|platform_admins)/],
  ["Technique (jamais accessibles aux clients)", /^(control_plane_|app_migrations)/],
];

// Traduit l'expression d'une politique en règle lisible. Les expressions non
// reconnues sont laissées telles quelles (tronquées).
const POLICY_PATTERNS = [
  // Adhésion (memberships) de l'appelant à l'organisation de la ligne.
  [/\(EXISTS \( SELECT 1 FROM memberships m WHERE \(\(m\.organization_id = [a-z_.]+\) AND \(m\.user_id = auth\.uid\(\)\) AND \(m\.role = 'admin'\)\)\)\)/g, "admin de l'organisation"],
  [/\(EXISTS \( SELECT 1 FROM memberships m WHERE \(\(m\.organization_id = [a-z_.]+\) AND \(m\.user_id = auth\.uid\(\)\)\)\)\)/g, "membre de l'organisation"],
  // Même règle, atteinte par une ou deux tables parentes.
  [/\(EXISTS \( SELECT 1 FROM \(?([a-z_]+) [a-z]+(?: JOIN [a-z_]+ [a-z]+ ON \(\([a-z.]+ = [a-z._]+\)\)\))? WHERE \(\([a-z]+\.id = [a-z_.]+\) AND is_org_admin\([a-z]+\.organization_id\)\)\)\)/g, "admin de l'organisation (via $1)"],
  [/\(EXISTS \( SELECT 1 FROM \(?([a-z_]+) [a-z]+(?: JOIN [a-z_]+ [a-z]+ ON \(\([a-z.]+ = [a-z._]+\)\)\))? WHERE \(\([a-z]+\.id = [a-z_.]+\) AND is_org_member\([a-z]+\.organization_id\)\)\)\)/g, "membre de l'organisation (via $1)"],
  [/is_org_admin\(organization_id\)/g, "admin de l'organisation"],
  [/is_org_member\(organization_id\)/g, "membre de l'organisation"],
  [/\(conversation_id IN \( SELECT hub_conversations\.id FROM hub_conversations WHERE \(hub_conversations\.user_id = auth\.uid\(\)\)\)\)/g, "ses propres conversations"],
  [/market_is_reseller\((?:o\.)?reseller_id\)/g, "revendeur propriétaire"],
  [/\(auth\.uid\(\) IS NOT NULL\)/g, "connecté"],
  [/is_platform_admin\(\)/g, "admin plateforme"],
  [/\(user_id = auth\.uid\(\)\)|\(auth\.uid\(\) = user_id\)/g, "sa propre ligne"],
  [/\(buyer_id = auth\.uid\(\)\)/g, "acheteur"],
  [/\(provider_user_id = auth\.uid\(\)\)/g, "prestataire"],
  [/\(created_by = auth\.uid\(\)\)/g, "créateur"],
];

function simplify(expression) {
  if (!expression) return "";
  let text = expression
    .replace(/\s+/g, " ")
    .replace(/public\./g, "")
    .replace(/'([a-z_]+)'::text/g, "'$1'");
  for (const [pattern, label] of POLICY_PATTERNS) text = text.replace(pattern, label);
  text = text.replace(/^\((.*)\)$/, "$1");
  return text.length > 150 ? text.slice(0, 147) + "…" : text;
}

async function tableSection(client) {
  const { rows: tables } = await client.query(`
    select c.relname as name,
      has_table_privilege('authenticated', c.oid, 'select') as sel,
      has_any_column_privilege('authenticated', c.oid, 'select') as sel_some,
      has_table_privilege('authenticated', c.oid, 'insert') as ins,
      has_table_privilege('authenticated', c.oid, 'update') as upd,
      has_table_privilege('authenticated', c.oid, 'delete') as del
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname`);
  const { rows: policies } = await client.query(
    "select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, cmd, policyname",
  );
  const byTable = new Map();
  for (const p of policies) {
    if (!byTable.has(p.tablename)) byTable.set(p.tablename, []);
    byTable.get(p.tablename).push(p);
  }

  const out = [];
  const used = new Set();
  const render = (t) => {
    const pol = byTable.get(t.name) ?? [];
    const rule = (cmds) => {
      const matching = pol.filter((p) => cmds.includes(p.cmd) || p.cmd === "ALL");
      if (matching.length === 0) return null;
      return [...new Set(matching.map((p) => simplify(p.qual || p.with_check)))].join(" OU ");
    };
    const canRead = t.sel || t.sel_some;
    const readRule = rule(["SELECT"]);
    const reading = !canRead || !readRule ? "non" : `${t.sel ? "" : "colonnes limitées — "}${readRule}`;
    const writes = [];
    for (const [flag, cmd, label] of [[t.ins, "INSERT", "ajout"], [t.upd, "UPDATE", "modification"], [t.del, "DELETE", "suppression"]]) {
      const r = flag ? rule([cmd]) : null;
      if (r) writes.push(`${label} : ${r}`);
    }
    return `| \`${t.name}\` | ${reading} | ${writes.length > 0 ? writes.join("<br>") : "**aucune** (fonctions uniquement)"} |`;
  };
  for (const [title, pattern] of [...TABLE_GROUPS, ["Community (vie associative)", /./]]) {
    const group = tables.filter((t) => !used.has(t.name) && pattern.test(t.name));
    if (group.length === 0) continue;
    out.push(`#### ${title}`, "", "| Table | Lecture directe | Écriture directe |", "| --- | --- | --- |");
    for (const t of group) {
      used.add(t.name);
      out.push(render(t));
    }
    out.push("");
  }
  const closed = tables.filter((t) => !t.ins && !t.upd && !t.del).length;
  out.push(`${tables.length} tables, dont ${closed} sans aucune écriture directe possible pour un client.`);
  return out.join("\n");
}

// ------------------------------------------------------------------- Routes

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Écritures directes de chaque fonction exportée des helpers lib/api/*.ts.
function helperWrites() {
  const map = new Map();
  for (const file of readdirSync("lib/api").filter((f) => f.endsWith(".ts"))) {
    const src = read(path.join("lib/api", file));
    const starts = [...src.matchAll(/export (?:async )?function ([A-Za-z0-9_]+)\(/g)];
    starts.forEach((m, i) => {
      const body = src.slice(m.index, starts[i + 1]?.index ?? src.length);
      const tables = new Set();
      let count = 0;
      for (const w of body.matchAll(/\.from\("([a-z_]+)"\)[\s\S]{0,160}?\.(insert|update|upsert|delete)\(/g)) {
        tables.add(w[1]);
        count++;
      }
      map.set(m[1], { count, tables, body });
    });
  }
  // Un helper peut en appeler un autre : écritures cumulées (fermeture transitive).
  const total = (name, seen = new Set()) => {
    if (seen.has(name)) return { count: 0, tables: new Set() };
    seen.add(name);
    const info = map.get(name);
    let count = info.count;
    const tables = new Set(info.tables);
    for (const other of map.keys()) {
      if (other !== name && new RegExp(`\\b${other}\\(`).test(info.body)) {
        const nested = total(other, seen);
        count += nested.count;
        for (const t of nested.tables) tables.add(t);
      }
    }
    return { count, tables };
  };
  const resolved = new Map();
  for (const name of map.keys()) resolved.set(name, total(name));
  return resolved;
}

const EDGE = {
  "pay/topup/confirm": "Edge Function `pay-topup-confirm`",
  "cron/investments/settle": "pg_cron (0026) + Edge Function `investments-settle`",
  "control-plane/push": "Edge Function `control-plane-push` (appelée par pg_cron)",
  "control-plane/health": "Edge Function `control-plane` (`/health`)",
  "control-plane/metrics": "Edge Function `control-plane` (`/metrics`)",
  "control-plane/audit-logs": "Edge Function `control-plane` (`/audit-logs`)",
  "ai/assist": "Edge Function `ai-assistant`",
};

// Routes dont la logique est passée en base par la migration 0025.
const MOVED = {
  "auth/check-pin": "`pin_status`",
  "auth/set-pin": "`pin_set`",
  "auth/verify-pin": "`pin_verify`",
  "account/delete": "`account_close_self`",
  "hub/profile": "`profile_update`",
  "hub/kyc/submit": "`kyc_submit`",
  "organizations": "`org_create` (POST) ; lecture : table `organizations`",
  "admin/bundle": "`admin_overview`, `admin_supervision`, `admin_investment_supervision`, `admin_users`, `admin_funds_summary`, `admin_anonymized_accounts` + lecture des tables `admin_*`",
  "admin/categories": "`admin_create_category`",
  "admin/commissions": "`admin_set_commission`",
  "admin/config": "`admin_update_config`",
  "admin/countries/[id]/toggle": "`admin_toggle_status('country', id)`",
  "admin/operators/[id]/toggle": "`admin_toggle_status('operator', id)`",
  "admin/integrations/[id]/toggle": "`admin_toggle_status('integration', id)`",
  "admin/disputes/[id]/status": "`admin_set_dispute_status`",
  "admin/kyc/[id]/review": "`admin_review_kyc`",
  "admin/moderation/[id]/review": "`admin_review_moderation`",
  "admin/plans/[id]": "`admin_update_plan`",
  "admin/users/[id]/suspend": "`admin_set_user_suspended`",
};

// Routes dont la logique est passée en base par les migrations 0027 et 0028.
const MOVED_LATER = {
  "organizations/[orgId]/elections/[electionId]/candidates": ["0027", "`election_declare_candidacy`"],
  "organizations/[orgId]/elections/[electionId]/votes": ["0027", "`election_cast_vote`"],
  "organizations/[orgId]/elections/[electionId]": ["0027", "`election_close`"],
  "organizations/[orgId]/signatures": ["0027", "`signature_create` (POST) ; lecture : tables `signature_requests`, `signature_signatories`"],
  "organizations/[orgId]/signatures/[signatureId]/sign": ["0027", "`signature_sign`"],
  "organizations/[orgId]/signatures/[signatureId]/reject": ["0027", "`signature_reject`"],
  "organizations/[orgId]/social-cases": ["0027", "`social_case_create` (POST) ; lecture : table `social_cases`"],
  "organizations/[orgId]/social-cases/[socialCaseId]": ["0027", "`social_case_review`, `social_case_disburse`"],
  "organizations/[orgId]/social-cases/[socialCaseId]/contributions": ["0027", "`social_case_contribute`"],
  "market/services/[serviceId]/reviews": ["0027", "`market_request_service`, `market_respond_service_request`, puis `market_review_service`"],
  "pay/withdraw": ["0027", "Edge Function `pay-withdraw` (la fonction SQL `pay_withdraw` n'est plus appelable par un client)"],
  "hub/favorites/toggle": ["0028", "`hub_toggle_favorite`"],
  "hub/messages": ["0028", "`hub_send_message`"],
  "hub/preferences": ["0028", "`hub_set_preferences`"],
  "organizations/[orgId]/accounting/consolidation": ["0028", "`accounting_consolidate` (POST) ; lecture : table `consolidation_movements`"],
  "organizations/[orgId]/contributions": ["0028", "`contribution_declare` (POST) ; lecture : table `contributions`"],
  "organizations/[orgId]/financial-groups": ["0028", "`group_create` (POST) ; lecture : table `financial_groups`"],
  "organizations/[orgId]/financial-groups/[groupId]/payments": ["0028", "`group_declare_payment`"],
  "organizations/[orgId]/financial-groups/[groupId]/payments/[paymentId]/validate": ["0028", "`group_validate_payment`"],
  "organizations/[orgId]/loans/[loanId]/decision": ["0028", "`loan_decide`"],
  "organizations/[orgId]/loans/[loanId]/installments/[installmentId]/repay": ["0028", "`loan_repay_installment`"],
  "organizations/[orgId]/meetings/[meetingId]/attendees/[attendeeId]": ["0028", "`meeting_check_in`"],
  "organizations/[orgId]/projects/[projectId]/contributions": ["0028", "`project_contribute`"],
  "organizations/[orgId]/relocations/[relocationId]/transfer-decision": ["0028", "`transfer_decide`"],
  "organizations/[orgId]/solidarity/claims/[claimId]/decision": ["0028", "`claim_decide`"],
  "organizations/[orgId]/sponsorship/requests/[requestId]/confirm": ["0028", "`sponsorship_confirm`"],
};

function routeSection() {
  const helpers = helperWrites();
  const rows = [];
  for (const file of walk("app/api").filter((f) => f.endsWith("route.ts")).sort()) {
    const src = read(file);
    const route = file.split(path.sep).join("/").replace("app/api/", "").replace("/route.ts", "").replace(/^route\.ts$/, "(racine)");
    const methods = [...src.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const rpcs = [...new Set([...src.matchAll(/\.rpc\(\s*"([a-z_]+)"/g)].map((m) => m[1]))];
    // Écritures de la méthode HTTP qui en fait le plus (une route PATCH +
    // DELETE à une écriture chacune reste « simple »).
    const starts = [...src.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)];
    const direct = new Set();
    let writes = 0;
    starts.forEach((m, i) => {
      const body = src.slice(m.index, starts[i + 1]?.index ?? src.length);
      const tables = new Set();
      let count = 0;
      for (const w of body.matchAll(/\.from\("([a-z_]+)"\)[\s\S]{0,200}?\.(insert|update|upsert|delete)\(/g)) {
        tables.add(w[1]);
        count++;
      }
      for (const [name, info] of helpers) {
        if (new RegExp(`\\b${name}\\(`).test(body)) {
          count += info.count;
          for (const t of info.tables) tables.add(t);
        }
      }
      if (count > writes) {
        writes = count;
        direct.clear();
        for (const t of tables) direct.add(t);
      } else if (writes <= 1) {
        for (const t of tables) direct.add(t);
      }
    });
    const mutating = methods.some((m) => m !== "GET");

    let status;
    let target;
    if (EDGE[route]) {
      status = "reste serveur → Edge Function";
      target = EDGE[route];
    } else if (MOVED[route]) {
      status = "passé en base (0025)";
      target = MOVED[route];
    } else if (MOVED_LATER[route]) {
      status = `passé en base (${MOVED_LATER[route][0]})`;
      target = MOVED_LATER[route][1];
    } else if (route.startsWith("demo-") || route === "(racine)") {
      status = "sans objet";
      target = "propre à l'application web (démonstration, contrôle de vie)";
    } else if (rpcs.length > 0) {
      status = "déjà en base";
      target = rpcs.map((r) => `\`${r}\``).join(", ");
    } else if (!mutating || writes === 0) {
      status = "déjà en base";
      target = "lecture des tables sous RLS";
    } else if (writes === 1) {
      status = "déjà en base";
      target = `écriture simple sous RLS : \`${[...direct].join("`, `")}\``;
    } else {
      status = "à passer en base";
      target = `${writes} écritures non atomiques : \`${[...direct].join("`, `")}\``;
    }
    rows.push({ route, methods: methods.join(", "), status, target });
  }

  const count = (s) => rows.filter((r) => r.status === s).length;
  const out = [
    `**${rows.length} routes** : ${count("déjà en base")} déjà en base, ${count("passé en base (0025)")} passées en base par la migration 0025, ` +
      `${count("passé en base (0027)")} par la migration 0027, ${count("passé en base (0028)")} par la migration 0028, ` +
      `${count("reste serveur → Edge Function")} en Edge Function, ${count("à passer en base")} restent à passer en base, ${count("sans objet")} sans objet.`,
    "",
  ];
  const areas = [
    ["Authentification et compte", /^(auth|account)\//],
    ["Hub", /^hub\//],
    ["Pay", /^pay\//],
    ["Market", /^market\//],
    ["Organisations : Community, Finance, comptabilité", /^organizations/],
    ["Back-office", /^admin\//],
    ["Serveur : planification, Control Plane, IA", /^(cron|control-plane|ai)\//],
    ["Divers", /./],
  ];
  const used = new Set();
  for (const [title, pattern] of areas) {
    const group = rows.filter((r) => !used.has(r.route) && pattern.test(r.route));
    if (group.length === 0) continue;
    out.push(`### ${title}`, "", "| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |", "| --- | --- | --- | --- |");
    for (const r of group) {
      used.add(r.route);
      out.push(`| \`${r.route}\` | ${r.methods} | ${r.status === "à passer en base" ? "**à passer en base**" : r.status} | ${r.target} |`);
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}

// ---------------------------------------------------------------- Écriture

function replaceSection(file, key, content) {
  const start = `<!-- généré:${key}:début -->`;
  const end = `<!-- généré:${key}:fin -->`;
  const text = read(file);
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a === -1 || b === -1) throw new Error(`${file} : marqueurs « ${key} » introuvables`);
  writeFileSync(file, `${text.slice(0, a + start.length)}\n${content}\n${text.slice(b)}`);
  console.log(`  ${file} : section « ${key} » régénérée`);
}

async function main() {
  const client = pgClient();
  await client.connect();
  try {
    await client.query("begin transaction read only");
    const rpc = await rpcSection(client);
    const tables = await tableSection(client);
    await client.query("rollback");
    replaceSection("docs/CONTRAT_BACKEND_FLUTTER.md", "rpc", rpc);
    replaceSection("docs/CONTRAT_BACKEND_FLUTTER.md", "tables", tables);
    replaceSection("docs/INVENTAIRE_ROUTES_API.md", "routes", routeSection());
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`ÉCHEC : ${err.message}`);
  process.exit(1);
});

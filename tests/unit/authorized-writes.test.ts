import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { apiError } from "@/lib/api/auth";
import { mapPayRpcError, RpcError, throwRpcError } from "@/lib/api/pay-rpc";

function read(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
}

const AUTHORIZED = read("supabase/migrations/0027_authorized_writes.sql");
const ATOMIC = read("supabase/migrations/0028_atomic_operations.sql");

function sqlFunction(name: string, source: string): string {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable`);
  return source.slice(start, source.indexOf("\n$$;", start));
}

// Fonctions appelables par l'application, avec la migration qui les définit.
const CLIENT_FUNCTIONS: [string, string][] = [
  ...[
    "election_declare_candidacy", "election_cast_vote", "election_close",
    "signature_create", "signature_sign", "signature_reject",
    "social_case_create", "social_case_review", "social_case_contribute", "social_case_disburse",
    "market_request_service", "market_respond_service_request", "market_review_service", "market_review_reseller",
  ].map((name): [string, string] => [name, AUTHORIZED]),
  ...[
    "hub_toggle_favorite", "hub_send_message", "hub_set_preferences", "contribution_declare",
    "group_create", "group_declare_payment", "group_validate_payment", "sponsorship_confirm",
    "loan_decide", "loan_repay_installment", "claim_decide", "project_contribute",
    "meeting_check_in", "transfer_decide", "accounting_consolidate",
  ].map((name): [string, string] => [name, ATOMIC]),
];

describe("Migrations 0027 et 0028 : règles communes", () => {
  it("fait vérifier l'identité par chaque fonction, avant toute écriture", () => {
    for (const [name, source] of CLIENT_FUNCTIONS) {
      const body = sqlFunction(name, source);
      const guard = body.indexOf("'Non authentifié' using errcode = 'PY004'");
      expect(guard, name).toBeGreaterThan(-1);
      for (const write of ["\n  update public.", "\n  insert into public.", "\n  delete from public."]) {
        const position = body.indexOf(write);
        if (position !== -1) expect(guard, `${name} : ${write.trim()}`).toBeLessThan(position);
      }
    }
  });

  it("fixe le search_path et ferme chaque fonction à anon", () => {
    for (const [name, source] of CLIENT_FUNCTIONS) {
      expect(sqlFunction(name, source), name).toContain("set search_path = public");
      expect(source, name).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^;]*\\) from public, anon;`));
      expect(source, name).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^;]*\\) to authenticated;`));
    }
  });

  it("n'ouvre aucune écriture directe aux clients", () => {
    for (const source of [AUTHORIZED, ATOMIC]) {
      const policies = source.match(/create policy [^;]+;/g) ?? [];
      for (const policy of policies) {
        // Seule exception : l'avancement d'un parrainage par l'administrateur,
        // qui ne peut jamais aboutir à « confirmed ».
        if (policy.includes('"sr_update"')) {
          expect(policy).toContain("status in ('pending', 'sponsor_accepted', 'declined')");
          continue;
        }
        expect(policy, policy.slice(0, 60)).toContain("for select");
      }
      expect(source).not.toMatch(/grant (all|delete|truncate)/);
      expect(source).not.toMatch(/grant (insert|update) on /);
    }
  });

  it("utilise uniquement des codes d'erreur connus de l'API", () => {
    const codes = new Set(
      Array.from(`${AUTHORIZED}\n${ATOMIC}`.matchAll(/errcode = '([A-Z]{2}\d{3})'/g), (m) => m[1]),
    );
    expect(codes.size).toBeGreaterThan(5);
    for (const code of codes) expect(mapPayRpcError({ code }).status, code).not.toBe(500);
  });

  it("ne laisse aucun rôle ni aucun nom à la main du client", () => {
    // Le rôle vient de la base ; aucune fonction ne reçoit « qui je suis ».
    for (const [name, source] of CLIENT_FUNCTIONS) {
      const signature = sqlFunction(name, source).split("returns")[0];
      expect(signature, name).not.toMatch(/p_(role|actor|requested_by|decided_by|validated_by|voter_id|author_name|contributor_name)\b/);
    }
  });
});

describe("Migration 0027 : votes (RG-C06)", () => {
  it("compte un vote par membre et par scrutin, en base", () => {
    expect(AUTHORIZED).toContain("unique (election_id, voter_id)");
    const vote = sqlFunction("election_cast_vote", AUTHORIZED);
    expect(vote).toContain("from public.elections where id = p_election_id for update;");
    expect(vote).toContain("public.org_is_member(v_election.organization_id)");
    expect(vote).toContain("values (p_election_id, p_candidate_id, v_user)");
    expect(vote).toContain("update public.election_candidates set votes = votes + 1 where id = p_candidate_id;");
    expect(vote.indexOf("'Vote déjà enregistré'")).toBeLessThan(vote.indexOf("insert into public.election_votes"));
  });

  it("garde le bulletin secret et ferme les écritures directes", () => {
    expect(AUTHORIZED).toContain('create policy "election_votes_select_own" on public.election_votes\n  for select using (voter_id = auth.uid());');
    for (const policy of ["elections_update", "ec_insert", "ec_update"]) {
      expect(AUTHORIZED).toContain(`drop policy if exists "${policy}"`);
    }
    for (const table of ["elections", "election_candidates", "election_votes"]) {
      expect(AUTHORIZED).toContain(`revoke all on public.${table} from anon, authenticated;`);
    }
  });

  it("fige un scrutin clôturé, y compris pour le serveur", () => {
    const guard = sqlFunction("election_closed_guard", AUTHORIZED);
    expect(guard).toMatch(/if v_status = 'closed' then\s+raise exception [^;]+PY019/);
    // Pas de security definer ni d'exception pour le service_role.
    expect(guard).not.toContain("service_role");
    for (const trigger of ["elections_closed_guard", "election_candidates_closed_guard", "election_votes_closed_guard"]) {
      expect(AUTHORIZED).toContain(`create trigger ${trigger}`);
    }
    expect(sqlFunction("election_close", AUTHORIZED)).toContain("'president', 'vice_president', 'secretary', 'vice_secretary'");
  });
});

describe("Migration 0027 : signatures", () => {
  it("ne laisse signer que sa propre ligne", () => {
    const sign = sqlFunction("signature_sign", AUTHORIZED);
    expect(sign).toContain("where s.request_id = p_request_id and s.user_id = v_user;");
    expect(sign).toContain("update public.signature_signatories set signed_at = now() where id = v_line.id;");
    expect(sign).not.toContain("p_signatory_id");
    expect(sign).toContain("set status = 'signed', decided_at = now()");
  });

  it("réserve la demande au bureau et exige des signataires avec un compte", () => {
    const create = sqlFunction("signature_create", AUTHORIZED);
    expect(create).toContain("if not public.org_is_bureau(p_organization_id) then");
    expect(create).toContain("and m.user_id is not null;");
    expect(create).toContain("public.org_member_name(p_organization_id), v_user, 'pending')");
    for (const policy of ["sig_insert", "sig_update", "ss_insert", "ss_update"]) {
      expect(AUTHORIZED).toContain(`drop policy if exists "${policy}"`);
    }
  });

  it("garde le contrat des routes de référence", () => {
    const route = read("app/api/organizations/[orgId]/signatures/[signatureId]/sign/route.ts");
    expect(route).toContain("signSignature(ctx.supabase, signatureId)");
    expect(route).not.toContain("signatory_id");
    const lib = read("lib/api/community-governance.ts");
    for (const fn of ["election_declare_candidacy", "election_cast_vote", "election_close", "signature_create", "signature_sign", "signature_reject"]) {
      expect(lib).toContain(`supabase.rpc("${fn}"`);
    }
    expect(lib).not.toMatch(/\.from\("(election_candidates|signature_signatories)"\)\s*\.(insert|update)/);
  });
});

describe("Migration 0027 : cas sociaux (RG-C05)", () => {
  it("réserve la validation au bureau et le décaissement à la trésorerie", () => {
    const review = sqlFunction("social_case_review", AUTHORIZED);
    expect(review).toContain("if not public.org_is_bureau(v_case.organization_id) or v_case.beneficiary_user_id = v_user then");
    expect(review).toContain("if v_case.status not in ('submitted', 'under_review') then");
    const disburse = sqlFunction("social_case_disburse", AUTHORIZED);
    expect(disburse).toContain("'president', 'treasurer', 'vice_treasurer'");
    expect(disburse).toContain("if v_case.status <> 'funded' then");
  });

  it("calcule le montant collecté à partir des contributions", () => {
    const contribute = sqlFunction("social_case_contribute", AUTHORIZED);
    expect(contribute).toContain("set collected_amount = collected_amount + p_amount,");
    expect(contribute).toContain("if v_case.status not in ('approved', 'funded') then");
    expect(contribute).toContain("case when v_anonymous then null else v_user end");
    expect(sqlFunction("social_case_create", AUTHORIZED)).toContain("'submitted', coalesce(p_beneficiary_name, ''), p_beneficiary_user_id,\n     p_target_amount, 0,");
  });

  it("ne diffuse un cas qu'après validation et protège la liste des contributeurs", () => {
    expect(AUTHORIZED).toContain("status in ('approved', 'funded', 'disbursed')");
    expect(AUTHORIZED).toContain("and (c.contributors_visible or public.org_is_bureau(c.organization_id))");
    for (const policy of ["sc_insert", "sc_update", "scc_insert"]) {
      expect(AUTHORIZED).toContain(`drop policy if exists "${policy}"`);
    }
  });
});

describe("Migration 0027 : avis (RG-M04) et retrait", () => {
  it("exige une sollicitation confirmée par le prestataire", () => {
    const review = sqlFunction("market_review_service", AUTHORIZED);
    expect(review).toContain("r.service_id = p_service_id and r.user_id = v_user and r.status = 'confirmed'");
    expect(review).toContain("if p_rating is null or p_rating < 1 or p_rating > 5 then");
    expect(review).toContain("round(avg(r.rating), 2)");
    expect(sqlFunction("market_respond_service_request", AUTHORIZED)).toContain("s.id = v_request.service_id and s.provider_user_id = v_user");
    expect(sqlFunction("market_review_reseller", AUTHORIZED)).toContain("o.buyer_id = v_user and o.status = 'delivered'");
  });

  it("retire au prestataire la main sur sa note", () => {
    const insert = AUTHORIZED.slice(AUTHORIZED.indexOf("grant insert (provider_user_id"), AUTHORIZED.indexOf("on public.market_services to authenticated;"));
    expect(insert).not.toMatch(/rating|reviews_count/);
    expect(AUTHORIZED).toContain('drop policy if exists "market_sreviews_insert"');
    const route = read("app/api/market/services/[serviceId]/reviews/route.ts");
    expect(route).toContain('rpc("market_review_service"');
    expect(route).not.toContain("solicited");
    expect(read("app/api/market/services/route.ts")).not.toMatch(/rating: 0|reviews_count: 0/);
  });

  it("ferme pay_withdraw à tout appel direct", () => {
    expect(AUTHORIZED).toContain("drop function if exists public.pay_withdraw(integer, uuid, text);");
    expect(AUTHORIZED).toContain("revoke all on function public.pay_withdraw(uuid, integer, uuid, text) from public, anon, authenticated;");
    expect(AUTHORIZED).toContain("grant execute on function public.pay_withdraw(uuid, integer, uuid, text) to service_role;");
    const withdraw = sqlFunction("pay_withdraw", AUTHORIZED);
    expect(withdraw).not.toContain("auth.uid()");
    expect(withdraw).toContain("and w.type = 'personal'");
    expect(withdraw).toContain("for update;");

    const route = read("app/api/pay/withdraw/route.ts");
    expect(route).toContain("p_user_id: ctx.user.id,");
    expect(route.indexOf("isRealMoneyBlocked()")).toBeLessThan(route.indexOf("createSupabaseAdminClient()"));
    const fn = read("supabase/functions/pay-withdraw/handler.ts");
    expect(fn.indexOf("isRealMoneyBlocked()")).toBeLessThan(fn.indexOf('.rpc("pay_withdraw"'));
    expect(fn.indexOf("isRealMoneyEnabled()")).toBeLessThan(fn.indexOf('.rpc("pay_withdraw"'));
    expect(fn).toContain("p_user_id: user.id,");
  });
});

describe("Migration 0028 : opérations atomiques", () => {
  it("ne confirme aucun versement sans la trésorerie (RG-F05)", () => {
    const declare = sqlFunction("group_declare_payment", ATOMIC);
    expect(declare).toContain("p_method, p_amount, v_beneficiary_name, 'pending', null)");
    expect(declare).not.toContain("raised_amount");
    const validate = sqlFunction("group_validate_payment", ATOMIC);
    expect(validate).toContain("for update of g;");
    expect(validate).toContain("if not public.org_is_treasurer(v_group.organization_id) and not public.group_is_creator(v_group.id) then");
    expect(validate).toContain("set raised_amount = raised_amount + v_payment.amount");
    expect(sqlFunction("contribution_declare", ATOMIC)).not.toContain("'paid'");
  });

  it("crée le prêt approuvé et ses échéances ensemble, sur décision du bureau (RG-F06)", () => {
    const decide = sqlFunction("loan_decide", ATOMIC);
    expect(decide).toContain("if not public.org_is_bureau(v_org) or public.loan_is_borrower(v_loan) then");
    expect(decide).toContain("if v_loan.status <> 'sponsor_confirmed' then");
    expect(decide).toContain("insert into public.loan_installments (loan_id, position, due_date, amount, status)");
    const repay = sqlFunction("loan_repay_installment", ATOMIC);
    expect(repay).toContain("if not public.org_is_treasurer(v_org) or public.loan_is_borrower(v_loan) then");
    expect(repay).toContain("status = case when repaid_amount + v_installment.amount >= total_due then 'repaid' else status end");
  });

  it("laisse le nouveau membre confirmer lui-même son adhésion (RG-F02)", () => {
    const confirm = sqlFunction("sponsorship_confirm", ATOMIC);
    expect(confirm).toContain("u.phone_confirmed_at is not null");
    expect(confirm).toContain("if v_request.status <> 'sponsor_accepted' then");
    expect(confirm).not.toContain("is_org_admin");
    expect(ATOMIC).toContain("grant update (status) on public.sponsorship_requests to authenticated;");
  });

  it("ne prélève le fonds de garantie que s'il couvre l'indemnité", () => {
    const decide = sqlFunction("claim_decide", ATOMIC);
    expect(decide).toMatch(/if v_fund\.balance < v_claim\.amount then\s+raise exception 'Solde insuffisant' using errcode = 'PY003';/);
    expect(decide.indexOf("for update;")).toBeLessThan(decide.indexOf("set balance = balance - v_claim.amount"));
  });

  it("ferme les écritures directes devenues inutiles", () => {
    for (const policy of [
      "contrib_insert", "fg_insert", "gm_insert", "gt_insert", "gs_insert", "gp_insert", "gp_update",
      "li_insert", "li_update", "ic_update", "pc_insert", "ma_update", "td_insert", "td_update", "cm_update",
    ]) {
      expect(ATOMIC, policy).toContain(`drop policy if exists "${policy}"`);
    }
  });

  it("exécute les fonctions du Hub avec les droits de l'appelant", () => {
    for (const name of ["hub_toggle_favorite", "hub_send_message", "hub_set_preferences"]) {
      expect(sqlFunction(name, ATOMIC), name).not.toContain("security definer");
    }
    for (const [route, fn] of [
      ["favorites/toggle", "hub_toggle_favorite"],
      ["messages", "hub_send_message"],
      ["preferences", "hub_set_preferences"],
    ]) {
      const source = read(`app/api/hub/${route}/route.ts`);
      expect(source).toContain(`rpc("${fn}"`);
      expect(source).not.toContain(".from(");
    }
  });

  it("fait passer chaque route de référence par sa fonction", () => {
    const expected: Record<string, string[]> = {
      "lib/api/finance.ts": ["group_create", "group_declare_payment", "group_validate_payment", "sponsorship_confirm", "loan_decide", "loan_repay_installment", "claim_decide"],
      "lib/api/accounting.ts": ["accounting_consolidate"],
      "lib/api/community-welfare.ts": ["contribution_declare", "social_case_create", "social_case_review", "social_case_disburse", "social_case_contribute"],
      "lib/api/community.ts": ["project_contribute", "meeting_check_in"],
      "lib/api/community-mobility.ts": ["transfer_decide"],
    };
    for (const [file, functions] of Object.entries(expected)) {
      const source = read(file);
      for (const fn of functions) expect(source, `${file} : ${fn}`).toContain(`supabase.rpc("${fn}"`);
    }
  });
});

describe("Erreurs des fonctions SQL côté routes de référence", () => {
  it("garde le statut et le message de la fonction SQL pour un code connu", async () => {
    let thrown: unknown;
    try {
      throwRpcError({ code: "PY006", message: "Action non autorisée" });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(RpcError);
    const response = apiError(thrown);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Action non autorisée" });
  });

  it("n'expose jamais le détail d'une erreur SQL inconnue", async () => {
    let thrown: unknown;
    try {
      throwRpcError({ code: "42501", message: "permission denied for table election_candidates" });
    } catch (err) {
      thrown = err;
    }
    const response = apiError(thrown);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Erreur interne" });
  });
});

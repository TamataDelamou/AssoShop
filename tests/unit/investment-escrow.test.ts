import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getCronSecret,
  isValidCronSecret,
  parseSettlementReport,
} from "@/lib/api/investment-settlement";
import { mapPayRpcError } from "@/lib/api/pay-rpc";
import {
  distributeProRata,
  INVESTMENT_COMMISSION_SERVICE,
  investmentCommission,
  investorShares,
  SettlementInput,
  settlementOutcome,
  stakesByInvestor,
} from "@/lib/market-investments";
import {
  InvestmentDistributionStatus,
  InvestmentProjectStatus,
} from "@/types/modules/market";
import {
  INVESTMENT_DISTRIBUTION_STATUS_LABELS,
  INVESTMENT_PROJECT_STATUS_LABELS,
} from "@/utils/constants";

function read(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../${path}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

const MIGRATION = read("supabase/migrations/0023_investment_escrow_settlement.sql");

// Corps d'une fonction SQL de la migration.
function sqlFunction(name: string): string {
  const start = MIGRATION.indexOf(`create or replace function public.${name}(`);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans 0023`);
  return MIGRATION.slice(start, MIGRATION.indexOf("\n$$;", start));
}

const TODAY = "2026-10-11";

function project(overrides: Partial<SettlementInput> = {}): SettlementInput {
  return {
    status: "open",
    settled: false,
    deadline: "2026-10-10",
    target_amount: 1000,
    escrow_total: 1000,
    has_owner: true,
    ...overrides,
  };
}

describe("Séquestre : dénouement tout ou rien", () => {
  it("verse au porteur quand l'objectif est atteint à la date limite", () => {
    expect(settlementOutcome(project(), TODAY)).toBe("released");
    expect(settlementOutcome(project({ status: "completed", escrow_total: 1500 }), TODAY)).toBe("released");
  });

  it("rembourse quand l'objectif n'est pas atteint", () => {
    expect(settlementOutcome(project({ escrow_total: 999 }), TODAY)).toBe("refunded");
  });

  it("n'agit pas avant le lendemain de la date limite", () => {
    expect(settlementOutcome(project({ deadline: TODAY }), TODAY)).toBe("skipped");
    expect(settlementOutcome(project({ deadline: "2026-12-31", escrow_total: 5000 }), TODAY)).toBe("skipped");
    expect(settlementOutcome(project({ deadline: null }), TODAY)).toBe("skipped");
  });

  it("ne dénoue jamais deux fois", () => {
    expect(settlementOutcome(project({ settled: true }), TODAY)).toBe("skipped");
    expect(settlementOutcome(project({ settled: true, status: "closed" }), TODAY)).toBe("skipped");
  });

  it("rembourse un projet abandonné ou sans porteur, même financé", () => {
    expect(settlementOutcome(project({ status: "closed", deadline: "2026-12-31" }), TODAY)).toBe("refunded");
    expect(settlementOutcome(project({ has_owner: false }), TODAY)).toBe("refunded");
  });

  it("clôt sans mouvement un projet échu sans contribution", () => {
    expect(settlementOutcome(project({ escrow_total: 0 }), TODAY)).toBe("expired");
  });

  it("applique la même décision en base", () => {
    const settle = sqlFunction("market_settle_investment_project");
    expect(settle).toMatch(/if v_project\.settled_at is not null then\s+return 'skipped';/);
    expect(settle).toContain("current_date <= v_project.deadline");
    expect(settle).toContain("or v_total < v_project.target_amount");
    expect(settle).toContain("or v_project.created_by is null;");
    // Le contrôle d'idempotence précède tout mouvement.
    expect(settle.indexOf("settled_at is not null")).toBeLessThan(
      settle.indexOf("update public.pay_wallets"),
    );
  });
});

describe("Séquestre : versement et remboursement en base", () => {
  it("verse le net au porteur et la commission à la plateforme", () => {
    const settle = sqlFunction("market_settle_investment_project");
    expect(settle).toContain("v_commission := public.market_commission(v_total::integer, v_rate);");
    expect(settle).toContain("v_net := v_total::integer - v_commission;");
    expect(settle).toContain("set balance = balance + v_net");
    expect(settle).toContain("perform public.pay_credit_platform(v_commission);");
    expect(settle).toContain("set status = 'funded', settled_at = now(),");
    // Plateforme verrouillée en dernier (ordre de verrou fixe).
    expect(settle.indexOf("pay_credit_platform")).toBeGreaterThan(
      settle.lastIndexOf("update public.pay_wallets"),
    );
  });

  it("rembourse chaque contribution une seule fois, intégralement", () => {
    const settle = sqlFunction("market_settle_investment_project");
    expect(settle).toContain("where c.project_id = v_project.id and c.refunded_at is null");
    expect(settle).toContain("set balance = balance + v_line.amount,");
    expect(settle).toContain("set refunded_at = now(), refund_transaction_id = v_tx_id");
    expect(settle).toContain("set status = 'refunded', settled_at = now()");
    // Aucune commission sur un remboursement.
    const refund = settle.slice(settle.indexOf("if v_refund then"), settle.indexOf("return 'refunded';"));
    expect(refund).not.toContain("pay_credit_platform");
    expect(refund).not.toContain("v_commission");
  });

  it("refuse de dénouer un séquestre incohérent avec les contributions", () => {
    const settle = sqlFunction("market_settle_investment_project");
    expect(settle.match(/v_escrow\.balance <> v_total/g)).toHaveLength(2);
  });

  it("écrit dans pay_transactions et dans le journal d'audit", () => {
    const settle = sqlFunction("market_settle_investment_project");
    expect(settle.match(/insert into public\.pay_transactions/g)).toHaveLength(2);
    expect(settle).toContain("'investment.released', 'investment_project'");
    expect(settle).toContain("'investment.refunded', 'investment_project'");
  });

  it("verrouille le projet, puis les portefeuilles, puis le séquestre", () => {
    const settle = sqlFunction("market_settle_investment_project");
    const projectLock = settle.indexOf("from public.market_investment_projects where id = p_project_id\n  for update;");
    const wallets = settle.indexOf("order by w.id\n    for update;");
    const escrow = settle.indexOf("where project_id = v_project.id and type = 'escrow'\n    for update;");
    expect(projectLock).toBeGreaterThan(-1);
    expect(wallets).toBeGreaterThan(projectLock);
    expect(escrow).toBeGreaterThan(wallets);
  });

  it("isole chaque projet et réserve le planificateur au service_role", () => {
    const run = sqlFunction("market_settle_due_investments");
    expect(run).toContain("where p.settled_at is null");
    expect(run).toContain("exception when others then");
    expect(MIGRATION).toContain(
      "revoke all on function public.market_settle_due_investments() from public, anon, authenticated;",
    );
    expect(MIGRATION).toContain(
      "revoke all on function public.market_settle_investment_project(uuid) from public, anon, authenticated;",
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.market_settle_due_investments() to service_role;",
    );
  });

  it("rembourse aussitôt un projet abandonné par son porteur", () => {
    const close = sqlFunction("market_close_investment_project");
    expect(close).toMatch(/v_project\.created_by is distinct from v_user/);
    expect(close).toContain("perform public.market_settle_investment_project(v_project.id);");
  });

  it("exige une date limite future et refuse d'investir après", () => {
    expect(sqlFunction("market_create_investment_project")).toMatch(
      /if p_deadline is null or p_deadline <= current_date then\s+raise exception [^;]+PY009/,
    );
    expect(sqlFunction("market_invest")).toMatch(
      /current_date > v_project\.deadline then\s+raise exception [^;]+PY019/,
    );
  });
});

describe("Commission investissement", () => {
  it("retient 1 %, le taux du cahier pour le financement participatif", () => {
    expect(MIGRATION).toContain(`('${INVESTMENT_COMMISSION_SERVICE}', 1, 'GNF')`);
    expect(MIGRATION).toContain("on conflict (service) do nothing;");
    expect(sqlFunction("market_investment_commission_rate")).toContain(
      `where c.service = '${INVESTMENT_COMMISSION_SERVICE}'`,
    );
  });

  it("arrondit comme market_commission", () => {
    expect(investmentCommission(5000, 1)).toBe(50);
    expect(investmentCommission(1000, 1)).toBe(10);
    expect(investmentCommission(149, 1)).toBe(1);
    expect(investmentCommission(49, 1)).toBe(0);
    expect(investmentCommission(8000, 0.7)).toBe(56);
  });
});

describe("Bénéfices : répartition au prorata des mises", () => {
  const stakes = [
    { user_id: "a", amount: 600 },
    { user_id: "b", amount: 300 },
    { user_id: "c", amount: 100 },
  ];

  it("cumule les mises par investisseur", () => {
    expect(
      stakesByInvestor([
        { user_id: "a", amount: 400 },
        { user_id: "b", amount: 300 },
        { user_id: "a", amount: 200 },
      ]),
    ).toEqual([
      { user_id: "a", amount: 600 },
      { user_id: "b", amount: 300 },
    ]);
  });

  it("répartit exactement quand le montant est divisible", () => {
    expect(distributeProRata(1000, stakes).map((s) => s.amount)).toEqual([600, 300, 100]);
  });

  it("arrondit à l'unité inférieure sans jamais dépasser le montant déclaré", () => {
    const shares = distributeProRata(100, [
      { user_id: "a", amount: 1 },
      { user_id: "b", amount: 1 },
      { user_id: "c", amount: 1 },
    ]);
    expect(shares.map((s) => s.amount)).toEqual([33, 33, 33]);
    for (const amount of [1, 7, 999, 1001, 123456789]) {
      const total = distributeProRata(amount, stakes).reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBeLessThanOrEqual(amount);
      expect(amount - total).toBeLessThan(stakes.length);
    }
  });

  it("reste exact au-delà de 2^53", () => {
    const shares = distributeProRata(2_000_000_000, [
      { user_id: "a", amount: 2_000_000_000 },
      { user_id: "b", amount: 1_000_000_000 },
    ]);
    expect(shares.map((s) => s.amount)).toEqual([1_333_333_333, 666_666_666]);
  });

  it("ne verse rien sans mise ni montant", () => {
    expect(distributeProRata(0, stakes).every((s) => s.amount === 0)).toBe(true);
    expect(distributeProRata(100, [])).toEqual([]);
  });

  it("applique la même règle en base", () => {
    const review = sqlFunction("market_review_investment_profit");
    expect(review).toContain(
      "floor(v_distribution.amount::numeric * sum(c.amount) / v_total_stake)::integer",
    );
    expect(review).toContain("where c.project_id = v_project.id and c.refunded_at is null");
    // Le porteur n'est débité que de ce qui est effectivement réparti.
    expect(review).toContain("set balance = balance - v_distributed::integer,");
    expect(review).toMatch(/if v_owner_wallet\.balance < v_distributed then\s+raise exception [^;]+PY003/);
  });

  it("présente les parts sans identité", () => {
    const shares = investorShares(
      [
        { user_id: "a", amount: 100 },
        { user_id: "b", amount: 600 },
        { user_id: "a", amount: 300 },
      ],
      "a",
    );
    expect(shares).toEqual([
      { is_me: false, amount: 600, percent: 60 },
      { is_me: true, amount: 400, percent: 40 },
    ]);
    expect(Object.keys(shares[0])).not.toContain("user_id");
    expect(investorShares([], "a")).toEqual([]);
  });
});

describe("Bénéfices : déclaration et validation", () => {
  it("réserve la déclaration au porteur d'un projet financé", () => {
    const declare = sqlFunction("market_declare_investment_profit");
    expect(declare).toMatch(/v_project\.created_by is distinct from v_user then\s+raise exception [^;]+PY006/);
    expect(declare).toMatch(/if v_project\.status <> 'funded' then\s+raise exception [^;]+PY019/);
    // Aucun mouvement de fonds à la déclaration.
    expect(declare).not.toContain("pay_wallets");
    expect(declare).not.toContain("pay_transactions");
    expect(MIGRATION).toMatch(
      /create unique index if not exists idx_market_distributions_pending\s+on public\.market_investment_distributions \(project_id\)\s+where status = 'pending';/,
    );
  });

  it("réserve la validation à un administrateur de la plateforme, hors porteur", () => {
    const review = sqlFunction("market_review_investment_profit");
    expect(review).toMatch(/if not public\.is_platform_admin\(\) then\s+raise exception [^;]+PY006/);
    expect(review).toMatch(/if v_project\.created_by = v_user then\s+raise exception [^;]+PY006/);
    expect(review).toContain("p_status not in ('approved', 'rejected')");
    expect(review.indexOf("is_platform_admin()")).toBeLessThan(
      review.indexOf("update public.pay_wallets"),
    );
  });

  it("ne distribue jamais deux fois la même déclaration", () => {
    const review = sqlFunction("market_review_investment_profit");
    const guard = review.indexOf("if v_distribution.status <> 'pending' then");
    expect(guard).toBeGreaterThan(-1);
    expect(review).toMatch(/if v_distribution\.status <> 'pending' then\s+raise exception [^;]+PY019/);
    expect(guard).toBeLessThan(review.indexOf("update public.pay_wallets"));
    expect(guard).toBeLessThan(review.indexOf("insert into public.market_investment_distribution_shares"));
  });

  it("journalise la distribution et la décision", () => {
    const review = sqlFunction("market_review_investment_profit");
    expect(review).toContain("'investment.profit_distributed', 'investment_distribution'");
    expect(review).toContain("'review_investment_profit:approved:' || v_distribution.id::text");
    expect(review).toContain("'review_investment_profit:rejected:' || v_distribution.id::text");
    expect(review.match(/insert into public\.pay_transactions/g)).toHaveLength(2);
  });

  it("ferme les nouvelles tables en écriture", () => {
    for (const table of [
      "market_investment_distributions",
      "market_investment_distribution_shares",
    ]) {
      expect(MIGRATION).toContain(`alter table public.${table} enable row level security;`);
      expect(MIGRATION).toContain(`revoke all on public.${table} from anon, authenticated;`);
      expect(MIGRATION).toContain(`grant select on public.${table} to authenticated;`);
    }
    // Seules des politiques de lecture sont créées.
    const policies = MIGRATION.match(/create policy [^;]+;/g) ?? [];
    expect(policies).toHaveLength(2);
    for (const policy of policies) expect(policy).toMatch(/\n  for select using/);
  });
});

describe("Supervision et planification", () => {
  it("expose le total bloqué en séquestre au Control Plane", () => {
    const metrics = sqlFunction("cp_metrics_snapshot");
    expect(metrics).toContain("'investment_escrow_balance'");
    expect(metrics).toContain("from pay_wallets where type = 'escrow'");
    // Les métriques de 0021 sont conservées.
    expect(metrics).toContain("'platform_wallet_balance'");
    expect(metrics).toContain("'audit_events_24h'");
  });

  it("désactive la route planifiée sans CRON_SECRET", () => {
    expect(getCronSecret({})).toBeNull();
    expect(getCronSecret({ CRON_SECRET: "  " })).toBeNull();
    expect(getCronSecret({ CRON_SECRET: " secret " })).toBe("secret");
  });

  it("n'accepte que le secret exact, en Bearer", () => {
    expect(isValidCronSecret("Bearer secret", "secret")).toBe(true);
    expect(isValidCronSecret("Bearer secret2", "secret")).toBe(false);
    expect(isValidCronSecret("Bearer ", "secret")).toBe(false);
    expect(isValidCronSecret("secret", "secret")).toBe(false);
    expect(isValidCronSecret(null, "secret")).toBe(false);
  });

  it("normalise le compte rendu du dénouement", () => {
    expect(parseSettlementReport({ released: 1, refunded: 2, expired: 0, failed: [] })).toEqual({
      released: 1,
      refunded: 2,
      expired: 0,
      failed: [],
    });
    expect(parseSettlementReport(null)).toEqual({ released: 0, refunded: 0, expired: 0, failed: [] });
    expect(parseSettlementReport({ released: "x", failed: "y" }).released).toBe(0);
  });

  it("protège les routes planifiées et déclenche le dénouement", () => {
    const cron = read("app/api/cron/investments/settle/route.ts");
    expect(cron).toContain("getCronSecret()");
    expect(cron).toContain("isValidCronSecret(");
    expect(cron).not.toContain("getAuthedContext");
    expect(read("app/api/control-plane/push/route.ts")).toContain("settleDueInvestments(ctx.supabase)");
    expect(read("proxy.ts")).toContain("api/cron");
  });
});

describe("Statuts et codes d'erreur", () => {
  it("libelle chaque statut de projet et de distribution", () => {
    for (const status of Object.values(InvestmentProjectStatus)) {
      expect(INVESTMENT_PROJECT_STATUS_LABELS[status]).toBeTruthy();
    }
    expect(INVESTMENT_PROJECT_STATUS_LABELS[InvestmentProjectStatus.OPEN]).toBe("En collecte");
    expect(INVESTMENT_PROJECT_STATUS_LABELS[InvestmentProjectStatus.FUNDED]).toBe("Financé");
    expect(INVESTMENT_PROJECT_STATUS_LABELS[InvestmentProjectStatus.REFUNDED]).toBe("Remboursé");
    for (const status of Object.values(InvestmentDistributionStatus)) {
      expect(INVESTMENT_DISTRIBUTION_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("utilise en base uniquement des codes connus de l'API", () => {
    const codes = new Set(
      Array.from(MIGRATION.matchAll(/errcode = '(PY\d{3})'/g), (m) => m[1]),
    );
    expect(codes.size).toBeGreaterThan(5);
    for (const code of codes) {
      expect(mapPayRpcError({ code }).status).not.toBe(500);
    }
  });
});

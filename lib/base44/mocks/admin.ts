import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  AdminModule,
  AuditSeverity,
  AuditLogEntry,
  CatalogCategory,
  Dispute,
  DisputeStatus,
  InsurancePartnership,
  KycApplication,
  ModerationItem,
  PlatformConfig,
  PlatformUser,
  PlatformUserStatus,
  ResellerApplication,
  ReviewStatus,
  SecurityAuditEntry,
  SubscriptionInvoice,
} from "@/types/modules/admin";

type AuditLogDTO = Omit<AuditLogEntry, "created_at"> & { created_at: string };
type SecurityAuditDTO = Omit<SecurityAuditEntry, "created_at"> & {
  created_at: string;
};
type PlatformUserDTO = Omit<PlatformUser, "created_at"> & { created_at: string };
type KycDTO = Omit<KycApplication, "submitted_at"> & { submitted_at: string };
type DisputeDTO = Omit<Dispute, "opened_at"> & { opened_at: string };
type ResellerDTO = Omit<ResellerApplication, "submitted_at"> & {
  submitted_at: string;
};
type ModerationDTO = Omit<ModerationItem, "reported_at"> & {
  reported_at: string;
};
type InsuranceDTO = Omit<InsurancePartnership, "active_since"> & {
  active_since: string;
};
type InvoiceDTO = Omit<SubscriptionInvoice, "due_at"> & { due_at: string };

const BUNDLE_URL = /^\/admin\/bundle$/;
const RESELLER_REVIEW_URL = /^\/admin\/resellers\/([^/]+)\/review$/;
const MODERATION_REVIEW_URL = /^\/admin\/moderation\/([^/]+)\/review$/;
const USER_SUSPEND_URL = /^\/admin\/users\/([^/]+)\/suspend$/;
const KYC_REVIEW_URL = /^\/admin\/kyc\/([^/]+)\/review$/;
const DISPUTE_STATUS_URL = /^\/admin\/disputes\/([^/]+)\/status$/;
const COMMISSIONS_URL = /^\/admin\/commissions$/;
const PLANS_URL = /^\/admin\/plans\/([^/]+)$/;
const CONFIG_URL = /^\/admin\/config$/;
const COUNTRY_TOGGLE_URL = /^\/admin\/countries\/([^/]+)\/toggle$/;
const OPERATOR_TOGGLE_URL = /^\/admin\/operators\/([^/]+)\/toggle$/;
const INTEGRATION_TOGGLE_URL = /^\/admin\/integrations\/([^/]+)\/toggle$/;
const CATEGORIES_URL = /^\/admin\/categories$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

// ============================================================
// Données de démonstration
// ============================================================

const dashboard = {
  active_users: 12480,
  associations_count: 342,
  groups_count: 189,
  monthly_volume: 118450000,
  pending_validations: 23,
  disputes_open: 7,
  revenue: 4850000,
  currency: "GNF",
};

const reports = {
  period: "Août 2026",
  modules: [
    {
      module: AdminModule.COMMUNITY,
      label: "Community",
      metric: "Cotisations",
      value: 84200000,
      trend: 12,
    },
    {
      module: AdminModule.FINANCE,
      label: "Finance",
      metric: "Épargne collectée",
      value: 29500000,
      trend: 8,
    },
    {
      module: AdminModule.MARKET,
      label: "Market",
      metric: "Volume d'affaires",
      value: 22100000,
      trend: 15,
    },
    {
      module: AdminModule.PAY,
      label: "Pay",
      metric: "Transactions",
      value: 96400000,
      trend: 21,
    },
  ],
  top_countries: [
    { country: "Guinée", associations: 240, members: 8900, volume: 96000000 },
    { country: "Sénégal", associations: 62, members: 2300, volume: 14000000 },
    {
      country: "Côte d'Ivoire",
      associations: 40,
      members: 1280,
      volume: 8450000,
    },
  ],
};

const national = [
  {
    country: "Guinée",
    associations: 240,
    members: 8900,
    groups: 134,
    cotisations_volume: 84200000,
    projects_financed: 31,
  },
  {
    country: "Sénégal",
    associations: 62,
    members: 2300,
    groups: 37,
    cotisations_volume: 14000000,
    projects_financed: 9,
  },
  {
    country: "Côte d'Ivoire",
    associations: 40,
    members: 1280,
    groups: 18,
    cotisations_volume: 8450000,
    projects_financed: 5,
  },
];

const audit_logs: AuditLogDTO[] = [
  {
    id: "log-1",
    actor: "admin@gsg.africa",
    action: "Validation d'un compte revendeur",
    module: AdminModule.MARKET,
    severity: AuditSeverity.INFO,
    created_at: "2026-08-30T10:00:00.000Z",
  },
  {
    id: "log-2",
    actor: "modo@gsg.africa",
    action: "Retrait d'une annonce signalée",
    module: AdminModule.MARKET,
    severity: AuditSeverity.WARNING,
    created_at: "2026-08-29T16:30:00.000Z",
  },
  {
    id: "log-3",
    actor: "admin@gsg.africa",
    action: "Modification de la grille tarifaire",
    module: AdminModule.PLATFORM,
    severity: AuditSeverity.CRITICAL,
    created_at: "2026-08-28T09:00:00.000Z",
  },
];

const security_audit: SecurityAuditDTO[] = [
  {
    id: "sec-1",
    actor: "admin@gsg.africa",
    ip: "41.82.11.20",
    action: "Connexion",
    result: "Succès",
    created_at: "2026-08-30T08:00:00.000Z",
  },
  {
    id: "sec-2",
    actor: "inconnu",
    ip: "197.149.2.44",
    action: "Tentative de connexion",
    result: "Échec — mot de passe incorrect",
    created_at: "2026-08-30T03:12:00.000Z",
  },
  {
    id: "sec-3",
    actor: "admin@gsg.africa",
    ip: "41.82.11.20",
    action: "Export des statistiques nationales",
    result: "Succès",
    created_at: "2026-08-29T14:00:00.000Z",
  },
];

const users: PlatformUserDTO[] = [
  {
    id: "u-1",
    name: "Aminata Diallo",
    email: "aminata.diallo@example.com",
    phone: "+224 620 00 00 01",
    role: "Membre",
    status: PlatformUserStatus.ACTIVE,
    created_at: "2025-11-12T09:00:00.000Z",
  },
  {
    id: "u-2",
    name: "Mamadou Sow",
    email: "mamadou.sow@example.com",
    phone: "+224 621 00 00 02",
    role: "Trésorier",
    status: PlatformUserStatus.ACTIVE,
    created_at: "2025-10-02T09:00:00.000Z",
  },
  {
    id: "u-3",
    name: "Fatoumata Camara",
    email: "fatoumata@example.com",
    phone: "+224 622 00 00 03",
    role: "Revendeur",
    status: PlatformUserStatus.SUSPENDED,
    created_at: "2026-01-15T09:00:00.000Z",
  },
];

const kyc: KycDTO[] = [
  {
    id: "kyc-1",
    user_name: "Aminata Diallo",
    document_type: "Carte nationale d'identité",
    status: ReviewStatus.PENDING,
    submitted_at: "2026-08-29T08:00:00.000Z",
  },
  {
    id: "kyc-2",
    user_name: "Ibrahima Bah",
    document_type: "Passeport",
    status: ReviewStatus.PENDING,
    submitted_at: "2026-08-28T11:00:00.000Z",
  },
];

const roles = [
  {
    id: "role-1",
    name: "Administrateur plateforme",
    permissions: ["supervision", "configuration", "validation"],
    assigned_agents: 3,
  },
  {
    id: "role-2",
    name: "Modérateur",
    permissions: ["moderation", "litiges"],
    assigned_agents: 5,
  },
  {
    id: "role-3",
    name: "Support",
    permissions: ["utilisateurs", "kyc"],
    assigned_agents: 8,
  },
];

const disputes: DisputeDTO[] = [
  {
    id: "disp-1",
    type: "Commande non livrée",
    claimant: "Aminata Diallo",
    respondent: "Mode & Style (revendeur)",
    description: "Commande payée mais non réceptionnée.",
    status: DisputeStatus.OPEN,
    opened_at: "2026-08-27T10:00:00.000Z",
  },
  {
    id: "disp-2",
    type: "Litige de versement",
    claimant: "Mamadou Sow",
    respondent: "Tontine des commerçantes",
    description: "Désaccord sur le tour de versement.",
    status: DisputeStatus.IN_PROGRESS,
    opened_at: "2026-08-25T09:00:00.000Z",
  },
];

const associations = [
  {
    id: "org-1",
    name: "Association GSG Conakry",
    type: "Association",
    country: "Guinée",
    members_count: 120,
    status: "active",
    reports: 0,
  },
  {
    id: "org-2",
    name: "Coopérative agricole de Kindia",
    type: "Coopérative",
    country: "Guinée",
    members_count: 45,
    status: "active",
    reports: 1,
  },
];

const groups = [
  {
    id: "grp-1",
    name: "Tontine des commerçantes",
    type: "Tontine",
    country: "Guinée",
    members_count: 24,
    anomaly: false,
  },
  {
    id: "grp-2",
    name: "Épargne scolarité",
    type: "Épargne",
    country: "Guinée",
    members_count: 18,
    anomaly: true,
  },
];

const hierarchy = [
  {
    id: "h-1",
    name: "Confédération nationale GSG",
    type: "Confédération",
    parent_id: null,
    country: "Guinée",
    children_count: 3,
  },
  {
    id: "h-2",
    name: "Fédération de Conakry",
    type: "Fédération",
    parent_id: "h-1",
    country: "Guinée",
    children_count: 12,
  },
  {
    id: "h-3",
    name: "Union de Kindia",
    type: "Union",
    parent_id: "h-1",
    country: "Guinée",
    children_count: 8,
  },
];

const solidarity = {
  total_collected: 12300000,
  covered_cases: 4,
  available: 8600000,
  currency: "GNF",
};

const insurance: InsuranceDTO[] = [
  {
    id: "ins-1",
    insurer: "Assureur SA",
    country: "Guinée",
    commission_rate: 5,
    status: "active",
    active_since: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "ins-2",
    insurer: "Mutuelle CEDEAO",
    country: "Sénégal",
    commission_rate: 4,
    status: "active",
    active_since: "2026-04-10T09:00:00.000Z",
  },
];

const resellers: ResellerDTO[] = [
  {
    id: "res-1",
    applicant_name: "Fatoumata Camara",
    business_name: "Mode & Style",
    country: "Guinée",
    status: ReviewStatus.PENDING,
    submitted_at: "2026-08-29T09:00:00.000Z",
  },
  {
    id: "res-2",
    applicant_name: "Ibrahima Bah",
    business_name: "Électronique Plus",
    country: "Guinée",
    status: ReviewStatus.PENDING,
    submitted_at: "2026-08-28T09:00:00.000Z",
  },
];

const categories: CatalogCategory[] = [
  { id: "cat-1", name: "Mode & accessoires", parent: null, products_count: 120 },
  { id: "cat-2", name: "Électronique", parent: null, products_count: 85 },
  { id: "cat-3", name: "Agroalimentaire", parent: null, products_count: 64 },
];

const moderation: ModerationDTO[] = [
  {
    id: "mod-1",
    type: "Produit",
    title: "Téléphone contrefait",
    author: "Électronique Plus",
    reason: "Produit contrefait signalé",
    status: ReviewStatus.PENDING,
    reported_at: "2026-08-30T07:00:00.000Z",
  },
  {
    id: "mod-2",
    type: "Annonce",
    title: "Publicité trompeuse",
    author: "Mode & Style",
    reason: "Promotion mensongère",
    status: ReviewStatus.PENDING,
    reported_at: "2026-08-29T15:00:00.000Z",
  },
];

const investments = [
  {
    id: "inv-1",
    name: "Ferme avicole de Coyah",
    promoter: "Coopérative agricole de Kindia",
    target_amount: 15000000,
    raised_amount: 9400000,
    status: "active",
    currency: "GNF",
  },
  {
    id: "inv-2",
    name: "Atelier de couture",
    promoter: "Association GSG Conakry",
    target_amount: 8000000,
    raised_amount: 8000000,
    status: "clôturé",
    currency: "GNF",
  },
];

const commissions = [
  { id: "com-1", service: "Paiement mobile money", rate: 1, currency: "GNF" },
  { id: "com-2", service: "Commission revendeur B2B", rate: 0.7, currency: "GNF" },
  { id: "com-3", service: "Retrait / transfert", rate: 1, currency: "GNF" },
];

const plans = [
  {
    id: "plan-1",
    tier: "Gratuit",
    monthly_price: 0,
    member_limit: 10,
    currency: "GNF",
  },
  {
    id: "plan-2",
    tier: "Standard",
    monthly_price: 40000,
    member_limit: 100,
    currency: "GNF",
  },
  {
    id: "plan-3",
    tier: "Premium",
    monthly_price: 60000,
    member_limit: -1,
    currency: "GNF",
  },
];

const invoices: InvoiceDTO[] = [
  {
    id: "inv-1",
    organization: "Association GSG Conakry",
    plan: "Premium",
    amount: 60000,
    status: "payée",
    due_at: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "inv-2",
    organization: "Coopérative agricole de Kindia",
    plan: "Standard",
    amount: 40000,
    status: "en attente",
    due_at: "2026-09-01T09:00:00.000Z",
  },
];

const config: PlatformConfig = {
  platform_name: "AssoShop",
  support_email: "support@gsg.africa",
  maintenance_mode: false,
  cgu_version: "v6.3",
  legal_text: "Conditions générales d'utilisation AssoShop V6.",
};

const countries = [
  {
    id: "cty-1",
    code: "GN",
    name: "Guinée",
    currency: "GNF",
    language: "Français",
    timezone: "Africa/Conakry",
    tva_rate: 18,
    status: "active",
  },
  {
    id: "cty-2",
    code: "SN",
    name: "Sénégal",
    currency: "XOF",
    language: "Français",
    timezone: "Africa/Dakar",
    tva_rate: 18,
    status: "active",
  },
  {
    id: "cty-3",
    code: "CI",
    name: "Côte d'Ivoire",
    currency: "XOF",
    language: "Français",
    timezone: "Africa/Abidjan",
    tva_rate: 18,
    status: "active",
  },
];

const operators = [
  { id: "op-1", name: "Orange Money", country: "Guinée", status: "active" },
  { id: "op-2", name: "MTN Mobile Money", country: "Guinée", status: "active" },
  { id: "op-3", name: "Wave", country: "Sénégal", status: "active" },
  { id: "op-4", name: "Moov Money", country: "Côte d'Ivoire", status: "inactive" },
];

const integrations = [
  {
    id: "api-1",
    name: "ERP comptable",
    partner: "Sage",
    api_key: "assoshop_live_8f3a2…",
    webhook_url: "https://erp.partner.com/webhooks/assoshop",
    status: "active",
  },
  {
    id: "api-2",
    name: "Banque partenaire",
    partner: "Banque CEDEAO",
    api_key: "assoshop_live_1b7c9…",
    webhook_url: "https://api.bank.com/webhooks",
    status: "active",
  },
];

function getBundle() {
  return {
    dashboard: clone(dashboard),
    reports: clone(reports),
    national: clone(national),
    audit_logs: clone(audit_logs),
    security_audit: clone(security_audit),
    users: clone(users),
    kyc: clone(kyc),
    roles: clone(roles),
    disputes: clone(disputes),
    associations: clone(associations),
    groups: clone(groups),
    hierarchy: clone(hierarchy),
    solidarity: clone(solidarity),
    insurance: clone(insurance),
    resellers: clone(resellers),
    categories: clone(categories),
    moderation: clone(moderation),
    investments: clone(investments),
    commissions: clone(commissions),
    plans: clone(plans),
    invoices: clone(invoices),
    config: clone(config),
    countries: clone(countries),
    operators: clone(operators),
    integrations: clone(integrations),
  };
}

// ============================================================
// Mutations
// ============================================================

function reviewReseller(id: string, status: ReviewStatus): ResellerDTO[] {
  const item = resellers.find((r) => r.id === id);
  if (item) item.status = status;
  return clone(resellers);
}

function reviewModeration(id: string, status: ReviewStatus): ModerationDTO[] {
  const item = moderation.find((m) => m.id === id);
  if (item) item.status = status;
  return clone(moderation);
}

function suspendUser(id: string): PlatformUserDTO[] {
  const item = users.find((u) => u.id === id);
  if (item) {
    item.status =
      item.status === PlatformUserStatus.ACTIVE
        ? PlatformUserStatus.SUSPENDED
        : PlatformUserStatus.ACTIVE;
  }
  return clone(users);
}

function reviewKyc(id: string, status: ReviewStatus): KycDTO[] {
  const item = kyc.find((k) => k.id === id);
  if (item) item.status = status;
  return clone(kyc);
}

function setDisputeStatus(id: string, status: DisputeStatus): DisputeDTO[] {
  const item = disputes.find((d) => d.id === id);
  if (item) item.status = status;
  return clone(disputes);
}

function upsertCommission(payload: { service: string; rate: number }) {
  const existing = commissions.find((c) => c.service === payload.service);
  if (existing) {
    existing.rate = payload.rate;
  } else {
    commissions.push({
      id: `com-${Date.now()}`,
      service: payload.service,
      rate: payload.rate,
      currency: "GNF",
    });
  }
  return clone(commissions);
}

function updatePlan(id: string, monthly_price: number) {
  const plan = plans.find((p) => p.id === id);
  if (plan) plan.monthly_price = monthly_price;
  return clone(plans);
}

function updateConfig(payload: Partial<PlatformConfig>): PlatformConfig {
  Object.assign(config, payload);
  return clone(config);
}

function toggleCountry(id: string) {
  const item = countries.find((c) => c.id === id);
  if (item) item.status = item.status === "active" ? "inactive" : "active";
  return clone(countries);
}

function toggleOperator(id: string) {
  const item = operators.find((o) => o.id === id);
  if (item) item.status = item.status === "active" ? "inactive" : "active";
  return clone(operators);
}

function toggleIntegration(id: string) {
  const item = integrations.find((i) => i.id === id);
  if (item) item.status = item.status === "active" ? "inactive" : "active";
  return clone(integrations);
}

function addCategory(name: string, parent: string | null) {
  categories.push({
    id: `cat-${Date.now()}`,
    name,
    parent,
    products_count: 0,
  });
  return clone(categories);
}

export function adminMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && BUNDLE_URL.test(url)) {
    return async () => toResponse(getBundle());
  }
  if (method === "post" && RESELLER_REVIEW_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(RESELLER_REVIEW_URL)?.[1] ?? "";
      const status = (cfg.data as { status: ReviewStatus }).status;
      return toResponse(reviewReseller(id, status));
    };
  }
  if (method === "post" && MODERATION_REVIEW_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(MODERATION_REVIEW_URL)?.[1] ?? "";
      const status = (cfg.data as { status: ReviewStatus }).status;
      return toResponse(reviewModeration(id, status));
    };
  }
  if (method === "post" && USER_SUSPEND_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(USER_SUSPEND_URL)?.[1] ?? "";
      return toResponse(suspendUser(id));
    };
  }
  if (method === "post" && KYC_REVIEW_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(KYC_REVIEW_URL)?.[1] ?? "";
      const status = (cfg.data as { status: ReviewStatus }).status;
      return toResponse(reviewKyc(id, status));
    };
  }
  if (method === "post" && DISPUTE_STATUS_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(DISPUTE_STATUS_URL)?.[1] ?? "";
      const status = (cfg.data as { status: DisputeStatus }).status;
      return toResponse(setDisputeStatus(id, status));
    };
  }
  if (method === "post" && COMMISSIONS_URL.test(url)) {
    return async (cfg) =>
      toResponse(upsertCommission(cfg.data as { service: string; rate: number }));
  }
  if (method === "post" && PLANS_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(PLANS_URL)?.[1] ?? "";
      const monthly_price = (cfg.data as { monthly_price: number })
        .monthly_price;
      return toResponse(updatePlan(id, monthly_price));
    };
  }
  if (method === "post" && CONFIG_URL.test(url)) {
    return async (cfg) =>
      toResponse(updateConfig(cfg.data as Partial<PlatformConfig>));
  }
  if (method === "post" && COUNTRY_TOGGLE_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(COUNTRY_TOGGLE_URL)?.[1] ?? "";
      return toResponse(toggleCountry(id));
    };
  }
  if (method === "post" && OPERATOR_TOGGLE_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(OPERATOR_TOGGLE_URL)?.[1] ?? "";
      return toResponse(toggleOperator(id));
    };
  }
  if (method === "post" && INTEGRATION_TOGGLE_URL.test(url)) {
    return async (cfg) => {
      const id = cfg.url?.match(INTEGRATION_TOGGLE_URL)?.[1] ?? "";
      return toResponse(toggleIntegration(id));
    };
  }
  if (method === "post" && CATEGORIES_URL.test(url)) {
    return async (cfg) => {
      const { name, parent } = cfg.data as { name: string; parent: string | null };
      return toResponse(addCategory(name, parent));
    };
  }

  return null;
}

import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CreateFinancialGroupPayload,
  CreateSponsorshipRequestPayload,
  DeclarePaymentPayload,
  EngagementLevel,
  FinancialGroup,
  FinancialGroupStatus,
  FinancialGroupType,
  GroupMember,
  GroupMemberRole,
  GroupPayment,
  GroupPaymentMethod,
  GroupPaymentStatus,
  GroupPeriodicity,
  GroupSettings,
  GroupStatistics,
  GroupTransaction,
  GroupTransactionKind,
  GroupTurn,
  GroupVisibility,
  RespondSponsorshipPayload,
  SponsorshipRequest,
  SponsorshipRequestStatus,
  UpdateGroupSettingsPayload,
} from "@/types/modules/finance";

// Représentation sérialisable (dates en chaînes ISO) renvoyée par le mock.
type MemberDTO = Omit<GroupMember, "joined_at" | "last_payment_at"> & {
  joined_at: string | null;
  last_payment_at: string | null;
};

type PaymentDTO = Omit<GroupPayment, "paid_at"> & {
  paid_at: string | null;
};

type TurnDTO = Omit<GroupTurn, "expected_date" | "received_at"> & {
  expected_date: string | null;
  received_at: string | null;
};

type FinancialGroupDTO = Omit<
  FinancialGroup,
  "start_date" | "created_at" | "members" | "payments" | "turns"
> & {
  start_date: string | null;
  created_at: string | null;
  members: MemberDTO[];
  payments: PaymentDTO[];
  turns: TurnDTO[];
};

type TransactionDTO = Omit<GroupTransaction, "date"> & {
  date: string | null;
};

type StatisticsDTO = Omit<GroupStatistics, "last_payment_at"> & {
  last_payment_at: string | null;
};

type SponsorshipRequestDTO = Omit<SponsorshipRequest, "created_at"> & {
  created_at: string | null;
};

const store: FinancialGroupDTO[] = [
  {
    id: "fg-1",
    organization_id: "org-1",
    name: "Tontine du marché",
    type: FinancialGroupType.TONTINE,
    status: FinancialGroupStatus.ACTIVE,
    amount: 100000,
    periodicity: GroupPeriodicity.WEEKLY,
    max_members: 20,
    goal_amount: null,
    interest_rate: null,
    start_date: "2026-01-05T00:00:00.000Z",
    created_at: "2025-12-20T00:00:00.000Z",
    raised_amount: 300000,
    members: [
      {
        id: "fm-1",
        name: "Mamadou Sow",
        role: GroupMemberRole.CREATOR,
        engagement: EngagementLevel.EXEMPLARY,
        joined_at: "2025-12-20T00:00:00.000Z",
        last_payment_at: "2026-02-26T00:00:00.000Z",
      },
      {
        id: "fm-2",
        name: "Aminata Bah",
        role: GroupMemberRole.SPONSOR,
        engagement: EngagementLevel.RELIABLE,
        joined_at: "2025-12-22T00:00:00.000Z",
        last_payment_at: "2026-02-24T00:00:00.000Z",
      },
      {
        id: "fm-3",
        name: "Ibrahima Diallo",
        role: GroupMemberRole.MEMBER,
        engagement: EngagementLevel.IRREGULAR,
        joined_at: "2026-01-10T00:00:00.000Z",
        last_payment_at: "2026-02-10T00:00:00.000Z",
      },
      {
        id: "fm-4",
        name: "Fatou Camara",
        role: GroupMemberRole.MEMBER,
        engagement: EngagementLevel.AT_RISK,
        joined_at: "2026-01-15T00:00:00.000Z",
        last_payment_at: "2026-01-15T00:00:00.000Z",
      },
    ],
    payments: [
      {
        id: "fp-1",
        member_id: "fm-1",
        member_name: "Mamadou Sow",
        method: GroupPaymentMethod.MOBILE,
        amount: 100000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-26T00:00:00.000Z",
      },
      {
        id: "fp-2",
        member_id: "fm-2",
        member_name: "Aminata Bah",
        method: GroupPaymentMethod.MOBILE,
        amount: 100000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-24T00:00:00.000Z",
      },
      {
        id: "fp-3",
        member_id: "fm-1",
        member_name: "Mamadou Sow",
        method: GroupPaymentMethod.MOBILE,
        amount: 100000,
        paid_for_member_name: "Fatou Camara",
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-20T00:00:00.000Z",
      },
      {
        id: "fp-4",
        member_id: "fm-3",
        member_name: "Ibrahima Diallo",
        method: GroupPaymentMethod.CASH,
        amount: 100000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.PENDING,
        paid_at: null,
      },
    ],
    turns: [
      {
        id: "turn-1",
        member_id: "fm-1",
        member_name: "Mamadou Sow",
        position: 1,
        expected_date: "2026-01-12T00:00:00.000Z",
        received: true,
        received_at: "2026-01-12T00:00:00.000Z",
      },
      {
        id: "turn-2",
        member_id: "fm-2",
        member_name: "Aminata Bah",
        position: 2,
        expected_date: "2026-01-19T00:00:00.000Z",
        received: true,
        received_at: "2026-01-19T00:00:00.000Z",
      },
      {
        id: "turn-3",
        member_id: "fm-3",
        member_name: "Ibrahima Diallo",
        position: 3,
        expected_date: "2026-01-26T00:00:00.000Z",
        received: true,
        received_at: "2026-01-26T00:00:00.000Z",
      },
      {
        id: "turn-4",
        member_id: "fm-4",
        member_name: "Fatou Camara",
        position: 4,
        expected_date: "2026-02-02T00:00:00.000Z",
        received: false,
        received_at: null,
      },
    ],
  },
  {
    id: "fg-2",
    organization_id: "org-1",
    name: "Caisse du pèlerinage",
    type: FinancialGroupType.SAVINGS_GOAL,
    status: FinancialGroupStatus.ACTIVE,
    amount: 50000,
    periodicity: GroupPeriodicity.MONTHLY,
    max_members: 30,
    goal_amount: 5000000,
    interest_rate: null,
    start_date: "2025-09-01T00:00:00.000Z",
    created_at: "2025-08-15T00:00:00.000Z",
    raised_amount: 150000,
    members: [
      {
        id: "fm-5",
        name: "Ousmane Barry",
        role: GroupMemberRole.CREATOR,
        engagement: EngagementLevel.RELIABLE,
        joined_at: "2025-08-15T00:00:00.000Z",
        last_payment_at: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "fm-6",
        name: "Mariama Touré",
        role: GroupMemberRole.SPONSOR,
        engagement: EngagementLevel.EXEMPLARY,
        joined_at: "2025-08-20T00:00:00.000Z",
        last_payment_at: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "fm-7",
        name: "Sékou Condé",
        role: GroupMemberRole.MEMBER,
        engagement: EngagementLevel.RELIABLE,
        joined_at: "2025-09-10T00:00:00.000Z",
        last_payment_at: "2026-02-01T00:00:00.000Z",
      },
    ],
    payments: [
      {
        id: "fp-5",
        member_id: "fm-5",
        member_name: "Ousmane Barry",
        method: GroupPaymentMethod.MOBILE,
        amount: 50000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "fp-6",
        member_id: "fm-6",
        member_name: "Mariama Touré",
        method: GroupPaymentMethod.MOBILE,
        amount: 50000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "fp-7",
        member_id: "fm-7",
        member_name: "Sékou Condé",
        method: GroupPaymentMethod.MOBILE,
        amount: 50000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-01T00:00:00.000Z",
      },
    ],
    turns: [],
  },
  {
    id: "fg-3",
    organization_id: "org-1",
    name: "Épargne solidarité",
    type: FinancialGroupType.SAVINGS,
    status: FinancialGroupStatus.ACTIVE,
    amount: 25000,
    periodicity: GroupPeriodicity.WEEKLY,
    max_members: 15,
    goal_amount: null,
    interest_rate: 5,
    start_date: "2026-01-12T00:00:00.000Z",
    created_at: "2026-01-05T00:00:00.000Z",
    raised_amount: 50000,
    members: [
      {
        id: "fm-8",
        name: "Bureau de l'association",
        role: GroupMemberRole.CREATOR,
        engagement: EngagementLevel.RELIABLE,
        joined_at: "2026-01-05T00:00:00.000Z",
        last_payment_at: "2026-02-23T00:00:00.000Z",
      },
      {
        id: "fm-9",
        name: "Kadiatou Sylla",
        role: GroupMemberRole.MEMBER,
        engagement: EngagementLevel.EXEMPLARY,
        joined_at: "2026-01-12T00:00:00.000Z",
        last_payment_at: "2026-02-23T00:00:00.000Z",
      },
      {
        id: "fm-10",
        name: "Alpha Baldé",
        role: GroupMemberRole.MEMBER,
        engagement: EngagementLevel.RELIABLE,
        joined_at: "2026-01-19T00:00:00.000Z",
        last_payment_at: "2026-02-16T00:00:00.000Z",
      },
    ],
    payments: [
      {
        id: "fp-8",
        member_id: "fm-9",
        member_name: "Kadiatou Sylla",
        method: GroupPaymentMethod.MOBILE,
        amount: 25000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-23T00:00:00.000Z",
      },
      {
        id: "fp-9",
        member_id: "fm-10",
        member_name: "Alpha Baldé",
        method: GroupPaymentMethod.MOBILE,
        amount: 25000,
        paid_for_member_name: null,
        status: GroupPaymentStatus.CONFIRMED,
        paid_at: "2026-02-23T00:00:00.000Z",
      },
    ],
    turns: [],
  },
];

const sponsorshipStore: SponsorshipRequestDTO[] = [
  {
    id: "sr-1",
    group_id: "fg-1",
    group_name: "Tontine du marché",
    sponsor_id: "fm-1",
    sponsor_name: "Mamadou Sow",
    invitee_name: "Fatoumata Keïta",
    invitee_phone: "+224 622 11 22 33",
    status: SponsorshipRequestStatus.PENDING,
    created_at: "2026-02-24T00:00:00.000Z",
  },
  {
    id: "sr-2",
    group_id: "fg-1",
    group_name: "Tontine du marché",
    sponsor_id: "fm-2",
    sponsor_name: "Aminata Bah",
    invitee_name: "Mohamed Camara",
    invitee_phone: null,
    status: SponsorshipRequestStatus.SPONSOR_ACCEPTED,
    created_at: "2026-02-22T00:00:00.000Z",
  },
  {
    id: "sr-3",
    group_id: "fg-2",
    group_name: "Caisse du pèlerinage",
    sponsor_id: "fm-6",
    sponsor_name: "Mariama Touré",
    invitee_name: "Aïssatou Barry",
    invitee_phone: "+224 655 00 11 22",
    status: SponsorshipRequestStatus.DECLINED,
    created_at: "2026-02-20T00:00:00.000Z",
  },
];

const LIST_URL = /^\/organizations\/[^/]+\/financial-groups$/;
const PAYMENTS_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/payments$/;
const VALIDATE_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/payments\/([^/]+)\/validate$/;
const TRANSACTIONS_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/transactions$/;
const STATISTICS_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/statistics$/;
const SETTINGS_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/settings$/;
const CLOSE_URL =
  /^\/organizations\/[^/]+\/financial-groups\/([^/]+)\/close$/;
const SPONSORSHIP_URL = /^\/organizations\/[^/]+\/sponsorship$/;
const SPONSORSHIP_REQUESTS_URL =
  /^\/organizations\/[^/]+\/sponsorship\/requests$/;
const SPONSORSHIP_RESPOND_URL =
  /^\/organizations\/[^/]+\/sponsorship\/requests\/([^/]+)\/respond$/;
const SPONSORSHIP_CONFIRM_URL =
  /^\/organizations\/[^/]+\/sponsorship\/requests\/([^/]+)\/confirm$/;

const settingsStore: Record<string, GroupSettings> = {};

function settingsFor(groupId: string): GroupSettings {
  if (!settingsStore[groupId]) {
    settingsStore[groupId] = {
      group_id: groupId,
      visibility: GroupVisibility.PRIVATE,
      allow_join_requests: false,
      notify_payment_reminders: true,
    };
  }
  return settingsStore[groupId];
}

// Groupes ouverts à la découverte via un parrain (FIN-10).
settingsStore["fg-2"] = {
  group_id: "fg-2",
  visibility: GroupVisibility.PUBLIC,
  allow_join_requests: true,
  notify_payment_reminders: true,
};
settingsStore["fg-3"] = {
  group_id: "fg-3",
  visibility: GroupVisibility.MEMBERS,
  allow_join_requests: true,
  notify_payment_reminders: true,
};

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

function listGroups(config: InternalAxiosRequestConfig): FinancialGroupDTO[] {
  const params = (config.params ?? {}) as { search?: string; type?: string };
  let result = store.slice();

  if (params.search) {
    const needle = params.search.toLowerCase();
    result = result.filter((g) => g.name.toLowerCase().includes(needle));
  }

  if (params.type && params.type !== "all") {
    result = result.filter((g) => g.type === params.type);
  }

  return clone(result);
}

function createGroup(config: InternalAxiosRequestConfig): FinancialGroupDTO {
  const payload = (config.data ?? {}) as CreateFinancialGroupPayload;
  const nowIso = new Date().toISOString();
  const startDate = payload.start_date
    ? new Date(`${payload.start_date}T00:00:00.000Z`).toISOString()
    : null;
  const intervalDays = payload.periodicity === GroupPeriodicity.WEEKLY ? 7 : 30;

  const members: MemberDTO[] = [
    {
      id: `fm-${Date.now()}`,
      name: "Bureau de l'association",
      role: GroupMemberRole.CREATOR,
      engagement: EngagementLevel.RELIABLE,
      joined_at: nowIso,
      last_payment_at: null,
    },
  ];

  // FIN-3 : génération de l'ordre de passage et des dates des tours.
  const turns: TurnDTO[] = [];
  const names =
    payload.type === FinancialGroupType.TONTINE
      ? (payload.turn_member_names ?? []).slice(
          0,
          Math.max(0, payload.max_members - 1),
        )
      : [];

  names.forEach((name, index) => {
    members.push({
      id: `fm-${Date.now()}-${index}`,
      name,
      role: GroupMemberRole.MEMBER,
      engagement: EngagementLevel.RELIABLE,
      joined_at: nowIso,
      last_payment_at: null,
    });
  });

  if (names.length > 0) {
    const base = startDate ? new Date(startDate).getTime() : Date.now();
    names.forEach((name, index) => {
      turns.push({
        id: `ft-${Date.now()}-${index}`,
        member_id: members[index + 1].id,
        member_name: name,
        position: index + 1,
        expected_date: new Date(
          base + index * intervalDays * 86_400_000,
        ).toISOString(),
        received: false,
        received_at: null,
      });
    });
  }

  const record: FinancialGroupDTO = {
    id: `fg-${Date.now()}`,
    organization_id: "org-1",
    name: payload.name,
    type: payload.type,
    status: FinancialGroupStatus.FORMING,
    amount: payload.amount,
    periodicity: payload.periodicity,
    max_members: payload.max_members,
    goal_amount: payload.goal_amount ?? null,
    interest_rate: payload.interest_rate ?? null,
    start_date: startDate,
    created_at: nowIso,
    raised_amount: 0,
    members,
    payments: [],
    turns,
  };
  store.unshift(record);
  return clone(record);
}

function declarePayment(config: InternalAxiosRequestConfig): FinancialGroupDTO | null {
  const match = config.url?.match(PAYMENTS_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as DeclarePaymentPayload;
  const group = store.find((g) => g.id === match[1]);
  if (!group) return null;

  const member = group.members.find((m) => m.id === payload.member_id);
  const beneficiary = payload.paid_for_member_id
    ? group.members.find((m) => m.id === payload.paid_for_member_id)
    : undefined;
  const confirmed = payload.method === GroupPaymentMethod.MOBILE;

  group.payments.push({
    id: `fp-${Date.now()}`,
    member_id: payload.member_id,
    member_name: member?.name ?? "Membre",
    method: payload.method,
    amount: payload.amount,
    paid_for_member_name: beneficiary?.name ?? null,
    status: confirmed
      ? GroupPaymentStatus.CONFIRMED
      : GroupPaymentStatus.PENDING,
    paid_at: confirmed ? new Date().toISOString() : null,
  });

  if (confirmed) {
    group.raised_amount += payload.amount;
  }

  return clone(group);
}

function validatePayment(
  config: InternalAxiosRequestConfig,
): FinancialGroupDTO | null {
  const match = config.url?.match(VALIDATE_URL);
  if (!match) return null;

  const group = store.find((g) => g.id === match[1]);
  if (!group) return null;

  const payment = group.payments.find((p) => p.id === match[2]);
  if (!payment) return null;

  if (payment.status === GroupPaymentStatus.PENDING) {
    payment.status = GroupPaymentStatus.CONFIRMED;
    payment.paid_at = new Date().toISOString();
    group.raised_amount += payment.amount;
  }

  return clone(group);
}

function getTransactions(
  config: InternalAxiosRequestConfig,
): TransactionDTO[] {
  const match = config.url?.match(TRANSACTIONS_URL);
  const groupId = match?.[1] ?? "";
  const group = store.find((g) => g.id === groupId);
  if (!group) return [];

  const transactions: TransactionDTO[] = [
    {
      id: `${groupId}-tx-0`,
      group_id: groupId,
      kind: GroupTransactionKind.CREATION,
      label: "Ouverture du groupe",
      amount: 0,
      member_name: null,
      date: group.created_at,
    },
  ];

  for (const p of group.payments) {
    const confirmed = p.status === GroupPaymentStatus.CONFIRMED;
    transactions.push({
      id: p.id,
      group_id: groupId,
      kind: confirmed
        ? GroupTransactionKind.PAYMENT
        : GroupTransactionKind.PAYMENT_DECLARED,
      label: confirmed
        ? "Versement confirmé"
        : "Versement déclaré (en attente)",
      amount: confirmed ? p.amount : 0,
      member_name: p.paid_for_member_name
        ? `${p.member_name} (pour ${p.paid_for_member_name})`
        : p.member_name,
      date: p.paid_at,
    });
  }

  for (const t of group.turns) {
    if (t.received) {
      transactions.push({
        id: t.id,
        group_id: groupId,
        kind: GroupTransactionKind.TURN_PAYOUT,
        label: `Tour ${t.position} versé à ${t.member_name}`,
        amount: -group.amount,
        member_name: t.member_name,
        date: t.received_at,
      });
    }
  }

  transactions.sort((a, b) => {
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });

  return clone(transactions);
}

function getStatistics(config: InternalAxiosRequestConfig): StatisticsDTO {
  const match = config.url?.match(STATISTICS_URL);
  const groupId = match?.[1] ?? "";
  const group = store.find((g) => g.id === groupId);

  if (!group) {
    return {
      group_id: groupId,
      total_raised: 0,
      payments_count: 0,
      pending_count: 0,
      confirmed_count: 0,
      members_count: 0,
      turns_total: 0,
      turns_received: 0,
      regularity_rate: 0,
      last_payment_at: null,
    };
  }

  const payments = group.payments ?? [];
  const confirmed = payments.filter(
    (p) => p.status === GroupPaymentStatus.CONFIRMED,
  ).length;
  const pending = payments.filter(
    (p) => p.status === GroupPaymentStatus.PENDING,
  ).length;
  const lastPaid = payments
    .filter((p) => p.paid_at)
    .map((p) => new Date(p.paid_at as string).getTime())
    .sort((a, b) => b - a)[0];

  return {
    group_id: groupId,
    total_raised: group.raised_amount,
    payments_count: payments.length,
    pending_count: pending,
    confirmed_count: confirmed,
    members_count: group.members?.length ?? 0,
    turns_total: group.turns?.length ?? 0,
    turns_received: group.turns?.filter((t) => t.received).length ?? 0,
    regularity_rate:
      payments.length === 0
        ? 0
        : Math.round((confirmed / payments.length) * 100),
    last_payment_at: lastPaid ? new Date(lastPaid).toISOString() : null,
  };
}

function getSettings(config: InternalAxiosRequestConfig): GroupSettings {
  const match = config.url?.match(SETTINGS_URL);
  return clone(settingsFor(match?.[1] ?? ""));
}

function updateSettings(config: InternalAxiosRequestConfig): GroupSettings {
  const match = config.url?.match(SETTINGS_URL);
  const groupId = match?.[1] ?? "";
  const payload = (config.data ?? {}) as UpdateGroupSettingsPayload;
  const current = settingsFor(groupId);

  current.visibility = payload.visibility ?? current.visibility;
  current.allow_join_requests =
    payload.allow_join_requests ?? current.allow_join_requests;
  current.notify_payment_reminders =
    payload.notify_payment_reminders ?? current.notify_payment_reminders;

  return clone(current);
}

function closeGroup(config: InternalAxiosRequestConfig): FinancialGroupDTO | null {
  const match = config.url?.match(CLOSE_URL);
  const group = store.find((g) => g.id === match?.[1]);
  if (!group) return null;

  if (group.status !== FinancialGroupStatus.CLOSED) {
    group.status = FinancialGroupStatus.CLOSED;
  }
  return clone(group);
}

function getSponsorship(): {
  requests: SponsorshipRequestDTO[];
  open_groups: FinancialGroupDTO[];
} {
  const openGroups = store.filter((g) => {
    if (g.status === FinancialGroupStatus.CLOSED) return false;
    const s = settingsFor(g.id);
    return s.allow_join_requests || s.visibility !== GroupVisibility.PRIVATE;
  });
  return {
    requests: clone(sponsorshipStore),
    open_groups: clone(openGroups),
  };
}

function createSponsorshipRequest(
  config: InternalAxiosRequestConfig,
): SponsorshipRequestDTO {
  const payload = (config.data ?? {}) as CreateSponsorshipRequestPayload;
  const group = store.find((g) => g.id === payload.group_id);
  const sponsor = group?.members?.find((m) => m.id === payload.sponsor_id);

  const record: SponsorshipRequestDTO = {
    id: `sr-${Date.now()}`,
    group_id: payload.group_id,
    group_name: group?.name ?? "Groupe",
    sponsor_id: payload.sponsor_id,
    sponsor_name: sponsor?.name ?? "Parrain",
    invitee_name: payload.invitee_name,
    invitee_phone: payload.invitee_phone ?? null,
    status: SponsorshipRequestStatus.PENDING,
    created_at: new Date().toISOString(),
  };
  sponsorshipStore.unshift(record);
  return clone(record);
}

function respondSponsorship(
  config: InternalAxiosRequestConfig,
): SponsorshipRequestDTO | null {
  const match = config.url?.match(SPONSORSHIP_RESPOND_URL);
  const request = sponsorshipStore.find((r) => r.id === match?.[1]);
  if (!request) return null;

  const payload = (config.data ?? {}) as RespondSponsorshipPayload;
  request.status =
    payload.decision === "accept"
      ? SponsorshipRequestStatus.SPONSOR_ACCEPTED
      : SponsorshipRequestStatus.DECLINED;
  return clone(request);
}

function confirmSponsorship(
  config: InternalAxiosRequestConfig,
): SponsorshipRequestDTO | null {
  const match = config.url?.match(SPONSORSHIP_CONFIRM_URL);
  const request = sponsorshipStore.find((r) => r.id === match?.[1]);
  if (!request) return null;

  request.status = SponsorshipRequestStatus.CONFIRMED;

  // RG-F02 : l'adhésion n'est effective qu'après confirmation du nouveau membre.
  const group = store.find((g) => g.id === request.group_id);
  if (group && !group.members.some((m) => m.name === request.invitee_name)) {
    group.members.push({
      id: `fm-${Date.now()}`,
      name: request.invitee_name,
      role: GroupMemberRole.MEMBER,
      engagement: EngagementLevel.RELIABLE,
      joined_at: new Date().toISOString(),
      last_payment_at: null,
    });
  }
  return clone(request);
}

export function financeMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(listGroups(cfg));
  }
  if (method === "post" && LIST_URL.test(url)) {
    return async (cfg) => toResponse(createGroup(cfg));
  }
  if (method === "post" && PAYMENTS_URL.test(url)) {
    return async (cfg) => toResponse(declarePayment(cfg));
  }
  if (method === "post" && VALIDATE_URL.test(url)) {
    return async (cfg) => toResponse(validatePayment(cfg));
  }
  if (method === "get" && TRANSACTIONS_URL.test(url)) {
    return async (cfg) => toResponse(getTransactions(cfg));
  }
  if (method === "get" && STATISTICS_URL.test(url)) {
    return async (cfg) => toResponse(getStatistics(cfg));
  }
  if (method === "get" && SETTINGS_URL.test(url)) {
    return async (cfg) => toResponse(getSettings(cfg));
  }
  if (method === "post" && SETTINGS_URL.test(url)) {
    return async (cfg) => toResponse(updateSettings(cfg));
  }
  if (method === "post" && CLOSE_URL.test(url)) {
    return async (cfg) => toResponse(closeGroup(cfg));
  }
  if (method === "get" && SPONSORSHIP_URL.test(url)) {
    return async () => toResponse(getSponsorship());
  }
  if (method === "post" && SPONSORSHIP_REQUESTS_URL.test(url)) {
    return async (cfg) => toResponse(createSponsorshipRequest(cfg));
  }
  if (method === "post" && SPONSORSHIP_RESPOND_URL.test(url)) {
    return async (cfg) => toResponse(respondSponsorship(cfg));
  }
  if (method === "post" && SPONSORSHIP_CONFIRM_URL.test(url)) {
    return async (cfg) => toResponse(confirmSponsorship(cfg));
  }

  return null;
}

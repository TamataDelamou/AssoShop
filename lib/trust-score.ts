import { EngagementLevel, GroupMember, GroupMemberRole } from "@/types/modules/finance";

export interface TrustScore {
  regularity: number;
  repayments: number;
  participation: number;
  seniority: number;
  total: number;
  level: EngagementLevel;
}

const ENGAGEMENT_BASE: Record<EngagementLevel, number> = {
  [EngagementLevel.AT_RISK]: 30,
  [EngagementLevel.IRREGULAR]: 55,
  [EngagementLevel.RELIABLE]: 80,
  [EngagementLevel.EXEMPLARY]: 95,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeTrustScore(member: GroupMember): TrustScore {
  const base = ENGAGEMENT_BASE[member.engagement];

  const regularity = base;
  const repayments =
    member.engagement === EngagementLevel.EXEMPLARY ? 90 : base;
  const participation = clamp(
    base + (member.role === GroupMemberRole.CREATOR ? 10 : 0),
  );
  const monthsActive = member.joined_at
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - member.joined_at.getTime()) /
            (30 * 24 * 60 * 60 * 1000),
        ),
      )
    : 1;
  const seniority = clamp(monthsActive * 3);

  const total = clamp(
    regularity * 0.35 +
      repayments * 0.25 +
      participation * 0.2 +
      seniority * 0.2,
  );

  const level =
    total >= 85
      ? EngagementLevel.EXEMPLARY
      : total >= 65
        ? EngagementLevel.RELIABLE
        : total >= 45
          ? EngagementLevel.IRREGULAR
          : EngagementLevel.AT_RISK;

  return { regularity, repayments, participation, seniority, total, level };
}

"use client";

import { useCallback, useState } from "react";
import { mobilityService } from "@/services/community/mobility";
import { aiAssistant } from "@/lib/ai";
import {
  ENGAGEMENT_LEVEL_OPTIONS,
  MOBILITY_CONFIG,
} from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";
import {
  DecideTransferPayload,
  GenerateMobilityReportPayload,
  MemberRelocation,
  MobilityReport,
  TransferDecision,
} from "@/types/modules/community";

declareOffline({
  module: "mobility",
  cacheableReads: [MOBILITY_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseReport(r: MobilityReport): MobilityReport {
  return {
    ...r,
    generated_at: r.generated_at ? new Date(r.generated_at) : null,
  };
}

function parseDecision(d: TransferDecision): TransferDecision {
  return {
    ...d,
    decided_at: d.decided_at ? new Date(d.decided_at) : null,
  };
}

interface MobilityBundle {
  reports: MobilityReport[];
  decisions: TransferDecision[];
}

export function useMobility(organizationId: string) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<MobilityBundle>(
      `${MOBILITY_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      () => mobilityService.getBundle(organizationId),
      {
        ttlMs: MOBILITY_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => ({
          reports: bundle.reports.map(parseReport),
          decisions: bundle.decisions.map(parseDecision),
        }),
      },
    );

  const error = actionError ?? loadError;

  const generateReport = useCallback(
    async (relocationId: string, payload: GenerateMobilityReportPayload) => {
      setBusyId(relocationId);
      setActionError(null);
      try {
        const report = await mobilityService.generateReport(
          organizationId,
          relocationId,
          payload,
        );
        await refresh();
        return report;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const decide = useCallback(
    async (relocationId: string, payload: DecideTransferPayload) => {
      setBusyId(relocationId);
      setActionError(null);
      try {
        const decision = await mobilityService.decide(
          organizationId,
          relocationId,
          payload,
        );
        await refresh();
        return decision;
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  // Synthèse IA locale du rapport de mobilité (point d'entrée unique).
  const synthesize = useCallback(
    async (report: MobilityReport, relocation: MemberRelocation) => {
      const label =
        ENGAGEMENT_LEVEL_OPTIONS.find((e) => e.value === report.engagement)
          ?.label ?? report.engagement;
      const result = await aiAssistant.synthesizeMobilityReport({
        memberName: report.member_name ?? "Membre",
        engagementLabel: label,
        trustScore: report.trust_score,
        contributionsCount: report.indicators.contributions_count,
        meetingsAttended: report.indicators.meetings_attended,
        oldCity: relocation.old_address,
        newCity: relocation.new_city,
      });
      return result.summary;
    },
    [],
  );

  return {
    reports: data?.reports ?? [],
    decisions: data?.decisions ?? [],
    loading,
    busyId,
    error,
    generateReport,
    decide,
    synthesize,
  };
}

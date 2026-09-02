"use client";

import { useCallback, useEffect, useState } from "react";
import { mobilityService } from "@/services/community/mobility";
import { aiAssistant } from "@/lib/ai";
import { ENGAGEMENT_LEVEL_OPTIONS } from "@/utils/constants";
import {
  DecideTransferPayload,
  GenerateMobilityReportPayload,
  MemberRelocation,
  MobilityReport,
  TransferDecision,
} from "@/types/modules/community";

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

export function useMobility(organizationId: string) {
  const [reports, setReports] = useState<MobilityReport[]>([]);
  const [decisions, setDecisions] = useState<TransferDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const bundle = await mobilityService.getBundle(organizationId);
    return {
      reports: bundle.reports.map(parseReport),
      decisions: bundle.decisions.map(parseDecision),
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setReports(data.reports);
          setDecisions(data.decisions);
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const refetch = useCallback(async () => {
    const data = await load();
    setReports(data.reports);
    setDecisions(data.decisions);
  }, [load]);

  const generateReport = useCallback(
    async (relocationId: string, payload: GenerateMobilityReportPayload) => {
      setBusyId(relocationId);
      setError(null);
      try {
        const report = await mobilityService.generateReport(
          organizationId,
          relocationId,
          payload,
        );
        await refetch();
        return report;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const decide = useCallback(
    async (relocationId: string, payload: DecideTransferPayload) => {
      setBusyId(relocationId);
      setError(null);
      try {
        const decision = await mobilityService.decide(
          organizationId,
          relocationId,
          payload,
        );
        await refetch();
        return decision;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
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
    reports,
    decisions,
    loading,
    busyId,
    error,
    generateReport,
    decide,
    synthesize,
  };
}

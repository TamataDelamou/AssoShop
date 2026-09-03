"use client";

import { useCallback, useState } from "react";
import { beneficiariesService } from "@/services/community/beneficiaries";
import { projectsService } from "@/services/community/projects";
import {
  Beneficiary,
  BeneficiaryStatus,
  CommunityProject,
  CreateBeneficiaryPayload,
  CreateEvaluationPayload,
  ProjectEvaluation,
} from "@/types/modules/community";
import { BENEFICIARY_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "beneficiaries",
  cacheableReads: [BENEFICIARY_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseBeneficiary(b: Beneficiary): Beneficiary {
  return {
    ...b,
    registered_at: b.registered_at ? new Date(b.registered_at) : null,
  };
}

function parseEvaluation(e: ProjectEvaluation): ProjectEvaluation {
  return {
    ...e,
    evaluated_at: e.evaluated_at ? new Date(e.evaluated_at) : null,
  };
}

interface BeneficiariesBundle {
  beneficiaries: Beneficiary[];
  evaluations: ProjectEvaluation[];
  projects: CommunityProject[];
}

export function useBeneficiaries(organizationId: string) {
  const [creatingBeneficiary, setCreatingBeneficiary] = useState(false);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<BeneficiariesBundle>(
      `${BENEFICIARY_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [beneficiaries, evaluations, projects] = await Promise.all([
          beneficiariesService.getBeneficiaries(organizationId),
          beneficiariesService.getEvaluations(organizationId),
          projectsService.getProjects(organizationId),
        ]);
        return { beneficiaries, evaluations, projects };
      },
      {
        ttlMs: BENEFICIARY_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => {
          const projectName = (projectId: string) =>
            bundle.projects.find((p) => p.id === projectId)?.name;
          return {
            beneficiaries: bundle.beneficiaries.map((b) => ({
              ...parseBeneficiary(b),
              project_name: projectName(b.project_id) ?? b.project_name,
            })),
            evaluations: bundle.evaluations.map((e) => ({
              ...parseEvaluation(e),
              project_name: projectName(e.project_id) ?? e.project_name,
            })),
            projects: bundle.projects,
          };
        },
      },
    );

  const error = actionError ?? loadError;

  const createBeneficiary = useCallback(
    async (payload: CreateBeneficiaryPayload) => {
      setCreatingBeneficiary(true);
      setActionError(null);
      try {
        await beneficiariesService.createBeneficiary(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreatingBeneficiary(false);
      }
    },
    [organizationId, refresh],
  );

  const completeBeneficiary = useCallback(
    async (beneficiaryId: string) => {
      setBusyId(beneficiaryId);
      setActionError(null);
      try {
        await beneficiariesService.updateBeneficiaryStatus(
          organizationId,
          beneficiaryId,
          BeneficiaryStatus.COMPLETED,
        );
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refresh],
  );

  const createEvaluation = useCallback(
    async (payload: CreateEvaluationPayload) => {
      setCreatingEvaluation(true);
      setActionError(null);
      try {
        await beneficiariesService.createEvaluation(organizationId, payload);
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setCreatingEvaluation(false);
      }
    },
    [organizationId, refresh],
  );

  return {
    beneficiaries: data?.beneficiaries ?? [],
    evaluations: data?.evaluations ?? [],
    projects: data?.projects ?? [],
    loading,
    creatingBeneficiary,
    creatingEvaluation,
    busyId,
    error,
    createBeneficiary,
    completeBeneficiary,
    createEvaluation,
  };
}

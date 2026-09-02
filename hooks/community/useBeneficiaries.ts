"use client";

import { useState, useEffect, useCallback } from "react";
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

export function useBeneficiaries(organizationId: string) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [evaluations, setEvaluations] = useState<ProjectEvaluation[]>([]);
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBeneficiary, setCreatingBeneficiary] = useState(false);
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [beneficiariesData, evaluationsData, projectsData] =
      await Promise.all([
        beneficiariesService.getBeneficiaries(organizationId),
        beneficiariesService.getEvaluations(organizationId),
        projectsService.getProjects(organizationId),
      ]);

    const projectName = (projectId: string) =>
      projectsData.find((p) => p.id === projectId)?.name;

    return {
      beneficiaries: beneficiariesData.map((b) => ({
        ...parseBeneficiary(b),
        project_name: projectName(b.project_id) ?? b.project_name,
      })),
      evaluations: evaluationsData.map((e) => ({
        ...parseEvaluation(e),
        project_name: projectName(e.project_id) ?? e.project_name,
      })),
      projects: projectsData,
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setBeneficiaries(data.beneficiaries);
          setEvaluations(data.evaluations);
          setProjects(data.projects);
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
    try {
      const data = await load();
      setBeneficiaries(data.beneficiaries);
      setEvaluations(data.evaluations);
      setProjects(data.projects);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const createBeneficiary = useCallback(
    async (payload: CreateBeneficiaryPayload) => {
      setCreatingBeneficiary(true);
      setError(null);
      try {
        await beneficiariesService.createBeneficiary(organizationId, payload);
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreatingBeneficiary(false);
      }
    },
    [organizationId, refetch],
  );

  const completeBeneficiary = useCallback(
    async (beneficiaryId: string) => {
      setBusyId(beneficiaryId);
      setError(null);
      try {
        await beneficiariesService.updateBeneficiaryStatus(
          organizationId,
          beneficiaryId,
          BeneficiaryStatus.COMPLETED,
        );
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyId(null);
      }
    },
    [organizationId, refetch],
  );

  const createEvaluation = useCallback(
    async (payload: CreateEvaluationPayload) => {
      setCreatingEvaluation(true);
      setError(null);
      try {
        await beneficiariesService.createEvaluation(
          organizationId,
          payload,
        );
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setCreatingEvaluation(false);
      }
    },
    [organizationId, refetch],
  );

  return {
    beneficiaries,
    evaluations,
    projects,
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

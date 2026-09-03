"use client";

import { useCallback, useState } from "react";
import { governanceService } from "@/services/community/governance";
import { membersService } from "@/services/community/members";
import {
  CastVotePayload,
  DeclareCandidacyPayload,
  Election,
  Mandate,
  Member,
} from "@/types/modules/community";
import { GOVERNANCE_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

declareOffline({
  module: "governance",
  cacheableReads: [GOVERNANCE_CONFIG.CACHE_KEY_PREFIX],
  deferredMutations: [],
});

function parseElection(election: Election): Election {
  return {
    ...election,
    start_date: election.start_date ? new Date(election.start_date) : null,
    end_date: election.end_date ? new Date(election.end_date) : null,
  };
}

function parseMandate(mandate: Mandate): Mandate {
  return {
    ...mandate,
    start_date: mandate.start_date ? new Date(mandate.start_date) : null,
    end_date: mandate.end_date ? new Date(mandate.end_date) : null,
  };
}

interface GovernanceBundle {
  elections: Election[];
  mandates: Mandate[];
  members: Member[];
}

export function useGovernance(organizationId: string) {
  const [busyElectionId, setBusyElectionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { data, loading, error: loadError, refresh } =
    useOfflineQuery<GovernanceBundle>(
      `${GOVERNANCE_CONFIG.CACHE_KEY_PREFIX}${organizationId}`,
      async () => {
        const [elections, mandates, members] = await Promise.all([
          governanceService.getElections(organizationId),
          governanceService.getMandates(organizationId),
          membersService.getMembers(organizationId),
        ]);
        return { elections, mandates, members };
      },
      {
        ttlMs: GOVERNANCE_CONFIG.CACHE_TTL_MS,
        parse: (bundle) => ({
          elections: bundle.elections.map((election) => ({
            ...parseElection(election),
            candidates: election.candidates.map((candidate) => ({
              ...candidate,
              member_name:
                candidate.member_name ??
                bundle.members.find((m) => m.id === candidate.member_id)?.user
                  ?.name ??
                "Membre",
            })),
          })),
          mandates: bundle.mandates.map(parseMandate),
          members: bundle.members,
        }),
      },
    );

  const error = actionError ?? loadError;

  const run = useCallback(
    async (
      electionId: string,
      action: () => Promise<unknown>,
    ): Promise<void> => {
      setBusyElectionId(electionId);
      setActionError(null);
      try {
        await action();
        await refresh();
      } catch (err) {
        setActionError(err as Error);
        throw err;
      } finally {
        setBusyElectionId(null);
      }
    },
    [refresh],
  );

  const castVote = useCallback(
    (electionId: string, payload: CastVotePayload) =>
      run(electionId, () =>
        governanceService.castVote(organizationId, electionId, payload),
      ),
    [organizationId, run],
  );

  const declareCandidacy = useCallback(
    (electionId: string, payload: DeclareCandidacyPayload) =>
      run(electionId, () =>
        governanceService.declareCandidacy(organizationId, electionId, payload),
      ),
    [organizationId, run],
  );

  const closeElection = useCallback(
    (electionId: string) =>
      run(electionId, () =>
        governanceService.closeElection(organizationId, electionId),
      ),
    [organizationId, run],
  );

  return {
    elections: data?.elections ?? [],
    mandates: data?.mandates ?? [],
    members: data?.members ?? [],
    loading,
    busyElectionId,
    error,
    castVote,
    declareCandidacy,
    closeElection,
  };
}

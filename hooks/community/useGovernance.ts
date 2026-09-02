"use client";

import { useState, useEffect, useCallback } from "react";
import { governanceService } from "@/services/community/governance";
import { membersService } from "@/services/community/members";
import {
  CastVotePayload,
  DeclareCandidacyPayload,
  Election,
  Mandate,
  Member,
} from "@/types/modules/community";

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

export function useGovernance(organizationId: string) {
  const [elections, setElections] = useState<Election[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyElectionId, setBusyElectionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    const [electionsData, mandatesData, membersData] = await Promise.all([
      governanceService.getElections(organizationId),
      governanceService.getMandates(organizationId),
      membersService.getMembers(organizationId),
    ]);

    const electionsWithNames = electionsData.map((election) => ({
      ...parseElection(election),
      candidates: election.candidates.map((candidate) => ({
        ...candidate,
        member_name:
          candidate.member_name ??
          membersData.find((m) => m.id === candidate.member_id)?.user?.name ??
          "Membre",
      })),
    }));

    return {
      elections: electionsWithNames,
      mandates: mandatesData.map(parseMandate),
      members: membersData,
    };
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (!cancelled) {
          setElections(data.elections);
          setMandates(data.mandates);
          setMembers(data.members);
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
      setElections(data.elections);
      setMandates(data.mandates);
      setMembers(data.members);
    } catch (err) {
      setError(err as Error);
    }
  }, [load]);

  const run = useCallback(
    async (
      electionId: string,
      action: () => Promise<unknown>,
    ): Promise<void> => {
      setBusyElectionId(electionId);
      setError(null);
      try {
        await action();
        await refetch();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setBusyElectionId(null);
      }
    },
    [refetch],
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
    elections,
    mandates,
    members,
    loading,
    busyElectionId,
    error,
    castVote,
    declareCandidacy,
    closeElection,
  };
}

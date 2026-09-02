"use client";

import { useState } from "react";
import { CheckCircle2, Lock, UserPlus, Vote } from "lucide-react";
import { useGovernance } from "@/hooks/community/useGovernance";
import { VoteDialog } from "./VoteDialog";
import { CandidacyDialog } from "./CandidacyDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MEMBER_ROLES } from "@/utils/constants";
import { cn } from "@/lib/utils";
import {
  Election,
  ElectionStatus,
  Mandate,
  Member,
  MemberRole,
  MemberStatus,
} from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const roleLabel = (role: MemberRole) =>
  MEMBER_ROLES.find((r) => r.value === role)?.label || role;

interface Props {
  organizationId: string;
}

function ElectionCard({
  election,
  busy,
  onVote,
  onCandidacy,
  onClose,
}: {
  election: Election;
  busy: boolean;
  onVote: (election: Election) => void;
  onCandidacy: (election: Election) => void;
  onClose: (election: Election) => void;
}) {
  const isOpen = election.status === ElectionStatus.OPEN;
  const maxVotes = Math.max(
    1,
    ...election.candidates.map((c) => c.votes),
  );
  const winnerId = isOpen
    ? null
    : election.candidates.reduce<string | null>((acc, c) => {
        if (acc === null) return c.id;
        const winner = election.candidates.find((x) => x.id === acc);
        return c.votes > (winner?.votes ?? -1) ? c.id : acc;
      }, null);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base font-medium text-foreground">
            {election.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="border-border/50 text-muted-foreground"
            >
              {roleLabel(election.position)}
            </Badge>
            {isOpen ? (
              <Badge
                variant="outline"
                className="border-primary/50 text-primary"
              >
                Ouverte
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-border/50 text-muted-foreground"
              >
                Clôturée
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {election.start_date
                ? format(election.start_date, "dd/MM/yyyy", { locale: fr })
                : "-"}{" "}
              →{" "}
              {election.end_date
                ? format(election.end_date, "dd/MM/yyyy", { locale: fr })
                : "en cours"}
            </span>
          </div>
        </div>
        {isOpen && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCandidacy(election)}
              disabled={busy}
              className="border-border/50 text-muted-foreground hover:text-foreground"
            >
              <UserPlus className="mr-1 h-3.5 w-3.5" />
              Candidater
            </Button>
            <Button
              size="sm"
              onClick={() => onVote(election)}
              disabled={busy}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Vote className="mr-1 h-3.5 w-3.5" />
              Voter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClose(election)}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground"
            >
              <Lock className="mr-1 h-3.5 w-3.5" />
              Clôturer
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {election.candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun candidat.</p>
        ) : (
          election.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-40 truncate text-foreground">
                {candidate.member_name}
                {candidate.id === winnerId && (
                  <CheckCircle2 className="ml-1 inline h-4 w-4 text-primary" />
                )}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: `${(candidate.votes / maxVotes) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right text-muted-foreground">
                {candidate.votes}
              </span>
            </div>
          ))
        )}
        {!isOpen && winnerId && (
          <p className="pt-2 text-xs text-muted-foreground">
            Résultat :{" "}
            <span className="text-foreground">
              {election.candidates.find((c) => c.id === winnerId)?.member_name}
            </span>{" "}
            élu(e). Scrutin verrouillé (RG-C06).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MandateCard({ mandate }: { mandate: Mandate }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          {mandate.label}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {mandate.start_date
            ? format(mandate.start_date, "dd/MM/yyyy", { locale: fr })
            : "-"}{" "}
          →{" "}
          {mandate.end_date
            ? format(mandate.end_date, "dd/MM/yyyy", { locale: fr })
            : "en cours"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {mandate.office_holders.map((holder, i) => (
          <div
            key={`${holder.role}-${i}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {roleLabel(holder.role)}
            </span>
            <span className="text-foreground">{holder.member_name}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function GovernancePage({ organizationId }: Props) {
  const {
    elections,
    mandates,
    members,
    loading,
    busyElectionId,
    error,
    castVote,
    declareCandidacy,
    closeElection,
  } = useGovernance(organizationId);

  const [tab, setTab] = useState<"elections" | "mandates">("elections");
  const [voteElection, setVoteElection] = useState<Election | null>(null);
  const [candidacyElection, setCandidacyElection] =
    useState<Election | null>(null);

  const eligibleMembers = (election: Election | null): Member[] => {
    if (!election) return [];
    const candidateIds = new Set(election.candidates.map((c) => c.member_id));
    return members.filter(
      (m) =>
        m.status === MemberStatus.ACTIVE && !candidateIds.has(m.id),
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 bg-muted/30" />
        <Skeleton className="h-56 w-full bg-muted/30" />
        <Skeleton className="h-56 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-foreground">Gouvernance</h2>
        <p className="text-sm text-muted-foreground">
          Élections, votes électroniques et historique des mandats.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-1 border-b border-border/50">
        <button
          type="button"
          onClick={() => setTab("elections")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "elections"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Élections &amp; votes
        </button>
        <button
          type="button"
          onClick={() => setTab("mandates")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "mandates"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Historique des mandats
        </button>
      </div>

      {tab === "elections" ? (
        <div className="space-y-4">
          {elections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune élection.</p>
          ) : (
            elections.map((election) => (
              <ElectionCard
                key={election.id}
                election={election}
                busy={busyElectionId === election.id}
                onVote={setVoteElection}
                onCandidacy={setCandidacyElection}
                onClose={(e) => closeElection(e.id)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {mandates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun mandat archivé.</p>
          ) : (
            mandates.map((mandate) => (
              <MandateCard key={mandate.id} mandate={mandate} />
            ))
          )}
        </div>
      )}

      <VoteDialog
        open={voteElection !== null}
        onOpenChange={(v) => !v && setVoteElection(null)}
        election={voteElection}
        busy={busyElectionId !== null}
        onVote={(candidateId) =>
          castVote(voteElection?.id ?? "", { candidate_id: candidateId })
        }
      />

      <CandidacyDialog
        open={candidacyElection !== null}
        onOpenChange={(v) => !v && setCandidacyElection(null)}
        election={candidacyElection}
        members={eligibleMembers(candidacyElection)}
        busy={busyElectionId !== null}
        onDeclare={(memberId) =>
          declareCandidacy(candidacyElection?.id ?? "", {
            member_id: memberId,
          })
        }
      />
    </div>
  );
}

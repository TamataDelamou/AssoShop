"use client";

import { useState } from "react";
import { FileText, MapPin, MoveRight, ShieldCheck, UserCheck } from "lucide-react";
import { useRelocations } from "@/hooks/community/useRelocations";
import { useMobility } from "@/hooks/community/useMobility";
import { CreateRelocationDialog } from "./CreateRelocationDialog";
import { MobilityReportDialog } from "./MobilityReportDialog";
import { TransferDecisionDialog } from "./TransferDecisionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DecideTransferPayload,
  MemberRelocation,
  RelocationStatus,
  TransferDecision,
  TransferDecisionStatus,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS: Record<RelocationStatus, string> = {
  [RelocationStatus.PENDING]: "En attente",
  [RelocationStatus.CONFIRMED]: "Confirmé",
};

const STATUS_BADGE: Record<RelocationStatus, string> = {
  [RelocationStatus.PENDING]: "border-amber-500/50 text-amber-500",
  [RelocationStatus.CONFIRMED]: "border-emerald-500/50 text-emerald-500",
};

const DECISION_LABELS: Record<TransferDecisionStatus, string> = {
  [TransferDecisionStatus.PENDING]: "Décision en attente",
  [TransferDecisionStatus.ACCEPTED]: "Adhésion acceptée",
  [TransferDecisionStatus.REJECTED]: "Adhésion rejetée",
};

const DECISION_BADGE: Record<TransferDecisionStatus, string> = {
  [TransferDecisionStatus.PENDING]: "border-muted-foreground/50 text-muted-foreground",
  [TransferDecisionStatus.ACCEPTED]: "border-emerald-500/50 text-emerald-500",
  [TransferDecisionStatus.REJECTED]: "border-red-500/50 text-red-500",
};

interface Props {
  organizationId: string;
}

export function RelocationPage({ organizationId }: Props) {
  const {
    relocations,
    members,
    loading,
    creating,
    busyId: relocationBusyId,
    error,
    createRelocation,
    confirmRelocation,
  } = useRelocations(organizationId);
  const {
    reports,
    decisions,
    loading: mobilityLoading,
    busyId: mobilityBusyId,
    error: mobilityError,
    generateReport,
    decide,
    synthesize,
  } = useMobility(organizationId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<MemberRelocation | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<MemberRelocation | null>(null);

  const pendingCount = relocations.filter(
    (r) => r.status === RelocationStatus.PENDING,
  ).length;
  const confirmedCount = relocations.filter(
    (r) => r.status === RelocationStatus.CONFIRMED,
  ).length;

  const isLoading = loading || mobilityLoading;
  const combinedError = error ?? mobilityError;

  const reportFor = (relocation: MemberRelocation) =>
    reports.find((r) => r.relocation_id === relocation.id);
  const decisionFor = (relocation: MemberRelocation) =>
    decisions.find((d) => d.relocation_id === relocation.id);

  const handleGenerateReport = async () => {
    if (!reportTarget) return;
    await generateReport(reportTarget.id, {
      member_id: reportTarget.member_id,
      member_name: reportTarget.member_name,
    });
  };

  const handleDecide = async (payload: DecideTransferPayload) => {
    if (!decisionTarget) return;
    await decide(decisionTarget.id, payload);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80 bg-muted/30" />
        <Skeleton className="h-24 w-full bg-muted/30" />
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            Déclarations de déménagement
          </h2>
          <p className="text-sm text-muted-foreground">
            Changement d&apos;adresse, rapport de mobilité et décision
            d&apos;adhésion sur transfert.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <MapPin className="mr-2 h-4 w-4" />
          Nouvelle déclaration
        </Button>
      </div>

      {combinedError && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{combinedError.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="En attente" value={pendingCount} tone="amber" />
        <StatCard label="Confirmées" value={confirmedCount} tone="emerald" />
      </div>

      <div className="space-y-4">
        {relocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune déclaration de déménagement.
          </p>
        ) : (
          relocations.map((relocation) => {
            const decision = decisionFor(relocation);
            return (
              <RelocationCard
                key={relocation.id}
                relocation={relocation}
                decision={decision}
                busy={relocationBusyId === relocation.id}
                mobilityBusy={mobilityBusyId === relocation.id}
                disabled={
                  relocationBusyId !== null || mobilityBusyId !== null
                }
                onConfirm={confirmRelocation}
                onViewReport={() => setReportTarget(relocation)}
                onDecide={() => setDecisionTarget(relocation)}
              />
            );
          })
        )}
      </div>

      <CreateRelocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        creating={creating}
        onCreate={createRelocation}
      />

      <MobilityReportDialog
        key={reportTarget?.id ?? "none"}
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null);
        }}
        relocation={reportTarget}
        report={reportTarget ? reportFor(reportTarget) : undefined}
        generating={reportTarget ? mobilityBusyId === reportTarget.id : false}
        onGenerate={handleGenerateReport}
        synthesize={synthesize}
      />

      <TransferDecisionDialog
        key={decisionTarget?.id ?? "none"}
        open={decisionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDecisionTarget(null);
        }}
        report={decisionTarget ? reportFor(decisionTarget) : undefined}
        decision={decisionTarget ? decisionFor(decisionTarget) : undefined}
        deciding={decisionTarget ? mobilityBusyId === decisionTarget.id : false}
        onDecide={handleDecide}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald";
}) {
  const toneClass = tone === "amber" ? "text-amber-500" : "text-emerald-500";
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RelocationCard({
  relocation,
  decision,
  busy,
  mobilityBusy,
  disabled,
  onConfirm,
  onViewReport,
  onDecide,
}: {
  relocation: MemberRelocation;
  decision?: TransferDecision;
  busy: boolean;
  mobilityBusy: boolean;
  disabled: boolean;
  onConfirm: (id: string) => Promise<void>;
  onViewReport: () => void;
  onDecide: () => void;
}) {
  const decisionStatus = decision?.status ?? TransferDecisionStatus.PENDING;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={STATUS_BADGE[relocation.status]}>
              {STATUS_LABELS[relocation.status]}
            </Badge>
            {decision && (
              <Badge variant="outline" className={DECISION_BADGE[decisionStatus]}>
                {DECISION_LABELS[decisionStatus]}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base font-medium text-foreground">
            {relocation.member_name || "Membre"}
          </CardTitle>
        </div>
        {relocation.status === RelocationStatus.PENDING && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onConfirm(relocation.id)}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ShieldCheck className="mr-1 h-4 w-4" />
            {busy ? "..." : "Confirmer"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <span className="text-muted-foreground">{relocation.old_address}</span>
          <MoveRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">
            {relocation.new_address} — {relocation.new_city}
          </span>
        </div>
        {relocation.reason && (
          <p className="text-xs text-muted-foreground">
            Motif : {relocation.reason}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Déclarée le{" "}
          {relocation.requested_at
            ? format(relocation.requested_at, "dd/MM/yyyy", { locale: fr })
            : "—"}
          {relocation.confirmed_at
            ? ` · confirmée le ${format(relocation.confirmed_at, "dd/MM/yyyy", { locale: fr })}`
            : ""}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onViewReport}
            disabled={disabled}
            className="border-border/50 text-foreground hover:bg-primary/10"
          >
            <FileText className="mr-1 h-4 w-4" />
            Rapport
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecide}
            disabled={disabled}
            className="border-border/50 text-foreground hover:bg-primary/10"
          >
            <UserCheck className="mr-1 h-4 w-4" />
            {mobilityBusy ? "..." : "Décider"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

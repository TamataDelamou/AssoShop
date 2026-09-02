"use client";

import { useState } from "react";
import { BadgeCheck, UserPlus, XCircle } from "lucide-react";
import { useSharedMemberships } from "@/hooks/community/useSharedMemberships";
import { CreateSharedMembershipDialog } from "./CreateSharedMembershipDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SharedMembershipRequest,
  SharedMembershipStatus,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS: Record<SharedMembershipStatus, string> = {
  [SharedMembershipStatus.PENDING]: "En attente",
  [SharedMembershipStatus.APPROVED]: "Approuvée",
  [SharedMembershipStatus.REJECTED]: "Rejetée",
};

const STATUS_BADGE: Record<SharedMembershipStatus, string> = {
  [SharedMembershipStatus.PENDING]: "border-amber-500/50 text-amber-500",
  [SharedMembershipStatus.APPROVED]: "border-emerald-500/50 text-emerald-500",
  [SharedMembershipStatus.REJECTED]: "border-destructive/50 text-destructive",
};

interface Props {
  organizationId: string;
}

export function SharedMembershipPage({ organizationId }: Props) {
  const {
    requests,
    affiliations,
    loading,
    creating,
    busyId,
    error,
    createSharedMembership,
    approve,
    reject,
  } = useSharedMemberships(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingCount = requests.filter(
    (r) => r.status === SharedMembershipStatus.PENDING,
  ).length;
  const approvedCount = requests.filter(
    (r) => r.status === SharedMembershipStatus.APPROVED,
  ).length;
  const rejectedCount = requests.filter(
    (r) => r.status === SharedMembershipStatus.REJECTED,
  ).length;

  if (loading) {
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
            Adhésion partagée
          </h2>
          <p className="text-sm text-muted-foreground">
            Adhésion d&apos;un membre d&apos;une association affiliée, sans
            paiement de cotisation en double.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="En attente" value={pendingCount} tone="amber" />
        <StatCard label="Approuvées" value={approvedCount} tone="emerald" />
        <StatCard label="Rejetées" value={rejectedCount} tone="rose" />
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune demande d&apos;adhésion partagée.
          </p>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              busy={busyId === request.id}
              disabled={busyId !== null}
              onApprove={approve}
              onReject={reject}
            />
          ))
        )}
      </div>

      <CreateSharedMembershipDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        affiliations={affiliations}
        creating={creating}
        onCreate={createSharedMembership}
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
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-500"
      : tone === "emerald"
        ? "text-emerald-500"
        : "text-destructive";
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

function RequestCard({
  request,
  busy,
  disabled,
  onApprove,
  onReject,
}: {
  request: SharedMembershipRequest;
  busy: boolean;
  disabled: boolean;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={STATUS_BADGE[request.status]}
            >
              {STATUS_LABELS[request.status]}
            </Badge>
            <Badge
              variant="outline"
              className={
                request.fee_exempt
                  ? "border-emerald-500/50 text-emerald-500"
                  : "border-muted-foreground/50 text-muted-foreground"
              }
            >
              {request.fee_exempt
                ? "Cotisation offerte"
                : "Cotisation due"}
            </Badge>
          </div>
          <CardTitle className="text-base font-medium text-foreground">
            {request.member_name}
          </CardTitle>
        </div>
        {request.status === SharedMembershipStatus.PENDING && (
          <span className="inline-flex gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => onApprove(request.id)}
              disabled={disabled}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <BadgeCheck className="mr-1 h-4 w-4" />
              {busy ? "..." : "Approuver"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject(request.id)}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="mr-1 h-4 w-4" />
              Rejeter
            </Button>
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {(request.email || request.phone) && (
          <p className="text-muted-foreground">
            {[request.email, request.phone].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-muted-foreground">
          Origine :{" "}
          <span className="text-foreground">
            {request.source_organization_name || "Association affiliée"}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Demandée le{" "}
          {request.requested_at
            ? format(request.requested_at, "dd/MM/yyyy", { locale: fr })
            : "—"}
        </p>
      </CardContent>
    </Card>
  );
}

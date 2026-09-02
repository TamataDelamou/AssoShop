"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileSignature,
  PenLine,
  XCircle,
} from "lucide-react";
import { useSignatures } from "@/hooks/community/useSignatures";
import { CreateSignatureDialog } from "./CreateSignatureDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SignatureDocumentType,
  SignatureRequest,
  SignatureStatus,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_LABELS: Record<SignatureDocumentType, string> = {
  [SignatureDocumentType.LOAN]: "Prêt",
  [SignatureDocumentType.EXPENSE]: "Dépense",
  [SignatureDocumentType.MINUTES]: "Procès-verbal",
  [SignatureDocumentType.EXCEPTIONAL_WITHDRAWAL]: "Retrait exceptionnel",
};

const TYPE_BADGE: Record<SignatureDocumentType, string> = {
  [SignatureDocumentType.LOAN]: "border-sky-500/50 text-sky-500",
  [SignatureDocumentType.EXPENSE]: "border-amber-500/50 text-amber-500",
  [SignatureDocumentType.MINUTES]: "border-violet-500/50 text-violet-500",
  [SignatureDocumentType.EXCEPTIONAL_WITHDRAWAL]:
    "border-rose-500/50 text-rose-500",
};

const STATUS_LABELS: Record<SignatureStatus, string> = {
  [SignatureStatus.PENDING]: "En attente",
  [SignatureStatus.SIGNED]: "Signé",
  [SignatureStatus.REJECTED]: "Rejeté",
};

const STATUS_BADGE: Record<SignatureStatus, string> = {
  [SignatureStatus.PENDING]: "border-amber-500/50 text-amber-500",
  [SignatureStatus.SIGNED]: "border-emerald-500/50 text-emerald-500",
  [SignatureStatus.REJECTED]: "border-destructive/50 text-destructive",
};

function formatGnf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} GNF`;
}

interface Props {
  organizationId: string;
}

export function SignaturePage({ organizationId }: Props) {
  const {
    signatures,
    loading,
    creating,
    busyId,
    error,
    createSignature,
    signSignature,
    rejectSignature,
  } = useSignatures(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingCount = signatures.filter(
    (s) => s.status === SignatureStatus.PENDING,
  ).length;
  const signedCount = signatures.filter(
    (s) => s.status === SignatureStatus.SIGNED,
  ).length;
  const rejectedCount = signatures.filter(
    (s) => s.status === SignatureStatus.REJECTED,
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
            Signature électronique
          </h2>
          <p className="text-sm text-muted-foreground">
            Validation des décisions sensibles : prêt, dépense, procès-verbal,
            retrait exceptionnel.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <FileSignature className="mr-2 h-4 w-4" />
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
        <StatCard label="Signées" value={signedCount} tone="emerald" />
        <StatCard label="Rejetées" value={rejectedCount} tone="rose" />
      </div>

      <div className="space-y-4">
        {signatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune demande de signature.
          </p>
        ) : (
          signatures.map((signature) => (
            <SignatureCard
              key={signature.id}
              signature={signature}
              busy={busyId === signature.id}
              disabled={busyId !== null}
              onSign={signSignature}
              onReject={rejectSignature}
            />
          ))
        )}
      </div>

      <CreateSignatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creating={creating}
        onCreate={createSignature}
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

function SignatureCard({
  signature,
  busy,
  disabled,
  onSign,
  onReject,
}: {
  signature: SignatureRequest;
  busy: boolean;
  disabled: boolean;
  onSign: (signatureId: string, signatoryId: string) => Promise<void>;
  onReject: (signatureId: string) => Promise<void>;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={TYPE_BADGE[signature.type]}
            >
              {TYPE_LABELS[signature.type]}
            </Badge>
            <Badge variant="outline" className={STATUS_BADGE[signature.status]}>
              {STATUS_LABELS[signature.status]}
            </Badge>
          </div>
          <CardTitle className="text-base font-medium text-foreground">
            {signature.title}
          </CardTitle>
        </div>
        {signature.amount !== undefined && (
          <p className="text-lg font-semibold text-foreground shrink-0">
            {formatGnf(signature.amount)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {signature.description && (
          <p className="text-sm text-muted-foreground">
            {signature.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Demandé par <span className="text-foreground">{signature.requested_by || "—"}</span>
          {signature.created_at
            ? ` · le ${format(signature.created_at, "dd/MM/yyyy", { locale: fr })}`
            : ""}
        </p>

        <div className="space-y-2">
          {signature.signatories.map((signatory) => {
            const signed = signatory.signed_at !== null;
            return (
              <div
                key={signatory.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {signatory.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {signatory.role}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {signed ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/50 text-emerald-500"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Signé
                      {signatory.signed_at
                        ? ` le ${format(signatory.signed_at, "dd/MM/yyyy", { locale: fr })}`
                        : ""}
                    </Badge>
                  ) : signature.status === SignatureStatus.PENDING ? (
                    <Button
                      size="sm"
                      onClick={() => onSign(signature.id, signatory.id)}
                      disabled={disabled}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <PenLine className="mr-1 h-3 w-3" />
                      {busy ? "Signature..." : "Signer"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {signature.status === SignatureStatus.PENDING && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject(signature.id)}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="mr-1 h-4 w-4" />
              Rejeter la demande
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

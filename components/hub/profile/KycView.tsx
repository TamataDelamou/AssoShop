"use client";

import { useState } from "react";
import { KycRequest, KycStatus } from "@/types/modules/hub";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatters";
import { HUB_LABELS, KYC_STATUS_LABELS } from "@/utils/constants";
import { BadgeCheck, Upload } from "lucide-react";

const DOCUMENT_TYPES = [
  "Carte nationale d'identité",
  "Passeport",
  "Permis de conduire",
];

function statusVariant(status: KycStatus): string {
  switch (status) {
    case KycStatus.VERIFIED:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case KycStatus.PENDING:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case KycStatus.REJECTED:
      return "border-red-500/40 bg-red-500/10 text-red-400";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

export function KycView({
  status,
  requests,
  online,
  onChanged,
}: {
  status: KycStatus;
  requests: KycRequest[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await hubService.submitKyc(documentType);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{HUB_LABELS.KYC_TITLE}</h3>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Statut actuel</CardTitle>
          <Badge variant="outline" className={statusVariant(status)}>
            {KYC_STATUS_LABELS[status]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {DOCUMENT_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Button onClick={submit} disabled={busy || !online}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {HUB_LABELS.KYC_SUBMIT}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">
                {request.document_type}
              </CardTitle>
              <Badge
                variant="outline"
                className={statusVariant(request.status)}
              >
                {KYC_STATUS_LABELS[request.status]}
              </Badge>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Soumis le {formatDate(request.submitted_at)}
              {request.reviewed_at
                ? ` · Traité le ${formatDate(request.reviewed_at)}`
                : ""}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

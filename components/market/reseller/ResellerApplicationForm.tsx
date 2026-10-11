"use client";

import { useState } from "react";
import {
  CreateResellerApplicationPayload,
  ResellerApplication,
  ResellerApplicationStatus,
} from "@/types/modules/market";
import { resellerService } from "@/services/market/reseller";
import { DEMO_MODE } from "@/lib/base44";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/utils/formatters";
import {
  MARKET_LABELS,
  RESELLER_APPLICATION_STATUS_LABELS,
} from "@/utils/constants";
import { FileText, ShieldCheck } from "lucide-react";

interface ResellerApplicationFormProps {
  application: ResellerApplication | null;
  onChanged: () => void;
}

export function ResellerApplicationForm({
  application,
  onChanged,
}: ResellerApplicationFormProps) {
  const [form, setForm] = useState<CreateResellerApplicationPayload>({
    company_name: "",
    contact_name: "",
    id_document: "",
    sector: "",
    country: "",
    city: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await resellerService.submitApplication(form);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await resellerService.approveApplication();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (
    key: keyof CreateResellerApplicationPayload,
    label: string,
    placeholder: string,
  ) => (
    <div>
      <Label className="mb-1 block text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  // MKT-15 : statut de la demande (en attente / refusée).
  if (application && application.status !== ResellerApplicationStatus.APPROVED) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{MARKET_LABELS.APPLICATION_PENDING}</CardTitle>
            <Badge
              variant="outline"
              className={
                application.status === ResellerApplicationStatus.REJECTED
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
              }
            >
              {RESELLER_APPLICATION_STATUS_LABELS[application.status]}
            </Badge>
          </div>
          <CardDescription>
            {MARKET_LABELS.APPLICATION_PENDING_TEXT}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <p className="font-medium">{application.company_name}</p>
            <p className="text-muted-foreground">
              {application.contact_name} · {application.sector}
            </p>
            <p className="text-xs text-muted-foreground">
              {application.city}, {application.country}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {application.id_document}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(application.submitted_at)}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* RG-M01 : la validation appartient à un administrateur de la
              plateforme ; la simulation n'existe qu'en démonstration. */}
          {DEMO_MODE && application.status === ResellerApplicationStatus.PENDING && (
            <Button
              variant="outline"
              className="w-full border-white/10"
              onClick={handleApprove}
              disabled={submitting}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              {MARKET_LABELS.SIMULATE_APPROVAL}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // MKT-14 : demande de compte revendeur.
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{MARKET_LABELS.RESELLER_APPLICATION_TITLE}</CardTitle>
        <CardDescription>{MARKET_LABELS.RESELLER_APPLICATION_DESC}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {field(
          "company_name",
          MARKET_LABELS.COMPANY_NAME,
          "AgriPlus Guinée",
        )}
        {field("contact_name", MARKET_LABELS.CONTACT_NAME, "Mamadou Sow")}
        {field("id_document", MARKET_LABELS.ID_DOCUMENT, "Carte nationale n°…")}
        {field("sector", MARKET_LABELS.SECTOR, "Agriculture")}
        <div className="grid grid-cols-2 gap-3">
          {field("country", MARKET_LABELS.COUNTRY_FILTER, "Guinée")}
          {field("city", MARKET_LABELS.CITY_FILTER, "Conakry")}
        </div>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={
            submitting ||
            !form.company_name.trim() ||
            !form.contact_name.trim() ||
            !form.sector.trim()
          }
        >
          {MARKET_LABELS.SUBMIT}
        </Button>
      </CardContent>
    </Card>
  );
}

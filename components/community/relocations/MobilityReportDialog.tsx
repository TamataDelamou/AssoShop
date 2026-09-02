"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EngagementBadge } from "@/components/finance/EngagementBadge";
import { FileText, Sparkles } from "lucide-react";
import {
  MemberRelocation,
  MobilityReport,
} from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relocation: MemberRelocation | null;
  report?: MobilityReport;
  generating: boolean;
  onGenerate: () => Promise<void>;
  synthesize: (
    report: MobilityReport,
    relocation: MemberRelocation,
  ) => Promise<string>;
}

export function MobilityReportDialog({
  open,
  onOpenChange,
  relocation,
  report,
  generating,
  onGenerate,
  synthesize,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError((err as Error).message || "Impossible de générer le rapport.");
    }
  };

  const handleSynthesize = async () => {
    if (!report || !relocation) return;
    setSynthesizing(true);
    setError(null);
    try {
      const text = await synthesize(report, relocation);
      setSummary(text);
    } catch {
      setError("Impossible de générer la synthèse IA.");
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Rapport de mobilité
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Indicateurs agrégés d&apos;engagement du membre, générés lors de la
            déclaration de déménagement.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!report ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Aucun rapport n&apos;a encore été généré pour ce déménagement.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="mr-2 h-4 w-4" />
              {generating ? "Génération..." : "Générer le rapport"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-foreground">
                {report.member_name || "Membre"}
              </p>
              <EngagementBadge engagement={report.engagement} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {report.trust_score}
                  <span className="text-sm text-muted-foreground">/100</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Score de confiance
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {report.indicators.contributions_count}
                </p>
                <p className="text-xs text-muted-foreground">Cotisations</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {report.indicators.meetings_attended}
                </p>
                <p className="text-xs text-muted-foreground">Réunions suivies</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Généré le{" "}
              {report.generated_at
                ? format(report.generated_at, "dd/MM/yyyy 'à' HH:mm", {
                    locale: fr,
                  })
                : "—"}
            </p>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleSynthesize}
                disabled={synthesizing}
                className="border-border/50 text-foreground hover:bg-primary/10"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {synthesizing ? "Synthèse en cours..." : "Générer la synthèse IA"}
              </Button>
            </div>

            {summary && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Synthèse IA
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { HeartHandshake, Star, UserPlus } from "lucide-react";
import { useBeneficiaries } from "@/hooks/community/useBeneficiaries";
import { RegisterBeneficiaryDialog } from "./RegisterBeneficiaryDialog";
import { CreateEvaluationDialog } from "./CreateEvaluationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BeneficiaryCategory,
  BeneficiaryStatus,
  ProjectEvaluation,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORY_LABELS: Record<BeneficiaryCategory, string> = {
  [BeneficiaryCategory.CONSTRUCTION]: "Construction",
  [BeneficiaryCategory.AGRICULTURE]: "Agriculture",
  [BeneficiaryCategory.LIVESTOCK]: "Élevage",
  [BeneficiaryCategory.HEALTH]: "Santé",
  [BeneficiaryCategory.EDUCATION]: "Éducation",
  [BeneficiaryCategory.COMMERCE]: "Commerce",
};

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= value ? "fill-primary text-primary" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

interface Props {
  organizationId: string;
}

export function BeneficiariesPage({ organizationId }: Props) {
  const {
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
  } = useBeneficiaries(organizationId);

  const [tab, setTab] = useState<"beneficiaries" | "evaluations">(
    "beneficiaries",
  );
  const [benDialogOpen, setBenDialogOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80 bg-muted/30" />
        <Skeleton className="h-56 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-foreground">
          Bénéficiaires &amp; évaluation
        </h2>
        <p className="text-sm text-muted-foreground">
          Suivi des bénéficiaires et bilans d&apos;évaluation des projets.
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
          onClick={() => setTab("beneficiaries")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "beneficiaries"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Bénéficiaires
        </button>
        <button
          type="button"
          onClick={() => setTab("evaluations")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "evaluations"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Évaluations
        </button>
      </div>

      {tab === "beneficiaries" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setBenDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Enregistrer un bénéficiaire
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bénéficiaires suivis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beneficiaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun bénéficiaire enregistré.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/10">
                      <TableHead className="text-muted-foreground font-medium">
                        Bénéficiaire
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Projet
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Catégorie
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Statut
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Enregistré le
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beneficiaries.map((b) => (
                      <TableRow
                        key={b.id}
                        className="border-border/50 hover:bg-muted/10"
                      >
                        <TableCell className="font-medium text-foreground">
                          {b.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {b.project_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-border/50 text-muted-foreground"
                          >
                            {CATEGORY_LABELS[b.category]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {b.status === BeneficiaryStatus.SUPPORTED ? (
                            <Badge
                              variant="outline"
                              className="border-primary/50 text-primary"
                            >
                              Suivi en cours
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/50 text-emerald-500"
                            >
                              Suivi terminé
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {b.registered_at
                            ? format(b.registered_at, "dd/MM/yyyy", {
                                locale: fr,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.status === BeneficiaryStatus.SUPPORTED ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => completeBeneficiary(b.id)}
                              disabled={busyId !== null}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {busyId === b.id ? "Clôture..." : "Clôturer"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setEvalDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <HeartHandshake className="mr-2 h-4 w-4" />
              Nouveau bilan d&apos;évaluation
            </Button>
          </div>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune évaluation enregistrée.
            </p>
          ) : (
            evaluations.map((ev) => (
              <EvaluationCard key={ev.id} evaluation={ev} />
            ))
          )}
        </div>
      )}

      <RegisterBeneficiaryDialog
        open={benDialogOpen}
        onOpenChange={setBenDialogOpen}
        projects={projects}
        creating={creatingBeneficiary}
        onCreate={createBeneficiary}
      />

      <CreateEvaluationDialog
        open={evalDialogOpen}
        onOpenChange={setEvalDialogOpen}
        projects={projects}
        creating={creatingEvaluation}
        onCreate={createEvaluation}
      />
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: ProjectEvaluation }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base font-medium text-foreground">
            {evaluation.project_name || "Projet"}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {evaluation.evaluated_at
              ? format(evaluation.evaluated_at, "dd/MM/yyyy", { locale: fr })
              : "-"}
          </p>
        </div>
        <Rating value={evaluation.rating} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Objectifs</p>
          <p className="text-foreground">{evaluation.objectives}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Résultats atteints</p>
          <p className="text-foreground">{evaluation.results}</p>
        </div>
        {evaluation.impact && (
          <div>
            <p className="text-muted-foreground">Impact &amp; leçons</p>
            <p className="text-foreground">{evaluation.impact}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

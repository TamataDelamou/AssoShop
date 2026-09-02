"use client";

import { useState } from "react";
import {
  CalendarCheck,
  ClipboardList,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { useHumanResources } from "@/hooks/community/useHumanResources";
import { AddStaffDialog } from "./AddStaffDialog";
import { CreateLeaveDialog } from "./CreateLeaveDialog";
import { CreateEvaluationDialog } from "./CreateEvaluationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ContractType,
  LeaveStatus,
  StaffEvaluation,
  StaffStatus,
  StaffType,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_LABELS: Record<StaffType, string> = {
  [StaffType.EMPLOYEE]: "Employé",
  [StaffType.VOLUNTEER]: "Bénévole",
  [StaffType.CONSULTANT]: "Consultant",
};

const CONTRACT_LABELS: Record<ContractType, string> = {
  [ContractType.CDI]: "CDI",
  [ContractType.CDD]: "CDD",
  [ContractType.VOLUNTEERING]: "Bénévolat",
  [ContractType.CONSULTING]: "Prestation",
};

const STATUS_LABELS: Record<StaffStatus, string> = {
  [StaffStatus.ACTIVE]: "Actif",
  [StaffStatus.ON_LEAVE]: "En congé",
  [StaffStatus.INACTIVE]: "Inactif",
};

const STATUS_BADGE: Record<StaffStatus, string> = {
  [StaffStatus.ACTIVE]: "border-emerald-500/50 text-emerald-500",
  [StaffStatus.ON_LEAVE]: "border-amber-500/50 text-amber-500",
  [StaffStatus.INACTIVE]: "border-muted-foreground/50 text-muted-foreground",
};

const LEAVE_LABELS: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: "En attente",
  [LeaveStatus.APPROVED]: "Approuvé",
  [LeaveStatus.REJECTED]: "Refusé",
};

const LEAVE_BADGE: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: "border-amber-500/50 text-amber-500",
  [LeaveStatus.APPROVED]: "border-emerald-500/50 text-emerald-500",
  [LeaveStatus.REJECTED]: "border-destructive/50 text-destructive",
};

function formatGnf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} GNF`;
}

function formatDate(d: Date | null): string {
  return d ? format(d, "dd/MM/yyyy", { locale: fr }) : "—";
}

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

type Tab = "staff" | "leaves" | "attendance" | "evaluations";

interface Props {
  organizationId: string;
}

export function HumanResourcesPage({ organizationId }: Props) {
  const {
    staff,
    leaves,
    evaluations,
    attendance,
    attendanceDate,
    setAttendanceDate,
    loading,
    creatingStaff,
    creatingLeave,
    creatingEvaluation,
    busyId,
    error,
    createStaff,
    updateStaffStatus,
    createLeave,
    updateLeaveStatus,
    toggleAttendance,
    createEvaluation,
  } = useHumanResources(organizationId);

  const [tab, setTab] = useState<Tab>("staff");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80 bg-muted/30" />
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "staff", label: "Personnel", icon: <Users className="h-4 w-4" /> },
    {
      key: "leaves",
      label: "Congés",
      icon: <CalendarCheck className="h-4 w-4" />,
    },
    {
      key: "attendance",
      label: "Présences",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      key: "evaluations",
      label: "Évaluations",
      icon: <Star className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-foreground">
          Ressources humaines
        </h2>
        <p className="text-sm text-muted-foreground">
          Employés, bénévoles, consultants, congés, présences et évaluations.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-1 border-b border-border/50 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors inline-flex items-center gap-2",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "staff" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setStaffDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Équipe ({staff.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun membre du personnel.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/10">
                      <TableHead className="text-muted-foreground font-medium">
                        Nom
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Type
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Poste
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Contrat
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">
                        Salaire
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Statut
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => (
                      <TableRow
                        key={s.id}
                        className="border-border/50 hover:bg-muted/10"
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {s.first_name} {s.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Entré le {formatDate(s.hire_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-border/50 text-muted-foreground"
                          >
                            {TYPE_LABELS[s.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {s.position}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {CONTRACT_LABELS[s.contract_type]}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {s.monthly_salary > 0
                            ? formatGnf(s.monthly_salary)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={s.status}
                            onValueChange={(v) =>
                              updateStaffStatus(s.id, v as StaffStatus)
                            }
                            disabled={busyId !== null}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 w-40 border bg-transparent",
                                STATUS_BADGE[s.status],
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border/50">
                              {Object.values(StaffStatus).map((st) => (
                                <SelectItem key={st} value={st}>
                                  {STATUS_LABELS[st]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "leaves" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setLeaveDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Demandes de congé
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune demande de congé.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/10">
                      <TableHead className="text-muted-foreground font-medium">
                        Membre
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Motif
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Période
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Statut
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow
                        key={l.id}
                        className="border-border/50 hover:bg-muted/10"
                      >
                        <TableCell className="font-medium text-foreground">
                          {l.staff_name || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {l.reason}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(l.start_date)} → {formatDate(l.end_date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={LEAVE_BADGE[l.status]}
                          >
                            {LEAVE_LABELS[l.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {l.status === LeaveStatus.PENDING ? (
                            <span className="inline-flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateLeaveStatus(l.id, LeaveStatus.APPROVED)
                                }
                                disabled={busyId !== null}
                                className="text-emerald-500 hover:text-emerald-500"
                              >
                                Approuver
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateLeaveStatus(l.id, LeaveStatus.REJECTED)
                                }
                                disabled={busyId !== null}
                                className="text-destructive hover:text-destructive"
                              >
                                Refuser
                              </Button>
                            </span>
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
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pointage des présences
              </CardTitle>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-44 bg-input/50 border-border/50 text-foreground"
              />
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun pointage pour cette date.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-muted/10">
                      <TableHead className="text-muted-foreground font-medium">
                        Membre
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium">
                        Présence
                      </TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((a) => (
                      <TableRow
                        key={a.id}
                        className="border-border/50 hover:bg-muted/10"
                      >
                        <TableCell className="font-medium text-foreground">
                          {a.staff_name || "—"}
                        </TableCell>
                        <TableCell>
                          {a.present ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/50 text-emerald-500"
                            >
                              Présent
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-destructive/50 text-destructive"
                            >
                              Absent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAttendance(a)}
                            disabled={busyId !== null}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {busyId === a.id
                              ? "Mise à jour..."
                              : a.present
                                ? "Marquer absent"
                                : "Marquer présent"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "evaluations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setEvalDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Star className="mr-2 h-4 w-4" />
              Nouvelle évaluation
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

      <AddStaffDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        creating={creatingStaff}
        onCreate={createStaff}
      />
      <CreateLeaveDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        staff={staff}
        creating={creatingLeave}
        onCreate={createLeave}
      />
      <CreateEvaluationDialog
        open={evalDialogOpen}
        onOpenChange={setEvalDialogOpen}
        staff={staff}
        creating={creatingEvaluation}
        onCreate={createEvaluation}
      />
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: StaffEvaluation }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base font-medium text-foreground">
            {evaluation.staff_name || "Membre"}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {evaluation.period}
            {evaluation.evaluated_at
              ? ` · ${format(evaluation.evaluated_at, "dd/MM/yyyy", { locale: fr })}`
              : ""}
          </p>
        </div>
        <Rating value={evaluation.rating} />
      </CardHeader>
      {evaluation.comments && (
        <CardContent className="text-sm text-foreground">
          {evaluation.comments}
        </CardContent>
      )}
    </Card>
  );
}

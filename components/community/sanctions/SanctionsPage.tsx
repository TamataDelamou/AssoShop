"use client";

import { useState } from "react";
import { Gavel, ShieldBan } from "lucide-react";
import { useSanctions } from "@/hooks/community/useSanctions";
import { ApplySanctionDialog } from "./ApplySanctionDialog";
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
  MemberStatus,
  Sanction,
  SanctionStatus,
  SanctionType,
} from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_BADGE: Record<SanctionType, string> = {
  [SanctionType.WARNING]: "border-amber-500/50 text-amber-500",
  [SanctionType.SUSPENSION]: "border-orange-500/50 text-orange-500",
  [SanctionType.EXCLUSION]: "border-red-500/50 text-red-500",
};

const TYPE_LABEL: Record<SanctionType, string> = {
  [SanctionType.WARNING]: "Avertissement",
  [SanctionType.SUSPENSION]: "Suspension",
  [SanctionType.EXCLUSION]: "Exclusion",
};

function durationLabel(sanction: Sanction): string {
  if (sanction.type === SanctionType.SUSPENSION) {
    return sanction.duration_days ? `${sanction.duration_days} jours` : "—";
  }
  if (sanction.type === SanctionType.EXCLUSION) return "Définitive";
  return "Sans durée";
}

interface Props {
  organizationId: string;
}

export function SanctionsPage({ organizationId }: Props) {
  const {
    sanctions,
    members,
    loading,
    applying,
    liftingId,
    error,
    applySanction,
    liftSanction,
  } = useSanctions(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeMembers = members.filter(
    (m) => m.status === MemberStatus.ACTIVE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">Sanctions</h2>
          <p className="text-sm text-muted-foreground">
            Discipline interne : avertissements, suspensions et exclusions.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Gavel className="mr-2 h-4 w-4" />
          Appliquer une sanction
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Historique des sanctions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-muted/30" />
              ))}
            </div>
          ) : sanctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <ShieldBan className="h-8 w-8" />
              <p>Aucune sanction enregistrée.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/10">
                  <TableHead className="text-muted-foreground font-medium">
                    Membre
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Type
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Motif
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Durée
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium">
                    Début
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
                {sanctions.map((sanction) => (
                  <TableRow
                    key={sanction.id}
                    className="border-border/50 hover:bg-muted/10"
                  >
                    <TableCell className="font-medium">
                      <p className="text-foreground">
                        {sanction.member?.name || "Membre"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sanction.member?.email || sanction.member?.phone}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TYPE_BADGE[sanction.type]}
                      >
                        {TYPE_LABEL[sanction.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs">
                      {sanction.reason}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {durationLabel(sanction)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sanction.start_date
                        ? format(sanction.start_date, "dd/MM/yyyy", {
                            locale: fr,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {sanction.status === SanctionStatus.ACTIVE ? (
                        <Badge
                          variant="outline"
                          className="border-primary/50 text-primary"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-border/50 text-muted-foreground"
                        >
                          Levée
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {sanction.status === SanctionStatus.ACTIVE ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => liftSanction(sanction.id)}
                          disabled={liftingId !== null}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {liftingId === sanction.id
                            ? "Levée..."
                            : "Lever"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ApplySanctionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={activeMembers}
        applying={applying}
        onApply={applySanction}
      />
    </div>
  );
}

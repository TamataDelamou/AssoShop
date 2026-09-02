"use client";

import { useState } from "react";
import { Link2, Unlink, Users } from "lucide-react";
import { useAffiliations } from "@/hooks/community/useAffiliations";
import { LinkAffiliationDialog } from "./LinkAffiliationDialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Affiliation,
  AffiliationStatus,
  UpdateAffiliationPayload,
} from "@/types/modules/community";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS: Record<AffiliationStatus, string> = {
  [AffiliationStatus.PENDING]: "En attente",
  [AffiliationStatus.ACTIVE]: "Active",
  [AffiliationStatus.SUSPENDED]: "Suspendue",
};

const STATUS_BADGE: Record<AffiliationStatus, string> = {
  [AffiliationStatus.PENDING]: "border-amber-500/50 text-amber-500",
  [AffiliationStatus.ACTIVE]: "border-emerald-500/50 text-emerald-500",
  [AffiliationStatus.SUSPENDED]: "border-muted-foreground/50 text-muted-foreground",
};

interface Props {
  organizationId: string;
}

export function AffiliationsPage({ organizationId }: Props) {
  const {
    affiliations,
    availableOrganizations,
    loading,
    linking,
    busyId,
    error,
    linkAffiliation,
    updateAffiliation,
    unlinkAffiliation,
  } = useAffiliations(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeCount = affiliations.filter(
    (a) => a.status === AffiliationStatus.ACTIVE,
  ).length;
  const pendingCount = affiliations.filter(
    (a) => a.status === AffiliationStatus.PENDING,
  ).length;
  const sharedMembers = affiliations.reduce(
    (sum, a) => sum + a.shared_member_count,
    0,
  );

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
            Associations affiliées
          </h2>
          <p className="text-sm text-muted-foreground">
            Associations sœurs : liaison, partage de membres et de détails
            financiers.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Lier une association
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Affiliations actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-500">
              {activeCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-500">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Membres partagés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {sharedMembers}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {affiliations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune association affiliée.
          </p>
        ) : (
          affiliations.map((affiliation) => (
            <AffiliationCard
              key={affiliation.id}
              affiliation={affiliation}
              busy={busyId === affiliation.id}
              disabled={busyId !== null}
              onUpdate={updateAffiliation}
              onUnlink={unlinkAffiliation}
            />
          ))
        )}
      </div>

      <LinkAffiliationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizations={availableOrganizations}
        linking={linking}
        onLink={linkAffiliation}
      />
    </div>
  );
}

function AffiliationCard({
  affiliation,
  busy,
  disabled,
  onUpdate,
  onUnlink,
}: {
  affiliation: Affiliation;
  busy: boolean;
  disabled: boolean;
  onUpdate: (id: string, payload: UpdateAffiliationPayload) => Promise<void>;
  onUnlink: (id: string) => Promise<void>;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={STATUS_BADGE[affiliation.status]}
            >
              {STATUS_LABELS[affiliation.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Liée le{" "}
              {affiliation.linked_at
                ? format(affiliation.linked_at, "dd/MM/yyyy", { locale: fr })
                : "—"}
            </span>
          </div>
          <CardTitle className="text-base font-medium text-foreground">
            {affiliation.affiliate_name || "Association"}
          </CardTitle>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Membres partagés</p>
          <p className="text-lg font-semibold text-foreground">
            {affiliation.shared_member_count}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ShareRow
            label="Partage des membres"
            checked={affiliation.share_members}
            disabled={disabled}
            onToggle={() =>
              onUpdate(affiliation.id, {
                share_members: !affiliation.share_members,
              })
            }
          />
          <ShareRow
            label="Partage des détails financiers"
            checked={affiliation.share_finances}
            disabled={disabled}
            onToggle={() =>
              onUpdate(affiliation.id, {
                share_finances: !affiliation.share_finances,
              })
            }
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={affiliation.status}
              onValueChange={(v) =>
                onUpdate(affiliation.id, { status: v as AffiliationStatus })
              }
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-44 border bg-transparent",
                  STATUS_BADGE[affiliation.status],
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {Object.values(AffiliationStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {busy && (
              <span className="text-xs text-muted-foreground">
                Mise à jour...
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnlink(affiliation.id)}
            disabled={disabled}
            className="text-destructive hover:text-destructive self-start"
          >
            <Unlink className="mr-1 h-4 w-4" />
            Délier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ShareRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
        checked
          ? "border-primary/50 bg-primary/10"
          : "border-border/50 bg-transparent",
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          checked ? "text-primary" : "text-muted-foreground",
        )}
      >
        {checked ? "Activé" : "Désactivé"}
      </span>
    </button>
  );
}

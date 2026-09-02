"use client";

import { useMemberProfile } from "@/hooks/community/useMemberProfile";
import { EngagementBadge } from "@/components/finance/EngagementBadge";
import { MemberStatusBadge } from "./MemberStatusBadge";
import { QrCode } from "@/components/ui/qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CreditCard,
  HandCoins,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { MEMBER_ROLES } from "@/utils/constants";
import { Member } from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  organizationId: string;
  organizationName?: string;
}

export function MemberProfileDialog({
  open,
  onOpenChange,
  member,
  organizationId,
  organizationName,
}: Props) {
  const { profile, loading, error } = useMemberProfile(
    organizationId,
    member?.id ?? null,
  );

  const roleLabel =
    MEMBER_ROLES.find((r) => r.value === member?.role)?.label ??
    member?.role ??
    "";
  const membershipCode = member
    ? `ASSO-${organizationId.toUpperCase()}-${member.id.toUpperCase()}`
    : "";
  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${organizationId}?member=${member?.id ?? ""}`
      : `/join/${organizationId}`;

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            Profil complet du membre
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Informations personnelles, engagement communautaire et carte
            numérique.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full bg-muted/30" />
            <Skeleton className="h-40 w-full bg-muted/30" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* En-tête membre */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-primary/20 text-primary">
                <AvatarFallback>
                  {member.user?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-foreground truncate">
                  {member.user?.name || "Utilisateur"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{roleLabel}</span>
                  <MemberStatusBadge status={member.status} />
                </div>
              </div>
              {profile && <EngagementBadge engagement={profile.engagement} />}
            </div>

            {/* Coordonnées */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="text-foreground">{member.user?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p className="text-foreground">{member.user?.phone || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Membre depuis</p>
                <p className="text-foreground">
                  {member.joined_at
                    ? format(member.joined_at, "dd/MM/yyyy", { locale: fr })
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Score de confiance</p>
                <p className="text-foreground">
                  {profile ? `${profile.trust_score}/100` : "-"}
                </p>
              </div>
            </div>

            {/* Historique agrégé */}
            {profile && (
              <div className="grid grid-cols-3 gap-3">
                <HistoryTile
                  icon={HandCoins}
                  label="Cotisations"
                  value={profile.history.contributions_count}
                />
                <HistoryTile
                  icon={Users}
                  label="Réunions"
                  value={profile.history.meetings_attended}
                />
                <HistoryTile
                  icon={HeartHandshake}
                  label="Aides reçues"
                  value={profile.history.social_aids_received}
                />
                <HistoryTile
                  icon={Wallet}
                  label="Tontines"
                  value={profile.history.tontines_count}
                />
                <HistoryTile
                  icon={CreditCard}
                  label="Épargne"
                  value={profile.history.savings_active ? "Oui" : "Non"}
                />
                <HistoryTile
                  icon={ShoppingBag}
                  label="Achats"
                  value={profile.history.purchases_count}
                />
              </div>
            )}

            {/* Carte numérique */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
              <p className="text-xs font-medium text-primary flex items-center gap-1 mb-3">
                <Sparkles className="h-3 w-3" />
                Carte numérique du membre
              </p>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-white p-2 shrink-0">
                  <QrCode value={cardUrl} size={112} />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.user?.name || "Utilisateur"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {organizationName || "Association"}
                  </p>
                  <p className="text-xs font-mono text-foreground">
                    {membershipCode}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

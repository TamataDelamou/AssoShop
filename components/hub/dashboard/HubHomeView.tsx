"use client";

import { useState } from "react";
import {
  FavoriteType,
  HubBundle,
} from "@/types/modules/hub";
import { EngagementLevel } from "@/types/modules/finance";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import {
  ENGAGEMENT_LEVEL_LABELS,
  FAVORITE_TYPE_LABELS,
  HUB_LABELS,
  SYNC_STATUS_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import {
  Building2,
  HandCoins,
  Inbox,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";

function engagementVariant(level: EngagementLevel): string {
  switch (level) {
    case EngagementLevel.AT_RISK:
      return "border-red-500/40 bg-red-500/10 text-red-400";
    case EngagementLevel.IRREGULAR:
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case EngagementLevel.RELIABLE:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    case EngagementLevel.EXEMPLARY:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
  }
}

const QUICK_ACTIONS = [
  { id: "profile", label: "Profil & carte", icon: Users },
  { id: "vault", label: HUB_LABELS.TAB_VAULT, icon: Inbox },
  { id: "messaging", label: HUB_LABELS.TAB_MESSAGING, icon: MessageSquare },
  { id: "notifications", label: HUB_LABELS.TAB_NOTIFICATIONS, icon: Wallet },
  { id: "assistant", label: HUB_LABELS.TAB_ASSISTANT, icon: Sparkles },
  { id: "settings", label: HUB_LABELS.TAB_SETTINGS, icon: Settings },
];

export function HubHomeView({
  bundle,
  online,
  onChanged,
  onNavigate,
}: {
  bundle: HubBundle;
  online: boolean;
  onChanged: () => Promise<void>;
  onNavigate: (tab: string) => void;
}) {
  const { profile, home, memberships, favorites, sync_queue } = bundle;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const associations = memberships.filter(
    (m) => m.kind === "association",
  );
  const groups = memberships.filter((m) => m.kind === "group");

  const removeFavorite = async (label: string, type: FavoriteType) => {
    setBusy(true);
    setError(null);
    try {
      await hubService.toggleFavorite({ type, label, detail: "" });
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const retrySync = async () => {
    setBusy(true);
    setError(null);
    try {
      await hubService.retrySync();
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HUB-12 : accueil unifié */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-light">
            {HUB_LABELS.WELCOME}, {profile.name.split(" ")[0]}
          </h3>
          <p className="text-sm text-muted-foreground">
            {profile.city} · {profile.country}
          </p>
        </div>
        <Badge
          variant="outline"
          className={engagementVariant(profile.engagement)}
        >
          {ENGAGEMENT_LEVEL_LABELS[profile.engagement]}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: HUB_LABELS.MY_ASSOCIATIONS,
            value: String(home.associations_count),
            icon: Building2,
          },
          {
            label: HUB_LABELS.MY_GROUPS,
            value: String(home.groups_count),
            icon: Users,
          },
          {
            label: HUB_LABELS.INVITATIONS,
            value: String(home.pending_invitations),
            icon: Inbox,
          },
          {
            label: HUB_LABELS.MONTHLY_INCOME,
            value: formatCurrency(home.monthly_income, home.currency),
            icon: TrendingUp,
          },
          {
            label: HUB_LABELS.MONTHLY_EXPENSES,
            value: formatCurrency(home.monthly_expenses, home.currency),
            icon: TrendingDown,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <stat.icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HUB-42 : raccourcis rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <action.icon className="h-5 w-5 text-primary" />
            {action.label}
          </button>
        ))}
      </div>

      {/* HUB-18 / HUB-19 : groupes et associations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {HUB_LABELS.MY_ASSOCIATIONS}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {associations.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type} · {m.role}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <HandCoins className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">{HUB_LABELS.MY_GROUPS}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type} · {m.role}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* HUB-17 : favoris */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Star className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">{HUB_LABELS.FAVORITES}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun favori enregistré.
            </p>
          ) : (
            favorites.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {FAVORITE_TYPE_LABELS[f.type]} · {f.detail}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10"
                  onClick={() => removeFavorite(f.label, f.type)}
                  disabled={busy || !online}
                >
                  Retirer
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* HUB-35 / HUB-36 : mode hors connexion et file de synchronisation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-primary" />
            {HUB_LABELS.SYNC_TITLE}
          </CardTitle>
          {!online && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <WifiOff className="mr-1 h-3 w-3" />
              {HUB_LABELS.OFFLINE_BADGE}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {sync_queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {HUB_LABELS.NO_SYNC}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {sync_queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.module} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-white/10 bg-white/5",
                        item.status === "conflict" &&
                          "border-amber-500/40 bg-amber-500/10 text-amber-400",
                        item.status === "synced" &&
                          "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                      )}
                    >
                      {SYNC_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                onClick={retrySync}
                disabled={busy || !online}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {HUB_LABELS.SYNC_RETRY}
              </Button>
            </>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

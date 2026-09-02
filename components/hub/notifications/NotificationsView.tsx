"use client";

import { useState } from "react";
import {
  AppNotification,
  NotificationChannel,
  NotificationPreference,
} from "@/types/modules/hub";
import { hubService } from "@/services/hub/hub";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils/formatters";
import {
  HUB_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Save } from "lucide-react";

function channelVariant(channel: NotificationChannel): string {
  switch (channel) {
    case NotificationChannel.SMS:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
    case NotificationChannel.EMAIL:
      return "border-violet-500/40 bg-violet-500/10 text-violet-400";
    case NotificationChannel.WHATSAPP:
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

export function NotificationsView({
  notifications,
  preferences,
  online,
  onChanged,
}: {
  notifications: AppNotification[];
  preferences: NotificationPreference[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [edited, setEdited] = useState<NotificationPreference[]>(preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markRead = async () => {
    setBusy(true);
    setError(null);
    try {
      await hubService.markNotificationsRead();
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const togglePref = (index: number) => {
    setEdited((prev) =>
      prev.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p)),
    );
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await hubService.savePreferences(edited);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HUB-24 : centre de notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-light">
              {HUB_LABELS.NOTIFICATIONS_TITLE}
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={markRead}
            disabled={busy || !online}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            {HUB_LABELS.MARK_READ}
          </Button>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(!n.read && "border-primary/30 bg-primary/5")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">{n.title}</CardTitle>
                <Badge variant="outline" className={channelVariant(n.channel)}>
                  {NOTIFICATION_CHANNEL_LABELS[n.channel]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* HUB-25 / HUB-37 : préférences et canal de réception */}
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Save className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            {HUB_LABELS.PREFERENCES_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {HUB_LABELS.RECEIPT_CHANNEL} — choisissez les canaux pour chaque
            type d&apos;événement.
          </p>
          <div className="space-y-2">
            {edited.map((pref, index) => (
              <label
                key={`${pref.channel}-${pref.event_type}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <span>
                  <span className="font-medium">
                    {NOTIFICATION_CHANNEL_LABELS[pref.channel]}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {pref.event_type}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  onChange={() => togglePref(index)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button size="sm" onClick={save} disabled={busy || !online}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {HUB_LABELS.SAVE}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

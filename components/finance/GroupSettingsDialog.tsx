"use client";

import { useState } from "react";
import { useGroupSettings } from "@/hooks/finance/useGroupSettings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FINANCE_LABELS, COMMON_LABELS } from "@/utils/constants";
import {
  FinancialGroup,
  GroupSettings,
  GroupVisibility,
  UpdateGroupSettingsPayload,
} from "@/types/modules/finance";

const VISIBILITY_OPTIONS: { value: GroupVisibility; label: string }[] = [
  { value: GroupVisibility.PRIVATE, label: "Privé" },
  { value: GroupVisibility.MEMBERS, label: "Membres" },
  { value: GroupVisibility.PUBLIC, label: "Public" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  group: FinancialGroup | null;
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  organizationId,
  group,
}: Props) {
  const { settings, loading, saving, error, update } = useGroupSettings(
    organizationId,
    group?.id ?? null,
  );

  return (
    <Dialog open={open && !!group} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {FINANCE_LABELS.SETTINGS_TITLE}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {group?.name}
          </DialogDescription>
        </DialogHeader>

        {loading || !settings ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full bg-muted/30" />
            <Skeleton className="h-10 w-full bg-muted/30" />
          </div>
        ) : (
          <SettingsForm
            key={settings.group_id}
            settings={settings}
            saving={saving}
            error={error}
            onSave={update}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({
  settings,
  saving,
  error,
  onSave,
  onClose,
}: {
  settings: GroupSettings;
  saving: boolean;
  error: Error | null;
  onSave: (payload: UpdateGroupSettingsPayload) => Promise<GroupSettings>;
  onClose: () => void;
}) {
  const [visibility, setVisibility] = useState<GroupVisibility>(
    settings.visibility,
  );
  const [allowJoin, setAllowJoin] = useState(settings.allow_join_requests);
  const [reminders, setReminders] = useState(
    settings.notify_payment_reminders,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        visibility,
        allow_join_requests: allowJoin,
        notify_payment_reminders: reminders,
      });
      onClose();
    } catch {
      // L'erreur est exposée par le hook.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label className="text-foreground">{FINANCE_LABELS.SETTINGS_VISIBILITY}</Label>
        <Select
          value={visibility}
          onValueChange={(v) => setVisibility(v as GroupVisibility)}
          disabled={saving}
        >
          <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            {VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">
          {FINANCE_LABELS.SETTINGS_JOIN_REQUESTS}
        </span>
        <input
          type="checkbox"
          checked={allowJoin}
          onChange={(e) => setAllowJoin(e.target.checked)}
          disabled={saving}
          className="h-4 w-4 accent-primary"
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">
          {FINANCE_LABELS.SETTINGS_REMINDERS}
        </span>
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => setReminders(e.target.checked)}
          disabled={saving}
          className="h-4 w-4 accent-primary"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          disabled={saving}
        >
          {COMMON_LABELS.CANCEL}
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? COMMON_LABELS.LOADING : FINANCE_LABELS.SETTINGS_SAVE}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpdateMember } from "@/hooks/community/useUpdateMember";
import { getErrorMessage } from "@/lib/utils";
import {
  MEMBER_LABELS,
  MEMBER_ROLES,
  MEMBER_STATUS_OPTIONS,
  COMMON_LABELS,
} from "@/utils/constants";
import { Member, MemberRole, MemberStatus } from "@/types/modules/community";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function MemberDetailsDialog({
  open,
  onOpenChange,
  member,
  organizationId,
  onSuccess,
}: Props) {
  const [role, setRole] = useState<MemberRole | null>(member?.role ?? null);
  const [status, setStatus] = useState<MemberStatus | null>(member?.status ?? null);
  const [error, setError] = useState<string | null>(null);
  const { updateMember, loading } = useUpdateMember();

  const handleSave = async () => {
    if (!member || !role || !status) return;
    setError(null);
    try {
      await updateMember(organizationId, member.id, { role, status });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, MEMBER_LABELS.ERROR_UPDATE));
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/90 backdrop-blur-xl border-border/50 text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {member.user?.name || "Membre"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="text-foreground">{member.user?.email || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="text-foreground">{member.user?.phone || "-"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              {MEMBER_LABELS.ROLE_LABEL}
            </Label>
            <Select
              value={role || undefined}
              onValueChange={(val) => setRole(val as MemberRole)}
              disabled={loading}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue
                  placeholder={MEMBER_LABELS.ROLE_SELECT_PLACEHOLDER}
                />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {MEMBER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              {MEMBER_LABELS.STATUS_LABEL}
            </Label>
            <Select
              value={status || undefined}
              onValueChange={(val) => setStatus(val as MemberStatus)}
              disabled={loading}
            >
              <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
                <SelectValue placeholder="Choisir un statut" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                {MEMBER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.color}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              {COMMON_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !role || !status}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? COMMON_LABELS.LOADING : COMMON_LABELS.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

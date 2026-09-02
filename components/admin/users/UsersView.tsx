"use client";

import { useState } from "react";
import { PlatformUser, PlatformUserStatus } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatters";
import {
  ADMIN_LABELS,
  PLATFORM_USER_STATUS_LABELS,
} from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Ban, UserCheck } from "lucide-react";

export function UsersView({
  users,
  online,
  onChanged,
}: {
  users: PlatformUser[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSuspend = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminService.suspendUser(id);
      await onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{user.name}</p>
              <Badge
                variant="outline"
                className={cn(
                  "border-white/10 bg-white/5",
                  user.status === PlatformUserStatus.SUSPENDED &&
                    "border-red-500/40 bg-red-500/10 text-red-400",
                )}
              >
                {PLATFORM_USER_STATUS_LABELS[user.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {user.email} · {user.phone} · {user.role} · inscrit le{" "}
              {formatDate(user.created_at)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "border-white/10",
              user.status === PlatformUserStatus.ACTIVE &&
                "border-red-500/40 text-red-400 hover:text-red-400",
            )}
            onClick={() => toggleSuspend(user.id)}
            disabled={busy || !online}
          >
            {user.status === PlatformUserStatus.ACTIVE ? (
              <Ban className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            {user.status === PlatformUserStatus.ACTIVE
              ? ADMIN_LABELS.SUSPEND
              : ADMIN_LABELS.REACTIVATE}
          </Button>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

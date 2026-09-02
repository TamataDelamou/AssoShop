"use client";

import { useState } from "react";
import { PlatformConfig } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ADMIN_LABELS } from "@/utils/constants";
import { Save } from "lucide-react";

export function PlatformConfigView({
  config,
  online,
  onChanged,
}: {
  config: PlatformConfig;
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState<PlatformConfig>(config);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminService.updateConfig(form);
      setSaved(true);
      await onChanged();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof PlatformConfig>(
    key: K,
    value: PlatformConfig[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">
          Nom de la plateforme
        </span>
        <Input
          value={form.platform_name}
          onChange={(e) => set("platform_name", e.target.value)}
        />
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">
          E-mail de support
        </span>
        <Input
          value={form.support_email}
          onChange={(e) => set("support_email", e.target.value)}
        />
      </div>
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">
          Version des CGU
        </span>
        <Input
          value={form.cgu_version}
          onChange={(e) => set("cgu_version", e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
        <div>
          <p className="text-sm font-medium">Mode maintenance</p>
          <p className="text-xs text-muted-foreground">
            Bloque l&apos;accès public à la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              form.maintenance_mode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            }
          >
            {form.maintenance_mode ? "Activé" : "Désactivé"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => set("maintenance_mode", !form.maintenance_mode)}
          >
            {form.maintenance_mode ? "Désactiver" : "Activer"}
          </Button>
        </div>
      </div>
      <Button onClick={save} disabled={busy || !online}>
        <Save className="mr-1.5 h-3.5 w-3.5" />
        {saved ? "Enregistré" : ADMIN_LABELS.SAVE}
      </Button>
    </div>
  );
}

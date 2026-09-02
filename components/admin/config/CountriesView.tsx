"use client";

import { useState } from "react";
import { CountryConfig } from "@/types/modules/admin";
import { adminService } from "@/services/admin/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function CountriesView({
  countries,
  online,
  onChanged,
}: {
  countries: CountryConfig[];
  online: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggle = async (id: string) => {
    setBusyId(id);
    try {
      await adminService.toggleCountry(id);
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {countries.map((country) => (
        <div
          key={country.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">
                {country.name} <span className="text-muted-foreground">({country.code})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {country.currency} · {country.language} · TVA {country.tva_rate}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                country.status === "active"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-400"
              }
            >
              {country.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10"
              disabled={busyId === country.id || !online}
              onClick={() => toggle(country.id)}
            >
              {country.status === "active" ? "Désactiver" : "Activer"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

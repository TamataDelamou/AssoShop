"use client";

import { NationalStat } from "@/types/modules/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";

export function NationalDashboardView({
  national,
}: {
  national: NationalStat[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Statistiques agrégées et anonymisées par pays activé.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {national.map((n) => (
          <Card key={n.country}>
            <CardHeader>
              <CardTitle className="text-sm">{n.country}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Associations</span>
                <span>{n.associations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membres</span>
                <span>{n.members.toLocaleString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groupes</span>
                <span>{n.groups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume cotisations</span>
                <span>{formatCurrency(n.cotisations_volume, "GNF")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projets financés</span>
                <span>{n.projects_financed}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

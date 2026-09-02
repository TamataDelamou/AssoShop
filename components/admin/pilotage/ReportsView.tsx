"use client";

import { GlobalReport } from "@/types/modules/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function ReportsView({ reports }: { reports: GlobalReport }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {reports.modules.map((m) => (
          <Card key={m.module}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{m.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground">{m.metric}</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">
                  {formatCurrency(m.value, "GNF")}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-white/10 bg-white/5",
                    m.trend >= 0
                      ? "text-emerald-400"
                      : "text-red-400",
                  )}
                >
                  {m.trend >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {m.trend}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pays principaux — {reports.period}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.top_countries.map((c) => (
              <div
                key={c.country}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.country}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.associations} associations · {c.members} membres
                  </p>
                </div>
                <p className="font-bold">{formatCurrency(c.volume, "GNF")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

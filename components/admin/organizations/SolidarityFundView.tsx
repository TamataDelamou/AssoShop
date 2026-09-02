"use client";

import { SolidarityFundStatus } from "@/types/modules/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { HeartHandshake, ShieldCheck, Wallet } from "lucide-react";

export function SolidarityFundView({
  fund,
}: {
  fund: SolidarityFundStatus;
}) {
  const stats = [
    {
      label: "Total collecté",
      value: formatCurrency(fund.total_collected, fund.currency),
      icon: Wallet,
    },
    {
      label: "Cas couverts",
      value: String(fund.covered_cases),
      icon: HeartHandshake,
    },
    {
      label: "Disponible",
      value: formatCurrency(fund.available, fund.currency),
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
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
  );
}

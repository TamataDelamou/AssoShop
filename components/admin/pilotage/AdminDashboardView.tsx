"use client";

import { AdminDashboardStats } from "@/types/modules/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { ADMIN_LABELS } from "@/utils/constants";
import {
  Building2,
  HandCoins,
  TrendingUp,
  Users,
  ShieldAlert,
  MessageSquareWarning,
  Wallet,
} from "lucide-react";

export function AdminDashboardView({
  dashboard,
}: {
  dashboard: AdminDashboardStats;
}) {
  const stats = [
    {
      label: ADMIN_LABELS.ACTIVE_USERS,
      value: dashboard.active_users.toLocaleString("fr-FR"),
      icon: Users,
    },
    {
      label: ADMIN_LABELS.ACTIVE_ASSOCIATIONS,
      value: String(dashboard.associations_count),
      icon: Building2,
    },
    {
      label: ADMIN_LABELS.ACTIVE_GROUPS,
      value: String(dashboard.groups_count),
      icon: HandCoins,
    },
    {
      label: ADMIN_LABELS.MONTHLY_VOLUME,
      value: formatCurrency(dashboard.monthly_volume, dashboard.currency),
      icon: TrendingUp,
    },
    {
      label: ADMIN_LABELS.PENDING_VALIDATIONS,
      value: String(dashboard.pending_validations),
      icon: ShieldAlert,
    },
    {
      label: ADMIN_LABELS.OPEN_DISPUTES,
      value: String(dashboard.disputes_open),
      icon: MessageSquareWarning,
    },
    {
      label: ADMIN_LABELS.REVENUE,
      value: formatCurrency(dashboard.revenue, dashboard.currency),
      icon: Wallet,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

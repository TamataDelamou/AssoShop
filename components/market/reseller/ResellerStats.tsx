"use client";

import { SalesStats } from "@/types/modules/market";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { ShoppingBag, Star, TrendingUp } from "lucide-react";

export function ResellerStats({ stats }: { stats: SalesStats }) {
  const maxRevenue = Math.max(
    ...stats.monthly.map((m) => m.revenue),
    1,
  );

  const cards = [
    {
      label: MARKET_LABELS.REVENUE,
      value: formatCurrency(stats.total_revenue, stats.currency),
      icon: TrendingUp,
    },
    {
      label: MARKET_LABELS.ORDERS_COUNT,
      value: String(stats.orders_count),
      icon: ShoppingBag,
    },
    {
      label: MARKET_LABELS.AVERAGE_RATING,
      value: stats.average_rating.toFixed(1),
      icon: Star,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {MARKET_LABELS.MONTHLY_REVENUE}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.monthly.map((month) => (
            <div key={month.month} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{month.month}</span>
                <span className="font-medium">
                  {formatCurrency(month.revenue, stats.currency)}
                </span>
              </div>
              <div className="h-2 rounded bg-white/10">
                <div
                  className="h-2 rounded bg-primary"
                  style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

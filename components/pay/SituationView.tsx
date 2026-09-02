"use client";

import { FinancialSituation } from "@/types/modules/pay";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { PAY_LABELS } from "@/utils/constants";
import {
  HandCoins,
  HeartHandshake,
  Landmark,
  PiggyBank,
  Scale,
  Users,
} from "lucide-react";

interface SituationViewProps {
  situation: FinancialSituation;
}

export function SituationView({ situation }: SituationViewProps) {
  const currency = situation.currency;
  const netWorth =
    situation.contributions +
    situation.savings +
    situation.tontine +
    situation.aids_received -
    situation.loans_outstanding;

  const items = [
    {
      label: PAY_LABELS.CONTRIBUTIONS,
      value: situation.contributions,
      icon: HandCoins,
    },
    {
      label: PAY_LABELS.SAVINGS,
      value: situation.savings,
      icon: PiggyBank,
    },
    {
      label: PAY_LABELS.TONTINE,
      value: situation.tontine,
      icon: Users,
    },
    {
      label: PAY_LABELS.AIDS_RECEIVED,
      value: situation.aids_received,
      icon: HeartHandshake,
    },
    {
      label: PAY_LABELS.LOANS_OUTSTANDING,
      value: situation.loans_outstanding,
      icon: Landmark,
      negative: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{PAY_LABELS.SITUATION_TITLE}</h3>
      </div>

      <Card className="max-w-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            {PAY_LABELS.NET_WORTH}
          </p>
          <p className="text-4xl font-bold">
            {formatCurrency(netWorth, currency)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <item.icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">
                {item.negative ? "−" : ""}
                {formatCurrency(item.value, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

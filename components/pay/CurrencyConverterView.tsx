"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PAY_CURRENCIES,
  PAY_EXCHANGE_RATES,
  PAY_LABELS,
} from "@/utils/constants";
import { RefreshCw } from "lucide-react";

const selectStyles =
  "h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50";

function convert(
  amount: number,
  from: string,
  to: string,
): number {
  return (amount * PAY_EXCHANGE_RATES[from]) / PAY_EXCHANGE_RATES[to];
}

export function CurrencyConverterView() {
  const [amount, setAmount] = useState(10000);
  const [from, setFrom] = useState("GNF");

  const formatted = (value: number, currency: string) => {
    const maximumFractionDigits = ["USD", "EUR"].includes(currency) ? 2 : 0;
    return new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-light">{PAY_LABELS.CONVERSION_TITLE}</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {PAY_LABELS.CONVERSION_NOTE}
      </p>

      <div className="grid max-w-sm gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">
            {PAY_LABELS.AMOUNT}
          </Label>
          <Input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">
            Devise source
          </Label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={selectStyles}
          >
            {PAY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAY_CURRENCIES.filter((c) => c !== from).map((currency) => (
          <Card key={currency}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {currency}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {formatted(convert(amount, from, currency), currency)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {currency}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

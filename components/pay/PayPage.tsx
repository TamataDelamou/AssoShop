"use client";

import { useState } from "react";
import { usePaySpace } from "@/hooks/pay/usePaySpace";
import { WalletView } from "./wallet/WalletView";
import { TransactionsView } from "./transactions/TransactionsView";
import { ReconciliationView } from "./reconciliation/ReconciliationView";
import { CurrencyConverterView } from "./CurrencyConverterView";
import { SituationView } from "./SituationView";
import { SettingsView } from "./SettingsView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PAY_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Database, WifiOff } from "lucide-react";

const TABS = [
  { id: "wallet", label: PAY_LABELS.TAB_WALLET },
  { id: "transactions", label: PAY_LABELS.TAB_TRANSACTIONS },
  { id: "reconciliation", label: PAY_LABELS.TAB_RECONCILIATION },
  { id: "conversion", label: PAY_LABELS.TAB_CONVERSION },
  { id: "situation", label: PAY_LABELS.TAB_SITUATION },
  { id: "settings", label: PAY_LABELS.TAB_SETTINGS },
];

export function PayPage() {
  const { bundle, loading, error, fromCache, online, refetch } = usePaySpace();
  const [activeTab, setActiveTab] = useState("wallet");

  if (loading && !bundle) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error && !bundle) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!bundle) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {PAY_LABELS.PAGE_TITLE}
          </h2>
          <p className="text-sm text-muted-foreground">
            {PAY_LABELS.PAGE_SUBTITLE}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <WifiOff className="mr-1 h-3 w-3" />
              {PAY_LABELS.OFFLINE_BADGE}
            </Badge>
          )}
          {fromCache && (
            <Badge variant="outline" className="border-white/10 bg-white/5">
              <Database className="mr-1 h-3 w-3" />
              {PAY_LABELS.CACHED_BADGE}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/10 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "wallet" && (
        <WalletView
          wallets={bundle.wallets}
          methods={bundle.methods}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "transactions" && (
        <TransactionsView
          transactions={bundle.transactions}
          wallets={bundle.wallets}
        />
      )}
      {activeTab === "reconciliation" && (
        <ReconciliationView
          reconciliation={bundle.reconciliation}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "conversion" && <CurrencyConverterView />}
      {activeTab === "situation" && (
        <SituationView situation={bundle.situation} />
      )}
      {activeTab === "settings" && (
        <SettingsView
          settings={bundle.settings}
          online={online}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

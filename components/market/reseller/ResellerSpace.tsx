"use client";

import { useState } from "react";
import { ResellerApplicationStatus } from "@/types/modules/market";
import { useResellerSpace } from "@/hooks/market/useResellerSpace";
import { ResellerApplicationForm } from "./ResellerApplicationForm";
import { ResellerProducts } from "./ResellerProducts";
import { ResellerOrders } from "./ResellerOrders";
import { ResellerHistory } from "./ResellerHistory";
import { ResellerReviews } from "./ResellerReviews";
import { ResellerStats } from "./ResellerStats";
import { ResellerSettings } from "./ResellerSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MARKET_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Database, Store, WifiOff } from "lucide-react";

const TABS = [
  { id: "dashboard", label: MARKET_LABELS.DASHBOARD },
  { id: "products", label: MARKET_LABELS.RESELLER_PRODUCTS },
  { id: "orders", label: MARKET_LABELS.RECEIVED_ORDERS },
  { id: "pickups", label: MARKET_LABELS.PARCELS },
  { id: "reviews", label: MARKET_LABELS.REVIEWS },
  { id: "settings", label: MARKET_LABELS.SETTINGS },
];

export function ResellerSpace() {
  const { bundle, loading, error, fromCache, online, refetch } =
    useResellerSpace();
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const approved =
    bundle.application?.status === ResellerApplicationStatus.APPROVED;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-light">{MARKET_LABELS.TAB_RESELLER}</h3>
        </div>
        {approved && (
          <div className="flex items-center gap-2">
            {!online && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-400"
              >
                <WifiOff className="mr-1 h-3 w-3" />
                {MARKET_LABELS.OFFLINE_BADGE}
              </Badge>
            )}
            {fromCache && (
              <Badge variant="outline" className="border-white/10 bg-white/5">
                <Database className="mr-1 h-3 w-3" />
                {MARKET_LABELS.CACHED_BADGE}
              </Badge>
            )}
          </div>
        )}
      </div>

      {!approved ? (
        <ResellerApplicationForm
          application={bundle.application}
          onChanged={refetch}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "dashboard" && (
            <ResellerStats stats={bundle.stats} />
          )}
          {activeTab === "products" && (
            <ResellerProducts products={bundle.products} onChanged={refetch} />
          )}
          {activeTab === "orders" && (
            <ResellerOrders orders={bundle.orders} onChanged={refetch} />
          )}
          {activeTab === "pickups" && (
            <ResellerHistory pickups={bundle.pickups} />
          )}
          {activeTab === "reviews" && (
            <ResellerReviews reviews={bundle.reviews} />
          )}
          {activeTab === "settings" && (
            <ResellerSettings settings={bundle.settings} onSaved={refetch} />
          )}
        </>
      )}
    </div>
  );
}

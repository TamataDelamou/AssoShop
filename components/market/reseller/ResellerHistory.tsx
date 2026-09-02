"use client";

import { PickupRecord } from "@/types/modules/market";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/utils/formatters";
import { MARKET_LABELS } from "@/utils/constants";
import { PackageCheck, ScanLine } from "lucide-react";

export function ResellerHistory({ pickups }: { pickups: PickupRecord[] }) {
  if (pickups.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
        {MARKET_LABELS.EMPTY_CATALOG}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {pickups.map((pickup) => (
        <Card key={pickup.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {pickup.status === "delivered" ? (
                <PackageCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ScanLine className="h-4 w-4 text-primary" />
              )}
              {MARKET_LABELS.TRACKING_CODE} : {pickup.tracking_code}
            </CardTitle>
            <Badge
              variant="outline"
              className={
                pickup.status === "delivered"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-primary/40 bg-primary/10 text-primary"
              }
            >
              {pickup.status === "delivered"
                ? MARKET_LABELS.PICKUP_DELIVERED
                : MARKET_LABELS.PICKUP_SCANNED}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              {MARKET_LABELS.ORDER_NUMBER} {pickup.order_id}
            </p>
            <p className="text-xs">
              {formatDateTime(pickup.scanned_at)}
              {pickup.delivered_at
                ? ` → ${formatDateTime(pickup.delivered_at)}`
                : ""}
            </p>
            {pickup.recipient_name && (
              <p className="text-xs">
                {MARKET_LABELS.RECIPIENT} : {pickup.recipient_name}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

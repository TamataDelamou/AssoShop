"use client";

import { Badge } from "@/components/ui/badge";
import { TreasuryAccountType } from "@/types/modules/accounting";
import { TREASURY_ACCOUNT_OPTIONS } from "@/utils/constants";

const COLORS: Record<TreasuryAccountType, string> = {
  [TreasuryAccountType.CASH]: "bg-yellow-500/20 text-yellow-500",
  [TreasuryAccountType.BANK]: "bg-blue-500/20 text-blue-500",
  [TreasuryAccountType.MOBILE_MONEY]: "bg-purple-500/20 text-purple-500",
};

export function TreasuryAccountBadge({ type }: { type: TreasuryAccountType }) {
  const option = TREASURY_ACCOUNT_OPTIONS.find((o) => o.value === type);
  return (
    <Badge className={`${COLORS[type]} border-none font-normal`}>
      {option?.label ?? type}
    </Badge>
  );
}

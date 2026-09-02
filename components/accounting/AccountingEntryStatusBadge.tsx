"use client";

import { Badge } from "@/components/ui/badge";
import { AccountingEntryStatus } from "@/types/modules/accounting";
import { ACCOUNTING_ENTRY_STATUS_OPTIONS } from "@/utils/constants";

export function AccountingEntryStatusBadge({
  status,
}: {
  status: AccountingEntryStatus;
}) {
  const option = ACCOUNTING_ENTRY_STATUS_OPTIONS.find(
    (o) => o.value === status,
  );
  return (
    <Badge className={`${option?.color ?? ""} border-none font-normal`}>
      {option?.label ?? status}
    </Badge>
  );
}

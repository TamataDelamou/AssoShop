"use client";

import { FinancialGroupStatus } from "@/types/modules/finance";
import { FINANCIAL_GROUP_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: FinancialGroupStatus;
}

export function FinancialGroupStatusBadge({ status }: Props) {
  const option = FINANCIAL_GROUP_STATUS_OPTIONS.find(
    (s) => s.value === status,
  );
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

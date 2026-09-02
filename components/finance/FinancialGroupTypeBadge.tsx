"use client";

import { FinancialGroupType } from "@/types/modules/finance";
import { FINANCIAL_GROUP_TYPE_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  type: FinancialGroupType;
}

export function FinancialGroupTypeBadge({ type }: Props) {
  const option = FINANCIAL_GROUP_TYPE_OPTIONS.find((t) => t.value === type);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

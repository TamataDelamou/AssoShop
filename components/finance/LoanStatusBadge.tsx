"use client";

import { LoanStatus } from "@/types/modules/finance";
import { LOAN_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: LoanStatus;
}

export function LoanStatusBadge({ status }: Props) {
  const option = LOAN_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

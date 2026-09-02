"use client";

import { InsuranceEnrollmentStatus } from "@/types/modules/finance";
import { INSURANCE_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: InsuranceEnrollmentStatus;
}

export function InsuranceStatusBadge({ status }: Props) {
  const option = INSURANCE_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

"use client";

import { ClaimStatus } from "@/types/modules/finance";
import { CLAIM_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: ClaimStatus;
}

export function ClaimStatusBadge({ status }: Props) {
  const option = CLAIM_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

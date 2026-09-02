"use client";

import { ContributionStatus } from "@/types/modules/community";
import { CONTRIBUTION_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: ContributionStatus;
}

export function ContributionStatusBadge({ status }: Props) {
  const option = CONTRIBUTION_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

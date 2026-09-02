"use client";

import { SocialCaseStatus } from "@/types/modules/community";
import { SOCIAL_CASE_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: SocialCaseStatus;
}

export function SocialCaseStatusBadge({ status }: Props) {
  const option = SOCIAL_CASE_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

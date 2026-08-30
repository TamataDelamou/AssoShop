"use client";

import { MemberStatus } from "@/types/modules/community";
import { MEMBER_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: MemberStatus;
}

export function MemberStatusBadge({ status }: Props) {
  const option = MEMBER_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

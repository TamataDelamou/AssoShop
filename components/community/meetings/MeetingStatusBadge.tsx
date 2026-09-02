"use client";

import { MeetingStatus } from "@/types/modules/community";
import { MEETING_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: MeetingStatus;
}

export function MeetingStatusBadge({ status }: Props) {
  const option = MEETING_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

"use client";

import { AnnouncementAudience } from "@/types/modules/community";
import { ANNOUNCEMENT_AUDIENCE_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  audience: AnnouncementAudience;
}

export function AnnouncementAudienceBadge({ audience }: Props) {
  const option = ANNOUNCEMENT_AUDIENCE_OPTIONS.find(
    (o) => o.value === audience,
  );
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

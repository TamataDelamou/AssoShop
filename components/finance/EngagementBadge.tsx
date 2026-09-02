"use client";

import { EngagementLevel } from "@/types/modules/finance";
import { ENGAGEMENT_LEVEL_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  engagement: EngagementLevel;
}

export function EngagementBadge({ engagement }: Props) {
  const option = ENGAGEMENT_LEVEL_OPTIONS.find(
    (e) => e.value === engagement,
  );
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

"use client";

import { ProjectStatus } from "@/types/modules/community";
import { PROJECT_STATUS_OPTIONS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: Props) {
  const option = PROJECT_STATUS_OPTIONS.find((s) => s.value === status);
  if (!option) return null;
  return (
    <Badge className={`${option.color} border-none font-normal`}>
      {option.label}
    </Badge>
  );
}

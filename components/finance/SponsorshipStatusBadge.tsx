"use client";

import { SponsorshipRequestStatus } from "@/types/modules/finance";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  SponsorshipRequestStatus,
  { label: string; color: string }
> = {
  [SponsorshipRequestStatus.PENDING]: {
    label: "En attente du parrain",
    color: "bg-amber-500/15 text-amber-400",
  },
  [SponsorshipRequestStatus.SPONSOR_ACCEPTED]: {
    label: "À confirmer",
    color: "bg-sky-500/15 text-sky-400",
  },
  [SponsorshipRequestStatus.CONFIRMED]: {
    label: "Adhésion confirmée",
    color: "bg-emerald-500/15 text-emerald-400",
  },
  [SponsorshipRequestStatus.DECLINED]: {
    label: "Refusée",
    color: "bg-destructive/15 text-destructive",
  },
};

interface Props {
  status: SponsorshipRequestStatus;
}

export function SponsorshipStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;
  return (
    <Badge className={`${config.color} border-none font-normal`}>
      {config.label}
    </Badge>
  );
}

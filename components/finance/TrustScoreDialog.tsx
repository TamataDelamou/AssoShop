"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EngagementBadge } from "./EngagementBadge";
import { computeTrustScore } from "@/lib/trust-score";
import { GroupMember } from "@/types/modules/finance";
import {
  COMMON_LABELS,
  ENGAGEMENT_LEVEL_OPTIONS,
  TRUST_SCORE_LABELS,
} from "@/utils/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: GroupMember | null;
}

export function TrustScoreDialog({ open, onOpenChange, member }: Props) {
  const score = useMemo(
    () => (member ? computeTrustScore(member) : null),
    [member],
  );

  const rows = score
    ? [
        { label: TRUST_SCORE_LABELS.REGULARITY, value: score.regularity },
        { label: TRUST_SCORE_LABELS.REPAYMENTS, value: score.repayments },
        {
          label: TRUST_SCORE_LABELS.PARTICIPATION,
          value: score.participation,
        },
        { label: TRUST_SCORE_LABELS.SENIORITY, value: score.seniority },
      ]
    : [];

  return (
    <Dialog open={open && !!member} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TRUST_SCORE_LABELS.TITLE}</DialogTitle>
        </DialogHeader>
        {member && score ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{member.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{score.total}</span>
                <EngagementBadge engagement={score.level} />
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Légende
              </p>
              <div className="flex flex-wrap gap-2">
                {ENGAGEMENT_LEVEL_OPTIONS.map((o) => (
                  <Badge
                    key={o.value}
                    className={`${o.color} border-none font-normal`}
                  >
                    {o.label}
                  </Badge>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {TRUST_SCORE_LABELS.NOTICE}
            </p>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {COMMON_LABELS.CLOSE}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMeetings } from "@/hooks/community/useMeetings";
import { Meeting, MeetingStatus } from "@/types/modules/community";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { PlanMeetingDialog } from "./PlanMeetingDialog";
import { MeetingDetailsDialog } from "./MeetingDetailsDialog";
import { MinutesDialog } from "./MinutesDialog";
import {
  COMMON_LABELS,
  MEETING_LABELS,
  MEETING_STATUS_OPTIONS,
} from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

export function MeetingsPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<Meeting | null>(null);
  const [minutesTarget, setMinutesTarget] = useState<Meeting | null>(null);

  const { meetings, loading, error, online, refetch } = useMeetings(
    organizationId,
    search,
    statusFilter,
  );

  const summary = useMemo(() => {
    const planned = meetings.filter(
      (m) => m.status === MeetingStatus.PLANNED,
    ).length;
    const completed = meetings.filter(
      (m) => m.status === MeetingStatus.COMPLETED,
    ).length;
    const cancelled = meetings.filter(
      (m) => m.status === MeetingStatus.CANCELLED,
    ).length;
    return { planned, completed, cancelled };
  }, [meetings]);

  const handleDetailsSuccess = (updated?: Meeting) => {
    refetch();
    if (updated) {
      setDetailsTarget(updated);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{MEETING_LABELS.PAGE_TITLE}</h1>
        <Button
          onClick={() => setPlanOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {MEETING_LABELS.PLAN_BUTTON}
        </Button>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{MEETING_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {MEETING_LABELS.SUMMARY_PLANNED}
            </p>
            <p className="text-2xl font-bold">{summary.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {MEETING_LABELS.SUMMARY_COMPLETED}
            </p>
            <p className="text-2xl font-bold">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              {MEETING_LABELS.SUMMARY_CANCELLED}
            </p>
            <p className="text-2xl font-bold">{summary.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={MEETING_LABELS.SEARCH_PLACEHOLDER}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue
              placeholder={MEETING_LABELS.STATUS_FILTER_PLACEHOLDER}
            />
          </SelectTrigger>
          <SelectContent>
            {MEETING_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{MEETING_LABELS.LOAD_ERROR}</p>
      ) : !meetings.length ? (
        <p className="text-sm text-muted-foreground">
          {MEETING_LABELS.NO_DATA}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {MEETING_LABELS.TITLE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {MEETING_LABELS.DATE_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {MEETING_LABELS.LOCATION_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {MEETING_LABELS.STATUS_LABEL}
                </th>
                <th className="px-4 py-3 font-medium">
                  {MEETING_LABELS.ACTIONS_LABEL}
                </th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium">{m.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(m.date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.location}
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailsTarget(m)}
                      >
                        {MEETING_LABELS.DETAILS_BUTTON}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMinutesTarget(m)}
                      >
                        {MEETING_LABELS.MINUTES_BUTTON}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlanMeetingDialog
        key={planOpen ? "open" : "closed"}
        open={planOpen}
        onOpenChange={setPlanOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
      <MeetingDetailsDialog
        key={detailsTarget?.id ?? "none"}
        open={!!detailsTarget}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
        organizationId={organizationId}
        meeting={detailsTarget}
        onSuccess={handleDetailsSuccess}
      />
      <MinutesDialog
        key={minutesTarget?.id ?? "none"}
        open={!!minutesTarget}
        onOpenChange={(open) => {
          if (!open) setMinutesTarget(null);
        }}
        organizationId={organizationId}
        meeting={minutesTarget}
        onSuccess={refetch}
      />
    </div>
  );
}

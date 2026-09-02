"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCheckInAttendee } from "@/hooks/community/useCheckInAttendee";
import {
  AttendanceStatus,
  Meeting,
} from "@/types/modules/community";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import {
  ATTENDANCE_STATUS_OPTIONS,
  COMMON_LABELS,
  MEETING_LABELS,
} from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  meeting: Meeting | null;
  onSuccess?: (updated?: Meeting) => void;
}

export function MeetingDetailsDialog({
  open,
  onOpenChange,
  organizationId,
  meeting,
  onSuccess,
}: Props) {
  const { checkIn, loading, error } = useCheckInAttendee();

  const handleCheckIn = async (
    attendeeId: string,
    status: AttendanceStatus,
  ) => {
    if (!meeting) return;
    try {
      const updated = await checkIn(
        organizationId,
        meeting.id,
        attendeeId,
        status,
      );
      onSuccess?.(updated);
    } catch {
      // L'erreur est déjà exposée par le hook.
    }
  };

  const agendaLines = (meeting?.agenda ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Dialog open={open && !!meeting} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MEETING_LABELS.PAGE_TITLE}</DialogTitle>
        </DialogHeader>
        {meeting ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">
                  {meeting.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(meeting.date)} · {meeting.location}
                </p>
              </div>
              <MeetingStatusBadge status={meeting.status} />
            </div>

            {agendaLines.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {MEETING_LABELS.AGENDA_LABEL}
                </p>
                <ul className="list-disc pl-5 text-sm text-foreground">
                  {agendaLines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {MEETING_LABELS.CHECK_IN_LABEL}
              </p>
              {!meeting.attendees?.length ? (
                <p className="text-sm text-muted-foreground">
                  {MEETING_LABELS.NO_ATTENDEES}
                </p>
              ) : (
                <ul className="space-y-2">
                  {meeting.attendees.map((attendee) => (
                    <li
                      key={attendee.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm text-foreground">
                        {attendee.name}
                      </span>
                      <Select
                        value={attendee.status}
                        onValueChange={(value) =>
                          handleCheckIn(
                            attendee.id,
                            value as AttendanceStatus,
                          )
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
              <p className="text-sm font-medium">
                {MEETING_LABELS.QR_PLACEHOLDER}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {meeting.id}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {MEETING_LABELS.MINUTES_BUTTON}
              </p>
              {meeting.minutes ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {meeting.minutes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {MEETING_LABELS.MINUTES_EMPTY}
                </p>
              )}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

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

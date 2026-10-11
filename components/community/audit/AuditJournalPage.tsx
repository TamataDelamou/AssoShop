"use client";

import { RefreshCw, ScrollText } from "lucide-react";
import { useAuditEvents } from "@/hooks/community/useAuditEvents";
import { describeAuditChanges, isAuditPeriod } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuditEvent, AuditEventType, AuditPeriod } from "@/types/modules/audit";
import {
  AUDIT_CONFIG,
  AUDIT_EVENT_LABELS,
  AUDIT_LABELS,
  AUDIT_ORG_EVENT_TYPES,
  AUDIT_PERIOD_LABELS,
} from "@/utils/constants";
import { formatCurrency, formatDateTime } from "@/utils/formatters";

function actorLabel(event: AuditEvent): string {
  if (!event.actor_id) return AUDIT_LABELS.ACTOR_SYSTEM;
  return event.actor_name || AUDIT_LABELS.ACTOR_UNKNOWN;
}

function ChangeCell({ event }: { event: AuditEvent }) {
  const changes = describeAuditChanges(event);
  if (changes.length === 0) {
    return <span className="text-muted-foreground">{AUDIT_LABELS.NO_VALUE}</span>;
  }
  return (
    <div className="space-y-1">
      {changes.map((change) => (
        <p key={change.field} className="text-sm text-muted-foreground">
          {change.label} :{" "}
          {change.before !== null && (
            <>
              {change.before} {AUDIT_LABELS.CHANGE_ARROW}{" "}
            </>
          )}
          <span className="text-foreground">
            {change.after ?? AUDIT_LABELS.NO_VALUE}
          </span>
        </p>
      ))}
    </div>
  );
}

interface Props {
  organizationId: string;
}

export function AuditJournalPage({ organizationId }: Props) {
  const {
    events,
    eventType,
    period,
    setEventType,
    setPeriod,
    hasMore,
    loading,
    loadingMore,
    error,
    fromCache,
    online,
    loadMore,
    refetch,
  } = useAuditEvents(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {AUDIT_LABELS.PAGE_TITLE}
          </h2>
          <p className="text-sm text-muted-foreground">
            {AUDIT_LABELS.PAGE_SUBTITLE}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={loading || !online}
          className="whitespace-nowrap"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {AUDIT_LABELS.REFRESH}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!online && fromCache && (
        <Alert className="border-border/50">
          <AlertDescription>{AUDIT_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-2">
          <Label className="text-foreground">
            {AUDIT_LABELS.FILTER_EVENT_TYPE}
          </Label>
          <Select
            value={eventType ?? AUDIT_CONFIG.ALL_EVENT_TYPES}
            onValueChange={(value) =>
              setEventType(
                value === AUDIT_CONFIG.ALL_EVENT_TYPES
                  ? null
                  : (value as AuditEventType),
              )
            }
          >
            <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value={AUDIT_CONFIG.ALL_EVENT_TYPES}>
                {AUDIT_LABELS.ALL_EVENT_TYPES}
              </SelectItem>
              {AUDIT_ORG_EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {AUDIT_EVENT_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{AUDIT_LABELS.FILTER_PERIOD}</Label>
          <Select
            value={period}
            onValueChange={(value) => {
              if (isAuditPeriod(value)) setPeriod(value);
            }}
          >
            <SelectTrigger className="bg-input/50 border-border/50 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              {Object.values(AuditPeriod).map((value) => (
                <SelectItem key={value} value={value}>
                  {AUDIT_PERIOD_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {AUDIT_LABELS.LIST_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-muted/30" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <ScrollText className="h-8 w-8" />
              <p>{AUDIT_LABELS.EMPTY}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-muted/10">
                    <TableHead className="text-muted-foreground font-medium">
                      {AUDIT_LABELS.COLUMN_DATE}
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium">
                      {AUDIT_LABELS.COLUMN_EVENT}
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium">
                      {AUDIT_LABELS.COLUMN_ACTOR}
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium">
                      {AUDIT_LABELS.COLUMN_CHANGE}
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right">
                      {AUDIT_LABELS.COLUMN_AMOUNT}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="border-border/50 hover:bg-muted/10"
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary/50 text-primary"
                        >
                          {AUDIT_EVENT_LABELS[event.event_type] ??
                            event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {actorLabel(event)}
                      </TableCell>
                      <TableCell>
                        <ChangeCell event={event} />
                      </TableCell>
                      <TableCell className="text-right text-foreground whitespace-nowrap">
                        {event.amount === null
                          ? AUDIT_LABELS.NO_VALUE
                          : formatCurrency(
                              event.amount,
                              event.currency ?? undefined,
                            )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => loadMore()}
                    disabled={loadingMore || !online}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {loadingMore
                      ? AUDIT_LABELS.LOADING_MORE
                      : AUDIT_LABELS.LOAD_MORE}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

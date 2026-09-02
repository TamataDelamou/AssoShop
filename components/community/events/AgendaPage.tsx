"use client";

import { useState } from "react";
import { CalendarDays, Clock, MapPin, Plus } from "lucide-react";
import { useEvents } from "@/hooks/community/useEvents";
import { CreateEventDialog } from "./CreateEventDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CommunityEvent, EventType } from "@/types/modules/community";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.MEETING]: "Réunion",
  [EventType.GENERAL_ASSEMBLY]: "Assemblée générale",
  [EventType.ACTIVITY]: "Activité",
  [EventType.TRAINING]: "Formation",
  [EventType.OUTING]: "Sortie",
  [EventType.OTHER]: "Autre",
};

interface Props {
  organizationId: string;
}

function EventCard({ event }: { event: CommunityEvent }) {
  const start = event.start_at ? new Date(event.start_at) : null;
  const end = event.end_at ? new Date(event.end_at) : null;

  return (
    <div className="flex gap-4 p-4 border border-border/50 rounded-lg bg-card/30">
      <div className="flex flex-col items-center justify-center min-w-14 h-14 rounded-lg bg-primary/10 text-primary">
        <span className="text-lg font-semibold leading-none">
          {start ? format(start, "dd") : "--"}
        </span>
        <span className="text-xs uppercase">
          {start ? format(start, "MMM", { locale: fr }) : ""}
        </span>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-foreground">{event.title}</p>
          <Badge variant="outline" className="border-border/50 text-muted-foreground whitespace-nowrap">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {start && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(start, "HH:mm", { locale: fr })}
              {end ? ` - ${format(end, "HH:mm", { locale: fr })}` : ""}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyLabel,
}: {
  title: string;
  events: CommunityEvent[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">{emptyLabel}</p>
      ) : (
        events.map((event) => <EventCard key={event.id} event={event} />)
      )}
    </div>
  );
}

export function AgendaPage({ organizationId }: Props) {
  const { events, loading, error, creating, createEvent } =
    useEvents(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const now = new Date();
  const upcoming = events.filter((e) => e.start_at && e.start_at >= now);
  const past = events.filter((e) => e.start_at && e.start_at < now);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Réunions et activités de l&apos;association.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          Créer un événement
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Calendrier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full bg-muted/30" />
              ))}
            </div>
          ) : (
            <>
              <EventSection
                title="À venir"
                events={upcoming}
                emptyLabel="Aucun événement à venir."
              />
              <EventSection
                title="Passés"
                events={past}
                emptyLabel="Aucun événement passé."
              />
            </>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creating={creating}
        onCreate={createEvent}
      />
    </div>
  );
}

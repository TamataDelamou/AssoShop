"use client";

import { useMemo } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Share2 } from "lucide-react";
import { useAnnouncements } from "@/hooks/community/useAnnouncements";
import { AnnouncementAudienceBadge } from "../announcements/AnnouncementAudienceBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Announcement, AnnouncementAudience } from "@/types/modules/community";
import { formatDate } from "@/utils/formatters";
import { ANNOUNCEMENT_LABELS } from "@/utils/constants";

interface Props {
  organizationId: string;
}

export function CrossedFeedPage({ organizationId }: Props) {
  const { announcements, loading, error } = useAnnouncements(organizationId);

  const { outgoing, incoming } = useMemo(() => {
    const outgoing = announcements.filter(
      (a) => a.audience === AnnouncementAudience.AFFILIATES,
    );
    const incoming = announcements.filter((a) => a.relayed_from !== null);
    return { outgoing, incoming };
  }, [announcements]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80 bg-muted/30" />
        <Skeleton className="h-24 w-full bg-muted/30" />
        <Skeleton className="h-64 w-full bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-foreground">
          Fil d&apos;annonces croisé
        </h2>
        <p className="text-sm text-muted-foreground">
          Annonces relayées entre associations affiliées, dans les deux sens.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUpFromLine className="h-4 w-4" />
              Relais sortants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-violet-500">
              {outgoing.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDownToLine className="h-4 w-4" />
              Relais entrants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-sky-500">
              {incoming.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <FeedSection
        title="Relais sortants"
        hint="Annonces publiées par cette association à destination des affiliées."
        announcements={outgoing}
        empty="Aucune annonce relayée vers les affiliées."
      />
      <FeedSection
        title="Relais entrants"
        hint="Annonces reçues des associations affiliées."
        announcements={incoming}
        empty="Aucune annonce reçue des affiliées."
      />
    </div>
  );
}

function FeedSection({
  title,
  hint,
  announcements,
  empty,
}: {
  title: string;
  hint: string;
  announcements: Announcement[];
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-medium text-foreground">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <article
              key={a.id}
              className="rounded-lg border border-border/50 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">{a.title}</h4>
                    {a.pinned ? (
                      <Badge className="bg-amber-500/20 text-amber-500 border-none font-normal">
                        {ANNOUNCEMENT_LABELS.PINNED_INDICATOR}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.author_name} · {formatDate(a.created_at)}
                  </p>
                </div>
                <AnnouncementAudienceBadge audience={a.audience} />
              </div>

              {a.relayed_from ? (
                <Badge
                  variant="outline"
                  className="border-border/50 text-muted-foreground font-normal"
                >
                  {ANNOUNCEMENT_LABELS.RELAYED_FROM_PREFIX} · {a.relayed_from}
                </Badge>
              ) : null}

              <p className="whitespace-pre-wrap text-sm text-foreground">
                {a.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

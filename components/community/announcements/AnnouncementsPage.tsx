"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements } from "@/hooks/community/useAnnouncements";
import { AnnouncementAudienceBadge } from "./AnnouncementAudienceBadge";
import { PublishAnnouncementDialog } from "./PublishAnnouncementDialog";
import {
  ANNOUNCEMENT_LABELS,
  COMMON_LABELS,
} from "@/utils/constants";
import { formatDate } from "@/utils/formatters";

interface Props {
  organizationId: string;
}

export function AnnouncementsPage({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);

  const { announcements, loading, error, online, refetch } = useAnnouncements(
    organizationId,
    search,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {ANNOUNCEMENT_LABELS.PAGE_TITLE}
        </h1>
        <Button
          onClick={() => setPublishOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {ANNOUNCEMENT_LABELS.PUBLISH_BUTTON}
        </Button>
      </div>

      {!online ? (
        <Alert>
          <AlertDescription>{ANNOUNCEMENT_LABELS.OFFLINE_NOTICE}</AlertDescription>
        </Alert>
      ) : null}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={ANNOUNCEMENT_LABELS.SEARCH_PLACEHOLDER}
        className="sm:max-w-xs"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {COMMON_LABELS.LOADING}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {ANNOUNCEMENT_LABELS.LOAD_ERROR}
        </p>
      ) : !announcements.length ? (
        <p className="text-sm text-muted-foreground">
          {ANNOUNCEMENT_LABELS.NO_DATA}
        </p>
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
                    <h3 className="font-medium text-foreground">{a.title}</h3>
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

      <PublishAnnouncementDialog
        key={publishOpen ? "open" : "closed"}
        open={publishOpen}
        onOpenChange={setPublishOpen}
        organizationId={organizationId}
        onSuccess={refetch}
      />
    </div>
  );
}

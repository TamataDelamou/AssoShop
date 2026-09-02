"use client";

import { useParams } from "next/navigation";
import { AgendaPage } from "@/components/community/events/AgendaPage";

export default function OrganizationAgendaPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <AgendaPage organizationId={orgId} />;
}

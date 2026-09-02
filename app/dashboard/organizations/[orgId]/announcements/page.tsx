"use client";

import { useParams } from "next/navigation";
import { AnnouncementsPage } from "@/components/community/announcements/AnnouncementsPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationAnnouncementsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <AnnouncementsPage organizationId={orgId} />;
}

"use client";

import { useParams } from "next/navigation";
import { MeetingsPage } from "@/components/community/meetings/MeetingsPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationMeetingsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <MeetingsPage organizationId={orgId} />;
}

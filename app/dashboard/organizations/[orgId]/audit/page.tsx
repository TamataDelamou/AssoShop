"use client";

import { useParams } from "next/navigation";
import { AuditJournalPage } from "@/components/community/audit/AuditJournalPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationAuditPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <AuditJournalPage organizationId={orgId} />;
}

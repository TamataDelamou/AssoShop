"use client";

import { useParams } from "next/navigation";
import { DocumentsPage } from "@/components/community/documents/DocumentsPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationDocumentsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <DocumentsPage organizationId={orgId} />;
}

"use client";

import { useParams } from "next/navigation";
import { SocialCasesPage } from "@/components/community/social-cases/SocialCasesPage";
import { ORGANIZATION_LABELS } from "@/utils/constants";

export default function OrganizationSocialCasesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>{ORGANIZATION_LABELS.MISSING_ORG_ID}</div>;
  }

  return <SocialCasesPage organizationId={orgId} />;
}

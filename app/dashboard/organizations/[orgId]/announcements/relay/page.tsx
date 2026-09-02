"use client";

import { useParams } from "next/navigation";
import { CrossedFeedPage } from "@/components/community/announcements/CrossedFeedPage";

export default function OrganizationCrossedFeedPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <CrossedFeedPage organizationId={orgId} />;
}

"use client";

import { useParams } from "next/navigation";
import { AssetsPage } from "@/components/community/assets/AssetsPage";

export default function OrganizationAssetsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <AssetsPage organizationId={orgId} />;
}

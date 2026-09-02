"use client";

import { useParams } from "next/navigation";
import { SettingsPage } from "@/components/community/settings/SettingsPage";

export default function OrganizationSettingsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  if (!orgId) {
    return <div>ID d&apos;organisation manquant</div>;
  }

  return <SettingsPage organizationId={orgId} />;
}

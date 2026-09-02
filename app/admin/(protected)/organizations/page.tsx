"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AssociationsView } from "@/components/admin/organizations/AssociationsView";
import { GroupsView } from "@/components/admin/organizations/GroupsView";
import { HierarchyView } from "@/components/admin/organizations/HierarchyView";
import { SolidarityFundView } from "@/components/admin/organizations/SolidarityFundView";
import { InsuranceView } from "@/components/admin/organizations/InsuranceView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "associations", label: ADMIN_LABELS.TAB_ASSOCIATIONS },
  { id: "groups", label: ADMIN_LABELS.TAB_GROUPS },
  { id: "hierarchy", label: ADMIN_LABELS.TAB_HIERARCHY },
  { id: "fund", label: ADMIN_LABELS.TAB_FUND },
  { id: "insurance", label: ADMIN_LABELS.TAB_INSURANCE },
];

export default function AdminOrganizationsPage() {
  const { bundle, loading, error, fromCache, online } = useAdmin();
  const [activeTab, setActiveTab] = useState("associations");

  if (loading && !bundle) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error && !bundle) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!bundle) return null;

  return (
    <AdminShell
      subtitle={ADMIN_LABELS.NAV_ORGANIZATIONS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "associations" && (
        <AssociationsView associations={bundle.associations} />
      )}
      {activeTab === "groups" && <GroupsView groups={bundle.groups} />}
      {activeTab === "hierarchy" && (
        <HierarchyView nodes={bundle.hierarchy} />
      )}
      {activeTab === "fund" && <SolidarityFundView fund={bundle.solidarity} />}
      {activeTab === "insurance" && (
        <InsuranceView partnerships={bundle.insurance} />
      )}
    </AdminShell>
  );
}

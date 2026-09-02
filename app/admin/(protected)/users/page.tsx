"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { UsersView } from "@/components/admin/users/UsersView";
import { KycQueueView } from "@/components/admin/users/KycQueueView";
import { RolesView } from "@/components/admin/users/RolesView";
import { DisputesView } from "@/components/admin/users/DisputesView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "users", label: ADMIN_LABELS.TAB_USERS },
  { id: "kyc", label: ADMIN_LABELS.TAB_KYC },
  { id: "roles", label: ADMIN_LABELS.TAB_ROLES },
  { id: "disputes", label: ADMIN_LABELS.TAB_DISPUTES },
];

export default function AdminUsersPage() {
  const { bundle, loading, error, fromCache, online, refetch } = useAdmin();
  const [activeTab, setActiveTab] = useState("users");

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
      subtitle={ADMIN_LABELS.NAV_USERS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "users" && (
        <UsersView
          users={bundle.users}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "kyc" && (
        <KycQueueView
          kyc={bundle.kyc}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "roles" && <RolesView roles={bundle.roles} />}
      {activeTab === "disputes" && (
        <DisputesView
          disputes={bundle.disputes}
          online={online}
          onChanged={refetch}
        />
      )}
    </AdminShell>
  );
}

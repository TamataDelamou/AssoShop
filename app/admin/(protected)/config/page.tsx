"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { PlatformConfigView } from "@/components/admin/config/PlatformConfigView";
import { CountriesView } from "@/components/admin/config/CountriesView";
import { OperatorsView } from "@/components/admin/config/OperatorsView";
import { ApiView } from "@/components/admin/config/ApiView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "platform", label: ADMIN_LABELS.TAB_PLATFORM },
  { id: "countries", label: ADMIN_LABELS.TAB_COUNTRIES },
  { id: "operators", label: ADMIN_LABELS.TAB_OPERATORS },
  { id: "api", label: ADMIN_LABELS.TAB_API },
];

export default function AdminConfigPage() {
  const { bundle, loading, error, fromCache, online, refetch } = useAdmin();
  const [activeTab, setActiveTab] = useState("platform");

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
      subtitle={ADMIN_LABELS.NAV_CONFIG}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "platform" && (
        <PlatformConfigView
          config={bundle.config}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "countries" && (
        <CountriesView
          countries={bundle.countries}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "operators" && (
        <OperatorsView
          operators={bundle.operators}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "api" && (
        <ApiView
          integrations={bundle.integrations}
          online={online}
          onChanged={refetch}
        />
      )}
    </AdminShell>
  );
}

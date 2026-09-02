"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResellersView } from "@/components/admin/market/ResellersView";
import { CatalogView } from "@/components/admin/market/CatalogView";
import { ModerationView } from "@/components/admin/market/ModerationView";
import { InvestmentsView } from "@/components/admin/market/InvestmentsView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "resellers", label: ADMIN_LABELS.TAB_RESELLERS },
  { id: "catalog", label: ADMIN_LABELS.TAB_CATALOG },
  { id: "moderation", label: ADMIN_LABELS.TAB_MODERATION },
  { id: "investments", label: ADMIN_LABELS.TAB_INVESTMENTS },
];

export default function AdminMarketPage() {
  const { bundle, loading, error, fromCache, online, refetch } = useAdmin();
  const [activeTab, setActiveTab] = useState("resellers");

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
      subtitle={ADMIN_LABELS.NAV_MARKET}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "resellers" && (
        <ResellersView
          resellers={bundle.resellers}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "catalog" && (
        <CatalogView
          categories={bundle.categories}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "moderation" && (
        <ModerationView
          items={bundle.moderation}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "investments" && (
        <InvestmentsView projects={bundle.investments} />
      )}
    </AdminShell>
  );
}

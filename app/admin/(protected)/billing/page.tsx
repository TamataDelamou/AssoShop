"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CommissionsView } from "@/components/admin/billing/CommissionsView";
import { SubscriptionsView } from "@/components/admin/billing/SubscriptionsView";
import { InvoicesView } from "@/components/admin/billing/InvoicesView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "commissions", label: ADMIN_LABELS.TAB_COMMISSIONS },
  { id: "plans", label: ADMIN_LABELS.TAB_PLANS },
  { id: "invoices", label: ADMIN_LABELS.TAB_INVOICES },
];

export default function AdminBillingPage() {
  const { bundle, loading, error, fromCache, online, refetch } = useAdmin();
  const [activeTab, setActiveTab] = useState("commissions");

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
      subtitle={ADMIN_LABELS.NAV_BILLING}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "commissions" && (
        <CommissionsView
          commissions={bundle.commissions}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "plans" && (
        <SubscriptionsView
          plans={bundle.plans}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "invoices" && (
        <InvoicesView invoices={bundle.invoices} />
      )}
    </AdminShell>
  );
}

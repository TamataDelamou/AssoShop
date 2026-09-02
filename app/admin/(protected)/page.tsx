"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/admin/useAdmin";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboardView } from "@/components/admin/pilotage/AdminDashboardView";
import { ReportsView } from "@/components/admin/pilotage/ReportsView";
import { NationalDashboardView } from "@/components/admin/pilotage/NationalDashboardView";
import { AuditLogsView } from "@/components/admin/pilotage/AuditLogsView";
import { SecurityAuditView } from "@/components/admin/pilotage/SecurityAuditView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ADMIN_LABELS } from "@/utils/constants";

const TABS = [
  { id: "overview", label: ADMIN_LABELS.TAB_OVERVIEW },
  { id: "reports", label: ADMIN_LABELS.TAB_REPORTS },
  { id: "national", label: ADMIN_LABELS.TAB_NATIONAL },
  { id: "logs", label: ADMIN_LABELS.TAB_AUDIT_LOGS },
  { id: "security", label: ADMIN_LABELS.TAB_SECURITY },
];

export default function AdminPage() {
  const { bundle, loading, error, fromCache, online } = useAdmin();
  const [activeTab, setActiveTab] = useState("overview");

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
      subtitle={ADMIN_LABELS.PAGE_SUBTITLE}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      fromCache={fromCache}
      online={online}
    >
      {activeTab === "overview" && (
        <AdminDashboardView dashboard={bundle.dashboard} />
      )}
      {activeTab === "reports" && <ReportsView reports={bundle.reports} />}
      {activeTab === "national" && (
        <NationalDashboardView national={bundle.national} />
      )}
      {activeTab === "logs" && <AuditLogsView logs={bundle.audit_logs} />}
      {activeTab === "security" && (
        <SecurityAuditView entries={bundle.security_audit} />
      )}
    </AdminShell>
  );
}

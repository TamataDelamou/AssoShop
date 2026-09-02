"use client";

import { useState } from "react";
import { useHub } from "@/hooks/hub/useHub";
import { HubHomeView } from "./dashboard/HubHomeView";
import { ProfileView } from "./profile/ProfileView";
import { DigitalCardView } from "./profile/DigitalCardView";
import { VaultView } from "./profile/VaultView";
import { KycView } from "./profile/KycView";
import { MessagingView } from "./messaging/MessagingView";
import { NotificationsView } from "./notifications/NotificationsView";
import { AssistantView } from "./assistant/AssistantView";
import { SettingsView } from "./settings/SettingsView";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { HUB_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Database, WifiOff } from "lucide-react";

const TABS = [
  { id: "home", label: HUB_LABELS.TAB_HOME },
  { id: "profile", label: HUB_LABELS.TAB_PROFILE },
  { id: "vault", label: HUB_LABELS.TAB_VAULT },
  { id: "messaging", label: HUB_LABELS.TAB_MESSAGING },
  { id: "notifications", label: HUB_LABELS.TAB_NOTIFICATIONS },
  { id: "assistant", label: HUB_LABELS.TAB_ASSISTANT },
  { id: "settings", label: HUB_LABELS.TAB_SETTINGS },
];

export function HubPage() {
  const { bundle, loading, error, fromCache, online, refetch } = useHub();
  const [activeTab, setActiveTab] = useState("home");

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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {HUB_LABELS.PAGE_TITLE}
          </h2>
          <p className="text-sm text-muted-foreground">
            {HUB_LABELS.PAGE_SUBTITLE}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <WifiOff className="mr-1 h-3 w-3" />
              {HUB_LABELS.OFFLINE_BADGE}
            </Badge>
          )}
          {fromCache && (
            <Badge variant="outline" className="border-white/10 bg-white/5">
              <Database className="mr-1 h-3 w-3" />
              {HUB_LABELS.CACHED_BADGE}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "home" && (
        <HubHomeView
          bundle={bundle}
          online={online}
          onChanged={refetch}
          onNavigate={setActiveTab}
        />
      )}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileView
            bundle={bundle}
            online={online}
            onChanged={refetch}
          />
          <DigitalCardView profile={bundle.profile} />
          <KycView
            status={bundle.profile.kyc_status}
            requests={bundle.kyc}
            online={online}
            onChanged={refetch}
          />
        </div>
      )}
      {activeTab === "vault" && (
        <VaultView
          vault={bundle.vault}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "messaging" && (
        <MessagingView
          conversations={bundle.conversations}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "notifications" && (
        <NotificationsView
          notifications={bundle.notifications}
          preferences={bundle.preferences}
          online={online}
          onChanged={refetch}
        />
      )}
      {activeTab === "assistant" && <AssistantView />}
      {activeTab === "settings" && <SettingsView />}
    </div>
  );
}

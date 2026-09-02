"use client";

import { Badge } from "@/components/ui/badge";
import { ADMIN_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { Database, WifiOff } from "lucide-react";

export interface AdminTab {
  id: string;
  label: string;
}

export function AdminShell({
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  fromCache,
  online,
  children,
}: {
  subtitle: string;
  tabs: AdminTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  fromCache: boolean;
  online: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {ADMIN_LABELS.PAGE_TITLE}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-400"
            >
              <WifiOff className="mr-1 h-3 w-3" />
              Hors-ligne
            </Badge>
          )}
          {fromCache && (
            <Badge variant="outline" className="border-white/10 bg-white/5">
              <Database className="mr-1 h-3 w-3" />
              {ADMIN_LABELS.CACHED_BADGE}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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

      {children}
    </div>
  );
}

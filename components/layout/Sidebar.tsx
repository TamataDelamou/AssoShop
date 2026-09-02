"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ShoppingBag,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useAuthContext } from "@/lib/contexts/AuthContext";
import { ORGANIZATION_LABELS, COMMON_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/dashboard/organizations", icon: Users, label: "Associations" },
  { href: "/dashboard/market", icon: ShoppingBag, label: "Marketplace" },
  { href: "/dashboard/pay", icon: Wallet, label: "AssoShop Pay" },
  { href: "/dashboard/hub", icon: LayoutDashboard, label: "Hub Communautaire" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthContext();

  // Détecter si on est dans une page d'organisation (avec un ID)
  const orgMatch = pathname.match(/\/dashboard\/organizations\/([^\/]+)/);
  const isOrgDetail = !!orgMatch;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md p-4 h-screen sticky top-0">
      <div className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        AssoShop
      </div>

      <nav className="flex-1 space-y-1">
        {/* Si on est dans une organisation, afficher le lien de retour */}
        {isOrgDetail && (
          <>
            <Link
              href="/dashboard/organizations"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              {ORGANIZATION_LABELS.BACK_TO_ORGANIZATIONS}
            </Link>
            <div className="h-px bg-border/50 my-2" />
          </>
        )}

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 pt-4 mt-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
        >
          <LogOut className="h-5 w-5" />
          {COMMON_LABELS.SIGN_OUT}
        </button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ShoppingBag,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthContext } from "@/lib/contexts/AuthContext";
import { ADMIN_LABELS } from "@/utils/constants";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: ADMIN_LABELS.NAV_PILOTAGE,
  },
  {
    href: "/admin/users",
    icon: Users,
    label: ADMIN_LABELS.NAV_USERS,
  },
  {
    href: "/admin/organizations",
    icon: Building2,
    label: ADMIN_LABELS.NAV_ORGANIZATIONS,
  },
  {
    href: "/admin/market",
    icon: ShoppingBag,
    label: ADMIN_LABELS.NAV_MARKET,
  },
  {
    href: "/admin/billing",
    icon: CreditCard,
    label: ADMIN_LABELS.NAV_BILLING,
  },
  {
    href: "/admin/config",
    icon: Settings,
    label: ADMIN_LABELS.NAV_CONFIG,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthContext();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-md p-4 h-screen sticky top-0">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-secondary" />
        <div>
          <div className="text-lg font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            AssoShop
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Back-office GSG
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
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
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

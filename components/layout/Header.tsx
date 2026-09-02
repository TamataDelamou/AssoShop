"use client";

import { useAuthContext } from "@/lib/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuthContext();
  const initial = user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-10 bg-black/40 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <h1 className="text-xl font-light text-foreground">Administration</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user?.email}
        </span>
        <Avatar className="h-8 w-8 bg-primary/20 text-primary">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

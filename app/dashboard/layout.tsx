import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { redirect } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification de session côté serveur (Next.js App Router)
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    redirect("/auth/login");
  }

  return (
    <AuthProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}

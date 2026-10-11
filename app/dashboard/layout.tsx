import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OfflineAndSync } from "@/components/hub/offline/OfflineAndSync";
import { PayTestModeBanner } from "@/components/pay/PayTestModeBanner";
import { isRealMoneyEnabled } from "@/lib/api/pay-real-money";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode démo : le cookie posé par /api/demo-login court-circuite la
  // vérification Supabase pour permettre de parcourir les écrans sans backend.
  const demoMode = (await cookies()).get("demo_session")?.value === "1";

  // Vérification de session côté serveur (client serveur Supabase)
  let user = null;
  if (!demoMode) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser;
  }
  if (!user && !demoMode) {
    redirect("/auth/login");
  }

  // Interrupteur serveur lu à chaque requête (la mise en page est dynamique :
  // elle lit les cookies).
  const payTestMode = !isRealMoneyEnabled();

  return (
    <AuthProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {payTestMode && <PayTestModeBanner />}
          <OfflineAndSync />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}

import { createBrowserClient } from "@supabase/ssr";
import { ENV_CONFIG } from "@/lib/env.config";

export const supabaseClient = createBrowserClient(
  ENV_CONFIG.SUPABASE_URL,
  ENV_CONFIG.SUPABASE_ANON_KEY,
);

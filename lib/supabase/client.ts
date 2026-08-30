import { createClient } from "@supabase/supabase-js";
import { ENV_CONFIG } from "@/lib/env.config";

export const supabaseClient = createClient(
  ENV_CONFIG.SUPABASE_URL,
  ENV_CONFIG.SUPABASE_ANON_KEY,
);

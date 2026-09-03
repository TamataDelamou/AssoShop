export const ENV_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  KERNEL_API_URL:
    process.env.NEXT_PUBLIC_KERNEL_API_URL || "https://mock.kernel.gsg",
  KERNEL_API_KEY: process.env.NEXT_PUBLIC_KERNEL_API_KEY || "mock-key",
  BASE44_API_URL:
    process.env.NEXT_PUBLIC_BASE44_API_URL || "http://localhost:3000/api",
} as const;

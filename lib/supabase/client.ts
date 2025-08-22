import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[CityPulse] Critical: Supabase environment variables are not configured")
    console.error("[CityPulse] Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")

    // In development, show a clear error message
    if (process.env.NODE_ENV === "development") {
      throw new Error("Supabase configuration missing. Please check your environment variables.")
    }

    // In production, use safe fallbacks but log the error
    console.warn("[CityPulse] Using placeholder Supabase configuration - app functionality will be limited")
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key")
  }

  // Validate URL format
  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
    console.error("[CityPulse] Invalid Supabase URL format:", supabaseUrl)
    throw new Error("Invalid Supabase URL format")
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

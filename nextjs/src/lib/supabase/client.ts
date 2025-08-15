import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in client components
 * This is a singleton that persists across the entire app
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

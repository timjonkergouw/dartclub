import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client with safe fallbacks
// During build/SSR, if env vars are missing, create a placeholder that won't crash
const createSupabaseClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Create placeholder client for build/SSR when env vars are missing
    return createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  // Create real client with proper configuration
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Initialize client at module level (safe because of fallbacks)
// This is necessary for proper TypeScript typing
export const supabase: SupabaseClient = createSupabaseClient();

// Log warning if env vars are missing (only on client side to avoid build errors)
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Supabase environment variables are not set. Database operations will fail.');
}

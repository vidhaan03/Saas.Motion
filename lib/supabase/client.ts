// Supabase client for use in Client Components / browser code.
// Reads cookies via Next.js default browser behaviour (no extra config needed).

import { createBrowserClient } from "@supabase/ssr";

export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

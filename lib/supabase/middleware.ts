// Session refresh runs on every request via Next.js middleware. Without this,
// Supabase's auth tokens would silently expire mid-session.
//
// If Supabase env vars aren't set yet (e.g. dev hasn't restarted after
// pasting them, or auth simply isn't configured for this deployment), we
// pass the request through untouched instead of throwing. The rest of the
// app degrades gracefully — UserMenu shows "Sign in", clicking it lands on
// /login which renders a "setup required" notice.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const updateSession = async (request: NextRequest) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured — skip session refresh, just continue.
  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: don't run code between createServerClient() and getUser() —
  // it'll break the session refresh flow.
  await supabase.auth.getUser();

  return supabaseResponse;
};

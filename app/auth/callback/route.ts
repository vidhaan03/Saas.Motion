// Both Google OAuth and magic-link redirects land here with a `code` param.
// We exchange it for a session, set the cookie, and bounce the user back to
// wherever they were trying to go (or home).

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed — send them to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

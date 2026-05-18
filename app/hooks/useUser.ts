"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

// Reactive auth state for client components.
// Returns `undefined` while loading, `null` if signed out, `User` if signed in.
// When Supabase isn't configured (env vars missing), returns `null` immediately
// so the rest of the app treats the user as signed-out instead of crashing.

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const useUser = () => {
  const [user, setUser] = useState<User | null | undefined>(
    SUPABASE_CONFIGURED ? undefined : null,
  );

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return user;
};

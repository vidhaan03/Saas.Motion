"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { AtmosphericBackdrop } from "../components/AtmosphericBackdrop";
import { MotionLogotype } from "../components/MotionLogotype";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const LoginInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState<"google" | "magic" | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_callback_failed"
      ? "Couldn't complete sign-in. Try again."
      : null,
  );

  // Defer client creation until Supabase is configured so a missing env var
  // doesn't crash this page entirely.
  const supabase = SUPABASE_CONFIGURED
    ? createSupabaseBrowserClient()
    : null;

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setSubmitting("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setSubmitting(null);
    }
    // success: Supabase redirects to Google; nothing more to do client-side.
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setSubmitting("magic");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setMagicSent(true);
    }
    setSubmitting(null);
  };

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ color: "var(--ink)" }}
    >
      <AtmosphericBackdrop />

      {/* Back-to-home link */}
      <button
        onClick={() => router.push("/")}
        className="absolute left-6 top-6 rounded-full border px-3 py-1.5 text-xs transition hover:opacity-80"
        style={{
          borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
          background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
          color: "var(--ink-muted)",
        }}
      >
        ← Back
      </button>

      <div
        className="w-full max-w-[420px] rounded-2xl border p-7 backdrop-blur-2xl"
        style={{
          background: "color-mix(in srgb, var(--bg-elev) 82%, transparent)",
          borderColor: "color-mix(in srgb, var(--ink) 10%, transparent)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <MotionLogotype size={22} />
          <h1
            className="text-center"
            style={{
              fontFamily: "var(--font-serif), serif",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 28,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Sign in to generate
          </h1>
          <p
            className="text-center text-sm"
            style={{ color: "var(--ink-muted)", maxWidth: 320 }}
          >
            Browsing and editing is open. Sign in to generate storyboards and
            save them across devices.
          </p>
        </div>

        {!SUPABASE_CONFIGURED ? (
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              borderColor:
                "color-mix(in srgb, var(--ink) 14%, transparent)",
              background:
                "color-mix(in srgb, var(--accent) 10%, transparent)",
              color: "var(--ink)",
            }}
          >
            <div className="font-semibold">Sign-in not configured yet</div>
            <div
              className="mt-1 text-xs leading-relaxed"
              style={{ color: "var(--ink-muted)" }}
            >
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>,
              then restart the dev server. The signed-out experience keeps
              working without these.
            </div>
          </div>
        ) : magicSent ? (
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
              background:
                "color-mix(in srgb, var(--accent) 10%, transparent)",
              color: "var(--ink)",
            }}
          >
            <div className="font-semibold">Check your email</div>
            <div
              className="mt-1 text-xs"
              style={{ color: "var(--ink-muted)" }}
            >
              We sent a sign-in link to <strong>{email}</strong>. Open it on
              this device to finish.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Google — primary */}
            <button
              onClick={signInWithGoogle}
              disabled={submitting !== null}
              className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--ink)", color: "var(--bg)" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              {submitting === "google" ? "Opening Google…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div
              className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              <span
                className="h-px flex-1"
                style={{ background: "var(--rule)" }}
              />
              <span>or</span>
              <span
                className="h-px flex-1"
                style={{ background: "var(--rule)" }}
              />
            </div>

            {/* Magic link */}
            <form onSubmit={signInWithEmail} className="space-y-2">
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting !== null}
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 14%, transparent)",
                  background:
                    "color-mix(in srgb, var(--bg-elev) 60%, transparent)",
                  color: "var(--ink)",
                }}
              />
              <button
                type="submit"
                disabled={submitting !== null || !email.trim()}
                className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 14%, transparent)",
                  background:
                    "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                  color: "var(--ink)",
                }}
              >
                {submitting === "magic"
                  ? "Sending link…"
                  : "Send sign-in link"}
              </button>
            </form>

            {error ? (
              <div
                className="rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: "rgba(220, 80, 60, 0.3)",
                  background: "rgba(220, 80, 60, 0.08)",
                  color: "#a83a2c",
                }}
              >
                {error}
              </div>
            ) : null}
          </div>
        )}

        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: "var(--ink-faint)" }}
        >
          No password to remember · No marketing emails
        </p>
      </div>
    </main>
  );
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "../hooks/useUser";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

// Supabase env presence — read once at module load.
const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Pill-nav menu element. Shows "Sign in" when signed out (or always if
// Supabase isn't configured yet — the click then opens /login which itself
// shows a setup-required state). Avatar + popover when signed in.

export const UserMenu = ({ nextPath = "/" }: { nextPath?: string }) => {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  // Track mount so we can safely use document via portal.
  useEffect(() => setMounted(true), []);

  // Position the portal menu relative to the avatar each time it opens.
  useEffect(() => {
    if (!open || !avatarRef.current) return;
    const rect = avatarRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  // Close on Escape only. Outside-click is handled by an invisible backdrop
  // rendered alongside the dropdown so nothing can race with the menu's own
  // click handlers (which was the bug — document-level mousedown listeners
  // were eating clicks before React could process them).
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  // Render the Sign-in CTA regardless of loading state when Supabase isn't
  // configured — that way the button is *always* visible while you wire env.
  // When Supabase IS configured, brief skeleton until the first getUser()
  // resolves so we don't flash "Sign in" then swap to avatar.
  const showSignInButton =
    !SUPABASE_CONFIGURED || user === null;

  if (user === undefined && SUPABASE_CONFIGURED) {
    return (
      <div
        className="h-8 w-[88px] rounded-full"
        style={{
          background: "color-mix(in srgb, var(--ink) 6%, transparent)",
        }}
      />
    );
  }

  if (showSignInButton) {
    return (
      <button
        onClick={() =>
          router.push(`/login?next=${encodeURIComponent(nextPath)}`)
        }
        className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition hover:opacity-90"
        style={{
          borderColor: "color-mix(in srgb, var(--ink) 18%, transparent)",
          background:
            "color-mix(in srgb, var(--bg-elev) 75%, transparent)",
          color: "var(--ink)",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Sign in
      </button>
    );
  }

  // user is defined and not null below
  if (!user) return null;

  // Signed-in: avatar + popover
  const email = user.email ?? "";
  const initial = (email[0] || "?").toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? email;

  const signOut = async () => {
    console.log("[auth] signOut starting");
    setOpen(false);
    try {
      const supabase = createSupabaseBrowserClient();
      // Race signOut against a 5s timeout — if Supabase's network call hangs,
      // we still navigate. Local cookies will already be cleared by the SDK.
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: "signOut timeout (5s)" } }),
            5000,
          ),
        ),
      ]);
      if (result.error) {
        console.warn("[auth] signOut error:", result.error.message);
      } else {
        console.log("[auth] signOut succeeded");
      }
    } catch (e) {
      console.error("[auth] signOut threw:", e);
    }
    // Force a real reload regardless of success — clears cached client state
    // and re-runs middleware against a cookie-less request.
    window.location.replace("/");
  };

  // The dropdown is portaled to document.body so it escapes any parent
  // stacking context (the pill nav uses backdrop-filter, which creates one
  // and was masking the menu's clicks behind invisible siblings).
  const dropdown =
    open && mounted && menuPos
      ? createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 999998,
                background: "transparent",
              }}
            />
            <div
              style={{
                position: "fixed",
                top: menuPos.top,
                right: menuPos.right,
                zIndex: 999999,
                width: 224,
                borderRadius: 12,
                overflow: "hidden",
                background:
                  "color-mix(in srgb, var(--bg-elev) 96%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--ink) 12%, transparent)",
                boxShadow: "var(--shadow)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom:
                    "1px solid color-mix(in srgb, var(--ink) 8%, transparent)",
                }}
              >
                <div
                  style={{
                    color: "var(--ink)",
                    fontSize: 14,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    color: "var(--ink-faint)",
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email}
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => {
                  console.log("[UserMenu] Profile clicked");
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  fontSize: 14,
                  color: "var(--ink)",
                  textAlign: "left",
                  textDecoration: "none",
                }}
              >
                Profile
              </Link>
              {/* Theme toggle row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 12px",
                  borderTop:
                    "1px solid color-mix(in srgb, var(--ink) 6%, transparent)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  Theme
                </span>
                <ThemeToggle compact />
              </div>
              <button
                type="button"
                onClick={() => {
                  console.log("[UserMenu] Sign out clicked");
                  signOut();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  borderTop:
                    "1px solid color-mix(in srgb, var(--ink) 6%, transparent)",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        ref={avatarRef}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border transition hover:opacity-90"
        style={{
          borderColor: "color-mix(in srgb, var(--ink) 14%, transparent)",
          background: avatarUrl
            ? "transparent"
            : "color-mix(in srgb, var(--ink) 10%, transparent)",
          color: "var(--ink)",
        }}
        title={email}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-xs font-medium">{initial}</span>
        )}
      </button>
      {dropdown}
    </div>
  );
};

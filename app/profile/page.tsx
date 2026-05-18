"use client";

// DESIGN MOCKUP — uses placeholder data so we can review the layout before
// wiring real DB-backed storyboards + settings. Replace with server-side
// data fetch once we agree on the design.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { presets } from "../../lib/sampleStoryboards";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { AtmosphericBackdrop } from "../components/AtmosphericBackdrop";
import { MotionLogotype } from "../components/MotionLogotype";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Single shared sign-out function — fires regardless of stale state.
// Closes any local UI, calls Supabase, then forces a hard navigation
// so middleware + UI re-render against a clean cookie-less request.
const performSignOut = async () => {
  console.log("[auth] signOut starting");
  if (SUPABASE_CONFIGURED) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: "signOut timeout (5s)" } }),
            5000,
          ),
        ),
      ]);
      if (error) {
        console.warn("[auth] signOut error:", error.message);
      } else {
        console.log("[auth] signOut succeeded");
      }
    } catch (e) {
      console.error("[auth] signOut threw:", e);
    }
  }
  // Always navigate, even if Supabase wasn't configured or signOut errored.
  // `replace` instead of `href` so back-button doesn't return to profile.
  window.location.replace("/");
};

const MOCK_USER = {
  name: "Vidhaan Dubey",
  email: "vidhandubey03@gmail.com",
  avatarInitial: "V",
  avatarTint: "#C96442",
  provider: "Google",
  memberSince: "May 2026",
  lastSignIn: "2 hours ago",
};

const MOCK_BOARDS = presets.slice(0, 5);

const MOCK_DEFAULTS = {
  brand: "Plivo",
  color: "#0EA5E9",
  accent: "#22D3EE",
  aspect: "vertical" as const,
  theme: "system" as const,
};

export default function ProfilePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"system" | "light" | "dark">(
    MOCK_DEFAULTS.theme,
  );
  const [aspect, setAspect] = useState<"vertical" | "square" | "horizontal">(
    MOCK_DEFAULTS.aspect,
  );
  const [brand, setBrand] = useState(MOCK_DEFAULTS.brand);
  const [color, setColor] = useState(MOCK_DEFAULTS.color);
  const [accent, setAccent] = useState(MOCK_DEFAULTS.accent);

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ color: "var(--ink)" }}
    >
      <AtmosphericBackdrop />

      {/* ─── Top nav (glassy pill, matches rest of app) ─── */}
      <header className="relative flex justify-center px-6 pt-6">
        <nav
          className="flex items-center gap-2 rounded-full border px-2 py-1.5 backdrop-blur-2xl"
          style={{
            background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
            borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
            boxShadow: "var(--shadow)",
          }}
        >
          <button
            onClick={() => router.push("/")}
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
            style={{ color: "var(--ink-muted)" }}
          >
            ← Back
          </button>
          <span className="px-2 py-1.5">
            <MotionLogotype />
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--ink-faint)" }}
          >
            / profile
          </span>
          <button
            onClick={performSignOut}
            className="ml-auto rounded-full border px-3.5 py-1.5 text-sm transition hover:bg-black/5"
            style={{
              borderColor: "color-mix(in srgb, var(--ink) 18%, transparent)",
              color: "var(--ink-muted)",
            }}
          >
            Sign out
          </button>
        </nav>
      </header>

      <div className="relative mx-auto w-full max-w-[820px] px-6 pb-24 pt-16 sm:pt-24">
        {/* ─── Identity ─── */}
        <section className="flex flex-col items-center gap-3 pb-12">
          {/* Avatar */}
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold"
            style={{
              background: `${MOCK_USER.avatarTint}22`,
              color: MOCK_USER.avatarTint,
              boxShadow: `inset 0 0 0 2px ${MOCK_USER.avatarTint}55`,
            }}
          >
            {MOCK_USER.avatarInitial}
          </div>
          <h1
            className="italic"
            style={{
              fontFamily: "var(--font-serif), serif",
              fontWeight: 500,
              fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {MOCK_USER.name}
          </h1>
          <div className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {MOCK_USER.email}
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--ink-faint)" }}
          >
            Signed in with {MOCK_USER.provider} · Joined {MOCK_USER.memberSince}
          </div>
        </section>

        {/* ─── 01 / Your storyboards ─── */}
        <SectionHeader number="01" title="Your storyboards" right={`${MOCK_BOARDS.length} saved`} />
        <div className="grid grid-cols-1 gap-x-8">
          {MOCK_BOARDS.map((p) => {
            const sb = p.storyboard;
            const seconds = Math.round(
              sb.scenes.reduce((a, s) => a + s.duration, 0) / 30,
            );
            return (
              <button
                key={sb.brand.name}
                onClick={() => alert(`Load board: ${sb.brand.name}`)}
                className="group flex items-baseline gap-3 border-b py-3 text-left transition"
                style={{ borderColor: "var(--rule)" }}
              >
                <span
                  className="block h-2 w-2 shrink-0 translate-y-[3px] rounded-full transition group-hover:scale-[1.6]"
                  style={{ background: sb.brand.accent }}
                />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span
                    className="truncate text-[15px] font-medium"
                    style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                  >
                    {sb.brand.name}
                  </span>
                  <span
                    className="italic"
                    style={{
                      fontFamily: "var(--font-serif), serif",
                      fontWeight: 400,
                      fontSize: 12,
                      color: "var(--ink-faint)",
                    }}
                  >
                    {p.category}
                  </span>
                </div>
                <span
                  className="shrink-0 font-mono text-[10px] tabular-nums"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {sb.scenes.length}·{seconds}s
                </span>
                <span
                  className="ml-2 shrink-0 text-[12px] opacity-0 transition group-hover:opacity-100"
                  style={{ color: "var(--ink-muted)" }}
                >
                  →
                </span>
              </button>
            );
          })}
          <button
            onClick={() => router.push("/")}
            className="mt-4 self-start rounded-full border px-4 py-2 text-sm transition hover:opacity-90"
            style={{
              borderColor: "color-mix(in srgb, var(--ink) 14%, transparent)",
              background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              color: "var(--ink)",
            }}
          >
            + New storyboard
          </button>
        </div>

        {/* ─── 02 / Settings ─── */}
        <div className="mt-16">
          <SectionHeader number="02" title="Settings" right="cross-device" />

          {/* Theme */}
          <div
            className="rounded-2xl border p-4 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="mb-2 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Theme
            </div>
            <div className="flex gap-1.5">
              {(["system", "light", "dark"] as const).map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className="rounded-full px-3.5 py-1.5 text-xs capitalize transition"
                    style={{
                      background: active ? "var(--ink)" : "transparent",
                      color: active ? "var(--bg)" : "var(--ink-muted)",
                      border: `1px solid ${active ? "var(--ink)" : "color-mix(in srgb, var(--ink) 10%, transparent)"}`,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default brand */}
          <div
            className="mt-3 rounded-2xl border p-4 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="mb-3 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Default brand
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand name"
                className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 14%, transparent)",
                  color: "var(--ink)",
                }}
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 14%, transparent)",
                  color: "var(--ink-muted)",
                }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-4 w-4 cursor-pointer appearance-none rounded-full border-0"
                  style={{ background: color }}
                />
                {color}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 14%, transparent)",
                  color: "var(--ink-muted)",
                }}
              >
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-4 w-4 cursor-pointer appearance-none rounded-full border-0"
                  style={{ background: accent }}
                />
                {accent}
              </label>
            </div>
          </div>

          {/* Default format */}
          <div
            className="mt-3 rounded-2xl border p-4 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              className="mb-2 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Default format
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  { key: "vertical", label: "9:16" },
                  { key: "square", label: "1:1" },
                  { key: "horizontal", label: "16:9" },
                ] as const
              ).map((opt) => {
                const active = aspect === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setAspect(opt.key)}
                    className="rounded-full px-3.5 py-1.5 text-xs capitalize transition"
                    style={{
                      background: active ? "var(--ink)" : "transparent",
                      color: active ? "var(--bg)" : "var(--ink-muted)",
                      border: `1px solid ${active ? "var(--ink)" : "color-mix(in srgb, var(--ink) 10%, transparent)"}`,
                    }}
                  >
                    {opt.label} <span className="ml-1.5 opacity-50">{opt.key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── 03 / Account ─── */}
        <div className="mt-16">
          <SectionHeader number="03" title="Account" />

          <div
            className="space-y-3 rounded-2xl border p-5 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <Row label="Email" value={MOCK_USER.email} />
            <Row label="Sign-in method" value={MOCK_USER.provider} />
            <Row label="Last sign-in" value={MOCK_USER.lastSignIn} />
            <Row label="Member since" value={MOCK_USER.memberSince} />
          </div>

          {/* Danger zone */}
          <div
            className="mt-6 rounded-2xl border p-5"
            style={{
              borderColor: "rgba(220, 80, 60, 0.25)",
              background: "rgba(220, 80, 60, 0.04)",
            }}
          >
            <div
              className="mb-1 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(168, 58, 44, 0.7)" }}
            >
              Danger zone
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Deleting your account is permanent. All storyboards and settings will be removed.
              </div>
              <button
                onClick={() => alert("Delete confirmation flow — design only")}
                className="shrink-0 rounded-lg border px-3 py-1.5 text-xs"
                style={{
                  borderColor: "rgba(220, 80, 60, 0.3)",
                  color: "#a83a2c",
                }}
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Design-mode footer */}
      <div
        className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur"
        style={{
          borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
          background: "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
          color: "var(--ink-faint)",
        }}
      >
        ✦ design mockup · data is placeholder
      </div>
    </main>
  );
}

// ─── Reusable bits ─────────────────────────────────────────────────────

const SectionHeader = ({
  number,
  title,
  right,
}: {
  number: string;
  title: string;
  right?: string;
}) => (
  <div
    className="mb-6 flex items-end justify-between border-b pb-4"
    style={{ borderColor: "var(--rule)" }}
  >
    <div className="flex items-baseline gap-3">
      <span
        className="font-mono text-[11px] uppercase tracking-widest"
        style={{ color: "var(--ink-faint)" }}
      >
        {number}
      </span>
      <h2
        className="tracking-[-0.02em]"
        style={{
          fontFamily: "var(--font-serif), serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: "clamp(24px, 3vw, 36px)",
          lineHeight: 1,
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
    </div>
    {right ? (
      <span
        className="font-mono text-[11px] uppercase tracking-widest"
        style={{ color: "var(--ink-faint)" }}
      >
        {right}
      </span>
    ) : null}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span
      className="font-mono text-[10px] uppercase tracking-widest"
      style={{ color: "var(--ink-faint)" }}
    >
      {label}
    </span>
    <span className="text-sm" style={{ color: "var(--ink)" }}>
      {value}
    </span>
  </div>
);

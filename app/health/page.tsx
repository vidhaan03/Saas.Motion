"use client";

// Visual health dashboard for motion.saas. Pings /api/health (which probes
// every LLM provider) and also checks Supabase + the signed-in user state.
// Ideal "is this laptop set up correctly" page after a fresh git clone.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { AtmosphericBackdrop } from "../components/AtmosphericBackdrop";
import { MotionLogotype } from "../components/MotionLogotype";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

type ProviderResult = {
  configured: boolean;
  reachable: boolean | "skipped";
  status?: number;
  error?: string;
  model?: string;
};

type HealthResponse = {
  ok: boolean;
  env: Record<string, boolean | string | null>;
  probes: {
    nimText: ProviderResult;
    nimVisionPrimary: ProviderResult;
    nimVisionFallback: ProviderResult;
    gemini: ProviderResult;
  };
  hint: string;
};

type SupabaseProbe = {
  configured: boolean;
  reachable: boolean | null;
  signedIn: boolean | null;
  email?: string;
  error?: string;
};

export default function HealthPage() {
  const [llm, setLlm] = useState<HealthResponse | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [supabaseProbe, setSupabaseProbe] = useState<SupabaseProbe>({
    configured: SUPABASE_CONFIGURED,
    reachable: null,
    signedIn: null,
  });
  const [refreshing, setRefreshing] = useState(true);

  const runProbes = async () => {
    setRefreshing(true);
    setLlmError(null);

    // 1. LLM probes via /api/health
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json = (await res.json()) as HealthResponse;
      setLlm(json);
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : String(e));
      setLlm(null);
    }

    // 2. Supabase probe (only if configured)
    if (SUPABASE_CONFIGURED) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          setSupabaseProbe({
            configured: true,
            reachable: false,
            signedIn: false,
            error: error.message,
          });
        } else {
          setSupabaseProbe({
            configured: true,
            reachable: true,
            signedIn: Boolean(data.user),
            email: data.user?.email,
          });
        }
      } catch (e) {
        setSupabaseProbe({
          configured: true,
          reachable: false,
          signedIn: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      setSupabaseProbe({
        configured: false,
        reachable: null,
        signedIn: null,
      });
    }

    setRefreshing(false);
  };

  useEffect(() => {
    runProbes();
  }, []);

  const allOk =
    llm?.ok === true &&
    (supabaseProbe.configured ? supabaseProbe.reachable === true : true);

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ color: "var(--ink)" }}
    >
      <AtmosphericBackdrop />

      {/* Pill nav */}
      <header className="relative flex justify-center px-6 pt-6">
        <nav
          className="flex items-center gap-2 rounded-full border px-2 py-1.5 backdrop-blur-2xl"
          style={{
            background:
              "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--ink) 12%, transparent)",
            boxShadow: "var(--shadow)",
          }}
        >
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
            style={{ color: "var(--ink-muted)" }}
          >
            ← Back
          </Link>
          <span className="px-2 py-1.5">
            <MotionLogotype />
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "var(--ink-faint)" }}
          >
            / health
          </span>
          <button
            onClick={runProbes}
            disabled={refreshing}
            className="ml-auto rounded-full border px-3.5 py-1.5 text-sm transition hover:opacity-90 disabled:opacity-50"
            style={{
              borderColor:
                "color-mix(in srgb, var(--ink) 18%, transparent)",
              color: "var(--ink-muted)",
            }}
          >
            {refreshing ? "Probing…" : "↻ Re-run"}
          </button>
        </nav>
      </header>

      <div className="relative mx-auto w-full max-w-[760px] px-6 pb-24 pt-12 sm:pt-16">
        {/* Overall status banner */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
            style={{
              background: refreshing
                ? "color-mix(in srgb, var(--ink) 6%, transparent)"
                : allOk
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(220, 80, 60, 0.12)",
              color: refreshing
                ? "var(--ink-muted)"
                : allOk
                  ? "#16a34a"
                  : "#a83a2c",
            }}
          >
            {refreshing ? "…" : allOk ? "✓" : "!"}
          </div>
          <h1
            className="italic"
            style={{
              fontFamily: "var(--font-serif), serif",
              fontWeight: 500,
              fontSize: "clamp(28px, 4vw, 44px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {refreshing
              ? "Checking…"
              : allOk
                ? "All systems green"
                : "Issues detected"}
          </h1>
          {!refreshing && llm ? (
            <p
              className="text-center text-sm"
              style={{ color: "var(--ink-muted)" }}
            >
              {llm.hint}
            </p>
          ) : null}
        </div>

        {/* LLM probes */}
        <Section number="01" title="LLM providers">
          {llmError ? (
            <ErrorRow message={`Failed to reach /api/health: ${llmError}`} />
          ) : llm ? (
            <>
              <ProbeRow
                label="Text generation"
                probe={llm.probes.nimText}
                roleLabel="primary text"
              />
              <ProbeRow
                label="Vision (primary)"
                probe={llm.probes.nimVisionPrimary}
                roleLabel="vision primary"
              />
              <ProbeRow
                label="Vision (fallback)"
                probe={llm.probes.nimVisionFallback}
                roleLabel="vision fallback"
              />
              <ProbeRow
                label="Gemini"
                probe={llm.probes.gemini}
                roleLabel="fallback / vision"
                last
              />
            </>
          ) : (
            <SkeletonRows count={4} />
          )}
        </Section>

        {/* Supabase + auth */}
        <Section number="02" title="Auth (Supabase)">
          <Row
            label="Configured"
            value={
              supabaseProbe.configured ? "Yes" : "No env vars set"
            }
            tone={supabaseProbe.configured ? "good" : "muted"}
          />
          <Row
            label="Reachable"
            value={
              !supabaseProbe.configured
                ? "—"
                : supabaseProbe.reachable === null
                  ? "Probing…"
                  : supabaseProbe.reachable
                    ? "Yes"
                    : `No — ${supabaseProbe.error ?? "unknown"}`
            }
            tone={
              !supabaseProbe.configured
                ? "muted"
                : supabaseProbe.reachable === true
                  ? "good"
                  : supabaseProbe.reachable === null
                    ? "muted"
                    : "bad"
            }
          />
          <Row
            label="Signed in"
            value={
              !supabaseProbe.configured
                ? "—"
                : supabaseProbe.signedIn === null
                  ? "Probing…"
                  : supabaseProbe.signedIn
                    ? supabaseProbe.email ?? "Yes"
                    : "Anonymous"
            }
            tone={
              supabaseProbe.signedIn === true
                ? "good"
                : "muted"
            }
          />
          <Row
            label="Dev bypass"
            value={DEV_BYPASS_AUTH ? "ON — generate is open" : "off"}
            tone={DEV_BYPASS_AUTH ? "bad" : "muted"}
            last
          />
        </Section>

        {/* Env vars */}
        <Section number="03" title="Environment variables">
          {llm?.env ? (
            Object.entries(llm.env).map(([k, v], i, arr) => (
              <Row
                key={k}
                label={k}
                value={
                  typeof v === "boolean"
                    ? v
                      ? "Set"
                      : "Not set"
                    : v === null
                      ? "Not set"
                      : String(v)
                }
                tone={
                  typeof v === "boolean"
                    ? v
                      ? "good"
                      : "muted"
                    : v
                      ? "good"
                      : "muted"
                }
                last={i === arr.length - 1}
                mono
              />
            ))
          ) : (
            <SkeletonRows count={5} />
          )}
        </Section>

        <p
          className="mt-10 text-center text-[11px]"
          style={{ color: "var(--ink-faint)" }}
        >
          Probes run client-side. Values are presence-only — secrets never leave the server.
        </p>
      </div>
    </main>
  );
}

// ─── Bits ─────────────────────────────────────────────────────────────

const Section = ({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-10">
    <div
      className="mb-4 flex items-end justify-between border-b pb-3"
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
            fontSize: "clamp(22px, 2.5vw, 32px)",
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
      </div>
    </div>
    <div
      className="rounded-2xl border backdrop-blur-xl"
      style={{
        background:
          "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
        borderColor: "color-mix(in srgb, var(--ink) 8%, transparent)",
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </div>
  </section>
);

const Row = ({
  label,
  value,
  tone = "muted",
  last,
  mono,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "muted";
  last?: boolean;
  mono?: boolean;
}) => (
  <div
    className="flex items-baseline justify-between gap-4 px-4 py-3"
    style={{
      borderBottom: last
        ? "none"
        : "1px solid color-mix(in srgb, var(--ink) 6%, transparent)",
    }}
  >
    <span
      className={mono ? "font-mono text-[11px]" : "text-sm"}
      style={{ color: "var(--ink-muted)" }}
    >
      {label}
    </span>
    <span
      className={`text-right ${mono ? "font-mono text-[11px]" : "text-sm"}`}
      style={{
        color:
          tone === "good"
            ? "#16a34a"
            : tone === "bad"
              ? "#a83a2c"
              : "var(--ink)",
      }}
    >
      {value}
    </span>
  </div>
);

const ProbeRow = ({
  label,
  probe,
  roleLabel,
  last,
}: {
  label: string;
  probe: ProviderResult;
  roleLabel: string;
  last?: boolean;
}) => {
  const status = !probe.configured
    ? "no key"
    : probe.reachable === "skipped"
      ? "skipped"
      : probe.reachable === true
        ? `ok · ${probe.status ?? 200}`
        : `failed · ${probe.status ?? "—"}`;

  const tone =
    probe.reachable === true
      ? "good"
      : probe.reachable === false
        ? "bad"
        : "muted";

  return (
    <div
      className="flex items-baseline justify-between gap-4 px-4 py-3"
      style={{
        borderBottom: last
          ? "none"
          : "1px solid color-mix(in srgb, var(--ink) 6%, transparent)",
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm" style={{ color: "var(--ink)" }}>
          {label}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {probe.model ?? roleLabel}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{
            color:
              tone === "good"
                ? "#16a34a"
                : tone === "bad"
                  ? "#a83a2c"
                  : "var(--ink-faint)",
          }}
        >
          {status}
        </span>
        {probe.error ? (
          <span
            className="max-w-[260px] truncate font-mono text-[10px]"
            style={{ color: "var(--ink-faint)" }}
            title={probe.error}
          >
            {probe.error.slice(0, 60)}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const ErrorRow = ({ message }: { message: string }) => (
  <div
    className="px-4 py-4 text-sm"
    style={{ color: "#a83a2c" }}
  >
    {message}
  </div>
);

const SkeletonRows = ({ count }: { count: number }) =>
  Array.from({ length: count }).map((_, i) => (
    <div
      key={i}
      className="flex items-baseline justify-between gap-4 px-4 py-3"
      style={{
        borderBottom:
          i < count - 1
            ? "1px solid color-mix(in srgb, var(--ink) 6%, transparent)"
            : "none",
      }}
    >
      <div
        className="h-3 w-24 rounded"
        style={{
          background: "color-mix(in srgb, var(--ink) 8%, transparent)",
        }}
      />
      <div
        className="h-3 w-16 rounded"
        style={{
          background: "color-mix(in srgb, var(--ink) 6%, transparent)",
        }}
      />
    </div>
  ));

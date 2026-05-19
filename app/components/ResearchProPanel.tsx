"use client";

// ResearchProPanel — the ⚡ Research Pro overlay.
//
// Flow:
//   1. On mount: POST /api/research { action:"identify" } — fast sync call.
//      If ambiguous, pause and show disambiguation options.
//   2. After product is confirmed: POST /api/research { action:"pipeline" }
//      and consume the SSE stream, updating each step card in real time.
//   3. After all 5 steps complete: pause → color confirmation → mood selection.
//   4. onComplete(result) hands the enriched context back to page.tsx which
//      applies suggested colors + triggers generate().

import { useCallback, useEffect, useRef, useState } from "react";
import { ICON_NAMES } from "../../remotion/decorIcons";

// ── Public types ──────────────────────────────────────────────────────────────

export type AdMood =
  | "marketing"
  | "feature-launch"
  | "announcement"
  | "assertion"
  | "auto";

export type ResearchResult = {
  productName: string;
  productDescription: string;
  category: string;
  stats: Array<{ value: string; label: string }>;
  competitorInsights: string;
  suggestedColor: string;
  suggestedAccent: string;
  colorRationale: string;
  icons: string[];
  mood: AdMood;
};

// ── Internal types ────────────────────────────────────────────────────────────

type StepId = "identify" | "stats" | "competitors" | "colors" | "icons";
type StepStatus = "pending" | "loading" | "done" | "error";

type StepState = {
  id: StepId;
  label: string;
  status: StepStatus;
  detail?: string;
};

type PanelPhase =
  | "identifying"
  | "disambiguating"
  | "pipeline"
  | "confirming-colors"
  | "asking-mood";

type ProductInfo = { name: string; description: string; category: string };
type ColorInfo = { primary: string; accent: string; rationale: string };

const INITIAL_STEPS: StepState[] = [
  { id: "identify",    label: "Identifying product",       status: "loading" },
  { id: "stats",       label: "Fetching real stats",       status: "pending" },
  { id: "competitors", label: "Analyzing competitors",     status: "pending" },
  { id: "colors",      label: "Determining color palette", status: "pending" },
  { id: "icons",       label: "Selecting icons",           status: "pending" },
];

const MOODS: { key: AdMood; label: string; description: string }[] = [
  { key: "auto",          label: "Auto",          description: "AI determines intent from prompt" },
  { key: "marketing",     label: "Marketing",     description: "Sales-driven, benefit-focused" },
  { key: "feature-launch",label: "Feature Launch",description: "Highlighting a new capability" },
  { key: "announcement",  label: "Announcement",  description: "News-style reveal" },
  { key: "assertion",     label: "Assertion",     description: "Bold brand confidence statement" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ResearchProPanel({
  prompt,
  existingColor,
  existingAccent,
  onComplete,
  onClose,
}: {
  prompt: string;
  existingColor: string;
  existingAccent: string;
  onComplete: (result: ResearchResult) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<PanelPhase>("identifying");
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);

  // Resolved data
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [alternatives, setAlternatives] = useState<ProductInfo[]>([]);
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [colors, setColors] = useState<ColorInfo | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [mood, setMood] = useState<AdMood>("auto");

  const ranRef = useRef(false);

  // ── Step helpers ────────────────────────────────────────────────────────────

  const setStepStatus = useCallback(
    (id: StepId, status: StepStatus, detail?: string) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, detail } : s)),
      );
    },
    [],
  );

  // ── Phase 1: identify ───────────────────────────────────────────────────────

  const runIdentify = useCallback(async () => {
    setStepStatus("identify", "loading");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "identify", prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        name: string;
        description: string;
        category: string;
        ambiguous: boolean;
        alternatives?: ProductInfo[];
      };

      if (data.ambiguous && data.alternatives && data.alternatives.length > 0) {
        setAlternatives([
          { name: data.name, description: data.description, category: data.category },
          ...data.alternatives,
        ]);
        setStepStatus("identify", "pending", "Needs clarification");
        setPhase("disambiguating");
        return;
      }

      const resolved: ProductInfo = {
        name: data.name,
        description: data.description,
        category: data.category,
      };
      setProduct(resolved);
      setStepStatus("identify", "done", `${data.name} · ${data.category}`);
      runPipeline(resolved);
    } catch (e) {
      setStepStatus("identify", "error", "Could not identify product");
      setError(e instanceof Error ? e.message : "Identify step failed");
    }
  }, [prompt, setStepStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: pipeline SSE ───────────────────────────────────────────────────

  const runPipeline = useCallback(
    async (resolved: ProductInfo) => {
      setPhase("pipeline");

      let res: Response;
      try {
        res = await fetch("/api/research", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "pipeline",
            productName: resolved.name,
            productDescription: resolved.description,
            category: resolved.category,
            existingColor,
            existingAccent,
          }),
        });
        if (!res.ok || !res.body)
          throw new Error(`Pipeline HTTP ${res.status}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Pipeline failed to start");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Set all pipeline steps to loading as the stream opens
      setStepStatus("stats", "loading");

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            if (!chunk.startsWith("data: ")) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(chunk.slice(6));
            } catch {
              continue;
            }

            if (event.type === "step") {
              const step = event.step as StepId;
              const status = event.status as string;

              if (status === "start") {
                setStepStatus(step, "loading");
              } else if (status === "done") {
                const data = event.data as Record<string, unknown>;

                if (step === "stats") {
                  const s = (data.stats ?? []) as Array<{
                    value: string;
                    label: string;
                  }>;
                  setStats(s);
                  setStepStatus(
                    "stats",
                    "done",
                    s.length > 0
                      ? s
                          .slice(0, 2)
                          .map((x) => `${x.value} ${x.label}`)
                          .join(" · ")
                      : "No public stats found",
                  );
                }

                if (step === "competitors") {
                  const c = (data.competitors ?? []) as string[];
                  setCompetitors(c);
                  setStepStatus(
                    "competitors",
                    "done",
                    c.slice(0, 3).join(", ") || "Analyzed",
                  );
                }

                if (step === "colors") {
                  const c: ColorInfo = {
                    primary: data.primary as string,
                    accent: data.accent as string,
                    rationale: data.rationale as string,
                  };
                  setColors(c);
                  setStepStatus(
                    "colors",
                    "done",
                    `${c.primary} + ${c.accent}`,
                  );
                }

                if (step === "icons") {
                  const ic = (data.icons ?? []) as string[];
                  const valid = ic.filter((i) =>
                    (ICON_NAMES as readonly string[]).includes(i),
                  );
                  setIcons(valid);
                  setStepStatus("icons", "done", valid.join(", "));
                }
              } else if (status === "error") {
                setStepStatus(step, "error", String(event.error ?? "Failed"));
              }
            } else if (event.type === "done") {
              setPhase("confirming-colors");
            } else if (event.type === "error") {
              setError(String(event.message ?? "Pipeline error"));
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Stream read error");
      }
    },
    [existingColor, existingAccent, setStepStatus],
  );

  // ── Mount: kick off identify ────────────────────────────────────────────────

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    runIdentify();
  }, [runIdentify]);

  // ── Disambiguation handler ──────────────────────────────────────────────────

  const handlePickProduct = (choice: ProductInfo) => {
    setProduct(choice);
    setStepStatus("identify", "done", `${choice.name} · ${choice.category}`);
    runPipeline(choice);
  };

  // ── Color confirmation ──────────────────────────────────────────────────────

  const handleKeepSuggestedColors = () => setPhase("asking-mood");

  const handleKeepMyColors = () => {
    setColors({
      primary: existingColor,
      accent: existingAccent,
      rationale: "Using your custom colors",
    });
    setPhase("asking-mood");
  };

  // ── Final: build result and hand off ───────────────────────────────────────

  const handleGenerate = () => {
    if (!product || !colors) return;
    onComplete({
      productName: product.name,
      productDescription: product.description,
      category: product.category,
      stats,
      competitorInsights: competitors.length > 0 ? competitors.join(", ") : "",
      suggestedColor: colors.primary,
      suggestedAccent: colors.accent,
      colorRationale: colors.rationale,
      icons,
      mood,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border"
        style={{
          background: "color-mix(in srgb, var(--bg-elev) 97%, transparent)",
          borderColor: "color-mix(in srgb, var(--ink) 14%, transparent)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.65)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "color-mix(in srgb, var(--ink) 10%, transparent)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "rgba(99,102,241,0.18)", color: "#818CF8" }}
            >
              ⚡
            </span>
            <span
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: "var(--ink)" }}
            >
              Research Pro
            </span>
            {phase === "pipeline" && (
              <span
                className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: "#818CF8" }}
              />
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:bg-white/10"
            style={{ color: "var(--ink-faint)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
          {/* Step list */}
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3 py-1">
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background:
                    step.status === "done"
                      ? "rgba(74,222,128,0.18)"
                      : step.status === "loading"
                        ? "rgba(99,102,241,0.18)"
                        : step.status === "error"
                          ? "rgba(248,113,113,0.18)"
                          : "color-mix(in srgb, var(--ink) 7%, transparent)",
                  color:
                    step.status === "done"
                      ? "#4ADE80"
                      : step.status === "loading"
                        ? "#818CF8"
                        : step.status === "error"
                          ? "#F87171"
                          : "var(--ink-faint)",
                }}
              >
                {step.status === "done"
                  ? "✓"
                  : step.status === "loading"
                    ? "…"
                    : step.status === "error"
                      ? "!"
                      : String(i + 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm"
                  style={{
                    color:
                      step.status === "pending"
                        ? "var(--ink-faint)"
                        : "var(--ink)",
                  }}
                >
                  {step.label}
                </div>
                {step.detail && (
                  <div
                    className="mt-0.5 font-mono text-[10px] leading-snug"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Error banner */}
          {error && (
            <div
              className="mt-3 rounded-xl border p-3 text-xs"
              style={{
                background: "rgba(248,113,113,0.07)",
                borderColor: "rgba(248,113,113,0.22)",
                color: "#F87171",
              }}
            >
              {error}
            </div>
          )}

          {/* ── Disambiguation ── */}
          {phase === "disambiguating" && (
            <div className="mt-5 space-y-2">
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Multiple matches — which one?
              </div>
              {alternatives.map((alt) => (
                <button
                  key={alt.name}
                  onClick={() => handlePickProduct(alt)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition hover:bg-white/5"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--ink) 14%, transparent)",
                  }}
                >
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    {alt.name}
                  </div>
                  <div
                    className="mt-0.5 text-xs leading-snug"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {alt.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Color confirmation ── */}
          {phase === "confirming-colors" && colors && (
            <div className="mt-5 space-y-3">
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Suggested color palette
              </div>
              <div className="flex gap-3">
                {[
                  { hex: colors.primary, label: "Primary" },
                  { hex: colors.accent,  label: "Accent" },
                ].map(({ hex, label }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-xl border p-3 text-center"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--ink) 12%, transparent)",
                    }}
                  >
                    <div
                      className="mx-auto mb-2 h-10 w-10 rounded-full border-2 border-white/10"
                      style={{ background: hex }}
                    />
                    <div
                      className="font-mono text-[11px]"
                      style={{ color: "var(--ink)" }}
                    >
                      {hex}
                    </div>
                    <div
                      className="mt-0.5 font-mono text-[10px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="rounded-lg px-3 py-2 text-xs leading-snug"
                style={{
                  background:
                    "color-mix(in srgb, var(--ink) 5%, transparent)",
                  color: "var(--ink-faint)",
                }}
              >
                {colors.rationale}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleKeepSuggestedColors}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
                  style={{ background: "var(--ink)", color: "var(--bg)" }}
                >
                  Looks great →
                </button>
                <button
                  onClick={handleKeepMyColors}
                  className="rounded-xl border px-4 py-2.5 text-sm transition hover:bg-white/5"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--ink) 14%, transparent)",
                    color: "var(--ink-muted)",
                  }}
                >
                  Keep mine
                </button>
              </div>
            </div>
          )}

          {/* ── Mood selection ── */}
          {phase === "asking-mood" && (
            <div className="mt-5 space-y-3">
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Ad mood
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MOODS.map((m) => {
                  const active = mood === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMood(m.key)}
                      className="rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/5"
                      style={{
                        borderColor: active
                          ? "rgba(99,102,241,0.5)"
                          : "color-mix(in srgb, var(--ink) 12%, transparent)",
                        background: active
                          ? "rgba(99,102,241,0.1)"
                          : "transparent",
                      }}
                    >
                      <div
                        className="text-xs font-medium"
                        style={{ color: active ? "#818CF8" : "var(--ink)" }}
                      >
                        {m.label}
                      </div>
                      <div
                        className="mt-0.5 text-[10px] leading-snug"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {m.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleGenerate}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90"
                style={{ background: "var(--ink)", color: "var(--bg)" }}
              >
                ⚡ Generate with Research Insights
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

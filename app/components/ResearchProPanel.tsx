"use client";

import { useEffect, useRef, useState } from "react";
import { ICON_NAMES } from "../../remotion/decorIcons";

export type AdMood = "marketing" | "feature-launch" | "announcement" | "assertion" | "auto";

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

type StepStatus = "pending" | "loading" | "done" | "error" | "skipped";

type ResearchPanelProps = {
  prompt: string;
  existingColor: string;
  existingAccent: string;
  onComplete: (result: ResearchResult) => void;
  onClose: () => void;
};

const MOODS: { key: AdMood; label: string; description: string }[] = [
  { key: "auto", label: "Auto", description: "AI determines from your prompt" },
  { key: "marketing", label: "Marketing", description: "Sales-driven, benefit-focused" },
  { key: "feature-launch", label: "Feature Launch", description: "Highlighting a new capability" },
  { key: "announcement", label: "Announcement", description: "News-style reveal" },
  { key: "assertion", label: "Assertion", description: "Bold statement / brand confidence" },
];

export function ResearchProPanel({ prompt, existingColor, existingAccent, onComplete, onClose }: ResearchPanelProps) {
  const [phase, setPhase] = useState<
    | "researching"
    | "disambiguating"
    | "confirming-colors"
    | "asking-mood"
    | "complete"
  >("researching");

  const [steps, setSteps] = useState<Array<{ id: string; label: string; status: StepStatus; detail?: string }>>([
    { id: "identify", label: "Identifying product", status: "loading" },
    { id: "stats", label: "Fetching real stats", status: "pending" },
    { id: "competitors", label: "Analyzing competitors", status: "pending" },
    { id: "colors", label: "Determining color palette", status: "pending" },
    { id: "icons", label: "Selecting icons", status: "pending" },
  ]);

  const [productInfo, setProductInfo] = useState<{ name: string; description: string; category: string } | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ name: string; description: string; category: string }>>([]);
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([]);
  const [competitors, setCompetitors] = useState<{ names: string[]; adStyle: string; colorInsights: string } | null>(null);
  const [colors, setColors] = useState<{ primary: string; accent: string; rationale: string } | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<AdMood>("auto");
  const [error, setError] = useState<string | null>(null);

  const ranRef = useRef(false);

  const updateStep = (id: string, status: StepStatus, detail?: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status, detail } : s)));
  };

  const apiCall = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Research request failed");
    return res.json();
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    runResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runResearch = async (resolvedProduct?: { name: string; description: string; category: string }) => {
    try {
      // Step 1: Identify
      let product = resolvedProduct;
      if (!product) {
        updateStep("identify", "loading");
        const id = await apiCall({ step: "identify", prompt });
        if (id.ambiguous && id.alternatives?.length > 0) {
          setAlternatives([
            { name: id.name, description: id.description, category: id.category },
            ...id.alternatives,
          ]);
          updateStep("identify", "pending", "Needs clarification");
          setPhase("disambiguating");
          return;
        }
        product = { name: id.name, description: id.description, category: id.category };
        updateStep("identify", "done", `${id.name} · ${id.category}`);
        setProductInfo(product);
      }

      // Step 2: Stats
      updateStep("stats", "loading");
      try {
        const statsResult = await apiCall({ step: "stats", productName: product.name, productDescription: product.description });
        const s: Array<{ value: string; label: string }> = statsResult.stats ?? [];
        setStats(s);
        updateStep("stats", "done", s.length > 0 ? s.slice(0, 2).map((x) => `${x.value} ${x.label}`).join(" · ") : "No public stats found");
      } catch {
        updateStep("stats", "error", "Could not fetch stats");
      }

      // Step 3: Competitors
      updateStep("competitors", "loading");
      let compInsights = "";
      try {
        const comp = await apiCall({ step: "competitors", productName: product.name, category: product.category });
        const names: string[] = comp.competitors ?? [];
        const adStyle: string = comp.adStyle ?? "";
        const colorInsights: string = comp.colorInsights ?? "";
        setCompetitors({ names, adStyle, colorInsights });
        compInsights = `${adStyle}. Colors: ${colorInsights}`;
        updateStep("competitors", "done", names.slice(0, 3).join(", ") || "Analyzed");
      } catch {
        updateStep("competitors", "error", "Could not analyze competitors");
      }

      // Step 4: Colors
      updateStep("colors", "loading");
      try {
        const c = await apiCall({
          step: "colors",
          productName: product.name,
          category: product.category,
          productDescription: product.description,
          competitorInsights: compInsights,
          existingColor,
          existingAccent,
        });
        setColors({ primary: c.primary, accent: c.accent, rationale: c.rationale });
        updateStep("colors", "done", `${c.primary} + ${c.accent}`);
      } catch {
        setColors({ primary: existingColor, accent: existingAccent, rationale: "Using your existing colors" });
        updateStep("colors", "error", "Using existing colors");
      }

      // Step 5: Icons
      updateStep("icons", "loading");
      try {
        const ic = await apiCall({ step: "icons", productName: product.name, category: product.category, productDescription: product.description });
        const validIcons = (ic.icons ?? []).filter((i: string) => (ICON_NAMES as readonly string[]).includes(i));
        setIcons(validIcons);
        updateStep("icons", "done", (validIcons as string[]).join(", "));
      } catch {
        updateStep("icons", "error", "Using default icons");
      }

      setPhase("confirming-colors");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
    }
  };

  const handleDisambiguate = (choice: { name: string; description: string; category: string }) => {
    setProductInfo(choice);
    updateStep("identify", "done", `${choice.name} · ${choice.category}`);
    setPhase("researching");
    runResearch(choice);
  };

  const handleColorConfirm = () => {
    setPhase("asking-mood");
  };

  const handleGenerate = () => {
    if (!productInfo || !colors) return;
    const result: ResearchResult = {
      productName: productInfo.name,
      productDescription: productInfo.description,
      category: productInfo.category,
      stats,
      competitorInsights: competitors ? `${competitors.adStyle}. ${competitors.colorInsights}` : "",
      suggestedColor: colors.primary,
      suggestedAccent: colors.accent,
      colorRationale: colors.rationale,
      icons,
      mood: selectedMood,
    };
    onComplete(result);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border"
        style={{
          background: "color-mix(in srgb, var(--bg-elev) 96%, transparent)",
          borderColor: "color-mix(in srgb, var(--ink) 15%, transparent)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "color-mix(in srgb, var(--ink) 10%, transparent)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
              style={{ background: "rgba(99,102,241,0.2)", color: "#818CF8" }}
            >
              ⚡
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--ink)" }}>
              Research Pro
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:bg-white/10"
            style={{ color: "var(--ink-faint)" }}
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                style={{
                  background:
                    step.status === "done"
                      ? "rgba(74, 222, 128, 0.2)"
                      : step.status === "loading"
                        ? "rgba(99,102,241,0.2)"
                        : step.status === "error"
                          ? "rgba(248, 113, 113, 0.2)"
                          : "color-mix(in srgb, var(--ink) 8%, transparent)",
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
                {step.status === "done" ? "✓" : step.status === "loading" ? "…" : step.status === "error" ? "!" : String(i + 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm"
                  style={{
                    color: step.status === "pending" ? "var(--ink-faint)" : "var(--ink)",
                  }}
                >
                  {step.label}
                </div>
                {step.detail ? (
                  <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>
                    {step.detail}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {error ? (
            <div className="mt-3 rounded-xl border p-3 text-xs" style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.2)", color: "#F87171" }}>
              {error}
            </div>
          ) : null}

          {/* Disambiguation */}
          {phase === "disambiguating" ? (
            <div className="mt-4 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-faint)" }}>
                Multiple matches found — which one?
              </div>
              {alternatives.map((alt) => (
                <button
                  key={alt.name}
                  onClick={() => handleDisambiguate(alt)}
                  className="w-full rounded-xl border px-4 py-3 text-left transition hover:bg-white/5"
                  style={{ borderColor: "color-mix(in srgb, var(--ink) 15%, transparent)" }}
                >
                  <div className="text-sm font-medium" style={{ color: "var(--ink)" }}>{alt.name}</div>
                  <div className="mt-0.5 text-xs" style={{ color: "var(--ink-faint)" }}>{alt.description}</div>
                </button>
              ))}
            </div>
          ) : null}

          {/* Color confirmation */}
          {phase === "confirming-colors" && colors ? (
            <div className="mt-4 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-faint)" }}>
                Color palette
              </div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)" }}>
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full border-2 border-white/10" style={{ background: colors.primary }} />
                  <div className="font-mono text-[11px]" style={{ color: "var(--ink)" }}>{colors.primary}</div>
                  <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>Primary</div>
                </div>
                <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)" }}>
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full border-2 border-white/10" style={{ background: colors.accent }} />
                  <div className="font-mono text-[11px]" style={{ color: "var(--ink)" }}>{colors.accent}</div>
                  <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>Accent</div>
                </div>
              </div>
              <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, var(--ink) 5%, transparent)", color: "var(--ink-faint)" }}>
                {colors.rationale}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleColorConfirm}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
                  style={{ background: "var(--ink)", color: "var(--bg)" }}
                >
                  Looks great →
                </button>
                <button
                  onClick={() => {
                    // Keep user's existing colors
                    if (colors) {
                      setColors({ ...colors, primary: existingColor, accent: existingAccent, rationale: "Using your custom colors" });
                    }
                    setPhase("asking-mood");
                  }}
                  className="rounded-xl border px-4 py-2.5 text-sm transition hover:bg-white/5"
                  style={{ borderColor: "color-mix(in srgb, var(--ink) 15%, transparent)", color: "var(--ink-muted)" }}
                >
                  Keep mine
                </button>
              </div>
            </div>
          ) : null}

          {/* Mood selection */}
          {phase === "asking-mood" ? (
            <div className="mt-4 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-faint)" }}>
                Ad mood
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMood(m.key)}
                    className="rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/5"
                    style={{
                      borderColor: selectedMood === m.key
                        ? "rgba(99,102,241,0.5)"
                        : "color-mix(in srgb, var(--ink) 12%, transparent)",
                      background: selectedMood === m.key ? "rgba(99,102,241,0.1)" : "transparent",
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: selectedMood === m.key ? "#818CF8" : "var(--ink)" }}>
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "var(--ink-faint)" }}>
                      {m.description}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-90"
                style={{ background: "var(--ink)", color: "var(--bg)" }}
              >
                ⚡ Generate with Research Insights
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

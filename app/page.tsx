"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  presets,
  sampleStoryboards,
  PRESET_CATEGORIES,
  type PresetCategory,
} from "../lib/sampleStoryboards";
import { ASPECTS, ASPECT_META, type Aspect } from "../lib/aspect";
import {
  deleteBoard,
  listBoards,
  renameBoard,
  saveBoard,
  type SavedBoard,
} from "../lib/storage";
import type { Scene, Storyboard } from "../remotion/schema";

const PlayerSkeleton = () => (
  <div
    style={{
      width: "100%",
      aspectRatio: "9 / 16",
      borderRadius: 24,
      background: "linear-gradient(135deg, #1a1a1f 0%, #0a0a0c 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(255,255,255,0.4)",
      fontFamily: "system-ui",
    }}
  >
    Loading player…
  </div>
);

const PlayerWrapper = dynamic(
  () => import("./PlayerWrapper").then((m) => m.PlayerWrapper),
  { ssr: false, loading: () => <PlayerSkeleton /> },
);

const GraphEditor = dynamic(
  () => import("./GraphEditor").then((m) => m.GraphEditor),
  { ssr: false },
);

type StreamState =
  | { phase: "idle" }
  | {
      phase: "streaming";
      total: number;
      received: number;
      // Older type was "mock" | "claude" | "gemini" — kept for reference.
      source: | "mock"
      | "claude"
      | "gemini"
      | "nim-gemma"
      | "nim-llama"
      | "agentic-nim"
      | "agentic-gemini"
      | "agentic-mixed";
    }
  | {
      phase: "done";
      source: | "mock"
      | "claude"
      | "gemini"
      | "nim-gemma"
      | "nim-llama"
      | "agentic-nim"
      | "agentic-gemini"
      | "agentic-mixed";
    }
  | { phase: "error"; message: string };

const humanSourceName = (
  s:
    | "mock"
    | "claude"
    | "gemini"
    | "nim-gemma"
    | "nim-llama"
    | "agentic-nim"
    | "agentic-gemini"
    | "agentic-mixed",
): string => {
  switch (s) {
    case "agentic-gemini":
      return "Agentic MoE · Gemini 2.5 Flash Lite";
    case "agentic-nim":
      return "Agentic MoE · NIM";
    case "agentic-mixed":
      return "Agentic MoE · Gemini + NIM";
    case "nim-gemma":
      return "NIM";
    case "nim-llama":
      return "NIM · Llama";
    case "gemini":
      return "Gemini 2.5 Flash Lite";
    case "claude":
      return "Claude";
    case "mock":
    default:
      return "mock generator";
  }
};

const sceneLabel = (s: Scene) => {
  switch (s.type) {
    case "kineticTitle":
      return s.lines.join(" / ");
    case "statReveal":
      return `${s.value}${s.suffix ?? ""} · ${s.label}`;
    case "featureGrid":
      return s.heading;
    case "productDemo":
      return s.caption ?? `Product demo · ${s.actions.length} actions`;
    case "testimonialQuote":
      return `"${s.quote.slice(0, 36)}…" — ${s.author}`;
    case "logoWall":
      return `${s.heading} · ${s.logos.length} logos`;
    case "ctaCard":
      return `${s.headline} → ${s.buttonLabel}`;
    case "multiScript":
      return `${s.glyphs.map((g) => g.char).join(" → ")} · ${s.caption ?? ""}`;
    case "productCarousel":
      return `${s.products.length} products · ${s.heading ?? ""}`;
    case "uiShowcase":
      return `${s.frame ?? "browser"} · ${s.caption ?? s.url ?? ""}`;
  }
};

const sceneIcon = (s: Scene) => {
  switch (s.type) {
    case "kineticTitle":
      return "T";
    case "statReveal":
      return "#";
    case "featureGrid":
      return "▦";
    case "productDemo":
      return "↘";
    case "testimonialQuote":
      return "❝";
    case "logoWall":
      return "▦";
    case "ctaCard":
      return "→";
    case "multiScript":
      return "अ";
    case "productCarousel":
      return "▣";
    case "uiShowcase":
      return "🖥";
  }
};

export default function Home() {
  const [storyboard, setStoryboard] = useState<Storyboard>(sampleStoryboards[0]);
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [color, setColor] = useState("#0EA5E9");
  const [accent, setAccent] = useState("#22D3EE");
  const [stream, setStream] = useState<StreamState>({ phase: "idle" });
  const [playerKey, setPlayerKey] = useState(0);
  const [trace, setTrace] = useState<{
    director:
      | { status: "thinking" | "done" | "failed"; message: string; ms?: number }
      | null;
    specialists: Record<
      number,
      {
        status: "thinking" | "done" | "failed";
        sceneType: Scene["type"];
        ms?: number;
      }
    >;
  }>({ director: null, specialists: {} });
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [viewMode, setViewMode] = useState<
    "welcome" | "generating" | "editor"
  >("welcome");
  const [presetFilter, setPresetFilter] = useState<PresetCategory | "all">(
    "all",
  );
  const [aspect, setAspect] = useState<Aspect>("vertical");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSavedBoards(listBoards());
  }, []);

  // ─── Dev preview: `?preview=loading` shows the generating screen with a
  //     simulated agent pipeline so you can iterate on its UI without
  //     burning real API calls. Hit `?preview=loading&stage=N` to start at
  //     a specific scene (0 = director thinking, 1+ = scenes complete).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("preview") !== "loading") return;

    const startStage = Number(url.searchParams.get("stage") ?? "0");
    const sample = sampleStoryboards[0];
    const total = Math.min(5, sample.scenes.length);

    setBrandName(sample.brand.name);
    setColor(sample.brand.color);
    setAccent(sample.brand.accent);
    setStoryboard({ brand: sample.brand, scenes: [] });
    setStream({
      phase: "streaming",
      total,
      received: 0,
      source: "agentic-nim",
    });
    setViewMode("generating");

    // Step 1: simulate director planning (0 → done after ~1.2s)
    const directorTimer = window.setTimeout(() => {
      setTrace({
        director: {
          status: "done",
          message: `Picked ${total} scenes · ${sample.scenes
            .slice(0, total)
            .map((s) => s.type)
            .join(" → ")}`,
          ms: 2100,
        },
        specialists: {},
      });
    }, 1200);

    // Step 2: simulate specialists completing one by one (every ~1.4s)
    const specialistTimers: number[] = [];
    for (let i = 0; i < total; i++) {
      // Mark thinking at start of slot
      specialistTimers.push(
        window.setTimeout(() => {
          setTrace((prev) => ({
            ...prev,
            specialists: {
              ...prev.specialists,
              [i]: {
                status: "thinking",
                sceneType: sample.scenes[i].type,
              },
            },
          }));
        }, 1400 + i * 1400),
      );
      // Mark done + push scene at end of slot
      specialistTimers.push(
        window.setTimeout(() => {
          setTrace((prev) => ({
            ...prev,
            specialists: {
              ...prev.specialists,
              [i]: {
                status: "done",
                sceneType: sample.scenes[i].type,
                ms: 800 + Math.round(Math.random() * 1200),
              },
            },
          }));
          setStoryboard((prev) => ({
            brand: sample.brand,
            scenes: [...prev.scenes, sample.scenes[i]],
          }));
          setStream({
            phase: "streaming",
            total,
            received: i + 1,
            source: "agentic-nim",
          });
        }, 2400 + i * 1400),
      );
    }

    // Jump to a specific stage if requested (useful for screenshotting)
    if (startStage > 0) {
      const completed = sample.scenes.slice(0, Math.min(startStage, total));
      const specialists: typeof trace.specialists = {};
      completed.forEach((s, i) => {
        specialists[i] = {
          status: "done",
          sceneType: s.type,
          ms: 800 + Math.round(Math.random() * 1200),
        };
      });
      window.clearTimeout(directorTimer);
      specialistTimers.forEach((t) => window.clearTimeout(t));
      setTrace({
        director: {
          status: "done",
          message: `Picked ${total} scenes · ${sample.scenes.slice(0, total).map((s) => s.type).join(" → ")}`,
          ms: 2100,
        },
        specialists,
      });
      setStoryboard({ brand: sample.brand, scenes: completed });
      setStream({
        phase: startStage >= total ? "done" : "streaming",
        total,
        received: completed.length,
        source: "agentic-nim",
      });
    }

    return () => {
      window.clearTimeout(directorTimer);
      specialistTimers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const SUGGESTIONS = [
    "Launch announcement for our AI agent platform with 50k developer users",
    "Hero ad for our async standup tool — Linear-style aesthetic",
    "Promo for our analytics platform showing 3× faster setup",
    "Product demo for a payment infrastructure with global support",
    "Launch teaser for a developer-first observability tool",
    "Ad for our calendar app with team scheduling features",
  ];

  const handleSave = () => {
    if (storyboard.scenes.length === 0) return;
    const saved = saveBoard(storyboard);
    setSavedBoards(listBoards());
    setActiveBoardId(saved.id);
    setJustSavedId(saved.id);
    window.setTimeout(() => setJustSavedId(null), 1800);
  };

  const handleLoadSaved = (board: SavedBoard) => {
    setStoryboard(board.storyboard);
    setBrandName(board.storyboard.brand.name);
    setColor(board.storyboard.brand.color);
    setAccent(board.storyboard.brand.accent);
    setActiveBoardId(board.id);
    setPlayerKey((k) => k + 1);
    setStream({ phase: "idle" });
    setViewMode("editor");
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBoard(id);
    setSavedBoards(listBoards());
    if (activeBoardId === id) setActiveBoardId(null);
  };

  const handleRename = (id: string) => {
    const current = savedBoards.find((b) => b.id === id);
    if (!current) return;
    const next = window.prompt("Rename storyboard", current.name);
    if (next === null) return;
    renameBoard(id, next);
    setSavedBoards(listBoards());
  };

  const generate = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStream({ phase: "streaming", total: 0, received: 0, source: "mock" });
    setActiveBoardId(null);
    setViewMode("generating");
    setTrace({ director: null, specialists: {} });
    setStoryboard({
      brand: { name: brandName, color, accent },
      scenes: [],
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          brand: { name: brandName, color, accent },
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const accumulated: Scene[] = [];
      let total = 0;
      let source:
        | "mock"
        | "claude"
        | "gemini"
        | "nim-gemma"
        | "nim-llama" = "mock";
      const liveBrand = { name: brandName, color, accent };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));
          if (event.type === "meta") {
            total = event.total;
            source = event.source;
            setStream({ phase: "streaming", total, received: 0, source });
            setStoryboard({ brand: liveBrand, scenes: [] });
            setPlayerKey((k) => k + 1);
          } else if (event.type === "scene") {
            accumulated.push(event.scene);
            setStoryboard({ brand: liveBrand, scenes: [...accumulated] });
            setPlayerKey((k) => k + 1);
            setStream({
              phase: "streaming",
              total,
              received: accumulated.length,
              source,
            });
          } else if (event.type === "done") {
            setStoryboard(event.storyboard);
            setPlayerKey((k) => k + 1);
            setStream({ phase: "done", source });
            window.setTimeout(() => setViewMode("editor"), 600);
          } else if (event.type === "agent") {
            if (event.agent === "director") {
              setTrace((prev) => ({
                ...prev,
                director: {
                  status: event.status,
                  message: event.message,
                  ms: "ms" in event ? event.ms : undefined,
                },
              }));
            } else if (event.agent === "specialist") {
              setTrace((prev) => ({
                ...prev,
                specialists: {
                  ...prev.specialists,
                  [event.index]: {
                    status: event.status,
                    sceneType: event.sceneType,
                    ms: "ms" in event ? event.ms : undefined,
                  },
                },
              }));
            }
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setStream({
        phase: "error",
        message: e instanceof Error ? e.message : "Generation failed",
      });
      setViewMode("welcome");
    }
  };

  const pickPreset = (sb: Storyboard) => {
    setStoryboard(sb);
    setBrandName(sb.brand.name);
    setColor(sb.brand.color);
    setAccent(sb.brand.accent);
    setActiveBoardId(null);
    setPlayerKey((k) => k + 1);
    setStream({ phase: "idle" });
    setViewMode("editor");
  };

  const totalSeconds = Math.round(
    storyboard.scenes.reduce((a, s) => a + s.duration, 0) / 30,
  );

  const streaming = stream.phase === "streaming";
  const hasScenes = storyboard.scenes.length > 0;

  if (viewMode === "welcome") {
    const filteredPresets = presets.filter(
      (p) => presetFilter === "all" || p.category === presetFilter,
    );
    return (
      <main
        className="relative min-h-screen overflow-x-hidden"
        style={{ color: "var(--ink)" }}
      >
        {/* ─── Atmospheric backdrop ─── */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, #FCDFCB 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, #E8A689 0%, transparent 55%), linear-gradient(180deg, var(--bg) 0%, var(--bg-warm) 100%)",
          }}
        />
        {/* Subtle grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* ─── Glassy pill nav ─── */}
        <header className="relative flex justify-center px-6 pt-6">
          <nav
            className="flex items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-2xl"
            style={{
              background:
                "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--ink) 12%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <span
              className="px-4 py-1.5 text-base"
              style={{ color: "var(--ink)" }}
            >
              <span
                className="italic"
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontWeight: 500,
                }}
              >
                motion
              </span>
              <span style={{ fontWeight: 600 }}>.saas</span>
            </span>
            <button
              onClick={() => {
                document
                  .getElementById("presets")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
              style={{ color: "var(--ink-muted)" }}
            >
              Presets
            </button>
            <button
              onClick={() => {
                document
                  .getElementById("examples")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
              style={{ color: "var(--ink-muted)" }}
            >
              Examples
            </button>
            {savedBoards.length > 0 ? (
              <button
                onClick={() => {
                  document
                    .getElementById("saved")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
                style={{ color: "var(--ink-muted)" }}
              >
                Saved
                <span className="ml-1.5 text-xs opacity-50">
                  {savedBoards.length}
                </span>
              </button>
            ) : null}
            <a
              href="https://github.com/vidhaan03/Saas.Motion"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
              style={{ color: "var(--ink-muted)" }}
            >
              GitHub
            </a>
            <button
              onClick={generate}
              disabled={streaming || prompt.trim().length === 0}
              className="ml-1 rounded-full px-5 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                background: "var(--ink)",
                color: "var(--bg)",
              }}
            >
              Generate
            </button>
          </nav>
        </header>

        {/* ─── Centered hero ─── */}
        <section className="relative flex min-h-[calc(100vh-100px)] flex-col items-center justify-center px-6 pb-12 pt-12">
          <h1
            className="text-center leading-[0.92] tracking-[-0.04em]"
            style={{
              fontSize: "clamp(72px, 11vw, 168px)",
              color: "var(--ink)",
            }}
          >
            <span
              className="italic"
              style={{
                fontFamily: "var(--font-serif), serif",
                fontWeight: 500,
              }}
            >
              motion
            </span>
            <span style={{ fontWeight: 700 }}>.saas</span>
          </h1>

          <p
            className="mt-7 max-w-xl text-center text-base sm:text-lg"
            style={{ color: "var(--ink-muted)", lineHeight: 1.5 }}
          >
            Turn a prompt into a cinematic SaaS launch ad in eight seconds.
            Multi-agent storyboards, brand-aware scenes, editable on a
            Mosaic-style canvas.
          </p>

          {/* Big prompt input */}
          <div className="mt-10 w-full max-w-2xl">
            <div
              className="group relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition focus-within:shadow-2xl"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 92%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Describe your product, the audience, and the one number worth shouting…"
                className="w-full resize-none bg-transparent p-5 pr-16 text-lg leading-snug outline-none"
                style={{
                  color: "var(--ink)",
                  fontSize: "clamp(15px, 1.4vw, 18px)",
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (!streaming && prompt.trim()) generate();
                  }
                }}
              />
              <button
                onClick={generate}
                disabled={streaming || prompt.trim().length === 0}
                title="Generate (Cmd+Enter)"
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-25"
                style={{
                  background: "var(--ink)",
                  color: "var(--bg)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>

            {/* Compact settings row */}
            <div
              className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[11px]"
              style={{ color: "var(--ink-muted)" }}
            >
              <span style={{ color: "var(--ink-faint)" }}>brand</span>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="—"
                className="w-24 bg-transparent text-center outline-none"
                style={{ color: "var(--ink)" }}
              />
              <span style={{ color: "var(--ink-faint)" }}>·</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-3 w-3 cursor-pointer appearance-none rounded-full border-0"
                  style={{ background: color }}
                />
                <span>{color}</span>
              </label>
              <span style={{ color: "var(--ink-faint)" }}>·</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-3 w-3 cursor-pointer appearance-none rounded-full border-0"
                  style={{ background: accent }}
                />
                <span>{accent}</span>
              </label>
              <span style={{ color: "var(--ink-faint)" }}>·</span>
              <div className="flex items-center gap-1">
                {ASPECTS.map((a) => {
                  const isActive = a === aspect;
                  return (
                    <button
                      key={a}
                      onClick={() => setAspect(a)}
                      className="rounded-full px-2 py-0.5 transition"
                      style={{
                        background: isActive ? "var(--ink)" : "transparent",
                        color: isActive ? "var(--bg)" : "var(--ink-muted)",
                      }}
                    >
                      {ASPECT_META[a].short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Example chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.slice(0, 4).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(s)}
                  className="rounded-full border px-3 py-1.5 text-xs backdrop-blur transition hover:scale-[1.02]"
                  style={{
                    background:
                      "color-mix(in srgb, var(--bg-elev) 60%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--ink) 10%, transparent)",
                    color: "var(--ink-muted)",
                  }}
                >
                  {s.length > 48 ? s.slice(0, 48) + "…" : s}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Below the fold: presets + examples + saved ─── */}
        <section
          id="presets"
          className="relative mx-auto w-full max-w-[1100px] px-8 pb-16 pt-12"
        >
          <div
            className="mb-4 flex items-baseline justify-between border-b pb-3 font-mono text-[11px] uppercase tracking-widest"
            style={{
              borderColor: "var(--rule)",
              color: "var(--ink-faint)",
            }}
          >
            <span>Presets</span>
            <span>
              {filteredPresets.length} of {presets.length} brands
            </span>
          </div>
          <div
            className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-widest"
          >
            <button
              onClick={() => setPresetFilter("all")}
              className="border-b transition"
              style={{
                borderColor:
                  presetFilter === "all" ? "var(--ink)" : "transparent",
                color:
                  presetFilter === "all"
                    ? "var(--ink)"
                    : "var(--ink-faint)",
              }}
            >
              all
            </button>
            {PRESET_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setPresetFilter(c)}
                className="border-b transition"
                style={{
                  borderColor:
                    presetFilter === c ? "var(--ink)" : "transparent",
                  color:
                    presetFilter === c
                      ? "var(--ink)"
                      : "var(--ink-faint)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-4">
            {filteredPresets.map((p) => {
              const sb = p.storyboard;
              const seconds = Math.round(
                sb.scenes.reduce((a, s) => a + s.duration, 0) / 30,
              );
              return (
                <button
                  key={sb.brand.name}
                  onClick={() => pickPreset(sb)}
                  className="group grid h-11 grid-cols-[12px_1fr_auto] items-center gap-3 border-b text-left transition"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span
                    className="h-2 w-2 rounded-full transition group-hover:scale-150"
                    style={{ background: sb.brand.accent }}
                  />
                  <span
                    className="min-w-0 truncate text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    {sb.brand.name.toLowerCase()}
                  </span>
                  <span
                    className="w-14 text-right font-mono text-[10px] tabular-nums"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    {sb.scenes.length}·{seconds}s
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          id="examples"
          className="relative mx-auto w-full max-w-[1100px] px-8 pb-16"
        >
          <div
            className="mb-4 flex items-baseline justify-between border-b pb-3 font-mono text-[11px] uppercase tracking-widest"
            style={{
              borderColor: "var(--rule)",
              color: "var(--ink-faint)",
            }}
          >
            <span>Example prompts</span>
            <span>click to load</span>
          </div>
          <div className="grid gap-y-2 sm:grid-cols-2 sm:gap-x-8">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setPrompt(s)}
                className="group flex items-baseline gap-3 text-left text-sm transition"
                style={{ color: "var(--ink-muted)" }}
              >
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="border-b border-transparent leading-relaxed group-hover:border-current"
                >
                  {s}
                </span>
              </button>
            ))}
          </div>
        </section>

        {savedBoards.length > 0 ? (
          <section
            id="saved"
            className="relative mx-auto w-full max-w-[1100px] px-8 pb-24"
          >
            <div
              className="mb-4 flex items-baseline justify-between border-b pb-3 font-mono text-[11px] uppercase tracking-widest"
              style={{
                borderColor: "var(--rule)",
                color: "var(--ink-faint)",
              }}
            >
              <span>Saved boards</span>
              <span>{savedBoards.length} saved</span>
            </div>
            <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
              {savedBoards.map((board) => {
                const seconds = Math.round(
                  board.storyboard.scenes.reduce(
                    (a, s) => a + s.duration,
                    0,
                  ) / 30,
                );
                return (
                  <button
                    key={board.id}
                    onClick={() => handleLoadSaved(board)}
                    className="group relative flex shrink-0 flex-col gap-1 rounded-lg border p-3 text-left transition"
                    style={{
                      width: 200,
                      background: "var(--bg-elev)",
                      borderColor: "var(--rule)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-sm"
                        style={{ color: "var(--ink)" }}
                      >
                        {board.name}
                      </span>
                      <span
                        onClick={(e) => handleDeleteSaved(board.id, e)}
                        className="opacity-0 transition hover:opacity-100 group-hover:opacity-50"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        ×
                      </span>
                    </div>
                    <div
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {board.storyboard.scenes.length}·{seconds}s
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(board.id);
                      }}
                      className="absolute right-2 top-2 text-[9px] opacity-0 transition group-hover:opacity-100"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      rename
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Floating "current project" indicator */}
        {hasScenes ? (
          <button
            onClick={() => setViewMode("editor")}
            className="fixed bottom-6 right-6 rounded-full border px-4 py-2 text-xs backdrop-blur-xl transition hover:scale-105"
            style={{
              background:
                "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--ink) 12%, transparent)",
              color: "var(--ink)",
              boxShadow: "var(--shadow)",
            }}
          >
            ↻ Current project
          </button>
        ) : null}
      </main>
    );

    // ─── LEGACY editorial welcome view (kept commented for reference) ───
    /* eslint-disable */
    /*
    return (
      <main className="min-h-screen bg-[#F5F1E8] text-[#2D2A26]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(45,42,38,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(45,42,38,0.04) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            backgroundPosition: "center",
          }}
        />

        <div className="relative flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-[#D4CCBC] px-8 py-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#6B655C]">
              motion.saas <span className="text-[#A39C8F]">/</span> new
            </div>
            <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              <span>{today}</span>
              <span className="hidden sm:inline">Gemini 3 · 30fps</span>
              {hasScenes ? (
                <button
                  onClick={() => setViewMode("editor")}
                  className="text-[#6B655C] transition hover:text-[#2D2A26]"
                >
                  ↻ current project
                </button>
              ) : null}
            </div>
          </header>

          <div className="flex flex-1 flex-col px-8 pb-12 pt-20 lg:pt-32">
            <div className="mx-auto w-full max-w-[920px]">
              <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                01 / Brief
              </div>
              <h1
                className="mt-3 font-[var(--font-serif)] leading-[0.95] tracking-[-0.02em]"
                style={{
                  fontSize: "clamp(56px, 8vw, 112px)",
                  fontWeight: 500,
                  fontFamily: "var(--font-serif), serif",
                }}
              >
                A SaaS launch ad.
                <br />
                <span style={{ color: "#A39C8F", fontStyle: "italic" }}>
                  In eight seconds.
                </span>
              </h1>

              <div className="mt-14 border-t border-[#D4CCBC] pt-8">
                <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                  02 / Prompt
                </div>
                <div className="mt-4 flex items-start gap-4">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="Describe your product, audience, and the one number worth shouting…"
                    className="flex-1 resize-none border-0 bg-transparent text-2xl font-medium leading-snug tracking-tight text-[#2D2A26] outline-none placeholder:text-[#A39C8F]"
                    style={{ fontSize: "clamp(20px, 2.2vw, 28px)" }}
                  />
                  <button
                    onClick={generate}
                    disabled={streaming || prompt.trim().length === 0}
                    title="Generate (Cmd+Enter)"
                    className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#D4CCBC] bg-[#2D2A26] text-[#F5F1E8] transition hover:scale-105 hover:border-[#2D2A26] disabled:cursor-not-allowed disabled:bg-[#D4CCBC] disabled:text-[#A39C8F]"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="13 6 19 12 13 18" />
                    </svg>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] text-[#6B655C]">
                  <span className="text-[#A39C8F]">brand</span>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="—"
                    className="w-28 border-0 bg-transparent text-[#2D2A26] outline-none placeholder:text-[#A39C8F]"
                  />
                  <span className="text-[#A39C8F]">·</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-3 w-3 cursor-pointer rounded-full border-0 bg-transparent appearance-none"
                      style={{ background: color }}
                    />
                    <span>{color}</span>
                  </label>
                  <span className="text-[#A39C8F]">·</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="h-3 w-3 cursor-pointer rounded-full border-0 bg-transparent appearance-none"
                      style={{ background: accent }}
                    />
                    <span>{accent}</span>
                  </label>
                </div>
              </div>

              <div className="mt-12 border-t border-[#D4CCBC] pt-8">
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                    03 / Format
                  </div>
                  <div className="font-mono text-[10px] text-[#A39C8F]">
                    {ASPECT_META[aspect].width}×{ASPECT_META[aspect].height} ·{" "}
                    {ASPECT_META[aspect].platforms}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {ASPECTS.map((a) => {
                    const meta = ASPECT_META[a];
                    const isActive = a === aspect;
                    return (
                      <button
                        key={a}
                        onClick={() => setAspect(a)}
                        className={`group flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-[#6B655C] bg-[#EFE9DC]"
                            : "border-[#D4CCBC] hover:border-[#A39C8F]"
                        }`}
                      >
                        <div
                          className="shrink-0 rounded-sm border border-[#6B655C]"
                          style={{
                            aspectRatio: meta.ratio,
                            width: a === "horizontal" ? 28 : a === "square" ? 22 : 16,
                            background: isActive
                              ? "rgba(255,255,255,0.18)"
                              : "rgba(255,255,255,0.04)",
                          }}
                        />
                        <div>
                          <div
                            className={`text-sm font-medium ${
                              isActive ? "text-[#2D2A26]" : "text-[#6B655C]"
                            }`}
                          >
                            {meta.label}
                          </div>
                          <div className="font-mono text-[10px] text-[#A39C8F]">
                            {meta.short}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-12 border-t border-[#D4CCBC] pt-8">
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                    04 / Examples
                  </div>
                  <div className="font-mono text-[10px] text-[#A39C8F]">
                    click to load
                  </div>
                </div>
                <div className="mt-4 grid gap-y-2 sm:grid-cols-2 sm:gap-x-8">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      className="group flex items-baseline gap-3 text-left text-sm text-[#6B655C] transition hover:text-[#2D2A26]"
                    >
                      <span className="font-mono text-[10px] text-[#A39C8F] group-hover:text-[#6B655C]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="border-b border-transparent leading-relaxed group-hover:border-[#6B655C]">
                        {s}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-12 border-t border-[#D4CCBC] pt-8">
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                    05 / Presets
                  </div>
                  <div className="font-mono text-[10px] text-[#A39C8F]">
                    {
                      presets.filter(
                        (p) =>
                          presetFilter === "all" || p.category === presetFilter,
                      ).length
                    }{" "}
                    of {presets.length} brands
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
                  <button
                    onClick={() => setPresetFilter("all")}
                    className={`border-b transition ${
                      presetFilter === "all"
                        ? "border-[#2D2A26] text-[#2D2A26]"
                        : "border-transparent text-[#A39C8F] hover:text-[#2D2A26]"
                    }`}
                  >
                    all
                  </button>
                  {PRESET_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setPresetFilter(c)}
                      className={`border-b transition ${
                        presetFilter === c
                          ? "border-[#2D2A26] text-[#2D2A26]"
                          : "border-transparent text-[#A39C8F] hover:text-[#2D2A26]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
                  {presets
                    .filter(
                      (p) =>
                        presetFilter === "all" || p.category === presetFilter,
                    )
                    .map((p) => {
                      const sb = p.storyboard;
                      const seconds = Math.round(
                        sb.scenes.reduce((a, s) => a + s.duration, 0) / 30,
                      );
                      return (
                        <button
                          key={sb.brand.name}
                          onClick={() => pickPreset(sb)}
                          className="group grid h-11 grid-cols-[12px_1fr_auto] items-center gap-3 border-b border-[#D4CCBC] text-left transition hover:border-[#6B655C]"
                        >
                          <span
                            className="h-2 w-2 rounded-full transition group-hover:scale-150"
                            style={{ background: sb.brand.accent }}
                          />
                          <span className="min-w-0 truncate text-sm text-[#2D2A26] transition group-hover:text-[#2D2A26]">
                            {sb.brand.name.toLowerCase()}
                          </span>
                          <span className="w-14 text-right font-mono text-[10px] tabular-nums text-[#A39C8F]">
                            {sb.scenes.length}·{seconds}s
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {savedBoards.length > 0 ? (
                <div className="mt-12 border-t border-[#D4CCBC] pt-8">
                  <div className="flex items-baseline justify-between">
                    <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                      06 / Recent
                    </div>
                    <div className="font-mono text-[10px] text-[#A39C8F]">
                      {savedBoards.length} saved
                    </div>
                  </div>
                  <div className="mt-4 -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
                    {savedBoards.map((board) => {
                      const seconds = Math.round(
                        board.storyboard.scenes.reduce(
                          (a, s) => a + s.duration,
                          0,
                        ) / 30,
                      );
                      return (
                        <button
                          key={board.id}
                          onClick={() => handleLoadSaved(board)}
                          className="group w-[200px] shrink-0 text-left"
                        >
                          <div
                            className="h-24 w-full rounded transition group-hover:scale-[1.02]"
                            style={{
                              background: `linear-gradient(135deg, ${board.storyboard.brand.color} 0%, ${board.storyboard.brand.accent} 100%)`,
                            }}
                          />
                          <div className="mt-2 truncate font-mono text-[11px] text-[#6B655C] group-hover:text-[#2D2A26]">
                            {board.name}
                          </div>
                          <div className="font-mono text-[10px] text-[#A39C8F]">
                            {board.storyboard.scenes.length} sc · {seconds}s
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="mt-auto border-t border-[#D4CCBC] px-8 py-4">
            <div className="mx-auto flex w-full max-w-[920px] items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              <span>v0.1 · prototype</span>
              <span>9:16 vertical · 1080×1920</span>
            </div>
          </footer>
        </div>
      </main>
    );
    */
    /* eslint-enable */
  }

  if (viewMode === "generating") {
    const sceneCount = storyboard.scenes.length;
    const total =
      stream.phase === "streaming" ? stream.total : sceneCount || 1;
    const progress = total > 0 ? sceneCount / total : 0;
    const sourceLabel =
      stream.phase === "streaming" || stream.phase === "done"
        ? humanSourceName(stream.source).toLowerCase()
        : "starting…";

    return (
      <main
        className="relative flex min-h-screen flex-col overflow-x-hidden"
        style={{ color: "var(--ink)" }}
      >
        {/* Atmospheric backdrop (same as welcome / editor) */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 15% 0%, #FCDFCB 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, #E8A689 0%, transparent 55%), linear-gradient(180deg, var(--bg) 0%, var(--bg-warm) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        {/* Glassy pill nav at top (matches welcome / editor) */}
        <header className="relative flex justify-center px-6 pt-6">
          <nav
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-2xl"
            style={{
              background:
                "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--ink) 12%, transparent)",
              boxShadow: "var(--shadow)",
            }}
          >
            <span
              className="px-2 py-1 text-base"
              style={{ color: "var(--ink)" }}
            >
              <span
                className="italic"
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontWeight: 500,
                }}
              >
                motion
              </span>
              <span style={{ fontWeight: 600 }}>.saas</span>
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              / generating
            </span>
            <span
              className="ml-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-muted)" }}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  stream.phase === "done" ? "" : "animate-pulse"
                }`}
                style={{
                  background:
                    stream.phase === "done"
                      ? "var(--ink-muted)"
                      : "var(--accent)",
                }}
              />
              {stream.phase === "done" ? "ready" : "live"}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              · {sourceLabel}
            </span>
          </nav>
        </header>

        <div className="relative flex flex-1 flex-col px-8 pb-12 pt-16 lg:pt-24">
          <div className="mx-auto w-full max-w-[960px]">
            <div
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              {stream.phase === "done"
                ? "Compiled · opening editor…"
                : sceneCount === 0
                  ? "Director planning the storyboard…"
                  : `Writing scene ${Math.min(sceneCount + 1, total)} of ${total}`}
            </div>
            <h1
              className="mt-3 flex flex-col tracking-[-0.04em]"
              style={{
                fontSize: "clamp(48px, 8vw, 128px)",
                lineHeight: 0.96,
              }}
            >
              <span
                className="block pb-[0.06em] font-black"
                style={{ color: "var(--ink)" }}
              >
                {storyboard.brand.name || "Storyboard"}
              </span>
              <span
                className="block italic"
                style={{
                  color: "var(--ink-faint)",
                  fontFamily: "var(--font-serif), serif",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                }}
              >
                in progress.
              </span>
            </h1>

            <div className="mt-14">
              <div
                className="mb-2 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                <span>
                  {sceneCount.toString().padStart(2, "0")} /{" "}
                  {total.toString().padStart(2, "0")} scenes
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div
                className="h-px w-full"
                style={{ background: "var(--rule)" }}
              >
                <div
                  className="h-px transition-all duration-500"
                  style={{
                    width: `${progress * 100}%`,
                    background: "var(--ink)",
                  }}
                />
              </div>
            </div>

              <div className="mt-12">
                {/* ─── Director agent card ─── */}
                <div
                  className="relative rounded-2xl border p-4 backdrop-blur transition-all"
                  style={{
                    animation: "sceneArrive 400ms ease-out",
                    background:
                      "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                    borderColor: trace.director?.status === "done"
                      ? "color-mix(in srgb, var(--ink) 18%, transparent)"
                      : "color-mix(in srgb, var(--ink) 10%, transparent)",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        background:
                          trace.director?.status === "done"
                            ? "var(--ink)"
                            : "color-mix(in srgb, var(--ink) 8%, transparent)",
                        color:
                          trace.director?.status === "done"
                            ? "var(--bg)"
                            : "var(--ink-muted)",
                      }}
                    >
                      <span className="text-xs">✦</span>
                    </span>
                    <div className="flex-1">
                      <div
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        director agent
                      </div>
                      <div
                        className="mt-0.5 text-sm font-medium"
                        style={{ color: "var(--ink)" }}
                      >
                        {trace.director?.message ?? "Spawning…"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-widest ${trace.director?.status === "thinking" ? "animate-pulse" : ""}`}
                        style={{
                          color:
                            trace.director?.status === "done"
                              ? "var(--ink-muted)"
                              : trace.director?.status === "failed"
                                ? "#B91C1C"
                                : "var(--accent)",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background:
                              trace.director?.status === "done"
                                ? "var(--ink-muted)"
                                : trace.director?.status === "failed"
                                  ? "#B91C1C"
                                  : "var(--accent)",
                          }}
                        />
                        {trace.director?.status === "done"
                          ? "Ready"
                          : trace.director?.status === "failed"
                            ? "Failed"
                            : "Planning"}
                      </div>
                      <div
                        className="mt-0.5 font-mono text-[10px]"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {trace.director?.ms !== undefined
                          ? `${(trace.director.ms / 1000).toFixed(1)}s`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Spine: vertical line from director down to the rail ─── */}
                {total > 0 ? (
                  <div className="relative mx-auto h-8 w-px">
                    <div
                      className="absolute inset-0"
                      style={{ background: "var(--rule)" }}
                    />
                    <div
                      className="absolute inset-x-0 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: "var(--ink-faint)" }}
                    />
                  </div>
                ) : null}

                {/* ─── Fan-out rail + label ─── */}
                {total > 0 ? (
                  <div className="relative flex items-center gap-3 px-1">
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--rule)" }}
                    />
                    <span
                      className="italic"
                      style={{
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-serif), serif",
                        fontWeight: 500,
                        fontSize: 14,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {total} specialist agents in parallel
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--rule)" }}
                    />
                  </div>
                ) : null}

                {/* ─── Specialist agent grid (each card hangs from the rail) ─── */}
                {total > 0 ? (
                <div
                  className="mt-0 grid gap-3"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                  }}
                >
                  {Array.from({ length: total }).map((_, idx) => {
                    const sp = trace.specialists[idx];
                    const scene = storyboard.scenes[idx];
                    const status: "queued" | "thinking" | "done" | "failed" =
                      scene
                        ? "done"
                        : sp?.status === "thinking"
                          ? "thinking"
                          : sp?.status === "failed"
                            ? "failed"
                            : "queued";
                    const isDone = status === "done";
                    const isThinking = status === "thinking";
                    const isQueued = status === "queued";
                    const isFailed = status === "failed";

                    const sceneType =
                      scene?.type ?? sp?.sceneType ?? null;
                    const shortType = sceneType
                      ? sceneType === "kineticTitle"
                        ? "title"
                        : sceneType === "statReveal"
                          ? "stat"
                          : sceneType === "featureGrid"
                            ? "grid"
                            : sceneType === "productDemo"
                              ? "demo"
                              : sceneType === "testimonialQuote"
                                ? "quote"
                                : sceneType === "logoWall"
                                  ? "logos"
                                  : sceneType === "ctaCard"
                                    ? "cta"
                                    : sceneType === "multiScript"
                                      ? "script"
                                      : sceneType === "productCarousel"
                                        ? "carousel"
                                        : "ui"
                      : "—";

                    const body = scene
                      ? scene.type === "kineticTitle"
                        ? scene.lines.join(" ")
                        : scene.type === "statReveal"
                          ? `${scene.value}${scene.suffix ?? ""} — ${scene.label}`
                          : scene.type === "featureGrid"
                            ? scene.heading
                            : scene.type === "productDemo"
                              ? scene.caption ??
                                `${scene.actions.length} cursor actions`
                              : scene.type === "testimonialQuote"
                                ? `"${scene.quote}"`
                                : scene.type === "logoWall"
                                  ? `${scene.heading} · ${scene.logos.length}`
                                  : scene.type === "ctaCard"
                                    ? `${scene.headline} → ${scene.buttonLabel}`
                                    : scene.type === "multiScript"
                                      ? scene.glyphs
                                          .map((g) => g.char)
                                          .join(" → ")
                                      : scene.type === "productCarousel"
                                        ? `${scene.products.length} products`
                                        : `${scene.frame ?? "browser"} showcase`
                      : isThinking
                        ? "Drafting…"
                        : isFailed
                          ? "Failed"
                          : "Queued";

                    return (
                      <div
                        key={idx}
                        className="relative flex flex-col rounded-xl border p-3 transition-all"
                        style={{
                          marginTop: 14, // room for the connector notch above
                          animation: "sceneArrive 500ms ease-out",
                          background: isDone
                            ? "var(--bg-elev)"
                            : "color-mix(in srgb, var(--bg-elev) 40%, transparent)",
                          borderColor: isDone
                            ? "color-mix(in srgb, var(--ink) 16%, transparent)"
                            : "color-mix(in srgb, var(--ink) 8%, transparent)",
                          boxShadow: isDone ? "var(--shadow)" : "none",
                          opacity: isQueued ? 0.55 : 1,
                        }}
                      >
                        {/* Connector notch dropping from the rail */}
                        <div
                          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                          style={{
                            top: -14,
                            width: 1,
                            height: 14,
                            background: "var(--rule)",
                          }}
                        />
                        <div
                          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                          style={{
                            top: -14,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: isDone
                              ? "var(--ink)"
                              : isThinking
                                ? "var(--accent)"
                                : isFailed
                                  ? "#B91C1C"
                                  : "var(--ink-faint)",
                            transform: "translate(-50%, -2.5px)",
                          }}
                        />
                        <div className="flex items-center justify-between">
                          <span
                            className="font-mono text-[10px]"
                            style={{ color: "var(--ink-faint)" }}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isThinking ? "animate-pulse" : ""}`}
                            style={{
                              background: isDone
                                ? "var(--ink)"
                                : isFailed
                                  ? "#B91C1C"
                                  : isThinking
                                    ? "var(--accent)"
                                    : "var(--ink-faint)",
                            }}
                          />
                        </div>
                        <div
                          className="mt-2 font-mono text-[10px] uppercase tracking-widest"
                          style={{
                            color: isDone
                              ? "var(--ink-muted)"
                              : "var(--ink-faint)",
                          }}
                        >
                          {shortType}
                        </div>
                        <div
                          className="mt-1.5 line-clamp-2 text-[12px] leading-snug"
                          style={{
                            color: isDone
                              ? "var(--ink)"
                              : "var(--ink-faint)",
                          }}
                        >
                          {body}
                        </div>
                        <div className="mt-auto pt-3">
                          <div
                            className="font-mono text-[10px]"
                            style={{ color: "var(--ink-faint)" }}
                          >
                            {sp?.ms !== undefined
                              ? `${(sp.ms / 1000).toFixed(1)}s`
                              : isThinking
                                ? "…"
                                : isFailed
                                  ? "—"
                                  : "—"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </div>
            </div>
          </div>

          <footer
            className="relative mt-auto border-t px-8 py-4 backdrop-blur"
            style={{
              borderColor:
                "color-mix(in srgb, var(--ink) 8%, transparent)",
              background:
                "color-mix(in srgb, var(--bg-elev) 50%, transparent)",
            }}
          >
            <div
              className="mx-auto flex w-full max-w-[960px] items-center justify-between font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              <span>streaming · server-sent events</span>
              <span>{sourceLabel}</span>
            </div>
          </footer>
        <style jsx global>{`
          @keyframes sceneArrive {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ color: "var(--ink)" }}
    >
      {/* ─── Atmospheric backdrop (same as welcome) ─── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 15% 0%, #FCDFCB 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, #E8A689 0%, transparent 55%), linear-gradient(180deg, var(--bg) 0%, var(--bg-warm) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* ─── Glassy top bar ─── */}
      <header className="sticky top-0 z-20 flex justify-center px-6 pt-6">
        <nav
          className="flex w-full max-w-[1400px] items-center gap-2 rounded-full border px-2 py-1.5 backdrop-blur-2xl"
          style={{
            background:
              "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--ink) 12%, transparent)",
            boxShadow: "var(--shadow)",
          }}
        >
          <button
            onClick={() => setViewMode("welcome")}
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5"
            style={{ color: "var(--ink-muted)" }}
            title="Back to welcome"
          >
            ← Home
          </button>
          <span
            className="px-2 py-1.5 text-base"
            style={{ color: "var(--ink)" }}
          >
            <span
              className="italic"
              style={{
                fontFamily: "var(--font-serif), serif",
                fontWeight: 500,
              }}
            >
              motion
            </span>
            <span style={{ fontWeight: 600 }}>.saas</span>
          </span>
          <span
            className="ml-1 hidden truncate font-mono text-xs uppercase tracking-widest sm:inline"
            style={{ color: "var(--ink-faint)" }}
          >
            / {storyboard.brand.name?.toLowerCase() || "new"}
          </span>

          <span
            className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest sm:inline"
            style={{ color: "var(--ink-faint)" }}
          >
            {ASPECT_META[aspect].width}×{ASPECT_META[aspect].height} · 30fps
          </span>

          <button
            onClick={handleSave}
            disabled={streaming || !hasScenes}
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: "var(--ink-muted)" }}
          >
            {justSavedId ? "Saved ✓" : "Save"}
          </button>
          <button
            onClick={() => setGraphOpen(true)}
            disabled={streaming || !hasScenes}
            className="rounded-full px-3 py-1.5 text-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: "var(--ink-muted)" }}
          >
            Graph
          </button>
          <button
            onClick={generate}
            disabled={streaming || prompt.trim().length === 0}
            className="rounded-full px-5 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            {streaming ? "Streaming…" : "Generate"}
          </button>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[360px_1fr]">
          <section
            className="space-y-4 lg:sticky lg:top-24 lg:self-start"
          >
            {/* Prompt card */}
            <div
              className="rounded-2xl border p-4 backdrop-blur-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Prompt
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:opacity-50"
                style={{ color: "var(--ink)" }}
                placeholder="What's the ad for?"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (!streaming && prompt.trim()) generate();
                  }
                }}
              />
            </div>

            {/* Brand card */}
            <div
              className="rounded-2xl border p-4 backdrop-blur-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Brand
              </div>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Brand name"
                className="mt-2 w-full bg-transparent text-base outline-none placeholder:opacity-50"
                style={{ color: "var(--ink)" }}
              />
              <div
                className="mt-3 flex items-center gap-3 border-t pt-3"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 6%, transparent)",
                }}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2 font-mono text-[11px]">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer appearance-none rounded-full border-0"
                    style={{ background: color }}
                  />
                  <div className="flex flex-col">
                    <span style={{ color: "var(--ink-faint)" }}>color</span>
                    <span style={{ color: "var(--ink)" }}>{color}</span>
                  </div>
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 font-mono text-[11px]">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-6 w-6 cursor-pointer appearance-none rounded-full border-0"
                    style={{ background: accent }}
                  />
                  <div className="flex flex-col">
                    <span style={{ color: "var(--ink-faint)" }}>accent</span>
                    <span style={{ color: "var(--ink)" }}>{accent}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Format pills */}
            <div
              className="rounded-2xl border p-3 backdrop-blur-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                className="px-1 pb-2 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                Format
              </div>
              <div className="flex gap-1">
                {ASPECTS.map((a) => {
                  const meta = ASPECT_META[a];
                  const isActive = a === aspect;
                  return (
                    <button
                      key={a}
                      onClick={() => setAspect(a)}
                      className="flex-1 rounded-xl px-2 py-2 text-xs transition"
                      style={{
                        background: isActive ? "var(--ink)" : "transparent",
                        color: isActive ? "var(--bg)" : "var(--ink-muted)",
                      }}
                    >
                      <div className="font-medium">{meta.label}</div>
                      <div
                        className="font-mono text-[10px]"
                        style={{ opacity: 0.7 }}
                      >
                        {meta.short}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {stream.phase === "error" ? (
              <div
                className="rounded-xl border p-3 text-xs"
                style={{
                  background: "rgba(220, 80, 60, 0.08)",
                  borderColor: "rgba(220, 80, 60, 0.25)",
                  color: "#a83a2c",
                }}
              >
                {stream.message}
              </div>
            ) : null}

            {/* Saved boards, collapsible */}
            {savedBoards.length > 0 ? (
              <details
                className="group rounded-2xl border p-3 backdrop-blur-xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--ink) 10%, transparent)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <summary
                  className="flex cursor-pointer items-center justify-between font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--ink-faint)" }}
                >
                  <span>Saved boards</span>
                  <span>{savedBoards.length}</span>
                </summary>
                <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {savedBoards.map((board) => {
                    const isActive = board.id === activeBoardId;
                    const scenesCount = board.storyboard.scenes.length;
                    const seconds = Math.round(
                      board.storyboard.scenes.reduce(
                        (a, s) => a + s.duration,
                        0,
                      ) / 30,
                    );
                    return (
                      <div
                        key={board.id}
                        onClick={() => handleLoadSaved(board)}
                        className="group/row flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-xs transition"
                        style={{
                          background: isActive
                            ? "color-mix(in srgb, var(--ink) 6%, transparent)"
                            : "transparent",
                          borderColor:
                            "color-mix(in srgb, var(--ink) 8%, transparent)",
                        }}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            background: board.storyboard.brand.color,
                            boxShadow: `inset 0 0 0 1px ${board.storyboard.brand.accent}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate"
                            style={{ color: "var(--ink)" }}
                          >
                            {board.name}
                          </div>
                          <div
                            className="mt-0.5 font-mono text-[10px]"
                            style={{ color: "var(--ink-faint)" }}
                          >
                            {scenesCount} · {seconds}s ·{" "}
                            {new Date(board.createdAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(board.id);
                          }}
                          title="Rename"
                          className="hidden h-6 w-6 items-center justify-center rounded transition group-hover/row:flex"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => handleDeleteSaved(board.id, e)}
                          title="Delete"
                          className="hidden h-6 w-6 items-center justify-center rounded transition hover:text-red-400 group-hover/row:flex"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : null}

            {/* Presets, collapsible */}
            <details
              className="rounded-2xl border p-3 backdrop-blur-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                boxShadow: "var(--shadow)",
              }}
            >
              <summary
                className="flex cursor-pointer items-center justify-between font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                <span>Try a preset</span>
                <span>{sampleStoryboards.length}</span>
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sampleStoryboards.map((sb) => {
                  const sceneCount = sb.scenes.length;
                  const seconds = Math.round(
                    sb.scenes.reduce((a, s) => a + s.duration, 0) / 30,
                  );
                  return (
                    <button
                      key={sb.brand.name}
                      onClick={() => pickPreset(sb)}
                      className="group/preset relative overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--ink) 8%, transparent)",
                        boxShadow: `0 8px 24px -12px ${sb.brand.accent}55`,
                      }}
                    >
                      <div
                        className="h-12 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${sb.brand.color} 0%, ${sb.brand.accent} 100%)`,
                        }}
                      />
                      <div
                        className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white/95 backdrop-blur-md"
                        style={{ background: "rgba(0,0,0,0.35)" }}
                      >
                        {seconds}s
                      </div>
                      <div
                        className="px-3 py-2"
                        style={{ background: "var(--bg-elev)" }}
                      >
                        <div
                          className="text-sm font-semibold tracking-tight"
                          style={{ color: sb.brand.accent }}
                        >
                          {sb.brand.name}
                        </div>
                        <div
                          className="mt-0.5 font-mono text-[10px]"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          {sceneCount} scenes
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </details>
          </section>

          <section className="min-w-0">
            <div className="mx-auto w-full max-w-[480px]">
              {/* Source / progress strip */}
              <div className="mb-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      streaming ? "animate-pulse" : ""
                    }`}
                    style={{
                      background: streaming
                        ? "var(--accent)"
                        : hasScenes
                          ? "color-mix(in srgb, var(--ink) 30%, transparent)"
                          : "color-mix(in srgb, var(--ink) 10%, transparent)",
                    }}
                  />
                  <span style={{ color: "var(--ink-muted)" }}>
                    {streaming
                      ? `Streaming from ${humanSourceName(stream.source)}`
                      : stream.phase === "done"
                        ? `Generated by ${humanSourceName(stream.source)}`
                        : hasScenes
                          ? "Ready"
                          : "Waiting for a prompt"}
                  </span>
                </div>
                {streaming && stream.total > 0 ? (
                  <span style={{ color: "var(--ink-muted)" }}>
                    {stream.received} / {stream.total} scenes
                  </span>
                ) : hasScenes ? (
                  <span style={{ color: "var(--ink-faint)" }}>
                    {storyboard.scenes.length} scenes · {totalSeconds}s
                  </span>
                ) : null}
              </div>

              {/* Scene progress dots */}
              {hasScenes ? (
                <div className="mb-3 flex gap-1.5">
                  {storyboard.scenes.map((s, i) => (
                    <div
                      key={`${playerKey}-${i}`}
                      className="flex-1 rounded-full"
                      style={{
                        height: 4,
                        background: storyboard.brand.accent,
                        opacity: 0.9,
                        animation: "sceneArrive 600ms ease-out",
                      }}
                      aria-label={sceneLabel(s)}
                    />
                  ))}
                  {streaming && stream.total > stream.received
                    ? Array.from({ length: stream.total - stream.received }).map(
                        (_, i) => (
                          <div
                            key={`pending-${i}`}
                            className="flex-1 rounded-full"
                            style={{
                              height: 4,
                              background:
                                "color-mix(in srgb, var(--ink) 12%, transparent)",
                            }}
                          />
                        ),
                      )
                    : null}
                </div>
              ) : null}

              {/* Player in a glassy frame */}
              <div
                className="rounded-2xl border p-3 backdrop-blur-xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--ink) 10%, transparent)",
                  boxShadow: "var(--shadow)",
                }}
              >
                {hasScenes ? (
                  <PlayerWrapper
                    key={playerKey}
                    storyboard={storyboard}
                    aspect={aspect}
                  />
                ) : (
                  <PlayerSkeleton />
                )}
              </div>
            </div>

            <div className="mx-auto mt-4 w-full max-w-[480px]">
              {hasScenes ? (
                <div className="space-y-1.5">
                  {storyboard.scenes.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-xs backdrop-blur"
                      style={{
                        animation: "sceneArrive 500ms ease-out",
                        background:
                          "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--ink) 8%, transparent)",
                      }}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded font-mono text-[10px]"
                        style={{
                          background: `${storyboard.brand.accent}22`,
                          color: storyboard.brand.accent,
                        }}
                      >
                        {sceneIcon(s)}
                      </span>
                      <span
                        className="flex-1 truncate"
                        style={{ color: "var(--ink)" }}
                      >
                        {sceneLabel(s)}
                      </span>
                      <span style={{ color: "var(--ink-faint)" }}>
                        {Math.round(s.duration / 30)}s
                      </span>
                    </div>
                  ))}
                  {streaming && stream.total > stream.received
                    ? Array.from({ length: stream.total - stream.received }).map(
                        (_, i) => (
                          <div
                            key={`pending-${i}`}
                            className="flex items-center gap-3 rounded-lg border px-3 py-2 text-xs"
                            style={{
                              borderColor:
                                "color-mix(in srgb, var(--ink) 8%, transparent)",
                              color: "var(--ink-faint)",
                            }}
                          >
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--ink) 4%, transparent)",
                              }}
                            >
                              <span
                                className="h-1 w-1 animate-pulse rounded-full"
                                style={{ background: "var(--ink-faint)" }}
                              />
                            </span>
                            <span className="flex-1">Drafting next scene…</span>
                          </div>
                        ),
                      )
                    : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {graphOpen ? (
        <GraphEditor
          storyboard={storyboard}
          aspect={aspect}
          onApply={(next) => {
            setStoryboard(next);
            setPlayerKey((k) => k + 1);
          }}
          onClose={() => setGraphOpen(false)}
        />
      ) : null}

      <style jsx global>{`
        @keyframes sceneArrive {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

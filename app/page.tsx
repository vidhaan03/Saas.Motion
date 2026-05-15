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
    | "agentic-mixed",
): string => {
  switch (s) {
    case "agentic-nim":
      return "Agentic MoE · NIM Gemma";
    case "agentic-mixed":
      return "Agentic MoE · NIM + Gemini";
    case "nim-gemma":
      return "NIM · Gemma 4 31B";
    case "nim-llama":
      return "NIM · Llama 3.1 405B";
    case "gemini":
      return "Gemini";
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
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
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
      <main className="min-h-screen bg-[#F5F1E8] text-[#2D2A26]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            backgroundPosition: "center",
          }}
        />

        <div className="relative flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-[#D4CCBC] px-8 py-5">
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#6B655C]">
              motion.saas <span className="text-[#A39C8F]">/</span> generating
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    stream.phase === "done"
                      ? "bg-[#6B655C]"
                      : "animate-pulse bg-[#C96442]"
                  }`}
                />
                {stream.phase === "done" ? "ready" : "live"}
              </span>
              <span>{sourceLabel}</span>
            </div>
          </header>

          <div className="flex flex-1 flex-col px-8 pb-12 pt-20 lg:pt-32">
            <div className="mx-auto w-full max-w-[920px]">
              <div className="font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                {stream.phase === "done"
                  ? "Compiled · opening editor…"
                  : sceneCount === 0
                    ? "Director planning the storyboard…"
                    : `Writing scene ${Math.min(sceneCount + 1, total)} of ${total}`}
              </div>
              <h1
                className="mt-3 flex flex-col font-black tracking-[-0.04em]"
                style={{
                  fontSize: "clamp(48px, 7vw, 96px)",
                  lineHeight: 1,
                }}
              >
                <span className="block pb-[0.08em]">
                  {storyboard.brand.name || "Storyboard"}
                </span>
                <span className="block text-[#A39C8F]">in progress.</span>
              </h1>

              <div className="mt-14">
                <div className="mb-2 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-[#A39C8F]">
                  <span>
                    {sceneCount.toString().padStart(2, "0")} /{" "}
                    {total.toString().padStart(2, "0")} scenes
                  </span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-px w-full bg-[#D4CCBC]">
                  <div
                    className="h-px bg-[#2D2A26] transition-all duration-500"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-10 space-y-1">
                {storyboard.scenes.map((scene, idx) => (
                  <div
                    key={idx}
                    className="flex items-baseline gap-4 border-b border-[#D4CCBC] py-3 text-sm"
                    style={{ animation: "sceneArrive 500ms ease-out" }}
                  >
                    <span className="w-6 font-mono text-[11px] text-[#A39C8F]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="w-32 font-mono text-[10px] uppercase tracking-widest text-[#6B655C]">
                      {scene.type === "kineticTitle"
                        ? "title"
                        : scene.type === "statReveal"
                          ? "stat"
                          : scene.type === "featureGrid"
                            ? "grid"
                            : scene.type === "productDemo"
                              ? "demo"
                              : scene.type === "testimonialQuote"
                                ? "quote"
                                : scene.type === "logoWall"
                                  ? "logos"
                                  : "cta"}
                    </span>
                    <span className="flex-1 truncate text-[#2D2A26]">
                      {scene.type === "kineticTitle"
                        ? scene.lines.join(" ")
                        : scene.type === "statReveal"
                          ? `${scene.value}${scene.suffix ?? ""} — ${scene.label}`
                          : scene.type === "featureGrid"
                            ? scene.heading
                            : scene.type === "productDemo"
                              ? scene.caption ?? `${scene.actions.length} cursor actions`
                              : scene.type === "testimonialQuote"
                                ? `"${scene.quote}"`
                                : scene.type === "logoWall"
                                  ? `${scene.heading} · ${scene.logos.length}`
                                  : scene.type === "ctaCard"
                                    ? `${scene.headline} → ${scene.buttonLabel}`
                                    : scene.type === "multiScript"
                                      ? scene.glyphs.map((g) => g.char).join(" → ")
                                      : scene.type === "productCarousel"
                                        ? `${scene.products.length} products`
                                        : `${scene.frame ?? "browser"} showcase`}
                    </span>
                    <span className="font-mono text-[10px] text-[#A39C8F]">
                      {Math.round(scene.duration / 30)}s
                    </span>
                  </div>
                ))}
                {stream.phase === "streaming" && sceneCount < total
                  ? Array.from({ length: Math.max(1, total - sceneCount) }).map(
                      (_, i) => (
                        <div
                          key={`pending-${i}`}
                          className="flex items-baseline gap-4 border-b border-[#D4CCBC] py-3 text-sm text-[#A39C8F]"
                        >
                          <span className="w-6 font-mono text-[11px]">
                            {String(sceneCount + i + 1).padStart(2, "0")}
                          </span>
                          <span className="w-32 font-mono text-[10px] uppercase tracking-widest">
                            {i === 0 ? "drafting" : "queued"}
                          </span>
                          <span className="flex-1 flex items-center gap-1">
                            {i === 0 ? (
                              <>
                                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F]" />
                                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.2s]" />
                                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.4s]" />
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </span>
                        </div>
                      ),
                    )
                  : null}
              </div>
            </div>
          </div>

          <footer className="mt-auto border-t border-[#D4CCBC] px-8 py-4">
            <div className="mx-auto flex w-full max-w-[920px] items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              <span>streaming · server-sent events</span>
              <span>{sourceLabel}</span>
            </div>
          </footer>
        </div>
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
    <main className="min-h-screen bg-[#F5F1E8] text-[#2D2A26]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("welcome")}
              className="rounded-md border border-[#D4CCBC] px-2.5 py-1.5 text-[11px] text-[#6B655C] transition hover:border-[#6B655C] hover:text-[#2D2A26]"
              title="Back to welcome"
            >
              ← Home
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#6B655C]">
                motion.saas — editor
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Prompt → SaaS launch ad
              </h1>
            </div>
          </div>
          <div className="text-xs text-[#6B655C]">
            1080×1920 · 30fps · streaming preview
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          <section className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-widest text-[#6B655C]">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] p-3 text-sm outline-none transition focus:border-[#6B655C]"
                placeholder="What's the ad for?"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-[#6B655C]">
                Brand name
              </label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] p-3 text-sm outline-none transition focus:border-[#6B655C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-[#6B655C]">
                  Brand color
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] p-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-md border-0 bg-transparent"
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-[#6B655C]">
                  Accent
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] p-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-md border-0 bg-transparent"
                  />
                  <input
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={generate}
                disabled={streaming}
                className="relative flex-1 overflow-hidden rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-[#1a1815] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10">
                  {streaming ? "Streaming…" : "Generate"}
                </span>
                {streaming && stream.total > 0 ? (
                  <span
                    className="absolute inset-y-0 left-0 z-0 bg-[#F5F1E8]/20 transition-all"
                    style={{
                      width: `${(stream.received / stream.total) * 100}%`,
                    }}
                  />
                ) : null}
              </button>
              <button
                onClick={handleSave}
                disabled={streaming || !hasScenes}
                title="Save current storyboard to your library"
                className="rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] px-4 py-3 text-sm font-medium text-[#2D2A26] transition hover:border-[#6B655C] hover:text-[#2D2A26] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {justSavedId ? "Saved ✓" : "Save"}
              </button>
              <button
                onClick={() => setGraphOpen(true)}
                disabled={streaming || !hasScenes}
                title="Open node graph editor"
                className="rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] px-4 py-3 text-sm font-medium text-[#2D2A26] transition hover:border-[#6B655C] hover:text-[#2D2A26] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Graph
              </button>
            </div>

            {stream.phase === "error" ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {stream.message}
              </div>
            ) : null}

            {savedBoards.length > 0 ? (
              <div className="pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-[#6B655C]">
                    My storyboards
                  </div>
                  <div className="text-[10px] text-[#A39C8F]">
                    {savedBoards.length} saved
                  </div>
                </div>
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
                        className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-xs transition ${
                          isActive
                            ? "border-[#6B655C] bg-[#EFE9DC]"
                            : "border-[#D4CCBC] bg-[#FAF6EE] hover:border-[#D4CCBC] hover:bg-[#EFE9DC]"
                        }`}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            background: board.storyboard.brand.color,
                            boxShadow: `inset 0 0 0 1px ${board.storyboard.brand.accent}`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[#2D2A26]">
                            {board.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-[#6B655C]">
                            {scenesCount} scenes · {seconds}s ·{" "}
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
                          className="hidden h-6 w-6 items-center justify-center rounded text-[#A39C8F] transition hover:bg-[#D4CCBC] hover:text-[#2D2A26] group-hover:flex"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => handleDeleteSaved(board.id, e)}
                          title="Delete"
                          className="hidden h-6 w-6 items-center justify-center rounded text-[#A39C8F] transition hover:bg-red-500/20 hover:text-red-300 group-hover:flex"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-[#6B655C]">
                  Try a preset
                </div>
                <div className="text-[10px] text-[#A39C8F]">
                  {sampleStoryboards.length} ready
                </div>
              </div>
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
                      className="group relative overflow-hidden rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] text-left transition hover:-translate-y-0.5 hover:border-[#6B655C]"
                      style={{
                        boxShadow: `0 10px 30px -15px ${sb.brand.accent}55, inset 0 0 0 1px ${sb.brand.accent}22`,
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
                      <div className="px-3 py-2.5">
                        <div
                          className="text-sm font-semibold tracking-tight"
                          style={{ color: sb.brand.accent }}
                        >
                          {sb.brand.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#6B655C]">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: sb.brand.color }}
                          />
                          {sceneCount} scenes
                        </div>
                      </div>
                      <div
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                        style={{ background: sb.brand.accent }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <details className="rounded-xl border border-[#D4CCBC] bg-[#FAF6EE] p-3 text-xs text-[#6B655C]">
              <summary className="cursor-pointer text-[#2D2A26]">
                Current storyboard JSON
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto text-[10px] leading-relaxed text-[#6B655C]">
                {JSON.stringify(storyboard, null, 2)}
              </pre>
            </details>
          </section>

          <section>
            <div className="mx-auto max-w-[440px]">
              {(streaming || stream.phase === "done") && (
                <div className="mb-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        streaming
                          ? "animate-pulse bg-[#C96442]"
                          : "bg-white/30"
                      }`}
                    />
                    <span className="text-[#6B655C]">
                      {streaming
                        ? `Streaming from ${stream.source === "claude" ? "Claude" : stream.source === "gemini" ? "Gemini" : "mock generator"}`
                        : `Generated by ${stream.phase === "done" ? (stream.source === "claude" ? "Claude" : stream.source === "gemini" ? "Gemini" : "mock generator") : ""}`}
                    </span>
                  </div>
                  {streaming && stream.total > 0 ? (
                    <span className="text-[#6B655C]">
                      {stream.received} / {stream.total} scenes
                    </span>
                  ) : null}
                </div>
              )}

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
                            className="flex-1 rounded-full bg-[#D4CCBC]"
                            style={{ height: 4 }}
                          />
                        ),
                      )
                    : null}
                </div>
              ) : null}

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

            <div className="mx-auto mt-4 max-w-[440px]">
              {hasScenes ? (
                <div className="space-y-1.5">
                  {storyboard.scenes.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-[#D4CCBC] bg-[#FAF6EE] px-3 py-2 text-xs"
                      style={{ animation: "sceneArrive 500ms ease-out" }}
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
                      <span className="flex-1 truncate text-[#2D2A26]">
                        {sceneLabel(s)}
                      </span>
                      <span className="text-[#A39C8F]">
                        {Math.round(s.duration / 30)}s
                      </span>
                    </div>
                  ))}
                  {streaming && stream.total > stream.received
                    ? Array.from({ length: stream.total - stream.received }).map(
                        (_, i) => (
                          <div
                            key={`pending-${i}`}
                            className="flex items-center gap-3 rounded-lg border border-[#D4CCBC] bg-white/[0.01] px-3 py-2 text-xs text-[#A39C8F]"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5">
                              <span className="h-1 w-1 animate-pulse rounded-full bg-[#A39C8F]" />
                            </span>
                            <span className="flex-1">Drafting next scene…</span>
                          </div>
                        ),
                      )
                    : null}
                </div>
              ) : null}
              {!streaming && stream.phase !== "error" ? (
                <div className="mt-4 text-center text-xs text-[#6B655C]">
                  {storyboard.scenes.length} scenes · {totalSeconds}s
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

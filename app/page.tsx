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
import { humanSourceName, type SourceTag } from "../lib/sourceLabel";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import type { Scene, Storyboard } from "../remotion/schema";
import type { TypefaceKey } from "../remotion/fonts";
import type { VibeKey } from "../remotion/vibes";
import { AtmosphericBackdrop } from "./components/AtmosphericBackdrop";
import { MotionLogotype } from "./components/MotionLogotype";
import { TypefacePicker } from "./components/TypefacePicker";
import { VibePicker } from "./components/VibePicker";
import { PillNav } from "./components/PillNav";
import { ThemeToggle } from "./components/ThemeToggle";
import { UserMenu } from "./components/UserMenu";
import { DirectorCard } from "./components/agents/DirectorCard";
import { SpecialistGrid } from "./components/agents/SpecialistGrid";
import { useRouter } from "next/navigation";

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
  | { phase: "streaming"; total: number; received: number; source: SourceTag }
  | { phase: "done"; source: SourceTag }
  | { phase: "error"; message: string };

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
  const [typeface, setTypeface] = useState<TypefaceKey | undefined>(
    undefined,
  );
  const [vibe, setVibe] = useState<VibeKey | undefined>(undefined);
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
  const router = useRouter();

  useEffect(() => {
    setSavedBoards(listBoards());
  }, []);

  // Sync brand-kit form state into the active storyboard so the Player
  // re-renders when the user edits brand name / color / accent / typeface.
  // Without this, brand inputs only land in the storyboard on load /
  // generate; live edits in the sidebar would have no visual effect.
  useEffect(() => {
    setStoryboard((prev) => {
      const same =
        prev.brand.name === brandName &&
        prev.brand.color === color &&
        prev.brand.accent === accent &&
        prev.brand.typeface === typeface &&
        prev.brand.vibe === vibe;
      if (same) return prev;
      return {
        ...prev,
        brand: {
          ...prev.brand,
          name: brandName,
          color,
          accent,
          typeface,
          vibe,
        },
      };
    });
    // NOTE: previously bumped playerKey here, but that remounted the
    // Player on every keystroke in the brand picker — caused the video
    // to pause/restart constantly. Remotion's Player picks up storyboard
    // prop changes without a remount; key bumping is only needed when
    // the underlying composition shape changes (scene count, fps, etc).
  }, [brandName, color, accent, typeface, vibe]);

  // Restore prompt from `?prompt=` URL param — used when user returns from
  // the /login page after gating Generate.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const restored = url.searchParams.get("prompt");
    if (restored) {
      setPrompt(restored);
      // Clean the URL so refreshes don't keep restoring
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
    }
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
    setTypeface(sample.brand.typeface);
    setVibe(sample.brand.vibe);
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
    setTypeface(board.storyboard.brand.typeface);
    setVibe(board.storyboard.brand.vibe);
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
    // Auth gate: generation costs Gemini/NIM quota, so it requires a signed-in
    // user. Anonymous users can still browse, edit, save to localStorage.
    //
    // Dev bypass: set NEXT_PUBLIC_DEV_BYPASS_AUTH=true in .env.local to skip
    // this check during local dev (e.g. when hitting Supabase's email rate
    // limit). Never set this on Vercel production env vars.
    const bypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !bypass) {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const next =
          "/?prompt=" + encodeURIComponent(prompt.trim().slice(0, 500));
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStream({ phase: "streaming", total: 0, received: 0, source: "mock" });
    setActiveBoardId(null);
    setViewMode("generating");
    setTrace({ director: null, specialists: {} });
    setStoryboard({
      brand: { name: brandName, color, accent, typeface, vibe },
      scenes: [],
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          brand: { name: brandName, color, accent, typeface, vibe },
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
      let source: SourceTag = "mock";
      const liveBrand = { name: brandName, color, accent, typeface, vibe };

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

  // FLUX-based parallel generator. Single non-streaming endpoint that
  // plans 5-8 shots + fires image gen in parallel. Returns the full
  // storyboard at once when ready (~5-15s wall time). Mirrors
  // generate()'s auth gate + view transitions so the user sees the
  // generating screen during the wait.
  const generateVisual = async () => {
    const bypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !bypass) {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const next =
          "/?prompt=" + encodeURIComponent(prompt.trim().slice(0, 500));
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStream({
      phase: "streaming",
      total: 0,
      received: 0,
      source: "agentic-flux" as SourceTag,
    });
    setActiveBoardId(null);
    setViewMode("generating");
    setTrace({ director: null, specialists: {} });
    const liveBrand = { name: brandName, color, accent, typeface, vibe };
    setStoryboard({ brand: liveBrand, scenes: [] });

    try {
      const res = await fetch("/api/generate-visual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, brand: liveBrand }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        storyboard: Storyboard;
        designNotes?: string;
        imagesGenerated: number;
        imagesFailed: number;
        source: SourceTag;
      };
      setStoryboard(data.storyboard);
      setStream({ phase: "done", source: data.source });
      setPlayerKey((k) => k + 1);
      window.setTimeout(() => setViewMode("editor"), 600);
    } catch (e) {
      if (controller.signal.aborted) {
        setViewMode("welcome");
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      console.error("[generateVisual] failed:", message);
      setStream({ phase: "error", message });
      setViewMode("welcome");
    }
  };

  const pickPreset = (sb: Storyboard) => {
    setStoryboard(sb);
    setBrandName(sb.brand.name);
    setColor(sb.brand.color);
    setAccent(sb.brand.accent);
    setTypeface(sb.brand.typeface);
    setVibe(sb.brand.vibe);
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
        <AtmosphericBackdrop />

        {/* ─── Mode toggle (Video / Docs) — anchored top-left ─── */}
        <div
          className="fixed left-6 top-6 z-30 flex items-center gap-0.5 rounded-full border p-0.5 backdrop-blur-2xl"
          style={{
            background:
              "color-mix(in srgb, var(--bg-elev) 85%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--ink) 12%, transparent)",
            boxShadow: "var(--shadow)",
          }}
        >
          <span
            className="rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            Video
          </span>
          <a
            href="/docs-saas"
            className="rounded-full px-4 py-1.5 text-sm transition hover:bg-black/5"
            style={{ color: "var(--ink-muted)" }}
          >
            Docs.Saas
          </a>
        </div>

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
            <span className="px-4 py-1.5">
              <MotionLogotype />
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
            <UserMenu nextPath="/" />
            <button
              onClick={generateVisual}
              disabled={streaming || prompt.trim().length === 0}
              title="Generate with FLUX-driven cinematic visuals (slower, image-heavy)"
              className="ml-1 rounded-full border px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                borderColor: "color-mix(in srgb, var(--ink) 18%, transparent)",
                background:
                  "color-mix(in srgb, var(--bg-elev) 75%, transparent)",
                color: "var(--ink)",
              }}
            >
              ✦ Visual
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
          {/* Editorial section header — matches the hero's serif/sans hybrid */}
          <div
            className="mb-6 flex items-end justify-between border-b pb-4"
            style={{ borderColor: "var(--rule)" }}
          >
            <div className="flex items-baseline gap-3">
              <span
                className="font-mono text-[11px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                01
              </span>
              <h2
                className="tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  lineHeight: 1,
                  color: "var(--ink)",
                }}
              >
                Presets
              </h2>
            </div>
            <span
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              {filteredPresets.length} of {presets.length} brands
            </span>
          </div>

          {/* Category filter — minimal text chips, active gets ink underline */}
          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
            {(["all", ...PRESET_CATEGORIES] as const).map((c) => {
              const isActive = presetFilter === c;
              return (
                <button
                  key={c}
                  onClick={() =>
                    setPresetFilter(c as typeof presetFilter)
                  }
                  className="border-b pb-0.5 transition"
                  style={{
                    borderColor: isActive ? "var(--ink)" : "transparent",
                    color: isActive ? "var(--ink)" : "var(--ink-faint)",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Preset rows — minimal: tiny dot, name + category, metadata */}
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPresets.map((p) => {
              const sb = p.storyboard;
              const seconds = Math.round(
                sb.scenes.reduce((a, s) => a + s.duration, 0) / 30,
              );
              return (
                <button
                  key={sb.brand.name}
                  onClick={() => pickPreset(sb)}
                  className="group flex items-baseline gap-3 border-b py-3 text-left transition"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {/* Tiny accent dot */}
                  <span
                    className="block h-2 w-2 shrink-0 translate-y-[3px] rounded-full transition group-hover:scale-[1.6]"
                    style={{ background: sb.brand.accent }}
                  />
                  {/* Brand name + italic category */}
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span
                      className="truncate text-[15px] font-medium"
                      style={{
                        color: "var(--ink)",
                        letterSpacing: "-0.01em",
                      }}
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
                  {/* Metadata — single inline string */}
                  <span
                    className="shrink-0 font-mono text-[10px] tabular-nums"
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
          {/* Editorial section header */}
          <div
            className="mb-6 flex items-end justify-between border-b pb-4"
            style={{ borderColor: "var(--rule)" }}
          >
            <div className="flex items-baseline gap-3">
              <span
                className="font-mono text-[11px] uppercase tracking-widest"
                style={{ color: "var(--ink-faint)" }}
              >
                02
              </span>
              <h2
                className="tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  lineHeight: 1,
                  color: "var(--ink)",
                }}
              >
                Example prompts
              </h2>
            </div>
            <span
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              click to load
            </span>
          </div>

          {/* Prompt rows — minimal: tabular number + text + bottom rule */}
          <div className="grid gap-x-12 sm:grid-cols-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => setPrompt(s)}
                className="group flex items-baseline gap-4 border-b py-3.5 text-left transition"
                style={{ borderColor: "var(--rule)" }}
              >
                <span
                  className="shrink-0 font-mono text-[10px] tabular-nums"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-sm leading-relaxed transition group-hover:translate-x-0.5"
                  style={{ color: "var(--ink)" }}
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
            className="fixed bottom-20 right-6 rounded-full border px-4 py-2 text-xs backdrop-blur-xl transition hover:scale-105"
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

        {/* Floating theme toggle — visible across the whole welcome view */}
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur-2xl"
          style={{
            background:
              "color-mix(in srgb, var(--bg-elev) 85%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--ink) 12%, transparent)",
            boxShadow: "var(--shadow)",
          }}
        >
          <a
            href="/docs"
            className="font-mono text-[10px] uppercase tracking-widest transition hover:opacity-70"
            style={{ color: "var(--ink-faint)" }}
          >
            docs
          </a>
          <span
            className="h-3 w-px"
            style={{ background: "color-mix(in srgb, var(--ink) 12%, transparent)" }}
          />
          <ThemeToggle compact />
        </div>
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
              <div className="flex items-center gap-4">
                <a
                  href="/docs"
                  className="transition hover:text-[#2D2A26]"
                >
                  docs
                </a>
                <span>9:16 vertical · 1080×1920</span>
              </div>
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
        <AtmosphericBackdrop />

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
            <span className="px-2 py-1">
              <MotionLogotype />
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

              <div className="mt-12 space-y-6">
                <DirectorCard trace={trace.director} />
                <SpecialistGrid
                  total={total}
                  specialists={trace.specialists}
                  scenes={storyboard.scenes}
                />
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
              <div className="flex items-center gap-4">
                <a
                  href="/docs"
                  className="transition hover:opacity-80"
                  style={{ color: "var(--ink-faint)" }}
                >
                  docs
                </a>
                <span>{sourceLabel}</span>
              </div>
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
      <AtmosphericBackdrop />

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
          <span className="px-2 py-1.5">
            <MotionLogotype />
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
              <div
                className="mt-3 border-t pt-3"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 6%, transparent)",
                }}
              >
                <div
                  className="mb-2 font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Vibe
                </div>
                <VibePicker value={vibe} onChange={setVibe} />
              </div>
              <div
                className="mt-3 border-t pt-3"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--ink) 6%, transparent)",
                }}
              >
                <div
                  className="mb-2 font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Typeface
                </div>
                <TypefacePicker value={typeface} onChange={setTypeface} />
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

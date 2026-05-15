"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  NodeToolbar,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { Thumbnail } from "@remotion/player";
import { Video } from "../remotion/Video";
import type { Brand, Scene, Storyboard } from "../remotion/schema";
import { SceneEditor } from "./SceneEditor";

export type SceneNodeData = {
  scene: Scene;
  brand: Storyboard["brand"];
  index: number;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onChange?: (id: string, next: Scene) => void;
};

const TYPE_META: Record<
  Scene["type"],
  { label: string; icon: string; accent: string; description: string }
> = {
  kineticTitle: {
    label: "Kinetic Title",
    icon: "T",
    accent: "#A4B0F5",
    description: "Animated headline + emoji",
  },
  statReveal: {
    label: "Stat Reveal",
    icon: "#",
    accent: "#22D3EE",
    description: "Number count-up with label",
  },
  featureGrid: {
    label: "Feature Grid",
    icon: "▦",
    accent: "#F472B6",
    description: "Three-up feature cards",
  },
  productDemo: {
    label: "Product Demo",
    icon: "↘",
    accent: "#F59E0B",
    description: "Cursor walkthrough + zoom",
  },
  testimonialQuote: {
    label: "Testimonial",
    icon: "❝",
    accent: "#FCD34D",
    description: "Customer quote + author",
  },
  logoWall: {
    label: "Logo Wall",
    icon: "▦",
    accent: "#34D399",
    description: "Trusted-by logos grid",
  },
  ctaCard: {
    label: "CTA Card",
    icon: "→",
    accent: "#FB7185",
    description: "Headline + button + URL",
  },
  multiScript: {
    label: "Multi-Script",
    icon: "अ",
    accent: "#FF6A00",
    description: "Cinematic glyph morph across scripts",
  },
  productCarousel: {
    label: "Product Carousel",
    icon: "▣",
    accent: "#1E40AF",
    description: "Scrolling product cards with featured highlight",
  },
  uiShowcase: {
    label: "UI Showcase",
    icon: "🖥",
    accent: "#8B5CF6",
    description: "Web/phone frame + uploaded screenshot + animation",
  },
};

const sceneSummary = (scene: Scene): string => {
  switch (scene.type) {
    case "kineticTitle":
      return scene.lines.join(" / ");
    case "statReveal":
      return `${scene.value}${scene.suffix ?? ""} · ${scene.label}`;
    case "featureGrid":
      return `${scene.heading} · ${scene.features.length} cards`;
    case "productDemo":
      return scene.caption ?? `${scene.actions.length} actions`;
    case "testimonialQuote":
      return `"${scene.quote.slice(0, 40)}…" — ${scene.author}`;
    case "logoWall":
      return `${scene.heading} · ${scene.logos.length} logos`;
    case "ctaCard":
      return `${scene.headline} → ${scene.buttonLabel}`;
    case "multiScript":
      return `${scene.glyphs.map((g) => g.char).join(" → ")} · ${scene.caption ?? ""}`;
    case "productCarousel":
      return `${scene.products.length} products · ${scene.heading ?? "Carousel"}`;
    case "uiShowcase":
      return `${scene.frame ?? "browser"} · ${scene.animation ?? "scroll"} · ${scene.caption ?? scene.url ?? ""}`;
  }
};

// Tiny Remotion-rendered preview of a single scene. Renders at the scene's
// natural 9:16 aspect but masked to a landscape strip via parent overflow,
// so the node body stays compact.
const THUMB_W = 232;
const THUMB_H = 130;
const ThumbnailStrip: React.FC<{
  scene: Scene;
  brand: Storyboard["brand"];
  meta: { icon: string; accent: string };
}> = ({ scene, brand, meta }) => {
  // Memoize the single-scene storyboard so Remotion doesn't re-mount on every
  // node-graph render (e.g., while dragging another node).
  const storyboard = useMemo<Storyboard>(
    () => ({ brand, scenes: [scene] }),
    [scene, brand],
  );

  // Pick a frame near the middle of the scene where most animations have
  // landed but exit fade hasn't started.
  const frameToDisplay = Math.max(8, Math.floor(scene.duration * 0.45));

  // Vertical canvas (1080x1920) rendered at width=THUMB_W → height = 412.
  // We center the middle 130px band via marginTop offset.
  const naturalHeight = (THUMB_W * 1920) / 1080;
  const yOffset = -(naturalHeight - THUMB_H) / 2;

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        width: THUMB_W,
        height: THUMB_H,
        background: "#08080b",
        boxShadow: `inset 0 0 0 1px ${meta.accent}22`,
      }}
    >
      <div style={{ position: "absolute", top: yOffset, left: 0 }}>
        <Thumbnail
          component={Video}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          durationInFrames={Math.max(scene.duration, 30)}
          frameToDisplay={frameToDisplay}
          inputProps={{ storyboard }}
          style={{ width: THUMB_W, height: naturalHeight }}
        />
      </div>
    </div>
  );
};

export const SceneNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { scene, brand, index, onDelete, onDuplicate, onChange } =
    data as unknown as SceneNodeData;
  const meta = TYPE_META[scene.type];
  const seconds = Math.round(scene.duration / 30);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const stopAndDo = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="group relative">
      <div
        className={`absolute -top-11 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border bg-[#0a0a0c]/95 px-1.5 py-1 opacity-0 backdrop-blur transition-opacity duration-150 group-hover:opacity-100 ${
          selected ? "border-white/30" : "border-white/10"
        }`}
      >
        <button
          type="button"
          title="Play this scene"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ▶
        </button>
        <button
          type="button"
          title="Run from here"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          →
        </button>
      </div>

      <div
        className={`w-[280px] overflow-hidden rounded-2xl border bg-[#15151a] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-all ${
          selected
            ? "border-white/30 ring-2 ring-white/10"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div
          className="relative flex items-center justify-between border-b border-white/5 px-4 py-2.5"
          style={{
            background: `linear-gradient(180deg, ${meta.accent}11 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold"
              style={{
                background: `${meta.accent}22`,
                color: meta.accent,
              }}
            >
              {meta.icon}
            </span>
            <span className="text-[13px] font-medium text-white">
              {meta.label}
            </span>
            <button
              type="button"
              className="ml-0.5 text-white/30 transition hover:text-white/70"
              title="Edit (or click anywhere on node)"
            >
              ✎
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ready
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              title="More options"
              className={`flex h-6 w-6 items-center justify-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white ${
                menuOpen ? "bg-white/10 text-white" : ""
              }`}
            >
              ⋮
            </button>
          </div>
          {menuOpen ? (
            <div
              ref={menuRef}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute right-2 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#15151a] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)]"
            >
              {onDuplicate ? (
                <button
                  type="button"
                  onClick={stopAndDo(() => onDuplicate(id))}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/[0.06]"
                >
                  <span className="text-white/40">⎘</span>
                  Duplicate
                </button>
              ) : null}
              <button
                type="button"
                onClick={stopAndDo(() => onDelete(id))}
                className="flex w-full items-center gap-2.5 border-t border-white/5 px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
              >
                <span>🗑</span>
                Delete node
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-2 px-3 py-3">
          {/* Live thumbnail — Remotion-rendered first frame of this scene */}
          <ThumbnailStrip scene={scene} brand={brand} meta={meta} />
          <div className="w-full px-2 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white">
              Scene {index + 1}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[10px] text-white/55">
              {sceneSummary(scene)}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t border-white/5 px-4 py-2"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: brand.accent }}
            />
            <span className="text-[10px] text-white/40">{brand.name}</span>
          </div>
          <span className="text-[10px] text-white/40">{seconds}s</span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white/20 !bg-[#0a0a0c]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white/20 !bg-[#0a0a0c]"
      />

      {onChange ? (
        <NodeToolbar
          isVisible={selected}
          position={Position.Right}
          offset={20}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="nodrag w-[340px] max-h-[520px] overflow-y-auto rounded-xl border border-white/15 bg-[#0c0c10]/95 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <SceneEditor
              scene={scene}
              brand={brand as Brand}
              onChange={(next) => onChange(id, next)}
              onDelete={() => onDelete(id)}
            />
          </div>
        </NodeToolbar>
      ) : null}
    </div>
  );
};

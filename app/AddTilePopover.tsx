"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Scene } from "../remotion/schema";

type SceneType = Scene["type"];

type Tile = {
  type: SceneType;
  name: string;
  description: string;
  icon: string;
  accent: string;
  category: string;
};

const TILES: Tile[] = [
  {
    type: "kineticTitle",
    name: "Kinetic Title",
    description: "Animated headline with emoji and brand gradient",
    icon: "T",
    accent: "#A4B0F5",
    category: "Text & Type",
  },
  {
    type: "statReveal",
    name: "Stat Reveal",
    description: "Big number count-up with descriptive label",
    icon: "#",
    accent: "#22D3EE",
    category: "Text & Type",
  },
  {
    type: "featureGrid",
    name: "Feature Grid",
    description: "Two to four feature cards on dark backdrop",
    icon: "▦",
    accent: "#F472B6",
    category: "Layout",
  },
  {
    type: "productDemo",
    name: "Product Demo",
    description: "Screenshot + cursor walkthrough with zoom and click ripples",
    icon: "↘",
    accent: "#F59E0B",
    category: "Product",
  },
  {
    type: "testimonialQuote",
    name: "Testimonial Quote",
    description: "Pull quote from a customer with name and role",
    icon: "❝",
    accent: "#FCD34D",
    category: "Social Proof",
  },
  {
    type: "logoWall",
    name: "Logo Wall",
    description: '"Trusted by" grid of customer or integration logos',
    icon: "▦",
    accent: "#34D399",
    category: "Social Proof",
  },
  {
    type: "ctaCard",
    name: "CTA Card",
    description: "Final call-to-action with headline, button, and URL",
    icon: "→",
    accent: "#FB7185",
    category: "Conversion",
  },
  {
    type: "multiScript",
    name: "Multi-Script",
    description: "Cinematic glyph morph across multiple writing systems",
    icon: "अ",
    accent: "#FF6A00",
    category: "Cinematic",
  },
  {
    type: "productCarousel",
    name: "Product Carousel",
    description: "Scrolling product cards with featured center + pagination",
    icon: "▣",
    accent: "#1E40AF",
    category: "Commerce",
  },
  {
    type: "uiShowcase",
    name: "UI Showcase",
    description: "Web / phone / tablet frame with your screenshot + animation",
    icon: "🖥",
    accent: "#8B5CF6",
    category: "Product",
  },
  {
    type: "aiShot",
    name: "AI Shot",
    description: "FLUX-generated cinematic shot with caption overlay",
    icon: "✦",
    accent: "#EC4899",
    category: "AI",
  },
];

export const defaultSceneForType = (type: SceneType): Scene => {
  switch (type) {
    case "kineticTitle": {
      const variants = ["mask", "typewriter", "scale", "split"] as const;
      return {
        type: "kineticTitle",
        duration: 35,
        lines: ["New title"],
        sfx: "whoosh",
        variant: variants[Math.floor(Math.random() * variants.length)],
      };
    }
    case "statReveal":
      return {
        type: "statReveal",
        duration: 50,
        value: "100",
        suffix: "+",
        label: "Describe this number",
        sfx: "ding",
      };
    case "featureGrid":
      return {
        type: "featureGrid",
        duration: 60,
        heading: "Why teams choose us.",
        features: [
          { title: "Fast", body: "Setup in under a minute." },
          { title: "Open", body: "Plays well with your stack." },
          { title: "Reliable", body: "Battle-tested at scale." },
        ],
        sfx: "page-turn",
      };
    case "productDemo":
      return {
        type: "productDemo",
        duration: 110,
        caption: "See it in action.",
        actions: [
          { at: 0, type: "move", x: 500, y: 300 },
          { at: 25, type: "click", x: 500, y: 300, label: "Click here" },
        ],
        sfx: "mouse-click",
      };
    case "testimonialQuote":
      return {
        type: "testimonialQuote",
        duration: 70,
        quote: "We shipped 3× faster.",
        author: "Jane Cooper",
        role: "Head of Engineering",
        company: "Acme",
        sfx: "shutter-modern",
      };
    case "logoWall":
      return {
        type: "logoWall",
        duration: 50,
        heading: "Trusted by",
        logos: [
          { name: "Stripe" },
          { name: "Linear" },
          { name: "Vercel" },
          { name: "Notion" },
          { name: "Figma" },
          { name: "Loom" },
        ],
        sfx: "switch",
      };
    case "ctaCard":
      return {
        type: "ctaCard",
        duration: 55,
        headline: "Start free.",
        subtext: "No credit card.",
        buttonLabel: "Get started",
        url: "yourdomain.com",
        sfx: "ding",
      };
    case "multiScript":
      return {
        type: "multiScript",
        duration: 150,
        glyphs: [
          { char: "अ" },
          { char: "অ" },
          { char: "A" },
        ],
        caption: "One platform.",
        sfx: "ding",
      };
    case "uiShowcase":
      return {
        type: "uiShowcase",
        duration: 150,
        frame: "browser",
        animation: "scroll",
        caption: "See it in action.",
        url: "your-product.com",
        sfx: "whoosh",
      };
    case "productCarousel":
      return {
        type: "productCarousel",
        duration: 180,
        heading: "Featured products.",
        products: [
          {
            name: "PURSHE Mini Projector, Portable HD Display",
            category: "Electronics",
            price: "$41.32",
            rating: 4.3,
            reviewCount: 61,
            sku: "BOCRYVL494",
            ctaLabel: "View Product",
            accent: "#3B82F6",
          },
          {
            name: "XBOX Wireless Controller — Electric Volt",
            category: "Gaming",
            price: "$59.99",
            rating: 4.8,
            reviewCount: 1205,
            sku: "GAMEXCTRL01",
            ctaLabel: "View Product",
            featured: true,
            accent: "#22C55E",
          },
          {
            name: "Polaroid Now i-Type Instant Camera",
            category: "Photography",
            price: "$99.99",
            rating: 4.5,
            reviewCount: 350,
            sku: "POLAROIDNOW",
            ctaLabel: "View Product",
            accent: "#06B6D4",
          },
        ],
        sfx: "switch",
      };
    case "aiShot":
      return {
        type: "aiShot",
        duration: 90,
        imagePrompt:
          "Abstract cinematic motion-graphic background, soft gradient, brand-coloured, premium ad aesthetic",
        caption: "Your headline here.",
        motion: "push-in",
        overlay: "dark",
        captionPosition: "bottom",
        sfx: "whoosh",
      };
  }
};

type Props = {
  anchor: { x: number; y: number };
  onPick: (type: SceneType) => void;
  onClose: () => void;
};

export const AddTilePopover: React.FC<Props> = ({ anchor, onPick, onClose }) => {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TILES;
    return TILES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tile[]>();
    for (const tile of filtered) {
      const arr = map.get(tile.category) ?? [];
      arr.push(tile);
      map.set(tile.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div
      ref={containerRef}
      className="absolute z-30 w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#15151a]/95 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-white/40">⌕</span>
          <span className="text-sm font-semibold text-white">Add Tile</span>
        </div>
        <div className="mt-0.5 text-xs text-white/50">
          Insert a new scene into the chain
        </div>
      </div>
      <div className="border-b border-white/5 px-3 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tiles…"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
      </div>
      <div
        className="overflow-y-auto px-2 py-2"
        style={{ maxHeight: "min(640px, 72vh)" }}
      >
        {grouped.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-white/40">
            No tiles match "{query}"
          </div>
        ) : (
          grouped.map(([category, tiles]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-white/40">
                {category}{" "}
                <span className="text-white/25">({tiles.length})</span>
              </div>
              {tiles.map((tile) => (
                <button
                  key={tile.type}
                  onClick={() => {
                    onPick(tile.type);
                    onClose();
                  }}
                  className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.06]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold"
                    style={{
                      background: `${tile.accent}1A`,
                      color: tile.accent,
                      boxShadow: `inset 0 0 0 1px ${tile.accent}33`,
                    }}
                  >
                    {tile.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white">
                      {tile.name}
                    </div>
                    <div className="truncate text-[11px] text-white/50">
                      {tile.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

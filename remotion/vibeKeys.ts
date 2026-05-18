// Server-safe vibe data. Everything except the Easing function (which
// requires the Remotion runtime / React.createContext) lives here so the
// schema, Director, and any server-side code can resolve a vibe's label,
// description, intensity, decor density, and Director hint without ever
// pulling Remotion in.
//
// The Easing function lives in ./vibes.ts (client-only) which imports
// this module and adds the per-vibe curve.

import type { TypefaceKey } from "./typefaceKeys";

export const VIBE_KEYS = [
  "minimal",
  "energetic",
  "editorial",
  "techy",
  "warm",
  "bold",
] as const;

export type VibeKey = (typeof VIBE_KEYS)[number];

export const DEFAULT_VIBE: VibeKey = "minimal";

export type VibeData = {
  label: string;
  description: string;
  intensity: number;
  typefaceBias: TypefaceKey;
  decorDensity: 0 | 1 | 2;
  colorTreatment: string;
  directorHint: string;
};

export const VIBE_DATA: Record<VibeKey, VibeData> = {
  minimal: {
    label: "Minimal",
    description: "Quiet, considered, Apple-style.",
    intensity: 0.6,
    typefaceBias: "inter",
    decorDensity: 0,
    colorTreatment: "muted single-accent",
    directorHint:
      "Prefer kineticTitle, statReveal, ctaCard. Aim for 4 scenes. Generous duration per scene (let things breathe). Avoid productCarousel.",
  },
  energetic: {
    label: "Energetic",
    description: "Punchy, fast cuts, social energy.",
    intensity: 1.3,
    typefaceBias: "archivoBlack",
    decorDensity: 2,
    colorTreatment: "high saturation",
    directorHint:
      "Mix scene types aggressively. Aim for 5-6 scenes with shorter durations. Open with kineticTitle (scale variant) or statReveal. Include featureGrid or uiShowcase mid-arc.",
  },
  editorial: {
    label: "Editorial",
    description: "Magazine-cover sophistication.",
    intensity: 0.8,
    typefaceBias: "fraunces",
    decorDensity: 0,
    colorTreatment: "high contrast with one accent",
    directorHint:
      "Lean on kineticTitle (split variant) and testimonialQuote. Include logoWall. Aim for 4-5 scenes, considered pacing.",
  },
  techy: {
    label: "Techy",
    description: "Developer-tool launch.",
    intensity: 1.0,
    typefaceBias: "spaceGrotesk",
    decorDensity: 1,
    colorTreatment: "cool blues and greens",
    directorHint:
      "Prefer featureGrid, productDemo, uiShowcase, statReveal. Show the product working. Aim for 5 scenes.",
  },
  warm: {
    label: "Warm",
    description: "Friendly consumer brand.",
    intensity: 1.1,
    typefaceBias: "manrope",
    decorDensity: 1,
    colorTreatment: "warm palette",
    directorHint:
      "Lean on testimonialQuote and kineticTitle. Include ctaCard. Aim for 4-5 scenes, friendly tone.",
  },
  bold: {
    label: "Bold",
    description: "Heavy, attention-grabbing display.",
    intensity: 1.5,
    typefaceBias: "bebasNeue",
    decorDensity: 2,
    colorTreatment: "high contrast",
    directorHint:
      "Open with kineticTitle (scale) or statReveal. Big numbers, short headlines. Aim for 4 scenes.",
  },
};

// Server-safe vibe resolver — returns just the data fields, no easing
// function. Use this from any non-client module (Director, schema).
export const resolveVibeData = (
  brandVibe: VibeKey | undefined,
): VibeData => VIBE_DATA[brandVibe ?? DEFAULT_VIBE];

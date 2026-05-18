// Curated typeface palette. Each entry preloads its font via Remotion's
// google-fonts adapter at module init so the family string is ready when
// any scene renders. Scenes look up `TYPEFACES[key].family` (a CSS
// font-family string) to apply.
//
// To add a font: import its loader from `@remotion/google-fonts/<Name>`,
// call loadFont with the weights you need, and add it to TYPEFACES.

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/Playfair";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import {
  TYPEFACE_KEYS,
  DEFAULT_TYPEFACE,
  type TypefaceKey,
} from "./typefaceKeys";

// Re-export so existing consumers keep working without changing imports.
export { TYPEFACE_KEYS, DEFAULT_TYPEFACE, type TypefaceKey };

const HEAVY_WEIGHTS = ["300", "400", "700", "900"] as const;
const STANDARD_WEIGHTS = ["300", "400", "600", "700"] as const;
const SUBSETS = ["latin"] as const;

export type TypefaceMeta = {
  label: string;
  family: string;
  // A short, plain-English tag for the Director's prompt (e.g.
  // "geometric, designer-y"). Used when an LLM-extracted style hint asks
  // for a typeface; we look up by tag.
  tag: string;
};

export const TYPEFACES: Record<TypefaceKey, TypefaceMeta> = {
  inter: {
    label: "Modern Sans",
    tag: "neutral modern sans",
    family: loadInter("normal", {
      weights: [...HEAVY_WEIGHTS],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  spaceGrotesk: {
    label: "Geometric",
    tag: "geometric, designer-y",
    family: loadSpaceGrotesk("normal", {
      weights: [...STANDARD_WEIGHTS],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  manrope: {
    label: "Friendly",
    tag: "friendly, balanced sans",
    family: loadManrope("normal", {
      weights: [...STANDARD_WEIGHTS],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  outfit: {
    label: "Playful",
    tag: "playful, geometric, soft",
    family: loadOutfit("normal", {
      weights: [...STANDARD_WEIGHTS],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  fraunces: {
    label: "Expressive Serif",
    tag: "expressive serif, warm",
    family: loadFraunces("normal", {
      weights: ["400", "600", "700", "900"],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  playfair: {
    label: "Editorial Serif",
    tag: "high-contrast editorial serif",
    family: loadPlayfair("normal", {
      weights: ["400", "700", "900"],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  bebasNeue: {
    label: "Display Condensed",
    tag: "tall condensed display, headline",
    family: loadBebasNeue("normal", {
      weights: ["400"],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
  archivoBlack: {
    label: "Display Heavy",
    tag: "heavy chunky display",
    family: loadArchivoBlack("normal", {
      weights: ["400"],
      subsets: [...SUBSETS],
    }).fontFamily,
  },
};

// Resolve precedence: scene override → brand default → fallback.
export const resolveTypeface = (
  sceneTypeface: TypefaceKey | undefined,
  brandTypeface: TypefaceKey | undefined,
): TypefaceMeta => {
  const key = sceneTypeface ?? brandTypeface ?? DEFAULT_TYPEFACE;
  return TYPEFACES[key] ?? TYPEFACES[DEFAULT_TYPEFACE];
};

// Validation helper: cast an unknown value (from JSON / form input) to a
// typeface key, or return undefined if it doesn't match.
export const asTypefaceKey = (value: unknown): TypefaceKey | undefined => {
  return typeof value === "string" && value in TYPEFACES
    ? (value as TypefaceKey)
    : undefined;
};

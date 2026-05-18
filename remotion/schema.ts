import { z } from "zod";
// IMPORTANT: import from the server-safe keys module, NOT from fonts.ts.
// fonts.ts loads Remotion's google-fonts (which need React.createContext),
// crashing any server-side runtime that imports schema transitively.
import { TYPEFACE_KEYS } from "./typefaceKeys";
import { VIBE_KEYS } from "./vibeKeys";
import { ICON_NAMES } from "./decorIcons";

export const brandSchema = z.object({
  name: z.string(),
  color: z.string(),
  accent: z.string(),
  // Default typeface for all text-bearing scenes in this storyboard.
  // Scenes can override via their own `typeface` field; otherwise this
  // applies. If omitted, falls back to "inter" in resolveTypeface.
  typeface: z.enum(TYPEFACE_KEYS).optional(),
  // Vibe drives easing, intensity, decoration density, and Director's
  // scene-type bias for this storyboard. See remotion/vibes.ts.
  vibe: z.enum(VIBE_KEYS).optional(),
});

export const SFX_KEYS = [
  "whoosh",
  "whip",
  "page-turn",
  "switch",
  "mouse-click",
  "shutter-modern",
  "ding",
  "none",
] as const;
export type SfxKey = (typeof SFX_KEYS)[number];

export const TRANSITION_KEYS = [
  "auto",
  "fade",
  "wipe-up",
  "wipe-down",
  "wipe-left",
  "wipe-right",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "cut",
] as const;
export type TransitionKey = (typeof TRANSITION_KEYS)[number];

const sceneAudioFields = {
  voiceover: z.string().optional(),
  audioUrl: z.string().optional(),
  sfx: z.enum(SFX_KEYS).optional(),
  outTransition: z.enum(TRANSITION_KEYS).optional(),
};

// ─── Decor (AI-placed motion-graphic elements) ─────────────────────────
//
// Director outputs a `decor` array per scene listing the orbs / beams /
// particle layers it wants for that scene. AtmosphericLayer renders the
// list verbatim — no hand-picked layout in code.
//
// Coordinates are in % of canvas. `color: "brand" | "accent"` resolves
// against the brand at render time so the same plan reuses across brands.

export const decorOrbSchema = z.object({
  type: z.literal("orb"),
  x: z.number().min(-10).max(110),
  y: z.number().min(-10).max(110),
  size: z.number().min(4).max(40),
  color: z.enum(["brand", "accent"]),
  // 0.4 = far/blurred/slow, 1.0 = front, 1.2 = oversized hero orb.
  layer: z.number().min(0.3).max(1.4).optional(),
});

export const decorBeamSchema = z.object({
  type: z.literal("beam"),
  originX: z.number().min(-30).max(130),
  originY: z.number().min(-30).max(130),
  // 0 = pointing up, 90 = right, 180 = down.
  angle: z.number().min(-360).max(360),
  // 0.08-0.4 — Director should keep this restrained.
  intensity: z.number().min(0.05).max(0.5).optional(),
  color: z.enum(["brand", "accent"]),
});

export const decorParticlesSchema = z.object({
  type: z.literal("particles"),
  density: z.enum(["sparse", "dense"]),
});

// Semantic icon: a small stroke-style glyph chosen for what the product
// IS about (phone for telephony, code for dev tools, lock for security,
// etc.). Director picks `name` semantically from the catalogue.
export const decorIconSchema = z.object({
  type: z.literal("icon"),
  name: z.enum(ICON_NAMES),
  x: z.number().min(-10).max(110),
  y: z.number().min(-10).max(110),
  size: z.number().min(3).max(25),
  color: z.enum(["brand", "accent"]),
  layer: z.number().min(0.3).max(1.4).optional(),
});

export const decorElementSchema = z.discriminatedUnion("type", [
  decorOrbSchema,
  decorBeamSchema,
  decorParticlesSchema,
  decorIconSchema,
]);

export type DecorElement = z.infer<typeof decorElementSchema>;

const sceneDecorFields = {
  decor: z.array(decorElementSchema).optional(),
};

export const kineticTitleVariants = ["mask", "typewriter", "scale", "split"] as const;
export type KineticTitleVariant = (typeof kineticTitleVariants)[number];

export const kineticTitleSchema = z.object({
  type: z.literal("kineticTitle"),
  duration: z.number(),
  lines: z.array(z.string()).min(1).max(3),
  emoji: z.string().optional(),
  variant: z.enum(kineticTitleVariants).optional(),
  // Word to paint in the brand accent. If omitted, falls back to the
  // longest word in `lines` (min 4 chars). Set to "" to disable highlight.
  accentWord: z.string().optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const statRevealVariants = ["count", "spin", "mask"] as const;
export type StatRevealVariant = (typeof statRevealVariants)[number];

export const statRevealSchema = z.object({
  type: z.literal("statReveal"),
  duration: z.number(),
  value: z.string(),
  label: z.string(),
  suffix: z.string().optional(),
  variant: z.enum(statRevealVariants).optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const featureGridSchema = z.object({
  type: z.literal("featureGrid"),
  duration: z.number(),
  heading: z.string(),
  features: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .min(2)
    .max(4),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    at: z.number(),
    type: z.literal("move"),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    at: z.number(),
    type: z.literal("zoom"),
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }),
  z.object({
    at: z.number(),
    type: z.literal("click"),
    x: z.number(),
    y: z.number(),
    label: z.string().optional(),
  }),
  z.object({ at: z.number(), type: z.literal("reset") }),
]);

export const productDemoSchema = z.object({
  type: z.literal("productDemo"),
  duration: z.number(),
  screenshot: z.string().optional(),
  caption: z.string().optional(),
  actions: z.array(actionSchema),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const testimonialQuoteSchema = z.object({
  type: z.literal("testimonialQuote"),
  duration: z.number(),
  quote: z.string(),
  author: z.string(),
  role: z.string().optional(),
  company: z.string().optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const logoWallSchema = z.object({
  type: z.literal("logoWall"),
  duration: z.number(),
  heading: z.string(),
  logos: z
    .array(
      z.object({
        name: z.string(),
        color: z.string().optional(),
        logoUrl: z.string().optional(),
      }),
    )
    .min(3)
    .max(12),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const ctaCardVariants = ["fade", "mask", "scale"] as const;
export type CtaCardVariant = (typeof ctaCardVariants)[number];

export const ctaCardSchema = z.object({
  type: z.literal("ctaCard"),
  duration: z.number(),
  headline: z.string(),
  subtext: z.string().optional(),
  buttonLabel: z.string(),
  url: z.string().optional(),
  variant: z.enum(ctaCardVariants).optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const multiScriptSchema = z.object({
  type: z.literal("multiScript"),
  duration: z.number(),
  glyphs: z
    .array(
      z.object({
        char: z.string(),
        script: z.string().optional(), // "devanagari", "tamil", etc.
      }),
    )
    .min(2)
    .max(8),
  caption: z.string().optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const productCarouselStyles = [
  "classic",
  "glass",
  "dark",
  "brutalist",
] as const;
export type ProductCarouselStyle = (typeof productCarouselStyles)[number];

export const uiShowcaseFrames = [
  "browser",
  "phone",
  "tablet",
  "none",
] as const;
export type UiShowcaseFrame = (typeof uiShowcaseFrames)[number];

export const uiShowcaseAnimations = [
  "scroll",
  "zoom-in",
  "zoom-out",
  "fade",
  "tilt",
  "static",
] as const;
export type UiShowcaseAnimation = (typeof uiShowcaseAnimations)[number];

export const uiShowcaseLayouts = [
  "single",
  "side-by-side",
  "stacked",
  "sequence",
  "grid",
] as const;
export type UiShowcaseLayout = (typeof uiShowcaseLayouts)[number];

export const uiShowcaseDirections = [
  "left",
  "right",
  "up",
  "down",
  "center",
] as const;
export type UiShowcaseDirection = (typeof uiShowcaseDirections)[number];

export const uiShowcaseTransitions = [
  "fade",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "zoom-in",
  "zoom-out",
  "cut",
] as const;
export type UiShowcaseTransition = (typeof uiShowcaseTransitions)[number];

export const uiShowcaseModes = [
  "same-window", // chrome stays, screenshot swaps inside
  "different-window", // whole framed box transitions
] as const;
export type UiShowcaseMode = (typeof uiShowcaseModes)[number];

export const uiShowcaseSchema = z.object({
  type: z.literal("uiShowcase"),
  duration: z.number(),
  // The screenshot sequence with per-shot motion choreography.
  // Each shot has its own URL, optional zoom point, transition-in direction,
  // and optional duration weight.
  screenshots: z
    .array(
      z.object({
        url: z.string(),
        label: z.string().optional(),
        frame: z.enum(uiShowcaseFrames).optional(),
        // Transition that brings this shot into view (first shot uses "fade")
        transitionIn: z.enum(uiShowcaseTransitions).optional(),
        // Media type — image (default) or video. When "video", url must point
        // to an mp4/webm; Remotion's <Video> handles playback.
        mediaType: z.enum(["image", "video"]).optional(),
        // Optional per-shot caption (separate from the scene-level caption).
        shotCaption: z.string().optional(),
        // Optional simple zoom: zoom toward (x, y) at the given scale over the
        // shot's segment. Legacy; pan supersedes this when both are set.
        zoom: z
          .object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            scale: z.number().min(1).max(3),
          })
          .optional(),
        // Ken Burns-style pan keyframes — interpolates transform-origin and
        // scale from `from` to `to` over the shot's duration.
        pan: z
          .object({
            from: z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              scale: z.number().min(0.5).max(4),
            }),
            to: z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              scale: z.number().min(0.5).max(4),
            }),
          })
          .optional(),
        // Optional frame position — moves the entire device frame inside the
        // canvas. x/y are offsets in percent of canvas (50/50 = centered).
        framePosition: z
          .object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            scale: z.number().min(0.3).max(1.5),
          })
          .optional(),
        // Spotlight rectangle — darkens everything except a rectangle of the
        // screenshot. Coords are %; intensity is the dim alpha (0..1).
        spotlight: z
          .object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            w: z.number().min(1).max(100),
            h: z.number().min(1).max(100),
            intensity: z.number().min(0).max(1).optional(),
            appearAt: z.number().min(0).max(1).optional(),
          })
          .optional(),
        // Annotation callouts pinned to (x, y) on the screenshot.
        annotations: z
          .array(
            z.object({
              x: z.number().min(0).max(100),
              y: z.number().min(0).max(100),
              text: z.string(),
              side: z.enum(["top", "right", "bottom", "left"]).optional(),
              appearAt: z.number().min(0).max(1).optional(),
              color: z.string().optional(),
            }),
          )
          .optional(),
        // Cursor walkthrough — synthetic mouse moves between hotspots with
        // optional click + zoom-on-click. `at` is 0..1 progress through the
        // shot. Click actions render an expanding tap ring; the cursor
        // animates smoothly between successive actions (cursor trail).
        cursor: z
          .object({
            actions: z
              .array(
                z.object({
                  at: z.number().min(0).max(1),
                  type: z.enum(["move", "click", "zoom"]),
                  x: z.number().min(0).max(100),
                  y: z.number().min(0).max(100),
                  label: z.string().optional(),
                  scale: z.number().min(1).max(3).optional(),
                }),
              )
              .max(10),
          })
          .optional(),
        // Optional duration weight (fraction). If omitted, time is split evenly.
        weight: z.number().min(0.1).max(5).optional(),
      }),
    )
    .optional(),
  // Legacy single-screenshot fields (kept for back-compat with older scenes)
  screenshot: z.string().optional(),
  frame: z.enum(uiShowcaseFrames).optional(),
  layout: z.enum(uiShowcaseLayouts).optional(),
  direction: z.enum(uiShowcaseDirections).optional(),
  animation: z.enum(uiShowcaseAnimations).optional(),
  // Scene-level transition mode
  mode: z.enum(uiShowcaseModes).optional(),
  caption: z.string().optional(),
  url: z.string().optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const productCarouselSchema = z.object({
  type: z.literal("productCarousel"),
  duration: z.number(),
  heading: z.string().optional(),
  style: z.enum(productCarouselStyles).optional(),
  products: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().optional(),
        image: z.string().optional(),
        price: z.string().optional(),
        rating: z.number().optional(),
        reviewCount: z.number().optional(),
        sku: z.string().optional(),
        ctaLabel: z.string().optional(),
        featured: z.boolean().optional(),
        accent: z.string().optional(),
      }),
    )
    .min(2)
    .max(8),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

// AI-image-driven shot. The Visual Director plans the imagePrompt; an
// out-of-band FLUX call generates the imageUrl before render. If
// imageUrl is missing at render time, AiShot falls back to a black
// background — the caption still animates.
export const aiShotMotionKeys = [
  "push-in",
  "pull-out",
  "pan-left",
  "pan-right",
  "static",
] as const;
export type AiShotMotion = (typeof aiShotMotionKeys)[number];

export const aiShotOverlayKeys = [
  "dark",
  "light",
  "scrim",
  "none",
] as const;
export type AiShotOverlay = (typeof aiShotOverlayKeys)[number];

export const aiShotCaptionPositions = [
  "bottom",
  "center",
  "top",
] as const;
export type AiShotCaptionPosition = (typeof aiShotCaptionPositions)[number];

export const aiShotSchema = z.object({
  type: z.literal("aiShot"),
  duration: z.number(),
  // FLUX prompt used to generate imageUrl. Kept so the editor can show
  // / regenerate the source prompt without round-tripping the LLM.
  imagePrompt: z.string(),
  // Set by the orchestrator after FLUX returns. Optional so the schema
  // accepts a freshly-planned scene before generation completes.
  imageUrl: z.string().optional(),
  caption: z.string().optional(),
  subcaption: z.string().optional(),
  motion: z.enum(aiShotMotionKeys).optional(),
  overlay: z.enum(aiShotOverlayKeys).optional(),
  captionPosition: z.enum(aiShotCaptionPositions).optional(),
  ...sceneAudioFields,
  ...sceneDecorFields,
});

export const sceneSchema = z.discriminatedUnion("type", [
  kineticTitleSchema,
  statRevealSchema,
  featureGridSchema,
  productDemoSchema,
  testimonialQuoteSchema,
  logoWallSchema,
  ctaCardSchema,
  multiScriptSchema,
  productCarouselSchema,
  uiShowcaseSchema,
  aiShotSchema,
]);

export const storyboardSchema = z.object({
  brand: brandSchema,
  scenes: z.array(sceneSchema).min(1),
});

export type Brand = z.infer<typeof brandSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;

export const totalDuration = (storyboard: Storyboard) =>
  storyboard.scenes.reduce((sum, s) => sum + s.duration, 0);

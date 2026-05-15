import { z } from "zod";

export const brandSchema = z.object({
  name: z.string(),
  color: z.string(),
  accent: z.string(),
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

export const kineticTitleVariants = ["mask", "typewriter", "scale", "split"] as const;
export type KineticTitleVariant = (typeof kineticTitleVariants)[number];

export const kineticTitleSchema = z.object({
  type: z.literal("kineticTitle"),
  duration: z.number(),
  lines: z.array(z.string()).min(1).max(3),
  emoji: z.string().optional(),
  variant: z.enum(kineticTitleVariants).optional(),
  ...sceneAudioFields,
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
});

export const testimonialQuoteSchema = z.object({
  type: z.literal("testimonialQuote"),
  duration: z.number(),
  quote: z.string(),
  author: z.string(),
  role: z.string().optional(),
  company: z.string().optional(),
  ...sceneAudioFields,
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
        // Optional zoom: slowly zoom toward (x, y) at the given scale during
        // this shot's segment. Coordinates are percentages (0-100) inside
        // the screenshot itself.
        zoom: z
          .object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            scale: z.number().min(1).max(3),
          })
          .optional(),
        // Optional frame position — moves the entire device frame inside the
        // canvas. x/y are offsets in percent of canvas (50/50 = centered).
        // scale: 1 = natural size, 0.7 = smaller, 1.3 = larger.
        framePosition: z
          .object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
            scale: z.number().min(0.3).max(1.5),
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

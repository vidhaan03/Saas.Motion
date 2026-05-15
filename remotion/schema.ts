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

const sceneAudioFields = {
  voiceover: z.string().optional(),
  audioUrl: z.string().optional(),
  sfx: z.enum(SFX_KEYS).optional(),
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

export const sceneSchema = z.discriminatedUnion("type", [
  kineticTitleSchema,
  statRevealSchema,
  featureGridSchema,
  productDemoSchema,
  testimonialQuoteSchema,
  logoWallSchema,
  ctaCardSchema,
  multiScriptSchema,
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

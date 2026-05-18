import { z } from "zod";
import { brandSchema, type Brand } from "../../remotion/schema";

// ─── Section types ────────────────────────────────────────────────────

export const SECTION_TYPES = [
  "hero",
  "featureCards",
  "quickstart",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

// ─── Hero ─────────────────────────────────────────────────────────────

export const heroSchema = z.object({
  type: z.literal("hero"),
  headline: z.string().min(8).max(80),       // two-line punch
  subhead: z.string().min(20).max(200),       // one-sentence elaboration
  primaryCtaLabel: z.string().min(2).max(24),
  secondaryCtaLabel: z.string().min(2).max(24),
  floatingBadges: z
    .array(z.string().min(2).max(20))         // role-like labels surrounding the hero
    .min(2)
    .max(5),
});

export type HeroSection = z.infer<typeof heroSchema>;

// ─── Feature cards (3 cards) ──────────────────────────────────────────

export const featureCardSchema = z.object({
  title: z.string().min(3).max(40),
  body: z.string().min(20).max(160),
  // What kind of mini-mockup to render inside the card. Limits the LLM
  // to known patterns so the React renderer can implement them.
  mockupHint: z.enum([
    "progress-bars",   // 4 horizontal progress rows with status pills
    "assignment-card", // user-mapped role card with avatar + status
    "message-list",    // 3-4 chat-style message rows with avatars
    "table-rows",      // mini table with name + status columns
    "stat-tiles",      // 3-4 small tiles with numbers
    "chart-line",      // simple ascending line chart
  ]),
});

export const featureCardsSchema = z.object({
  type: z.literal("featureCards"),
  eyebrow: z.string().min(3).max(60).optional(),  // small text above heading
  heading: z.string().min(10).max(80),             // "Unlock Premium Benefits With Our Advanced Features"
  subhead: z.string().min(10).max(200),            // one-liner under heading
  cards: z.array(featureCardSchema).length(3),
});

export type FeatureCardsSection = z.infer<typeof featureCardsSchema>;

// ─── Quickstart (3 numbered steps with code) ──────────────────────────

export const quickstartStepSchema = z.object({
  title: z.string().min(4).max(60),       // "Install the CLI"
  body: z.string().min(20).max(280),       // 1-2 sentences explaining the step
  code: z
    .object({
      language: z.string().min(1).max(20),
      content: z.string().min(2).max(400),
    })
    .optional(),
});

export const quickstartSchema = z.object({
  type: z.literal("quickstart"),
  eyebrow: z.string().min(3).max(60).optional(),
  heading: z.string().min(8).max(80),
  subhead: z.string().min(10).max(200),
  steps: z.array(quickstartStepSchema).min(3).max(5),
});

export type QuickstartSection = z.infer<typeof quickstartSchema>;

// ─── Discriminated union ──────────────────────────────────────────────

export const sectionSchema = z.discriminatedUnion("type", [
  heroSchema,
  featureCardsSchema,
  quickstartSchema,
]);

export type Section = z.infer<typeof sectionSchema>;

// ─── Page-level result ────────────────────────────────────────────────

export type DocsSaasPage = {
  brand: Brand;
  sections: Section[];
};

// ─── Request / Response ───────────────────────────────────────────────

export const docsSaasRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  brand: brandSchema,
  sectionTypes: z
    .array(z.enum(SECTION_TYPES))
    .min(1)
    .max(SECTION_TYPES.length)
    .optional(),                              // optional — default = all
  sourceMaterial: z.string().max(20000).optional(),  // optional context paste
});

export type DocsSaasRequest = z.infer<typeof docsSaasRequestSchema>;

// ─── SSE events ───────────────────────────────────────────────────────

export type DocsSaasAgentEvent =
  | {
      type: "agent";
      agent: "section-writer";
      sectionType: SectionType;
      status: "thinking";
      message: string;
    }
  | {
      type: "agent";
      agent: "section-writer";
      sectionType: SectionType;
      status: "done";
      message: string;
      ms: number;
      source: "nim-gemma" | "gemini";
    }
  | {
      type: "agent";
      agent: "section-writer";
      sectionType: SectionType;
      status: "failed";
      message: string;
    };

export type DocsSaasStreamEvent =
  | { type: "meta"; total: number; sectionTypes: SectionType[] }
  | { type: "section"; section: Section }
  | { type: "done"; page: DocsSaasPage }
  | { type: "error"; message: string }
  | DocsSaasAgentEvent;

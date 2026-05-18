import { z } from "zod";
import { brandSchema, type Brand } from "../../remotion/schema";

// ─── Doc types ────────────────────────────────────────────────────────

export const DOC_TYPES = [
  "landingPage",
  "blogPost",
  "faq",
  "releaseNotes",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_META: Record<
  DocType,
  { label: string; category: "marketing" | "support" | "product"; lengthHint: string }
> = {
  landingPage: {
    label: "Landing page copy",
    category: "marketing",
    lengthHint: "~400 words: hero + 3-4 features + CTA",
  },
  blogPost: {
    label: "Launch blog post",
    category: "marketing",
    lengthHint: "~600-800 words narrative",
  },
  faq: {
    label: "FAQ",
    category: "support",
    lengthHint: "6-10 question/answer pairs",
  },
  releaseNotes: {
    label: "Release notes",
    category: "product",
    lengthHint: "Bulleted what's new + bug fixes",
  },
};

// ─── Request / Response ───────────────────────────────────────────────

export const answerSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(1000),
});

export type Answer = z.infer<typeof answerSchema>;

export const docsRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  brand: brandSchema,
  docTypes: z.array(z.enum(DOC_TYPES)).min(1).max(DOC_TYPES.length),
  answers: z.array(answerSchema).max(12).optional(),
});

export type DocsRequest = z.infer<typeof docsRequestSchema>;

export type DocOutput = {
  type: DocType;
  markdown: string;
};

export type DocsResult = {
  brand: Brand;
  docs: DocOutput[];
};

// ─── SSE event types (mirror streamGenerate.ts shape) ────────────────

export type DocSource = "mock" | "gemini" | "nim-gemma";

export type DocAgentEvent =
  | {
      type: "agent";
      agent: "doc-director";
      status: "thinking";
      message: string;
    }
  | {
      type: "agent";
      agent: "doc-director";
      status: "done";
      message: string;
      ms: number;
      source: "nim-gemma" | "gemini";
    }
  | {
      type: "agent";
      agent: "doc-director";
      status: "failed";
      message: string;
    }
  | {
      type: "agent";
      agent: "doc-writer";
      docType: DocType;
      status: "thinking";
      message: string;
    }
  | {
      type: "agent";
      agent: "doc-writer";
      docType: DocType;
      status: "done";
      message: string;
      ms: number;
      source: "nim-gemma" | "gemini";
    }
  | {
      type: "agent";
      agent: "doc-writer";
      docType: DocType;
      status: "failed";
      message: string;
    };

export type DocStreamEvent =
  | { type: "meta"; total: number; docTypes: DocType[] }
  | { type: "doc"; doc: DocOutput }
  | { type: "done"; result: DocsResult }
  | { type: "error"; message: string }
  | DocAgentEvent;

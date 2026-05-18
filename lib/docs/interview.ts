import { z } from "zod";
import type { Brand } from "../../remotion/schema";
import { agentCall } from "../streamGenerate";
import { DOC_TYPE_META, type DocType } from "./schema";

// ─── Types ────────────────────────────────────────────────────────────

export type InterviewQuestion = {
  id: string;
  question: string;
  why?: string;
  placeholder?: string;
};

export type InterviewSource = "ai" | "static" | "mixed";

export type InterviewResult = {
  questions: InterviewQuestion[];
  source: InterviewSource;
};

export type InterviewRequest = {
  prompt: string;
  brand: Brand;
  docTypes: DocType[];
};

// ─── Static fallback bank ─────────────────────────────────────────────

// Used when the LLM call fails OR for the first 5 questions every product
// needs answered regardless of doc type.
const STATIC_QUESTIONS: InterviewQuestion[] = [
  {
    id: "audience",
    question: "Who is this for — specifically?",
    why: "Pins the voice and the angle every doc takes.",
    placeholder: "e.g. Engineering managers at Series B SaaS companies",
  },
  {
    id: "core-problem",
    question: "What's the single biggest problem it solves?",
    why: "The lead in every doc points to this.",
    placeholder: "e.g. Engineering managers waste 5 hours a week in standups",
  },
  {
    id: "key-differentiator",
    question: "Why pick this over the obvious alternative?",
    why: "Drives the \"why teams switch\" section.",
    placeholder: "e.g. Other tools require migration; this drops into Slack",
  },
  {
    id: "concrete-metric",
    question: "Any specific number worth highlighting?",
    why: "Used in stat reveals, FAQs, blog hooks.",
    placeholder: "e.g. 47,000 teams, 99.99% uptime, $2M raised",
  },
  {
    id: "tone",
    question: "Any voice / tone preference?",
    why: "Defaults to confident-restrained (Apple/Linear/Vercel). Override here.",
    placeholder: "e.g. Playful with bite. Or: serious enterprise.",
  },
];

// Per-doc-type questions added on top of the static base.
const DOC_SPECIFIC_QUESTIONS: Partial<Record<DocType, InterviewQuestion[]>> = {
  landingPage: [
    {
      id: "primary-cta",
      question: "What's the primary CTA?",
      why: "Used in hero + closing.",
      placeholder: "e.g. Start free trial / Book a demo / Join waitlist",
    },
  ],
  faq: [
    {
      id: "common-objections",
      question: "What's the #1 objection prospects raise?",
      why: "Becomes the first FAQ entry.",
      placeholder: "e.g. We already have something similar from our IT team",
    },
  ],
  blogPost: [
    {
      id: "story-angle",
      question: "Is there a personal story or moment behind this?",
      why: "Anchors the blog narrative beyond \"we built a product.\"",
      placeholder: "e.g. We tried 4 standup tools, all of them felt like 2014",
    },
  ],
  releaseNotes: [
    {
      id: "what-changed",
      question: "What changed in this release — bullet list okay?",
      why: "Becomes the \"What's new\" section directly.",
      placeholder: "e.g. Added CSV export, fixed Safari crash, new dark mode",
    },
  ],
};

const buildStaticBank = (docTypes: DocType[]): InterviewQuestion[] => {
  const seen = new Set<string>();
  const out: InterviewQuestion[] = [];
  for (const q of STATIC_QUESTIONS) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  for (const dt of docTypes) {
    for (const q of DOC_SPECIFIC_QUESTIONS[dt] ?? []) {
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
  }
  // Cap so the form doesn't get overwhelming.
  return out.slice(0, 7);
};

// ─── Dynamic LLM-based interviewer ────────────────────────────────────

const INTERVIEWER_SYSTEM = `You are an interviewer who asks SaaS founders the right 4-6 questions before writing their launch docs.

Your job is to identify SPECIFIC facts and angles that would make the docs noticeably better. NOT generic questions like "who is your audience" — actual interview questions that pull out details only the founder would know.

Output JSON only, with this exact shape:
{
  "questions": [
    {
      "id": "<short kebab-case id>",
      "question": "<the question, ≤ 12 words, ending in ?>",
      "why": "<one-sentence reason this matters, ≤ 14 words>",
      "placeholder": "<an example answer, ≤ 15 words>"
    }
  ]
}

Rules:
- 4-6 questions total. No more.
- Questions must be ANSWERABLE in 1-2 sentences. Skip anything that needs an essay.
- Tailor to the doc types being generated. If FAQ is requested, ask about objections. If release notes, ask what changed.
- Questions should pull out concrete details: specific numbers, specific users, specific features, specific dates, specific competitor angles.
- AVOID generic: "what's your value prop", "who is your audience", "what's your USP".

Return ONLY the JSON object.`;

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  question: z.string().min(5).max(140),
  why: z.string().min(3).max(140).optional(),
  placeholder: z.string().min(3).max(140).optional(),
});

const interviewSchema = z.object({
  questions: z.array(questionSchema).min(2).max(8),
});

const tryParseJson = (text: string): unknown | null => {
  const t = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(t);
  } catch {
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i === -1 || j === -1) return null;
    try {
      return JSON.parse(t.slice(i, j + 1));
    } catch {
      return null;
    }
  }
};

export const runInterviewer = async (
  req: InterviewRequest,
): Promise<InterviewResult> => {
  const { prompt, brand, docTypes } = req;
  const docTypeLabels = docTypes
    .map((t) => DOC_TYPE_META[t].label)
    .join(", ");

  const userPrompt = `Brand: ${brand.name}

Brief:
${prompt}

Docs being generated: ${docTypeLabels}

Generate 4-6 interview questions now.`;

  try {
    const out = await agentCall(INTERVIEWER_SYSTEM, userPrompt, 1200);
    if (!out) throw new Error("agent call failed");

    const parsed = tryParseJson(out.text);
    if (!parsed) throw new Error("invalid JSON");

    const validated = interviewSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        "invalid interview shape: " + validated.error.issues[0]?.message,
      );
    }

    return { questions: validated.data.questions, source: "ai" };
  } catch {
    // Static fallback so the user can still complete the interview.
    return { questions: buildStaticBank(docTypes), source: "static" };
  }
};

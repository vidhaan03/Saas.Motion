import type { Brand } from "../../remotion/schema";
import { agentCall } from "../streamGenerate";
import {
  type DocsSaasPage,
  type DocsSaasRequest,
  type DocsSaasStreamEvent,
  type Section,
  type SectionType,
  featureCardsSchema,
  heroSchema,
  quickstartSchema,
} from "./schema";

// ─── Shared voice ─────────────────────────────────────────────────────

const SHARED_VOICE = `Voice: confident, restrained, no marketing fluff. Apple / Linear / Vercel / Stripe tone — short declarative sentences cut to the bone. No emoji.
Stay GROUNDED in the brief and source material. Do not invent fictional companies, metrics, customers, or features that aren't implied by the input. If the brief is sparse, write plausible specifics that fit the domain — never write generic SaaS-template filler like "boost productivity" or "streamline your workflow".
Use the brand name verbatim.`;

// ─── Per-section system prompts ───────────────────────────────────────

const SYSTEM_PROMPTS: Record<SectionType, string> = {
  hero: `You write the HERO section of a SaaS landing page.

Output JSON only (no markdown, no commentary):
{
  "type": "hero",
  "headline": "<two-line punch, 4-9 words total, hits the core promise>",
  "subhead": "<one sentence under the headline, ≤ 20 words, expands the promise>",
  "primaryCtaLabel": "<2-3 words, action-oriented, e.g. \\"Start free\\", \\"Get a demo\\", \\"Try it now\\">",
  "secondaryCtaLabel": "<2-3 words, secondary action, e.g. \\"Book a demo\\", \\"View pricing\\", \\"See examples\\">",
  "floatingBadges": ["<role/persona label, 1-2 words>", "<another>", "<another, 2-4 total>"]
}

Examples of good headlines:
- "Ship faster. Every sprint." (Linear)
- "Payments in one line." (Stripe)
- "Deploy. Done." (Vercel)
- "The async standup, finally" (Beacon)

Examples of bad headlines (avoid):
- "Boost productivity with AI-powered solutions" (generic, vague)
- "The future of work is here" (cliché)
- "Streamline your workflow" (every SaaS uses this)

Floating badges are short role labels that sit around the product mockup — they represent the personas who use the tool (e.g. "Designer", "Engineer", "Founder", "Product Manager"). Pick 2-5 personas that match this specific product's audience.

${SHARED_VOICE}`,

  featureCards: `You write the FEATURE CARDS section of a SaaS landing page. Three feature cards.

Output JSON only:
{
  "type": "featureCards",
  "eyebrow": "<small label, 2-4 words, optional, e.g. \\"What's included\\", \\"Core features\\">",
  "heading": "<section heading, 6-12 words, e.g. \\"Unlock premium benefits with our advanced features\\">",
  "subhead": "<one-sentence subhead under the heading, ≤ 20 words>",
  "cards": [
    {
      "title": "<2-4 words, specific feature name>",
      "body": "<one sentence describing what it does and why it matters, ≤ 18 words>",
      "mockupHint": "<one of: progress-bars | assignment-card | message-list | table-rows | stat-tiles | chart-line>"
    },
    {...},
    {...}
  ]
}

The mockupHint controls what mini-UI the card shows. Pick what visually fits each feature:
- progress-bars: for tasks, completion, status tracking
- assignment-card: for collaboration, role assignments, user mapping
- message-list: for messaging, notifications, comments
- table-rows: for lists of items, inventory, records
- stat-tiles: for analytics, metrics, dashboards
- chart-line: for trends, growth, performance over time

Vary the mockupHint across the three cards — never repeat.

Card titles should be CONCRETE features (e.g. "Smart task organization", "Automated workflows", "File & comment management"), not abstract benefits ("Boost productivity").

${SHARED_VOICE}`,

  quickstart: `You write the QUICKSTART STEPS section of a SaaS landing page. 3-5 numbered steps that get a user to first value.

Output JSON only:
{
  "type": "quickstart",
  "eyebrow": "<small label, 2-4 words, optional, e.g. \\"Get started\\", \\"How it works\\">",
  "heading": "<section heading, 5-8 words, e.g. \\"Get started in just 3 easy steps\\">",
  "subhead": "<one-sentence subhead, ≤ 20 words>",
  "steps": [
    {
      "title": "<short action-oriented step title, 3-7 words, e.g. \\"Install the CLI\\", \\"Connect your account\\">",
      "body": "<1-2 sentence explanation, ≤ 35 words, says what to do and what happens after>",
      "code": {
        "language": "<bash | typescript | javascript | python | json | tsx | yaml | none>",
        "content": "<short code snippet, 1-4 lines, executable or realistic>"
      }
    },
    {...},
    {...}
  ]
}

Rules for steps:
- Each step must accomplish ONE concrete thing. Not "configure your account" (vague) but "Set your API key in .env.local" (concrete).
- code is optional per step — include it ONLY when there's a real command or snippet that helps. Don't fake code blocks for marketing flow.
- code.content must be realistic — actual commands, real env var names, real CLI flags. Not placeholders like "<your code here>".
- Step bodies must be specific to the product's actual flow as described in the brief / source material. If the brief doesn't tell you the flow, infer plausible steps from the product domain.

Examples of good step titles:
- "Install the CLI" + code: \`npm install -g vercel\`
- "Authenticate" + code: \`vercel login\`
- "Deploy your project" + code: \`vercel deploy\`

Examples of bad step titles:
- "Sign up for an account" (every SaaS has this — usually not worth a step)
- "Use the platform" (too vague to be a step)

${SHARED_VOICE}`,
};

// ─── User prompt builder ──────────────────────────────────────────────

const buildUserPrompt = (
  sectionType: SectionType,
  prompt: string,
  brand: Brand,
  sourceMaterial?: string,
): string => {
  const source =
    sourceMaterial && sourceMaterial.trim().length > 0
      ? `\n\nSource material (the user pasted this — use as ground truth):\n\n---\n${sourceMaterial.trim()}\n---\n`
      : "";

  return `Brand: ${brand.name}
Brand color: ${brand.color}
Accent color: ${brand.accent}

Brief from product team:
${prompt}${source}

Write the ${sectionType} section now in the exact JSON format specified.`;
};

// ─── JSON extraction ──────────────────────────────────────────────────

const extractJson = (text: string): unknown | null => {
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

const validate = (sectionType: SectionType, raw: unknown): Section | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const merged = { ...(raw as object), type: sectionType };
  if (sectionType === "hero") {
    const r = heroSchema.safeParse(merged);
    return r.success ? r.data : null;
  }
  if (sectionType === "featureCards") {
    const r = featureCardsSchema.safeParse(merged);
    return r.success ? r.data : null;
  }
  if (sectionType === "quickstart") {
    const r = quickstartSchema.safeParse(merged);
    return r.success ? r.data : null;
  }
  return null;
};

// ─── Single section writer ────────────────────────────────────────────

const runSectionWriter = async (
  sectionType: SectionType,
  prompt: string,
  brand: Brand,
  sourceMaterial?: string,
): Promise<{ section: Section; source: "nim-gemma" | "gemini" } | null> => {
  const out = await agentCall(
    SYSTEM_PROMPTS[sectionType],
    buildUserPrompt(sectionType, prompt, brand, sourceMaterial),
    1500,
  );
  if (!out) return null;
  const parsed = extractJson(out.text);
  if (!parsed) return null;
  const section = validate(sectionType, parsed);
  if (!section) return null;
  return { section, source: out.source };
};

// ─── Orchestrator ─────────────────────────────────────────────────────

export async function* streamDocsSaas(
  req: DocsSaasRequest,
): AsyncGenerator<DocsSaasStreamEvent> {
  const { prompt, brand, sectionTypes, sourceMaterial } = req;
  const types: SectionType[] = sectionTypes ?? ["hero", "featureCards", "quickstart"];

  yield { type: "meta", total: types.length, sectionTypes: types };

  // Announce thinking up front so the UI can render placeholders.
  for (const sectionType of types) {
    yield {
      type: "agent",
      agent: "section-writer",
      sectionType,
      status: "thinking",
      message: `Writing ${sectionType}…`,
    };
  }

  const starts = new Map<SectionType, number>();
  const pending = new Map<
    SectionType,
    Promise<{
      sectionType: SectionType;
      result: Awaited<ReturnType<typeof runSectionWriter>>;
    }>
  >();

  for (const sectionType of types) {
    starts.set(sectionType, Date.now());
    pending.set(
      sectionType,
      runSectionWriter(sectionType, prompt, brand, sourceMaterial)
        .then((result) => ({ sectionType, result }))
        .catch(() => ({
          sectionType,
          result: null as Awaited<ReturnType<typeof runSectionWriter>>,
        })),
    );
  }

  const completed: Section[] = [];

  while (pending.size > 0) {
    const winner = await Promise.race(pending.values());
    pending.delete(winner.sectionType);
    const elapsed = Date.now() - (starts.get(winner.sectionType) ?? Date.now());

    if (winner.result) {
      completed.push(winner.result.section);
      yield {
        type: "agent",
        agent: "section-writer",
        sectionType: winner.sectionType,
        status: "done",
        message: `${winner.sectionType} ready`,
        ms: elapsed,
        source: winner.result.source,
      };
      yield { type: "section", section: winner.result.section };
    } else {
      yield {
        type: "agent",
        agent: "section-writer",
        sectionType: winner.sectionType,
        status: "failed",
        message: `${winner.sectionType} failed — section dropped`,
      };
    }
  }

  // Re-sort in canonical page order so the UI can render top-to-bottom.
  const order: Record<SectionType, number> = {
    hero: 0,
    featureCards: 1,
    quickstart: 2,
  };
  completed.sort((a, b) => order[a.type] - order[b.type]);

  const page: DocsSaasPage = { brand, sections: completed };
  yield { type: "done", page };
}

import type { Brand } from "../../remotion/schema";
import { agentCall } from "../streamGenerate";
import { mockGenerateDoc } from "./mockGenerate";
import {
  DOC_TYPE_META,
  type Answer,
  type DocOutput,
  type DocStreamEvent,
  type DocType,
  type DocsRequest,
  type DocsResult,
} from "./schema";

// ─── Per-doc writer prompts ───────────────────────────────────────────

const SHARED_VOICE = `Style: confident, restrained, no marketing fluff. Apple/Linear/Vercel voice — declarative sentences, cut to the bone. No emoji. No buzzwords.
Use the brand name verbatim (preserve capitalization). Treat the prompt as the brief and stay grounded in what it actually says — do not invent metrics, customers, or features that aren't implied by it.`;

const WRITER_PROMPTS: Record<DocType, string> = {
  landingPage: `You write landing page copy for SaaS launches.

Output FORMAT — markdown, with this structure (no preamble, no postamble):

# <product name> — <one-line tagline (≤ 8 words)>

## <Hero subhead — what the product does, one sentence>

<Two short paragraphs (≤ 60 words each) that elaborate the problem and the fix>

## Why teams switch

- **<benefit 1 (1-2 words)>** — <one-sentence elaboration>
- **<benefit 2>** — <one-sentence elaboration>
- **<benefit 3>** — <one-sentence elaboration>
- **<benefit 4>** — <one-sentence elaboration>

## <closing CTA heading (3-5 words)>

<One-paragraph close.>

[Get started →]

${SHARED_VOICE}`,

  blogPost: `You write launch announcement blog posts for SaaS products.

Output FORMAT — markdown, 600-800 words, with this structure:

# <Announcement headline (≤ 8 words)>

<Opening paragraph: the news, in plain terms. ≤ 50 words.>

## The problem we kept hearing

<One paragraph naming the user pain. Specific not abstract.>

## What <product> does

<One paragraph explaining the solution. Then a short bullet list (3-5 items) of concrete capabilities.>

## Why now

<One short paragraph: why this product, why this moment.>

## What's next

<One paragraph hinting at the roadmap without overpromising.>

<Closing line with a call to action and the URL placeholder.>

${SHARED_VOICE}`,

  faq: `You write FAQ documents for SaaS products. Anticipate real customer questions.

Output FORMAT — markdown, 8-10 Q&A pairs, with this structure:

# <Product> FAQ

**<Question 1?>**
<Answer 1 — 1-3 sentences, direct.>

**<Question 2?>**
<Answer 2.>

(continue for 8-10 pairs)

Cover this question mix:
1. What is <product>?
2. How much does it cost?
3. How fast can I get started?
4. Do I need a credit card?
5. What integrations are supported?
6. How does pricing scale?
7. Is my data private?
8. What's the cancellation/refund policy?
9. Who is it NOT for?
10. Where do I get support?

Adjust the question wording to fit the actual product. Answers must be concrete and grounded in the prompt — never invent specific dollar amounts, integrations, or SLAs unless the prompt mentions them.

${SHARED_VOICE}`,

  releaseNotes: `You write release notes for SaaS products. These document what changed in a release.

Output FORMAT — markdown, with this structure:

# <Product> — Release notes

## What's new

- <Bullet 1: a new capability, in user terms, ≤ 12 words>
- <Bullet 2>
- <Bullet 3>
- <Bullet 4 (optional)>
- <Bullet 5 (optional)>

## Fixes

- <Bug fix 1, in user terms>
- <Bug fix 2>
- <Bug fix 3>

## Coming next

- <Future item 1 — vague is fine, but no firm dates>
- <Future item 2>

— The <Product> team

${SHARED_VOICE}`,
};

// ─── User-prompt builder ──────────────────────────────────────────────

const formatAnswers = (answers?: Answer[]): string => {
  if (!answers || answers.length === 0) return "";
  const lines = answers
    .filter((a) => a.answer.trim().length > 0)
    .map((a) => `Q: ${a.question}\nA: ${a.answer.trim()}`);
  if (lines.length === 0) return "";
  return `\n\nAdditional context from the interview (use these as ground truth — these are facts the founder provided):\n\n${lines.join("\n\n")}\n`;
};

const buildWriterUser = (
  docType: DocType,
  prompt: string,
  brand: Brand,
  answers?: Answer[],
): string => `Brand: ${brand.name}
Brand color: ${brand.color}
Accent color: ${brand.accent}

Brief from product team:
${prompt}${formatAnswers(answers)}

Produce the ${DOC_TYPE_META[docType].label} now in the format specified.`;

// ─── Single-writer call ───────────────────────────────────────────────

const runWriter = async (
  docType: DocType,
  prompt: string,
  brand: Brand,
  answers?: Answer[],
): Promise<{ doc: DocOutput; source: "nim-gemma" | "gemini" } | null> => {
  const out = await agentCall(
    WRITER_PROMPTS[docType],
    buildWriterUser(docType, prompt, brand, answers),
    1800,
  );
  if (!out) return null;

  const markdown = out.text.trim();
  if (!markdown || markdown.length < 80) return null;

  return {
    doc: { type: docType, markdown },
    source: out.source,
  };
};

// ─── Orchestrator (mirror of streamStoryboard) ────────────────────────

export async function* streamDocs(
  req: DocsRequest,
): AsyncGenerator<DocStreamEvent> {
  const { prompt, brand, docTypes, answers } = req;

  yield { type: "meta", total: docTypes.length, docTypes };

  // Announce all writers as thinking up front so the UI can render the
  // pending grid before any LLM call returns.
  for (const docType of docTypes) {
    yield {
      type: "agent",
      agent: "doc-writer",
      docType,
      status: "thinking",
      message: `Writing ${DOC_TYPE_META[docType].label}…`,
    };
  }

  const starts = new Map<DocType, number>();
  const pending = new Map<
    DocType,
    Promise<{
      docType: DocType;
      result: Awaited<ReturnType<typeof runWriter>>;
    }>
  >();

  for (const docType of docTypes) {
    starts.set(docType, Date.now());
    pending.set(
      docType,
      runWriter(docType, prompt, brand, answers)
        .then((result) => ({ docType, result }))
        .catch(() => ({
          docType,
          result: null as Awaited<ReturnType<typeof runWriter>>,
        })),
    );
  }

  const completed: DocOutput[] = [];

  while (pending.size > 0) {
    const winner = await Promise.race(pending.values());
    pending.delete(winner.docType);
    const elapsed = Date.now() - (starts.get(winner.docType) ?? Date.now());

    if (winner.result) {
      completed.push(winner.result.doc);
      yield {
        type: "agent",
        agent: "doc-writer",
        docType: winner.docType,
        status: "done",
        message: `${DOC_TYPE_META[winner.docType].label} ready`,
        ms: elapsed,
        source: winner.result.source,
      };
      yield { type: "doc", doc: winner.result.doc };
    } else {
      // Fall back to mock so the user still gets something for this doc type.
      const fallback = mockGenerateDoc(winner.docType, prompt, brand);
      completed.push(fallback);
      yield {
        type: "agent",
        agent: "doc-writer",
        docType: winner.docType,
        status: "failed",
        message: `${DOC_TYPE_META[winner.docType].label} fell back to mock`,
      };
      yield { type: "doc", doc: fallback };
    }
  }

  const result: DocsResult = { brand, docs: completed };
  yield { type: "done", result };
}

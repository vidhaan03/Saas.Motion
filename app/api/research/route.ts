// Research Pro pipeline — powers the ⚡ Research Pro toggle on the landing page.
//
// Two actions:
//   identify  (POST, JSON response)  — quick sync call: resolve product from prompt,
//                                       detect ambiguity, return options for the panel.
//   pipeline  (POST, SSE stream)     — four parallel-friendly steps that stream results
//                                       back as they complete: stats → competitors →
//                                       colors → icons.
//
// Both actions delegate to agentCall() — the same NIM-primary / Gemini-fallback
// pipeline that drives storyboard generation, so they automatically benefit from
// whichever provider is configured and healthy.

import { z } from "zod";
import { agentCall } from "../../../lib/streamGenerate";
import { ICON_NAMES } from "../../../remotion/decorIcons";

// ── Helpers ──────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
const sse = (data: unknown) =>
  encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

function tryParse(text: string | null): unknown {
  if (!text) return null;
  const t = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    try {
      return JSON.parse(t.slice(a, b + 1));
    } catch {
      return null;
    }
  }
}

const ICON_LIST = ICON_NAMES.join(", ");

// ── Request schemas ───────────────────────────────────────────────────────────

const identifySchema = z.object({
  action: z.literal("identify"),
  prompt: z.string().min(1).max(2000),
});

const pipelineSchema = z.object({
  action: z.literal("pipeline"),
  productName: z.string().min(1).max(200),
  productDescription: z.string().max(500),
  category: z.string().max(100),
  existingColor: z.string().optional(),
  existingAccent: z.string().optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  identifySchema,
  pipelineSchema,
]);

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  // ── Action: identify ─────────────────────────────────────────────────────────
  // Synchronous JSON — fast single call, resolves product name + ambiguity.
  if (parsed.data.action === "identify") {
    const { prompt } = parsed.data;

    const out = await agentCall(
      `You are a product identification agent. Given an ad brief, determine exactly what product or company the user wants to advertise.

Return ONLY a valid JSON object — no markdown, no surrounding text:
{
  "name": "Exact product or company name",
  "description": "One to two factual sentences about what this product is and does.",
  "category": "specific-slug (e.g. music-streaming, developer-tools, payments, ai-assistant, food-delivery, saas-analytics, telephony, e-commerce)",
  "ambiguous": false,
  "alternatives": []
}

If the product name is genuinely ambiguous — meaning a reasonable person could interpret it as several different real products — set "ambiguous": true and list alternatives:
{
  "name": "most likely match",
  "description": "...",
  "category": "...",
  "ambiguous": true,
  "alternatives": [
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." }
  ]
}

For unambiguous cases (e.g. "Spotify", "Stripe", "Notion"), always set ambiguous: false and alternatives: [].`,
      `Ad brief: "${prompt}"

Identify the product and return the JSON.`,
      700,
    );

    const data = tryParse(out?.text ?? null) as Record<string, unknown> | null;

    if (!data?.name || typeof data.name !== "string") {
      // Graceful fallback: extract the most likely product noun from the prompt.
      const stripped = prompt
        .replace(
          /^(create|make|build|generate|write|design)?\s*(an?\s+)?(ad|advert|advertisement|campaign|video|spot|promo)?\s*(for|about|of|on)?\s*/i,
          "",
        )
        .trim();
      return Response.json({
        name: stripped.slice(0, 60) || prompt.slice(0, 60),
        description: prompt,
        category: "product",
        ambiguous: false,
        alternatives: [],
      });
    }

    return Response.json(data);
  }

  // ── Action: pipeline ─────────────────────────────────────────────────────────
  // SSE stream — four sequential agentCall steps that each emit a typed event
  // the moment they complete, so the panel updates in real time.
  const {
    productName,
    productDescription,
    category,
    existingColor = "#0F0F0F",
    existingAccent = "#6366F1",
  } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(sse(event));

      try {
        // ── Step: stats ────────────────────────────────────────────────────────
        send({ type: "step", step: "stats", status: "start" });

        const statsOut = await agentCall(
          `You are a market data analyst. Your job is to surface REAL, publicly verifiable statistics for products.
Only include numbers that have been reported in press releases, earnings calls, official announcements, or widely-cited journalism.
Do NOT invent or estimate. If you cannot verify a number, omit it entirely.

Return ONLY a valid JSON object — no markdown, no text outside the JSON:
{
  "stats": [
    { "value": "640M", "label": "monthly active users" },
    { "value": "252M", "label": "paid subscribers" }
  ]
}
Limit to the 4 most impressive, well-known real figures. Return an empty array if none are verifiable.`,
          `Product: ${productName}
Category: ${category}
Description: ${productDescription}

Return real publicly-reported statistics for this product.`,
          600,
        );

        const statsData = tryParse(statsOut?.text ?? null) as {
          stats?: Array<{ value: string; label: string }>;
        } | null;
        const stats: Array<{ value: string; label: string }> =
          Array.isArray(statsData?.stats) ? statsData.stats : [];

        send({ type: "step", step: "stats", status: "done", data: { stats } });

        // ── Step: competitors ──────────────────────────────────────────────────
        send({ type: "step", step: "competitors", status: "start" });

        const compOut = await agentCall(
          `You are a brand strategist with comprehensive knowledge of real advertising campaigns.
Describe how this product's actual competitors advertise — based on campaigns and brand identities you know about.
Be specific: reference real visual styles, ad formats, and color palettes.

Return ONLY a valid JSON object — no markdown, no text outside the JSON:
{
  "competitors": ["Brand A", "Brand B", "Brand C"],
  "adStyle": "Specific description of how competitors advertise: visual language, cinematography, pacing, mood. Reference real campaigns where possible.",
  "colorInsights": "What color palettes dominate advertising in this category and why.",
  "toneInsights": "The prevailing ad tone in this space: e.g. technical-precise, warm-aspirational, bold-punchy."
}`,
          `Product: ${productName} (${category})
Description: ${productDescription}

Who are the 3–5 main competitors and how do they advertise?`,
          800,
        );

        const compData = tryParse(compOut?.text ?? null) as Record<
          string,
          unknown
        > | null;
        const competitors = Array.isArray(compData?.competitors)
          ? (compData.competitors as string[])
          : [];
        const adStyle =
          typeof compData?.adStyle === "string"
            ? compData.adStyle
            : "Premium, minimal aesthetic with bold typography";
        const colorInsights =
          typeof compData?.colorInsights === "string"
            ? compData.colorInsights
            : "Dark backgrounds with vibrant accent colors";
        const toneInsights =
          typeof compData?.toneInsights === "string"
            ? compData.toneInsights
            : "Confident and aspirational";

        send({
          type: "step",
          step: "competitors",
          status: "done",
          data: { competitors, adStyle, colorInsights, toneInsights },
        });

        // ── Step: colors ───────────────────────────────────────────────────────
        send({ type: "step", step: "colors", status: "start" });

        const colorOut = await agentCall(
          `You are a brand color expert. Determine the definitive hex color palette for this product's motion-graphics ad.

Priority rules (apply strictly in order):
1. KNOWN BRAND: If this is a recognisable brand (Spotify, Apple, Stripe, Notion, Figma, Linear, Vercel, GitHub, Netflix, Airbnb, etc.) — return their ACTUAL official brand hex colors. Do not guess. Use the real ones.
2. STARTUP / UNKNOWN: If the brand is not widely known, derive colors from:
   - The product category's established visual conventions
   - The competitor color context provided
   - Premium SaaS aesthetics (rich darks, bold accents)

Primary = the dominant base / background color.
Accent  = the brand's signature highlight / CTA color.

Return ONLY a valid JSON object — no markdown, no surrounding text:
{ "primary": "#191414", "accent": "#1DB954", "rationale": "Spotify's actual brand colors: near-black and signature green." }`,
          `Product: ${productName}
Category: ${category}
Description: ${productDescription}
Competitor color context: ${colorInsights}
User's current placeholder colors (override with real brand colors if known): primary=${existingColor}, accent=${existingAccent}`,
          400,
        );

        const colorData = tryParse(colorOut?.text ?? null) as {
          primary?: string;
          accent?: string;
          rationale?: string;
        } | null;

        // Validate hex — fall back to existing if the model returned garbage
        const hexRe = /^#[0-9A-Fa-f]{6}$/;
        const primary =
          colorData?.primary && hexRe.test(colorData.primary)
            ? colorData.primary
            : existingColor;
        const accent =
          colorData?.accent && hexRe.test(colorData.accent)
            ? colorData.accent
            : existingAccent;
        const rationale =
          colorData?.rationale ?? "Derived from product category";

        send({
          type: "step",
          step: "colors",
          status: "done",
          data: { primary, accent, rationale },
        });

        // ── Step: icons ────────────────────────────────────────────────────────
        send({ type: "step", step: "icons", status: "start" });

        const iconOut = await agentCall(
          `You select exactly 4 semantically meaningful icons for a motion-graphics ad from a fixed catalog.
The icons appear as decorative glyphs in the background — they should immediately say what the product DOES.

Available icons (use exact names only — do not invent names):
${ICON_LIST}

Rules:
- Pick exactly 4 icons from the list above
- Use exact names as listed — if a name isn't in the list, don't use it
- Choose icons that represent the product's core function, not generic decoration
- Known mappings: Spotify→wave,signal,spark,bolt | Stripe→card,lock,globe,shield | GitHub→code,terminal,server,cloud | Notion→database,server,code,target | Security product→lock,shield,key,server | Analytics→chart-bar,chart-line,target,database | AI→brain,spark,bolt,cloud | Telephony→phone,wave,signal,message

Return ONLY valid JSON: { "icons": ["name1", "name2", "name3", "name4"] }`,
          `Product: ${productName}
Category: ${category}
Description: ${productDescription}

Select exactly 4 icons from the catalog above.`,
          200,
        );

        const iconData = tryParse(iconOut?.text ?? null) as {
          icons?: unknown[];
        } | null;
        const raw: string[] = Array.isArray(iconData?.icons)
          ? (iconData.icons as string[])
          : [];
        const validIcons = raw.filter((i) =>
          (ICON_NAMES as readonly string[]).includes(i),
        );

        // Category-keyed fallbacks in case the model returns names not in the catalog
        const FALLBACKS: Record<string, string[]> = {
          "music-streaming": ["wave", "signal", "spark", "bolt"],
          music: ["wave", "signal", "spark", "bolt"],
          "developer-tools": ["code", "terminal", "cloud", "server"],
          developer: ["code", "terminal", "cloud", "server"],
          payments: ["card", "wallet", "lock", "key"],
          fintech: ["card", "wallet", "lock", "key"],
          security: ["lock", "shield", "key", "server"],
          analytics: ["chart-bar", "chart-line", "target", "database"],
          "saas-analytics": ["chart-bar", "chart-line", "target", "database"],
          "ai-assistant": ["brain", "spark", "bolt", "cloud"],
          ai: ["brain", "spark", "bolt", "cloud"],
          communication: ["phone", "message", "wave", "signal"],
          telephony: ["phone", "wave", "signal", "message"],
          "e-commerce": ["card", "wallet", "globe", "target"],
          travel: ["globe", "signal", "cloud", "target"],
          "food-delivery": ["globe", "spark", "bolt", "target"],
        };

        const icons =
          validIcons.length >= 2
            ? validIcons.slice(0, 4)
            : (FALLBACKS[category] ??
              FALLBACKS[category.split("-")[0]] ?? ["spark", "bolt", "target", "globe"]);

        send({ type: "step", step: "icons", status: "done", data: { icons } });

        // ── Done ───────────────────────────────────────────────────────────────
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Pipeline failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

import { z } from "zod";
import { ICON_NAMES } from "../../../remotion/decorIcons";

const stepSchema = z.object({
  step: z.enum(["identify", "stats", "competitors", "colors", "icons"]),
  prompt: z.string().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  category: z.string().optional(),
  competitorInsights: z.string().optional(),
  existingColor: z.string().optional(),
  existingAccent: z.string().optional(),
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Use gemini-2.0-flash for search grounding (supports google_search tool)
// Fall back to configured model without search
async function callGeminiSearch(user: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const model = "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: user }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    // Fallback without search
    return callGeminiJSON("You are a helpful assistant. Answer concisely.", user, 800);
  }
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callGeminiJSON(system: string, user: string, maxTokens = 1000): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function tryParse(text: string | null): unknown {
  if (!text) return null;
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch {
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = stepSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { step, prompt, productName, productDescription, category, competitorInsights, existingColor, existingAccent } = parsed.data;

  try {
    if (step === "identify") {
      // Use search grounding to identify the product
      const searchQuery = `Research this product/service for an ad campaign: "${prompt}"

Find: what exactly is this product, who makes it, what category is it in, key facts.
If there could be multiple products with this name, list the top alternatives.

Respond with JSON only (no markdown):
{
  "name": "exact product/company name",
  "description": "1-2 sentence description",
  "category": "e.g. music-streaming / developer-tools / payments / food-delivery / etc",
  "ambiguous": false,
  "alternatives": []
}

If ambiguous, set ambiguous: true and list alternatives:
{
  "name": "most likely match",
  "description": "...",
  "category": "...",
  "ambiguous": true,
  "alternatives": [
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." }
  ]
}`;

      const raw = await callGeminiSearch(searchQuery);
      const result = tryParse(raw) as Record<string, unknown> | null;

      if (!result) {
        // Fallback: basic extraction
        const fallback = await callGeminiJSON(
          "You identify products from user prompts. Return JSON only.",
          `From this ad brief, identify the product: "${prompt}"\nReturn: { "name": string, "description": string, "category": string, "ambiguous": false, "alternatives": [] }`,
        );
        const fb = tryParse(fallback) as Record<string, unknown> | null;
        return Response.json(fb ?? { name: prompt?.slice(0, 50), description: prompt, category: "product", ambiguous: false, alternatives: [] });
      }
      return Response.json(result);
    }

    if (step === "stats") {
      const searchQuery = `Find real, current statistics and key metrics for ${productName} (${productDescription}).

Look for: user counts, revenue, growth rates, market share, any impressive numbers used in their actual marketing.
Only include REAL verified numbers, not estimates.

Respond with JSON only:
{
  "stats": [
    { "value": "650M", "label": "monthly active users" },
    { "value": "31%", "label": "year-over-year growth" }
  ]
}`;

      const raw = await callGeminiSearch(searchQuery);
      const result = tryParse(raw) as Record<string, unknown> | null;

      if (!result?.stats) {
        const fallback = await callGeminiJSON(
          "You research product statistics. Return JSON only with real stats.",
          `Find key statistics for ${productName}: Return { "stats": [{ "value": string, "label": string }] } — use real known numbers, max 5 stats`,
        );
        const fb = tryParse(fallback) as { stats?: unknown[] } | null;
        return Response.json(fb ?? { stats: [] });
      }
      return Response.json(result);
    }

    if (step === "competitors") {
      const searchQuery = `Research the main competitors of ${productName} (${category}) and analyze their advertising aesthetic.

Find: who are the top 3-5 competitors, and how do they advertise? What visual style, colors, and tone do they use in their ads?

Respond with JSON only:
{
  "competitors": ["Competitor A", "Competitor B", "Competitor C"],
  "adStyle": "Dark, premium aesthetic with bold typography and minimal UI shots — similar to Apple's style",
  "colorInsights": "Industry uses dark backgrounds (#000 or near-black) with vibrant accent colors (green, blue, purple)",
  "toneInsights": "Confident, aspirational, feature-forward"
}`;

      const raw = await callGeminiSearch(searchQuery);
      const result = tryParse(raw) as Record<string, unknown> | null;

      if (!result) {
        const fallback = await callGeminiJSON(
          "You research competitive landscapes. Return JSON only.",
          `Competitors of ${productName} (${category}): Return { "competitors": string[], "adStyle": string, "colorInsights": string, "toneInsights": string }`,
        );
        return Response.json(tryParse(fallback) ?? { competitors: [], adStyle: "Professional, clean", colorInsights: "Industry standard", toneInsights: "Confident" });
      }
      return Response.json(result);
    }

    if (step === "colors") {
      const system = `You are a brand color expert. Given a product and competitor insights, suggest the PERFECT color palette for an ad.

Think like a designer: what colors INSTANTLY say "${category}" to a viewer?
- Music apps: deep black + vibrant green (Spotify), dark + gradient (Apple Music)
- Dev tools: dark + blue/purple or terminal green
- Payments: deep blue + gold, or purple + teal
- Food delivery: warm red/orange on dark, or bright green
- AI products: dark + electric blue/purple
- Analytics: dark + electric blue
- Security: dark + gold/amber

CRITICAL: If the brand already has established colors (Spotify=black+green, Notion=black+white, Stripe=purple+dark), use those.

Return JSON only:
{
  "primary": "#hex",
  "accent": "#hex",
  "rationale": "one sentence explaining why these colors fit this product/category"
}`;

      const user = `Product: ${productName}
Category: ${category}
Description: ${productDescription}
Current colors set by user: primary=${existingColor ?? "not set"}, accent=${existingAccent ?? "not set"}
Competitor insights: ${competitorInsights ?? "none"}

Suggest the best color palette for this product's ad.`;

      const raw = await callGeminiJSON(system, user, 400);
      return Response.json(tryParse(raw) ?? { primary: existingColor ?? "#0F0F0F", accent: existingAccent ?? "#6366F1", rationale: "Based on product category" });
    }

    if (step === "icons") {
      const availableIcons = ICON_NAMES.join(", ");
      const system = `You select the most semantically relevant icons for an ad from a fixed list.

Available icons: ${availableIcons}

Rules:
- Pick exactly 4 icons from the list above (exact names only)
- Pick icons that visually represent the PRODUCT CATEGORY
- Examples: music → wave, spark, bolt, globe; dev tools → code, terminal, cloud, server; payments → card, wallet, lock, key
- Return JSON only: { "icons": ["icon1", "icon2", "icon3", "icon4"] }`;

      const user = `Product: ${productName}
Category: ${category}
Description: ${productDescription}

Select 4 icons from the available list that best represent this product.`;

      const raw = await callGeminiJSON(system, user, 200);
      const result = tryParse(raw) as { icons?: unknown[] } | null;
      const icons = (result?.icons as string[] | undefined)?.filter((i) => (ICON_NAMES as readonly string[]).includes(i)) ?? [];

      // Fallback: category-based defaults
      if (icons.length < 2) {
        const defaults: Record<string, string[]> = {
          "music": ["wave", "signal", "spark", "bolt"],
          "music-streaming": ["wave", "signal", "spark", "bolt"],
          "developer": ["code", "terminal", "cloud", "server"],
          "developer-tools": ["code", "terminal", "cloud", "server"],
          "payments": ["card", "wallet", "lock", "key"],
          "security": ["lock", "shield", "key", "server"],
          "analytics": ["chart-bar", "chart-line", "target", "database"],
          "ai": ["brain", "spark", "bolt", "cloud"],
          "communication": ["phone", "message", "wave", "signal"],
          "food": ["globe", "spark", "bolt", "target"],
          "travel": ["globe", "signal", "cloud", "target"],
        };
        const fallback = defaults[category?.toLowerCase() ?? ""] ?? ["spark", "bolt", "target", "globe"];
        return Response.json({ icons: fallback });
      }
      return Response.json({ icons: icons.slice(0, 4) });
    }

    return Response.json({ error: "Unknown step" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Research failed" }, { status: 500 });
  }
}

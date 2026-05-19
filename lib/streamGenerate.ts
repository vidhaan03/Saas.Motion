// ─────────────────────────────────────────────────────────────────────────
// Agentic MoE pipeline for storyboard generation.
//
// Architecture:
//
//   user prompt ─▶ Director agent (1 call: NIM Gemma → Gemini)
//                       │
//                       ▼
//                 [scene plan]
//                       │
//                  ┌────┴────┬─────────┬─────────┐  PARALLEL
//                  ▼         ▼         ▼         ▼
//             Specialist  Specialist  …      Specialist  (each: NIM Gemma
//             (one per scene type, narrow per-type prompt)  → Gemini → drop)
//                  │         │         │         │
//                  └────┬────┴─────────┴─────────┘
//                       ▼
//                 race-yield scenes as each completes
//
// Why this is faster + cheaper than one big call:
//  • Each specialist sees ONE scene type's schema, not all 10 → smaller prompt
//  • All specialists run in parallel → total latency ≈ max(t1..tN), not sum
//  • Per-scene failure drops only that scene; storyboard still ships
//
// Older single-shot generation paths (Claude + monolithic Gemma) are
// preserved further down, commented out, for reference.
// ─────────────────────────────────────────────────────────────────────────

// import Anthropic from "@anthropic-ai/sdk";
import {
  sceneSchema,
  decorElementSchema,
  type Brand,
  type DecorElement,
  type Scene,
  type Storyboard,
} from "../remotion/schema";
import { ICON_DESCRIPTIONS, type IconName } from "../remotion/decorIcons";
// Server-safe vibe resolver — pulls data without importing Remotion's
// Easing (which transitively requires React.createContext and crashes
// in the Node runtime).
import { resolveVibeData } from "../remotion/vibeKeys";
// SYSTEM_PROMPT / buildUserPrompt belong to the older monolithic flow.
// Retained import so the commented-out code below still type-checks.
import { SYSTEM_PROMPT as _LEGACY_SYSTEM_PROMPT } from "./buildPrompt";
import { mockGenerate } from "./mockGenerate";

// Suppress unused-import lint while we keep the legacy import alive.
void _LEGACY_SYSTEM_PROMPT;

export type StreamSource =
  | "mock"
  // | "claude"               // disabled — superseded by NVIDIA NIM
  | "gemini"
  | "nim-gemma"
  | "nim-llama"
  | "agentic-nim" // director + specialists, all on NIM (fallback path)
  | "agentic-gemini" // director + specialists, all on Gemini (primary path)
  | "agentic-mixed"; // some agents on Gemini, others on NIM

export type AgentEvent =
  | {
      type: "agent";
      agent: "director";
      status: "thinking";
      message: string;
    }
  | {
      type: "agent";
      agent: "director";
      status: "done";
      message: string;
      ms: number;
      source: "nim-gemma" | "gemini";
    }
  | {
      type: "agent";
      agent: "director";
      status: "failed";
      message: string;
    }
  | {
      type: "agent";
      agent: "specialist";
      index: number;
      sceneType: Scene["type"];
      status: "thinking";
      message: string;
    }
  | {
      type: "agent";
      agent: "specialist";
      index: number;
      sceneType: Scene["type"];
      status: "done";
      message: string;
      ms: number;
      source: "nim-gemma" | "gemini";
    }
  | {
      type: "agent";
      agent: "specialist";
      index: number;
      sceneType: Scene["type"];
      status: "failed";
      message: string;
    };

export type StreamEvent =
  | { type: "meta"; source: StreamSource; total: number }
  | { type: "scene"; scene: Scene; index: number }
  | { type: "done"; storyboard: Storyboard }
  | { type: "error"; message: string }
  | AgentEvent;

// ───────── Generic JSON helpers ─────────

const stripFences = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

const tryParseJson = (text: string): unknown | null => {
  const trimmed = stripFences(text);
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1) return null;
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      return null;
    }
  }
};

// Per-call timeouts. NIM cold-starts can be slow; without a client-side
// abort the fetch sits forever waiting on the server. 15s is enough for
// a warm call to finish, short enough to fail through to Gemini on a cold
// NIM. Override via env if needed.
const NIM_TIMEOUT_MS = Number(process.env.NVIDIA_NIM_TIMEOUT_MS ?? "15000");
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? "20000");

// Single NIM chat call. Returns the raw assistant text or throws.
// Models are OpenAI-compatible at /v1/chat/completions.
const callNvidiaChat = async (
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string | null> => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) return null;

  const endpoint =
    process.env.NVIDIA_NIM_BASE_URL ??
    "https://integrate.api.nvidia.com/v1/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(NIM_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `NIM ${model} error ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
};

const callGeminiChat = async (
  system: string,
  user: string,
  maxTokens: number,
): Promise<string | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Fast default — Flash Lite at ~2.3s/call is now the primary text model.
  // Override via env if you want full Flash or Pro.
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini error ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? null;
  // Surface unusual finishReasons so we can tell short-output cases from
  // safety blocks from token-limit truncation. "STOP" is the normal case.
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    console.warn(
      `[gemini] finishReason=${candidate.finishReason} (textLen=${text?.length ?? 0})`,
    );
  }
  if (data.promptFeedback?.blockReason) {
    console.warn(
      `[gemini] promptFeedback.blockReason=${data.promptFeedback.blockReason}`,
    );
  }
  return text;
};

// One agent call. Tries NIM first (no free-tier daily quota, ~5s/call),
// falls back to Gemini if NIM errors. Source key "nim-gemma" is kept for
// back-compat with the UI label map; it's just whichever NIM model is
// configured.
//
// Older order (Gemini → NIM) was hitting Gemini's 1500 req/day free-tier
// quota; with 1 director + 5 specialists per generation that cap is
// reached in ~250 generations, after which every call 429s.
export type AgentSource = "nim-gemma" | "gemini";
export const agentCall = async (
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; source: AgentSource } | null> => {
  const nimModel =
    process.env.NVIDIA_NIM_MODEL ?? "meta/llama-4-maverick-17b-128e-instruct";

  // 1) Primary: NIM
  try {
    const text = await callNvidiaChat(nimModel, system, user, maxTokens);
    if (text && text.trim()) return { text, source: "nim-gemma" };
    console.warn(
      `[agent] NIM (${nimModel}) returned empty text — falling through to Gemini`,
    );
  } catch (e) {
    console.warn(
      `[agent] NIM (${nimModel}) failed — falling through to Gemini:`,
      e instanceof Error ? e.message : String(e),
    );
  }

  // 2) Fallback: Gemini (fast, but capped by daily free-tier quota)
  try {
    const text = await callGeminiChat(system, user, maxTokens);
    if (text && text.trim()) return { text, source: "gemini" };
    console.warn("[agent] Gemini returned empty text");
  } catch (e) {
    console.warn(
      "[agent] Gemini failed:",
      e instanceof Error ? e.message : String(e),
    );
  }

  return null;

  // Older order (NIM → Gemini):
  // try { const text = await callNvidiaChat(...); if (text) return {text, source:"nim-gemma"}; } catch {}
  // try { const text = await callGeminiChat(...); if (text) return {text, source:"gemini"}; } catch { return null; }
};

// ───────── Director agent (1 call) ─────────

const ALL_SCENE_TYPES: Scene["type"][] = [
  "kineticTitle",
  "statReveal",
  "featureGrid",
  "productDemo",
  "testimonialQuote",
  "logoWall",
  "ctaCard",
  "multiScript",
  "productCarousel",
  "uiShowcase",
];

type ScenePlan = {
  type: Scene["type"];
  duration: number;
  brief: string;
  decor?: DecorElement[];
};

// Build the icon catalogue once at module load so the prompt stays in
// sync with whatever names decorIcons.ts declares.
const ICON_CATALOG = (
  Object.keys(ICON_DESCRIPTIONS) as IconName[]
)
  .map((n) => `  - "${n}": ${ICON_DESCRIPTIONS[n]}`)
  .join("\n");

const DIRECTOR_SYSTEM = `You are the Director agent for a motion-graphics ad storyboard.

You are NOT a random storyboard generator. You think like a creative director
at an agency: before picking scene types and decor, you REASON about the
brand's design language and choose visual elements that EXPRESS it.

═══════════════ STEP 1 — Brand design-language reasoning ═══════════════

Before producing the plan, mentally answer these questions:
  1. What vertical is this brand in? (telephony / dev tools / analytics /
     payments / AI / security / consumer / etc.)
  2. What visual style would feel NATIVE to a launch ad for this brand?
     Pick one of: technical-minimal, warm-friendly, editorial-bold,
     designer-experimental, corporate-trustworthy, energetic-startup.
  3. Which ICONS from the catalogue actually represent this product?
     Pick a SET of 4-6 semantically tight icons. Don't reach for
     "abstract" filler — every icon should mean something for THIS brand.
  4. What MOTION CHARACTER fits the brand? precise & quick (techy /
     telephony) vs soft & considered (consumer / editorial) vs
     punchy-overshoot (energetic startup).

You're producing an AD that should feel like the brand made it themselves.
A telephony product gets phone/wave/signal icons in cool blues, considered
motion. A dev tool gets code/terminal/cloud, sharp motion. An analytics
tool gets chart-bar/chart-line/target, precise motion. A security tool
gets lock/shield/key, slow & trustworthy.

═══════════════ STEP 2 — Output the plan ═══════════════

Given a user brief and brand, produce a high-level plan for a short cinematic 9:16 SaaS ad video. Pick scene TYPES from this fixed list (no inventing types):
kineticTitle, statReveal, featureGrid, productDemo, testimonialQuote, logoWall, ctaCard, multiScript, productCarousel, uiShowcase

Output JSON with this exact shape:
{ "plan": [ { "type": "<scene type>", "duration": <integer frames at 30fps>, "brief": "<one sentence>", "decor": [<decor elements>] } ] }

Rules:
- 3 to 6 scenes total. Vary scene types; don't repeat unless intentional.
- Duration ranges per type (frames at 30fps):
  kineticTitle 45-80, statReveal 60-90, featureGrid 80-120, productDemo 90-150,
  testimonialQuote 90-150, logoWall 60-100, ctaCard 65-100, multiScript 90-150,
  productCarousel 120-180, uiShowcase 90-180
- Vary structure: don't always open with kineticTitle.
- "brief" is ONE sentence (< 20 words) describing the message of that scene only.

DECOR — per-scene motion-graphic background elements. "decor" is an array
of objects from these three types:

  ORB (3D-shaded sphere, floats slowly):
    { "type": "orb",
      "x": <0-100>, "y": <0-100>,        // % of canvas, center-anchored
      "size": <5-30>,                     // % of shorter axis; >20 is hero-sized
      "color": "brand" | "accent",
      "layer": <0.4-1.2> }                // 0.4 = far/blurred, 1.0 = front

  BEAM (volumetric light ray):
    { "type": "beam",
      "originX": <-20 to 120>, "originY": <-20 to 120>,
      "angle": <0-360>,                   // 0=up, 90=right, 180=down
      "intensity": <0.08-0.4>,
      "color": "brand" | "accent" }

  PARTICLES (sparkling dust field):
    { "type": "particles", "density": "sparse" | "dense" }

  ICON (semantic glyph — THIS IS THE MOST IMPORTANT DECOR):
    { "type": "icon",
      "name": "<icon from catalogue below>",
      "x": <-10 to 110>, "y": <-10 to 110>,
      "size": <3-25>,                     // % of shorter axis; 6-12 typical
      "color": "brand" | "accent",
      "layer": <0.4-1.2> }
    Icon catalogue (pick by MEANING of the product):
${ICON_CATALOG}

Decor guidance — COHERENCE OVER QUANTITY:
- Lock in your icon SET from Step 1's design reasoning. Re-use the SAME
  3-5 icons across scenes (rotated, repositioned, resized). A coherent
  set of 4 phones/waves/signals across 4 scenes reads as a brand visual
  language. A random scatter of 10 different icons reads as noise.
- 2-4 icons per scene. Place at EDGES (x < 30 or x > 70, OR y < 30 or
  y > 70) so the center is clear. Vary their sizes and layer depths to
  build depth.
- Orbs are AMBIENT, not the message. 0-2 per scene, only when the brand
  reads as "atmospheric" (consumer / AI / editorial). A precise dev-tool
  brand probably wants zero orbs — the icons carry the meaning.
- Beams: at most one per scene, originating off-canvas (originY -20 or
  120). Use only if "atmospheric" or "energetic" feel.
- Particles: at most one entry per scene. Skip entirely for
  technical-minimal brands.
- Vibe overrides quantity ceiling: minimal/editorial → 2-3 total elements
  per scene; techy/warm → 3-5; energetic/bold → 5-7.

Return ONLY the JSON object.`;

const runDirector = async (
  prompt: string,
  brand: Brand,
  researchContext?: string,
): Promise<{ plan: ScenePlan[]; source: AgentSource } | null> => {
  const vibe = resolveVibeData(brand.vibe);
  const researchSection = researchContext
    ? `\n\nRESEARCH CONTEXT (use this to make the ad more accurate and grounded):\n${researchContext}\n\nIMPORTANT: Use the Real Stats for statReveal scenes. Honor the Icons list for decor choices. Match the Ad Mood.`
    : "";
  const user = `Brand: ${brand.name}
Color: ${brand.color}
Accent: ${brand.accent}
Vibe: ${vibe.label} — ${vibe.description}
Vibe guidance: ${vibe.directorHint}
Color treatment: ${vibe.colorTreatment}

Ad brief:
${prompt}${researchSection}

Produce the plan JSON now. Honour the vibe guidance above when choosing scene types, count, and pacing.`;

  // Gemini 2.5 Flash Lite counts internal "thinking" tokens against the
  // same budget as output, so a tight cap (400) leaves only a handful of
  // chars for the actual JSON. 2000 is comfortable for any plan size.
  const out = await agentCall(DIRECTOR_SYSTEM, user, 2000);
  if (!out) {
    console.warn("[director] agentCall returned null — both providers failed");
    return null;
  }

  console.warn(
    `[director] got ${out.source} response (${out.text.length} chars):`,
    out.text.slice(0, 240).replace(/\s+/g, " "),
  );

  const parsed = tryParseJson(out.text) as { plan?: unknown } | null;
  if (!parsed) {
    console.warn(
      "[director] tryParseJson FAILED on response. Raw:",
      out.text.slice(0, 500),
    );
    return null;
  }
  if (!Array.isArray(parsed.plan)) {
    console.warn(
      "[director] response had no 'plan' array. Keys:",
      Object.keys(parsed as object),
    );
    return null;
  }

  const validTypes = new Set<Scene["type"]>(ALL_SCENE_TYPES);
  const plan: ScenePlan[] = [];
  let droppedReasons: string[] = [];

  for (const item of parsed.plan) {
    if (typeof item !== "object" || item === null) {
      droppedReasons.push("non-object");
      continue;
    }
    const i = item as Record<string, unknown>;
    if (typeof i.type !== "string" || !validTypes.has(i.type as Scene["type"])) {
      droppedReasons.push(`bad-type:${String(i.type)}`);
      continue;
    }
    const dur = typeof i.duration === "number" ? i.duration : NaN;
    if (!Number.isFinite(dur)) {
      droppedReasons.push(`bad-duration:${i.type}`);
      continue;
    }
    if (typeof i.brief !== "string") {
      droppedReasons.push(`bad-brief:${i.type}`);
      continue;
    }
    // Validate decor with Zod element-by-element; silently drop bad
    // elements so a partial-bad list doesn't trash the whole scene.
    let decor: DecorElement[] | undefined;
    if (Array.isArray(i.decor)) {
      const okElements: DecorElement[] = [];
      for (const raw of i.decor) {
        const parsed = decorElementSchema.safeParse(raw);
        if (parsed.success) okElements.push(parsed.data);
      }
      if (okElements.length > 0) decor = okElements;
    }
    plan.push({
      type: i.type as Scene["type"],
      duration: Math.round(Math.max(30, Math.min(300, dur))),
      brief: i.brief.slice(0, 200),
      decor,
    });
  }

  if (plan.length === 0) {
    console.warn(
      `[director] all ${parsed.plan.length} plan items dropped:`,
      droppedReasons.join(", "),
    );
    return null;
  }
  console.warn(
    `[director] OK — ${plan.length} scenes planned via ${out.source}: ${plan.map((p) => p.type).join(" → ")}`,
  );
  return { plan, source: out.source };
};

// ───────── Specialist agents (one per scene in parallel) ─────────

// Per-type micro-instructions. Each specialist sees ONLY the schema fragment
// for its own type, keeping prompts small and focused.
const SPECIALIST_INSTRUCTIONS: Record<Scene["type"], string> = {
  kineticTitle: `Produce a kineticTitle scene as JSON only:
{ "type": "kineticTitle", "duration": <int>, "lines": [string,...] (1-3 lines, each <= 4 words, NO emoji), "variant": "mask"|"typewriter"|"scale"|"split" (optional), "sfx": "whoosh"|"ding"|"whip"|"none" (optional) }`,

  statReveal: `Produce a statReveal scene as JSON only:
{ "type": "statReveal", "duration": <int>, "value": string (numeric, no commas, e.g. "47000"), "label": string (<=8 words), "suffix": string (optional, e.g. "+", "%", "x"), "variant": "count"|"spin"|"mask" (optional), "sfx": "ding"|"whoosh"|"none" (optional) }`,

  featureGrid: `Produce a featureGrid scene as JSON only:
{ "type": "featureGrid", "duration": <int>, "heading": string (<=5 words), "features": [{"title": string (1-2 words), "body": string (<=10 words)}] (2-4 items) }`,

  productDemo: `Produce a productDemo scene as JSON only:
{ "type": "productDemo", "duration": <int>, "caption": string (optional, <=8 words), "actions": [
  {"at": <int>, "type": "move", "x": <int>, "y": <int>}
  | {"at": <int>, "type": "click", "x": <int>, "y": <int>, "label": string (optional)}
  | {"at": <int>, "type": "zoom", "x": <int>, "y": <int>, "scale": <number>}
  | {"at": <int>, "type": "reset"}
] (2-5 actions; "at" in frames, x/y on a 1000x600 grid) }`,

  testimonialQuote: `Produce a testimonialQuote scene as JSON only:
{ "type": "testimonialQuote", "duration": <int>, "quote": string (one sentence), "author": string, "role": string (optional), "company": string (optional) }`,

  logoWall: `Produce a logoWall scene as JSON only:
{ "type": "logoWall", "duration": <int>, "heading": string (<=4 words), "logos": [{"name": string}] (3-8 items) }`,

  ctaCard: `Produce a ctaCard scene as JSON only:
{ "type": "ctaCard", "duration": <int>, "headline": string (<=5 words), "subtext": string (optional, <=8 words), "buttonLabel": string (1-3 words), "url": string (optional), "variant": "fade"|"mask"|"scale" (optional) }`,

  multiScript: `Produce a multiScript scene as JSON only:
{ "type": "multiScript", "duration": <int>, "glyphs": [{"char": string (single character), "script": string (optional, e.g. "devanagari", "tamil")}] (2-6 items), "caption": string (optional) }`,

  productCarousel: `Produce a productCarousel scene as JSON only:
{ "type": "productCarousel", "duration": <int>, "heading": string (optional, <=5 words), "style": "classic"|"glass"|"dark"|"brutalist" (optional), "products": [{"name": string, "category": string (optional), "price": string (optional, e.g. "$99.00"), "rating": <number 0-5> (optional), "reviewCount": <int> (optional), "ctaLabel": string (optional), "featured": boolean (optional)}] (2-6 items) }`,

  uiShowcase: `Produce a uiShowcase scene as JSON only:
{ "type": "uiShowcase", "duration": <int>, "frame": "browser"|"phone"|"tablet"|"none" (optional), "animation": "scroll"|"zoom-in"|"zoom-out"|"fade"|"tilt"|"static" (optional), "caption": string (optional, <=8 words), "url": string (optional) }`,

  // aiShot scenes don't go through the specialist path — they're
  // produced by the parallel Visual Director pipeline (lib/visualGenerate.ts)
  // which calls FLUX directly. This placeholder exists only to satisfy
  // the exhaustive Record type; it should never be called.
  aiShot: `Produce an aiShot scene as JSON only:
{ "type": "aiShot", "duration": <int>, "imagePrompt": string, "caption": string (optional), "motion": "push-in"|"pull-out"|"pan-left"|"pan-right"|"static" (optional), "overlay": "dark"|"light"|"scrim"|"none" (optional) }`,
};

const SPECIALIST_RULES = `Style: Apple-keynote cinematic. Premium SaaS voice. Confident, no emoji, no marketing fluff. Each text line max 6 words.

Return ONLY the JSON object. No markdown, no commentary.`;

const runSpecialist = async (
  plan: ScenePlan,
  brand: Brand,
): Promise<{ scene: Scene; source: AgentSource } | null> => {
  const system = `You are a ${plan.type} specialist agent in a motion-graphics ad pipeline.

${SPECIALIST_INSTRUCTIONS[plan.type]}

${SPECIALIST_RULES}`;

  const user = `Brand: ${brand.name}
Color: ${brand.color}
Accent: ${brand.accent}
Duration: ${plan.duration} frames at 30fps

Brief: ${plan.brief}

Produce the scene JSON now.`;

  // 2500 leaves headroom for Gemini 2.5 Flash Lite's thinking + a full
  // scene (e.g. productCarousel with 5 products) on the same budget.
  const out = await agentCall(system, user, 2500);
  if (!out) return null;

  const parsed = tryParseJson(out.text);
  if (typeof parsed !== "object" || parsed === null) return null;

  // Force type + duration from the plan to lock the contract.
  const sceneObj = {
    ...(parsed as object),
    type: plan.type,
    duration: plan.duration,
  };
  const validated = sceneSchema.safeParse(sceneObj);
  if (!validated.success) return null;

  return { scene: validated.data, source: out.source };
};

// ───────── Orchestrator: streamStoryboard ─────────

export async function* streamStoryboard(
  prompt: string,
  brand: Brand,
  researchContext?: string,
): AsyncGenerator<StreamEvent> {
  // Phase 1: Director (sequential — gates the rest).
  const directorStart = Date.now();
  yield {
    type: "agent",
    agent: "director",
    status: "thinking",
    message: "Planning scene structure…",
  };

  const directorResult = await runDirector(prompt, brand, researchContext);

  if (!directorResult) {
    yield {
      type: "agent",
      agent: "director",
      status: "failed",
      message: "Director call failed — falling back to mock",
    };
    // Director failed completely — fall back to deterministic mock.
    const storyboard = mockGenerate(prompt, brand);
    yield { type: "meta", source: "mock", total: storyboard.scenes.length };
    for (let i = 0; i < storyboard.scenes.length; i++) {
      yield { type: "scene", scene: storyboard.scenes[i], index: i };
    }
    yield { type: "done", storyboard };
    return;
  }

  const plan = directorResult.plan;
  const flow = plan.map((p) => p.type).join(" → ");
  yield {
    type: "agent",
    agent: "director",
    status: "done",
    message: `Picked ${plan.length} scenes · ${flow}`,
    ms: Date.now() - directorStart,
    source: directorResult.source,
  };

  // Tentative meta source from director. Flipped to "agentic-mixed" later
  // if a specialist answers from a different provider.
  let metaSource: StreamSource =
    directorResult.source === "gemini" ? "agentic-gemini" : "agentic-nim";

  yield { type: "meta", source: metaSource, total: plan.length };

  // Announce all specialists as thinking the moment the plan is known.
  for (let i = 0; i < plan.length; i++) {
    yield {
      type: "agent",
      agent: "specialist",
      index: i,
      sceneType: plan[i].type,
      status: "thinking",
      message: `Writing ${plan[i].type}…`,
    };
  }

  // Phase 2: Parallel specialists with race-yield.
  // pending = idx → promise resolving to { idx, result } where result may be
  // a successful { scene, source } or null (specialist failed → drop scene).
  const specialistStarts = new Map<number, number>();
  const pending = new Map<
    number,
    Promise<{ idx: number; result: Awaited<ReturnType<typeof runSpecialist>> }>
  >();
  plan.forEach((p, idx) => {
    specialistStarts.set(idx, Date.now());
    pending.set(
      idx,
      runSpecialist(p, brand)
        .then((result) => ({ idx, result }))
        .catch(() => ({ idx, result: null as Awaited<ReturnType<typeof runSpecialist>> })),
    );
  });

  const scenes: (Scene | null)[] = new Array(plan.length).fill(null);
  let sawGemini = directorResult.source === "gemini";
  let sawGemma = directorResult.source === "nim-gemma";

  while (pending.size > 0) {
    const winner = await Promise.race(pending.values());
    pending.delete(winner.idx);
    const elapsed = Date.now() - (specialistStarts.get(winner.idx) ?? Date.now());

    if (winner.result) {
      // Merge Director-planned decor onto the specialist's scene. Decor
      // lives on the plan (Director coordinates atmosphere across the
      // storyboard), specialists only own scene content.
      const plannedDecor = plan[winner.idx].decor;
      const mergedScene = plannedDecor
        ? ({ ...winner.result.scene, decor: plannedDecor } as Scene)
        : winner.result.scene;
      scenes[winner.idx] = mergedScene;
      if (winner.result.source === "gemini") sawGemini = true;
      if (winner.result.source === "nim-gemma") sawGemma = true;
      yield {
        type: "agent",
        agent: "specialist",
        index: winner.idx,
        sceneType: plan[winner.idx].type,
        status: "done",
        message: `${plan[winner.idx].type} ready`,
        ms: elapsed,
        source: winner.result.source,
      };
      yield { type: "scene", scene: mergedScene, index: winner.idx };
    } else {
      yield {
        type: "agent",
        agent: "specialist",
        index: winner.idx,
        sceneType: plan[winner.idx].type,
        status: "failed",
        message: `${plan[winner.idx].type} failed — scene dropped`,
      };
    }
    // null result → specialist failed → scene dropped per agreed policy.
  }

  // Mixed-source telemetry — both providers contributed to this storyboard.
  if (sawGemma && sawGemini) {
    metaSource = "agentic-mixed";
  }

  const finalScenes = scenes.filter((s): s is Scene => s !== null);

  if (finalScenes.length === 0) {
    // Every specialist failed — last-resort deterministic mock.
    const fallback = mockGenerate(prompt, brand);
    yield { type: "done", storyboard: fallback };
    return;
  }

  const storyboard: Storyboard = { brand, scenes: finalScenes };
  yield { type: "done", storyboard };
}

// ─────────────────────────────────────────────────────────────────────────
// LEGACY: monolithic single-shot generation (one big call returning the
// whole storyboard). Superseded by the agentic flow above. Kept here so we
// can compare behaviour or roll back without git surgery.
// ─────────────────────────────────────────────────────────────────────────

// const generateWithClaude = async (
//   prompt: string,
//   brand: Brand,
// ): Promise<Storyboard | null> => {
//   const apiKey = process.env.ANTHROPIC_API_KEY;
//   if (!apiKey) return null;
//   const client = new Anthropic({ apiKey });
//   const response = await client.messages.create({
//     model: "claude-sonnet-4-6",
//     max_tokens: 2000,
//     system: _LEGACY_SYSTEM_PROMPT,
//     messages: [{ role: "user", content: buildUserPrompt(prompt, brand) }],
//   });
//   const textBlock = response.content.find((b) => b.type === "text");
//   if (!textBlock || textBlock.type !== "text") return null;
//   const raw = tryParseJson(textBlock.text);
//   const validated = storyboardSchema.safeParse({ ...(raw as object), brand });
//   return validated.success ? validated.data : null;
// };
//
// const generateWithNvidia_monolithic = async (
//   prompt: string,
//   brand: Brand,
//   model: string,
// ): Promise<Storyboard | null> => {
//   const text = await callNvidiaChat(model, _LEGACY_SYSTEM_PROMPT,
//                                     buildUserPrompt(prompt, brand), 2048);
//   if (!text) return null;
//   const raw = tryParseJson(text) as Record<string, unknown> | null;
//   if (!raw) return null;
//   const validated = storyboardSchema.safeParse({ ...raw, brand });
//   return validated.success ? validated.data : null;
// };
//
// const generateWithGemini_monolithic = async (
//   prompt: string,
//   brand: Brand,
// ): Promise<Storyboard | null> => {
//   const text = await callGeminiChat(_LEGACY_SYSTEM_PROMPT,
//                                     buildUserPrompt(prompt, brand), 2048);
//   if (!text) return null;
//   const raw = tryParseJson(text) as Record<string, unknown> | null;
//   if (!raw) return null;
//   const validated = storyboardSchema.safeParse({ ...raw, brand });
//   return validated.success ? validated.data : null;
// };
//
// // Old chain (NIM Gemma → NIM Llama-405B → Gemini → mock), single-shot:
// // for (const m of [process.env.NVIDIA_NIM_MODEL ?? "gemma-4-31b",
// //                  process.env.NVIDIA_NIM_FALLBACK_MODEL ?? "meta/llama-3.1-405b-instruct"]) {
// //   try { storyboard = await generateWithNvidia_monolithic(prompt, brand, m); ... }
// //   catch { storyboard = null; }
// // }

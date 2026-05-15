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
  type Brand,
  type Scene,
  type Storyboard,
} from "../remotion/schema";
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
  | "agentic-nim" // director + specialists, all on NIM Gemma
  | "agentic-mixed"; // some agents fell back to Gemini

export type StreamEvent =
  | { type: "meta"; source: StreamSource; total: number }
  | { type: "scene"; scene: Scene; index: number }
  | { type: "done"; storyboard: Storyboard }
  | { type: "error"; message: string };

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

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
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
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini error ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
};

// One agent call. Tries NIM Gemma first, falls back to Gemini. Returns the
// raw text and which provider answered. Returns null when both fail.
type AgentSource = "nim-gemma" | "gemini";
const agentCall = async (
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; source: AgentSource } | null> => {
  const gemmaModel = process.env.NVIDIA_NIM_MODEL ?? "google/gemma-4-31b-it";

  try {
    const text = await callNvidiaChat(gemmaModel, system, user, maxTokens);
    if (text && text.trim()) return { text, source: "nim-gemma" };
  } catch {
    // fall through to Gemini
  }

  try {
    const text = await callGeminiChat(system, user, maxTokens);
    if (text && text.trim()) return { text, source: "gemini" };
  } catch {
    return null;
  }

  return null;
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
};

const DIRECTOR_SYSTEM = `You are the Director agent for a motion-graphics ad storyboard.

Given a user brief and brand, produce a high-level plan for a short cinematic 9:16 SaaS ad video. Pick scene TYPES from this fixed list (no inventing types):
kineticTitle, statReveal, featureGrid, productDemo, testimonialQuote, logoWall, ctaCard, multiScript, productCarousel, uiShowcase

Output JSON with this exact shape:
{ "plan": [ { "type": "<scene type>", "duration": <integer frames at 30fps>, "brief": "<one sentence>" } ] }

Rules:
- 3 to 6 scenes total. Vary scene types; don't repeat unless intentional.
- Duration ranges per type (frames at 30fps):
  kineticTitle 45-80, statReveal 60-90, featureGrid 80-120, productDemo 90-150,
  testimonialQuote 90-150, logoWall 60-100, ctaCard 65-100, multiScript 90-150,
  productCarousel 120-180, uiShowcase 90-180
- Vary structure: don't always open with kineticTitle.
- "brief" is ONE sentence (< 20 words) describing the message of that scene only.

Return ONLY the JSON object.`;

const runDirector = async (
  prompt: string,
  brand: Brand,
): Promise<{ plan: ScenePlan[]; source: AgentSource } | null> => {
  const user = `Brand: ${brand.name}
Color: ${brand.color}
Accent: ${brand.accent}

Ad brief:
${prompt}

Produce the plan JSON now.`;

  const out = await agentCall(DIRECTOR_SYSTEM, user, 800);
  if (!out) return null;

  const parsed = tryParseJson(out.text) as { plan?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.plan)) return null;

  const validTypes = new Set<Scene["type"]>(ALL_SCENE_TYPES);
  const plan: ScenePlan[] = [];

  for (const item of parsed.plan) {
    if (typeof item !== "object" || item === null) continue;
    const i = item as Record<string, unknown>;
    if (typeof i.type !== "string" || !validTypes.has(i.type as Scene["type"])) {
      continue;
    }
    const dur = typeof i.duration === "number" ? i.duration : NaN;
    if (!Number.isFinite(dur)) continue;
    if (typeof i.brief !== "string") continue;
    plan.push({
      type: i.type as Scene["type"],
      duration: Math.round(Math.max(30, Math.min(300, dur))),
      brief: i.brief.slice(0, 200),
    });
  }

  if (plan.length === 0) return null;
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

  const out = await agentCall(system, user, 700);
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
): AsyncGenerator<StreamEvent> {
  // Phase 1: Director (sequential — gates the rest).
  const directorResult = await runDirector(prompt, brand);

  if (!directorResult) {
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

  // Tentative source — flipped to "agentic-mixed" if any specialist diverges.
  let metaSource: StreamSource =
    directorResult.source === "gemini" ? "agentic-mixed" : "agentic-nim";

  yield { type: "meta", source: metaSource, total: plan.length };

  // Phase 2: Parallel specialists with race-yield.
  // pending = idx → promise resolving to { idx, result } where result may be
  // a successful { scene, source } or null (specialist failed → drop scene).
  const pending = new Map<
    number,
    Promise<{ idx: number; result: Awaited<ReturnType<typeof runSpecialist>> }>
  >();
  plan.forEach((p, idx) => {
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

    if (winner.result) {
      scenes[winner.idx] = winner.result.scene;
      if (winner.result.source === "gemini") sawGemini = true;
      if (winner.result.source === "nim-gemma") sawGemma = true;
      yield { type: "scene", scene: winner.result.scene, index: winner.idx };
    }
    // null result → specialist failed → scene dropped per agreed policy.
  }

  // Mixed-source telemetry (informational; consumers can re-render the badge).
  if (sawGemma && sawGemini && metaSource !== "agentic-mixed") {
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

import Anthropic from "@anthropic-ai/sdk";
import {
  storyboardSchema,
  type Brand,
  type Scene,
  type Storyboard,
} from "../remotion/schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./buildPrompt";
import { mockGenerate } from "./mockGenerate";

export type StreamSource = "mock" | "claude" | "gemini";

export type StreamEvent =
  | { type: "meta"; source: StreamSource; total: number }
  | { type: "scene"; scene: Scene; index: number }
  | { type: "done"; storyboard: Storyboard }
  | { type: "error"; message: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const extractJson = (text: string): unknown => {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first === -1 || last === -1) throw new Error("No JSON in response");
    return JSON.parse(trimmed.slice(first, last + 1));
  }
};

const generateWithClaude = async (
  prompt: string,
  brand: Brand,
): Promise<Storyboard | null> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(prompt, brand) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  const raw = extractJson(textBlock.text);
  const validated = storyboardSchema.safeParse({ ...(raw as object), brand });
  return validated.success ? validated.data : null;
};

const generateWithGemini = async (
  prompt: string,
  brand: Brand,
): Promise<Storyboard | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      { role: "user", parts: [{ text: buildUserPrompt(prompt, brand) }] },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini storyboard error ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) return null;

  const raw = extractJson(text) as Record<string, unknown>;
  const validated = storyboardSchema.safeParse({ ...raw, brand });
  return validated.success ? validated.data : null;
};

export async function* streamStoryboard(
  prompt: string,
  brand: Brand,
): AsyncGenerator<StreamEvent> {
  let storyboard: Storyboard | null = null;
  let source: StreamSource = "mock";

  try {
    storyboard = await generateWithClaude(prompt, brand);
    if (storyboard) source = "claude";
  } catch {
    storyboard = null;
  }

  if (!storyboard) {
    try {
      storyboard = await generateWithGemini(prompt, brand);
      if (storyboard) source = "gemini";
    } catch {
      storyboard = null;
    }
  }

  if (!storyboard) {
    storyboard = mockGenerate(prompt, brand);
    source = "mock";
  }

  yield { type: "meta", source, total: storyboard.scenes.length };

  for (let i = 0; i < storyboard.scenes.length; i++) {
    await wait(450);
    yield { type: "scene", scene: storyboard.scenes[i], index: i };
  }

  await wait(150);
  yield { type: "done", storyboard };
}

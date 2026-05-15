import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

export type CursorSuggestion = {
  x: number;
  y: number;
  label: string;
  type: "click" | "zoom" | "move";
};

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const loadImageAsBase64 = async (
  screenshotUrl: string,
): Promise<{ base64: string; mimeType: string }> => {
  if (screenshotUrl.startsWith("/uploads/")) {
    const filePath = join(process.cwd(), "public", screenshotUrl);
    const buffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    return {
      base64: buffer.toString("base64"),
      mimeType: MIME_BY_EXT[ext] ?? "image/png",
    };
  }
  if (
    screenshotUrl.startsWith("http://") ||
    screenshotUrl.startsWith("https://")
  ) {
    const res = await fetch(screenshotUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/png";
    return { base64: buffer.toString("base64"), mimeType: contentType };
  }
  throw new Error(
    `Unsupported screenshot URL: ${screenshotUrl} (expected /uploads/ or http(s))`,
  );
};

const buildPrompt = (caption?: string) => `You're analyzing a SaaS product screenshot to plan a cursor walkthrough video.

The screenshot is mapped to a 1000x600 logical coordinate system. x ranges 0-1000 (left to right), y ranges 0-600 (top to bottom). Regardless of the actual image dimensions, map the screenshot onto that 1000x600 grid proportionally.

${caption ? `Caption / intent for this scene: "${caption}"` : ""}

Find 3 to 5 distinct, visually important interactive elements in the image — buttons, navigation items, key data tiles, important inputs. Order them by what a product marketer would highlight in a 6-second walkthrough (most attention-grabbing first).

For each, return:
- x, y: integer center coordinates within the 1000x600 grid
- label: short 1-3 word description of what is being highlighted ("Cycles nav", "Active sprint", "+ New issue")
- type: "click" for buttons and action targets, "zoom" for a region that should be emphasized but not clicked

Return ONLY a valid JSON array, no markdown fences, no commentary. Example:
[{"x":100,"y":146,"label":"Cycles","type":"click"},{"x":310,"y":175,"label":"Active sprint","type":"zoom"},{"x":900,"y":50,"label":"+ New issue","type":"click"}]`;

// Walks a possibly-truncated JSON array string and extracts each complete
// {...} object, skipping anything malformed. Survives mid-response cutoffs.
const recoverPartialArray = (text: string): unknown[] => {
  const objects: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          objects.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // skip malformed object, keep going
        }
        start = -1;
      }
    }
  }
  return objects;
};

const extractJsonArray = (raw: string): unknown[] => {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  // 1) Try parsing the whole thing first — may be a clean JSON document
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value)) return value;
      }
    }
  } catch {
    // fall through
  }

  // 2) Substring slice from first [ to last ]
  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try {
      const parsed = JSON.parse(slice);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }

  // 3) Recovery: pull complete {...} objects from possibly-truncated text.
  // Handles the case where Gemini hit maxOutputTokens mid-array.
  const recovered = recoverPartialArray(trimmed);
  if (recovered.length > 0) return recovered;

  throw new Error(
    `No JSON array in Gemini response. Raw text: ${trimmed.slice(0, 300)}`,
  );
};

const validateSuggestions = (raw: unknown[]): CursorSuggestion[] => {
  const out: CursorSuggestion[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const x = Number(obj.x);
    const y = Number(obj.y);
    const label = String(obj.label ?? "");
    const type =
      obj.type === "zoom" || obj.type === "move" ? obj.type : "click";
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push({
      x: Math.max(0, Math.min(1000, Math.round(x))),
      y: Math.max(0, Math.min(600, Math.round(y))),
      label: label.slice(0, 40),
      type,
    });
  }
  return out;
};

export const suggestCursorPathWithGemini = async (
  screenshotUrl: string,
  caption: string | undefined,
): Promise<CursorSuggestion[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local then restart the dev server.",
    );
  }

  const { base64, mimeType } = await loadImageAsBase64(screenshotUrl);

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt(caption) },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            x: { type: "INTEGER" },
            y: { type: "INTEGER" },
            label: { type: "STRING" },
            type: { type: "STRING", enum: ["click", "zoom", "move"] },
          },
          required: ["x", "y", "label", "type"],
        },
      },
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");

  const raw = extractJsonArray(text);
  return validateSuggestions(raw);
};

export const suggestionsToActions = (
  suggestions: CursorSuggestion[],
  duration: number,
) => {
  if (suggestions.length === 0) return [];
  const moveInFrames = 20;
  const holdFrames = 12;
  const slotSize = Math.max(
    35,
    Math.floor((duration - moveInFrames) / suggestions.length),
  );

  const actions: Array<
    | { at: number; type: "move"; x: number; y: number }
    | { at: number; type: "zoom"; x: number; y: number; scale: number }
    | { at: number; type: "click"; x: number; y: number; label?: string }
    | { at: number; type: "reset" }
  > = [];

  suggestions.forEach((s, i) => {
    const slotStart = i * slotSize + moveInFrames / 2;
    actions.push({ at: slotStart, type: "move", x: s.x, y: s.y });
    if (s.type === "zoom") {
      actions.push({
        at: slotStart + moveInFrames,
        type: "zoom",
        x: s.x,
        y: s.y,
        scale: 1.5,
      });
    } else {
      actions.push({
        at: slotStart + moveInFrames,
        type: "click",
        x: s.x,
        y: s.y,
        label: s.label,
      });
    }
    if (i === suggestions.length - 1) {
      const resetAt = Math.min(
        slotStart + moveInFrames + holdFrames,
        duration - 5,
      );
      actions.push({ at: resetAt, type: "reset" });
    }
  });

  return actions;
};

import { readFileSync } from "node:fs";
import path from "node:path";
import { storyboardSchema, type Brand, type Storyboard } from "../remotion/schema.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "../lib/buildPrompt.ts";
import { mockGenerate } from "../lib/mockGenerate.ts";

// --- load .env.local manually (no dotenv dep needed) ---
try {
  const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
} catch {}

// --- the fixed test prompt ---
const PROMPT =
  "Launch announcement for Beacon, our async standup tool used by 28000 engineering teams. Show how it kills meeting fatigue.";
const BRAND: Brand = { name: "Beacon", color: "#0EA5E9", accent: "#22D3EE" };

// --- helpers ---
type Result = {
  label: string;
  status: "ok" | "skip" | "fail";
  ms?: number;
  scenes?: number;
  firstScene?: string;
  error?: string;
};

const extractJson = (text: string): unknown => {
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
    if (i === -1 || j === -1) throw new Error("No JSON in response");
    return JSON.parse(t.slice(i, j + 1));
  }
};

const summarizeFirstScene = (sb: Storyboard): string => {
  const s = sb.scenes[0];
  switch (s.type) {
    case "kineticTitle":
      return `kineticTitle: ${s.lines.join(" / ")}`;
    case "statReveal":
      return `statReveal: ${s.value}${s.suffix ?? ""} · ${s.label}`;
    case "featureGrid":
      return `featureGrid: ${s.heading}`;
    case "productDemo":
      return `productDemo: ${s.caption ?? `${s.actions.length} actions`}`;
    case "testimonialQuote":
      return `testimonial: "${s.quote.slice(0, 40)}…" — ${s.author}`;
    case "logoWall":
      return `logoWall: ${s.heading} (${s.logos.length} logos)`;
    case "ctaCard":
      return `ctaCard: ${s.headline}`;
  }
};

const time = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const start = Date.now();
  const result = await fn();
  return [result, Date.now() - start];
};

// --- per-provider runners ---

const runMock = async (): Promise<Result> => {
  const [sb, ms] = await time(async () => mockGenerate(PROMPT, BRAND));
  return {
    label: "mock",
    status: "ok",
    ms,
    scenes: sb.scenes.length,
    firstScene: summarizeFirstScene(sb),
  };
};

const runNvidia = async (modelId: string): Promise<Result> => {
  const apiKey =
    process.env.NVIDIA_NIM_API_KEY ?? process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return {
      label: `nim/${modelId}`,
      status: "skip",
      error: "no NVIDIA_NIM_API_KEY / NVIDIA_API_KEY",
    };
  }

  try {
    const [validated, ms] = await time(async () => {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(PROMPT, BRAND) },
          ],
          temperature: 0.4,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${errText.slice(0, 200).replace(/\s+/g, " ")}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("empty response");

      const raw = extractJson(text) as Record<string, unknown>;
      const parsed = storyboardSchema.safeParse({ ...raw, brand: BRAND });
      if (!parsed.success) {
        throw new Error(`schema invalid: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      }
      return parsed.data;
    });

    return {
      label: `nim/${modelId}`,
      status: "ok",
      ms,
      scenes: validated.scenes.length,
      firstScene: summarizeFirstScene(validated),
    };
  } catch (e) {
    return {
      label: `nim/${modelId}`,
      status: "fail",
      error: e instanceof Error ? e.message : String(e),
    };
  }
};

const runGemini = async (modelId: string): Promise<Result> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { label: modelId, status: "skip", error: "no GEMINI_API_KEY" };
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  try {
    const [validated, ms] = await time(async () => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            { role: "user", parts: [{ text: buildUserPrompt(PROMPT, BRAND) }] },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${errText.slice(0, 200).replace(/\s+/g, " ")}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) throw new Error("empty response");

      const raw = extractJson(text) as Record<string, unknown>;
      const parsed = storyboardSchema.safeParse({ ...raw, brand: BRAND });
      if (!parsed.success) {
        throw new Error(`schema invalid: ${parsed.error.issues[0]?.message ?? "unknown"}`);
      }
      return parsed.data;
    });

    return {
      label: modelId,
      status: "ok",
      ms,
      scenes: validated.scenes.length,
      firstScene: summarizeFirstScene(validated),
    };
  } catch (e) {
    return {
      label: modelId,
      status: "fail",
      error: e instanceof Error ? e.message : String(e),
    };
  }
};

// --- main ---

const MODELS = [
  () => runMock(),
  () => runGemini("gemini-2.5-flash"),
  () => runGemini("gemini-2.5-flash-lite"),
  () => runNvidia("nvidia/nemotron-3-super-120b-a12b"),
  () => runNvidia("nvidia/llama-3.3-nemotron-super-49b-v1.5"),
  () => runNvidia("meta/llama-3.3-70b-instruct"),
  () => runNvidia("meta/llama-4-maverick-17b-128e-instruct"),
  () => runNvidia("deepseek-ai/deepseek-v4-pro"),
  () => runNvidia("qwen/qwen3.5-397b-a17b"),
  () => runNvidia("z-ai/glm-5.1"),
];

const pad = (s: string, n: number) => s.length >= n ? s : s + " ".repeat(n - s.length);

const statusIcon = (s: Result["status"]) =>
  ({ ok: "✓", skip: "○", fail: "✗" })[s];

const main = async () => {
  console.log("\nTesting model responses for the same prompt + brand…");
  console.log(`Prompt: ${PROMPT.slice(0, 70)}…\n`);

  const results = await Promise.all(MODELS.map((m) => m()));

  console.log(
    pad("Model", 50) +
      pad("Status", 8) +
      pad("Time", 8) +
      pad("Scenes", 8) +
      "First scene",
  );
  console.log("─".repeat(130));

  for (const r of results) {
    const time = r.ms !== undefined ? `${r.ms}ms` : "—";
    const scenes = r.scenes !== undefined ? String(r.scenes) : "—";
    const detail = r.firstScene ?? r.error ?? "—";
    console.log(
      pad(r.label, 50) +
        pad(`${statusIcon(r.status)} ${r.status}`, 8) +
        pad(time, 8) +
        pad(scenes, 8) +
        detail.slice(0, 70),
    );
  }

  console.log("");
};

main().catch((e) => {
  console.error("test runner failed:", e);
  process.exit(1);
});

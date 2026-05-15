import { z } from "zod";
import {
  // Older single-Gemini handler — kept for reference, no longer the entry
  // point. The route now uses the MoE-style orchestrator below.
  // suggestCursorPathWithGemini,
  suggestCursorPath,
  suggestionsToActions,
} from "../../../lib/vision";

const requestSchema = z.object({
  screenshotUrl: z.string().min(1),
  caption: z.string().optional(),
  duration: z.number().int().min(30).max(900),
});

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
      { error: "Invalid request: " + parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { screenshotUrl, caption, duration } = parsed.data;

  try {
    // Runs Qwen 3.5 397B → Llama 3.2 90B Vision → Gemini in order and
    // returns the first non-empty result along with which model answered.
    const { suggestions, source } = await suggestCursorPath(
      screenshotUrl,
      caption,
    );
    if (suggestions.length === 0) {
      return Response.json(
        { error: "No clickable elements detected. Try a clearer screenshot." },
        { status: 422 },
      );
    }
    const actions = suggestionsToActions(suggestions, duration);
    return Response.json({ suggestions, actions, source });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vision call failed";
    // 503 if no keys available at all; 500 otherwise.
    const noKeys =
      message.includes("All vision agents failed") &&
      !process.env.NVIDIA_NIM_API_KEY &&
      !process.env.GEMINI_API_KEY;
    return Response.json({ error: message }, { status: noKeys ? 503 : 500 });
  }
}

// ─── Older single-Gemini handler (kept for reference) ───
// export async function POST(request: Request) {
//   ...same as above but called suggestCursorPathWithGemini() instead of
//   suggestCursorPath() and hard-coded source to GEMINI_MODEL...
// }

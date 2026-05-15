import { z } from "zod";
import {
  suggestCursorPathWithGemini,
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
    const suggestions = await suggestCursorPathWithGemini(
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
    return Response.json({
      suggestions,
      actions,
      source: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Vision call failed";
    const status = message.includes("GEMINI_API_KEY") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}

import { z } from "zod";
import { brandSchema } from "../../../remotion/schema";
import { streamStoryboard } from "../../../lib/streamGenerate";

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  brand: brandSchema,
});

const encoder = new TextEncoder();
const sse = (data: unknown) =>
  encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

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

  const { prompt, brand } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamStoryboard(prompt, brand)) {
          controller.enqueue(sse(event));
        }
      } catch (e) {
        controller.enqueue(
          sse({
            type: "error",
            message: e instanceof Error ? e.message : "Stream failed",
          }),
        );
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

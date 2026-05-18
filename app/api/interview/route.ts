import { z } from "zod";
import { brandSchema } from "../../../remotion/schema";
import { DOC_TYPES } from "../../../lib/docs/schema";
import { runInterviewer } from "../../../lib/docs/interview";

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  brand: brandSchema,
  docTypes: z.array(z.enum(DOC_TYPES)).min(1).max(DOC_TYPES.length),
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

  const result = await runInterviewer(parsed.data);
  return Response.json(result);
}

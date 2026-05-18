import { NextResponse } from "next/server";
import { generateVisualStoryboard } from "../../../lib/visualGenerate";
import { brandSchema } from "../../../remotion/schema";
import { z } from "zod";

// AI-image-driven storyboard endpoint. Runs in parallel:
//   1. Visual Director (1 NIM chat call) plans 5-8 shots
//   2. FLUX schnell generates one image per shot in parallel
//   3. Returns the assembled Storyboard JSON
//
// Total wall time: 5-15s typical. Single non-streaming response — the
// client renders the full storyboard at once when ready.

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — generous for cold FLUX

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  brand: brandSchema,
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await generateVisualStoryboard(
      parsed.data.prompt,
      parsed.data.brand,
    );
    return NextResponse.json({
      storyboard: result.storyboard,
      designNotes: result.designNotes,
      imagesGenerated: result.imagesGenerated,
      imagesFailed: result.imagesFailed,
      source: "agentic-flux",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Visual generation failed",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}

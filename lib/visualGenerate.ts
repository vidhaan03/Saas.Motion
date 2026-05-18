// Visual Director: parallel generation pipeline that produces an
// AI-image-driven storyboard. This is INDEPENDENT of streamGenerate.ts —
// the regular Director still works untouched.
//
// Pipeline:
//   1. Visual Director (LLM call) plans 5-8 shots from the brand + brief.
//      Each shot has: imagePrompt, caption, motion, overlay, duration.
//   2. All FLUX image-gen calls fire in PARALLEL (typically 5-10s wall).
//   3. The resulting AiShot scenes assemble into a Storyboard.
//
// Failure handling: any shot whose FLUX call fails keeps its caption +
// motion but renders on a black background. The storyboard isn't
// aborted unless EVERY shot failed.

import {
  type AiShotCaptionPosition,
  type AiShotMotion,
  type AiShotOverlay,
  type Brand,
  type Scene,
  type Storyboard,
} from "../remotion/schema";
import { resolveVibeData } from "../remotion/vibeKeys";
import { generateImage } from "./imageGen";

type VisualShotPlan = {
  imagePrompt: string;
  caption?: string;
  subcaption?: string;
  motion?: AiShotMotion;
  overlay?: AiShotOverlay;
  captionPosition?: AiShotCaptionPosition;
  duration: number;
};

const VISUAL_DIRECTOR_SYSTEM = `You are the Visual Director for a cinematic SaaS ad.

You plan an ad as a sequence of 5-8 SHOTS. Each shot is a single
generative-image background + a short text overlay + a camera motion.
Think like a creative director planning a Stripe Sessions teaser or an
Apple keynote interstitial. Coherent palette, restrained text, motion
that supports the story.

Output JSON with this exact shape:
{
  "designNotes": "<one-sentence reasoning about the brand's visual language>",
  "shots": [
    {
      "imagePrompt": "<FLUX prompt — see rules>",
      "caption": "<optional short headline, 1-6 words>",
      "subcaption": "<optional supporting line>",
      "motion": "push-in" | "pull-out" | "pan-left" | "pan-right" | "static",
      "overlay": "dark" | "light" | "scrim" | "none",
      "captionPosition": "bottom" | "center" | "top",
      "duration": <integer frames at 30fps, 60-150>
    }
  ]
}

ImagePrompt rules (these prompts go to FLUX; quality depends on them):
- Always start with: "cinematic motion-graphic still, premium ad
  aesthetic, [brand-tinted lighting], "
- Describe the SUBJECT relevant to the brand. E.g. for a telephony
  product: glowing phone receiver suspended in a deep blue gradient
  with soft volumetric light. For a dev tool: floating monospace code
  on a glass surface with subtle grid patterns.
- Append style cues: "subtle film grain, 35mm lens, shallow depth of
  field, gradient mesh background, professional brand visual".
- Avoid: photorealistic people, text (FLUX renders text poorly), logos.

Shot composition guidance:
- Shot 1: hero / brand reveal — strongest image, caption is the brand
  name or main promise.
- Shots 2-4: feature beats — each one showcases a different aspect of
  the product visually. Captions are 2-4 word value props.
- Last shot: CTA — caption like "Try it now." or "Get started."

Motion guidance:
- Use push-in for hero shots and CTAs.
- Use pan-left / pan-right for feature reveals.
- Use static sparingly — only when the image itself is visually
  active enough.
- Don't repeat the same motion in adjacent shots.

Return ONLY the JSON object. No markdown.`;

// Run a NIM chat call against the same models streamGenerate uses, but
// with our Visual Director system prompt.
const NIM_TIMEOUT_MS = Number(
  process.env.NVIDIA_NIM_TIMEOUT_MS ?? "20000",
);

const callDirector = async (
  prompt: string,
  brand: Brand,
): Promise<{ designNotes?: string; shots: VisualShotPlan[] } | null> => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    console.warn("[visual] NVIDIA_NIM_API_KEY missing — falling through to mock");
    return null;
  }
  const vibe = resolveVibeData(brand.vibe);
  const user = `Brand: ${brand.name}
Color: ${brand.color}
Accent: ${brand.accent}
Vibe: ${vibe.label} — ${vibe.description}
Vibe guidance: ${vibe.directorHint}

Ad brief:
${prompt}

Produce the shot plan JSON now. Honour the vibe + tailor image prompts
to the brand's visual language.`;

  try {
    const res = await fetch(
      process.env.NVIDIA_NIM_BASE_URL ??
        "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          accept: "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-4-maverick-17b-128e-instruct",
          messages: [
            { role: "system", content: VISUAL_DIRECTOR_SYSTEM },
            { role: "user", content: user },
          ],
          temperature: 0.5,
          max_tokens: 2500,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(NIM_TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      console.warn(`[visual] director ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? null;
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as {
        designNotes?: string;
        shots?: VisualShotPlan[];
      };
      if (!Array.isArray(parsed.shots) || parsed.shots.length === 0)
        return null;
      return { designNotes: parsed.designNotes, shots: parsed.shots };
    } catch (e) {
      console.warn(`[visual] failed to parse director JSON: ${e}`);
      return null;
    }
  } catch (e) {
    console.warn(
      `[visual] director threw: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
};

const FALLBACK_PLAN = (brand: Brand): VisualShotPlan[] => [
  {
    imagePrompt: `cinematic motion-graphic still, premium ad aesthetic, ${brand.color} gradient lighting, abstract glowing shape suspended in deep gradient, subtle film grain, 35mm lens, shallow depth of field`,
    caption: brand.name || "Hello.",
    motion: "push-in",
    overlay: "dark",
    captionPosition: "bottom",
    duration: 90,
  },
  {
    imagePrompt: `cinematic motion-graphic still, premium ad aesthetic, ${brand.accent} accent light, floating geometric forms with soft volumetric glow, gradient mesh background`,
    caption: "Built for teams.",
    motion: "pan-right",
    overlay: "dark",
    captionPosition: "bottom",
    duration: 90,
  },
  {
    imagePrompt: `cinematic motion-graphic still, premium ad aesthetic, abstract minimal product visualization, ${brand.color} and ${brand.accent} brand palette, subtle film grain`,
    caption: "Ship faster.",
    motion: "pan-left",
    overlay: "dark",
    captionPosition: "bottom",
    duration: 90,
  },
  {
    imagePrompt: `cinematic motion-graphic still, premium ad aesthetic, soft ${brand.accent} accent rim light, abstract gradient background, professional brand visual`,
    caption: "Try it now.",
    motion: "push-in",
    overlay: "dark",
    captionPosition: "center",
    duration: 75,
  },
];

export type VisualGenerateResult = {
  storyboard: Storyboard;
  designNotes?: string;
  imagesGenerated: number;
  imagesFailed: number;
};

// Main entry point. Always returns SOMETHING (mocks if everything fails).
export const generateVisualStoryboard = async (
  prompt: string,
  brand: Brand,
): Promise<VisualGenerateResult> => {
  console.warn("[visual] starting visual storyboard generation");

  // 1. Plan shots — fall back to a stock 4-shot plan if Director fails.
  let designNotes: string | undefined;
  let shots: VisualShotPlan[];
  const planned = await callDirector(prompt, brand);
  if (planned) {
    shots = planned.shots;
    designNotes = planned.designNotes;
    console.warn(`[visual] director planned ${shots.length} shots`);
  } else {
    shots = FALLBACK_PLAN(brand);
    console.warn(`[visual] director fell through — using ${shots.length}-shot fallback`);
  }

  // 2. Fire FLUX image-gen in parallel. Vertical 9:16-ish so the image
  //    fills the ad canvas without letterboxing.
  const imageResults = await Promise.all(
    shots.map((s) =>
      generateImage({
        prompt: s.imagePrompt,
        width: 768,
        height: 1344,
        model: "schnell",
      }),
    ),
  );

  const imagesGenerated = imageResults.filter((r) => r !== null).length;
  const imagesFailed = imageResults.length - imagesGenerated;
  console.warn(
    `[visual] flux: ${imagesGenerated} generated, ${imagesFailed} failed`,
  );

  // 3. Assemble Storyboard. Each shot becomes an AiShot scene; failed
  //    images result in a scene with imageUrl=undefined (still renders
  //    the caption + camera motion against black).
  const scenes: Scene[] = shots.map((shot, i) => ({
    type: "aiShot",
    duration: Math.round(Math.max(30, Math.min(300, shot.duration))),
    imagePrompt: shot.imagePrompt,
    imageUrl: imageResults[i]?.dataUrl,
    caption: shot.caption,
    subcaption: shot.subcaption,
    motion: shot.motion ?? "push-in",
    overlay: shot.overlay ?? "dark",
    captionPosition: shot.captionPosition ?? "bottom",
    sfx: "whoosh",
  }));

  return {
    storyboard: { brand, scenes },
    designNotes,
    imagesGenerated,
    imagesFailed,
  };
};

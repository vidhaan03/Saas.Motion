// NIM FLUX image generation helper.
//
// Uses the same NVIDIA_NIM_API_KEY env var as streamGenerate.ts and
// vision.ts — no new keys required. The free NIM tier gives ~1000
// credits per account; FLUX schnell ≈ 1-2 credits per image so a few
// hundred generations are free before billing kicks in.
//
// FLUX schnell is the right default: 4-step inference, ~5s per image,
// good for fast-iteration demo work. FLUX dev (~25 steps, ~20s) is
// better quality but proportionally slower.

const FLUX_TIMEOUT_MS = Number(
  process.env.NVIDIA_NIM_FLUX_TIMEOUT_MS ?? "45000",
);

type FluxModel = "schnell" | "dev";

const ENDPOINT_BY_MODEL: Record<FluxModel, string> = {
  schnell: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell",
  dev: "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev",
};

export type FluxImage = {
  // data URL ready to use as <img src=...>. NIM returns base64; we
  // wrap it as `data:image/png;base64,...` so callers don't have to
  // decide where to host it. For Vercel deployment we'll add a Blob
  // upload step later, but for dev + small ads, data URLs work fine.
  dataUrl: string;
  // Echoed prompt — useful for debugging which image came from which call.
  prompt: string;
};

export type GenerateImageOptions = {
  prompt: string;
  // FLUX schnell ignores CFG; FLUX dev respects 1.0-10.0.
  cfgScale?: number;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  model?: FluxModel;
  signal?: AbortSignal;
};

// Single FLUX call. Returns null on any failure (network / quota / parse)
// so callers can fall through to the gradient fallback gracefully.
export const generateImage = async (
  options: GenerateImageOptions,
): Promise<FluxImage | null> => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    console.warn("[flux] NVIDIA_NIM_API_KEY not set — skipping image gen");
    return null;
  }

  const model: FluxModel = options.model ?? "schnell";
  const endpoint = ENDPOINT_BY_MODEL[model];

  // NIM FLUX schnell ONLY accepts these dimensions. Snap any unsupported
  // value to the nearest allowed bucket. 768x1344 ≈ 9:16 vertical (the
  // motion.saas default ad canvas); 1024x1024 is the square fallback.
  const ALLOWED_DIMS = [
    768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280, 1344,
  ] as const;
  const snap = (n: number): number =>
    ALLOWED_DIMS.reduce(
      (best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best),
      ALLOWED_DIMS[0],
    );
  const width = snap(options.width ?? 768);
  const height = snap(options.height ?? 1344);
  const steps = options.steps ?? (model === "schnell" ? 4 : 25);
  const seed =
    options.seed ?? Math.floor(Math.random() * 2_000_000_000);
  const cfgScale =
    options.cfgScale ?? (model === "schnell" ? 0.0 : 3.5);

  // Tie our own timeout into the caller's signal if provided.
  const ownSignal = AbortSignal.timeout(FLUX_TIMEOUT_MS);
  const signal = options.signal
    ? AbortSignal.any([options.signal, ownSignal])
    : ownSignal;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
      body: JSON.stringify({
        prompt: options.prompt,
        width,
        height,
        seed,
        steps,
        cfg_scale: cfgScale,
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(
        `[flux] ${model} ${res.status}: ${text.slice(0, 200)}`,
      );
      return null;
    }

    // NIM returns one of a few shapes depending on the model variant.
    // Try the documented ones in order.
    const data = (await res.json()) as {
      artifacts?: Array<{ base64?: string }>;
      image?: string;
      data?: Array<{ b64_json?: string }>;
    };

    const base64 =
      data.artifacts?.[0]?.base64 ??
      data.data?.[0]?.b64_json ??
      (typeof data.image === "string" ? data.image : undefined);

    if (!base64) {
      console.warn("[flux] response had no usable image field", {
        keys: Object.keys(data),
      });
      return null;
    }

    // Some NIM responses already include the data: prefix. Detect and
    // pass-through; else build a PNG data URL.
    const dataUrl = base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`;

    return { dataUrl, prompt: options.prompt };
  } catch (e) {
    console.warn(
      `[flux] ${model} threw: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
};

// Fire N image-gen calls in parallel. Each returns null on failure;
// callers decide whether to keep the storyboard with mixed
// AI / fallback scenes or abort.
export const generateImagesParallel = async (
  prompts: GenerateImageOptions[],
): Promise<Array<FluxImage | null>> => {
  return Promise.all(prompts.map((p) => generateImage(p)));
};

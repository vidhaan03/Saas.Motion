// Diagnostic endpoint. Returns which env vars are present (never their
// values) plus a live ping to each provider so you can see at a glance
// whether the agentic pipeline can reach NIM and Gemini from this
// deployment. Safe to keep in production — no secrets leak.
//
// Curl from your machine:
//   curl https://<your-vercel-url>/api/health | jq

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ProviderResult = {
  configured: boolean;
  reachable: boolean | "skipped";
  status?: number;
  error?: string;
  model?: string;
};

const pingNvidia = async (model: string): Promise<ProviderResult> => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    return { configured: false, reachable: "skipped", model };
  }
  const endpoint =
    process.env.NVIDIA_NIM_BASE_URL ??
    "https://integrate.api.nvidia.com/v1/chat/completions";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with the single word OK." }],
        max_tokens: 8,
        temperature: 0,
      }),
      // Per-probe timeout so Vercel hobby's 10s function cap isn't exceeded
      // when a model cold-starts slowly.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        configured: true,
        reachable: false,
        status: res.status,
        error: errText.slice(0, 200),
        model,
      };
    }
    return { configured: true, reachable: true, status: res.status, model };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : String(e),
      model,
    };
  }
};

const pingGemini = async (): Promise<ProviderResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { configured: false, reachable: "skipped" };
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        configured: true,
        reachable: false,
        status: res.status,
        error: errText.slice(0, 200),
        model,
      };
    }
    return { configured: true, reachable: true, status: res.status, model };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : String(e),
      model,
    };
  }
};

export async function GET() {
  const gemmaModel = process.env.NVIDIA_NIM_MODEL ?? "google/gemma-4-31b-it";
  const visionPrimary =
    process.env.NVIDIA_NIM_VISION_PRIMARY ?? "qwen/qwen3.5-397b-a17b";
  const visionFallback =
    process.env.NVIDIA_NIM_VISION_FALLBACK ??
    "meta/llama-3.2-90b-vision-instruct";

  // Run all four probes in parallel so the response is fast.
  const [nimText, nimVisionPrimary, nimVisionFallback, gemini] =
    await Promise.all([
      pingNvidia(gemmaModel),
      pingNvidia(visionPrimary),
      pingNvidia(visionFallback),
      pingGemini(),
    ]);

  const env = {
    NVIDIA_NIM_API_KEY: Boolean(process.env.NVIDIA_NIM_API_KEY),
    NVIDIA_NIM_BASE_URL: process.env.NVIDIA_NIM_BASE_URL ?? null,
    NVIDIA_NIM_MODEL: process.env.NVIDIA_NIM_MODEL ?? null,
    NVIDIA_NIM_VISION_PRIMARY:
      process.env.NVIDIA_NIM_VISION_PRIMARY ?? null,
    NVIDIA_NIM_VISION_FALLBACK:
      process.env.NVIDIA_NIM_VISION_FALLBACK ?? null,
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? null,
  };

  const ok =
    nimText.reachable === true ||
    nimVisionPrimary.reachable === true ||
    nimVisionFallback.reachable === true ||
    gemini.reachable === true;

  return Response.json(
    {
      ok,
      env,
      probes: {
        nimText,
        nimVisionPrimary,
        nimVisionFallback,
        gemini,
      },
      hint: ok
        ? "At least one agent is reachable — generation should work."
        : "No agent is reachable. Set env vars in Vercel and redeploy.",
    },
    { status: ok ? 200 : 503 },
  );
}

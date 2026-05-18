# MP4 Export — Options Report

**Date:** 2026-05-18
**Status:** Rolled back from in-browser export. Picking a path forward.

---

## Context

motion.saas generates ad videos via a Remotion `<Player>` in the browser. Users
want to download a real MP4 file (to upload to Meta Ads, TikTok, X, etc.) — not
just preview the result.

We tried two browser-only export paths and both failed for production use.

### What we tried (and why neither shipped)

#### Attempt 1 — WebCodecs + html-to-image + mp4-muxer
- **Idea:** Snapshot each Remotion `<Thumbnail>` frame with `html-to-image`,
  pipe to `VideoEncoder`, mux to MP4 with `mp4-muxer`.
- **What worked:** Encoder + muxer produced valid MP4s with the right duration.
- **What broke:** `html-to-image` produced blank canvases. The Remotion
  `<AbsoluteFill>` + CSS variables + Next.js `next/font` (CSS-var fonts)
  combination doesn't survive the html-to-image clone-and-serialize step. Two
  rounds of fixes (opacity override, noSuspense, transform offset, longer
  settle waits) didn't recover the visuals.
- **Why we gave up:** every fix was speculative — root cause was deep inside
  html-to-image's CSS-cascade handling. Time-to-fix was unbounded.

#### Attempt 2 — getDisplayMedia + MediaRecorder
- **Idea:** Use Chrome's screen-share API to record the visible Player.
- **Outcome (per user feedback):** "doesn't work". Either the share dialog
  flow was too clunky, or the recording itself failed.
- **Note for future:** This approach *can* work technically — it's how Loom
  and similar tools build browser recording. But it's real-time only (a 6s
  video takes 6s to record) and requires a screen-share permission prompt
  every time. Bad UX for an export button.

---

## Decision Criteria

What matters here, ranked:

1. **Output is a real MP4 file** the user can upload anywhere (Meta, TikTok).
2. **Free or near-free** at the scale of a side-project demo (you said
   "we will do this later, get me free options").
3. **Works on the deployed Vercel site**, not just locally.
4. **Time to ship is under one focused afternoon.** You've already burned
   hours on export. We don't have unlimited budget for this.
5. **Doesn't require the user's machine to stay open during render.** The
   browser-only paths fail this — close the tab, lose the export.

---

## Options

### Option A — Defer export; document a screen-record workaround

**How it works:** Ship the rest of the app. Add a small note under the Player
("To save: Cmd+Shift+5 → Record Selected Portion" on Mac; "Chrome menu → More
tools → Screen capture" everywhere). Revisit real export later.

| | |
|---|---|
| **Dev work** | ~10 min (one note in UI) |
| **User UX** | Bad. Friction every export. |
| **Output quality** | Whatever the user's screen recorder gives. Lossy. |
| **Free?** | Yes. |
| **Works on Vercel?** | Yes (no server work). |
| **When to pick this** | If export is not a launch blocker. You have a working demo without it. |

---

### Option B — Remotion Lambda (AWS) — *recommended path if you commit to export*

**How it works:** Remotion's official server-side render. Deploy a Remotion
"site" to S3, deploy a Lambda function with Chromium baked in, then call it
from a Next.js API route. Returns a CloudFront URL to the rendered MP4.

```
User clicks Export
  → POST /api/render { storyboard }
    → @remotion/lambda-client.renderMediaOnLambda(...)
      → Lambda spins up Chromium, renders frames, ffmpegs to MP4
      → Returns S3 URL
    → Poll for completion via getRenderProgress
    → User downloads MP4
```

| | |
|---|---|
| **Dev work** | 1–2 hours. Walkthrough: install `@remotion/lambda`, run `npx remotion lambda sites create`, `npx remotion lambda functions deploy`, wire API routes. |
| **AWS setup** | Need AWS account. IAM user with Lambda + S3 + CloudFront permissions. |
| **Cost** | ~$0.0005–0.005 per second of video rendered. AWS free tier covers ~1M Lambda req/month, which is way beyond demo volume. **Effectively free at demo scale.** |
| **Speed** | 2–10× faster than real-time (parallelized across Lambda concurrency). A 30s ad renders in 5–15s. |
| **Reliability** | Official, well-documented, battle-tested. This is what real Remotion-powered SaaS products use. |
| **Lock-in** | AWS-specific. Migration to another provider would be non-trivial. |
| **When to pick this** | If export must work, output must be high-quality MP4, and you're willing to set up AWS once. |

**Key gotchas:**
- The Remotion site bundle has to match the version you call from. Bump
  one, redeploy both.
- Cold starts add ~3s on first call after idle.
- All scene assets (images, audio) must be reachable from Lambda — Vercel
  Blob URLs work; localhost URLs don't.

---

### Option C — Cloud Run render worker (GCP)

**How it works:** Containerize a small Node service that runs `@remotion/renderer`,
push to Google Cloud Run. Vercel API route POSTs a render job to it, polls
for completion, returns the download URL.

| | |
|---|---|
| **Dev work** | 2–3 hours. Write Dockerfile (Node + Chromium + ffmpeg + your code), `gcloud run deploy`, wire API. |
| **GCP setup** | Need Google Cloud account. Project + billing enabled (free tier covers it). |
| **Cost** | Cloud Run free tier: 2M req/month, 360K vCPU-seconds/month. **Effectively free at demo scale.** |
| **Speed** | Comparable to Lambda but with worse cold starts (Cloud Run scales to zero by default; first request after idle = 5–20s warmup). |
| **Reliability** | Solid platform; the Dockerfile is the fragile part. |
| **Lock-in** | Less than Lambda — the worker is a generic Docker container, portable to Fly.io / Railway / your own VM. |
| **When to pick this** | If you have GCP credits, or specifically don't want AWS, or want portability later. |

---

### Option D — Vercel Function with `@remotion/renderer` + `@sparticuz/chromium`

**How it works:** Run the renderer inside Vercel's serverless function runtime.
No new infra, everything on one platform.

| | |
|---|---|
| **Dev work** | 1–2 hours, but with real risk of "wrong Chromium build / function too big" debugging time. |
| **Vercel tier required** | **Pro ($20/mo) effectively required.** Hobby tier function size cap is 50 MB unzipped; stripped Chromium is 50–80 MB. Pro raises it to 250 MB. |
| **Cost** | Pro tier + Vercel's per-invocation pricing on top. Marginal cost per render is low but the floor is the Pro subscription. |
| **Speed** | Slower than Lambda — Vercel functions have less CPU/RAM than dedicated Lambda. A 30s render might take 30–60s. |
| **Timeout** | Pro tier: 300s max function duration. Renders that exceed this fail. |
| **Reliability** | Workable for short videos but the closer you push function size and duration limits, the more fragile it gets. |
| **When to pick this** | If you want everything on one bill and you're already on Vercel Pro. Otherwise skip. |

---

### Option E — Third-party hosted render API (Shotstack, Creatomate, Render.tv)

**How it works:** Pay-per-render commercial APIs. Send JSON describing the
video, get an MP4 URL back. **Not Remotion-compatible** — you'd be rewriting
the storyboard format to match their schema.

| | |
|---|---|
| **Dev work** | 30 min integration **plus** rewriting all scene composition to their schema. **Big hidden cost.** Realistically days of work. |
| **Cost** | Per minute rendered. Shotstack: ~$0.10/min. Creatomate: ~$0.05/min. Free tiers exist but tiny. |
| **Reliability** | High — it's their core business. |
| **Lock-in** | Massive. Your composition logic is in their proprietary format. |
| **When to pick this** | Probably never for this project — you already have Remotion compositions and switching means throwing them away. |

---

### Option F — Local CLI render fallback (dev-only)

**How it works:** Add `/api/render` route that shells out to
`npx remotion render`. Only works when running `next dev` locally — the
Vercel-deployed version still can't do this.

| | |
|---|---|
| **Dev work** | ~15 min. |
| **Cost** | Free. |
| **Works on Vercel?** | **No.** This is a local dev convenience only. |
| **When to pick this** | As a stop-gap so *you* can render exports for demos/clients while picking a real production path. |

---

## Recommendation

If you want to ship export this week: **Option B (Remotion Lambda).**

It's the official path, the cost is effectively zero at your scale, and the
output is real MP4 at the quality you'd get from Remotion locally. The
1–2 hours of AWS setup is real but bounded — there's no risk of falling
back into the open-ended debugging hole we hit with the browser approaches.

If export is not a launch blocker: **Option A (defer)** + **Option F (local
CLI fallback)**. Ship the demo without export, render locally for any
clients/demos you need to send out. Revisit B once the rest of the app is
solid.

Avoid:
- **Option D (Vercel function)** unless you're already paying for Pro.
- **Option E (third-party APIs)** — the rewrite cost is hidden but huge.

---

## Open questions before committing

1. **What's the launch timeline?** Export only matters if it's blocking
   real users from getting value out of the app.
2. **Do you have an AWS account already?** Adds 20 min to Option B if not.
3. **What's the typical video length?** If it's >60s frequently, Lambda's
   per-second cost starts to matter; Cloud Run becomes more attractive.
4. **Do you want export to work on the deployed Vercel site, or only
   locally for now?** Big branch in the decision tree.

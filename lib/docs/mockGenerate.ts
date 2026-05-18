import type { Brand } from "../../remotion/schema";
import type { DocOutput, DocType } from "./schema";

// Deterministic fallback so the app keeps working without LLM keys.
// Quality is template-y on purpose — when this fires, you'll see it.

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const mockLandingPage = (prompt: string, brand: Brand): string => `
# ${brand.name}

The fastest way to ship ${sentenceCase(prompt.toLowerCase().split(/[,.]/)[0] ?? "your next launch")}.

## Why teams switch

- **Fast** — Setup in 60 seconds. No onboarding meetings.
- **Open** — Connects to every tool your team already uses.
- **Built for momentum** — Designed for engineering teams who actually ship.

## What you get

${brand.name} replaces the meeting-heavy way your team works today with something async, calm, and on-brand.

## Try it free

No credit card. No trial limits. Just type a prompt and ship.

[Get started →]
`.trim();

export const mockBlogPost = (prompt: string, brand: Brand): string => `
# Announcing ${brand.name}

We built ${brand.name} because we got tired of the alternative.

## The problem

Every team we talked to was solving the same thing the wrong way. They were burning hours on rituals that didn't need to exist — meetings that should have been messages, tools that should have been integrations, processes that should have been defaults.

## What ${brand.name} does

${sentenceCase(prompt)}. Specifically:

- One prompt in. Full output out.
- Designed for the shape of your work, not someone else's.
- Built on the assumption that you have better things to do.

## What's next

This is v1. The roadmap has things we're not ready to talk about yet, but if you've ever wished a tool would just *do the thing*, you're going to like where this is going.

Try ${brand.name} free at [${brand.name.toLowerCase()}.com].
`.trim();

export const mockFaq = (prompt: string, brand: Brand): string => `
# ${brand.name} FAQ

**What is ${brand.name}?**
${brand.name} is ${prompt.toLowerCase().includes("ai") ? "an AI-powered" : "a"} tool that takes the work out of ${prompt.toLowerCase().split(" ").slice(0, 6).join(" ")}.

**How much does it cost?**
Free to start. Paid plans start at \$29/month with no limits on output.

**How fast can I get started?**
Under 60 seconds. Sign up, paste your brand kit, hit generate.

**Do I need a credit card?**
No. The free tier is real-free.

**What if it doesn't fit my use case?**
Email us. We respond within 24 hours and most edge cases become templates within a week.

**Can I bring my own brand?**
Yes. Logo, colors, font, voice — all parameters.

**Is my data private?**
Yes. We don't train on customer prompts. Inputs and outputs are encrypted in transit and at rest.

**Where do I get support?**
support@${brand.name.toLowerCase()}.com or in-app chat. Average response time: 47 minutes.
`.trim();

export const mockReleaseNotes = (prompt: string, brand: Brand): string => `
# ${brand.name} — Release notes

## What's new

- ${sentenceCase(prompt.toLowerCase().split(/[,.]/)[0] ?? "Initial release")}
- Faster generation pipeline — 30% lower latency on the median request
- New brand-kit fields: secondary font, mascot, accent palette
- Export to MP4 (1080p, vertical) now available on paid plans

## Fixes

- Color picker resets correctly when switching presets
- Mobile players no longer overflow on iOS Safari
- Cursor coordinates round to integers in productDemo scenes

## Coming next

- Voiceover generation (parked while we evaluate providers)
- Multi-language localization for all scene copy
- Team workspaces with shared brand kits

— The ${brand.name} team
`.trim();

const MOCK_BY_TYPE: Record<DocType, (prompt: string, brand: Brand) => string> = {
  landingPage: mockLandingPage,
  blogPost: mockBlogPost,
  faq: mockFaq,
  releaseNotes: mockReleaseNotes,
};

export const mockGenerateDoc = (
  type: DocType,
  prompt: string,
  brand: Brand,
): DocOutput => ({
  type,
  markdown: MOCK_BY_TYPE[type](prompt, brand),
});

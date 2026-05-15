import type { Storyboard } from "../remotion/schema";

export const PRESET_CATEGORIES = [
  "dev tools",
  "ai",
  "productivity",
  "design",
  "comms",
  "india",
] as const;
export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export type Preset = {
  category: PresetCategory;
  storyboard: Storyboard;
};

// Each brand has distinct motion DNA — pacing + sfx mix — so they don't feel
// templated. Real copy pulled from each brand's homepage May 2026.

// ─── DEV TOOLS ──────────────────────────────────────────────────────────

// LINEAR: technical, snappy, AI-era. Punchy SFX, very fast cuts.
const linear: Preset = {
  category: "dev tools",
  storyboard: {
    brand: { name: "Linear", color: "#5E6AD2", accent: "#A4B0F5" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 32,
        lines: ["Issue tracking", "is dead."],
        sfx: "whip",
      },
      {
        type: "kineticTitle",
        duration: 28,
        lines: ["The product", "development system."],
        sfx: "whoosh",
      },
      {
        type: "statReveal",
        duration: 42,
        value: "25000",
        suffix: "+",
        label: "Teams · startups to enterprise",
        sfx: "ding",
      },
      {
        type: "featureGrid",
        duration: 55,
        heading: "Plan. Build. Ship.",
        features: [
          { title: "Intake", body: "Conversations into issues." },
          { title: "Plan", body: "Roadmaps. Direction." },
          { title: "Build", body: "Agents for the work." },
        ],
        sfx: "switch",
      },
      {
        type: "ctaCard",
        duration: 42,
        headline: "Built for the AI era.",
        buttonLabel: "Get started",
        url: "linear.app",
        sfx: "whip",
      },
    ],
  },
};

// VERCEL: minimal, silent-ish, fast. Strong negative space.
const vercel: Preset = {
  category: "dev tools",
  storyboard: {
    brand: { name: "Vercel", color: "#000000", accent: "#FFFFFF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 28,
        lines: ["Build.", "Deploy."],
        sfx: "whoosh",
      },
      {
        type: "kineticTitle",
        duration: 28,
        lines: ["The AI Cloud."],
        sfx: "none",
      },
      {
        type: "statReveal",
        duration: 38,
        value: "6",
        suffix: "×",
        label: "Faster shipping",
        sfx: "ding",
      },
      {
        type: "featureGrid",
        duration: 50,
        heading: "Ship features.",
        features: [
          { title: "Not infrastructure.", body: "Fluid Compute, Edge, CDN." },
          { title: "At the speed of AI.", body: "Gateway, Sandbox, SDK, v0." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 38,
        headline: "Deploy on Vercel.",
        buttonLabel: "Start deploying",
        url: "vercel.com",
        sfx: "none",
      },
    ],
  },
};

// STRIPE: premium, smooth, longer holds. Real big stats.
const stripe: Preset = {
  category: "dev tools",
  storyboard: {
    brand: { name: "Stripe", color: "#635BFF", accent: "#00D4FF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 48,
        lines: ["Financial infrastructure", "for the internet."],
        sfx: "whoosh",
      },
      {
        type: "statReveal",
        duration: 58,
        value: "1.9",
        suffix: "T",
        label: "Processed in 2025 — USD",
        sfx: "ding",
      },
      {
        type: "statReveal",
        duration: 50,
        value: "99.999",
        suffix: "%",
        label: "Historical uptime",
        sfx: "ding",
      },
      {
        type: "logoWall",
        duration: 55,
        heading: "Trusted by",
        logos: [
          {
            name: "Shopify",
            color: "#95BF47",
            logoUrl: "https://cdn.simpleicons.org/shopify/95BF47",
          },
          {
            name: "Slack",
            color: "#ECB22E",
            logoUrl: "https://cdn.simpleicons.org/slack/ECB22E",
          },
          {
            name: "Amazon",
            color: "#FF9900",
            logoUrl: "https://cdn.simpleicons.org/amazon/FF9900",
          },
          {
            name: "Zoom",
            color: "#2D8CFF",
            logoUrl: "https://cdn.simpleicons.org/zoom/2D8CFF",
          },
          {
            name: "Figma",
            color: "#A259FF",
            logoUrl: "https://cdn.simpleicons.org/figma/A259FF",
          },
          {
            name: "Lyft",
            color: "#FF00BF",
            logoUrl: "https://cdn.simpleicons.org/lyft/FF00BF",
          },
        ],
        sfx: "switch",
      },
      {
        type: "ctaCard",
        duration: 50,
        headline: "Grow your revenue.",
        subtext: "From first transaction to your billionth.",
        buttonLabel: "Start now",
        url: "stripe.com",
        sfx: "whoosh",
      },
    ],
  },
};

// SUPABASE: dev-friendly, balanced, slightly playful.
const supabase: Preset = {
  category: "dev tools",
  storyboard: {
    brand: { name: "Supabase", color: "#3ECF8E", accent: "#54E5A2" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 38,
        lines: ["Build in a weekend."],
        sfx: "whoosh",
      },
      {
        type: "kineticTitle",
        duration: 38,
        lines: ["Scale to millions."],
        sfx: "whip",
      },
      {
        type: "featureGrid",
        duration: 58,
        heading: "Postgres. Plus everything.",
        features: [
          { title: "Database", body: "Real Postgres, not a wrapper." },
          { title: "Auth", body: "Email, OAuth, magic links." },
          { title: "Realtime", body: "Subscribe to any row." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 45,
        headline: "Start your project.",
        buttonLabel: "Start free",
        url: "supabase.com",
        sfx: "ding",
      },
    ],
  },
};

// ─── AI ─────────────────────────────────────────────────────────────────

// CLAUDE: warm, measured, thoughtful. Quiet pacing.
const claude: Preset = {
  category: "ai",
  storyboard: {
    brand: { name: "Claude", color: "#D97757", accent: "#F4B392" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 42,
        lines: ["Meet your", "thinking partner."],
        sfx: "whoosh",
      },
      {
        type: "kineticTitle",
        duration: 38,
        lines: ["The AI for", "problem solvers."],
        sfx: "none",
      },
      {
        type: "featureGrid",
        duration: 65,
        heading: "Write. Learn. Code.",
        features: [
          { title: "Write", body: "Content with your voice." },
          { title: "Learn", body: "Research and reasoning." },
          { title: "Code", body: "Debug and ship faster." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 45,
        headline: "Try Claude.",
        buttonLabel: "Open Claude",
        url: "claude.com",
        sfx: "ding",
      },
    ],
  },
};

// CURSOR: staccato, technical, confident.
const cursor: Preset = {
  category: "ai",
  storyboard: {
    brand: { name: "Cursor", color: "#000000", accent: "#FFFFFF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 30,
        lines: ["The best way", "to code with AI."],
        sfx: "mouse-click",
      },
      {
        type: "statReveal",
        duration: 42,
        value: "50",
        suffix: "%",
        label: "Of Fortune 500 use Cursor",
        sfx: "ding",
      },
      {
        type: "statReveal",
        duration: 42,
        value: "40000",
        suffix: "+",
        label: "NVIDIA engineers on Cursor",
        sfx: "ding",
      },
      {
        type: "testimonialQuote",
        duration: 60,
        quote: "Software creation is changing.",
        author: "Cursor",
        role: "Inventing at the edge",
        sfx: "shutter-modern",
      },
      {
        type: "ctaCard",
        duration: 38,
        headline: "Extraordinarily productive.",
        buttonLabel: "Download",
        url: "cursor.com",
        sfx: "mouse-click",
      },
    ],
  },
};

// CHATGPT: friendly, mass-market.
const openAI: Preset = {
  category: "ai",
  storyboard: {
    brand: { name: "ChatGPT", color: "#10A37F", accent: "#1FBF99" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 35,
        lines: ["Ask anything.", "Get answers."],
        sfx: "whoosh",
      },
      {
        type: "statReveal",
        duration: 50,
        value: "800",
        suffix: "M",
        label: "Weekly users",
        sfx: "ding",
      },
      {
        type: "logoWall",
        duration: 50,
        heading: "Trusted by",
        logos: [
          { name: "Apple", logoUrl: "https://cdn.simpleicons.org/apple/FFFFFF" },
          {
            name: "Microsoft",
            logoUrl: "https://cdn.simpleicons.org/microsoft/FFFFFF",
          },
          {
            name: "Adobe",
            logoUrl: "https://cdn.simpleicons.org/adobe/FFFFFF",
          },
          {
            name: "Salesforce",
            logoUrl: "https://cdn.simpleicons.org/salesforce/FFFFFF",
          },
          { name: "PwC", logoUrl: "https://cdn.simpleicons.org/pwc/FFFFFF" },
          {
            name: "Canva",
            logoUrl: "https://cdn.simpleicons.org/canva/FFFFFF",
          },
        ],
        sfx: "switch",
      },
      {
        type: "ctaCard",
        duration: 50,
        headline: "Start chatting.",
        buttonLabel: "Get ChatGPT",
        url: "chatgpt.com",
        sfx: "ding",
      },
    ],
  },
};

// ─── PRODUCTIVITY ───────────────────────────────────────────────────────

// NOTION: calm, paper-like, casual. Longer scenes, page-turn dominant.
const notion: Preset = {
  category: "productivity",
  storyboard: {
    brand: { name: "Notion", color: "#191919", accent: "#FFFFFF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 50,
        lines: ["The AI workspace", "that works for you."],
        sfx: "page-turn",
      },
      {
        type: "kineticTitle",
        duration: 45,
        lines: ["Meet the", "night shift."],
        sfx: "page-turn",
      },
      {
        type: "statReveal",
        duration: 58,
        value: "100",
        suffix: "M",
        label: "Users worldwide",
        sfx: "ding",
      },
      {
        type: "statReveal",
        duration: 55,
        value: "62",
        suffix: "%",
        label: "Of Fortune 100 use Notion",
        sfx: "ding",
      },
      {
        type: "featureGrid",
        duration: 65,
        heading: "Docs. Wikis. Tasks.",
        features: [
          { title: "Agents", body: "Capture knowledge 24/7." },
          { title: "Search", body: "Answer questions instantly." },
          { title: "Notes", body: "Meeting notes that write themselves." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 50,
        headline: "Less tracking.",
        subtext: "More progress.",
        buttonLabel: "Get Notion free",
        url: "notion.com",
        sfx: "page-turn",
      },
    ],
  },
};

// RAYCAST: snappy, keyboard-driven.
const raycast: Preset = {
  category: "productivity",
  storyboard: {
    brand: { name: "Raycast", color: "#FF6363", accent: "#FF9999" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 30,
        lines: ["⌘ + Space."],
        sfx: "switch",
      },
      {
        type: "kineticTitle",
        duration: 32,
        lines: ["Everything,", "one shortcut."],
        sfx: "whoosh",
      },
      {
        type: "featureGrid",
        duration: 55,
        heading: "Built for speed.",
        features: [
          { title: "Spotlight", body: "Better. By a mile." },
          { title: "Extensions", body: "1500+ at your fingers." },
          { title: "AI", body: "Ask anywhere, instantly." },
        ],
        sfx: "switch",
      },
      {
        type: "ctaCard",
        duration: 40,
        headline: "Free. Native. Fast.",
        buttonLabel: "Download",
        url: "raycast.com",
        sfx: "ding",
      },
    ],
  },
};

// ─── DESIGN ─────────────────────────────────────────────────────────────

// FIGMA: playful, varied pacing, collaborative.
const figma: Preset = {
  category: "design",
  storyboard: {
    brand: { name: "Figma", color: "#0D0D0D", accent: "#A259FF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 40,
        lines: ["Make anything", "possible."],
        sfx: "whoosh",
      },
      {
        type: "kineticTitle",
        duration: 32,
        lines: ["All in Figma."],
        sfx: "whip",
      },
      {
        type: "logoWall",
        duration: 50,
        heading: "Designed at",
        logos: [
          {
            name: "Airbnb",
            logoUrl: "https://cdn.simpleicons.org/airbnb/FF5A5F",
          },
          {
            name: "Netflix",
            logoUrl: "https://cdn.simpleicons.org/netflix/E50914",
          },
          {
            name: "Slack",
            logoUrl: "https://cdn.simpleicons.org/slack/ECB22E",
          },
          {
            name: "Spotify",
            logoUrl: "https://cdn.simpleicons.org/spotify/1ED760",
          },
          {
            name: "Microsoft",
            logoUrl: "https://cdn.simpleicons.org/microsoft/FFFFFF",
          },
          {
            name: "Uber",
            logoUrl: "https://cdn.simpleicons.org/uber/FFFFFF",
          },
        ],
        sfx: "switch",
      },
      {
        type: "featureGrid",
        duration: 60,
        heading: "Big ideas. Real products.",
        features: [
          { title: "Design", body: "Together, in one canvas." },
          { title: "Dev Mode", body: "From spec to ship." },
          { title: "Make", body: "Prototype to production." },
        ],
        sfx: "ding",
      },
      {
        type: "ctaCard",
        duration: 45,
        headline: "Start designing.",
        buttonLabel: "Get started free",
        url: "figma.com",
        sfx: "whoosh",
      },
    ],
  },
};

// FRAMER: smooth, designer-friendly.
const framer: Preset = {
  category: "design",
  storyboard: {
    brand: { name: "Framer", color: "#0099FF", accent: "#66C2FF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 40,
        lines: ["Sites that ship", "in hours."],
        sfx: "whoosh",
      },
      {
        type: "statReveal",
        duration: 48,
        value: "100",
        suffix: "K",
        label: "Sites built on Framer",
        sfx: "ding",
      },
      {
        type: "featureGrid",
        duration: 55,
        heading: "Design. Publish.",
        features: [
          { title: "Visual", body: "No code. Real CMS." },
          { title: "Fast", body: "Lighthouse 100s by default." },
          { title: "Free hosting", body: "Included on every plan." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 45,
        headline: "Make it real.",
        buttonLabel: "Try Framer",
        url: "framer.com",
        sfx: "whip",
      },
    ],
  },
};

// ─── COMMS ──────────────────────────────────────────────────────────────

// LOOM: warm, conversational, shutter-heavy.
const loom: Preset = {
  category: "comms",
  storyboard: {
    brand: { name: "Loom", color: "#625DF5", accent: "#9F9BFF" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 45,
        lines: ["One video", "is worth", "a thousand words."],
        sfx: "shutter-modern",
      },
      {
        type: "statReveal",
        duration: 50,
        value: "400000",
        suffix: "",
        label: "Companies using Loom",
        sfx: "shutter-modern",
      },
      {
        type: "featureGrid",
        duration: 60,
        heading: "Record. Share. Done.",
        features: [
          { title: "Lightning", body: "Capture in one click." },
          { title: "Edit", body: "Trim, blur, redact." },
          { title: "Share", body: "Anywhere you work." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 50,
        headline: "Less meetings.",
        subtext: "More Loom.",
        buttonLabel: "Get Loom free",
        url: "loom.com",
        sfx: "shutter-modern",
      },
    ],
  },
};

// SLACK: classic SaaS energy, logo-wall heavy.
const slack: Preset = {
  category: "comms",
  storyboard: {
    brand: { name: "Slack", color: "#4A154B", accent: "#ECB22E" },
    scenes: [
      {
        type: "kineticTitle",
        duration: 38,
        lines: ["Where work", "happens."],
        sfx: "whoosh",
      },
      {
        type: "logoWall",
        duration: 50,
        heading: "Powering teams at",
        logos: [
          {
            name: "Airbnb",
            logoUrl: "https://cdn.simpleicons.org/airbnb/FF5A5F",
          },
          { name: "NASA", logoUrl: "https://cdn.simpleicons.org/nasa/FFFFFF" },
          {
            name: "Spotify",
            logoUrl: "https://cdn.simpleicons.org/spotify/1ED760",
          },
          {
            name: "Target",
            logoUrl: "https://cdn.simpleicons.org/target/CC0000",
          },
          { name: "Uber", logoUrl: "https://cdn.simpleicons.org/uber/FFFFFF" },
          {
            name: "Etsy",
            logoUrl: "https://cdn.simpleicons.org/etsy/F16521",
          },
        ],
        sfx: "switch",
      },
      {
        type: "featureGrid",
        duration: 55,
        heading: "Topics, not inboxes.",
        features: [
          { title: "Channels", body: "Organized by topic." },
          { title: "Huddles", body: "Voice, one click." },
          { title: "Canvas", body: "Docs in the conversation." },
        ],
        sfx: "page-turn",
      },
      {
        type: "ctaCard",
        duration: 45,
        headline: "Try Slack.",
        subtext: "Free for small teams.",
        buttonLabel: "Get started",
        url: "slack.com",
        sfx: "ding",
      },
    ],
  },
};

// ─── INDIA ──────────────────────────────────────────────────────────────

// SARVAM STUDIO: cinematic, multi-script cold open, saffron accent, slow holds.
// Inspired by the Apple-keynote-meets-Bharatiya brief. 16:9 master.
const sarvam: Preset = {
  category: "india",
  storyboard: {
    brand: { name: "Sarvam Studio", color: "#0A0A0A", accent: "#FF6A00" },
    scenes: [
      {
        type: "multiScript",
        duration: 180,
        glyphs: [
          { char: "अ", script: "devanagari" },
          { char: "அ", script: "tamil" },
          { char: "অ", script: "bengali" },
          { char: "A", script: "latin" },
        ],
        caption: "Eleven scripts. One platform.",
        sfx: "ding",
      },
      {
        type: "kineticTitle",
        duration: 90,
        lines: ["India speaks", "many languages."],
        variant: "mask",
        sfx: "whoosh",
      },
      {
        type: "kineticTitle",
        duration: 80,
        lines: ["Your content", "should too."],
        variant: "mask",
        sfx: "none",
      },
      {
        type: "featureGrid",
        duration: 130,
        heading: "Translate. Dub. Ship.",
        features: [
          { title: "Video dub", body: "Voice, emotion, timing preserved." },
          { title: "Document", body: "Layout, tables, structure intact." },
          { title: "Voice clone", body: "Same speaker, every language." },
        ],
        sfx: "page-turn",
      },
      {
        type: "statReveal",
        duration: 90,
        value: "11",
        suffix: "",
        label: "Indian languages, one workspace",
        variant: "mask",
        sfx: "ding",
      },
      {
        type: "testimonialQuote",
        duration: 120,
        quote: "Translation that respects the source.",
        author: "An IIT Madras professor",
        role: "Education at scale",
        sfx: "shutter-modern",
      },
      {
        type: "kineticTitle",
        duration: 100,
        lines: ["One content.", "Every language."],
        variant: "mask",
        sfx: "whoosh",
      },
      {
        type: "ctaCard",
        duration: 90,
        headline: "Sarvam Studio.",
        subtext: "AI for all from India.",
        buttonLabel: "Start translating",
        url: "sarvam.ai/products/studio",
        variant: "mask",
        sfx: "ding",
      },
    ],
  },
};

export const presets: Preset[] = [
  sarvam,
  linear,
  vercel,
  stripe,
  supabase,
  claude,
  cursor,
  openAI,
  notion,
  raycast,
  figma,
  framer,
  loom,
  slack,
];

export const sampleStoryboards: Storyboard[] = presets.map((p) => p.storyboard);

// Server-safe icon name catalog. The actual SVG paths live in
// remotion/components/decor/Icon.tsx — that file pulls React etc. and
// can't run server-side. This module is the schema-and-Director-facing
// surface.

export const ICON_NAMES = [
  // Communication / telephony
  "phone",
  "message",
  "mail",
  "wave",       // sound / voice wave
  "signal",     // signal bars
  // Developer / infra
  "code",
  "terminal",
  "cloud",
  "database",
  "server",
  // Security / auth
  "key",
  "lock",
  "shield",
  // Data / analytics
  "chart-bar",
  "chart-line",
  "search",
  "target",
  // AI / energy
  "spark",
  "bolt",
  "brain",
  // Commerce / money
  "card",
  "wallet",
  // Geography
  "globe",
  // Abstract / decorative
  "hexagon",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

// Short description per icon for the Director's prompt. Helps it pick
// semantically — e.g. "phone" for a telephony product, "lock" for
// security, "chart-bar" for analytics.
export const ICON_DESCRIPTIONS: Record<IconName, string> = {
  phone: "telephony / voice / calling",
  message: "chat / SMS / messaging",
  mail: "email",
  wave: "sound wave / voice signal",
  signal: "signal strength / connection quality",
  code: "developer / programming",
  terminal: "command line / CLI",
  cloud: "cloud infrastructure / hosting",
  database: "data storage / DB",
  server: "backend infrastructure",
  key: "auth / API keys",
  lock: "security / privacy",
  shield: "protection / compliance",
  "chart-bar": "analytics / metrics",
  "chart-line": "growth / trends",
  search: "search / discovery",
  target: "accuracy / goals / precision",
  spark: "AI / magic / generative",
  bolt: "speed / energy / power",
  brain: "AI / intelligence / ML",
  card: "payments / billing",
  wallet: "finance / commerce",
  globe: "international / global / web",
  hexagon: "abstract structural element",
};

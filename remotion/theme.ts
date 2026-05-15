import { Easing } from "remotion";

export const THEME = {
  bg: {
    dark: "#0a0a0c",
    light: "#fafafa",
  },
  text: {
    onDark: "#ffffff",
    onDarkMuted: "rgba(255,255,255,0.55)",
    onDarkFaint: "rgba(255,255,255,0.35)",
    onLight: "#0a0a0c",
    onLightMuted: "rgba(10,10,12,0.6)",
    onLightFaint: "rgba(10,10,12,0.4)",
  },
  size: {
    hero: 220,
    display: 132,
    title: 72,
    body: 32,
    label: 22,
    caption: 18,
  },
  tracking: {
    hero: "-0.05em",
    display: "-0.04em",
    title: "-0.025em",
    body: "0",
    label: "0.04em",
    caption: "0.08em",
  },
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
    black: 900,
  },
  padding: {
    scene: 140,
  },
} as const;

export const ease = {
  // Apple-style "expo out" — fast in, slow settle. Use for entrances.
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  // Snappy in/out for transitions
  cinematicInOut: Easing.bezier(0.65, 0, 0.35, 1),
  // Slow confident "swoop" — like Final Cut Pro transitions
  swoop: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

export const themeForScene = (
  idx: number,
  override?: "light" | "dark",
): "light" | "dark" => {
  if (override) return override;
  return idx % 2 === 0 ? "dark" : "light";
};

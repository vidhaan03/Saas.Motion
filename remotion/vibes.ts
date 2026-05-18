import { Easing } from "remotion";
import {
  VIBE_KEYS,
  DEFAULT_VIBE,
  VIBE_DATA,
  type VibeKey,
  type VibeData,
} from "./vibeKeys";

// Re-export server-safe surfaces so existing client consumers keep
// working without churn.
export { VIBE_KEYS, DEFAULT_VIBE, type VibeKey };

// VibeTokens = the server-safe VibeData + the client-only easing curve.
// Server modules use resolveVibeData() from ./vibeKeys; client modules
// use resolveVibe() from here for the full bundle.
export type VibeTokens = VibeData & {
  // Remotion's EasingFunction is `(input: number) => number`.
  easeEntrance: (input: number) => number;
};

const EASE_BY_VIBE: Record<VibeKey, (input: number) => number> = {
  minimal: Easing.bezier(0.16, 1, 0.3, 1),
  // Overshoot curve — feels like a spring with momentum.
  energetic: Easing.bezier(0.34, 1.56, 0.64, 1),
  editorial: Easing.bezier(0.4, 0.0, 0.2, 1),
  techy: Easing.bezier(0.45, 0.05, 0.55, 0.95),
  // Slightly bouncy.
  warm: Easing.bezier(0.34, 1.4, 0.64, 1),
  bold: Easing.bezier(0.22, 1, 0.36, 1),
};

export const VIBES: Record<VibeKey, VibeTokens> = (
  Object.keys(VIBE_DATA) as VibeKey[]
).reduce(
  (acc, key) => {
    acc[key] = { ...VIBE_DATA[key], easeEntrance: EASE_BY_VIBE[key] };
    return acc;
  },
  {} as Record<VibeKey, VibeTokens>,
);

export const resolveVibe = (
  brandVibe: VibeKey | undefined,
): VibeTokens => VIBES[brandVibe ?? DEFAULT_VIBE];

export const asVibeKey = (value: unknown): VibeKey | undefined =>
  typeof value === "string" && (VIBE_KEYS as readonly string[]).includes(value)
    ? (value as VibeKey)
    : undefined;

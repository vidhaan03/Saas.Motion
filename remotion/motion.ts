import { Easing, interpolate } from "remotion";

// ─── Cinematic easing curves ───────────────────────────────────────────
//
// All curves are bezier — Lottie/AE-compatible mental model. Pick the one
// that matches the element's character:
//   • expoSettle: fast in, long slow tail. Best for body text and labels.
//   • cinematic: smooth in and out. Best for camera-like moves.
//   • anticipate: small back-step then forward. Best for buttons + CTAs.
//   • overshoot: forward + overshoot + settle. Best for hero text.
//   • softLand: slow start, accelerating, gentle land. Best for big shapes.

export const ease = {
  expoSettle: Easing.bezier(0.16, 1, 0.3, 1),
  cinematic: Easing.bezier(0.32, 0.72, 0, 1),
  anticipate: Easing.bezier(0.5, -0.2, 0.2, 1),
  overshoot: Easing.bezier(0.34, 1.42, 0.5, 1),
  softLand: Easing.bezier(0.45, 0.05, 0.2, 1),
} as const;

// ─── Composite entrance ───────────────────────────────────────────────
//
// AE-grade entrances aren't a single property animating — they're a
// stack of independently-timed deltas. cinematicEntrance bundles three:
//
//   • opacity fade-in (fastest)
//   • position drift (medium)
//   • scale settle (slowest)
//
// Each lerps with its own ease curve so the element doesn't feel like
// it's on rails. Returns interpolated values you spread into style.

export type EntranceCharacter = "soft" | "punchy" | "considered";

export type CinematicEntrance = {
  opacity: number;
  translateY: number; // px
  translateX: number; // px
  scale: number;
};

const CHARACTERS: Record<
  EntranceCharacter,
  {
    fadeFrames: number;
    driftFrames: number;
    scaleFrames: number;
    driftStartPx: number;
    scaleStart: number;
    fadeEase: keyof typeof ease;
    driftEase: keyof typeof ease;
    scaleEase: keyof typeof ease;
  }
> = {
  // Big considered hero motion — long fade, gentle drift.
  considered: {
    fadeFrames: 16,
    driftFrames: 26,
    scaleFrames: 28,
    driftStartPx: 28,
    scaleStart: 0.96,
    fadeEase: "expoSettle",
    driftEase: "softLand",
    scaleEase: "cinematic",
  },
  // Default — medium energy, slight overshoot on scale.
  soft: {
    fadeFrames: 12,
    driftFrames: 22,
    scaleFrames: 22,
    driftStartPx: 22,
    scaleStart: 0.95,
    fadeEase: "expoSettle",
    driftEase: "expoSettle",
    scaleEase: "overshoot",
  },
  // Energetic / bold — short fade, big overshoot.
  punchy: {
    fadeFrames: 9,
    driftFrames: 18,
    scaleFrames: 22,
    driftStartPx: 36,
    scaleStart: 0.88,
    fadeEase: "expoSettle",
    driftEase: "expoSettle",
    scaleEase: "overshoot",
  },
};

export const cinematicEntrance = (
  frame: number,
  startFrame: number,
  character: EntranceCharacter = "soft",
  options: {
    driftDirection?: "up" | "down" | "left" | "right";
  } = {},
): CinematicEntrance => {
  const cfg = CHARACTERS[character];
  const local = frame - startFrame;

  const opacity = interpolate(local, [0, cfg.fadeFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease[cfg.fadeEase],
  });

  const driftAmount = interpolate(
    local,
    [0, cfg.driftFrames],
    [cfg.driftStartPx, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease[cfg.driftEase],
    },
  );

  const dir = options.driftDirection ?? "up";
  const translateX = dir === "left" ? driftAmount : dir === "right" ? -driftAmount : 0;
  const translateY = dir === "up" ? driftAmount : dir === "down" ? -driftAmount : 0;

  const scale = interpolate(
    local,
    [0, cfg.scaleFrames],
    [cfg.scaleStart, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease[cfg.scaleEase],
    },
  );

  return { opacity, translateX, translateY, scale };
};

// Helper to fold a CinematicEntrance into a `transform` string.
export const entranceTransform = (e: CinematicEntrance): string =>
  `translate(${e.translateX}px, ${e.translateY}px) scale(${e.scale})`;

// ─── Continuous motion ────────────────────────────────────────────────
//
// AE comps never feel "static" — there's always sub-frame drift /
// breathing / parallax under everything. breathing() returns a small
// scale oscillation usable as `transform: scale(${breathing(frame)})`.

export const breathing = (frame: number, phase = 0, amount = 0.008): number =>
  1 + amount * Math.sin(frame / 90 + phase);

// Camera push-in over the lifetime of a scene. Subtle (1.0 → 1.04 over
// duration) — gives the comp a sense of approach without obvious zoom.
export const cameraPushIn = (
  frame: number,
  durationInFrames: number,
  amount = 0.04,
): number =>
  interpolate(frame, [0, durationInFrames], [1, 1 + amount], {
    extrapolateRight: "clamp",
    easing: ease.cinematic,
  });

// Slow parallax drift in px. Use phase to desync neighbouring layers.
export const parallaxDrift = (
  frame: number,
  amplitude: number,
  period: number,
  phase = 0,
): { x: number; y: number } => ({
  x: amplitude * Math.sin(frame / period + phase),
  y: amplitude * 0.7 * Math.cos(frame / (period * 1.2) + phase),
});

// ─── Exit ─────────────────────────────────────────────────────────────
// Mirrors cinematicEntrance for end-of-scene fades.

export const cinematicExit = (
  frame: number,
  exitStartFrame: number,
  durationFrames = 14,
): { opacity: number; scale: number } => {
  const t = interpolate(frame, [exitStartFrame, exitStartFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.cinematic,
  });
  return {
    opacity: 1 - t,
    scale: 1 + t * 0.04,
  };
};

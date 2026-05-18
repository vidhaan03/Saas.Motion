import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Brand, DecorElement } from "../schema";
import { resolveVibe } from "../vibes";
import { cameraPushIn, parallaxDrift } from "../motion";
import { Grain } from "./Grain";
import { AtmosphericLayer } from "./decor/AtmosphericLayer";

type Theme = "dark" | "light";

type Props = {
  brand: Brand;
  theme?: Theme;
  // Visual richness ladder:
  //   "quiet"     — gradient + faint bloom, no decoration
  //   "balanced"  — adds a moving bloom + vignette + sparse decor
  //   "rich"      — bigger bloom, second drift bloom, dense decor
  intensity?: "quiet" | "balanced" | "rich";
  // Override the bloom position; defaults to top-left at 25%, 18%.
  bloomAnchor?: { x: number; y: number };
  // Override the base color stops. Skips brand tint; useful for stark
  // black/white scenes that don't want any color cast.
  monochrome?: boolean;
  // Seed for deterministic decor placement (orbs, particles). Pass
  // sceneIndex so the same scene reproduces the same atmospheric layout.
  decorSeed?: number;
  // Override the vibe-derived decor density (only used when `decor` is
  // not supplied). Pass null to disable decor entirely.
  decorOverride?: 0 | 1 | 2 | null;
  // AI-authored decor list. When provided, the layer renders this exact
  // set of orbs/beams/particles. When undefined, the legacy density-based
  // hardcoded layout is used.
  decor?: DecorElement[];
  children?: React.ReactNode;
};

// One shared backdrop for every scene. Builds depth out of four layers:
//
//   1. base gradient — diagonal linear, neutrals with a subtle brand tint
//   2. bloom — large soft radial glow that drifts; suggests a light source
//   3. vignette — radial darkening at the edges, focuses centre attention
//   4. grain — fine SVG turbulence; ties the scene to a "filmed" feel
//
// All four use color-mix so they adapt to whatever brand colour comes in.
export const ProductionBackdrop: React.FC<Props> = ({
  brand,
  theme = "dark",
  intensity = "balanced",
  bloomAnchor,
  monochrome = false,
  decorSeed = 0,
  decorOverride,
  decor,
  children,
}) => {
  const vibe = resolveVibe(brand.vibe);
  // Density resolution: explicit override wins; null disables; otherwise
  // map intensity to vibe.decorDensity. Quiet scenes never show decor
  // even if the vibe is dense (keeps "minimal vibe + dark scene" clean).
  const density: 0 | 1 | 2 =
    decorOverride === null
      ? 0
      : decorOverride !== undefined
        ? decorOverride
        : intensity === "quiet"
          ? 0
          : intensity === "rich"
            ? (Math.max(1, vibe.decorDensity) as 1 | 2)
            : vibe.decorDensity;
  const frame = useCurrentFrame();

  const isDark = theme === "dark";
  const baseStart = isDark ? "#0a0a0c" : "#fafafa";
  const baseEnd = isDark ? "#04040a" : "#f0f0f0";
  // Tint factor controls how much brand colour bleeds into the base
  // gradient end-stop. Lower = more neutral; higher = brand-saturated.
  const tintPct = monochrome ? 0 : isDark ? 14 : 8;
  const tintedEnd = monochrome
    ? baseEnd
    : `color-mix(in srgb, ${brand.color} ${tintPct}%, ${baseEnd})`;

  // Bloom drifts on a slow parallax path so it never looks static.
  const anchorX = bloomAnchor?.x ?? 25;
  const anchorY = bloomAnchor?.y ?? 18;
  const bloomParallax = parallaxDrift(frame, 4, 90);
  const bloomX = anchorX + bloomParallax.x;
  const bloomY = anchorY + bloomParallax.y * 0.8;

  const bloomStrength =
    intensity === "quiet" ? 14 : intensity === "rich" ? 28 : 22;
  const secondaryBloomStrength = intensity === "rich" ? 16 : 0;

  // Camera push-in across the scene's duration. More pronounced than
  // before (1.0 → 1.06) so the approach actually reads on screen.
  // `useVideoConfig` returns the parent sequence's duration when this
  // backdrop is nested inside a scene, so the push fits each scene.
  const { durationInFrames } = useVideoConfig();
  const baseScale = cameraPushIn(frame, durationInFrames, 0.06);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${baseStart} 0%, ${tintedEnd} 100%)`,
        transform: `scale(${baseScale})`,
        transformOrigin: "center",
        overflow: "hidden",
      }}
    >
      {/* Primary bloom — brand accent */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 50% at ${bloomX}% ${bloomY}%, color-mix(in srgb, ${brand.accent} ${bloomStrength}%, transparent) 0%, transparent 60%)`,
          mixBlendMode: isDark ? "screen" : "multiply",
          pointerEvents: "none",
        }}
      />

      {/* Secondary bloom (rich only) — opposite corner, brand color */}
      {secondaryBloomStrength > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 50% 40% at ${100 - bloomX}% ${100 - bloomY}%, color-mix(in srgb, ${brand.color} ${secondaryBloomStrength}%, transparent) 0%, transparent 65%)`,
            mixBlendMode: isDark ? "screen" : "multiply",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* Vignette (skipped for quiet) */}
      {intensity !== "quiet" ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, ${isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)"} 100%)`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* Atmospheric decor (orbs + beams + particles), sits ABOVE the
          bloom layers but BELOW grain + content. When the scene supplied
          a `decor` array (AI-authored) it's rendered verbatim; otherwise
          density-based hardcoded layout kicks in. */}
      <AtmosphericLayer
        brand={brand}
        elements={decor}
        density={density}
        seed={decorSeed}
        theme={theme}
      />

      {/* Grain — always present but lighter in light theme */}
      <Grain opacity={isDark ? 0.06 : 0.035} />

      {children}
    </AbsoluteFill>
  );
};

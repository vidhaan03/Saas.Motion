import { useMemo } from "react";
import type { Brand, DecorElement } from "../../schema";
import { Orb } from "./Orb";
import { LightBeam } from "./LightBeam";
import { ParticleField } from "./ParticleField";
import { Icon } from "./Icon";

type Props = {
  brand: Brand;
  // When `elements` is supplied, render that AI-authored list verbatim and
  // ignore `density` entirely. When `elements` is undefined we fall back
  // to a hand-tuned hardcoded layout selected by density — preserves the
  // legacy look for storyboards generated before AI decor existed.
  elements?: DecorElement[];
  density: 0 | 1 | 2;
  seed?: number;
  theme?: "dark" | "light";
};

// Composes Orb + LightBeam + ParticleField into one decorative stack.
// Layouts at each density are hand-tuned for a 9:16 vertical canvas; they
// look intentional rather than randomly scattered.
//
// Density 0 returns null entirely (no DOM overhead for "quiet" vibes).

type OrbPlacement = {
  x: number;
  y: number;
  size: number;
  color: "color" | "accent";
  layer: number;
  phase: number;
};

const SPARSE_ORBS: OrbPlacement[] = [
  { x: 18, y: 22, size: 24, color: "color", layer: 0.55, phase: 0 },
  { x: 82, y: 78, size: 18, color: "accent", layer: 0.7, phase: 1.4 },
  { x: 88, y: 24, size: 12, color: "color", layer: 0.4, phase: 2.7 },
];

const RICH_ORBS: OrbPlacement[] = [
  // Background depth (small, blurred, slow)
  { x: 12, y: 14, size: 30, color: "color", layer: 0.4, phase: 0 },
  { x: 92, y: 12, size: 22, color: "accent", layer: 0.45, phase: 0.7 },
  { x: 8, y: 84, size: 28, color: "accent", layer: 0.5, phase: 1.3 },
  { x: 95, y: 90, size: 26, color: "color", layer: 0.5, phase: 2.0 },
  // Mid-depth orbs
  { x: 24, y: 64, size: 18, color: "accent", layer: 0.75, phase: 2.6 },
  { x: 78, y: 38, size: 16, color: "color", layer: 0.8, phase: 3.3 },
  // Foreground accents (small, sharp, fast)
  { x: 65, y: 86, size: 8, color: "accent", layer: 1.1, phase: 4.1 },
  { x: 30, y: 14, size: 7, color: "color", layer: 1.0, phase: 4.8 },
];

export const AtmosphericLayer: React.FC<Props> = ({
  brand,
  elements,
  density,
  seed = 0,
  theme = "dark",
}) => {
  // AI-authored path: render `elements` exactly. Orbs back-to-front, then
  // beams, then particles. Empty array means "the AI chose no decor" and
  // we honour that (no fallback to hardcoded).
  const aiAuthored = useMemo(() => {
    if (!elements) return null;
    const orbs = elements.filter(
      (e): e is Extract<DecorElement, { type: "orb" }> => e.type === "orb",
    );
    const beams = elements.filter(
      (e): e is Extract<DecorElement, { type: "beam" }> => e.type === "beam",
    );
    const particles = elements.find(
      (e): e is Extract<DecorElement, { type: "particles" }> =>
        e.type === "particles",
    );
    const icons = elements.filter(
      (e): e is Extract<DecorElement, { type: "icon" }> => e.type === "icon",
    );
    return { orbs, beams, particles, icons };
  }, [elements]);

  // Fallback hardcoded path (legacy, before AI decor): selects from
  // SPARSE_ORBS / RICH_ORBS by density.
  const fallbackOrbs = useMemo(() => {
    if (aiAuthored || density === 0) return [];
    return density === 2 ? RICH_ORBS : SPARSE_ORBS;
  }, [aiAuthored, density]);

  if (!aiAuthored && density === 0) return null;

  const particleColor = theme === "dark" ? "#ffffff" : brand.accent;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {aiAuthored ? (
        <>
          {/* AI-authored beams */}
          {aiAuthored.beams.map((b, i) => (
            <LightBeam
              key={`beam-${i}`}
              originX={b.originX}
              originY={b.originY}
              baseAngle={b.angle}
              intensity={b.intensity ?? 0.22}
              color={b.color === "accent" ? brand.accent : brand.color}
              phase={i * 1.7}
            />
          ))}
          {/* AI-authored orbs, sorted back-to-front */}
          {[...aiAuthored.orbs]
            .sort((a, b) => (a.layer ?? 1) - (b.layer ?? 1))
            .map((o, i) => (
              <Orb
                key={`orb-${i}`}
                x={o.x}
                y={o.y}
                size={o.size}
                layer={o.layer ?? 1}
                phase={i * 0.9}
                color={o.color === "accent" ? brand.accent : brand.color}
              />
            ))}
          {/* AI-authored particles (single entry max — density is sparse/dense) */}
          {aiAuthored.particles ? (
            <ParticleField
              count={aiAuthored.particles.density === "dense" ? 90 : 40}
              seed={seed}
              color={particleColor}
              maxSize={aiAuthored.particles.density === "dense" ? 5 : 3}
            />
          ) : null}
          {/* AI-authored semantic icons. Drawn ABOVE orbs/particles so
              they read as the meaningful elements they are. */}
          {aiAuthored.icons.map((ic, i) => (
            <Icon
              key={`icon-${i}`}
              name={ic.name}
              x={ic.x}
              y={ic.y}
              size={ic.size}
              layer={ic.layer ?? 1}
              phase={i * 1.1}
              color={ic.color === "accent" ? brand.accent : brand.color}
            />
          ))}
        </>
      ) : (
        <>
          {/* Legacy hardcoded fallback */}
          {density === 2 ? (
            <>
              <LightBeam
                originX={50}
                originY={-10}
                baseAngle={180}
                sweep={6}
                length={1.4}
                spreadDegrees={28}
                color={brand.accent}
                intensity={0.22}
                phase={0}
              />
              <LightBeam
                originX={50}
                originY={110}
                baseAngle={0}
                sweep={5}
                length={1.2}
                spreadDegrees={22}
                color={brand.color}
                intensity={0.14}
                phase={2.4}
              />
            </>
          ) : null}
          {[...fallbackOrbs]
            .sort((a, b) => a.layer - b.layer)
            .map((o, i) => (
              <Orb
                key={`orb-${i}`}
                x={o.x}
                y={o.y}
                size={o.size}
                layer={o.layer}
                phase={o.phase}
                color={o.color === "accent" ? brand.accent : brand.color}
              />
            ))}
          <ParticleField
            count={density === 2 ? 90 : 40}
            seed={seed}
            color={particleColor}
            maxSize={density === 2 ? 5 : 3}
          />
        </>
      )}
    </div>
  );
};

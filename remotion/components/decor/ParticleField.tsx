import { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  // How many particles to render. Performance falls off above ~120.
  count?: number;
  // Seed for deterministic random placement — pass a stable value (e.g.
  // sceneIndex) so the same scene reproduces the same field.
  seed?: number;
  // Particle colour. Each particle's individual opacity varies.
  color?: string;
  // Maximum particle size in px. Sizes are sampled from a power curve
  // so most particles are small (depth-of-field feel).
  maxSize?: number;
};

// Deterministic pseudo-random for layout — we want particles to land in
// the same place every render but feel scattered. xorshift32-ish.
const seededRandom = (seed: number) => {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

type Particle = {
  x: number;
  y: number;
  size: number;
  // Twinkle phase + speed; opacity = sin(frame/twinkleSpeed + twinklePhase).
  twinklePhase: number;
  twinkleSpeed: number;
  // Drift amplitude + phase for slow positional sway.
  driftAmp: number;
  driftPhase: number;
  // 0..1 — used both for size and parallax speed.
  depth: number;
};

// Sparkling depth field. Particles twinkle independently and drift in
// slow ellipses; tiny ones drift slower (parallax). The whole thing is
// blend-mode `screen` so it reads as light not paint.
export const ParticleField: React.FC<Props> = ({
  count = 80,
  seed = 0,
  color = "#ffffff",
  maxSize = 5,
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo<Particle[]>(() => {
    const rng = seededRandom(seed + 1);
    return Array.from({ length: count }, () => {
      const depth = Math.pow(rng(), 1.8); // skew toward small/distant
      return {
        x: rng() * 100,
        y: rng() * 100,
        size: 0.5 + depth * maxSize,
        twinklePhase: rng() * Math.PI * 2,
        twinkleSpeed: 25 + rng() * 40,
        driftAmp: 0.5 + rng() * 2,
        driftPhase: rng() * Math.PI * 2,
        depth,
      };
    });
  }, [count, seed, maxSize]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      {particles.map((p, i) => {
        // Depth-based parallax: tiny/distant particles barely move.
        const driftSpeed = 120 / Math.max(0.2, p.depth);
        const dx = p.driftAmp * Math.sin(frame / driftSpeed + p.driftPhase);
        const dy =
          p.driftAmp * 0.6 *
          Math.cos(frame / (driftSpeed * 1.3) + p.driftPhase);
        const opacity = interpolate(
          Math.sin(frame / p.twinkleSpeed + p.twinklePhase),
          [-1, 1],
          [0.1, 0.85],
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x + dx}%`,
              top: `${p.y + dy}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: opacity * (0.3 + p.depth * 0.7),
            }}
          />
        );
      })}
    </div>
  );
};

import { AbsoluteFill, useCurrentFrame } from "remotion";

type Props = {
  opacity?: number;
};

// Subtle film grain via SVG turbulence noise, animated by frame for "live" look.
export const Grain: React.FC<Props> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 8;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none", mixBlendMode: "overlay" }}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

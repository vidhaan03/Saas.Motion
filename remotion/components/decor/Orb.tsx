import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Position in % of parent. Anchored to centre of the orb.
  x: number;
  y: number;
  // Size in % of parent's shorter axis. 10 = small, 40 = hero.
  size: number;
  // Hex or CSS colour. The shading machine generates highlight + shadow
  // automatically by mixing this with white / black.
  color: string;
  // Drift radius in % units. 0 = static, 4 = noticeable float.
  drift?: number;
  // Phase offset so neighbouring orbs don't move in lockstep.
  phase?: number;
  // Layer depth multiplier. 0.4 = far/small/slow, 1.0 = front, 1.4 = huge.
  // Affects size + drift speed + blur. Lets you compose a depth field
  // by stacking orbs at different layers.
  layer?: number;
  // Override the "where the highlight sits" — defaults to top-left.
  highlightAngle?: { x: number; y: number };
};

// 3D-shaded sphere built from layered radial gradients + box-shadow.
// The illusion of depth comes from:
//   • Main radial gradient: bright top-left → mid → dark bottom-right
//   • Inset box-shadow at edges: rim shadow + faint top specular
//   • External drop shadow: shadow on the ground plane below the orb
//   • Inner specular dot: tiny bright spot for "wet" highlight
//
// All four lighting effects derive from one input colour, so the orb
// always reads as lit by the same light source regardless of tint.
export const Orb: React.FC<Props> = ({
  x,
  y,
  size,
  color,
  drift = 2.5,
  phase = 0,
  layer = 1,
  highlightAngle = { x: 28, y: 24 },
}) => {
  const frame = useCurrentFrame();

  // Slow drift speed scales inversely with layer depth — far orbs barely
  // move (parallax), close orbs sweep noticeably.
  const speed = 100 / Math.max(0.3, layer);
  const driftX = drift * Math.sin(frame / speed + phase);
  const driftY = drift * 0.7 * Math.cos(frame / (speed * 1.2) + phase);

  // Subtle scale pulse — life signal. Smaller orbs barely pulse.
  const pulse = interpolate(
    Math.sin(frame / 80 + phase * 1.7),
    [-1, 1],
    [0.97, 1.03],
  );

  const renderedSize = size * layer;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x + driftX}%`,
        top: `${y + driftY}%`,
        width: `${renderedSize}%`,
        aspectRatio: "1 / 1",
        transform: `translate(-50%, -50%) scale(${pulse})`,
        // Far orbs get blur for atmospheric perspective.
        filter: layer < 0.7 ? `blur(${(0.7 - layer) * 6}px)` : undefined,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          // Main shading gradient — highlight (color + white) at the lit
          // angle, base mid, dark side at opposite corner.
          background: `radial-gradient(circle at ${highlightAngle.x}% ${highlightAngle.y}%,
            color-mix(in srgb, ${color} 35%, #ffffff) 0%,
            color-mix(in srgb, ${color} 88%, #ffffff) 18%,
            ${color} 45%,
            color-mix(in srgb, ${color} 70%, #000000) 75%,
            color-mix(in srgb, ${color} 35%, #000000) 100%)`,
          boxShadow: [
            // Rim shadow on the dark side — keeps the 3D illusion.
            `inset -8% -8% 20% color-mix(in srgb, #000 50%, transparent)`,
            // Faint top rim light — also part of the shading.
            `inset 4% 4% 12% color-mix(in srgb, #fff 18%, transparent)`,
            // Subtle ground drop shadow only. No coloured outer glow.
            `0 ${renderedSize * 0.4}% ${renderedSize * 1.2}% color-mix(in srgb, #000 ${22 * layer}%, transparent)`,
          ].join(", "),
          position: "relative",
        }}
      >
        {/* Specular highlight — tiny bright dot for wet look. */}
        <div
          style={{
            position: "absolute",
            top: `${highlightAngle.y - 6}%`,
            left: `${highlightAngle.x - 6}%`,
            width: "22%",
            height: "16%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, transparent 70%)`,
            filter: "blur(2px)",
          }}
        />
      </div>
    </div>
  );
};

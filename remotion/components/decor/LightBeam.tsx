import { interpolate, useCurrentFrame } from "remotion";

type Props = {
  // Anchor point the beam emanates from, in % of parent.
  originX: number;
  originY: number;
  // Beam orientation in degrees (0 = up, 90 = right). The beam rotates
  // slowly around this base angle.
  baseAngle: number;
  // How far the slow rotation drifts, in degrees. 0 = static.
  sweep?: number;
  // Length as a multiple of parent's longest axis. 1.0 = full screen.
  length?: number;
  // Beam width at the tip, in degrees. Thinner = sharper.
  spreadDegrees?: number;
  // Brightness colour — tinted to brand or warm white.
  color: string;
  // Peak opacity at the brightest point of the gradient.
  intensity?: number;
  phase?: number;
};

// Volumetric god-ray. Rendered as a CSS conic gradient masked by a soft
// linear fade, then composited with `screen` blend so it reads as light
// rather than paint. Cheaper than SVG/canvas approaches and runs in pure
// CSS so Remotion can rasterise it without quirks.
export const LightBeam: React.FC<Props> = ({
  originX,
  originY,
  baseAngle,
  sweep = 4,
  length = 1.2,
  spreadDegrees = 14,
  color,
  intensity = 0.35,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  // Slow azimuth sweep around the base angle.
  const angle =
    baseAngle + sweep * Math.sin(frame / 140 + phase);
  // Subtle intensity pulse so the beam breathes.
  const pulse = interpolate(
    Math.sin(frame / 90 + phase * 0.7),
    [-1, 1],
    [0.82, 1.0],
  );

  const halfSpread = spreadDegrees / 2;
  // Conic gradient that fades from full colour at the centre angle to
  // transparent at the edges of the spread, then transparent everywhere
  // outside the wedge.
  const conic = `conic-gradient(from ${angle - 90 - halfSpread}deg at ${originX}% ${originY}%,
    transparent 0deg,
    color-mix(in srgb, ${color} ${Math.round(intensity * pulse * 100)}%, transparent) ${halfSpread}deg,
    color-mix(in srgb, ${color} ${Math.round(intensity * pulse * 100)}%, transparent) ${halfSpread}deg,
    transparent ${spreadDegrees}deg,
    transparent 360deg)`;
  // Soft radial mask so the beam fades with distance from origin —
  // bright near source, faded at the tip.
  const radialMask = `radial-gradient(ellipse ${length * 100}% ${length * 100}% at ${originX}% ${originY}%,
    rgba(0,0,0,1) 0%,
    rgba(0,0,0,0.7) 45%,
    rgba(0,0,0,0) 100%)`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: conic,
        mixBlendMode: "screen",
        pointerEvents: "none",
        // Mask thins toward the tip — `radial mask` applied via CSS mask
        // keeps the wedge sharp at source and softens it as it extends.
        WebkitMaskImage: radialMask,
        maskImage: radialMask,
      }}
    />
  );
};

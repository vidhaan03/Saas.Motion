import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Brand } from "../schema";

type Props = {
  brand: Brand;
  intensity?: "subtle" | "vivid";
};

// Animated blob mesh inspired by Sarvam / Stripe / Anthropic homepage hero
// backgrounds. Three slow-orbiting gaussian-blurred circles in brand colors.
// Adds ambient motion to scenes that would otherwise hold static during their
// content phase.
export const MotionBackground: React.FC<Props> = ({
  brand,
  intensity = "subtle",
}) => {
  const frame = useCurrentFrame();

  // Each blob orbits a different elliptical path, at different speeds, so they
  // never align — feels organic, not mechanical.
  const blobs = [
    {
      cx: 30 + 15 * Math.sin(frame / 60),
      cy: 25 + 10 * Math.cos(frame / 80),
      color: brand.color,
      size: 60,
      blur: 120,
    },
    {
      cx: 70 + 10 * Math.cos(frame / 55),
      cy: 55 + 12 * Math.sin(frame / 90),
      color: brand.accent,
      size: 55,
      blur: 140,
    },
    {
      cx: 20 + 18 * Math.sin(frame / 75),
      cy: 75 + 8 * Math.cos(frame / 65),
      color: brand.color,
      size: 50,
      blur: 160,
    },
  ];

  const baseOpacity = intensity === "vivid" ? 0.4 : 0.18;

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${b.cx - b.size / 2}%`,
            top: `${b.cy - b.size / 2}%`,
            width: `${b.size}%`,
            height: `${b.size}%`,
            borderRadius: "50%",
            background: b.color,
            filter: `blur(${b.blur}px)`,
            opacity: baseOpacity * (1 - i * 0.15),
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

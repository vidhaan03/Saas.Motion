import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Brand } from "../schema";
import { THEME, ease } from "../theme";
import { Grain } from "../components/Grain";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
});

type Feature = { title: string; body: string };

type Props = {
  heading: string;
  features: Feature[];
  brand: Brand;
  sceneIndex?: number;
};

export const FeatureGrid: React.FC<Props> = ({
  heading,
  features,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;
  const faint = isLight ? THEME.text.onLightFaint : THEME.text.onDarkFaint;
  const divider = isLight ? "rgba(10,10,12,0.08)" : "rgba(255,255,255,0.08)";

  const headingT = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  const exitT = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: bg, opacity: exitT }}>
      <AbsoluteFill
        style={{
          padding: `${THEME.padding.scene}px 96px`,
          display: "flex",
          flexDirection: "column",
          gap: 64,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.black,
            fontSize: THEME.size.title,
            letterSpacing: THEME.tracking.title,
            color: fg,
            lineHeight: 1.05,
            transform: `translateY(${interpolate(headingT, [0, 1], [20, 0])}px)`,
            opacity: headingT,
          }}
        >
          {heading}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {features.map((feature, idx) => {
            const rowT = interpolate(frame, [8 + idx * 6, 28 + idx * 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.expoOut,
            });
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 36,
                  padding: "32px 0",
                  borderTop: `1px solid ${divider}`,
                  ...(idx === features.length - 1
                    ? { borderBottom: `1px solid ${divider}` }
                    : {}),
                  transform: `translateX(${interpolate(rowT, [0, 1], [40, 0])}px)`,
                  opacity: rowT,
                }}
              >
                <div
                  style={{
                    fontFamily,
                    fontWeight: THEME.weight.medium,
                    fontSize: 22,
                    color: faint,
                    letterSpacing: THEME.tracking.label,
                    minWidth: 56,
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontFamily,
                    fontWeight: THEME.weight.black,
                    fontSize: 56,
                    color: fg,
                    letterSpacing: THEME.tracking.title,
                    lineHeight: 1.05,
                    minWidth: 260,
                  }}
                >
                  {feature.title}
                </div>
                <div
                  style={{
                    fontFamily,
                    fontWeight: THEME.weight.regular,
                    fontSize: 28,
                    color: muted,
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                >
                  {feature.body}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

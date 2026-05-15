import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Brand } from "../schema";
import { THEME, ease } from "../theme";
import { Grain } from "../components/Grain";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "900"],
  subsets: ["latin"],
});

type Props = {
  heading: string;
  logos: { name: string; color?: string; logoUrl?: string }[];
  brand: Brand;
  sceneIndex?: number;
};

export const LogoWall: React.FC<Props> = ({
  heading,
  logos,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;
  const divider = isLight ? "rgba(10,10,12,0.08)" : "rgba(255,255,255,0.08)";
  const logoTint = isLight ? "#0a0a0c" : "#ffffff";

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

  const columns = logos.length <= 4 ? 2 : 3;

  return (
    <AbsoluteFill style={{ background: bg, opacity: exitT }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 96px`,
          gap: 80,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.regular,
            fontSize: THEME.size.label,
            color: muted,
            letterSpacing: THEME.tracking.caption,
            textTransform: "uppercase",
            transform: `translateY(${interpolate(headingT, [0, 1], [12, 0])}px)`,
            opacity: headingT,
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "48px 64px",
            width: "100%",
            maxWidth: 880,
          }}
        >
          {logos.map((logo, idx) => {
            const enter = interpolate(
              frame,
              [10 + idx * 4, 30 + idx * 4],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease.expoOut,
              },
            );
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  opacity: enter * (isLight ? 0.85 : 0.78),
                  transform: `translateY(${interpolate(enter, [0, 1], [12, 0])}px)`,
                }}
              >
                {logo.logoUrl ? (
                  <Img
                    src={logo.logoUrl}
                    style={{
                      width: 34,
                      height: 34,
                      objectFit: "contain",
                      flexShrink: 0,
                      filter: isLight ? "none" : "brightness(0) invert(1)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      background: logoTint,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily,
                    fontWeight: THEME.weight.medium,
                    fontSize: 30,
                    color: fg,
                    letterSpacing: THEME.tracking.body,
                  }}
                >
                  {logo.name}
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

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

  // Stable monogram color per logo (hashed name → muted accent). Keeps the
  // fallback feeling intentional rather than random gray squares.
  const monogramTint = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    const palette = isLight
      ? ["#2D2A26", "#7A4631", "#3D5A4A", "#5C4A6E", "#6E5C2D", "#8B3A2E"]
      : ["#A4B0F5", "#22D3EE", "#F472B6", "#FCD34D", "#34D399", "#FB7185"];
    return palette[hash % palette.length];
  };

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
                {(() => {
                  const tint = monogramTint(logo.name);
                  const monogram = (logo.name?.[0] ?? "?").toUpperCase();
                  return (
                    <div
                      style={{
                        position: "relative",
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: isLight
                          ? "rgba(10,10,12,0.05)"
                          : "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontFamily,
                          fontWeight: 700,
                          fontSize: 24,
                          color: tint,
                          letterSpacing: "-0.02em",
                          lineHeight: 1,
                        }}
                      >
                        {monogram}
                      </div>
                      {logo.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo.logoUrl}
                          alt=""
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: 8,
                            filter: isLight ? "none" : "brightness(0) invert(1)",
                          }}
                          onError={(e) => {
                            // Hide on 404 so the monogram below stays visible.
                            (e.currentTarget as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })()}
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

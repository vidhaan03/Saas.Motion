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

type Props = {
  headline: string;
  subtext?: string;
  buttonLabel: string;
  url?: string;
  brand: Brand;
  sceneIndex?: number;
};

export const CTACard: React.FC<Props> = ({
  headline,
  subtext,
  buttonLabel,
  url,
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

  const headlineT = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  const subT = interpolate(frame, [14, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  const buttonT = interpolate(frame, [24, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  const urlT = interpolate(frame, [38, 56], [0, 1], {
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

  // Headline font auto-shrinks so the longest word fits the available width.
  // At weight-900 Inter, each glyph is roughly 0.55em wide; the side padding
  // is 96px on each edge, so usable content width = videoWidth - 192.
  const { width: videoWidth } = useVideoConfig();
  const contentWidth = Math.max(360, videoWidth - 2 * 96);
  const longestWord = headline
    .split(/\s+/)
    .reduce((a, b) => (a.length >= b.length ? a : b), "");
  const longestLen = Math.max(longestWord.length, 1);
  const maxFontByWord = (contentWidth * 0.92) / (longestLen * 0.55);
  // Also keep total headline reasonable for multi-line wrap (assume ~2 lines).
  const maxFontByTotal =
    (contentWidth * 2 * 0.92) / (Math.max(headline.length, 1) * 0.55);
  const headlineFontSize = Math.min(
    THEME.size.hero,
    maxFontByWord,
    maxFontByTotal,
  );

  return (
    <AbsoluteFill style={{ background: bg, opacity: exitT }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 96px`,
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.black,
            fontSize: headlineFontSize,
            lineHeight: 0.95,
            letterSpacing: THEME.tracking.hero,
            color: fg,
            textAlign: "center",
            maxWidth: contentWidth,
            wordBreak: "break-word",
            transform: `translateY(${interpolate(headlineT, [0, 1], [24, 0])}px)`,
            opacity: headlineT,
          }}
        >
          {headline}
        </div>
        {subtext ? (
          <div
            style={{
              fontFamily,
              fontWeight: THEME.weight.regular,
              fontSize: 32,
              lineHeight: 1.3,
              color: muted,
              textAlign: "center",
              maxWidth: 720,
              transform: `translateY(${interpolate(subT, [0, 1], [16, 0])}px)`,
              opacity: subT,
            }}
          >
            {subtext}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 24,
            background: brand.accent,
            color: isLight ? "#0a0a0c" : "#0a0a0c",
            fontFamily,
            fontWeight: THEME.weight.medium,
            fontSize: 30,
            padding: "20px 44px",
            borderRadius: 999,
            letterSpacing: "0",
            transform: `translateY(${interpolate(buttonT, [0, 1], [16, 0])}px)`,
            opacity: buttonT,
          }}
        >
          {buttonLabel}
        </div>
        {url ? (
          <div
            style={{
              fontFamily,
              fontWeight: THEME.weight.regular,
              fontSize: 22,
              color: faint,
              letterSpacing: THEME.tracking.caption,
              textTransform: "uppercase",
              transform: `translateY(${interpolate(urlT, [0, 1], [10, 0])}px)`,
              opacity: urlT,
            }}
          >
            {url}
          </div>
        ) : null}
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Brand, DecorElement } from "../schema";
import { resolveTypeface } from "../fonts";
import { resolveVibe } from "../vibes";
import { THEME, productionTextStyle } from "../theme";
import { ProductionBackdrop } from "../components/ProductionBackdrop";

type Props = {
  headline: string;
  subtext?: string;
  buttonLabel: string;
  url?: string;
  brand: Brand;
  sceneIndex?: number;
  decor?: DecorElement[];
};

export const CTACard: React.FC<Props> = ({
  headline,
  subtext,
  buttonLabel,
  url,
  brand,
  sceneIndex = 0,
  decor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const themeMode: "dark" | "light" = isLight ? "light" : "dark";
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;
  const faint = isLight ? THEME.text.onLightFaint : THEME.text.onDarkFaint;
  const vibe = resolveVibe(brand.vibe);
  const { family: fontFamily } = resolveTypeface(
    undefined,
    brand.typeface ?? vibe.typefaceBias,
  );

  const headlineTextStyle = productionTextStyle(
    fg,
    brand.accent,
    "hero",
    themeMode,
  );
  const subtextTextStyle = productionTextStyle(
    muted,
    brand.accent,
    "body",
    themeMode,
  );

  const headlineT = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: vibe.easeEntrance,
  });
  const subT = interpolate(frame, [14, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: vibe.easeEntrance,
  });
  const buttonT = interpolate(frame, [24, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: vibe.easeEntrance,
  });
  const urlT = interpolate(frame, [38, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: vibe.easeEntrance,
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

  const backdropIntensity: "quiet" | "balanced" | "rich" =
    vibe.intensity < 0.85 ? "quiet" : vibe.intensity > 1.2 ? "rich" : "balanced";

  return (
    <AbsoluteFill style={{ opacity: exitT }}>
      <ProductionBackdrop
        brand={brand}
        theme={themeMode}
        intensity={backdropIntensity}
        decorSeed={sceneIndex}
        decor={decor}
      >
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
              textAlign: "center",
              maxWidth: contentWidth,
              wordBreak: "break-word",
              transform: `translateY(${interpolate(headlineT, [0, 1], [24, 0])}px)`,
              opacity: headlineT,
              ...headlineTextStyle,
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
                textAlign: "center",
                maxWidth: 720,
                transform: `translateY(${interpolate(subT, [0, 1], [16, 0])}px)`,
                opacity: subT,
                ...subtextTextStyle,
              }}
            >
              {subtext}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 24,
              background: brand.accent,
              color: "#0a0a0c",
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
      </ProductionBackdrop>
    </AbsoluteFill>
  );
};

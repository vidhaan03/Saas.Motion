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
  quote: string;
  author: string;
  role?: string;
  company?: string;
  brand: Brand;
  sceneIndex?: number;
};

export const TestimonialQuote: React.FC<Props> = ({
  quote,
  author,
  role,
  company,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const faint = isLight ? THEME.text.onLightFaint : THEME.text.onDarkFaint;

  // Ken-Burns drift on background
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });

  // Accent line scales in first
  const lineT = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });

  // Author block comes in after the quote fully reveals
  const words = quote.split(/\s+/);
  const wordRevealStart = 8;
  const wordStaggerFrames = 3;
  const wordFadeFrames = 10;
  const lastWordEnd =
    wordRevealStart + words.length * wordStaggerFrames + wordFadeFrames;
  const authorT = interpolate(frame, [lastWordEnd, lastWordEnd + 18], [0, 1], {
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
    <AbsoluteFill
      style={{
        background: bg,
        opacity: exitT,
        transform: `scale(${bgScale})`,
        transformOrigin: "center center",
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 100px`,
          gap: 56,
        }}
      >
        <div
          style={{
            width: 60,
            height: 2,
            background: brand.accent,
            transform: `scaleX(${lineT})`,
            transformOrigin: "left",
          }}
        />
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.medium,
            fontSize: THEME.size.title,
            lineHeight: 1.15,
            letterSpacing: THEME.tracking.title,
            color: fg,
            maxWidth: 900,
            display: "flex",
            flexWrap: "wrap",
            gap: "0 0.28em",
          }}
        >
          {words.map((w, i) => {
            const start = wordRevealStart + i * wordStaggerFrames;
            const t = interpolate(frame, [start, start + wordFadeFrames], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.expoOut,
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: t,
                  transform: `translateY(${interpolate(t, [0, 1], [14, 0])}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transform: `translateY(${interpolate(authorT, [0, 1], [14, 0])}px)`,
            opacity: authorT,
          }}
        >
          <div
            style={{
              fontFamily,
              fontWeight: THEME.weight.medium,
              fontSize: THEME.size.body,
              color: fg,
              letterSpacing: "0",
            }}
          >
            {author}
          </div>
          {role || company ? (
            <div
              style={{
                fontFamily,
                fontWeight: THEME.weight.regular,
                fontSize: THEME.size.caption,
                color: faint,
                letterSpacing: THEME.tracking.caption,
                textTransform: "uppercase",
              }}
            >
              {[role, company].filter(Boolean).join(" — ")}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

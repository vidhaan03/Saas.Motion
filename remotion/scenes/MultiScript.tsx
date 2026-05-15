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

const { fontFamily: interFont } = loadFont("normal", {
  weights: ["300", "400", "500", "900"],
  subsets: ["latin"],
});

// Browser-native font stack with Indic fallbacks. On Mac/most desktop OSes the
// system has fonts that render Devanagari/Tamil/Bengali. For MP4 render parity
// across machines, we'd want to load Noto Sans Devanagari/Tamil/Bengali via
// @remotion/fonts and Google Fonts CDN — TODO for production render path.
const GLYPH_FONT_STACK = `${interFont}, "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Bengali", system-ui, sans-serif`;

type Props = {
  glyphs: { char: string; script?: string }[];
  caption?: string;
  brand: Brand;
  sceneIndex?: number;
};

// Each glyph holds for `slot` frames, with `cross` frames of crossfade overlap.
// Resulting per-glyph beat: ~24-36 frames depending on total scene duration.
export const MultiScript: React.FC<Props> = ({
  glyphs,
  caption,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;

  const cross = 12;
  const slot = Math.max(
    18,
    Math.floor((durationInFrames - 24) / glyphs.length),
  );

  // Subtle background drift
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });

  const exitT = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: bg,
        transform: `scale(${bgScale})`,
        transformOrigin: "center center",
        opacity: exitT,
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 80px`,
          gap: 64,
        }}
      >
        {/* Stacked glyphs — each one fades through during its slot */}
        <div
          style={{
            position: "relative",
            width: 480,
            height: 480,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {glyphs.map((g, idx) => {
            const start = idx * slot;
            const fullIn = start + cross;
            const fadeOut = start + slot;
            const fullOut = fadeOut + cross;

            const opacity = interpolate(
              frame,
              [start, fullIn, fadeOut, fullOut],
              [0, 1, 1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease.expoOut,
              },
            );

            // Subtle scale breath: 98 → 102 → 100 during its slot
            const t = interpolate(frame, [start, fullOut], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const scale = 0.98 + Math.sin(t * Math.PI) * 0.04;

            // Held glyph (between fullIn and fadeOut) anchored at 1.0
            const isHeld = frame >= fullIn && frame <= fadeOut;
            const finalScale = isHeld ? 1 + Math.sin(t * Math.PI) * 0.02 : scale;

            return (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  fontFamily: GLYPH_FONT_STACK,
                  fontWeight: 900,
                  fontSize: 360,
                  lineHeight: 1,
                  color: fg,
                  opacity,
                  transform: `scale(${finalScale})`,
                  letterSpacing: "-0.04em",
                }}
              >
                {g.char}
              </div>
            );
          })}
        </div>

        {/* Saffron divider that scales in over the first glyph */}
        <div
          style={{
            width: 80,
            height: 2,
            background: brand.accent,
            transform: `scaleX(${interpolate(frame, [4, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.expoOut,
            })})`,
            transformOrigin: "center",
          }}
        />

        {caption ? (
          <div
            style={{
              fontFamily: interFont,
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: muted,
              textAlign: "center",
              opacity: interpolate(frame, [18, 36], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {caption}
          </div>
        ) : null}
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

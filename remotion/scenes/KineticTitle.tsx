import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Brand, KineticTitleVariant } from "../schema";
import { THEME, ease } from "../theme";
import { Grain } from "../components/Grain";
import { MotionBackground } from "../components/MotionBackground";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "900"],
  subsets: ["latin"],
});

type Props = {
  lines: string[];
  emoji?: string;
  brand: Brand;
  sceneIndex?: number;
  variant?: KineticTitleVariant;
};

// Canvas: 1080px wide. Horizontal padding: 96px each side → 888px usable.
// Inter Black at -0.05em letter-spacing averages ~0.55× font-size per character
// (wide letters like M/W push 0.7-0.85×). 10% safety margin so wide-letter
// words like "Extraordinarily" still fit.
const fontSizeForLines = (lines: string[]): number => {
  const longest = Math.max(...lines.map((l) => l.length), 1);
  if (longest <= 5) return 220;
  if (longest <= 8) return 168;
  if (longest <= 11) return 126;
  if (longest <= 14) return 102;
  if (longest <= 17) return 86;
  if (longest <= 21) return 72;
  if (longest <= 26) return 58;
  if (longest <= 34) return 46;
  return 36;
};

// VARIANT 1: mask reveal — text slides up from behind invisible line
const MaskLine: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  color: string;
  size: number;
}> = ({ text, frame, startFrame, color, size }) => {
  const t = interpolate(frame - startFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  return (
    <div style={{ overflow: "hidden", lineHeight: 0.95, padding: "0.06em 0" }}>
      <div
        style={{
          fontFamily,
          fontWeight: THEME.weight.black,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: THEME.tracking.hero,
          color,
          textAlign: "center",
          whiteSpace: "nowrap",
          transform: `translateY(${interpolate(t, [0, 1], [100, 0])}%)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// VARIANT 2: typewriter — characters appear one at a time
const TypeLine: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  color: string;
  size: number;
}> = ({ text, frame, startFrame, color, size }) => {
  const charsToShow = Math.max(
    0,
    Math.min(text.length, Math.floor((frame - startFrame) / 1.6)),
  );
  return (
    <div
      style={{
        fontFamily,
        fontWeight: THEME.weight.black,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: THEME.tracking.hero,
        color,
        textAlign: "center",
        whiteSpace: "nowrap",
        opacity: frame >= startFrame ? 1 : 0,
      }}
    >
      {text.slice(0, charsToShow)}
      <span
        style={{
          opacity:
            charsToShow < text.length && Math.floor(frame / 5) % 2 === 0
              ? 1
              : 0,
          marginLeft: "0.05em",
        }}
      >
        ▌
      </span>
    </div>
  );
};

// VARIANT 3: scale pop — text scales from 0.2 to 1 with overshoot
const ScaleLine: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  color: string;
  size: number;
}> = ({ text, frame, startFrame, color, size }) => {
  const t = interpolate(frame - startFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });
  const scale = interpolate(t, [0, 0.65, 1], [0.4, 1.05, 1]);
  const opacity = interpolate(t, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        fontFamily,
        fontWeight: THEME.weight.black,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: THEME.tracking.hero,
        color,
        textAlign: "center",
        whiteSpace: "nowrap",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {text}
    </div>
  );
};

// VARIANT 4: split — each word slides in from alternating directions
const SplitLine: React.FC<{
  text: string;
  frame: number;
  startFrame: number;
  color: string;
  size: number;
}> = ({ text, frame, startFrame, color, size }) => {
  const words = text.split(/\s+/);
  return (
    <div
      style={{
        fontFamily,
        fontWeight: THEME.weight.black,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: THEME.tracking.hero,
        color,
        textAlign: "center",
        whiteSpace: "nowrap",
        display: "flex",
        justifyContent: "center",
        gap: "0.3em",
      }}
    >
      {words.map((w, i) => {
        const wStart = startFrame + i * 4;
        const t = interpolate(frame, [wStart, wStart + 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease.expoOut,
        });
        const dir = i % 2 === 0 ? -1 : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateX(${interpolate(t, [0, 1], [80 * dir, 0])}px)`,
              opacity: t,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const KineticTitle: React.FC<Props> = ({
  lines,
  emoji,
  brand,
  sceneIndex = 0,
  variant = "mask",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.04], {
    extrapolateRight: "clamp",
  });
  const size = fontSizeForLines(lines);

  const LineComponent =
    variant === "typewriter"
      ? TypeLine
      : variant === "scale"
        ? ScaleLine
        : variant === "split"
          ? SplitLine
          : MaskLine;

  return (
    <AbsoluteFill
      style={{
        background: bg,
        transform: `scale(${bgScale})`,
        transformOrigin: "center center",
      }}
    >
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 96px`,
          gap: 6,
        }}
      >
        {lines.map((line, idx) => (
          <LineComponent
            key={idx}
            text={line}
            frame={frame}
            startFrame={idx * 6}
            color={fg}
            size={size}
          />
        ))}
        {emoji ? (
          <div
            style={{
              fontSize: 88,
              marginTop: 32,
              opacity: interpolate(
                frame,
                [lines.length * 6 + 14, lines.length * 6 + 30],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
            }}
          >
            {emoji}
          </div>
        ) : null}
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

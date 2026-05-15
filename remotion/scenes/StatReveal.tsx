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
  value: string;
  label: string;
  suffix?: string;
  brand: Brand;
  sceneIndex?: number;
};

const parseNumeric = (value: string) => {
  const match = value.replace(/,/g, "").match(/^-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  if (!Number.isFinite(num)) return null;
  return {
    num,
    prefix: value.slice(0, match.index ?? 0),
    suffix: value.slice((match.index ?? 0) + match[0].length),
  };
};

const formatNumber = (n: number, target: number) => {
  const hasDecimal = String(target).includes(".");
  if (hasDecimal) {
    const decimals = String(target).split(".")[1].length;
    return n.toFixed(decimals);
  }
  return Math.round(n).toLocaleString("en-US");
};

export const StatReveal: React.FC<Props> = ({
  value,
  label,
  suffix,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const bg = isLight ? THEME.bg.light : THEME.bg.dark;
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;

  const parsed = parseNumeric(value);
  const countT = interpolate(
    frame,
    [0, Math.min(38, durationInFrames - 6)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease.expoOut,
    },
  );

  const displayValue = parsed
    ? `${parsed.prefix}${formatNumber(parsed.num * countT, parsed.num)}${parsed.suffix}`
    : value;

  const labelT = interpolate(frame, [14, 34], [0, 1], {
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

  // Value font shrinks to fit the canvas. "9,998,572+" at 220px is already
  // ~1090px wide — anything longer (10-digit value, multiple commas) clips.
  // Side padding is 80px each edge, so usable content width = videoWidth-160.
  const { width: videoWidth } = useVideoConfig();
  const contentWidth = Math.max(360, videoWidth - 2 * 80);
  // Approximate display string (post-formatting) so the size doesn't jitter
  // as countT animates from 0 → 1. Use the final-state value for measuring.
  const measureString = parsed
    ? `${parsed.prefix}${formatNumber(parsed.num, parsed.num)}${parsed.suffix}${suffix ?? ""}`
    : value + (suffix ?? "");
  // Inter weight-900 numerals are ~0.55em wide.
  const valueFontSize = Math.min(
    THEME.size.hero,
    (contentWidth * 0.92) / (Math.max(measureString.length, 1) * 0.55),
  );
  const suffixFontSize = Math.round(valueFontSize * 0.5);

  return (
    <AbsoluteFill style={{ background: bg, opacity: exitT }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 80px`,
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.black,
            fontSize: valueFontSize,
            letterSpacing: THEME.tracking.hero,
            color: brand.accent,
            lineHeight: 1,
            display: "flex",
            alignItems: "baseline",
            transform: `translateY(${interpolate(countT, [0, 1], [20, 0])}px)`,
            opacity: countT,
          }}
        >
          {displayValue}
          {suffix ? (
            <span
              style={{
                fontSize: suffixFontSize,
                marginLeft: 6,
                opacity: 0.9,
              }}
            >
              {suffix}
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontFamily,
            fontWeight: THEME.weight.medium,
            fontSize: THEME.size.body,
            letterSpacing: THEME.tracking.label,
            textTransform: "uppercase",
            color: muted,
            textAlign: "center",
            maxWidth: contentWidth,
            transform: `translateY(${interpolate(labelT, [0, 1], [12, 0])}px)`,
            opacity: labelT,
          }}
        >
          {label}
        </div>
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

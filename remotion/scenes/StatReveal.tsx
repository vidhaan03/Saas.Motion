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
  value: string;
  label: string;
  suffix?: string;
  brand: Brand;
  sceneIndex?: number;
  decor?: DecorElement[];
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
  decor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const isLight = sceneIndex % 2 === 1;
  const themeMode: "dark" | "light" = isLight ? "light" : "dark";
  const muted = isLight ? THEME.text.onLightMuted : THEME.text.onDarkMuted;
  const vibe = resolveVibe(brand.vibe);
  const { family: fontFamily } = resolveTypeface(
    undefined,
    brand.typeface ?? vibe.typefaceBias,
  );

  // Value gets gradient + glow (hero treatment) in accent colour. Label
  // gets glow only (body treatment) in muted colour.
  const valueTextStyle = productionTextStyle(
    brand.accent,
    brand.accent,
    "hero",
    themeMode,
  );
  const labelTextStyle = productionTextStyle(
    muted,
    brand.accent,
    "body",
    themeMode,
  );

  const parsed = parseNumeric(value);
  const countT = interpolate(
    frame,
    [0, Math.min(38, durationInFrames - 6)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: vibe.easeEntrance,
    },
  );

  const displayValue = parsed
    ? `${parsed.prefix}${formatNumber(parsed.num * countT, parsed.num)}${parsed.suffix}`
    : value;

  const labelT = interpolate(frame, [14, 34], [0, 1], {
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
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              transform: `translateY(${interpolate(countT, [0, 1], [20, 0])}px)`,
              opacity: countT,
              ...valueTextStyle,
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
              textAlign: "center",
              maxWidth: contentWidth,
              transform: `translateY(${interpolate(labelT, [0, 1], [12, 0])}px)`,
              opacity: labelT,
              ...labelTextStyle,
            }}
          >
            {label}
          </div>
        </AbsoluteFill>
      </ProductionBackdrop>
    </AbsoluteFill>
  );
};

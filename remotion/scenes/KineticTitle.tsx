import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Brand, DecorElement, KineticTitleVariant } from "../schema";
import { resolveTypeface } from "../fonts";
import { resolveVibe } from "../vibes";
import { THEME, productionTextStyle } from "../theme";
import { ProductionBackdrop } from "../components/ProductionBackdrop";
import {
  breathing,
  cinematicEntrance,
  entranceTransform,
  type EntranceCharacter,
} from "../motion";

type Props = {
  lines: string[];
  emoji?: string;
  brand: Brand;
  sceneIndex?: number;
  variant?: KineticTitleVariant;
  accentWord?: string;
  decor?: DecorElement[];
};

// Empty-string accentWord means "no highlight" (user explicitly disabled it).
// Undefined means "auto: pick the longest word ≥4 chars across all lines".
const resolveAccentWord = (
  explicit: string | undefined,
  lines: string[],
): string | null => {
  if (explicit === "") return null;
  if (explicit && explicit.trim()) return explicit.trim();
  const words = lines
    .flatMap((l) => l.split(/\s+/))
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length >= 4);
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
};

const escapeForRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Returns the set of character indices in `text` that fall inside a match
// of `accentWord` (word-boundary, case-insensitive).
const buildAccentMask = (
  text: string,
  accentWord: string | null,
): Set<number> => {
  const mask = new Set<number>();
  if (!accentWord) return mask;
  try {
    const re = new RegExp(`\\b${escapeForRegex(accentWord)}\\b`, "gi");
    for (let m: RegExpExecArray | null; (m = re.exec(text)) !== null; ) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      for (let i = 0; i < m[0].length; i++) mask.add(m.index + i);
    }
  } catch {
    // Bad regex (shouldn't happen — we escape). Fall through to empty mask.
  }
  return mask;
};

// Renders `text`, painting characters in `mask` with `accentColor` while
// the rest inherit the parent color. Coalesces runs of same-class chars
// into single spans so the DOM stays light.
// Accent spans need to reset both `color` and the gradient-fill trickery
// that productionTextStyle applies to the parent. Without these, accent
// words inherit transparent fill and disappear inside hero text.
const ACCENT_RESET: React.CSSProperties = {
  WebkitTextFillColor: "currentColor",
  backgroundImage: "none",
  WebkitBackgroundClip: "border-box",
  backgroundClip: "border-box",
};

const renderWithAccent = (
  text: string,
  mask: Set<number>,
  accentColor: string,
): React.ReactNode => {
  if (mask.size === 0) return text;
  const out: React.ReactNode[] = [];
  let buf = "";
  let bufAccent = mask.has(0);
  let nextKey = 0;
  const flush = (isAccent: boolean) => {
    if (!buf) return;
    out.push(
      isAccent ? (
        <span
          key={nextKey++}
          style={{ color: accentColor, ...ACCENT_RESET }}
        >
          {buf}
        </span>
      ) : (
        buf
      ),
    );
    buf = "";
  };
  for (let i = 0; i < text.length; i++) {
    const isAccent = mask.has(i);
    if (isAccent !== bufAccent) {
      flush(bufAccent);
      bufAccent = isAccent;
    }
    buf += text[i];
  }
  flush(bufAccent);
  return <>{out}</>;
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

type LineProps = {
  text: string;
  frame: number;
  startFrame: number;
  color: string;
  size: number;
  fontFamily: string;
  accentMask: Set<number>;
  accentColor: string;
  // Vibe-driven motion tokens
  easeEntrance: (input: number) => number;
  intensity: number;
  // Production text treatment (gradient + glow). Variants spread this
  // into their text element; accent spans break out via renderWithAccent.
  textStyle: React.CSSProperties;
};

// VARIANT 1: mask reveal — text slides up from behind invisible line
const MaskLine: React.FC<LineProps> = ({
  text,
  frame,
  startFrame,
  color,
  size,
  fontFamily,
  accentMask,
  accentColor,
  easeEntrance,
  intensity,
  textStyle,
}) => {
  const t = interpolate(frame - startFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeEntrance,
  });
  // Intensity scales how far below the line text starts. Higher = more
  // dramatic reveal. Clamp at 100% so the text doesn't disappear entirely
  // for low intensities.
  const startOffset = Math.min(100, 100 * intensity);
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
          transform: `translateY(${interpolate(t, [0, 1], [startOffset, 0])}%)`,
          ...textStyle,
        }}
      >
        {renderWithAccent(text, accentMask, accentColor)}
      </div>
    </div>
  );
};

// VARIANT 2: typewriter — characters appear one at a time
const TypeLine: React.FC<LineProps> = ({
  text,
  frame,
  startFrame,
  color,
  size,
  fontFamily,
  accentMask,
  accentColor,
  intensity,
  textStyle,
}) => {
  // Higher intensity = faster type. Baseline is 1.6 frames per char.
  const framesPerChar = Math.max(0.4, 1.6 / intensity);
  const charsToShow = Math.max(
    0,
    Math.min(text.length, Math.floor((frame - startFrame) / framesPerChar)),
  );
  const visibleText = text.slice(0, charsToShow);
  // accentMask uses indices from the full text; slicing preserves them.
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
        ...textStyle,
      }}
    >
      {renderWithAccent(visibleText, accentMask, accentColor)}
      <span
        style={{
          opacity:
            charsToShow < text.length && Math.floor(frame / 5) % 2 === 0
              ? 1
              : 0,
          marginLeft: "0.05em",
          ...ACCENT_RESET,
          color,
        }}
      >
        ▌
      </span>
    </div>
  );
};

// VARIANT 3: scale pop — text scales from 0.2 to 1 with overshoot
const ScaleLine: React.FC<LineProps> = ({
  text,
  frame,
  startFrame,
  color,
  size,
  fontFamily,
  accentMask,
  accentColor,
  easeEntrance,
  intensity,
  textStyle,
}) => {
  const t = interpolate(frame - startFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeEntrance,
  });
  // Lower start scale + bigger overshoot for higher intensity.
  const startScale = Math.max(0.05, 0.4 - (intensity - 1) * 0.3);
  const overshoot = 1 + 0.05 * intensity;
  const scale = interpolate(t, [0, 0.65, 1], [startScale, overshoot, 1]);
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
        ...textStyle,
      }}
    >
      {renderWithAccent(text, accentMask, accentColor)}
    </div>
  );
};

// VARIANT 4: split — each word slides in from alternating directions
const SplitLine: React.FC<LineProps> = ({
  text,
  frame,
  startFrame,
  color,
  size,
  fontFamily,
  accentMask,
  accentColor,
  easeEntrance,
  intensity,
  textStyle,
}) => {
  // Build (word, startIndex) pairs so we can hit-test each word against
  // accentMask without recomputing offsets.
  const words: { text: string; start: number }[] = [];
  {
    const re = /\S+/g;
    for (let m: RegExpExecArray | null; (m = re.exec(text)) !== null; ) {
      words.push({ text: m[0], start: m.index });
    }
  }
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
        ...textStyle,
      }}
    >
      {words.map((w, i) => {
        const wStart = startFrame + i * 4;
        const t = interpolate(frame, [wStart, wStart + 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeEntrance,
        });
        const dir = i % 2 === 0 ? -1 : 1;
        // Slide distance scales with intensity — subtle drift for minimal,
        // dramatic sweep for energetic/bold.
        const slidePx = 80 * intensity;
        const wordIsAccent =
          accentMask.size > 0 &&
          [...Array(w.text.length).keys()].some((j) =>
            accentMask.has(w.start + j),
          );
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateX(${interpolate(t, [0, 1], [slidePx * dir, 0])}px)`,
              opacity: t,
              // Words that aren't accent inherit the gradient fill from the
              // parent (textStyle). Accent words need the reset so their
              // own color shows instead of the parent's transparent fill.
              ...(wordIsAccent
                ? { color: accentColor, ...ACCENT_RESET }
                : null),
            }}
          >
            {w.text}
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
  accentWord,
  decor,
}) => {
  const frame = useCurrentFrame();

  const isLight = sceneIndex % 2 === 1;
  const themeMode: "dark" | "light" = isLight ? "light" : "dark";
  const fg = isLight ? THEME.text.onLight : THEME.text.onDark;
  const size = fontSizeForLines(lines);

  const resolvedAccent = resolveAccentWord(accentWord, lines);
  const accentColor = brand.accent;
  const vibe = resolveVibe(brand.vibe);
  // Vibe intensity selects the entrance character. <0.85 = "considered"
  // (slow, long fades; minimal/editorial), >1.2 = "punchy" (short fades,
  // heavy overshoot; energetic/bold), else "soft" (default middle).
  const entranceCharacter: EntranceCharacter =
    vibe.intensity < 0.85
      ? "considered"
      : vibe.intensity > 1.2
        ? "punchy"
        : "soft";
  // Brand typeface takes priority over vibe's typeface bias.
  const { family: fontFamily } = resolveTypeface(
    undefined,
    brand.typeface ?? vibe.typefaceBias,
  );

  // Production text treatment — gradient fill + soft accent shadow. Each
  // variant spreads this into its text element. Accent-word spans break
  // out via renderWithAccent's own reset.
  const heroTextStyle = productionTextStyle(
    fg,
    accentColor,
    "hero",
    themeMode,
  );

  // Backdrop intensity rides the vibe — quiet vibes get less bloom, loud
  // vibes get more. Mapped against the three richness levels.
  const backdropIntensity: "quiet" | "balanced" | "rich" =
    vibe.intensity < 0.85 ? "quiet" : vibe.intensity > 1.2 ? "rich" : "balanced";

  const LineComponent =
    variant === "typewriter"
      ? TypeLine
      : variant === "scale"
        ? ScaleLine
        : variant === "split"
          ? SplitLine
          : MaskLine;

  return (
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
          gap: 6,
        }}
      >
        {lines.map((line, idx) => {
          // Outer wrap: continuous breathing + cinematic scale layer.
          // The variant's own animation runs underneath; this adds the
          // sub-frame motion and exposure-style polish on top.
          const startFrame = idx * 6;
          const entrance = cinematicEntrance(
            frame,
            startFrame,
            entranceCharacter,
          );
          const breath = breathing(frame, idx * 0.4);
          return (
            <div
              key={idx}
              style={{
                transform: `scale(${entrance.scale * breath})`,
                transformOrigin: "center",
                opacity: entrance.opacity,
              }}
            >
              <LineComponent
                text={line}
                frame={frame}
                startFrame={startFrame}
                color={fg}
                size={size}
                fontFamily={fontFamily}
                accentMask={buildAccentMask(line, resolvedAccent)}
                accentColor={accentColor}
                easeEntrance={vibe.easeEntrance}
                intensity={vibe.intensity}
                textStyle={heroTextStyle}
              />
            </div>
          );
        })}
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
    </ProductionBackdrop>
  );
};

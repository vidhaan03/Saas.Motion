import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type {
  Brand,
  UiShowcaseAnimation,
  UiShowcaseDirection,
  UiShowcaseFrame,
  UiShowcaseLayout,
  UiShowcaseMode,
  UiShowcaseTransition,
} from "../schema";
import { THEME, ease } from "../theme";
import { Grain } from "../components/Grain";
import { MotionBackground } from "../components/MotionBackground";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "700", "900"],
  subsets: ["latin"],
});

type ShotPan = {
  from: { x: number; y: number; scale: number };
  to: { x: number; y: number; scale: number };
};
type ShotSpotlight = {
  x: number;
  y: number;
  w: number;
  h: number;
  intensity?: number;
  appearAt?: number;
};
type ShotAnnotation = {
  x: number;
  y: number;
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  appearAt?: number;
  color?: string;
};
type ShotCursorAction = {
  at: number;
  type: "move" | "click" | "zoom";
  x: number;
  y: number;
  label?: string;
  scale?: number;
};
type ShotCursor = {
  actions: ShotCursorAction[];
};

type Shot = {
  url: string;
  label?: string;
  frame?: UiShowcaseFrame;
  transitionIn?: UiShowcaseTransition;
  mediaType?: "image" | "video";
  shotCaption?: string;
  zoom?: { x: number; y: number; scale: number };
  pan?: ShotPan;
  framePosition?: { x: number; y: number; scale: number };
  spotlight?: ShotSpotlight;
  annotations?: ShotAnnotation[];
  cursor?: ShotCursor;
  weight?: number;
};

type Props = {
  screenshots?: Shot[];
  // Legacy fields
  screenshot?: string;
  frame?: UiShowcaseFrame;
  layout?: UiShowcaseLayout;
  direction?: UiShowcaseDirection;
  animation?: UiShowcaseAnimation;
  mode?: UiShowcaseMode;
  caption?: string;
  url?: string;
  brand: Brand;
  sceneIndex?: number;
};

// ───────── Frame chrome components ─────────

const BrowserFrame: React.FC<{
  children: React.ReactNode;
  url?: string;
  isLight: boolean;
}> = ({ children, url, isLight }) => {
  const chromeBg = isLight ? "#F1ECE2" : "#1A1A1E";
  const chromeBorder = isLight ? "#D4CCBC" : "rgba(255,255,255,0.08)";
  const urlBg = isLight ? "#FAF6EE" : "#0E0E12";
  const urlText = isLight ? "#6B655C" : "rgba(255,255,255,0.55)";
  return (
    <div
      style={{
        width: "100%",
        background: chromeBg,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${chromeBorder}`,
        boxShadow: "0 50px 100px -30px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          borderBottom: `1px solid ${chromeBorder}`,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div
              key={c}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: urlBg,
            borderRadius: 6,
            padding: "8px 14px",
            fontFamily,
            fontSize: 16,
            color: urlText,
            letterSpacing: "0.01em",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ opacity: 0.5 }}>🔒</span>
          {url ?? "your-product.com"}
        </div>
      </div>
      <div style={{ position: "relative", background: "#000" }}>{children}</div>
    </div>
  );
};

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: 380,
      padding: 14,
      borderRadius: 56,
      background: "linear-gradient(180deg, #0a0a0c 0%, #1c1c20 100%)",
      boxShadow:
        "0 50px 100px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
      position: "relative",
    }}
  >
    <div
      style={{
        position: "absolute",
        right: -3,
        top: 130,
        width: 4,
        height: 80,
        background: "#1a1a1e",
        borderRadius: "0 4px 4px 0",
      }}
    />
    <div
      style={{
        position: "relative",
        borderRadius: 44,
        overflow: "hidden",
        background: "#000",
        aspectRatio: "9 / 19.5",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 32,
          background: "#000",
          borderRadius: 20,
          zIndex: 10,
        }}
      />
    </div>
  </div>
);

const TabletFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: 18,
      borderRadius: 36,
      background: "linear-gradient(180deg, #0a0a0c 0%, #1c1c20 100%)",
      boxShadow:
        "0 50px 100px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
    }}
  >
    <div
      style={{
        borderRadius: 22,
        overflow: "hidden",
        background: "#000",
        aspectRatio: "4 / 3",
      }}
    >
      {children}
    </div>
  </div>
);

const FramedShot: React.FC<{
  shot: Shot;
  defaultFrame: UiShowcaseFrame;
  url?: string;
  isLight: boolean;
  inner: React.ReactNode;
}> = ({ shot, defaultFrame, url, isLight, inner }) => {
  const f = shot.frame ?? defaultFrame;
  if (f === "browser") {
    return (
      <BrowserFrame url={url} isLight={isLight}>
        <div style={{ aspectRatio: "16 / 10" }}>{inner}</div>
      </BrowserFrame>
    );
  }
  if (f === "phone") return <PhoneFrame>{inner}</PhoneFrame>;
  if (f === "tablet") return <TabletFrame>{inner}</TabletFrame>;
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 50px 100px -30px rgba(0,0,0,0.4)",
      }}
    >
      {inner}
    </div>
  );
};

// ───────── Compute per-shot segments based on weights ─────────

const segmentsFor = (shots: Shot[], totalFrames: number) => {
  if (shots.length === 0) return [];
  const weights = shots.map((s) => s.weight ?? 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const sizes = weights.map((w) => Math.floor((w / sum) * totalFrames));
  // Distribute rounding error to last segment
  const used = sizes.reduce((a, b) => a + b, 0);
  if (used < totalFrames && sizes.length > 0) {
    sizes[sizes.length - 1] += totalFrames - used;
  }
  let cursor = 0;
  return sizes.map((dur, i) => {
    const start = cursor;
    cursor += dur;
    return { start, end: cursor, duration: dur, shot: shots[i], index: i };
  });
};

// ───────── Transition helpers ─────────

type Transform = { tx: number; ty: number; scale: number; opacity: number };

// Longer transition = smoother. Bumped from 18 → 28 frames (~0.9s @ 30fps).
const TRANSITION_FRAMES = 28;

const enterTransform = (
  transition: UiShowcaseTransition,
  localFrame: number,
): Transform => {
  if (transition === "cut") {
    return { tx: 0, ty: 0, scale: 1, opacity: 1 };
  }
  // Use a gentler ease-in-out for smoother flow (was expoOut which snaps fast).
  const t = interpolate(localFrame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.cinematicInOut,
  });
  if (transition === "fade")
    return { tx: 0, ty: 0, scale: 1, opacity: t };
  if (transition === "slide-left")
    return {
      tx: interpolate(t, [0, 1], [300, 0]),
      ty: 0,
      scale: 1,
      opacity: t,
    };
  if (transition === "slide-right")
    return {
      tx: interpolate(t, [0, 1], [-300, 0]),
      ty: 0,
      scale: 1,
      opacity: t,
    };
  if (transition === "slide-up")
    return {
      tx: 0,
      ty: interpolate(t, [0, 1], [300, 0]),
      scale: 1,
      opacity: t,
    };
  if (transition === "slide-down")
    return {
      tx: 0,
      ty: interpolate(t, [0, 1], [-300, 0]),
      scale: 1,
      opacity: t,
    };
  if (transition === "zoom-in")
    return {
      tx: 0,
      ty: 0,
      scale: interpolate(t, [0, 1], [0.7, 1]),
      opacity: t,
    };
  if (transition === "zoom-out")
    return {
      tx: 0,
      ty: 0,
      scale: interpolate(t, [0, 1], [1.4, 1]),
      opacity: t,
    };
  return { tx: 0, ty: 0, scale: 1, opacity: t };
};

// ───────── Overlay helpers (spotlight, annotations, cursor, caption) ─────────

// Spotlight: dims the whole screenshot except a rectangular cutout.
// Uses CSS box-shadow trick to avoid clip-path performance issues.
const SpotlightOverlay: React.FC<{
  rect: ShotSpotlight;
  segProgress: number;
}> = ({ rect, segProgress }) => {
  const appearAt = rect.appearAt ?? 0;
  const fadeIn = interpolate(
    segProgress,
    [appearAt, Math.min(1, appearAt + 0.08)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const dim = (rect.intensity ?? 0.55) * fadeIn;
  return (
    <div
      style={{
        position: "absolute",
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        height: `${rect.h}%`,
        // Massive outward shadow does the "dim everything but this rect" trick
        boxShadow: `0 0 0 9999px rgba(0,0,0,${dim})`,
        borderRadius: 6,
        pointerEvents: "none",
        // Soft outline around the highlighted area
        border: `1px solid rgba(255,255,255,${0.25 * fadeIn})`,
        boxSizing: "border-box",
      }}
    />
  );
};

// Annotation pin: a dot at (x, y) with a label flag sticking out in `side`.
const AnnotationPin: React.FC<{
  ann: ShotAnnotation;
  segProgress: number;
}> = ({ ann, segProgress }) => {
  const appearAt = ann.appearAt ?? 0;
  const t = interpolate(
    segProgress,
    [appearAt, Math.min(1, appearAt + 0.1)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.expoOut },
  );
  const color = ann.color ?? "#FBBF24";
  const side = ann.side ?? "top";
  // Label offset relative to the pin
  const offsetMap: Record<string, { dx: number; dy: number; align: string }> = {
    top: { dx: 0, dy: -36, align: "center" },
    bottom: { dx: 0, dy: 36, align: "center" },
    left: { dx: -10, dy: 0, align: "flex-end" },
    right: { dx: 10, dy: 0, align: "flex-start" },
  };
  const off = offsetMap[side];
  return (
    <div
      style={{
        position: "absolute",
        left: `${ann.x}%`,
        top: `${ann.y}%`,
        transform: `translate(-50%, -50%) scale(${t})`,
        opacity: t,
        pointerEvents: "none",
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 0 4px ${color}33, 0 0 0 8px ${color}1A`,
        }}
      />
      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${off.dx}px), calc(-50% + ${off.dy}px))`,
          display: "flex",
          justifyContent: off.align,
          whiteSpace: "nowrap",
          fontFamily,
          fontWeight: 600,
          fontSize: 13,
          color: "#fff",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          padding: "4px 10px",
          borderRadius: 6,
          letterSpacing: "0.01em",
        }}
      >
        {ann.text}
      </div>
    </div>
  );
};

// Cursor state computation — finds where the cursor is right now given
// the action list and current progress (0..1).
type CursorState = {
  x: number;
  y: number;
  clickPulse: number; // 0..1, briefly spikes around click actions
  hotspotLabel?: string;
};
const computeCursorState = (
  actions: ShotCursorAction[],
  progress: number,
): CursorState => {
  if (actions.length === 0) {
    return { x: 50, y: 50, clickPulse: 0 };
  }
  const sorted = [...actions].sort((a, b) => a.at - b.at);

  let x: number;
  let y: number;
  let label: string | undefined;
  if (progress <= sorted[0].at) {
    x = sorted[0].x;
    y = sorted[0].y;
    label = sorted[0].label;
  } else if (progress >= sorted[sorted.length - 1].at) {
    const last = sorted[sorted.length - 1];
    x = last.x;
    y = last.y;
    label = last.label;
  } else {
    let a = sorted[0];
    let b = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (progress >= sorted[i].at && progress < sorted[i + 1].at) {
        a = sorted[i];
        b = sorted[i + 1];
        break;
      }
    }
    const range = Math.max(0.001, b.at - a.at);
    const t = (progress - a.at) / range;
    // Ease so the cursor decelerates into each hotspot
    const eased =
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    x = a.x + (b.x - a.x) * eased;
    y = a.y + (b.y - a.y) * eased;
    label = t > 0.85 ? b.label : t < 0.15 ? a.label : undefined;
  }

  // Click pulse: peak when progress is right on a click action
  let clickPulse = 0;
  for (const action of sorted) {
    if (action.type !== "click" && action.type !== "zoom") continue;
    const d = Math.abs(progress - action.at);
    if (d < 0.05) {
      clickPulse = Math.max(clickPulse, 1 - d / 0.05);
    }
  }
  return { x, y, clickPulse, hotspotLabel: label };
};

// Cursor + click rings overlay
const CursorOverlay: React.FC<{
  state: CursorState;
  actions: ShotCursorAction[];
  segProgress: number;
  accent: string;
}> = ({ state, actions, segProgress, accent }) => {
  // Render an expanding ring for each click action that's "near" the
  // current progress. Ring scales 0 → 1.8× and fades out.
  const clickRings = actions
    .filter((a) => a.type === "click" || a.type === "zoom")
    .map((a, i) => {
      const delta = segProgress - a.at;
      if (delta < -0.005 || delta > 0.18) return null;
      const t = Math.max(0, Math.min(1, delta / 0.18));
      const ringScale = interpolate(t, [0, 1], [0.4, 1.8]);
      const ringOpacity = interpolate(t, [0, 0.2, 1], [0, 0.7, 0]);
      return (
        <div
          key={`ring-${i}`}
          style={{
            position: "absolute",
            left: `${a.x}%`,
            top: `${a.y}%`,
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `2px solid ${accent}`,
            transform: `translate(-50%, -50%) scale(${ringScale})`,
            opacity: ringOpacity,
            pointerEvents: "none",
          }}
        />
      );
    });

  return (
    <>
      {clickRings}
      {/* Cursor itself */}
      <div
        style={{
          position: "absolute",
          left: `${state.x}%`,
          top: `${state.y}%`,
          transform: `translate(-50%, -50%) scale(${1 + state.clickPulse * 0.3})`,
          pointerEvents: "none",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 1.5l13.5 7-5 1.7-2.4 5L3 1.5z"
            fill="white"
            stroke="#111"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        {/* Hotspot label */}
        {state.hotspotLabel ? (
          <div
            style={{
              position: "absolute",
              left: 18,
              top: 18,
              whiteSpace: "nowrap",
              fontFamily,
              fontWeight: 600,
              fontSize: 12,
              color: "#fff",
              background: "rgba(0,0,0,0.78)",
              padding: "4px 8px",
              borderRadius: 6,
              backdropFilter: "blur(8px)",
            }}
          >
            {state.hotspotLabel}
          </div>
        ) : null}
      </div>
    </>
  );
};

// Per-shot caption — sits at the bottom of the screenshot area.
const ShotCaption: React.FC<{
  text: string;
  segProgress: number;
  isLight: boolean;
}> = ({ text, segProgress, isLight }) => {
  // Fade in over the first 8% of the shot, fade out over the last 6%.
  const opacity = interpolate(
    segProgress,
    [0, 0.08, 0.94, 1],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        maxWidth: "78%",
        textAlign: "center",
        fontFamily,
        fontWeight: 600,
        fontSize: 18,
        letterSpacing: "-0.005em",
        color: isLight ? "#0a0a0c" : "#ffffff",
        background: isLight
          ? "rgba(255,255,255,0.85)"
          : "rgba(0,0,0,0.65)",
        backdropFilter: "blur(10px)",
        padding: "8px 16px",
        borderRadius: 8,
        opacity,
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};

// ───────── Main component ─────────

export const UiShowcase: React.FC<Props> = ({
  screenshots,
  screenshot,
  frame: frameStyle = "browser",
  layout,
  mode = "different-window",
  caption,
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

  // Build the canonical shots array — fall back to legacy single-screenshot
  const shots: Shot[] = (() => {
    if (screenshots && screenshots.length > 0) return screenshots;
    if (screenshot) return [{ url: screenshot, frame: frameStyle }];
    return [];
  })();

  // Reserve a few frames at the end for the exit fade so the last shot
  // doesn't get cut off awkwardly.
  const playFrames = Math.max(1, durationInFrames - 12);
  const segments = segmentsFor(shots, playFrames);
  const activeSegment =
    segments.find((s) => frame >= s.start && frame < s.end) ??
    segments[segments.length - 1];

  const headingT = interpolate(frame, [10, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });

  const exitT = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Layout choice: if user explicitly set side-by-side / stacked / grid /
  // sequence, we treat that as a static spatial arrangement. Default to
  // the new sequence playback (one shot at a time with transitions).
  const isMultiPanel =
    layout === "side-by-side" || layout === "stacked" || layout === "grid";

  let body: React.ReactNode = null;

  if (shots.length === 0) {
    body = (
      <div
        style={{
          width: "60%",
          aspectRatio: "16 / 10",
          borderRadius: 16,
          background: `linear-gradient(135deg, ${brand.accent}22 0%, ${brand.accent}08 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: `${brand.accent}77`,
          fontSize: 96,
        }}
      >
        ▦
      </div>
    );
  } else if (isMultiPanel) {
    // Static spatial arrangement — all shots visible simultaneously
    const direction =
      layout === "side-by-side" ? "row" : layout === "stacked" ? "column" : "grid";
    if (direction === "grid") {
      body = (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: shots.length <= 2 ? "1fr 1fr" : "1fr 1fr",
            gridTemplateRows: shots.length <= 2 ? "1fr" : "1fr 1fr",
            gap: 24,
            width: "100%",
            maxWidth: 1400,
          }}
        >
          {shots.slice(0, 4).map((shot, i) => {
            const enter = interpolate(frame, [i * 4, i * 4 + 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.expoOut,
            });
            return (
              <div
                key={i}
                style={{
                  transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
                  opacity: enter,
                }}
              >
                <FramedShot
                  shot={shot}
                  defaultFrame={frameStyle}
                  isLight={isLight}
                  inner={
                    <Img
                      src={shot.url}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  }
                />
              </div>
            );
          })}
        </div>
      );
    } else {
      body = (
        <div
          style={{
            display: "flex",
            flexDirection: direction === "column" ? "column" : "row",
            gap: 28,
            alignItems: "center",
            width: "100%",
            maxWidth: direction === "row" ? 1500 : 1000,
          }}
        >
          {shots.slice(0, 2).map((shot, i) => {
            const enter = interpolate(frame, [i * 6, i * 6 + 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.expoOut,
            });
            return (
              <div
                key={i}
                style={{
                  flex: direction === "row" ? 1 : "unset",
                  width: direction === "column" ? "100%" : "auto",
                  transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
                  opacity: enter,
                }}
              >
                <FramedShot
                  shot={shot}
                  defaultFrame={frameStyle}
                  isLight={isLight}
                  inner={
                    <Img
                      src={shot.url}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  }
                />
              </div>
            );
          })}
        </div>
      );
    }
  } else {
    // Sequence playback — show the active shot with transitionIn + pan/zoom
    if (!activeSegment) {
      body = null;
    } else {
      const shot = activeSegment.shot;
      const localFrame = frame - activeSegment.start;
      const transition = shot.transitionIn ?? "fade";
      const t = enterTransform(transition, localFrame);

      const segProgress = interpolate(
        localFrame,
        [0, activeSegment.duration],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

      // ─── Pan / zoom transform on the media element ───
      // `pan` takes priority over legacy `zoom`. Interpolates origin + scale.
      let mediaTransform: React.CSSProperties = {};
      if (shot.pan) {
        const px = interpolate(
          segProgress,
          [0, 1],
          [shot.pan.from.x, shot.pan.to.x],
          { easing: ease.cinematicInOut },
        );
        const py = interpolate(
          segProgress,
          [0, 1],
          [shot.pan.from.y, shot.pan.to.y],
          { easing: ease.cinematicInOut },
        );
        const ps = interpolate(
          segProgress,
          [0, 1],
          [shot.pan.from.scale, shot.pan.to.scale],
          { easing: ease.cinematicInOut },
        );
        mediaTransform = {
          transform: `scale(${ps})`,
          transformOrigin: `${px}% ${py}%`,
        };
      } else if (shot.zoom) {
        const scale = interpolate(segProgress, [0, 1], [1, shot.zoom.scale], {
          easing: ease.expoOut,
        });
        mediaTransform = {
          transform: `scale(${scale})`,
          transformOrigin: `${shot.zoom.x}% ${shot.zoom.y}%`,
        };
      }

      // Frame position: user can move the device box around the canvas.
      const fp = shot.framePosition;
      const fpX = fp ? fp.x - 50 : 0;
      const fpY = fp ? fp.y - 50 : 0;
      const fpScale = fp?.scale ?? 1;

      // ─── Cursor walkthrough: position + click ring ───
      const cursorState = shot.cursor?.actions?.length
        ? computeCursorState(shot.cursor.actions, segProgress)
        : null;

      body = (
        <div
          style={{
            maxWidth: (shot.frame ?? frameStyle) === "phone" ? 380 : 1000,
            width: "100%",
            transform: `translate(calc(${fpX}% + ${t.tx}px), calc(${fpY}% + ${t.ty}px)) scale(${t.scale * fpScale})`,
            transformOrigin: "center center",
            opacity: t.opacity,
          }}
        >
          <FramedShot
            shot={shot}
            defaultFrame={frameStyle}
            url={url}
            isLight={isLight}
            inner={
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                {/* Media — image or video, with pan/zoom transform */}
                {shot.mediaType === "video" ? (
                  <OffthreadVideo
                    src={shot.url}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      ...mediaTransform,
                    }}
                  />
                ) : (
                  <Img
                    src={shot.url}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      ...mediaTransform,
                    }}
                  />
                )}

                {/* Spotlight overlay — dims everything outside the rect */}
                {shot.spotlight &&
                segProgress >= (shot.spotlight.appearAt ?? 0) ? (
                  <SpotlightOverlay
                    rect={shot.spotlight}
                    segProgress={segProgress}
                  />
                ) : null}

                {/* Annotation pins */}
                {shot.annotations?.map((ann, i) =>
                  segProgress >= (ann.appearAt ?? 0) ? (
                    <AnnotationPin
                      key={`ann-${i}`}
                      ann={ann}
                      segProgress={segProgress}
                    />
                  ) : null,
                )}

                {/* Cursor walkthrough — synthetic mouse + click rings */}
                {cursorState ? (
                  <CursorOverlay
                    state={cursorState}
                    actions={shot.cursor!.actions}
                    segProgress={segProgress}
                    accent={brand.accent}
                  />
                ) : null}

                {/* Per-shot caption */}
                {shot.shotCaption ? (
                  <ShotCaption
                    text={shot.shotCaption}
                    segProgress={segProgress}
                    isLight={isLight}
                  />
                ) : null}
              </div>
            }
          />
        </div>
      );
    }
  }

  return (
    <AbsoluteFill style={{ background: bg, opacity: exitT }}>
      <MotionBackground brand={brand} intensity="subtle" />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 60px`,
          gap: 48,
        }}
      >
        {caption ? (
          <div
            style={{
              fontFamily,
              fontWeight: 700,
              fontSize: 56,
              color: fg,
              letterSpacing: "-0.02em",
              textAlign: "center",
              transform: `translateY(${interpolate(headingT, [0, 1], [20, 0])}px)`,
              opacity: headingT,
              maxWidth: "85%",
            }}
          >
            {caption}
          </div>
        ) : null}

        {body}

        {/* Sequence pagination dots — show only when in sequence mode */}
        {!isMultiPanel && shots.length > 1 && activeSegment ? (
          <div style={{ display: "flex", gap: 10 }}>
            {shots.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === activeSegment.index ? 28 : 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    i === activeSegment.index
                      ? brand.accent
                      : isLight
                        ? "rgba(10,10,12,0.18)"
                        : "rgba(255,255,255,0.18)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  Img,
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

type Shot = {
  url: string;
  label?: string;
  frame?: UiShowcaseFrame;
  transitionIn?: UiShowcaseTransition;
  zoom?: { x: number; y: number; scale: number };
  framePosition?: { x: number; y: number; scale: number };
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
    // Sequence playback — show the active shot with transitionIn + zoom
    if (!activeSegment) {
      body = null;
    } else {
      const shot = activeSegment.shot;
      const localFrame = frame - activeSegment.start;
      const transition = shot.transitionIn ?? "fade";
      // First shot uses fade unless explicitly set
      const t = enterTransform(transition, localFrame);

      // Zoom progression across the segment duration
      const segProgress = interpolate(
        localFrame,
        [0, activeSegment.duration],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

      let zoomTransform = "";
      if (shot.zoom) {
        const targetScale = interpolate(
          segProgress,
          [0, 1],
          [1, shot.zoom.scale],
          { easing: ease.expoOut },
        );
        const ox = shot.zoom.x;
        const oy = shot.zoom.y;
        zoomTransform = `transform-origin: ${ox}% ${oy}%;`;
        // Combined transform applied below
        // we'll apply scale + transform-origin via separate style
      }

      // Frame position: user can move the device box around the canvas.
      // (50, 50, 1.0) is centered. Values are percentages.
      const fp = shot.framePosition;
      const fpX = fp ? fp.x - 50 : 0; // offset from center, in %
      const fpY = fp ? fp.y - 50 : 0;
      const fpScale = fp?.scale ?? 1;

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
                <Img
                  src={shot.url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transform: shot.zoom
                      ? `scale(${interpolate(segProgress, [0, 1], [1, shot.zoom.scale], { easing: ease.expoOut })})`
                      : "none",
                    transformOrigin: shot.zoom
                      ? `${shot.zoom.x}% ${shot.zoom.y}%`
                      : "center center",
                  }}
                />
                {/* Zoom-target indicator (only visible briefly when zoom set) */}
                {shot.zoom && segProgress > 0.05 ? null : null}
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

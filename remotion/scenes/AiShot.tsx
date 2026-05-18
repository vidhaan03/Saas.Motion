import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import type { Brand } from "../schema";
import { resolveTypeface } from "../fonts";
import { resolveVibe } from "../vibes";
import { THEME, productionTextStyle } from "../theme";
import {
  breathing,
  cinematicEntrance,
  cinematicExit,
  ease,
} from "../motion";

type Props = {
  // Pre-generated FLUX image URL (data URL or remote URL).
  imageUrl: string;
  // Headline overlay shown after the image settles. Optional — sometimes
  // the image alone is enough.
  caption?: string;
  // Smaller caption beneath the headline. Optional.
  subcaption?: string;
  // Camera move applied to the image. Defaults to "push-in".
  motion?: "push-in" | "pull-out" | "pan-left" | "pan-right" | "static";
  // Overlay treatment — controls how brand color tints the image and
  // ensures text readability.
  //   "dark"     — strong dark gradient bottom-up (good for white text)
  //   "light"    — subtle dark gradient (image dominant)
  //   "scrim"    — full dark scrim @ 35% opacity (for dense images)
  //   "none"     — no overlay (only use with already-dark images)
  overlay?: "dark" | "light" | "scrim" | "none";
  // Where the caption sits.
  captionPosition?: "bottom" | "center" | "top";
  brand: Brand;
  sceneIndex?: number;
};

export const AiShot: React.FC<Props> = ({
  imageUrl,
  caption,
  subcaption,
  motion = "push-in",
  overlay = "dark",
  captionPosition = "bottom",
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const vibe = resolveVibe(brand.vibe);
  const { family: fontFamily } = resolveTypeface(
    undefined,
    brand.typeface ?? vibe.typefaceBias,
  );

  // ── Camera move on the image. Ken-Burns scale + optional pan. ────────
  // The motion lasts the full scene; uses a smooth cinematic curve so it
  // never feels mechanical.
  const motionT = interpolate(frame, [0, 120], [0, 1], {
    extrapolateRight: "clamp",
    easing: ease.cinematic,
  });
  const baseScale = (() => {
    switch (motion) {
      case "push-in":
        return 1 + motionT * 0.12;
      case "pull-out":
        return 1.12 - motionT * 0.12;
      default:
        return 1.04;
    }
  })();
  const baseX = (() => {
    if (motion === "pan-left") return -motionT * 6;
    if (motion === "pan-right") return motionT * 6;
    return 0;
  })();

  // Subtle continuous breathing on top of the main camera move so the
  // image never reads as a static photo — it's always alive.
  const breath = breathing(frame, sceneIndex * 0.3, 0.004);

  // Caption appears AFTER the image has settled — gives the eye a beat
  // to take in the visual first.
  const captionEntrance = caption
    ? cinematicEntrance(frame, 24, "considered", { driftDirection: "up" })
    : null;
  const subcaptionEntrance = subcaption
    ? cinematicEntrance(frame, 38, "soft", { driftDirection: "up" })
    : null;

  // Scene-end exit so cuts between AiShot scenes don't feel hard.
  const exit = cinematicExit(frame, 1_000_000); // disabled by default
  void exit;

  const isLight = sceneIndex % 2 === 1;
  const themeMode: "dark" | "light" = isLight ? "light" : "dark";
  // Hero overlay treatment — white text on dark image; dark on light.
  const overlayTextColor = overlay === "none" ? "#fff" : "#fff";
  const heroTextStyle = productionTextStyle(
    overlayTextColor,
    brand.accent,
    "hero",
    themeMode,
  );

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Image layer — fills the canvas, Ken-Burns animated. Only
          rendered when a URL is actually present. Remotion's <Img>
          throws on empty src, so when the FLUX call hadn't returned (or
          failed) we render a black plate that still gets the camera
          motion + caption on top. */}
      {imageUrl ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${baseScale * breath}) translateX(${baseX}%)`,
              transformOrigin: "center",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, #0a0a0c 0%, color-mix(in srgb, ${brand.color} 18%, #04040a) 100%)`,
          }}
        />
      )}

      {/* Overlay gradient — varies by treatment. Drawn ABOVE image, BELOW
          text. brand.accent tints into the gradient bottom for subtle
          brand presence. */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {overlay === "scrim" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
            }}
          />
        ) : null}
        {overlay === "dark" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg,
                rgba(0,0,0,0.0) 0%,
                rgba(0,0,0,0.15) 45%,
                rgba(0,0,0,0.55) 75%,
                rgba(0,0,0,0.85) 100%)`,
            }}
          />
        ) : null}
        {overlay === "light" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg,
                rgba(0,0,0,0.0) 0%,
                rgba(0,0,0,0.0) 65%,
                rgba(0,0,0,0.45) 100%)`,
            }}
          />
        ) : null}
        {/* Brand-accent ambient tint at the bottom — a thin band that
            says "this is your brand's video" without overwhelming. */}
        {overlay !== "none" ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "4%",
              background: `linear-gradient(180deg, transparent, ${brand.accent})`,
              opacity: 0.7,
            }}
          />
        ) : null}
      </AbsoluteFill>

      {/* Caption layer — cinematic entrance + lower-third placement.
          Uses the same productionTextStyle as the kinetic scenes so
          the typography reads consistent across the storyboard. */}
      {caption && captionEntrance ? (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent:
              captionPosition === "top"
                ? "flex-start"
                : captionPosition === "center"
                  ? "center"
                  : "flex-end",
            padding:
              captionPosition === "top"
                ? `${THEME.padding.scene}px 64px 0`
                : captionPosition === "bottom"
                  ? `0 64px ${THEME.padding.scene * 0.8}px`
                  : `${THEME.padding.scene}px 64px`,
            gap: 18,
          }}
        >
          <div
            style={{
              fontFamily,
              fontWeight: THEME.weight.black,
              fontSize: caption.length > 30 ? 64 : 88,
              lineHeight: 1.0,
              letterSpacing: THEME.tracking.title,
              textAlign: "center",
              maxWidth: "90%",
              transform: `translateY(${captionEntrance.translateY}px) scale(${captionEntrance.scale})`,
              opacity: captionEntrance.opacity,
              ...heroTextStyle,
            }}
          >
            {caption}
          </div>
          {subcaption && subcaptionEntrance ? (
            <div
              style={{
                fontFamily,
                fontWeight: THEME.weight.regular,
                fontSize: 26,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.78)",
                textAlign: "center",
                maxWidth: "75%",
                letterSpacing: 0,
                transform: `translateY(${subcaptionEntrance.translateY}px)`,
                opacity: subcaptionEntrance.opacity,
              }}
            >
              {subcaption}
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

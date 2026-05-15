import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { Brand } from "../schema";
import { MockDashboard } from "./MockDashboard";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const STAGE_W = 1000;
const STAGE_H = 600;
const CANVAS_W = 1080;

type Action =
  | { at: number; type: "move"; x: number; y: number }
  | { at: number; type: "zoom"; x: number; y: number; scale: number }
  | { at: number; type: "click"; x: number; y: number; label?: string }
  | { at: number; type: "reset" };

type Props = {
  screenshot?: string;
  caption?: string;
  actions: Action[];
  brand: Brand;
};

type KF<T> = T & { at: number };

const interpKF = <T extends { at: number }>(
  kfs: T[],
  frame: number,
  easeFn: (t: number) => number,
): { from: T; to: T; eased: number } => {
  let from = kfs[0];
  let to = kfs[0];
  for (let i = 0; i < kfs.length; i++) {
    if (kfs[i].at <= frame) from = kfs[i];
    if (kfs[i].at > frame) {
      to = kfs[i];
      break;
    }
  }
  if (to.at <= frame) to = from;
  const t =
    from.at === to.at
      ? 1
      : interpolate(frame, [from.at, to.at], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return { from, to, eased: easeFn(t) };
};

const cursorEase = Easing.bezier(0.16, 1, 0.3, 1);
const zoomEase = Easing.bezier(0.32, 0.72, 0, 1);

export const ProductDemo: React.FC<Props> = ({
  screenshot,
  caption,
  actions,
  brand,
}) => {
  const frame = useCurrentFrame();

  const cursorKeyframes: KF<{ x: number; y: number }>[] = [
    { at: -1, x: STAGE_W - 60, y: STAGE_H - 60 },
  ];
  const zoomKeyframes: KF<{ x: number; y: number; scale: number }>[] = [
    { at: -1, x: STAGE_W / 2, y: STAGE_H / 2, scale: 1 },
  ];
  const clickEvents: Array<KF<{ x: number; y: number; label?: string }>> = [];

  for (const a of actions) {
    if (a.type === "move") cursorKeyframes.push({ at: a.at, x: a.x, y: a.y });
    if (a.type === "click") {
      cursorKeyframes.push({ at: a.at, x: a.x, y: a.y });
      clickEvents.push({ at: a.at, x: a.x, y: a.y, label: a.label });
    }
    if (a.type === "zoom") {
      cursorKeyframes.push({ at: a.at, x: a.x, y: a.y });
      zoomKeyframes.push({ at: a.at, x: a.x, y: a.y, scale: a.scale });
    }
    if (a.type === "reset") {
      zoomKeyframes.push({
        at: a.at,
        x: STAGE_W / 2,
        y: STAGE_H / 2,
        scale: 1,
      });
    }
  }

  const cur = interpKF(cursorKeyframes, frame, cursorEase);
  const cursorX = cur.from.x + (cur.to.x - cur.from.x) * cur.eased;
  const cursorY = cur.from.y + (cur.to.y - cur.from.y) * cur.eased;

  const zm = interpKF(zoomKeyframes, frame, zoomEase);
  const scale = zm.from.scale + (zm.to.scale - zm.from.scale) * zm.eased;
  const zoomX = zm.from.x + (zm.to.x - zm.from.x) * zm.eased;
  const zoomY = zm.from.y + (zm.to.y - zm.from.y) * zm.eased;

  const tapClick = clickEvents.find((c) => frame >= c.at && frame < c.at + 8);
  const tapScale = tapClick
    ? interpolate(frame, [tapClick.at, tapClick.at + 4, tapClick.at + 8], [1, 0.82, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const activeLabel = clickEvents.find(
    (c) => frame >= c.at && frame < c.at + 36 && c.label,
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${brand.accent}33 0%, ${brand.color} 60%, #0a0a0c 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "8% 5%",
        gap: 48,
      }}
    >
      {caption ? (
        <div
          style={{
            textAlign: "center",
            fontFamily,
            fontWeight: 800,
            fontSize: 56,
            color: "white",
            letterSpacing: "-0.02em",
            padding: "0 40px",
            textShadow: "0 8px 40px rgba(0,0,0,0.3)",
            maxWidth: "90%",
          }}
        >
          {caption}
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          width: "min(85%, 1000px)",
          aspectRatio: `${STAGE_W} / ${STAGE_H}`,
          borderRadius: 24,
          overflow: "hidden",
          background: "#1a1a1f",
          boxShadow: `0 40px 120px -20px ${brand.accent}66, 0 0 0 1px rgba(255,255,255,0.08)`,
          transform: `scale(${scale})`,
          transformOrigin: `${(zoomX / STAGE_W) * 100}% ${(zoomY / STAGE_H) * 100}%`,
        }}
      >
        {screenshot ? (
          <Img
            src={screenshot}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <MockDashboard brand={brand} />
        )}

        {clickEvents
          .filter((c) => frame >= c.at && frame < c.at + 24)
          .map((c, i) => {
            const age = frame - c.at;
            const radiusPct = interpolate(age, [0, 24], [0, 10]);
            const opacity = interpolate(age, [0, 6, 24], [0.7, 0.55, 0]);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(c.x / STAGE_W) * 100}%`,
                  top: `${(c.y / STAGE_H) * 100}%`,
                  width: `${radiusPct * 2}%`,
                  aspectRatio: "1",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `4px solid ${brand.accent}`,
                  opacity,
                  pointerEvents: "none",
                }}
              />
            );
          })}

        <div
          style={{
            position: "absolute",
            left: `${(cursorX / STAGE_W) * 100}%`,
            top: `${(cursorY / STAGE_H) * 100}%`,
            transform: `translate(-12%, -8%) scale(${tapScale})`,
            transition: "none",
            pointerEvents: "none",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          }}
        >
          <svg width="32" height="40" viewBox="0 0 28 36" fill="none">
            <path
              d="M3 2 L3 28 L10 22 L14 32 L18 30 L14 20 L23 20 Z"
              fill="white"
              stroke="#0a0a0c"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {activeLabel ? (
        <div
          style={{
            textAlign: "center",
            fontFamily,
            fontWeight: 600,
            fontSize: 40,
            color: brand.accent,
            letterSpacing: "-0.01em",
            opacity: interpolate(
              frame,
              [activeLabel.at, activeLabel.at + 4, activeLabel.at + 30, activeLabel.at + 36],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            textShadow: `0 0 40px ${brand.accent}88`,
          }}
        >
          {activeLabel.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

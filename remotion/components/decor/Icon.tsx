import { interpolate, useCurrentFrame } from "remotion";
import type { IconName } from "../../decorIcons";

type Props = {
  name: IconName;
  // Percent of canvas, center-anchored.
  x: number;
  y: number;
  // Percent of shorter axis — usually 6-18.
  size: number;
  color: string;
  // 0.4 = far/blurred/slow drift, 1.0 = front, 1.2 = hero element.
  layer?: number;
  phase?: number;
};

// Lucide-style line-icon set. Strokes only, no fills (keeps icons feeling
// like motion-graphic accents, not heavy logos). Each path uses viewBox
// "0 0 24 24" and stroke-width 1.5 by convention.
const ICON_PATHS: Record<IconName, React.ReactNode> = {
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  message: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  mail: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  wave: (
    <path d="M2 12c2 0 2-5 4-5s2 10 4 10 2-10 4-10 2 10 4 10 2-5 4-5" />
  ),
  signal: (
    <>
      <line x1="2" y1="20" x2="2" y2="20" />
      <line x1="6" y1="20" x2="6" y2="16" />
      <line x1="10" y1="20" x2="10" y2="12" />
      <line x1="14" y1="20" x2="14" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </>
  ),
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  terminal: (
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>
  ),
  cloud: (
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </>
  ),
  key: (
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  shield: (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  ),
  "chart-bar": (
    <>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </>
  ),
  "chart-line": (
    <>
      <line x1="3" y1="3" x2="3" y2="21" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <polyline points="7 14 12 9 16 13 21 8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  spark: (
    <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z" />
  ),
  bolt: (
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  ),
  brain: (
    <path d="M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 21.834m0-16.834a3 3 0 1 1 5.997.142 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 21.834M12 5v16.834" />
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6" />
      <circle cx="16" cy="14" r="1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  hexagon: (
    <polygon points="12 2 22 7 22 17 12 22 2 17 2 7 12 2" />
  ),
};

// Single decor icon rendered as a stroke-only SVG. Drifts slowly on a
// sine wave so the field doesn't feel static. Far-layer icons get a tiny
// blur for atmospheric perspective.
export const Icon: React.FC<Props> = ({
  name,
  x,
  y,
  size,
  color,
  layer = 1,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  const speed = 130 / Math.max(0.3, layer);
  const driftX = 2 * Math.sin(frame / speed + phase);
  const driftY = 1.5 * Math.cos(frame / (speed * 1.2) + phase);

  // Subtle in-place rotation for hexagon / spark only — they read better
  // with motion. Others stay upright to remain legible.
  const rotates = name === "hexagon" || name === "spark";
  const rotation = rotates ? interpolate(frame, [0, 600], [0, 30]) : 0;

  // Far icons fade and blur slightly so they sit "behind" closer ones.
  const opacity = interpolate(layer, [0.4, 1.0, 1.3], [0.45, 0.85, 1]);
  const blurPx = layer < 0.7 ? (0.7 - layer) * 5 : 0;

  const renderedSize = size * layer;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x + driftX}%`,
        top: `${y + driftY}%`,
        width: `${renderedSize}%`,
        aspectRatio: "1 / 1",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        filter: blurPx ? `blur(${blurPx}px)` : undefined,
        opacity,
        pointerEvents: "none",
        color,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[name]}
      </svg>
    </div>
  );
};

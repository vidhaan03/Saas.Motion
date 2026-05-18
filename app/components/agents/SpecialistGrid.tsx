import type { Scene } from "../../../remotion/schema";

// Visual "fan-out" of specialist agents, one card per planned scene.
// Renders three connected layers:
//   1. A vertical spine line below the director
//   2. A horizontal rail with "N specialists in parallel" label
//   3. The grid of agent cards, each hanging from the rail via a notch

type SpecialistTrace = {
  status: "thinking" | "done" | "failed";
  sceneType: Scene["type"];
  ms?: number;
};

type Props = {
  total: number;
  specialists: Record<number, SpecialistTrace>;
  scenes: Scene[]; // completed scenes (populated as specialists finish)
};

const shortTypeName = (type: Scene["type"]): string => {
  switch (type) {
    case "kineticTitle":
      return "title";
    case "statReveal":
      return "stat";
    case "featureGrid":
      return "grid";
    case "productDemo":
      return "demo";
    case "testimonialQuote":
      return "quote";
    case "logoWall":
      return "logos";
    case "ctaCard":
      return "cta";
    case "multiScript":
      return "script";
    case "productCarousel":
      return "carousel";
    case "uiShowcase":
      return "ui";
    default:
      return "—";
  }
};

const sceneBody = (scene: Scene): string => {
  switch (scene.type) {
    case "kineticTitle":
      return scene.lines.join(" ");
    case "statReveal":
      return `${scene.value}${scene.suffix ?? ""} — ${scene.label}`;
    case "featureGrid":
      return scene.heading;
    case "productDemo":
      return scene.caption ?? `${scene.actions.length} cursor actions`;
    case "testimonialQuote":
      return `"${scene.quote}"`;
    case "logoWall":
      return `${scene.heading} · ${scene.logos.length}`;
    case "ctaCard":
      return `${scene.headline} → ${scene.buttonLabel}`;
    case "multiScript":
      return scene.glyphs.map((g) => g.char).join(" → ");
    case "productCarousel":
      return `${scene.products.length} products`;
    case "uiShowcase":
      return `${scene.frame ?? "browser"} showcase`;
    default:
      return "";
  }
};

export const SpecialistGrid = ({ total, specialists, scenes }: Props) => {
  if (total === 0) return null;

  return (
    <>
      {/* Spine from director down to the rail */}
      <div className="relative mx-auto h-8 w-px">
        <div
          className="absolute inset-0"
          style={{ background: "var(--rule)" }}
        />
        <div
          className="absolute inset-x-0 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--ink-faint)" }}
        />
      </div>

      {/* Rail + label */}
      <div className="relative flex items-center gap-3 px-1">
        <span
          className="h-px flex-1"
          style={{ background: "var(--rule)" }}
        />
        <span
          className="italic"
          style={{
            color: "var(--ink-muted)",
            fontFamily: "var(--font-serif), serif",
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: "-0.01em",
          }}
        >
          {total} specialist agents in parallel
        </span>
        <span
          className="h-px flex-1"
          style={{ background: "var(--rule)" }}
        />
      </div>

      {/* Grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        {Array.from({ length: total }).map((_, idx) => {
          const sp = specialists[idx];
          const scene = scenes[idx];
          const status: "queued" | "thinking" | "done" | "failed" = scene
            ? "done"
            : sp?.status === "thinking"
              ? "thinking"
              : sp?.status === "failed"
                ? "failed"
                : "queued";
          const isDone = status === "done";
          const isThinking = status === "thinking";
          const isQueued = status === "queued";
          const isFailed = status === "failed";

          const sceneType = scene?.type ?? sp?.sceneType ?? null;
          const shortType = sceneType ? shortTypeName(sceneType) : "—";
          const body = scene
            ? sceneBody(scene)
            : isThinking
              ? "Drafting…"
              : isFailed
                ? "Failed"
                : "Queued";

          return (
            <div
              key={idx}
              className="relative flex flex-col rounded-xl border p-3 transition-all"
              style={{
                marginTop: 14,
                animation: "sceneArrive 500ms ease-out",
                background: isDone
                  ? "var(--bg-elev)"
                  : "color-mix(in srgb, var(--bg-elev) 40%, transparent)",
                borderColor: isDone
                  ? "color-mix(in srgb, var(--ink) 16%, transparent)"
                  : "color-mix(in srgb, var(--ink) 8%, transparent)",
                boxShadow: isDone ? "var(--shadow)" : "none",
                opacity: isQueued ? 0.55 : 1,
              }}
            >
              {/* Connector notch dropping from the rail */}
              <div
                className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                style={{
                  top: -14,
                  width: 1,
                  height: 14,
                  background: "var(--rule)",
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2"
                style={{
                  top: -14,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: isDone
                    ? "var(--ink)"
                    : isThinking
                      ? "var(--accent)"
                      : isFailed
                        ? "#B91C1C"
                        : "var(--ink-faint)",
                  transform: "translate(-50%, -2.5px)",
                }}
              />

              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isThinking ? "animate-pulse" : ""}`}
                  style={{
                    background: isDone
                      ? "var(--ink)"
                      : isFailed
                        ? "#B91C1C"
                        : isThinking
                          ? "var(--accent)"
                          : "var(--ink-faint)",
                  }}
                />
              </div>
              <div
                className="mt-2 font-mono text-[10px] uppercase tracking-widest"
                style={{
                  color: isDone ? "var(--ink-muted)" : "var(--ink-faint)",
                }}
              >
                {shortType}
              </div>
              <div
                className="mt-1.5 line-clamp-2 text-[12px] leading-snug"
                style={{
                  color: isDone ? "var(--ink)" : "var(--ink-faint)",
                }}
              >
                {body}
              </div>
              <div className="mt-auto pt-3">
                <div
                  className="font-mono text-[10px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {sp?.ms !== undefined
                    ? `${(sp.ms / 1000).toFixed(1)}s`
                    : isThinking
                      ? "…"
                      : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

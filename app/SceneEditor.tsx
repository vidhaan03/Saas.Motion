"use client";

import { useEffect, useRef, useState } from "react";
import type { Brand, Scene } from "../remotion/schema";
import {
  SFX_KEYS,
  kineticTitleVariants,
  statRevealVariants,
  ctaCardVariants,
  productCarouselStyles,
  uiShowcaseFrames,
  uiShowcaseAnimations,
  uiShowcaseTransitions,
} from "../remotion/schema";

type Action = Extract<Scene, { type: "productDemo" }>["actions"][number];

type Props = {
  scene: Scene;
  brand: Brand;
  onChange: (next: Scene) => void;
  onDelete?: () => void;
};

const InputRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
      {label}
    </div>
    {children}
  </label>
);

const Field = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => (
  <input
    {...props}
    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-white/30"
  />
);

const NumField = ({
  value,
  onChange,
  ...rest
}: {
  value: number;
  onChange: (n: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) => (
  <Field
    type="number"
    value={value}
    onChange={(e) => {
      const v = e.target.value;
      const num = v === "" ? 0 : Number(v);
      if (!Number.isNaN(num)) onChange(num);
    }}
    {...rest}
  />
);

const Select: React.FC<{
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}> = ({ value, options, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-white/30"
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

// Reusable trailing block: SFX dropdown that every scene shares.
const SfxRow: React.FC<{
  value: string | undefined;
  onChange: (next: string | undefined) => void;
}> = ({ value, onChange }) => (
  <InputRow label="Sound effect">
    <Select
      value={value ?? "auto"}
      options={["auto", ...SFX_KEYS]}
      onChange={(v) => onChange(v === "auto" ? undefined : v)}
    />
  </InputRow>
);

// Variant picker — only used for scene types that have variants.
const VariantRow: React.FC<{
  value: string | undefined;
  options: readonly string[];
  onChange: (next: string | undefined) => void;
}> = ({ value, options, onChange }) => (
  <InputRow label="Animation variant">
    <Select
      value={value ?? "auto"}
      options={["auto", ...options]}
      onChange={(v) => onChange(v === "auto" ? undefined : v)}
    />
  </InputRow>
);

const KineticTitleEditor: React.FC<{
  scene: Extract<Scene, { type: "kineticTitle" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => {
  const updateLine = (idx: number, value: string) => {
    const lines = [...scene.lines];
    lines[idx] = value;
    onChange({ ...scene, lines });
  };
  return (
    <div className="space-y-3">
      {scene.lines.map((line, idx) => (
        <InputRow key={idx} label={`Line ${idx + 1}`}>
          <Field
            value={line}
            onChange={(e) => updateLine(idx, e.target.value)}
            placeholder="Headline text"
          />
        </InputRow>
      ))}
      <div className="flex gap-2">
        <button
          onClick={() => onChange({ ...scene, lines: [...scene.lines, ""] })}
          disabled={scene.lines.length >= 3}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-40"
        >
          + Line
        </button>
        <button
          onClick={() =>
            onChange({ ...scene, lines: scene.lines.slice(0, -1) })
          }
          disabled={scene.lines.length <= 1}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-40"
        >
          − Line
        </button>
      </div>
      <InputRow label="Emoji (optional)">
        <Field
          value={scene.emoji ?? ""}
          onChange={(e) =>
            onChange({ ...scene, emoji: e.target.value || undefined })
          }
          placeholder="✨"
          maxLength={4}
        />
      </InputRow>
      <div className="grid grid-cols-2 gap-2">
        <VariantRow
          value={scene.variant}
          options={kineticTitleVariants}
          onChange={(v) =>
            onChange({ ...scene, variant: v as typeof scene.variant })
          }
        />
        <SfxRow
          value={scene.sfx}
          onChange={(v) =>
            onChange({ ...scene, sfx: v as typeof scene.sfx })
          }
        />
      </div>
      <InputRow label="Duration (frames @ 30fps)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(15, n) })}
          min={15}
        />
      </InputRow>
    </div>
  );
};

const StatRevealEditor: React.FC<{
  scene: Extract<Scene, { type: "statReveal" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => (
  <div className="space-y-3">
    <InputRow label="Value">
      <Field
        value={scene.value}
        onChange={(e) => onChange({ ...scene, value: e.target.value })}
        placeholder="47000"
      />
    </InputRow>
    <InputRow label="Suffix (optional)">
      <Field
        value={scene.suffix ?? ""}
        onChange={(e) =>
          onChange({ ...scene, suffix: e.target.value || undefined })
        }
        placeholder="+ / % / x"
        maxLength={3}
      />
    </InputRow>
    <InputRow label="Label">
      <Field
        value={scene.label}
        onChange={(e) => onChange({ ...scene, label: e.target.value })}
        placeholder="Teams shipping with us"
      />
    </InputRow>
    <div className="grid grid-cols-2 gap-2">
      <VariantRow
        value={scene.variant}
        options={statRevealVariants}
        onChange={(v) =>
          onChange({ ...scene, variant: v as typeof scene.variant })
        }
      />
      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
    </div>
    <InputRow label="Duration (frames)">
      <NumField
        value={scene.duration}
        onChange={(n) => onChange({ ...scene, duration: Math.max(15, n) })}
        min={15}
      />
    </InputRow>
  </div>
);

const FeatureGridEditor: React.FC<{
  scene: Extract<Scene, { type: "featureGrid" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => {
  const updateFeature = (idx: number, key: "title" | "body", value: string) => {
    const features = scene.features.map((f, i) =>
      i === idx ? { ...f, [key]: value } : f,
    );
    onChange({ ...scene, features });
  };
  return (
    <div className="space-y-3">
      <InputRow label="Heading">
        <Field
          value={scene.heading}
          onChange={(e) => onChange({ ...scene, heading: e.target.value })}
        />
      </InputRow>
      <div className="space-y-2">
        {scene.features.map((f, idx) => (
          <div
            key={idx}
            className="space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                Feature {idx + 1}
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...scene,
                    features: scene.features.filter((_, i) => i !== idx),
                  })
                }
                disabled={scene.features.length <= 2}
                className="text-white/30 transition hover:text-red-300 disabled:opacity-30"
              >
                ×
              </button>
            </div>
            <Field
              value={f.title}
              onChange={(e) => updateFeature(idx, "title", e.target.value)}
              placeholder="Title"
            />
            <Field
              value={f.body}
              onChange={(e) => updateFeature(idx, "body", e.target.value)}
              placeholder="Body"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          onChange({
            ...scene,
            features: [
              ...scene.features,
              { title: "New feature", body: "Describe it briefly." },
            ],
          })
        }
        disabled={scene.features.length >= 4}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-40"
      >
        + Feature
      </button>
      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
      <InputRow label="Duration (frames)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(15, n) })}
        />
      </InputRow>
    </div>
  );
};

const TestimonialQuoteEditor: React.FC<{
  scene: Extract<Scene, { type: "testimonialQuote" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => (
  <div className="space-y-3">
    <InputRow label="Quote">
      <textarea
        value={scene.quote}
        onChange={(e) => onChange({ ...scene, quote: e.target.value })}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-white/30"
        placeholder="What did your customer say?"
      />
    </InputRow>
    <InputRow label="Author">
      <Field
        value={scene.author}
        onChange={(e) => onChange({ ...scene, author: e.target.value })}
      />
    </InputRow>
    <div className="grid grid-cols-2 gap-2">
      <InputRow label="Role">
        <Field
          value={scene.role ?? ""}
          onChange={(e) =>
            onChange({ ...scene, role: e.target.value || undefined })
          }
          placeholder="Head of Eng"
        />
      </InputRow>
      <InputRow label="Company">
        <Field
          value={scene.company ?? ""}
          onChange={(e) =>
            onChange({ ...scene, company: e.target.value || undefined })
          }
          placeholder="Acme"
        />
      </InputRow>
    </div>
    <SfxRow
      value={scene.sfx}
      onChange={(v) =>
        onChange({ ...scene, sfx: v as typeof scene.sfx })
      }
    />
    <InputRow label="Duration (frames)">
      <NumField
        value={scene.duration}
        onChange={(n) => onChange({ ...scene, duration: Math.max(45, n) })}
      />
    </InputRow>
  </div>
);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/^-+|-+$/g, "");

const simpleIconsUrl = (name: string, color = "ffffff") =>
  `https://cdn.simpleicons.org/${slugify(name)}/${color.replace("#", "")}`;

const LogoWallEditor: React.FC<{
  scene: Extract<Scene, { type: "logoWall" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => {
  const updateLogo = (
    idx: number,
    key: "name" | "color" | "logoUrl",
    value: string | undefined,
  ) => {
    const logos = scene.logos.map((l, i) =>
      i === idx ? { ...l, [key]: value || undefined } : l,
    );
    onChange({ ...scene, logos });
  };
  const autoFillAll = () => {
    const logos = scene.logos.map((l) => ({
      ...l,
      logoUrl: l.logoUrl ?? simpleIconsUrl(l.name, l.color ?? "ffffff"),
    }));
    onChange({ ...scene, logos });
  };
  return (
    <div className="space-y-3">
      <InputRow label="Heading">
        <Field
          value={scene.heading}
          onChange={(e) => onChange({ ...scene, heading: e.target.value })}
        />
      </InputRow>
      <button
        onClick={autoFillAll}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/25 hover:text-white"
        title="Auto-fetch SVG logos from Simple Icons CDN for every row"
      >
        <span>✨</span>
        Auto-fetch all logos from Simple Icons
      </button>
      <div className="space-y-1.5">
        {scene.logos.map((logo, idx) => (
          <div
            key={idx}
            className="space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-2"
          >
            <div className="flex items-center gap-2">
              {logo.logoUrl ? (
                <img
                  src={logo.logoUrl}
                  alt={logo.name}
                  className="h-7 w-7 shrink-0 rounded object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <input
                  type="color"
                  value={logo.color ?? "#888888"}
                  onChange={(e) => updateLogo(idx, "color", e.target.value)}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                />
              )}
              <input
                value={logo.name}
                onChange={(e) => updateLogo(idx, "name", e.target.value)}
                className="flex-1 bg-transparent text-xs text-white outline-none"
                placeholder="Logo name (e.g. Stripe)"
              />
              <button
                onClick={() =>
                  updateLogo(
                    idx,
                    "logoUrl",
                    simpleIconsUrl(logo.name, logo.color ?? "ffffff"),
                  )
                }
                title="Auto-fetch from Simple Icons CDN"
                className="rounded px-1.5 py-0.5 text-[10px] text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                ✨
              </button>
              <button
                onClick={() =>
                  onChange({
                    ...scene,
                    logos: scene.logos.filter((_, i) => i !== idx),
                  })
                }
                disabled={scene.logos.length <= 3}
                className="text-white/30 transition hover:text-red-300 disabled:opacity-30"
              >
                ×
              </button>
            </div>
            <input
              value={logo.logoUrl ?? ""}
              onChange={(e) =>
                updateLogo(idx, "logoUrl", e.target.value || undefined)
              }
              className="w-full rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[10px] text-white/70 outline-none transition focus:border-white/25"
              placeholder="logo URL (https://… or leave empty for colored square)"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          onChange({
            ...scene,
            logos: [...scene.logos, { name: "New" }],
          })
        }
        disabled={scene.logos.length >= 12}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-40"
      >
        + Logo
      </button>
      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
      <InputRow label="Duration (frames)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(30, n) })}
        />
      </InputRow>
    </div>
  );
};

const CTACardEditor: React.FC<{
  scene: Extract<Scene, { type: "ctaCard" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => (
  <div className="space-y-3">
    <InputRow label="Headline">
      <Field
        value={scene.headline}
        onChange={(e) => onChange({ ...scene, headline: e.target.value })}
      />
    </InputRow>
    <InputRow label="Subtext (optional)">
      <Field
        value={scene.subtext ?? ""}
        onChange={(e) =>
          onChange({ ...scene, subtext: e.target.value || undefined })
        }
      />
    </InputRow>
    <InputRow label="Button label">
      <Field
        value={scene.buttonLabel}
        onChange={(e) => onChange({ ...scene, buttonLabel: e.target.value })}
      />
    </InputRow>
    <InputRow label="URL (optional)">
      <Field
        value={scene.url ?? ""}
        onChange={(e) =>
          onChange({ ...scene, url: e.target.value || undefined })
        }
        placeholder="yourdomain.com"
      />
    </InputRow>
    <div className="grid grid-cols-2 gap-2">
      <VariantRow
        value={scene.variant}
        options={ctaCardVariants}
        onChange={(v) =>
          onChange({ ...scene, variant: v as typeof scene.variant })
        }
      />
      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
    </div>
    <InputRow label="Duration (frames)">
      <NumField
        value={scene.duration}
        onChange={(n) => onChange({ ...scene, duration: Math.max(30, n) })}
      />
    </InputRow>
  </div>
);

type ShotForCanvas = Extract<Scene, { type: "uiShowcase" }>["screenshots"] extends
  | infer A
  | undefined
  ? A extends ReadonlyArray<infer Item>
    ? Item
    : never
  : never;

// Click-to-set canvases for a single shot. Two of them: zoom-target (inside
// the screenshot) and framePosition (where the device frame sits on the
// scene canvas). Each is independently expandable to full-screen.
const ShotCanvases: React.FC<{
  shot: ShotForCanvas;
  idx: number;
  isMaximizedZoom: boolean;
  isMaximizedFrame: boolean;
  onMaximize: (kind: "zoom" | "frame") => void;
  onCollapse: () => void;
  onUpdate: (patch: Partial<ShotForCanvas>) => void;
}> = ({
  shot,
  isMaximizedZoom,
  isMaximizedFrame,
  onMaximize,
  onCollapse,
  onUpdate,
}) => {
  const zoom = shot.zoom;
  const fp = shot.framePosition;
  const [aiBusy, setAiBusy] = useState<"zoom" | "frame" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Ask Gemini Vision to pick a focal point inside the screenshot.
  // Reuses /api/vision (returns suggestions on a 1000x600 grid) and uses the
  // top-ranked suggestion as the zoom target.
  const aiSuggestZoom = async () => {
    if (!shot.url) return;
    setAiBusy("zoom");
    setAiError(null);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotUrl: shot.url,
          caption: shot.label,
          duration: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vision call failed");
      const top = data.suggestions?.[0];
      if (!top) throw new Error("No focal point detected");
      onUpdate({
        zoom: {
          x: Math.max(0, Math.min(100, Math.round((top.x / 1000) * 100))),
          y: Math.max(0, Math.min(100, Math.round((top.y / 600) * 100))),
          scale: zoom?.scale ?? 1.6,
        },
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Vision failed");
    } finally {
      setAiBusy(null);
    }
  };

  // Frame-position presets pick a sensible {x, y, scale} for the device box
  // inside the video canvas. AI re-uses the existing /api/vision call to
  // place "important" content roughly center-weighted if focal point is in
  // the top half (pushes device down so the caption sits comfortably above).
  const aiSuggestFrame = async () => {
    if (!shot.url) return;
    setAiBusy("frame");
    setAiError(null);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotUrl: shot.url,
          caption: shot.label,
          duration: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vision call failed");
      const top = data.suggestions?.[0];
      if (!top) throw new Error("No focal point detected");
      // If focal point is in the top third of the screenshot, sink the device
      // down so caption sits above; if bottom third, raise it. Pick scale by
      // suggestion density (more suggestions = wider context = smaller frame).
      const verticalRatio = top.y / 600;
      const newY = verticalRatio < 0.33 ? 60 : verticalRatio > 0.66 ? 40 : 50;
      const newScale =
        (data.suggestions?.length ?? 1) >= 4 ? 0.85 : 1;
      onUpdate({
        framePosition: { x: 50, y: newY, scale: newScale },
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Vision failed");
    } finally {
      setAiBusy(null);
    }
  };

  const zoomPresets: { label: string; v: number }[] = [
    { label: "1×", v: 1 },
    { label: "1.2×", v: 1.2 },
    { label: "1.5×", v: 1.5 },
    { label: "2×", v: 2 },
    { label: "2.5×", v: 2.5 },
  ];

  const framePresets: { label: string; v: number }[] = [
    { label: "Inset", v: 0.7 },
    { label: "Snug", v: 0.85 },
    { label: "Natural", v: 1 },
    { label: "Large", v: 1.2 },
    { label: "Full", v: 1.4 },
  ];

  const positionPresets: { label: string; x: number; y: number }[] = [
    { label: "↖", x: 28, y: 30 },
    { label: "↑", x: 50, y: 30 },
    { label: "↗", x: 72, y: 30 },
    { label: "·", x: 50, y: 50 },
    { label: "↙", x: 28, y: 70 },
    { label: "↓", x: 50, y: 70 },
    { label: "↘", x: 72, y: 70 },
  ];

  // Zoom canvas — click on screenshot to set the focal point
  const zoomCanvas = (maximized: boolean) => (
    <>
      <div
        onClick={(e) => {
          const rect = (
            e.currentTarget as HTMLDivElement
          ).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onUpdate({
            zoom: {
              x: Math.max(0, Math.min(100, Math.round(x))),
              y: Math.max(0, Math.min(100, Math.round(y))),
              scale: zoom?.scale ?? 1.5,
            },
          });
        }}
        className="relative cursor-crosshair overflow-hidden rounded border border-white/10"
        style={{ aspectRatio: "16 / 10", width: "100%" }}
      >
        <img
          src={shot.url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
          }}
        />
        {/* Rule-of-thirds guide */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "33.333% 33.333%",
          }}
        />
        {zoom ? (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${zoom.x}%`,
              top: `${zoom.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="flex items-center justify-center rounded-full font-bold text-black shadow-lg"
              style={{
                background: "#FBBF24",
                width: maximized ? 28 : 18,
                height: maximized ? 28 : 18,
                fontSize: maximized ? 14 : 10,
              }}
            >
              +
            </div>
            <div
              className="absolute left-1/2 top-1/2 rounded-full border-2"
              style={{
                width: maximized ? 120 : 56,
                height: maximized ? 120 : 56,
                borderColor: "#FBBF24",
                transform: "translate(-50%, -50%)",
                opacity: 0.45,
              }}
            />
            {/* Faint scale ring preview */}
            <div
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: (maximized ? 200 : 90) * (zoom.scale / 1.5),
                height: (maximized ? 200 : 90) * (zoom.scale / 1.5),
                borderColor: "#FBBF24",
                transform: "translate(-50%, -50%)",
                opacity: 0.2,
                borderStyle: "dashed",
              }}
            />
          </div>
        ) : null}
      </div>
      {/* Scale presets + AI suggest */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {zoomPresets.map((p) => {
          const active = zoom && Math.abs(zoom.scale - p.v) < 0.01;
          return (
            <button
              key={p.label}
              onClick={() => {
                if (zoom) onUpdate({ zoom: { ...zoom, scale: p.v } });
                else onUpdate({ zoom: { x: 50, y: 50, scale: p.v } });
              }}
              className={`rounded px-2 py-1 text-[10px] transition ${
                active
                  ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                  : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={aiSuggestZoom}
          disabled={aiBusy === "zoom" || !shot.url}
          className="ml-auto rounded border border-violet-400/30 bg-violet-400/[0.08] px-2 py-1 text-[10px] text-violet-200 transition hover:bg-violet-400/[0.16] disabled:opacity-50"
        >
          {aiBusy === "zoom" ? "Thinking…" : "✨ AI place"}
        </button>
      </div>
      {zoom ? (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/45">
          <span>x{zoom.x.toFixed(0)}%</span>
          <span>y{zoom.y.toFixed(0)}%</span>
          <span className="ml-auto flex items-center gap-1">
            custom
            <input
              type="number"
              step="0.1"
              min="1"
              max="3"
              value={zoom.scale}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v))
                  onUpdate({ zoom: { ...zoom, scale: v } });
              }}
              className="w-12 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white outline-none"
            />
          </span>
        </div>
      ) : (
        <div className="mt-1.5 text-[10px] text-white/35">
          Click on the screenshot to set a focal point, or pick a scale preset to start at center.
        </div>
      )}
      {aiError && aiBusy === null ? (
        <div className="mt-1 text-[10px] text-red-300/80">{aiError}</div>
      ) : null}
    </>
  );

  // Frame-position canvas — represents the whole video frame; click to place
  // the device box. The drawn rectangle scales with framePosition.scale.
  const frameCanvas = (maximized: boolean) => (
    <>
      <div
        onClick={(e) => {
          const rect = (
            e.currentTarget as HTMLDivElement
          ).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          onUpdate({
            framePosition: {
              x: Math.max(0, Math.min(100, Math.round(x))),
              y: Math.max(0, Math.min(100, Math.round(y))),
              scale: fp?.scale ?? 1,
            },
          });
        }}
        className="relative cursor-crosshair overflow-hidden rounded border border-white/10 bg-[#08080b]"
        style={{ aspectRatio: "16 / 9", width: "100%" }}
      >
        {/* Grid + safe-area guides */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            backgroundPosition: "center",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            inset: "8%",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 6,
          }}
        />
        {/* Position indicator — a "device" rectangle at the framePosition */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${fp?.x ?? 50}%`,
            top: `${fp?.y ?? 50}%`,
            transform: `translate(-50%, -50%) scale(${fp?.scale ?? 1})`,
            transformOrigin: "center center",
          }}
        >
          <div
            className="rounded shadow-[0_0_24px_-4px_rgba(34,211,238,0.5)]"
            style={{
              width: maximized ? 180 : 110,
              height: maximized ? 112 : 68,
              border: "2px solid #22D3EE",
              background: "rgba(34, 211, 238, 0.12)",
            }}
          />
        </div>
        {/* Crosshair at exact placement point */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${fp?.x ?? 50}%`,
            top: `${fp?.y ?? 50}%`,
            transform: "translate(-50%, -50%)",
            width: maximized ? 14 : 8,
            height: maximized ? 14 : 8,
            background: "#22D3EE",
            borderRadius: "50%",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* Scale (zoom in / zoom out) presets */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {framePresets.map((p) => {
          const active = Math.abs((fp?.scale ?? 1) - p.v) < 0.01;
          return (
            <button
              key={p.label}
              onClick={() =>
                onUpdate({
                  framePosition: {
                    x: fp?.x ?? 50,
                    y: fp?.y ?? 50,
                    scale: p.v,
                  },
                })
              }
              className={`rounded px-2 py-1 text-[10px] transition ${
                active
                  ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={aiSuggestFrame}
          disabled={aiBusy === "frame" || !shot.url}
          className="ml-auto rounded border border-violet-400/30 bg-violet-400/[0.08] px-2 py-1 text-[10px] text-violet-200 transition hover:bg-violet-400/[0.16] disabled:opacity-50"
        >
          {aiBusy === "frame" ? "Thinking…" : "✨ AI place"}
        </button>
      </div>

      {/* Quick anchor positions */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-white/30">
          anchor
        </span>
        {positionPresets.map((p) => {
          const active =
            Math.abs((fp?.x ?? 50) - p.x) < 1 &&
            Math.abs((fp?.y ?? 50) - p.y) < 1;
          return (
            <button
              key={p.label}
              onClick={() =>
                onUpdate({
                  framePosition: {
                    x: p.x,
                    y: p.y,
                    scale: fp?.scale ?? 1,
                  },
                })
              }
              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] transition ${
                active
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/45">
        <span>x{(fp?.x ?? 50).toFixed(0)}%</span>
        <span>y{(fp?.y ?? 50).toFixed(0)}%</span>
        <span className="ml-auto flex items-center gap-1">
          custom
          <input
            type="number"
            step="0.05"
            min="0.3"
            max="1.5"
            value={fp?.scale ?? 1}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v))
                onUpdate({
                  framePosition: {
                    x: fp?.x ?? 50,
                    y: fp?.y ?? 50,
                    scale: v,
                  },
                });
            }}
            className="w-12 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white outline-none"
          />
        </span>
      </div>
    </>
  );

  const overlayWrap = (
    label: string,
    body: React.ReactNode,
    onClear?: () => void,
  ) => (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 backdrop-blur-xl"
      onClick={onCollapse}
    >
      <div
        className="flex w-full max-w-[1100px] items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/55">
          {label} · Esc to close
        </span>
        <div className="flex items-center gap-2">
          {onClear ? (
            <button
              onClick={onClear}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-red-500/40 hover:text-red-300"
            >
              clear
            </button>
          ) : null}
          <button
            onClick={onCollapse}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
          >
            × Close
          </button>
        </div>
      </div>
      <div
        className="w-full"
        style={{
          width: "min(95vw, calc(80vh * 16 / 10))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Zoom canvas — full width */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
              Zoom target
            </div>
            <div className="text-[10px] text-white/35">
              Click the screenshot to set what gets zoomed into
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {zoom ? (
              <button
                onClick={() => onUpdate({ zoom: undefined })}
                className="text-white/40 hover:text-red-300"
              >
                clear
              </button>
            ) : null}
            <button
              onClick={() => onMaximize("zoom")}
              className="text-white/40 hover:text-white"
              title="Expand"
            >
              ⛶ expand
            </button>
          </div>
        </div>
        {zoomCanvas(false)}
      </div>

      {/* Frame position canvas — full width */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
              Frame position &amp; zoom
            </div>
            <div className="text-[10px] text-white/35">
              Where the device sits on the video canvas — scale to zoom in / out
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            {fp ? (
              <button
                onClick={() => onUpdate({ framePosition: undefined })}
                className="text-white/40 hover:text-red-300"
              >
                reset
              </button>
            ) : null}
            <button
              onClick={() => onMaximize("frame")}
              className="text-white/40 hover:text-white"
              title="Expand"
            >
              ⛶ expand
            </button>
          </div>
        </div>
        {frameCanvas(false)}
      </div>

      {isMaximizedZoom
        ? overlayWrap("Zoom target", zoomCanvas(true), () =>
            onUpdate({ zoom: undefined }),
          )
        : null}
      {isMaximizedFrame
        ? overlayWrap("Frame position", frameCanvas(true), () =>
            onUpdate({ framePosition: undefined }),
          )
        : null}
    </div>
  );
};

const UiShowcaseEditor: React.FC<{
  scene: Extract<Scene, { type: "uiShowcase" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => {
  // shots is the canonical list; if user has only the legacy screenshot field,
  // surface that as a single-shot entry.
  const shots =
    scene.screenshots && scene.screenshots.length > 0
      ? scene.screenshots
      : scene.screenshot
        ? [{ url: scene.screenshot, frame: scene.frame }]
        : [];

  const setShots = (next: typeof shots) => {
    onChange({
      ...scene,
      screenshots: next,
      // Clear legacy field when migrating
      screenshot: undefined,
    });
  };

  const updateShot = (
    idx: number,
    patch: Partial<(typeof shots)[number]>,
  ) => {
    setShots(shots.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeShot = (idx: number) => {
    setShots(shots.filter((_, i) => i !== idx));
  };

  const moveShot = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= shots.length) return;
    const next = [...shots];
    [next[idx], next[target]] = [next[target], next[idx]];
    setShots(next);
  };

  const [uploadingIdx, setUploadingIdx] = useState<number | "new" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [maximizedTarget, setMaximizedTarget] = useState<{
    idx: number;
    kind: "zoom" | "frame";
  } | null>(null);

  useEffect(() => {
    if (!maximizedTarget) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximizedTarget(null);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [maximizedTarget]);

  const upload = async (
    file: File,
    target: { kind: "replace"; idx: number } | { kind: "add" },
  ) => {
    setUploadingIdx(target.kind === "add" ? "new" : target.idx);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      if (target.kind === "replace") {
        updateShot(target.idx, { url: data.url });
      } else {
        setShots([
          ...shots,
          {
            url: data.url,
            transitionIn:
              shots.length === 0 ? "fade" : "slide-left",
          },
        ]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      <InputRow label="Caption (optional)">
        <Field
          value={scene.caption ?? ""}
          onChange={(e) =>
            onChange({ ...scene, caption: e.target.value || undefined })
          }
          placeholder="See it in action."
        />
      </InputRow>

      <div className="grid grid-cols-2 gap-2">
        <InputRow label="Default device frame">
          <Select
            value={scene.frame ?? "browser"}
            options={uiShowcaseFrames}
            onChange={(v) =>
              onChange({ ...scene, frame: v as typeof scene.frame })
            }
          />
        </InputRow>
        <InputRow label="URL bar text">
          <Field
            value={scene.url ?? ""}
            onChange={(e) =>
              onChange({ ...scene, url: e.target.value || undefined })
            }
            placeholder="your-product.com"
          />
        </InputRow>
      </div>

      {/* Shot list */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            Screenshots ({shots.length})
          </span>
          <span className="text-[9px] text-white/30">
            sequence plays in order
          </span>
        </div>
        <div className="space-y-2">
          {shots.map((shot, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <input
                  ref={(el) => {
                    fileInputs.current[`shot-${idx}`] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f, { kind: "replace", idx });
                  }}
                  className="hidden"
                />
                {shot.url ? (
                  <img
                    src={shot.url}
                    alt=""
                    className="h-10 w-16 shrink-0 cursor-pointer rounded border border-white/10 object-cover"
                    onClick={() =>
                      fileInputs.current[`shot-${idx}`]?.click()
                    }
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity =
                        "0.3";
                    }}
                  />
                ) : (
                  <div
                    className="flex h-10 w-16 shrink-0 cursor-pointer items-center justify-center rounded border border-dashed border-white/15 text-[10px] text-white/30"
                    onClick={() =>
                      fileInputs.current[`shot-${idx}`]?.click()
                    }
                  >
                    upload
                  </div>
                )}
                <Field
                  value={shot.label ?? ""}
                  onChange={(e) =>
                    updateShot(idx, {
                      label: e.target.value || undefined,
                    })
                  }
                  placeholder="Label (optional)"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => moveShot(idx, -1)}
                    disabled={idx === 0}
                    className="text-white/35 transition hover:text-white disabled:opacity-25"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveShot(idx, 1)}
                    disabled={idx === shots.length - 1}
                    className="text-white/35 transition hover:text-white disabled:opacity-25"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeShot(idx)}
                    className="text-white/30 transition hover:text-red-300"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Per-shot transition + frame override */}
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">
                    Enter
                  </div>
                  <Select
                    value={shot.transitionIn ?? "fade"}
                    options={uiShowcaseTransitions}
                    onChange={(v) =>
                      updateShot(idx, {
                        transitionIn: v as typeof shot.transitionIn,
                      })
                    }
                  />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">
                    Frame
                  </div>
                  <Select
                    value={shot.frame ?? scene.frame ?? "browser"}
                    options={uiShowcaseFrames}
                    onChange={(v) =>
                      updateShot(idx, {
                        frame: v as typeof shot.frame,
                      })
                    }
                  />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-white/30">
                    Weight
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={shot.weight ?? 1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v)) updateShot(idx, { weight: v });
                    }}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-white/30"
                  />
                </div>
              </div>

              {/* Two click-canvases: zoom target + frame position */}
              {shot.url ? (
                <ShotCanvases
                  shot={shot}
                  idx={idx}
                  isMaximizedZoom={
                    maximizedTarget?.idx === idx &&
                    maximizedTarget.kind === "zoom"
                  }
                  isMaximizedFrame={
                    maximizedTarget?.idx === idx &&
                    maximizedTarget.kind === "frame"
                  }
                  onMaximize={(kind) => setMaximizedTarget({ idx, kind })}
                  onCollapse={() => setMaximizedTarget(null)}
                  onUpdate={(patch) => updateShot(idx, patch)}
                />
              ) : null}
            </div>
          ))}
        </div>

        {/* Add screenshot button */}
        <input
          ref={(el) => {
            fileInputs.current[`add`] = el;
          }}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f, { kind: "add" });
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputs.current[`add`]?.click()}
          disabled={uploadingIdx !== null}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          {uploadingIdx === "new" ? "Uploading…" : "+ Add screenshot"}
        </button>

        {uploadError ? (
          <div className="mt-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
            {uploadError}
          </div>
        ) : null}
      </div>

      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
      <InputRow label="Duration (frames)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(45, n) })}
        />
      </InputRow>
    </div>
  );
};

const ProductCarouselEditor: React.FC<{
  scene: Extract<Scene, { type: "productCarousel" }>;
  onChange: (next: Scene) => void;
}> = ({ scene, onChange }) => {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const updateProduct = (idx: number, patch: Partial<typeof scene.products[number]>) => {
    const products = scene.products.map((p, i) =>
      i === idx ? { ...p, ...patch } : p,
    );
    onChange({ ...scene, products });
  };

  const removeProduct = (idx: number) => {
    onChange({
      ...scene,
      products: scene.products.filter((_, i) => i !== idx),
    });
  };

  const addProduct = () => {
    onChange({
      ...scene,
      products: [
        ...scene.products,
        {
          name: "New product",
          category: "Category",
          price: "$0",
          ctaLabel: "View Product",
        },
      ],
    });
  };

  const handleUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      updateProduct(idx, { image: data.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIdx(null);
      const input = fileInputs.current[idx];
      if (input) input.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <InputRow label="Heading (optional)">
        <Field
          value={scene.heading ?? ""}
          onChange={(e) =>
            onChange({ ...scene, heading: e.target.value || undefined })
          }
          placeholder="Featured products."
        />
      </InputRow>

      <InputRow label="Visual style">
        <Select
          value={scene.style ?? "classic"}
          options={productCarouselStyles}
          onChange={(v) =>
            onChange({ ...scene, style: v as typeof scene.style })
          }
        />
      </InputRow>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            Products
          </span>
          <span className="text-[10px] text-white/30">
            {scene.products.length} / 8
          </span>
        </div>
        <div className="space-y-2">
          {scene.products.map((product, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                  {String(idx + 1).padStart(2, "0")} ·{" "}
                  {product.featured ? "featured" : "card"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateProduct(idx, { featured: !product.featured })
                    }
                    className={`rounded-md px-2 py-0.5 text-[10px] transition ${
                      product.featured
                        ? "bg-amber-500/30 text-amber-200"
                        : "border border-white/10 text-white/50 hover:text-white/80"
                    }`}
                    title="Toggle featured (only one should be true)"
                  >
                    ★
                  </button>
                  <button
                    onClick={() => removeProduct(idx)}
                    disabled={scene.products.length <= 2}
                    className="text-white/30 transition hover:text-red-300 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Image upload + preview */}
              <div className="flex gap-2">
                <input
                  ref={(el) => {
                    fileInputs.current[idx] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(idx, f);
                  }}
                  className="hidden"
                />
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div
                    className="flex h-12 w-20 shrink-0 items-center justify-center rounded border border-dashed border-white/15 text-[9px] text-white/30"
                  >
                    no image
                  </div>
                )}
                <button
                  onClick={() => fileInputs.current[idx]?.click()}
                  disabled={uploadingIdx === idx}
                  className="flex-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/70 transition hover:border-white/20 disabled:opacity-50"
                >
                  {uploadingIdx === idx
                    ? "Uploading…"
                    : product.image
                      ? "Replace image"
                      : "Upload image"}
                </button>
                {product.image ? (
                  <button
                    onClick={() => updateProduct(idx, { image: undefined })}
                    className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/30 transition hover:border-red-500/30 hover:text-red-300"
                    title="Remove image"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {/* Name */}
              <Field
                value={product.name}
                onChange={(e) => updateProduct(idx, { name: e.target.value })}
                placeholder="Product name"
              />

              {/* Category + accent color */}
              <div className="flex gap-2">
                <Field
                  value={product.category ?? ""}
                  onChange={(e) =>
                    updateProduct(idx, {
                      category: e.target.value || undefined,
                    })
                  }
                  placeholder="Category"
                />
                <input
                  type="color"
                  value={product.accent ?? "#1E40AF"}
                  onChange={(e) =>
                    updateProduct(idx, { accent: e.target.value })
                  }
                  className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                  title="Per-card accent color"
                />
              </div>

              {/* Price + SKU */}
              <div className="grid grid-cols-2 gap-2">
                <Field
                  value={product.price ?? ""}
                  onChange={(e) =>
                    updateProduct(idx, { price: e.target.value || undefined })
                  }
                  placeholder="$49"
                />
                <Field
                  value={product.sku ?? ""}
                  onChange={(e) =>
                    updateProduct(idx, { sku: e.target.value || undefined })
                  }
                  placeholder="SKU"
                />
              </div>

              {/* Rating + reviewCount */}
              <div className="grid grid-cols-2 gap-2">
                <Field
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={product.rating ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateProduct(idx, {
                      rating: v === "" ? undefined : Number(v),
                    });
                  }}
                  placeholder="Rating 0-5"
                />
                <Field
                  type="number"
                  min="0"
                  value={product.reviewCount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateProduct(idx, {
                      reviewCount: v === "" ? undefined : Number(v),
                    });
                  }}
                  placeholder="Reviews"
                />
              </div>

              <Field
                value={product.ctaLabel ?? ""}
                onChange={(e) =>
                  updateProduct(idx, {
                    ctaLabel: e.target.value || undefined,
                  })
                }
                placeholder="Button label (default: View Product)"
              />
            </div>
          ))}
        </div>
        {uploadError ? (
          <div className="mt-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
            {uploadError}
          </div>
        ) : null}
        <button
          onClick={addProduct}
          disabled={scene.products.length >= 8}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-40"
        >
          + Product
        </button>
      </div>

      <SfxRow
        value={scene.sfx}
        onChange={(v) =>
          onChange({ ...scene, sfx: v as typeof scene.sfx })
        }
      />
      <InputRow label="Duration (frames)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(60, n) })}
        />
      </InputRow>
    </div>
  );
};

const STAGE_W = 1000;
const STAGE_H = 600;

const ProductDemoEditor: React.FC<{
  scene: Extract<Scene, { type: "productDemo" }>;
  brand: Brand;
  onChange: (next: Scene) => void;
}> = ({ scene, brand, onChange }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const updateAction = (idx: number, next: Action) => {
    const actions = scene.actions.map((a, i) => (i === idx ? next : a));
    onChange({ ...scene, actions });
  };

  const removeAction = (idx: number) => {
    onChange({
      ...scene,
      actions: scene.actions.filter((_, i) => i !== idx),
    });
  };

  const addClickAt = (sceneX: number, sceneY: number) => {
    const lastAt =
      scene.actions[scene.actions.length - 1]?.at ??
      Math.floor(scene.duration / 4);
    onChange({
      ...scene,
      actions: [
        ...scene.actions,
        {
          at: Math.min(lastAt + 30, scene.duration - 10),
          type: "click",
          x: Math.round(sceneX),
          y: Math.round(sceneY),
          label: "New pin",
        },
      ],
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging !== null) return;
    if (!canvasRef.current) return;
    if ((e.target as HTMLElement).dataset.pin) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sceneX = ((e.clientX - rect.left) / rect.width) * STAGE_W;
    const sceneY = ((e.clientY - rect.top) / rect.height) * STAGE_H;
    addClickAt(sceneX, sceneY);
  };

  const handlePointerDown = (idx: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(idx);
  };

  const handlePointerMove = (idx: number) => (e: React.PointerEvent) => {
    if (dragging !== idx) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sceneX = ((e.clientX - rect.left) / rect.width) * STAGE_W;
    const sceneY = ((e.clientY - rect.top) / rect.height) * STAGE_H;
    const action = scene.actions[idx];
    if (!action || action.type === "reset") return;
    updateAction(idx, {
      ...action,
      x: Math.max(0, Math.min(STAGE_W, Math.round(sceneX))),
      y: Math.max(0, Math.min(STAGE_H, Math.round(sceneY))),
    });
  };

  const handlePointerUp = () => setDragging(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [maximized]);

  const handleSuggest = async () => {
    if (!scene.screenshot) return;
    setVisionLoading(true);
    setVisionError(null);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          screenshotUrl: scene.screenshot,
          caption: scene.caption,
          duration: scene.duration,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Vision error ${res.status}`);
      }
      const data = (await res.json()) as {
        actions: typeof scene.actions;
      };
      onChange({ ...scene, actions: data.actions });
    } catch (e) {
      setVisionError(e instanceof Error ? e.message : "Vision failed");
    } finally {
      setVisionLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      onChange({ ...scene, screenshot: data.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <InputRow label="Caption (optional)">
        <Field
          value={scene.caption ?? ""}
          onChange={(e) =>
            onChange({ ...scene, caption: e.target.value || undefined })
          }
          placeholder="Headline above the demo"
        />
      </InputRow>

      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">
          Screenshot
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 disabled:opacity-50"
          >
            {uploading
              ? "Uploading…"
              : scene.screenshot
                ? "Replace screenshot"
                : "Upload screenshot"}
          </button>
          {scene.screenshot ? (
            <button
              onClick={() => onChange({ ...scene, screenshot: undefined })}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/50 transition hover:border-red-500/30 hover:text-red-300"
              title="Use mock dashboard instead"
            >
              ×
            </button>
          ) : null}
        </div>
        {scene.screenshot ? (
          <div className="mt-1 truncate text-[10px] text-white/30">
            {scene.screenshot}
          </div>
        ) : (
          <div className="mt-1 text-[10px] text-white/30">
            No upload — mock dashboard will render
          </div>
        )}
        {uploadError ? (
          <div className="mt-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
            {uploadError}
          </div>
        ) : null}
      </div>

      {scene.screenshot ? (
        <div>
          <button
            onClick={handleSuggest}
            disabled={visionLoading}
            title="Use Gemini Vision to detect clickable elements and place pins"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-300/50 hover:from-violet-500/25 hover:to-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>✨</span>
            {visionLoading
              ? "Analyzing screenshot…"
              : "Suggest cursor path with AI"}
          </button>
          {visionError ? (
            <div className="mt-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
              {visionError}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-white/30">
              Replaces current pins · cost ~$0 on Gemini free tier
            </div>
          )}
        </div>
      ) : null}

      <div
        className={
          maximized
            ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 backdrop-blur-xl"
            : ""
        }
        onClick={maximized ? () => setMaximized(false) : undefined}
      >
        <div
          className={
            maximized
              ? "flex w-full max-w-[1400px] items-center justify-between"
              : "mb-1.5 flex items-center justify-between"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            {maximized
              ? "Editing cursor path — drag pins · click empty space to add · Esc to close"
              : "Cursor path · click to add · drag pins to move"}
          </span>
          <button
            type="button"
            onClick={() => setMaximized((v) => !v)}
            title={maximized ? "Collapse (Esc)" : "Expand canvas for precise editing"}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/60 transition hover:border-white/30 hover:text-white"
          >
            {maximized ? "× Close" : "⛶ Expand"}
          </button>
        </div>
        <div
          ref={canvasRef}
          onClick={(e) => {
            e.stopPropagation();
            handleCanvasClick(e);
          }}
          className="relative cursor-crosshair overflow-hidden rounded-lg border border-white/10 bg-[#0e0e12]"
          style={{
            aspectRatio: `${STAGE_W} / ${STAGE_H}`,
            width: maximized ? "min(95vw, calc(80vh * 1000 / 600))" : "100%",
            maxHeight: maximized ? "80vh" : undefined,
          }}
        >
          <div className="pointer-events-none absolute inset-0 flex">
            <div className="h-full w-1/5 border-r border-white/5 bg-black/30 p-1.5 text-[6px] text-white/30">
              <div style={{ color: brand.accent, fontWeight: 700 }}>
                {brand.name}
              </div>
              <div className="mt-1 space-y-0.5">
                {["Inbox", "Cycles", "Projects", "Roadmap"].map((s, i) => (
                  <div
                    key={s}
                    style={{
                      background: i === 1 ? `${brand.accent}33` : "transparent",
                      borderRadius: 2,
                      padding: "1px 3px",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 p-1.5">
              <div className="flex justify-end">
                <div
                  style={{
                    background: brand.accent,
                    color: "#000",
                    fontSize: 6,
                    padding: "1px 4px",
                    borderRadius: 2,
                  }}
                >
                  + New
                </div>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {["23", "12", "47"].map((n) => (
                  <div
                    key={n}
                    className="rounded bg-white/5 px-1 py-1 text-[8px] font-bold text-white"
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div className="mt-1 space-y-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded bg-white/5"
                  />
                ))}
              </div>
            </div>
          </div>

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            preserveAspectRatio="none"
          >
            {scene.actions
              .filter((a) => a.type !== "reset")
              .map((a, idx, arr) => {
                if (idx === 0) return null;
                const prev = arr[idx - 1] as Action & { x: number; y: number };
                const curr = a as Action & { x: number; y: number };
                return (
                  <line
                    key={idx}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke={brand.accent}
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    opacity={0.5}
                  />
                );
              })}
          </svg>

          {scene.actions.map((a, idx) => {
            if (a.type === "reset") return null;
            const isClick = a.type === "click";
            const isZoom = a.type === "zoom";
            const color = isClick
              ? brand.accent
              : isZoom
                ? "#F59E0B"
                : "#ffffff";
            const tooltip = `${a.type} @ frame ${a.at}${
              "label" in a && a.label ? " · " + a.label : ""
            }`;
            return (
              <div
                key={idx}
                className="group absolute"
                style={{
                  left: `${(a.x / STAGE_W) * 100}%`,
                  top: `${(a.y / STAGE_H) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  data-pin="1"
                  onPointerDown={handlePointerDown(idx)}
                  onPointerMove={handlePointerMove(idx)}
                  onPointerUp={handlePointerUp}
                  title={tooltip}
                  className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full border-2 text-[11px] font-bold text-black shadow-lg transition active:cursor-grabbing"
                  style={{
                    background: color,
                    borderColor: "rgba(0,0,0,0.5)",
                  }}
                >
                  {idx + 1}
                </div>
                <button
                  type="button"
                  data-pin="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAction(idx);
                  }}
                  title="Delete pin"
                  className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-md transition hover:bg-red-400 group-hover:flex"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className={
            maximized
              ? "flex w-full max-w-[1400px] items-center gap-3 text-[10px] text-white/40"
              : "mt-1.5 flex items-center gap-3 text-[10px] text-white/40"
          }
        >
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: brand.accent }}
            />
            click
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
            zoom
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-white" />
            move
          </span>
          <span className="ml-auto">{scene.actions.length} pins</span>
        </div>
      </div>

      <InputRow label="Duration (frames)">
        <NumField
          value={scene.duration}
          onChange={(n) => onChange({ ...scene, duration: Math.max(60, n) })}
          min={60}
        />
      </InputRow>
    </div>
  );
};

export const SceneEditor: React.FC<Props> = ({
  scene,
  brand,
  onChange,
  onDelete,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">
            Edit scene
          </div>
          <div className="text-sm font-medium text-white">
            {scene.type === "kineticTitle"
              ? "Kinetic Title"
              : scene.type === "statReveal"
                ? "Stat Reveal"
                : scene.type === "featureGrid"
                  ? "Feature Grid"
                  : scene.type === "productDemo"
                    ? "Product Demo"
                    : scene.type === "testimonialQuote"
                      ? "Testimonial Quote"
                      : scene.type === "logoWall"
                        ? "Logo Wall"
                        : scene.type === "ctaCard"
                          ? "CTA Card"
                          : scene.type === "multiScript"
                            ? "Multi-Script"
                            : scene.type === "productCarousel"
                              ? "Product Carousel"
                              : "UI Showcase"}
          </div>
        </div>
        {onDelete ? (
          <button
            onClick={onDelete}
            className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/50 transition hover:border-red-500/30 hover:text-red-300"
          >
            Delete scene
          </button>
        ) : null}
      </div>

      {scene.type === "kineticTitle" ? (
        <KineticTitleEditor scene={scene} onChange={onChange} />
      ) : scene.type === "statReveal" ? (
        <StatRevealEditor scene={scene} onChange={onChange} />
      ) : scene.type === "featureGrid" ? (
        <FeatureGridEditor scene={scene} onChange={onChange} />
      ) : scene.type === "productDemo" ? (
        <ProductDemoEditor scene={scene} brand={brand} onChange={onChange} />
      ) : scene.type === "testimonialQuote" ? (
        <TestimonialQuoteEditor scene={scene} onChange={onChange} />
      ) : scene.type === "logoWall" ? (
        <LogoWallEditor scene={scene} onChange={onChange} />
      ) : scene.type === "ctaCard" ? (
        <CTACardEditor scene={scene} onChange={onChange} />
      ) : scene.type === "multiScript" ? (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-[11px] text-white/60">
          Multi-script glyph morph — edit via JSON for now (
          {scene.glyphs.length} glyphs ·{" "}
          {scene.glyphs.map((g) => g.char).join(" → ")}).
        </div>
      ) : scene.type === "productCarousel" ? (
        <ProductCarouselEditor scene={scene} onChange={onChange} />
      ) : (
        <UiShowcaseEditor scene={scene} onChange={onChange} />
      )}
    </div>
  );
};

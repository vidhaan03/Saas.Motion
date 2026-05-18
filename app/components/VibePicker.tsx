"use client";

import { VIBE_KEYS, VIBES, type VibeKey } from "../../remotion/vibes";
import { TYPEFACES } from "../../remotion/fonts";

type Props = {
  value: VibeKey | undefined;
  onChange: (next: VibeKey | undefined) => void;
};

// Vibe pills. Each pill renders its label in the vibe's preferred
// typeface — a visual hint of how the output will feel. "Auto" =
// undefined (no override; renderer falls back to DEFAULT_VIBE).
export const VibePicker = ({ value, onChange }: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Pill
        active={value === undefined}
        onClick={() => onChange(undefined)}
        family="var(--font-mono), monospace"
        label="Auto"
        description="Use default (minimal)"
      />
      {VIBE_KEYS.map((key) => {
        const v = VIBES[key];
        const family = TYPEFACES[v.typefaceBias].family;
        return (
          <Pill
            key={key}
            active={value === key}
            onClick={() => onChange(key)}
            family={family}
            label={v.label}
            description={v.description}
          />
        );
      })}
    </div>
  );
};

const Pill = ({
  active,
  onClick,
  family,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  family: string;
  label: string;
  description: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={description}
    className="rounded-full border px-2.5 py-1 text-[12px] transition hover:opacity-90"
    style={{
      borderColor: active
        ? "var(--ink)"
        : "color-mix(in srgb, var(--ink) 12%, transparent)",
      background: active
        ? "var(--ink)"
        : "color-mix(in srgb, var(--ink) 3%, transparent)",
      color: active ? "var(--bg)" : "var(--ink)",
      fontFamily: family,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

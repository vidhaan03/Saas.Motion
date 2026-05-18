"use client";

import {
  TYPEFACE_KEYS,
  TYPEFACES,
  type TypefaceKey,
} from "../../remotion/fonts";

type Props = {
  value: TypefaceKey | undefined;
  onChange: (next: TypefaceKey | undefined) => void;
  // "compact" = inline single-row scroll; "stacked" = wraps onto multiple
  // rows. The brand kit card in the editor sidebar uses stacked; the
  // welcome view's cramped settings row uses compact.
  layout?: "compact" | "stacked";
};

// Pill list where each typeface's display label is rendered in its own
// font family. "Auto" pill = inherit (undefined value).
export const TypefacePicker = ({
  value,
  onChange,
  layout = "stacked",
}: Props) => {
  const wrap =
    layout === "compact"
      ? "flex items-center gap-1 overflow-x-auto"
      : "flex flex-wrap items-center gap-1";

  return (
    <div className={wrap}>
      <Pill
        active={value === undefined}
        onClick={() => onChange(undefined)}
        family="var(--font-mono), monospace"
        label="Auto"
      />
      {TYPEFACE_KEYS.map((key) => (
        <Pill
          key={key}
          active={value === key}
          onClick={() => onChange(key)}
          family={TYPEFACES[key].family}
          label={TYPEFACES[key].label}
        />
      ))}
    </div>
  );
};

const Pill = ({
  active,
  onClick,
  family,
  label,
}: {
  active: boolean;
  onClick: () => void;
  family: string;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
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

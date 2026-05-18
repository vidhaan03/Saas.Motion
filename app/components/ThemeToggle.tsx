"use client";

import { useTheme, type ThemeSetting } from "../hooks/useTheme";

// Compact three-button pill: System · Light · Dark. The icon is the
// truth of which is active. Designed to live inside the UserMenu
// dropdown but works as a standalone control too.

const OPTIONS: { value: ThemeSetting; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "⌒" },
  { value: "light", label: "Light", icon: "○" },
  { value: "dark", label: "Dark", icon: "●" },
];

export const ThemeToggle = ({ compact }: { compact?: boolean }) => {
  const { setting, setTheme } = useTheme();

  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        borderRadius: 999,
        background: "color-mix(in srgb, var(--ink) 6%, transparent)",
        border:
          "1px solid color-mix(in srgb, var(--ink) 10%, transparent)",
      }}
    >
      {OPTIONS.map((opt) => {
        const active = setting === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: compact ? 0 : 4,
              padding: compact ? "3px 8px" : "4px 10px",
              fontSize: compact ? 11 : 12,
              borderRadius: 999,
              border: 0,
              cursor: "pointer",
              background: active
                ? "var(--ink)"
                : "transparent",
              color: active ? "var(--bg)" : "var(--ink-muted)",
              transition: "background 120ms ease",
            }}
            title={`${opt.label} theme`}
            aria-pressed={active}
          >
            <span style={{ fontSize: compact ? 10 : 11 }}>{opt.icon}</span>
            {compact ? null : <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

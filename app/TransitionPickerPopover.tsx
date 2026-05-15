"use client";

import { useEffect, useRef } from "react";
import { TRANSITION_KEYS } from "../remotion/schema";

type Props = {
  anchor: { x: number; y: number };
  current: string | undefined;
  onPick: (value: string) => void;
  onClose: () => void;
};

const LABELS: Record<string, { label: string; desc: string }> = {
  auto: { label: "Auto", desc: "Pick by scene type" },
  fade: { label: "Fade", desc: "Soft cross-dissolve" },
  "wipe-up": { label: "Wipe up", desc: "Curtain reveals upward" },
  "wipe-down": { label: "Wipe down", desc: "Curtain reveals downward" },
  "wipe-left": { label: "Wipe ←", desc: "Curtain pulls left" },
  "wipe-right": { label: "Wipe →", desc: "Curtain pulls right" },
  "slide-up": { label: "Slide ↑", desc: "Push from bottom" },
  "slide-down": { label: "Slide ↓", desc: "Push from top" },
  "slide-left": { label: "Slide ←", desc: "Push from right" },
  "slide-right": { label: "Slide →", desc: "Push from left" },
  cut: { label: "Cut", desc: "Hard cut, no transition" },
};

export const TransitionPickerPopover: React.FC<Props> = ({
  anchor,
  current,
  onPick,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[240px] overflow-hidden rounded-xl border border-white/10 bg-[#15151a]/95 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      style={{
        left: Math.min(anchor.x, window.innerWidth - 260),
        top: Math.min(anchor.y, window.innerHeight - 400),
      }}
    >
      <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/45">
        Transition
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {TRANSITION_KEYS.map((key) => {
          const info = LABELS[key];
          const isActive = current === key || (!current && key === "auto");
          return (
            <button
              key={key}
              onClick={() => {
                onPick(key);
                onClose();
              }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-white">
                  {info.label}
                </div>
                <div className="truncate text-[10px] text-white/45">
                  {info.desc}
                </div>
              </div>
              {isActive ? (
                <span className="text-white/70">✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

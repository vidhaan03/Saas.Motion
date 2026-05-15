"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export type TransitionEdgeData = {
  transition?: string; // matches TRANSITION_KEYS
  onClick?: (id: string, screenX: number, screenY: number) => void;
};

const LABEL_FOR: Record<string, string> = {
  fade: "fade",
  "wipe-up": "wipe ↑",
  "wipe-down": "wipe ↓",
  "wipe-left": "wipe ←",
  "wipe-right": "wipe →",
  "slide-up": "slide ↑",
  "slide-down": "slide ↓",
  "slide-left": "slide ←",
  "slide-right": "slide →",
  cut: "cut",
  auto: "auto",
};

export const TransitionEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const d = data as unknown as TransitionEdgeData | undefined;
  const transitionLabel = d?.transition && d.transition !== "auto"
    ? LABEL_FOR[d.transition] ?? "auto"
    : "auto";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            d?.onClick?.(id, e.clientX, e.clientY);
          }}
          className="nodrag nopan absolute rounded-full border border-white/15 bg-[#15151a]/95 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white/70 backdrop-blur transition hover:border-white/40 hover:text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {transitionLabel}
        </button>
      </EdgeLabelRenderer>
    </>
  );
};

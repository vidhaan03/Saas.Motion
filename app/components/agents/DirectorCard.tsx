// The single Director agent card at the top of the agent pipeline.
// Renders three states: spawning (no trace yet) / thinking / done / failed.

type DirectorTrace = {
  status: "thinking" | "done" | "failed";
  message: string;
  ms?: number;
} | null;

type Props = {
  trace: DirectorTrace;
};

export const DirectorCard = ({ trace }: Props) => (
  <div
    className="relative rounded-2xl border p-4 backdrop-blur transition-all"
    style={{
      animation: "sceneArrive 400ms ease-out",
      background: "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
      borderColor:
        trace?.status === "done"
          ? "color-mix(in srgb, var(--ink) 18%, transparent)"
          : "color-mix(in srgb, var(--ink) 10%, transparent)",
      boxShadow: "var(--shadow)",
    }}
  >
    <div className="flex items-center gap-3">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          background:
            trace?.status === "done"
              ? "var(--ink)"
              : "color-mix(in srgb, var(--ink) 8%, transparent)",
          color: trace?.status === "done" ? "var(--bg)" : "var(--ink-muted)",
        }}
      >
        <span className="text-xs">✦</span>
      </span>
      <div className="flex-1">
        <div
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--ink-faint)" }}
        >
          director agent
        </div>
        <div
          className="mt-0.5 text-sm font-medium"
          style={{ color: "var(--ink)" }}
        >
          {trace?.message ?? "Spawning…"}
        </div>
      </div>
      <div className="text-right">
        <div
          className={`flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-widest ${trace?.status === "thinking" ? "animate-pulse" : ""}`}
          style={{
            color:
              trace?.status === "done"
                ? "var(--ink-muted)"
                : trace?.status === "failed"
                  ? "#B91C1C"
                  : "var(--accent)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                trace?.status === "done"
                  ? "var(--ink-muted)"
                  : trace?.status === "failed"
                    ? "#B91C1C"
                    : "var(--accent)",
            }}
          />
          {trace?.status === "done"
            ? "Ready"
            : trace?.status === "failed"
              ? "Failed"
              : "Planning"}
        </div>
        <div
          className="mt-0.5 font-mono text-[10px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {trace?.ms !== undefined
            ? `${(trace.ms / 1000).toFixed(1)}s`
            : "—"}
        </div>
      </div>
    </div>
  </div>
);

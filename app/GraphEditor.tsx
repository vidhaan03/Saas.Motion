"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type Connection,
  type EdgeChange,
  type NodeChange,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SceneNode } from "./SceneNode";
import { PlayerWrapper } from "./PlayerWrapper";
import { SceneEditor } from "./SceneEditor";
import { AddTilePopover, defaultSceneForType } from "./AddTilePopover";
import type { Scene, Storyboard } from "../remotion/schema";
import type { Aspect } from "../lib/aspect";

type Props = {
  storyboard: Storyboard;
  aspect?: Aspect;
  onApply: (next: Storyboard) => void;
  onClose: () => void;
};

const NODE_WIDTH = 280;
const NODE_GAP = 80;

const buildInitialGraph = (storyboard: Storyboard, onDelete: (id: string) => void) => {
  const nodes: Node[] = storyboard.scenes.map((scene, idx) => ({
    id: `scene-${idx}-${scene.type}`,
    type: "scene",
    position: { x: idx * (NODE_WIDTH + NODE_GAP), y: 80 },
    data: { scene, brand: storyboard.brand, index: idx, onDelete },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));
  const edges: Edge[] = storyboard.scenes.slice(1).map((_, idx) => ({
    id: `e-${idx}`,
    source: nodes[idx].id,
    target: nodes[idx + 1].id,
    animated: true,
    style: { stroke: "var(--ink-faint)", strokeWidth: 1.5, opacity: 0.65 },
  }));
  return { nodes, edges };
};

const orderScenesFromGraph = (nodes: Node[]): Scene[] =>
  [...nodes]
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => (n.data as { scene: Scene }).scene);

const rewireEdgesByPosition = (nodes: Node[]): Edge[] => {
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  return sorted.slice(1).map((node, idx) => ({
    id: `e-auto-${sorted[idx].id}-${node.id}`,
    source: sorted[idx].id,
    target: node.id,
    animated: true,
    style: { stroke: "var(--ink-faint)", strokeWidth: 1.5, opacity: 0.65 },
  }));
};

const nodeTypes = { scene: SceneNode };

const GraphCanvas: React.FC<Props> = ({
  storyboard,
  aspect = "vertical",
  onApply,
  onClose,
}) => {
  const initial = useMemo(
    () => buildInitialGraph(storyboard, () => {}),
    [storyboard],
  );

  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // While a node is dragged, this holds the id of the edge it's about to
  // splice into (if any). Used both for visual feedback during the drag
  // and to compute the snap position on drop.
  const [spliceTargetEdgeId, setSpliceTargetEdgeId] = useState<string | null>(
    null,
  );
  const [popoverAnchor, setPopoverAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const SIDEBAR_MIN = 280;
  const SIDEBAR_MAX = 720;
  const SIDEBAR_DEFAULT = 340;
  const SIDEBAR_STORAGE_KEY = "motion-saas:graph-sidebar-width";

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const resizing = useRef(false);
  const resizeStart = useRef<{ x: number; width: number }>({ x: 0, width: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed >= SIDEBAR_MIN && parsed <= SIDEBAR_MAX) {
      setSidebarWidth(parsed);
    }
  }, []);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, width: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizing.current) return;
      const delta = resizeStart.current.x - e.clientX;
      const next = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, resizeStart.current.width + delta),
      );
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          String(sidebarWidth),
        );
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [sidebarWidth]);

  const handleDelete = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => e.source !== id && e.target !== id),
      );
      setSelectedNodeId((prev) => (prev === id ? null : prev));
    },
    [],
  );

  const updateScene = useCallback((id: string, next: Scene) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, scene: next } } : n,
      ),
    );
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    setNodes((prev) => {
      const source = prev.find((n) => n.id === id);
      if (!source) return prev;
      const sourceScene = (source.data as { scene: Scene }).scene;
      const cloned: Scene = JSON.parse(JSON.stringify(sourceScene));
      const newId = `scene-${Date.now().toString(36)}-${cloned.type}`;
      const newNode: Node = {
        ...source,
        id: newId,
        position: {
          x: source.position.x + 60,
          y: source.position.y + 60,
        },
        data: { ...source.data, scene: cloned },
        selected: false,
      };
      return [...prev, newNode];
    });
  }, []);

  // Inject live callbacks into existing nodes (initial.data has a no-op)
  useMemo(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: handleDelete,
          onDuplicate: handleDuplicate,
          onChange: updateScene,
        },
      })),
    );
  }, [handleDelete, handleDuplicate, updateScene]);

  const addTile = (type: Scene["type"]) => {
    const scene = defaultSceneForType(type);
    const id = `scene-${Date.now().toString(36)}-${type}`;
    const lastNode = nodes[nodes.length - 1];
    const position = lastNode
      ? { x: lastNode.position.x + NODE_WIDTH + NODE_GAP, y: lastNode.position.y }
      : { x: 80, y: 120 };
    const newNode: Node = {
      id,
      type: "scene",
      position,
      data: {
        scene,
        brand: storyboard.brand,
        index: nodes.length,
        onDelete: handleDelete,
        onDuplicate: handleDuplicate,
        onChange: updateScene,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    setNodes((prev) => [...prev, newNode]);
    if (lastNode) {
      setEdges((prev) => [
        ...prev,
        {
          id: `e-${Date.now().toString(36)}`,
          source: lastNode.id,
          target: id,
          animated: true,
          style: { stroke: "var(--ink-faint)", strokeWidth: 1.5, opacity: 0.65 },
        },
      ]);
    }
    setSelectedNodeId(id);
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "var(--ink-faint)", strokeWidth: 1.5, opacity: 0.65 },
          },
          eds,
        ),
      ),
    [],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setPopoverAnchor(null);
  }, []);

  const selectedScene = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;
    return (node.data as { scene: Scene }).scene;
  }, [selectedNodeId, nodes]);

  const orderedScenes = useMemo(
    () => orderScenesFromGraph(nodes),
    [nodes],
  );

  // Approximate node height for hit-testing. Scene nodes are tall (live
  // thumbnail) so this is generous; the y-tolerance below also helps.
  const NODE_HEIGHT_APPROX = 360;

  // While dragging, find an edge whose horizontal span the dragged node's
  // center falls inside (and whose vertical position is reasonably close
  // to the chain). Edges that touch the dragged node are skipped.
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (edges.length === 0) {
        setSpliceTargetEdgeId((prev) => (prev === null ? prev : null));
        return;
      }
      const dCx = draggedNode.position.x + NODE_WIDTH / 2;
      const dCy = draggedNode.position.y + NODE_HEIGHT_APPROX / 2;

      let best: { id: string; dist: number } | null = null;
      for (const edge of edges) {
        if (edge.source === draggedNode.id || edge.target === draggedNode.id) {
          continue;
        }
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const sCx = source.position.x + NODE_WIDTH / 2;
        const tCx = target.position.x + NODE_WIDTH / 2;
        const sCy = source.position.y + NODE_HEIGHT_APPROX / 2;
        const tCy = target.position.y + NODE_HEIGHT_APPROX / 2;

        const minX = Math.min(sCx, tCx);
        const maxX = Math.max(sCx, tCx);
        if (dCx < minX || dCx > maxX) continue;

        // Allow generous vertical slack so users don't have to be pixel-precise.
        const yTolerance = NODE_HEIGHT_APPROX;
        if (
          Math.abs(dCy - sCy) > yTolerance &&
          Math.abs(dCy - tCy) > yTolerance
        ) {
          continue;
        }

        const mCx = (sCx + tCx) / 2;
        const mCy = (sCy + tCy) / 2;
        const dist = Math.hypot(mCx - dCx, mCy - dCy);
        if (!best || dist < best.dist) best = { id: edge.id, dist };
      }

      setSpliceTargetEdgeId((prev) => {
        const next = best?.id ?? null;
        return prev === next ? prev : next;
      });
    },
    [edges, nodes],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const targetEdgeId = spliceTargetEdgeId;
      setSpliceTargetEdgeId(null);

      setNodes((current) => {
        let next = current;
        if (targetEdgeId) {
          const edge = edges.find((e) => e.id === targetEdgeId);
          if (edge) {
            const source = current.find((n) => n.id === edge.source);
            const target = current.find((n) => n.id === edge.target);
            if (source && target) {
              const midX = (source.position.x + target.position.x) / 2;
              const midY = (source.position.y + target.position.y) / 2;
              next = current.map((n) =>
                n.id === draggedNode.id
                  ? { ...n, position: { x: midX, y: midY } }
                  : n,
              );
            }
          }
        }
        setEdges(rewireEdgesByPosition(next));
        return next;
      });
    },
    [edges, spliceTargetEdgeId],
  );

  // Edges as rendered, with the active splice target painted brighter so
  // users see exactly where the drop will land.
  const displayEdges = useMemo(() => {
    if (!spliceTargetEdgeId) return edges;
    return edges.map((e) =>
      e.id === spliceTargetEdgeId
        ? {
            ...e,
            animated: false,
            style: {
              ...e.style,
              stroke: storyboard.brand.accent,
              strokeWidth: 4,
              opacity: 1,
            },
          }
        : e,
    );
  }, [edges, spliceTargetEdgeId, storyboard.brand.accent]);

  const previewStoryboard: Storyboard | null = useMemo(
    () =>
      orderedScenes.length > 0
        ? { brand: storyboard.brand, scenes: orderedScenes }
        : null,
    [orderedScenes, storyboard.brand],
  );

  const previewKey = useMemo(
    () => orderedScenes.map((s) => s.type + s.duration).join("|"),
    [orderedScenes],
  );

  const previewSeconds = Math.round(
    orderedScenes.reduce((a, s) => a + s.duration, 0) / 30,
  );

  const apply = () => {
    if (orderedScenes.length === 0) {
      onClose();
      return;
    }
    onApply({ brand: storyboard.brand, scenes: orderedScenes });
    onClose();
  };

  const sceneCount = nodes.length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      {/* Atmospheric backdrop layer */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 15% 0%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 55%)",
        }}
      />
      <header
        className="relative z-10 flex items-center justify-between border-b px-6 py-3 backdrop-blur"
        style={{
          background:
            "color-mix(in srgb, var(--bg-elev) 75%, transparent)",
          borderColor:
            "color-mix(in srgb, var(--ink) 8%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-xs transition hover:opacity-80"
            style={{
              borderColor:
                "color-mix(in srgb, var(--ink) 12%, transparent)",
              color: "var(--ink-muted)",
            }}
          >
            ← Back
          </button>
          <div>
            <div
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: "var(--ink-faint)" }}
            >
              Storyboard Graph
            </div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--ink)" }}
            >
              {storyboard.brand.name} · {sceneCount} scenes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="text-[11px]"
            style={{ color: "var(--ink-faint)" }}
          >
            Drag a node onto an edge to splice it in · Hover node for actions
          </div>
          <button
            onClick={apply}
            disabled={sceneCount === 0}
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              background: "var(--ink)",
              color: "var(--bg)",
            }}
          >
            Apply ({sceneCount})
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <button
            onClick={(e) => {
              const rect = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              setPopoverAnchor({ x: rect.left, y: rect.bottom + 8 });
            }}
            className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-xl transition hover:opacity-90"
            style={{
              background:
                "color-mix(in srgb, var(--bg-elev) 90%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--ink) 12%, transparent)",
              color: "var(--ink)",
              boxShadow: "var(--shadow)",
            }}
          >
            <span className="text-base leading-none">+</span>
            <span>Add tile</span>
          </button>

          {popoverAnchor ? (
            <AddTilePopover
              anchor={{
                x: popoverAnchor.x,
                y: popoverAnchor.y,
              }}
              onPick={(type) => addTile(type)}
              onClose={() => setPopoverAnchor(null)}
            />
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              animated: true,
              style: {
                stroke: "var(--ink-faint)",
                strokeWidth: 1.5,
                opacity: 0.6,
              },
            }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.2}
              // CSS var won't work in React Flow's canvas-painted background;
              // pick a value that reads well in both modes via low alpha on
              // the dominant ink colour.
              color="var(--ink-faint)"
            />
            <Controls
              position="bottom-right"
              className="!rounded-lg !border-0 !bg-transparent"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-elev) 80%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--ink) 10%, transparent)",
                color: "var(--ink)",
              }}
              showInteractive={false}
            />
          </ReactFlow>
        </div>

        <aside
          className="relative flex shrink-0 flex-col gap-4 border-l p-4 backdrop-blur-xl"
          style={{
            width: sidebarWidth,
            background:
              "color-mix(in srgb, var(--bg-elev) 75%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--ink) 8%, transparent)",
          }}
        >
          <div
            onPointerDown={startResize}
            className="group absolute -left-1 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
            title="Drag to resize"
          >
            <div
              className="h-full w-px transition group-hover:w-[2px]"
              style={{
                background:
                  "color-mix(in srgb, var(--ink) 8%, transparent)",
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: "var(--ink-muted)" }}
              >
                Live preview
              </span>
            </div>
            <span
              className="text-[10px]"
              style={{ color: "var(--ink-faint)" }}
            >
              {sceneCount} scenes · {previewSeconds}s
            </span>
          </div>

          {/* Preview card — keep frame dark always (video itself is dark) */}
          <div
            className="mx-auto w-full max-w-[300px] rounded-2xl border p-2"
            style={{
              background: "var(--player-frame)",
              borderColor: "var(--player-frame-rule)",
            }}
          >
            {previewStoryboard ? (
              <PlayerWrapper
                key={previewKey}
                storyboard={previewStoryboard}
                aspect={aspect}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "9 / 16",
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, #1a1a1f 0%, #0a0a0c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "system-ui",
                  fontSize: 12,
                }}
              >
                No connected scenes
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {selectedScene && selectedNodeId ? (
              <div
                className="rounded-lg border p-3 text-[11px]"
                style={{
                  background:
                    "color-mix(in srgb, var(--ink) 4%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--ink) 10%, transparent)",
                  color: "var(--ink-muted)",
                }}
              >
                <div
                  className="mb-1 font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Editing
                </div>
                <div style={{ color: "var(--ink)" }}>
                  Editor floats next to the selected node on the canvas. Click
                  the canvas background to dismiss.
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-[11px]">
                <div
                  className="mb-2 text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Order
                </div>
                {orderedScenes.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed p-3 text-center"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--ink) 14%, transparent)",
                      color: "var(--ink-faint)",
                    }}
                  >
                    Click "Add tile" to start, or drop nodes into a chain.
                  </div>
                ) : (
                  orderedScenes.map((scene, idx) => {
                    const label =
                      scene.type === "kineticTitle"
                        ? scene.lines.join(" / ")
                        : scene.type === "statReveal"
                          ? `${scene.value}${scene.suffix ?? ""} · ${scene.label}`
                          : scene.type === "featureGrid"
                            ? scene.heading
                            : scene.type === "productDemo"
                              ? scene.caption ?? `Demo · ${scene.actions.length} actions`
                              : scene.type === "testimonialQuote"
                                ? `"${scene.quote.slice(0, 36)}…" — ${scene.author}`
                                : scene.type === "logoWall"
                                  ? `${scene.heading} · ${scene.logos.length} logos`
                                  : scene.type === "ctaCard"
                                    ? `${scene.headline} → ${scene.buttonLabel}`
                                    : scene.type === "multiScript"
                                      ? `${scene.glyphs.map((g) => g.char).join(" → ")} · ${scene.caption ?? ""}`
                                      : scene.type === "productCarousel"
                                        ? `${scene.products.length} products · ${scene.heading ?? ""}`
                                        : scene.type === "uiShowcase"
                                          ? `${scene.frame ?? "browser"} · ${scene.caption ?? ""}`
                                          : `AI shot · ${scene.caption ?? scene.imagePrompt.slice(0, 32)}`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                        style={{
                          background:
                            "color-mix(in srgb, var(--ink) 3%, transparent)",
                          borderColor:
                            "color-mix(in srgb, var(--ink) 8%, transparent)",
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded font-mono text-[9px]"
                          style={{
                            background: `${storyboard.brand.accent}22`,
                            color: storyboard.brand.accent,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span
                          className="flex-1 truncate"
                          style={{ color: "var(--ink)" }}
                        >
                          {label}
                        </span>
                        <span style={{ color: "var(--ink-faint)" }}>
                          {Math.round(scene.duration / 30)}s
                        </span>
                      </div>
                    );
                  })
                )}
                <div
                  className="mt-3 text-[10px]"
                  style={{ color: "var(--ink-faint)" }}
                >
                  Click any node on the canvas to edit it.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export const GraphEditor: React.FC<Props> = (props) => (
  <ReactFlowProvider>
    <GraphCanvas {...props} />
  </ReactFlowProvider>
);

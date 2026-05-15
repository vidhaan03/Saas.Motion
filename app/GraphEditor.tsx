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
    style: { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.5 },
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
    style: { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.5 },
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
          style: { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.5 },
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
            style: { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.5 },
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

  const onNodeDragStop = useCallback(() => {
    setNodes((current) => {
      setEdges(rewireEdgesByPosition(current));
      return current;
    });
  }, []);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#06060a]">
      <header className="flex items-center justify-between border-b border-white/5 bg-[#0a0a0c]/80 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              Storyboard Graph
            </div>
            <div className="text-sm font-medium text-white">
              {storyboard.brand.name} · {sceneCount} scenes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-white/40">
            Drag handles to reconnect · Hover node for actions
          </div>
          <button
            onClick={apply}
            disabled={sceneCount === 0}
            className="rounded-lg bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply ({sceneCount})
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <button
            onClick={(e) => {
              const rect = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              setPopoverAnchor({ x: rect.left, y: rect.bottom + 8 });
            }}
            className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#15151a]/95 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-xl transition hover:border-white/30 hover:bg-[#1d1d23]/95"
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
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "rgba(255,255,255,0.4)", strokeWidth: 1.5 },
            }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.2}
              color="rgba(255,255,255,0.08)"
            />
            <Controls
              position="bottom-right"
              className="!border-white/10 !bg-[#0a0a0c]/80 !text-white"
              showInteractive={false}
            />
          </ReactFlow>
        </div>

        <aside
          className="relative flex shrink-0 flex-col gap-4 border-l border-white/5 bg-[#0a0a0c]/80 p-4"
          style={{ width: sidebarWidth }}
        >
          <div
            onPointerDown={startResize}
            className="group absolute -left-1 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center"
            title="Drag to resize"
          >
            <div className="h-full w-px bg-white/5 transition group-hover:w-[2px] group-hover:bg-white/30" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs uppercase tracking-widest text-white/50">
                Live preview
              </span>
            </div>
            <span className="text-[10px] text-white/40">
              {sceneCount} scenes · {previewSeconds}s
            </span>
          </div>

          <div className="mx-auto w-full max-w-[300px] rounded-2xl border border-white/5 bg-black/40 p-2">
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
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] text-white/55">
                <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/30">
                  Editing
                </div>
                <div className="text-white/80">
                  Editor floats next to the selected node on the canvas. Click
                  the canvas background to dismiss.
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-[11px]">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">
                  Order
                </div>
                {orderedScenes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-white/40">
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
                                        : `${scene.frame ?? "browser"} · ${scene.caption ?? ""}`;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
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
                        <span className="flex-1 truncate text-white/75">
                          {label}
                        </span>
                        <span className="text-white/30">
                          {Math.round(scene.duration / 30)}s
                        </span>
                      </div>
                    );
                  })
                )}
                <div className="mt-3 text-[10px] text-white/30">
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

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type {
  FeatureCardsSection,
  HeroSection,
  QuickstartSection,
  Section,
  SectionType,
} from "../../lib/docs-saas/schema";
import {
  FeatureCardsRenderer,
  HeroRenderer,
  QuickstartRenderer,
} from "./sections";

type WriterStatus = {
  status: "thinking" | "done" | "failed";
  ms?: number;
};

type Phase =
  | { kind: "idle" }
  | { kind: "streaming"; total: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

const SECTION_LABEL: Record<SectionType, string> = {
  hero: "Hero",
  featureCards: "Feature cards",
  quickstart: "Quickstart steps",
};

export default function DocsSaasPage() {
  const [prompt, setPrompt] = useState(
    "motion.saas — generate SaaS launch ads from a one-line prompt. Built on Remotion + Next.js. Agentic pipeline: Director picks scene types, parallel specialists write each scene's copy. 10 scene types: kineticTitle, statReveal, featureGrid, productDemo, testimonialQuote, logoWall, ctaCard, multiScript, productCarousel, uiShowcase. Brand kit input (color, accent, name). Stream-rendered preview in Remotion Player. Free Gemini + NVIDIA NIM fallback.",
  );
  const [brandName, setBrandName] = useState("motion.saas");
  const [color, setColor] = useState("#7C3AED");
  const [accent, setAccent] = useState("#EC4899");
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [sections, setSections] = useState<Section[]>([]);
  const [writerState, setWriterState] = useState<
    Record<SectionType, WriterStatus | null>
  >({
    hero: null,
    featureCards: null,
    quickstart: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase({ kind: "streaming", total: 3 });
    setSections([]);
    setWriterState({ hero: null, featureCards: null, quickstart: null });

    try {
      const res = await fetch("/api/docs-saas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          brand: { name: brandName, color, accent },
          ...(sourceMaterial.trim().length > 0
            ? { sourceMaterial }
            : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const order: Record<SectionType, number> = {
        hero: 0,
        featureCards: 1,
        quickstart: 2,
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));
          if (event.type === "agent" && event.agent === "section-writer") {
            setWriterState((prev) => ({
              ...prev,
              [event.sectionType]: {
                status: event.status,
                ms: "ms" in event ? event.ms : undefined,
              },
            }));
          } else if (event.type === "section") {
            const newSection = event.section as Section;
            setSections((prev) =>
              [...prev, newSection].sort(
                (a: Section, b: Section) =>
                  order[a.type] - order[b.type],
              ),
            );
          } else if (event.type === "done") {
            setPhase({ kind: "done" });
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Generation failed",
      });
    }
  };

  const streaming = phase.kind === "streaming";

  const brand = { name: brandName, color, accent };

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* ─── Mode toggle (top-left, matches other routes) ─── */}
      <div className="fixed left-6 top-6 z-30 flex items-center gap-0.5 rounded-full border border-neutral-300 bg-white/85 p-0.5 backdrop-blur-2xl shadow-sm">
        <Link
          href="/"
          className="rounded-full px-4 py-1.5 text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          Video
        </Link>
        <span className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white">
          Docs.Saas
        </span>
      </div>

      {/* ─── Studio panel (input form) ─── */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 pb-6 pt-24">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Docs.Saas · v0.1
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Generate a SaaS landing page
              </h1>
            </div>
            <button
              onClick={generate}
              disabled={streaming || prompt.trim().length < 20}
              className="rounded-full px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
              style={
                streaming || prompt.trim().length < 20
                  ? undefined
                  : {
                      background: `linear-gradient(135deg, ${color}, ${accent})`,
                    }
              }
            >
              {streaming ? "Writing sections…" : "Generate"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Brief
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-900 outline-none transition focus:border-neutral-400"
                  placeholder="What's the product? What does it do? Who's it for?"
                />
              </div>
              <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Source material (optional) — paste README, spec, or any context
                </summary>
                <textarea
                  value={sourceMaterial}
                  onChange={(e) => setSourceMaterial(e.target.value)}
                  rows={8}
                  className="mt-3 w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-[12px] leading-relaxed text-neutral-900 outline-none transition focus:border-neutral-400"
                  placeholder="Paste anything: docs, code snippets, feature lists, customer quotes…"
                />
                <div className="mt-2 font-mono text-[10px] text-neutral-500">
                  {sourceMaterial.length} chars
                </div>
              </details>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Brand
                </label>
                <input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Colors
                </label>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2.5">
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer appearance-none rounded-md border-0 bg-transparent"
                      style={{ background: color }}
                    />
                    <span className="font-mono text-[11px] text-neutral-700">
                      {color}
                    </span>
                  </label>
                  <span className="text-neutral-300">·</span>
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="h-6 w-6 cursor-pointer appearance-none rounded-md border-0 bg-transparent"
                      style={{ background: accent }}
                    />
                    <span className="font-mono text-[11px] text-neutral-700">
                      {accent}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Status row */}
          {phase.kind === "streaming" || phase.kind === "done" ? (
            <div className="mt-6 flex items-center gap-4 border-t border-neutral-200 pt-4">
              {(Object.keys(writerState) as SectionType[]).map((st) => {
                const w = writerState[st];
                const dotBg =
                  w?.status === "done"
                    ? "#171717"
                    : w?.status === "failed"
                      ? "#B91C1C"
                      : w?.status === "thinking"
                        ? "#737373"
                        : "transparent";
                return (
                  <div
                    key={st}
                    className="flex items-center gap-2 text-[12px] text-neutral-600"
                  >
                    <span
                      className={`block h-1.5 w-1.5 rounded-full ${w?.status === "thinking" ? "animate-pulse" : ""}`}
                      style={{
                        background: dotBg,
                        border: !w ? "1px solid #d4d4d4" : "none",
                      }}
                    />
                    <span>{SECTION_LABEL[st]}</span>
                    {w?.ms !== undefined ? (
                      <span className="font-mono text-[10px] text-neutral-400">
                        {(w.ms / 1000).toFixed(1)}s
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {phase.message}
            </div>
          ) : null}
        </div>
      </div>

      {/* ─── Rendered page output ─── */}
      <div className="bg-white">
        {sections.length === 0 && phase.kind === "idle" ? (
          <div className="mx-auto max-w-5xl px-6 py-32 text-center">
            <div className="mx-auto inline-flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50/50 px-12 py-16">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Empty studio
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                Describe your product above and hit Generate.
              </div>
            </div>
          </div>
        ) : null}

        {sections.map((section, i) => {
          if (section.type === "hero") {
            return (
              <HeroRenderer
                key={`${section.type}-${i}`}
                section={section as HeroSection}
                brand={brand}
              />
            );
          }
          if (section.type === "featureCards") {
            return (
              <FeatureCardsRenderer
                key={`${section.type}-${i}`}
                section={section as FeatureCardsSection}
                brand={brand}
              />
            );
          }
          if (section.type === "quickstart") {
            return (
              <QuickstartRenderer
                key={`${section.type}-${i}`}
                section={section as QuickstartSection}
                brand={brand}
              />
            );
          }
          return null;
        })}

        {streaming && sections.length < 3 ? (
          <div className="border-t border-neutral-200 bg-neutral-50 py-16">
            <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-neutral-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400 [animation-delay:0.2s]" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400 [animation-delay:0.4s]" />
              <span className="ml-2">Drafting remaining sections…</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

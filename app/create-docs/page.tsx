"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  DOC_TYPES,
  DOC_TYPE_META,
  type Answer,
  type DocOutput,
  type DocType,
} from "../../lib/docs/schema";
import type {
  InterviewQuestion,
  InterviewSource,
} from "../../lib/docs/interview";

type WriterStatus = {
  status: "thinking" | "done" | "failed";
  ms?: number;
};

type Phase =
  | { kind: "idle" }
  | {
      kind: "interview";
      loading: boolean;
      questions: InterviewQuestion[];
      source: InterviewSource | null;
    }
  | { kind: "streaming"; total: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function CreateDocsPage() {
  const [prompt, setPrompt] = useState(
    "Launch Beacon, our async standup tool used by 28000 engineering teams. Kills meeting fatigue, ships updates in under 30 seconds.",
  );
  const [brandName, setBrandName] = useState("Beacon");
  const [color, setColor] = useState("#0EA5E9");
  const [accent, setAccent] = useState("#22D3EE");
  const [selected, setSelected] = useState<Set<DocType>>(
    new Set(["landingPage", "faq"]),
  );
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [docs, setDocs] = useState<Record<DocType, DocOutput | null>>({
    landingPage: null,
    blogPost: null,
    faq: null,
    releaseNotes: null,
  });
  const [writerState, setWriterState] = useState<
    Record<DocType, WriterStatus | null>
  >({
    landingPage: null,
    blogPost: null,
    faq: null,
    releaseNotes: null,
  });
  const [copiedKey, setCopiedKey] = useState<DocType | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggle = (t: DocType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  // Step 1: user clicks Generate → fetch interview questions, show form.
  const startInterview = async () => {
    if (selected.size === 0) return;
    setAnswers({});
    setPhase({
      kind: "interview",
      loading: true,
      questions: [],
      source: null,
    });

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          brand: { name: brandName, color, accent },
          docTypes: Array.from(selected),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        questions: InterviewQuestion[];
        source: InterviewSource;
      };
      setPhase({
        kind: "interview",
        loading: false,
        questions: data.questions,
        source: data.source,
      });
    } catch (e) {
      setPhase({
        kind: "error",
        message:
          e instanceof Error ? e.message : "Couldn't fetch interview questions",
      });
    }
  };

  // Step 2: user clicks Continue (with answers) or Skip All (without).
  const runGenerate = async (withAnswers: boolean) => {
    if (selected.size === 0) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const docTypesArr = Array.from(selected);

    // Build answers payload from current answers map + the questions from phase.
    let answersPayload: Answer[] = [];
    if (withAnswers && phase.kind === "interview") {
      answersPayload = phase.questions
        .map((q) => ({
          question: q.question,
          answer: (answers[q.id] ?? "").trim(),
        }))
        .filter((a) => a.answer.length > 0);
    }

    setPhase({ kind: "streaming", total: docTypesArr.length });
    setDocs({
      landingPage: null,
      blogPost: null,
      faq: null,
      releaseNotes: null,
    });
    setWriterState({
      landingPage: null,
      blogPost: null,
      faq: null,
      releaseNotes: null,
    });

    try {
      const res = await fetch("/api/generate-docs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          brand: { name: brandName, color, accent },
          docTypes: docTypesArr,
          ...(answersPayload.length > 0 ? { answers: answersPayload } : {}),
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

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));
          if (event.type === "agent" && event.agent === "doc-writer") {
            setWriterState((prev) => ({
              ...prev,
              [event.docType]: {
                status: event.status,
                ms: "ms" in event ? event.ms : undefined,
              },
            }));
          } else if (event.type === "doc") {
            setDocs((prev) => ({ ...prev, [event.doc.type]: event.doc }));
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

  const copyDoc = async (t: DocType) => {
    const doc = docs[t];
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(doc.markdown);
      setCopiedKey(t);
      setTimeout(() => setCopiedKey((c) => (c === t ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const streaming = phase.kind === "streaming";
  const anyOutput = Object.values(docs).some((d) => d !== null);

  return (
    <main className="min-h-screen bg-[#F5F1E8] text-[#2D2A26]">
      {/* ─── Mode toggle (Video / Docs) — anchored top-left, matches main app ─── */}
      <div className="fixed left-6 top-6 z-30 flex items-center gap-0.5 rounded-full border border-[#D4CCBC] bg-[#F5F1E8]/85 p-0.5 backdrop-blur-2xl shadow-sm">
        <Link
          href="/"
          className="rounded-full px-4 py-1.5 text-sm text-[#A39C8F] transition hover:text-[#2D2A26]"
        >
          Video
        </Link>
        <span className="rounded-full bg-[#2D2A26] px-4 py-1.5 text-sm font-medium text-[#F5F1E8]">
          Docs
        </span>
      </div>

      <div className="mx-auto max-w-[920px] px-8 py-10">
        <header className="border-b border-[#D4CCBC] pb-5 pl-40">
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#A39C8F] transition hover:text-[#2D2A26]"
          >
            ← motion.saas
          </Link>
          <h1 className="mt-4 text-3xl font-medium tracking-tight">
            Docs creator
          </h1>
          <p className="mt-2 text-sm text-[#6B655C]">
            Generate launch docs from one prompt — landing copy, FAQ, blog
            posts, release notes.
          </p>
        </header>

        {/* ── Input panel ─────────────────────────────────────────────── */}
        <section className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-[1fr_240px]">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-2 w-full resize-none border-0 border-b border-[#D4CCBC] bg-transparent pb-3 text-xl font-medium leading-snug tracking-tight text-[#2D2A26] outline-none placeholder:text-[#A39C8F] focus:border-[#2D2A26]"
              placeholder="What's launching?"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              Brand
            </label>
            <div className="mt-2 space-y-3">
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="brand name"
                className="w-full border-0 border-b border-[#D4CCBC] bg-transparent pb-2 text-sm text-[#2D2A26] outline-none placeholder:text-[#A39C8F] focus:border-[#2D2A26]"
              />
              <div className="flex items-center gap-3 text-[11px] text-[#6B655C]">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-3 w-3 cursor-pointer appearance-none rounded-full border-0 bg-transparent"
                    style={{ background: color }}
                  />
                  <span className="font-mono">{color}</span>
                </label>
                <span className="text-[#A39C8F]">·</span>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-3 w-3 cursor-pointer appearance-none rounded-full border-0 bg-transparent"
                    style={{ background: accent }}
                  />
                  <span className="font-mono">{accent}</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <label className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
            Generate which docs?
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => {
              const isOn = selected.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    isOn
                      ? "border-[#2D2A26] bg-[#2D2A26] text-[#F5F1E8]"
                      : "border-[#D4CCBC] bg-transparent text-[#3C3933] hover:border-[#6B655C]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isOn ? "bg-[#F5F1E8]" : "bg-[#D4CCBC]"
                    }`}
                  />
                  <span>{DOC_TYPE_META[t].label}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      isOn ? "text-[#F5F1E8]/60" : "text-[#A39C8F]"
                    }`}
                  >
                    {DOC_TYPE_META[t].category}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 flex items-center gap-4">
          <button
            onClick={startInterview}
            disabled={
              streaming ||
              phase.kind === "interview" ||
              selected.size === 0 ||
              prompt.trim().length === 0
            }
            className="flex h-12 items-center gap-3 rounded-full border border-[#2D2A26] bg-[#2D2A26] px-6 text-sm font-medium text-[#F5F1E8] transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#D4CCBC] disabled:text-[#A39C8F] disabled:border-[#D4CCBC] disabled:hover:scale-100"
          >
            {phase.kind === "interview" && phase.loading
              ? "Preparing questions…"
              : streaming
                ? "Writing…"
                : "Generate docs"}
            {!streaming && phase.kind !== "interview" && selected.size > 0 ? (
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                · {selected.size}
              </span>
            ) : null}
          </button>
          {phase.kind === "error" ? (
            <span className="text-sm text-red-700">{phase.message}</span>
          ) : null}
        </section>

        {/* ── Interview ──────────────────────────────────────────────── */}
        {phase.kind === "interview" ? (
          <section
            className="mt-14 border-t border-[#D4CCBC] pt-10"
            style={{ animation: "sceneArrive 400ms ease-out" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
                A few questions before we write
                {phase.source ? (
                  <span className="ml-3 text-[#A39C8F]">
                    · {phase.source === "ai" ? "tailored to your brief" : "default set"}
                  </span>
                ) : null}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
                {phase.questions.length > 0
                  ? `${Object.values(answers).filter((v) => v.trim().length > 0).length} / ${phase.questions.length} answered`
                  : ""}
              </div>
            </div>
            <p className="mb-6 text-sm text-[#6B655C]">
              Skip any. Skip all. We&apos;ll use what you give us — and write the rest from the brief.
            </p>

            {phase.loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-[#A39C8F]">
                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F]" />
                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.2s]" />
                <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.4s]" />
                <span className="ml-2">Interviewer is drafting your questions…</span>
              </div>
            ) : (
              <div className="space-y-7">
                {phase.questions.map((q, i) => {
                  const filled = (answers[q.id] ?? "").trim().length > 0;
                  return (
                    <div key={q.id}>
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="font-mono text-[10px] text-[#A39C8F]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[15px] font-medium text-[#2D2A26]">
                          {q.question}
                        </span>
                        {!filled ? (
                          <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
                            · optional
                          </span>
                        ) : null}
                      </div>
                      {q.why ? (
                        <div className="mb-2 pl-7 text-[12px] text-[#A39C8F]">
                          {q.why}
                        </div>
                      ) : null}
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder ?? "Leave blank to skip"}
                        rows={2}
                        className="ml-7 w-[calc(100%-1.75rem)] resize-none border-0 border-b border-[#D4CCBC] bg-transparent pb-2 text-sm leading-relaxed text-[#2D2A26] outline-none placeholder:text-[#A39C8F] focus:border-[#2D2A26]"
                      />
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => runGenerate(true)}
                    className="flex h-11 items-center gap-3 rounded-full border border-[#2D2A26] bg-[#2D2A26] px-5 text-sm font-medium text-[#F5F1E8] transition hover:scale-105"
                  >
                    Continue with docs
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                      ·{" "}
                      {
                        Object.values(answers).filter(
                          (v) => v.trim().length > 0,
                        ).length
                      }{" "}
                      answered
                    </span>
                  </button>
                  <button
                    onClick={() => runGenerate(false)}
                    className="h-11 rounded-full border border-[#D4CCBC] px-5 text-sm text-[#6B655C] transition hover:border-[#6B655C] hover:text-[#2D2A26]"
                  >
                    Skip all
                  </button>
                  <button
                    onClick={() => setPhase({ kind: "idle" })}
                    className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F] transition hover:text-[#2D2A26]"
                  >
                    ← back
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {/* ── Output ──────────────────────────────────────────────────── */}
        {anyOutput || streaming ? (
          <section className="mt-14 border-t border-[#D4CCBC] pt-10">
            <div className="mb-6 font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
              Output
            </div>
            <div className="space-y-8">
              {Array.from(selected).map((t) => {
                const writer = writerState[t];
                const doc = docs[t];
                const statusDot =
                  writer?.status === "done"
                    ? "#2D2A26"
                    : writer?.status === "failed"
                      ? "#B91C1C"
                      : writer?.status === "thinking"
                        ? "#6B655C"
                        : "transparent";
                return (
                  <article
                    key={t}
                    className="border-b border-[#D4CCBC] pb-8"
                    style={{ animation: "sceneArrive 400ms ease-out" }}
                  >
                    <header className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`block h-2 w-2 rounded-full ${
                            writer?.status === "thinking" ? "animate-pulse" : ""
                          }`}
                          style={{
                            background: statusDot,
                            border: !writer ? "1px solid #A39C8F" : "none",
                          }}
                        />
                        <span className="text-lg font-medium tracking-tight">
                          {DOC_TYPE_META[t].label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#A39C8F]">
                          {DOC_TYPE_META[t].category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#A39C8F]">
                        {writer?.ms !== undefined ? (
                          <span className="font-mono">
                            {(writer.ms / 1000).toFixed(1)}s
                          </span>
                        ) : writer?.status === "thinking" ? (
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F]" />
                            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.2s]" />
                            <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#A39C8F] [animation-delay:0.4s]" />
                          </span>
                        ) : null}
                        {doc ? (
                          <button
                            onClick={() => copyDoc(t)}
                            className="rounded-full border border-[#D4CCBC] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#6B655C] transition hover:border-[#2D2A26] hover:text-[#2D2A26]"
                          >
                            {copiedKey === t ? "copied" : "copy"}
                          </button>
                        ) : null}
                      </div>
                    </header>
                    {doc ? (
                      <div className="docs-markdown">
                        <ReactMarkdown>{doc.markdown}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm text-[#A39C8F]">
                        {writer?.status === "thinking"
                          ? "Drafting…"
                          : "Queued."}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes sceneArrive {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .docs-markdown h1 {
          font-size: 1.5rem;
          font-weight: 500;
          letter-spacing: -0.025em;
          margin: 0.5rem 0 1rem;
          color: #2d2a26;
        }
        .docs-markdown h2 {
          font-size: 1.05rem;
          font-weight: 500;
          letter-spacing: -0.02em;
          margin: 1.5rem 0 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #d4ccbc;
          color: #2d2a26;
        }
        .docs-markdown h3 {
          font-size: 0.95rem;
          font-weight: 500;
          margin: 1rem 0 0.25rem;
          color: #2d2a26;
        }
        .docs-markdown p {
          margin: 0.6rem 0;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #3c3933;
        }
        .docs-markdown ul {
          margin: 0.6rem 0;
          padding-left: 1.25rem;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #3c3933;
        }
        .docs-markdown li {
          margin: 0.25rem 0;
        }
        .docs-markdown strong {
          font-weight: 500;
          color: #2d2a26;
        }
        .docs-markdown code {
          background: #efe9dc;
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          font-size: 0.85em;
        }
        .docs-markdown blockquote {
          border-left: 2px solid #2d2a26;
          padding-left: 0.9rem;
          margin: 1rem 0;
          font-style: italic;
          color: #3c3933;
        }
        .docs-markdown a {
          color: #2d2a26;
          border-bottom: 1px solid #a39c8f;
          text-decoration: none;
        }
        .docs-markdown a:hover {
          border-bottom-color: #2d2a26;
        }
      `}</style>
    </main>
  );
}

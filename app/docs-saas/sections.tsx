"use client";

import type {
  FeatureCardsSection,
  HeroSection,
  QuickstartSection,
} from "../../lib/docs-saas/schema";
import type { Brand } from "../../remotion/schema";

// ─── Mini-mockup primitives (rendered inside FeatureCards) ────────────

const Avatar = ({ tone }: { tone: string }) => (
  <span
    className="block h-6 w-6 shrink-0 rounded-full"
    style={{
      background: `linear-gradient(135deg, ${tone}, ${tone}cc)`,
    }}
  />
);

const StatusPill = ({
  label,
  tone = "#22C55E",
}: {
  label: string;
  tone?: string;
}) => (
  <span
    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
    style={{
      background: `${tone}1a`,
      color: tone,
    }}
  >
    {label}
  </span>
);

const ProgressBarsMock = ({ accent }: { accent: string }) => {
  const rows = [
    { label: "Not Started", value: 22, status: "Not Started" },
    { label: "In Progress", value: 67, status: "On Track" },
    { label: "In Review", value: 84, status: "Almost Done" },
    { label: "Completed", value: 100, status: "Shipped" },
  ];
  return (
    <div className="mt-3 space-y-2.5 rounded-lg bg-neutral-50 p-3">
      <div className="flex items-center justify-between text-[9px] text-neutral-500">
        <span>Current Task</span>
        <span className="rounded bg-neutral-200 px-1.5 py-0.5">105 Tasks</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-neutral-700">{r.label}</span>
            <span className="text-neutral-400">{r.value}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full"
              style={{
                width: `${r.value}%`,
                background: accent,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const AssignmentCardMock = ({ accent }: { accent: string }) => (
  <div className="mt-3 space-y-2 rounded-lg bg-neutral-50 p-3">
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-neutral-500">Assignments</span>
      <span className="text-[9px] text-neutral-400">2 of 4</span>
    </div>
    <div className="rounded-md border border-neutral-200 bg-white p-2">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[8px] font-medium"
          style={{ background: `${accent}22`, color: accent }}
        >
          UX Design
        </span>
        <span className="text-[8px] text-neutral-400">Today</span>
      </div>
      <div className="text-[10px] font-medium text-neutral-700">
        User Journey Mapping & Design System Setup
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex -space-x-1">
          <Avatar tone="#F59E0B" />
          <Avatar tone="#3B82F6" />
          <Avatar tone="#EC4899" />
        </div>
        <StatusPill label="Active" tone={accent} />
      </div>
    </div>
    <div
      className="rounded-md py-1.5 text-center text-[9px] font-medium text-white"
      style={{ background: accent }}
    >
      Activate assignment
    </div>
  </div>
);

const MessageListMock = ({ accent }: { accent: string }) => {
  const rows = [
    { name: "Henry Moson", text: "On Tasks…", color: "#F59E0B", time: "" },
    { name: "Mert Roy", text: "Online", color: "#10B981", time: "4 min ago" },
    { name: "Liam Parker", text: "Hey, are you free to talk?", color: "#3B82F6", time: "1 hr ago" },
    { name: "Emma Collins", text: "Online", color: "#EC4899", time: "4 hr ago" },
  ];
  return (
    <div className="mt-3 space-y-1.5 rounded-lg bg-neutral-50 p-3">
      <div className="flex items-center justify-between text-[9px] text-neutral-500">
        <span>New Messages</span>
        <span
          className="rounded-full px-1 text-[8px] font-medium text-white"
          style={{ background: accent }}
        >
          3
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-1.5"
        >
          <Avatar tone={r.color} />
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-[10px] font-medium text-neutral-700">
              {r.name}
            </div>
            <div className="truncate text-[9px] text-neutral-400">{r.text}</div>
          </div>
          {r.time ? (
            <span className="text-[8px] text-neutral-400">{r.time}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const TableRowsMock = ({ accent }: { accent: string }) => {
  const rows = [
    { id: "ENG-241", title: "Fix onboarding crash", who: "BR" },
    { id: "ENG-240", title: "Add CSV export", who: "AK" },
    { id: "ENG-239", title: "Refactor auth flow", who: "MC" },
    { id: "ENG-238", title: "Improve search ranking", who: "JD" },
  ];
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[9px] uppercase tracking-widest text-neutral-500">
        In progress
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-2 py-1.5 text-[10px] ${i < rows.length - 1 ? "border-b border-neutral-100" : ""}`}
        >
          <span className="w-12 font-mono text-[9px] text-neutral-400">
            {r.id}
          </span>
          <span className="flex-1 truncate text-neutral-700">{r.title}</span>
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: accent }}
          >
            {r.who}
          </span>
        </div>
      ))}
    </div>
  );
};

const StatTilesMock = ({ accent }: { accent: string }) => {
  const tiles = [
    { value: "23", label: "Active" },
    { value: "12", label: "Review" },
    { value: "47", label: "Shipped" },
    { value: "8", label: "Blocked" },
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="rounded-md border border-neutral-200 bg-white p-2"
        >
          <div
            className="text-base font-semibold"
            style={{ color: accent }}
          >
            {t.value}
          </div>
          <div className="text-[9px] text-neutral-500">{t.label}</div>
        </div>
      ))}
    </div>
  );
};

const ChartLineMock = ({ accent }: { accent: string }) => (
  <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
    <div className="mb-2 flex items-baseline justify-between">
      <span className="text-[10px] font-medium text-neutral-700">Velocity</span>
      <span
        className="text-[10px] font-semibold"
        style={{ color: accent }}
      >
        +24%
      </span>
    </div>
    <svg viewBox="0 0 120 40" className="h-12 w-full">
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,32 L20,28 L40,30 L60,18 L80,20 L100,10 L120,6 L120,40 L0,40 Z"
        fill="url(#chart-fill)"
      />
      <path
        d="M0,32 L20,28 L40,30 L60,18 L80,20 L100,10 L120,6"
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const renderMockup = (
  hint: FeatureCardsSection["cards"][number]["mockupHint"],
  accent: string,
) => {
  switch (hint) {
    case "progress-bars":
      return <ProgressBarsMock accent={accent} />;
    case "assignment-card":
      return <AssignmentCardMock accent={accent} />;
    case "message-list":
      return <MessageListMock accent={accent} />;
    case "table-rows":
      return <TableRowsMock accent={accent} />;
    case "stat-tiles":
      return <StatTilesMock accent={accent} />;
    case "chart-line":
      return <ChartLineMock accent={accent} />;
  }
};

// ─── Hero dashboard mockup (the big screenshot under the hero text) ──

export const HeroDashboardMock: React.FC<{ brand: Brand }> = ({ brand }) => (
  <div className="mt-12 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10">
    {/* Top bar */}
    <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div
          className="h-5 w-5 rounded"
          style={{ background: brand.color }}
        />
        <span className="text-sm font-medium text-neutral-700">{brand.name}</span>
        <span className="ml-3 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
          Dashboard
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-32 rounded-md bg-neutral-100" />
        <div className="flex -space-x-1.5">
          <Avatar tone="#F59E0B" />
          <Avatar tone="#3B82F6" />
          <Avatar tone="#EC4899" />
          <Avatar tone="#10B981" />
        </div>
      </div>
    </div>
    {/* Tab strip */}
    <div className="border-b border-neutral-200 px-4 py-2 text-[11px]">
      <span
        className="mr-4 border-b-2 pb-2 font-medium"
        style={{ borderColor: brand.color, color: "#171717" }}
      >
        Task Boards
      </span>
      <span className="mr-4 text-neutral-500">Calendar</span>
      <span className="mr-4 text-neutral-500">Dashboard</span>
      <span className="mr-4 text-neutral-500">Pipeline</span>
      <span className="text-neutral-500">Backlog</span>
    </div>
    {/* Toolbar */}
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/50 px-4 py-2 text-[10px] text-neutral-500">
      <div className="flex gap-2">
        <span className="rounded bg-white px-2 py-1 shadow-sm">Board View</span>
        <span>List View</span>
        <span>Filter</span>
      </div>
      <div className="flex gap-2">
        <span className="rounded-md bg-white px-2 py-1 shadow-sm">
          Search Tasks
        </span>
      </div>
    </div>
    {/* Kanban columns */}
    <div className="grid grid-cols-4 gap-3 p-4">
      {["To Do", "In Process", "In Review", "Completed"].map((col, ci) => (
        <div key={col} className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-medium text-neutral-700">
            <span>{col}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] text-white"
              style={{ background: brand.color }}
            >
              {3 + ci}
            </span>
          </div>
          {[0, 1].map((ti) => (
            <div
              key={ti}
              className="rounded-md border border-neutral-200 bg-white p-2 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-1">
                <span
                  className="rounded px-1 py-0.5 text-[8px]"
                  style={{
                    background: `${brand.accent}22`,
                    color: brand.accent,
                  }}
                >
                  {["UX", "ENG", "OPS", "QA"][ci]}
                </span>
                <span className="text-[8px] text-neutral-400">Mar 14</span>
              </div>
              <div className="text-[10px] font-medium text-neutral-700">
                {
                  [
                    "Competitor Analysis",
                    "Dashboard UI Refinement",
                    "Review Task Automation Rules",
                    "Fix Progress Consistency",
                  ][ci]
                }
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex -space-x-1">
                  <Avatar tone="#F59E0B" />
                  <Avatar tone="#3B82F6" />
                </div>
                <span className="text-[8px] text-neutral-400">3 comments</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ─── Section renderers ───────────────────────────────────────────────

export const HeroRenderer: React.FC<{
  section: HeroSection;
  brand: Brand;
}> = ({ section, brand }) => {
  // Position floating badges in two columns around the dashboard mock.
  const left = section.floatingBadges.filter((_, i) => i % 2 === 0);
  const right = section.floatingBadges.filter((_, i) => i % 2 === 1);
  return (
    <section
      className="relative w-full overflow-hidden pt-16 pb-24"
      style={{
        background:
          "linear-gradient(180deg, #F4F1FB 0%, #FAFAFA 60%, #FFFFFF 100%)",
      }}
    >
      {/* soft cloud blobs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-72 w-96 rounded-full blur-3xl"
        style={{ background: `${brand.color}22` }}
      />
      <div
        className="pointer-events-none absolute -top-20 right-1/4 h-72 w-96 rounded-full blur-3xl"
        style={{ background: `${brand.accent}22` }}
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-900 md:text-6xl">
          {section.headline.split(/\.\s+|\n/).map((line, i, arr) => (
            <span key={i} className="block">
              {line.trim()}
              {i < arr.length - 1 ? "" : null}
            </span>
          ))}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-neutral-600 md:text-lg">
          {section.subhead}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            className="rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition hover:opacity-95"
            style={{
              background: `linear-gradient(135deg, ${brand.color}, ${brand.accent})`,
            }}
          >
            {section.primaryCtaLabel}
          </button>
          <button className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-400">
            {section.secondaryCtaLabel}
          </button>
        </div>

        {/* Floating badges + dashboard */}
        <div className="relative mt-10">
          <div className="pointer-events-none absolute -left-2 top-1/4 hidden flex-col gap-12 md:flex">
            {left.map((b, i) => (
              <div
                key={i}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[11px] text-neutral-600 shadow-sm"
              >
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: brand.color }}
                />
                {b}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute -right-2 top-1/4 hidden flex-col gap-12 md:flex">
            {right.map((b, i) => (
              <div
                key={i}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[11px] text-neutral-600 shadow-sm"
              >
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: brand.accent }}
                />
                {b}
              </div>
            ))}
          </div>

          <HeroDashboardMock brand={brand} />
        </div>
      </div>
    </section>
  );
};

export const FeatureCardsRenderer: React.FC<{
  section: FeatureCardsSection;
  brand: Brand;
}> = ({ section, brand }) => (
  <section className="bg-white py-20">
    <div className="mx-auto max-w-5xl px-6 text-center">
      {section.eyebrow ? (
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          {section.eyebrow}
        </div>
      ) : null}
      <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-4xl">
        {section.heading}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 md:text-base">
        {section.subhead}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-5 text-left md:grid-cols-3">
        {section.cards.map((card, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 transition hover:border-neutral-300 hover:bg-white"
          >
            <h3 className="text-base font-semibold text-neutral-900">
              {card.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
              {card.body}
            </p>
            {renderMockup(card.mockupHint, brand.accent)}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const QuickstartRenderer: React.FC<{
  section: QuickstartSection;
  brand: Brand;
}> = ({ section, brand }) => (
  <section className="bg-neutral-50 py-20">
    <div className="mx-auto max-w-5xl px-6 text-center">
      {section.eyebrow ? (
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          {section.eyebrow}
        </div>
      ) : null}
      <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-neutral-900 md:text-4xl">
        {section.heading}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 md:text-base">
        {section.subhead}
      </p>

      <div className="mt-12 space-y-4 text-left">
        {section.steps.map((step, i) => (
          <div
            key={i}
            className="flex gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, ${brand.color}, ${brand.accent})`,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
                {step.body}
              </p>
              {step.code && step.code.language !== "none" ? (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900 px-4 py-3 text-[12px] leading-relaxed text-neutral-100">
                  <code>{step.code.content}</code>
                </pre>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

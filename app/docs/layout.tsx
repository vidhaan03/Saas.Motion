import Link from "next/link";

const nav: Array<{ section: string; items: Array<{ href: string; label: string }> }> = [
  {
    section: "Get started",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/setup", label: "Setup & env vars" },
    ],
  },
  {
    section: "Architecture",
    items: [
      { href: "/docs/architecture", label: "How it works" },
      { href: "/docs/agents", label: "Agent pipeline" },
      { href: "/docs/api", label: "API routes" },
    ],
  },
  {
    section: "Scene reference",
    items: [{ href: "/docs/scenes", label: "All scene types" }],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2D2A26]">
      <div className="mx-auto grid max-w-6xl grid-cols-[240px_1fr] gap-12 px-8 py-10">
        <aside className="sticky top-10 h-[calc(100vh-5rem)] overflow-y-auto">
          <Link
            href="/"
            className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[#A39C8F] transition hover:text-[#2D2A26]"
          >
            ← motion.saas
          </Link>
          <h1 className="mt-8 text-xl font-medium tracking-tight">Documentation</h1>
          <nav className="mt-10 space-y-8">
            {nav.map((group) => (
              <div key={group.section}>
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#A39C8F]">
                  {group.section}
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block py-1 text-[14px] text-[#3C3933] transition hover:text-[#2D2A26]"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-10 border-t border-[#D4CCBC] pt-6 font-mono text-[10px] uppercase tracking-[0.15em] text-[#A39C8F]">
            v0.1 · dev
          </div>
        </aside>
        <main className="min-w-0 pb-24 pr-2">{children}</main>
      </div>
    </div>
  );
}

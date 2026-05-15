import type { Brand, Storyboard } from "../remotion/schema";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const extractNumber = (text: string): { value: string; suffix?: string } | null => {
  const match = text.match(/(\d[\d,.]*)\s*(\+|%|x|×)?/);
  if (!match) return null;
  return {
    value: match[1].replace(/,/g, ""),
    suffix: match[2] === "×" ? "x" : match[2],
  };
};

const extractProduct = (text: string) => {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:our|the|a)\s+([a-z][a-z\s]+?)(?:\s+(?:tool|app|platform|product|saas)|\s+for|\s*[,.]|\s*$)/,
    /announcement(?:\s+for)?\s+([a-z][a-z\s]+)/,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) return cap(m[1].trim().split(" ").slice(0, 3).join(" "));
  }
  return null;
};

export const mockGenerate = (prompt: string, brand: Brand): Storyboard => {
  const product = extractProduct(prompt);
  const number = extractNumber(prompt);

  const hookLines = product
    ? [`Meet ${brand.name}.`, `${product}, reimagined.`]
    : [`Introducing`, brand.name + "."];

  const stat = number
    ? { value: number.value, suffix: number.suffix, label: "Teams already on board" }
    : { value: "10000", suffix: "+", label: `Teams shipping with ${brand.name}` };

  const features = product
    ? [
        { title: "Fast", body: "Setup in under 60 seconds." },
        { title: "Smart", body: "Built for how teams actually work." },
        { title: "Open", body: "Connects to every tool you already use." },
      ]
    : [
        { title: "Speed", body: "Built for momentum." },
        { title: "Clarity", body: "One source of truth." },
        { title: "Scale", body: "From two to two thousand." },
      ];

  const titleVariants = ["mask", "typewriter", "scale", "split"] as const;
  const statVariants = ["count", "spin", "mask"] as const;
  const ctaVariants = ["fade", "mask", "scale"] as const;
  const pick = <T extends readonly unknown[]>(arr: T) =>
    arr[Math.floor(Math.random() * arr.length)] as T[number];

  // Vary order randomly
  const orderings = [
    ["kineticTitle", "statReveal", "featureGrid", "ctaCard"],
    ["statReveal", "kineticTitle", "featureGrid", "ctaCard"],
    ["kineticTitle", "featureGrid", "statReveal", "ctaCard"],
    ["kineticTitle", "statReveal", "ctaCard"],
    ["statReveal", "featureGrid", "ctaCard"],
  ] as const;
  const order = pick(orderings);

  const sceneMap = {
    kineticTitle: {
      type: "kineticTitle" as const,
      duration: 45 + Math.floor(Math.random() * 30),
      lines: hookLines,
      variant: pick(titleVariants),
      sfx: pick(["whoosh", "whip", "ding"] as const),
    },
    statReveal: {
      type: "statReveal" as const,
      duration: 60 + Math.floor(Math.random() * 25),
      value: stat.value,
      suffix: stat.suffix,
      label: stat.label,
      variant: pick(statVariants),
      sfx: pick(["ding", "whoosh"] as const),
    },
    featureGrid: {
      type: "featureGrid" as const,
      duration: 80 + Math.floor(Math.random() * 35),
      heading: pick([
        "Why teams switch.",
        "Built for momentum.",
        "Plan. Build. Ship.",
        "Three reasons.",
      ] as const),
      features,
      sfx: pick(["page-turn", "switch"] as const),
    },
    ctaCard: {
      type: "ctaCard" as const,
      duration: 65 + Math.floor(Math.random() * 30),
      headline: `Try ${brand.name}.`,
      subtext: pick([
        "Free, no card.",
        "Start today.",
        "Get it free.",
      ] as const),
      buttonLabel: pick(["Get started", "Try it free", "Sign up"] as const),
      variant: pick(ctaVariants),
      sfx: pick(["whip", "ding", "whoosh"] as const),
    },
  };

  return {
    brand,
    scenes: order.map((t) => sceneMap[t as keyof typeof sceneMap]),
  };
};

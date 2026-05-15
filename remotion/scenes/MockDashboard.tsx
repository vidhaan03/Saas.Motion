import { loadFont } from "@remotion/google-fonts/Inter";
import type { Brand } from "../schema";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

type Props = { brand: Brand };

const navItems = ["Inbox", "Cycles", "Projects", "Roadmap", "Insights"];
const cards = [
  { title: "Active sprint", value: "23", delta: "+4" },
  { title: "In review", value: "12", delta: "+2" },
  { title: "Shipped", value: "47", delta: "+8" },
];
const rows = [
  { id: "ENG-241", title: "Fix onboarding crash on Safari", who: "BR" },
  { id: "ENG-240", title: "Add CSV export to billing dashboard", who: "AK" },
  { id: "ENG-239", title: "Refactor auth callback flow", who: "MC" },
  { id: "ENG-238", title: "Improve search ranking algorithm", who: "JD" },
  { id: "ENG-237", title: "Migrate analytics events to v2", who: "BR" },
];

export const MockDashboard: React.FC<Props> = ({ brand }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0e0e12",
        color: "white",
        fontFamily,
        display: "flex",
        flexDirection: "row",
        position: "relative",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: 200,
          background: "#08080b",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            color: brand.accent,
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          {brand.name}
        </div>
        {navItems.map((item, i) => (
          <div
            key={item}
            style={{
              padding: "10px 14px",
              fontSize: 14,
              borderRadius: 8,
              background: i === 1 ? `${brand.accent}22` : "transparent",
              color: i === 1 ? brand.accent : "rgba(255,255,255,0.7)",
              fontWeight: i === 1 ? 600 : 400,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            Cycles · Sprint 24
          </div>
          <div
            style={{
              background: brand.accent,
              color: "#08080b",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + New issue
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 12 }}>
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                flex: 1,
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 6,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 800 }}>
                  {card.value}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: brand.accent,
                    fontWeight: 600,
                  }}
                >
                  {card.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            In progress
          </div>
          {rows.map((row, i) => (
            <div
              key={row.id}
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 13,
                borderBottom:
                  i < rows.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  minWidth: 60,
                }}
              >
                {row.id}
              </div>
              <div style={{ flex: 1, color: "rgba(255,255,255,0.85)" }}>
                {row.title}
              </div>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: `${brand.accent}33`,
                  color: brand.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {row.who}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

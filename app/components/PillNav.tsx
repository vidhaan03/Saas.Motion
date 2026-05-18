// Glassy pill-shaped navigation chrome used at the top of welcome,
// generating and editor views. Pass any nav items / buttons as children;
// this just provides the consistent surface (blur + border + shadow).
//
// Wrap with a `<header className="relative flex justify-center px-6 pt-6">`
// or position absolutely yourself, depending on the view.

type Props = {
  children: React.ReactNode;
  /**
   * Full-width vs auto-width. The editor view uses full-width so the
   * Save/Graph/Generate actions can hug the right edge; the welcome view
   * uses auto so the nav stays compact around the logotype.
   */
  fullWidth?: boolean;
  className?: string;
};

export const PillNav = ({ children, fullWidth = false, className = "" }: Props) => (
  <nav
    className={`flex items-center gap-2 rounded-full border px-2 py-1.5 backdrop-blur-2xl ${
      fullWidth ? "w-full max-w-[1400px]" : ""
    } ${className}`}
    style={{
      background: "color-mix(in srgb, var(--bg-elev) 70%, transparent)",
      borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
      boxShadow: "var(--shadow)",
    }}
  >
    {children}
  </nav>
);

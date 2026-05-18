// Two-layer atmospheric background used as the visual constant across
// welcome, generating and editor views. Radial peach/coral gradients on
// the Claude beige base, plus a subtle SVG noise overlay.
//
// Place once at the top of the view; siblings need `relative` to layer.

export const AtmosphericBackdrop = () => (
  <>
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(ellipse at 15% 0%, #FCDFCB 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, #E8A689 0%, transparent 55%), linear-gradient(180deg, var(--bg) 0%, var(--bg-warm) 100%)",
      }}
    />
    <div
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-multiply"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  </>
);

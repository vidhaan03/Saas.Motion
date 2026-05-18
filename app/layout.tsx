import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Fraunces is the closest free analog to Claude's Copernicus — old-style
// numerals, generous apertures, soft contrast. Use for hero typography.
const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "motion.saas — prompt to ad",
  description: "Generate SaaS launch ads from a prompt.",
};

// Inline no-flash script. Runs BEFORE React hydrates so the page's first
// paint uses the right theme (otherwise we'd see a beige flash on dark-mode
// users, or vice versa). Reads localStorage + prefers-color-scheme.
const NO_FLASH_THEME = `(function() {
  try {
    var stored = localStorage.getItem('motion-saas:theme');
    var setting = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var theme = setting === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : setting;
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
      // The inline no-flash script below sets `data-theme` on the client
      // before React hydrates. That's an intentional client-only attribute
      // change; this suppression tells React not to flag it as a mismatch.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type { Brand, ProductCarouselStyle } from "../schema";
import { THEME, ease } from "../theme";
import { Grain } from "../components/Grain";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
});

const { fontFamily: monoFamily } = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

type Product = {
  name: string;
  category?: string;
  image?: string;
  price?: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
  ctaLabel?: string;
  featured?: boolean;
  accent?: string;
};

type Props = {
  heading?: string;
  style?: ProductCarouselStyle;
  products: Product[];
  brand: Brand;
  sceneIndex?: number;
};

const CARD_W = 480;
const CARD_GAP = 36;

type StyleTokens = {
  bg: string;
  pageText: string;
  pageHeadingColor: string;
  cardBg: string;
  cardBorder: string;
  cardBorderWidth: number;
  cardBackdrop?: string;
  cardShadow: string;
  cardRadius: number;
  text: string;
  textMuted: string;
  textFaint: string;
  buttonBg: string;
  buttonText: string;
  buttonRadius: number;
  fontFamily: string;
  priceFamily: string;
  featuredBadgeBg: string;
  featuredBadgeText: string;
  dotActive: string;
  dotIdle: string;
};

const tokensFor = (
  style: ProductCarouselStyle,
  brand: Brand,
): StyleTokens => {
  switch (style) {
    case "glass":
      return {
        bg: `linear-gradient(135deg, ${brand.color} 0%, ${brand.accent} 50%, #F59E0B 100%)`,
        pageText: "#FFFFFF",
        pageHeadingColor: "#FFFFFF",
        cardBg: "rgba(255,255,255,0.12)",
        cardBorder: "rgba(255,255,255,0.25)",
        cardBorderWidth: 1,
        cardBackdrop: "blur(20px)",
        cardShadow:
          "0 30px 70px -20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
        cardRadius: 28,
        text: "#FFFFFF",
        textMuted: "rgba(255,255,255,0.78)",
        textFaint: "rgba(255,255,255,0.55)",
        buttonBg: "rgba(255,255,255,0.22)",
        buttonText: "#FFFFFF",
        buttonRadius: 14,
        fontFamily,
        priceFamily: fontFamily,
        featuredBadgeBg: "rgba(255,255,255,0.95)",
        featuredBadgeText: "#0a0a0c",
        dotActive: "#FFFFFF",
        dotIdle: "rgba(255,255,255,0.4)",
      };
    case "dark":
      return {
        bg: "#0A0A0C",
        pageText: "#FFFFFF",
        pageHeadingColor: "#FFFFFF",
        cardBg: "#1A1A1E",
        cardBorder: "rgba(255,255,255,0.08)",
        cardBorderWidth: 1,
        cardShadow: `0 30px 70px -20px rgba(0,0,0,0.6), 0 0 60px -20px ${brand.accent}44`,
        cardRadius: 24,
        text: "#FFFFFF",
        textMuted: "rgba(255,255,255,0.65)",
        textFaint: "rgba(255,255,255,0.4)",
        buttonBg: brand.accent,
        buttonText: "#0a0a0c",
        buttonRadius: 12,
        fontFamily,
        priceFamily: fontFamily,
        featuredBadgeBg: brand.accent,
        featuredBadgeText: "#0a0a0c",
        dotActive: brand.accent,
        dotIdle: "rgba(255,255,255,0.18)",
      };
    case "brutalist":
      return {
        bg: "#FAFAFA",
        pageText: "#0A0A0C",
        pageHeadingColor: "#0A0A0C",
        cardBg: "#FFFFFF",
        cardBorder: "#0A0A0C",
        cardBorderWidth: 4,
        cardShadow: "8px 8px 0 0 #0A0A0C",
        cardRadius: 0,
        text: "#0A0A0C",
        textMuted: "rgba(10,10,12,0.65)",
        textFaint: "rgba(10,10,12,0.4)",
        buttonBg: "#0A0A0C",
        buttonText: "#FFFFFF",
        buttonRadius: 0,
        fontFamily,
        priceFamily: monoFamily,
        featuredBadgeBg: brand.accent,
        featuredBadgeText: "#0a0a0c",
        dotActive: "#0A0A0C",
        dotIdle: "rgba(10,10,12,0.18)",
      };
    case "classic":
    default:
      return {
        bg: "linear-gradient(180deg, #F4F1E8 0%, #EAEEF7 100%)",
        pageText: "#0F2A66",
        pageHeadingColor: "#0F2A66",
        cardBg: "#FFFFFF",
        cardBorder: "rgba(0,0,0,0.05)",
        cardBorderWidth: 1,
        cardShadow:
          "0 30px 70px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)",
        cardRadius: 28,
        text: "#0F2A66",
        textMuted: "rgba(15,42,102,0.55)",
        textFaint: "rgba(15,42,102,0.4)",
        buttonBg: "#1E40AF",
        buttonText: "#FFFFFF",
        buttonRadius: 14,
        fontFamily,
        priceFamily: fontFamily,
        featuredBadgeBg: "#FBBF24",
        featuredBadgeText: "#0a0a0c",
        dotActive: "#1E40AF",
        dotIdle: "rgba(15,42,102,0.18)",
      };
  }
};

const Stars: React.FC<{ rating: number; color: string; muted: string }> = ({
  rating,
  color,
  muted,
}) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div style={{ display: "flex", gap: 2, fontSize: 22, lineHeight: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        return (
          <span key={i} style={{ color: filled || isHalf ? color : muted }}>
            ★
          </span>
        );
      })}
    </div>
  );
};

const Card: React.FC<{
  product: Product;
  isActive: boolean;
  brand: Brand;
  enterT: number;
  tokens: StyleTokens;
  style: ProductCarouselStyle;
}> = ({ product, isActive, brand, enterT, tokens, style }) => {
  const accent = product.accent ?? brand.accent;
  const scale = isActive ? 1.05 : 0.92;
  const opacity = isActive ? 1 : 0.7;

  return (
    <div
      style={{
        width: CARD_W,
        flexShrink: 0,
        transform: `scale(${scale * enterT}) translateY(${interpolate(enterT, [0, 1], [60, 0])}px)`,
        opacity: opacity * enterT,
        background: tokens.cardBg,
        borderRadius: tokens.cardRadius,
        padding: "28px 26px",
        border:
          tokens.cardBorderWidth > 0
            ? `${tokens.cardBorderWidth}px solid ${tokens.cardBorder}`
            : "none",
        boxShadow: isActive ? tokens.cardShadow : "none",
        backdropFilter: tokens.cardBackdrop,
        WebkitBackdropFilter: tokens.cardBackdrop,
        fontFamily: tokens.fontFamily,
        position: "relative",
      }}
    >
      {product.featured && isActive ? (
        <div
          style={{
            position: "absolute",
            top: -14,
            right: 24,
            background: tokens.featuredBadgeBg,
            color: tokens.featuredBadgeText,
            fontWeight: 700,
            fontSize: 16,
            padding: "8px 18px",
            borderRadius: tokens.cardRadius > 0 ? 999 : 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>★</span>
          <span style={{ letterSpacing: "0.04em" }}>FEATURED</span>
        </div>
      ) : null}

      {product.category ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background:
              style === "brutalist" ? accent : `${accent}1A`,
            color:
              style === "brutalist"
                ? "#0a0a0c"
                : style === "glass"
                  ? "#FFFFFF"
                  : accent,
            padding: "6px 14px",
            borderRadius: tokens.cardRadius > 0 ? 999 : 0,
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 18,
            border:
              style === "brutalist" ? "2px solid #0a0a0c" : "none",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background:
                style === "brutalist"
                  ? "#0a0a0c"
                  : style === "glass"
                    ? "#FFFFFF"
                    : accent,
              borderRadius: tokens.cardRadius > 0 ? 2 : 0,
              display: "inline-block",
            }}
          />
          {product.category}
        </div>
      ) : null}

      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: tokens.cardRadius > 0 ? 14 : 0,
          background:
            style === "brutalist"
              ? `${accent}30`
              : style === "glass"
                ? "rgba(255,255,255,0.18)"
                : style === "dark"
                  ? "#0E0E12"
                  : `linear-gradient(135deg, ${accent}20, ${accent}05)`,
          marginBottom: 22,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border:
            style === "brutalist" ? "3px solid #0a0a0c" : "none",
        }}
      >
        {product.image ? (
          <Img
            src={product.image}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 64, color: `${accent}55` }}>▦</span>
        )}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          color: tokens.text,
          marginBottom: 6,
          minHeight: 72,
        }}
      >
        {product.name}
      </div>

      {product.sku ? (
        <div
          style={{
            fontFamily: tokens.priceFamily,
            fontSize: 16,
            fontWeight: 500,
            color: tokens.textFaint,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          SKU: {product.sku}
        </div>
      ) : null}

      {product.rating != null ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
            fontSize: 18,
          }}
        >
          <Stars
            rating={product.rating}
            color="#FBBF24"
            muted={tokens.textFaint}
          />
          <span style={{ color: tokens.textMuted, fontWeight: 500 }}>
            {product.rating.toFixed(1)}
          </span>
          {product.reviewCount != null ? (
            <span
              style={{
                color: tokens.textFaint,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>♥</span>
              {product.reviewCount.toLocaleString()}
            </span>
          ) : null}
        </div>
      ) : null}

      {product.price ? (
        <div
          style={{
            fontFamily: tokens.priceFamily,
            fontSize: 38,
            fontWeight: style === "brutalist" ? 700 : 800,
            color:
              style === "brutalist" || style === "classic"
                ? "#1E40AF"
                : tokens.text,
            marginBottom: 18,
            letterSpacing: "-0.02em",
          }}
        >
          {product.price}
        </div>
      ) : null}

      <button
        style={{
          width: "100%",
          background: isActive ? tokens.buttonBg : `${tokens.buttonBg}D0`,
          color: tokens.buttonText,
          fontWeight: 700,
          fontSize: 22,
          padding: "16px",
          borderRadius: tokens.buttonRadius,
          border:
            style === "brutalist"
              ? "3px solid #0a0a0c"
              : style === "glass"
                ? "1px solid rgba(255,255,255,0.3)"
                : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: "pointer",
          letterSpacing: "0.01em",
          fontFamily: tokens.fontFamily,
        }}
      >
        <span style={{ fontSize: 20 }}>🛒</span>
        {product.ctaLabel ?? "View Product"}
      </button>
    </div>
  );
};

export const ProductCarousel: React.FC<Props> = ({
  heading,
  style = "classic",
  products,
  brand,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const tokens = tokensFor(style, brand);

  const segmentFrames = Math.max(
    40,
    Math.floor(durationInFrames / products.length),
  );
  const rawActive = frame / segmentFrames;
  const activeIndex = Math.min(products.length - 1, Math.floor(rawActive));

  const scrollProgress = interpolate(
    frame,
    [0, durationInFrames - 12],
    [0, products.length - 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease.expoOut,
    },
  );

  const enterT = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });

  const headingT = interpolate(frame, [4, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.expoOut,
  });

  const exitT = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: tokens.bg, opacity: exitT }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: `${THEME.padding.scene}px 40px`,
          gap: 48,
        }}
      >
        {heading ? (
          <div
            style={{
              fontFamily: tokens.fontFamily,
              fontWeight: 700,
              fontSize: 56,
              color: tokens.pageHeadingColor,
              letterSpacing:
                style === "brutalist" ? "0" : "-0.02em",
              textAlign: "center",
              textTransform: style === "brutalist" ? "uppercase" : "none",
              transform: `translateY(${interpolate(headingT, [0, 1], [16, 0])}px)`,
              opacity: headingT,
            }}
          >
            {heading}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: CARD_GAP,
            transform: `translateX(${
              -(scrollProgress * (CARD_W + CARD_GAP)) +
              (CARD_W + CARD_GAP) * Math.floor((products.length - 1) / 2) -
              CARD_W / 2 +
              (CARD_W + CARD_GAP) / 2
            }px)`,
            alignItems: "center",
            transition: "transform 0.3s linear",
          }}
        >
          {products.map((product, i) => {
            const cardEnter = interpolate(
              frame,
              [i * 4, i * 4 + 22],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: ease.expoOut,
              },
            );
            return (
              <Card
                key={i}
                product={product}
                isActive={i === activeIndex}
                brand={brand}
                enterT={Math.min(enterT, cardEnter)}
                tokens={tokens}
                style={style}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {products.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={i}
                style={{
                  width: isActive ? 32 : 12,
                  height: 12,
                  borderRadius:
                    style === "brutalist" ? 0 : 999,
                  background: isActive ? tokens.dotActive : tokens.dotIdle,
                  transition: "all 0.3s ease",
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
      {style !== "glass" ? <Grain opacity={0.03} /> : null}
    </AbsoluteFill>
  );
};

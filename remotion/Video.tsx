import { AbsoluteFill, Audio, Sequence } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { KineticTitle } from "./scenes/KineticTitle";
import { StatReveal } from "./scenes/StatReveal";
import { FeatureGrid } from "./scenes/FeatureGrid";
import { ProductDemo } from "./scenes/ProductDemo";
import { TestimonialQuote } from "./scenes/TestimonialQuote";
import { LogoWall } from "./scenes/LogoWall";
import { CTACard } from "./scenes/CTACard";
import { MultiScript } from "./scenes/MultiScript";
import { ProductCarousel } from "./scenes/ProductCarousel";
import { UiShowcase } from "./scenes/UiShowcase";
import { sfxUrlFor } from "../lib/sfx";
import type { Scene, Storyboard } from "./schema";

const renderScene = (
  scene: Scene,
  brand: Storyboard["brand"],
  sceneIndex: number,
) => {
  switch (scene.type) {
    case "kineticTitle":
      return (
        <KineticTitle
          lines={scene.lines}
          emoji={scene.emoji}
          brand={brand}
          sceneIndex={sceneIndex}
          variant={scene.variant}
        />
      );
    case "statReveal":
      return (
        <StatReveal
          value={scene.value}
          label={scene.label}
          suffix={scene.suffix}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "featureGrid":
      return (
        <FeatureGrid
          heading={scene.heading}
          features={scene.features}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "productDemo":
      return (
        <ProductDemo
          screenshot={scene.screenshot}
          caption={scene.caption}
          actions={scene.actions}
          brand={brand}
        />
      );
    case "testimonialQuote":
      return (
        <TestimonialQuote
          quote={scene.quote}
          author={scene.author}
          role={scene.role}
          company={scene.company}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "logoWall":
      return (
        <LogoWall
          heading={scene.heading}
          logos={scene.logos}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "ctaCard":
      return (
        <CTACard
          headline={scene.headline}
          subtext={scene.subtext}
          buttonLabel={scene.buttonLabel}
          url={scene.url}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "multiScript":
      return (
        <MultiScript
          glyphs={scene.glyphs}
          caption={scene.caption}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "productCarousel":
      return (
        <ProductCarousel
          heading={scene.heading}
          style={scene.style}
          products={scene.products}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
    case "uiShowcase":
      return (
        <UiShowcase
          screenshots={scene.screenshots}
          screenshot={scene.screenshot}
          frame={scene.frame}
          layout={scene.layout}
          direction={scene.direction}
          animation={scene.animation}
          caption={scene.caption}
          url={scene.url}
          brand={brand}
          sceneIndex={sceneIndex}
        />
      );
  }
};

// Map an explicit transition key (set by user via the edge picker, OR by AI)
// to a Remotion presentation. Returns null for "cut" so no transition is added.
const presentationForKey = (key: string) => {
  switch (key) {
    case "fade":
      return fade();
    case "wipe-up":
      return wipe({ direction: "from-bottom" });
    case "wipe-down":
      return wipe({ direction: "from-top" });
    case "wipe-left":
      return wipe({ direction: "from-right" });
    case "wipe-right":
      return wipe({ direction: "from-left" });
    case "slide-up":
      return slide({ direction: "from-bottom" });
    case "slide-down":
      return slide({ direction: "from-top" });
    case "slide-left":
      return slide({ direction: "from-right" });
    case "slide-right":
      return slide({ direction: "from-left" });
    default:
      return fade();
  }
};

// Per-scene-type defaults. Used when scene.outTransition is unset or "auto".
const defaultTransitionForType = (
  sceneType: Scene["type"],
): string => {
  switch (sceneType) {
    case "kineticTitle":
      return "wipe-up";
    case "statReveal":
      return "slide-up";
    case "featureGrid":
      return "fade";
    case "productDemo":
      return "slide-left";
    case "testimonialQuote":
      return "fade";
    case "logoWall":
      return "wipe-right";
    case "ctaCard":
      return "fade";
    case "multiScript":
      return "fade";
    case "productCarousel":
      return "slide-left";
    case "uiShowcase":
      return "fade";
  }
};

const transitionForScene = (scene: Scene, idx: number) => {
  const override = scene.outTransition;
  // "cut" = no transition at all
  if (override === "cut") return null;
  const key =
    override && override !== "auto"
      ? override
      : defaultTransitionForType(scene.type);
  const durationInFrames = key === "fade" ? 12 : 10;
  // TS can't unify wipe/slide/fade presentation prop types — cast through
  // unknown since they're interchangeable at the TransitionSeries call site.
  const presentation = presentationForKey(key) as ReturnType<typeof fade>;
  return (
    <TransitionSeries.Transition
      key={`trans-${idx}`}
      presentation={presentation}
      timing={
        key.startsWith("slide")
          ? springTiming({
              config: { damping: 200 },
              durationInFrames,
            })
          : linearTiming({ durationInFrames })
      }
    />
  );
};

export const Video: React.FC<{ storyboard: Storyboard }> = ({ storyboard }) => {
  const scenes = storyboard.scenes;
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <TransitionSeries>
        {scenes.flatMap((scene, idx) => {
          const sfx = sfxUrlFor(scene);
          const isLast = idx === scenes.length - 1;
          const nodes = [
            <TransitionSeries.Sequence
              key={`seq-${idx}`}
              durationInFrames={scene.duration}
            >
              <AbsoluteFill>
                {renderScene(scene, storyboard.brand, idx)}
                {sfx ? <Audio src={sfx} volume={0.25} /> : null}
              </AbsoluteFill>
            </TransitionSeries.Sequence>,
          ];
          if (!isLast) {
            const t = transitionForScene(scene, idx);
            if (t) nodes.push(t);
          }
          return nodes;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

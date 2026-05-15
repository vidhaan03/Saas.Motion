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
  }
};

// Each scene type exits with its own transition flavor — gives the cut
// between scenes a sense of intent rather than uniform crossfade.
const transitionForType = (sceneType: Scene["type"], idx: number) => {
  switch (sceneType) {
    case "kineticTitle":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={wipe({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 10 })}
        />
      );
    case "statReveal":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: 14,
          })}
        />
      );
    case "featureGrid":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
      );
    case "productDemo":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: 12 })}
        />
      );
    case "testimonialQuote":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />
      );
    case "logoWall":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: 10 })}
        />
      );
    case "ctaCard":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
      );
    case "multiScript":
      return (
        <TransitionSeries.Transition
          key={`trans-${idx}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 18 })}
        />
      );
  }
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
          if (!isLast) nodes.push(transitionForType(scene.type, idx));
          return nodes;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

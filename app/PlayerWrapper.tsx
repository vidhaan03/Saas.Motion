"use client";

import { Player } from "@remotion/player";
import { Video } from "../remotion/Video";
import { totalDuration, type Storyboard } from "../remotion/schema";
import { ASPECT_META, type Aspect } from "../lib/aspect";

export const PlayerWrapper: React.FC<{
  storyboard: Storyboard;
  aspect?: Aspect;
}> = ({ storyboard, aspect = "vertical" }) => {
  const duration = totalDuration(storyboard);
  const meta = ASPECT_META[aspect];
  return (
    <Player
      component={Video}
      inputProps={{ storyboard }}
      durationInFrames={duration}
      fps={30}
      compositionWidth={meta.width}
      compositionHeight={meta.height}
      style={{
        width: "100%",
        aspectRatio: meta.ratio,
        borderRadius: 24,
        overflow: "hidden",
        background: "black",
        boxShadow: "0 30px 80px -30px rgba(0,0,0,0.5)",
      }}
      controls
      loop
      autoPlay
      acknowledgeRemotionLicense
    />
  );
};

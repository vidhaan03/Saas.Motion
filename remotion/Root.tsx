import { Composition } from "remotion";
import { Video } from "./Video";
import { sampleStoryboards } from "../lib/sampleStoryboards";
import { totalDuration } from "./schema";

const sample = sampleStoryboards[0];

export const RemotionRoot = () => {
  return (
    <Composition
      id="Ad"
      component={Video}
      durationInFrames={totalDuration(sample)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ storyboard: sample }}
    />
  );
};

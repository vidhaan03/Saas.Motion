export const ASPECTS = ["vertical", "square", "horizontal"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_META: Record<
  Aspect,
  {
    label: string;
    short: string;
    ratio: string;
    width: number;
    height: number;
    platforms: string;
  }
> = {
  vertical: {
    label: "Vertical",
    short: "9:16",
    ratio: "9 / 16",
    width: 1080,
    height: 1920,
    platforms: "TikTok · Reels · Shorts",
  },
  square: {
    label: "Square",
    short: "1:1",
    ratio: "1 / 1",
    width: 1080,
    height: 1080,
    platforms: "LinkedIn · Instagram feed",
  },
  horizontal: {
    label: "Horizontal",
    short: "16:9",
    ratio: "16 / 9",
    width: 1920,
    height: 1080,
    platforms: "YouTube · Web · LinkedIn ads",
  },
};

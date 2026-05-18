import type { Scene } from "../remotion/schema";

export const SFX_URL: Record<string, string> = {
  whoosh: "https://remotion.media/whoosh.wav",
  whip: "https://remotion.media/whip.wav",
  "page-turn": "https://remotion.media/page-turn.wav",
  switch: "https://remotion.media/switch.wav",
  "mouse-click": "https://remotion.media/mouse-click.wav",
  "shutter-modern": "https://remotion.media/shutter-modern.wav",
  ding: "https://remotion.media/ding.wav",
};

export const defaultSfxForScene = (
  type: Scene["type"],
): string => {
  switch (type) {
    case "kineticTitle":
      return "whoosh";
    case "statReveal":
      return "ding";
    case "featureGrid":
      return "page-turn";
    case "productDemo":
      return "mouse-click";
    case "testimonialQuote":
      return "shutter-modern";
    case "logoWall":
      return "switch";
    case "ctaCard":
      return "ding";
    case "multiScript":
      return "ding";
    case "productCarousel":
      return "switch";
    case "uiShowcase":
      return "whoosh";
    case "aiShot":
      return "whoosh";
  }
};

export const sfxUrlFor = (scene: Scene): string | null => {
  const key = scene.sfx ?? defaultSfxForScene(scene.type);
  if (key === "none") return null;
  return SFX_URL[key] ?? null;
};

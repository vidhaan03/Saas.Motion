// Server-safe typeface metadata. Just the const tuple of keys + the
// derived union type + the default. NO Remotion font loading happens
// here, so this file can be imported from server-only modules like
// schema.ts / streamGenerate.ts without crashing.
//
// The matching CSS font-family strings live in ./fonts.ts (client-only).

export const TYPEFACE_KEYS = [
  "inter",
  "spaceGrotesk",
  "manrope",
  "outfit",
  "fraunces",
  "playfair",
  "bebasNeue",
  "archivoBlack",
] as const;

export type TypefaceKey = (typeof TYPEFACE_KEYS)[number];

export const DEFAULT_TYPEFACE: TypefaceKey = "inter";

// The player's painting from Gallery 44's easel: kept as a PNG data URL in
// its own localStorage key, checked on the way back in.

export const PAINTING_KEY = "daydaze-painting-v1";
/** The easel canvas, in pixels. */
export const CANVAS_SIZE = 240;
/** The biggest painting kept (a busy 240 px PNG is well under this). */
const MAX_LENGTH = 400_000;
const PREFIX = "data:image/png;base64,";

export const PAINTS = [
  "#141018",
  "#f8f4ee",
  "#ff2f9a",
  "#ff8a3d",
  "#ffd84f",
  "#7dff6b",
  "#3fe0d0",
  "#2e7dff",
  "#9b5cff",
  "#b5502a",
  "#6b7a2a",
  "#ffb3d9",
] as const;
export const BRUSHES = [
  { size: 3, label: "Fine" },
  { size: 9, label: "Medium" },
  { size: 22, label: "Broad" },
] as const;

/** A stored painting, or null when it isn't a plausible PNG data URL. */
export function cleanPainting(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith(PREFIX) || value.length > MAX_LENGTH) return null;
  const body = value.slice(PREFIX.length);
  return body.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(body) ? value : null;
}

// The furniture looks: recolors a model's material color toward a house
// palette while keeping its light and dark (so folds, legs and trim still
// read). Pure; the client feeds it each material's HSL.

export type Hsl = { h: number; s: number; l: number };

// variant 1 pink velvet, 2 cream, 3 teal (variant 0 keeps the model's own)
const LOOKS: readonly { h: number; s: number; lift: number }[] = [
  { h: 0, s: 0, lift: 0 },
  { h: 0.93, s: 0.7, lift: 0.18 },
  { h: 0.1, s: 0.38, lift: 0.4 },
  { h: 0.5, s: 0.55, lift: 0.14 },
];

/** The material color a look gives: the look's hue and saturation (grays stay
 * mostly gray), the original lightness lifted a little toward the look. */
export function tintHsl(color: Hsl, variant: number): Hsl {
  const look = LOOKS[variant];
  if (!look || variant === 0) return color;
  const lift = color.l + (1 - color.l) * look.lift;
  return {
    h: look.h,
    // near-black and near-white keep a muted version of the look
    s: look.s * Math.min(1, 0.35 + color.s * 2),
    l: Math.min(0.92, Math.max(0.1, lift)),
  };
}

/** How many looks tintHsl knows (including the original). */
export const TINT_COUNT = LOOKS.length;

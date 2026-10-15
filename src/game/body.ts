// Body-shape sliders in the closet. Every trait is a whole 0 to 100 slider
// and maps to a small, clothed-doll scale: nothing leaves the doll's outline.

export const BODY_TRAITS = ["bust", "hips", "waist", "height"] as const;

export type BodyTrait = (typeof BODY_TRAITS)[number];

export type BodyShape = Record<BodyTrait, number>;

export const BODY_LABELS: Record<BodyTrait, string> = {
  bust: "Bust",
  hips: "Hips and butt",
  waist: "Waist",
  height: "Height",
};

// The scale at slider 0 and slider 100. Waist 0 is the slimmest.
const SCALE_RANGE: Record<BodyTrait, readonly [number, number]> = {
  bust: [0.94, 1.06],
  hips: [0.92, 1.08],
  waist: [0.9, 1.1],
  height: [0.94, 1.06],
};

const MIDDLE = 50;

export const DEFAULT_BODY: BodyShape = {
  bust: MIDDLE,
  hips: MIDDLE,
  waist: MIDDLE,
  height: MIDDLE,
};

/** Rounds to a whole slider step and clamps; NaN falls back to the middle. */
export function clampTrait(value: number): number {
  if (!Number.isFinite(value)) return MIDDLE;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Each saved trait that is a whole 0 to 100 value, the default for the rest. */
export function cleanBody(value: unknown): BodyShape {
  const fields = new Map<string, unknown>(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
  const body = { ...DEFAULT_BODY };
  for (const trait of BODY_TRAITS) {
    const saved = fields.get(trait);
    if (
      typeof saved === "number" &&
      Number.isInteger(saved) &&
      saved >= 0 &&
      saved <= 100
    ) {
      body[trait] = saved;
    }
  }
  return body;
}

/** The multiplier each part of the doll is drawn at. */
export function bodyScales(body: BodyShape): Record<BodyTrait, number> {
  const scales = {} as Record<BodyTrait, number>;
  for (const trait of BODY_TRAITS) {
    const [low, high] = SCALE_RANGE[trait];
    scales[trait] = low + ((high - low) * body[trait]) / 100;
  }
  return scales;
}

// Clay Day: eight-band wheel profiles, fixed-volume walls and saved ceramics.
export const TARGETS = {
  bowl: { height: 0.6, radii: [0.24, 0.29, 0.36, 0.43, 0.49, 0.54, 0.58, 0.6] },
  vase: { height: 1.2, radii: [0.3, 0.42, 0.49, 0.5, 0.43, 0.32, 0.25, 0.28] },
  mug: { height: 0.8, radii: [0.33, 0.36, 0.38, 0.39, 0.39, 0.39, 0.4, 0.41] },
} as const;
export type PotTarget = keyof typeof TARGETS;
export const GLAZES = [
  { name: "Terracotta", color: "#d58256" },
  { name: "Sea glass", color: "#68b5a4" },
  { name: "Mango cream", color: "#edbd69" },
  { name: "Lilac", color: "#b59aca" },
  { name: "Ink blue", color: "#456c96" },
] as const;
export type Clay = { left: number[]; right: number[]; height: number };
export type FiredPot = {
  clay: Clay;
  target: PotTarget;
  glaze: string;
  score: number;
};

export function freshClay(): Clay {
  return {
    left: Array<number>(8).fill(0.4),
    right: Array<number>(8).fill(0.4),
    height: 0.9,
  };
}

export function shapeClay(
  clay: Clay,
  side: "left" | "right",
  band: number,
  radius: number,
): Clay {
  if (
    !Number.isInteger(band) ||
    band < 0 ||
    band >= 8 ||
    !Number.isFinite(radius)
  )
    return clay;
  const radii = [...clay[side]];
  radii[band] = Math.max(0.15, Math.min(0.95, radius));
  return { ...clay, [side]: radii };
}

export function thicknessAt(clay: Clay, band: number): number {
  const radius = Math.max(clay.left[band], clay.right[band]);
  return 0.11 * (0.4 / radius) * (0.9 / clay.height);
}

function validClay(value: unknown): value is Clay {
  if (!value || typeof value !== "object") return false;
  const left: unknown = Reflect.get(value, "left");
  const right: unknown = Reflect.get(value, "right");
  const height: unknown = Reflect.get(value, "height");
  const radii = (v: unknown): v is number[] =>
    Array.isArray(v) &&
    v.length === 8 &&
    v.every(
      (r: unknown) =>
        typeof r === "number" && Number.isFinite(r) && r >= 0.15 && r <= 0.95,
    );
  return (
    radii(left) &&
    radii(right) &&
    typeof height === "number" &&
    Number.isFinite(height) &&
    height >= 0.4 &&
    height <= 1.5
  );
}

/** Radius samples describe both hands; the wheel renders their mean profile. */
export function scorePot(clay: Clay, target: PotTarget) {
  if (!validClay(clay))
    return { score: 0, symmetry: 0, thickness: 0, collapsed: true };
  let error = 0;
  let asymmetry = 0;
  let thickness = Infinity;
  for (let i = 0; i < 8; i++) {
    error +=
      Math.abs((clay.left[i] + clay.right[i]) / 2 - TARGETS[target].radii[i]) /
      8;
    asymmetry += Math.abs(clay.left[i] - clay.right[i]) / 8;
    thickness = Math.min(thickness, thicknessAt(clay, i));
  }
  const symmetry = Math.max(0, Math.round(100 * (1 - asymmetry / 0.25)));
  const shape = Math.max(0, 1 - error / 0.3);
  const height = Math.max(
    0,
    1 - Math.abs(clay.height - TARGETS[target].height) / 0.8,
  );
  const collapsed = thickness < 0.035;
  const score = collapsed
    ? 0
    : Math.round(
        65 * shape +
          20 * height +
          (10 * symmetry) / 100 +
          5 * Math.min(1, thickness / 0.06),
      );
  return { score, symmetry, thickness, collapsed };
}

/** Salvage only finished, safe pieces; recalculate rather than trust a score. */
export function cleanPot(value: unknown): FiredPot | null {
  if (!value || typeof value !== "object") return null;
  const clay: unknown = Reflect.get(value, "clay");
  const target: unknown = Reflect.get(value, "target");
  const glaze: unknown = Reflect.get(value, "glaze");
  if (
    !validClay(clay) ||
    (target !== "bowl" && target !== "vase" && target !== "mug") ||
    typeof glaze !== "string" ||
    !GLAZES.some((g) => g.color === glaze)
  )
    return null;
  const result = scorePot(clay, target);
  return result.collapsed
    ? null
    : {
        clay: {
          left: [...clay.left],
          right: [...clay.right],
          height: clay.height,
        },
        target,
        glaze,
        score: result.score,
      };
}

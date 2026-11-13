// What a flat roof is made of and what is on it. Every building used to wear
// the same dark tar slab with two white boxes; from the overview, the El or
// the Ferris wheel the city read as brown lids. Now each roof is one of three
// surfaces (tar paper, tarred gravel, a smooth membrane: CC0 Poly Haven sets
// box-mapped in meshes.ts), in a color that suits it, and a building may wear
// a bulkhead, vents, a skylight or a garden. Pure and deterministic: the same
// building has the same roof on every load.
import { hash, pick } from "./hash.ts";

/** The instance kinds a roof surface can be (one material each, meshes.ts). */
export type RoofKind = "roof" | "roofGravel" | "roofSkin";

/** The surface and tint of a roof; the tint multiplies the texture. */
export type RoofLook = { kind: RoofKind; color: string };

const TAR = ["#ffffff", "#d9cfc4", "#c9d2d8", "#e0c9b8", "#b8b2aa"];
const GRAVEL = ["#ffffff", "#e8dcc8", "#cfd6d9", "#d9c9b0"];
/** Membranes: white, silver, painted green, terracotta, tan, blue. */
const SKIN = [
  "#f4f1ea",
  "#f4f1ea",
  "#c9d4da",
  "#9fb7a4",
  "#c8795c",
  "#d8c08a",
  "#8da4bf",
];
/** Shares of roofs that are tar paper and tarred gravel; the rest are membrane. */
const TAR_SHARE = 0.4;
const GRAVEL_SHARE = 0.25;

/** The roof of the building whose center is (cx, cz). */
export function roofLook(cx: number, cz: number): RoofLook {
  const r = hash(cx, cz, 41);
  const c = hash(cx, cz, 42);
  if (r < TAR_SHARE) return { kind: "roof", color: pick(TAR, c) };
  if (r < TAR_SHARE + GRAVEL_SHARE)
    return { kind: "roofGravel", color: pick(GRAVEL, c) };
  return { kind: "roofSkin", color: pick(SKIN, c) };
}

/** What stands on a roof, each decided by the building's own hash. */
export type RoofKit = {
  /** A stair bulkhead, the box over the roof door. */
  bulkhead: boolean;
  /** Plumbing vents, 0 to 3. */
  vents: number;
  /** A skylight. */
  skylight: boolean;
  /** A garden under string lights. */
  garden: boolean;
};

const GARDEN_SHARE = 0.1;

/** The kit of the building whose center is (cx, cz). */
export function roofKit(cx: number, cz: number): RoofKit {
  return {
    bulkhead: hash(cx, cz, 43) < 0.6,
    vents: Math.floor(hash(cx, cz, 44) * 4),
    skylight: hash(cx, cz, 45) < 0.4,
    garden: hash(cx, cz, 46) < GARDEN_SHARE,
  };
}

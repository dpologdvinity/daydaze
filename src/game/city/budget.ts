// What the low tier's streamed city costs to draw from where she stands: the
// city plan with the New York bays the low tier wears, plus the instanced
// downloads drawn over it (street trees, street and park furniture, the
// park's undergrowth), each costed from its GLB. Pure; budget.test.ts holds
// it to the low tier's 250 draw calls and 300k triangles and checks every
// model cost below against the shipped file.

import { cellsWithin } from "./cells.ts";
import {
  FURNITURE_KINDS,
  MODEL_DIR,
  furnitureVisible,
  type FurnitureKind,
} from "./furniture.ts";
import {
  GROWTH_CAP,
  GROWTH_MODELS,
  GROWTH_RANGE,
  type GrowthKind,
} from "./park.ts";
import { elBoxes } from "./el.ts";
import { BAY_TRIANGLES, HOUSE_MODELS, type BayInstance } from "./nyc.ts";
import { ALL_GROWTH } from "./growth.ts";
import { TREE_VARIANTS, drawCallsOf, planCity, trianglesOf } from "./plan.ts";
import {
  BAY_RANGE,
  POINT_LIGHTS,
  TREE_LOW_FAR,
  VIEW_RADIUS,
} from "./tuning.ts";
import type { Vec2 } from "../walk.ts";

/** Triangles and primitives (one instanced mesh each) per model, by its
 * path under public/models/ without ".glb". */
export const MODEL_COST: Readonly<
  Record<string, { tris: number; parts: number }>
> = {
  "nature/commontree-1-lo": { tris: 643, parts: 2 },
  "nature/commontree-2-lo": { tris: 517, parts: 2 },
  "nature/commontree-3-lo": { tris: 600, parts: 1 },
  "nature/commontree-4-lo": { tris: 473, parts: 2 },
  "nature/commontree-5-lo": { tris: 434, parts: 1 },
  "nature/grass-common-tall-lo": { tris: 118, parts: 1 },
  "nature/grass-wispy-short-lo": { tris: 210, parts: 1 },
  "nature/fern-1-lo": { tris: 96, parts: 1 },
  "nature/bush-common-lo": { tris: 300, parts: 1 },
  "nature/flower-3-group-lo": { tris: 265, parts: 2 },
  "nature/flower-4-group-lo": { tris: 800, parts: 2 },
  "nature/rock-medium-1-lo": { tris: 50, parts: 1 },
  "street/lamp": { tris: 350, parts: 3 },
  "street/hydrant": { tris: 300, parts: 2 },
  "street/trashcan": { tris: 249, parts: 2 },
  "street/bench": { tris: 630, parts: 1 },
  "street/mailbox": { tris: 240, parts: 1 },
  "street/newsbox": { tris: 700, parts: 2 },
  "street/meter": { tris: 164, parts: 3 },
  "street/bikerack": { tris: 800, parts: 1 },
  "street/planter": { tris: 622, parts: 3 },
  "street/palm": { tris: 350, parts: 1 },
  "street/trafficlight": { tris: 956, parts: 1 },
  "street/busstop": { tris: 300, parts: 2 },
  "street/sign-stop": { tris: 300, parts: 3 },
  "street/sign-noparking": { tris: 244, parts: 4 },
  "park/fountain": { tris: 899, parts: 1 },
  "park/gazebo": { tris: 358, parts: 1 },
  "park/rowboat": { tris: 350, parts: 1 },
  "park/duck": { tris: 250, parts: 7 },
  "park/picnic-table": { tris: 449, parts: 3 },
  "park/basket": { tris: 200, parts: 1 },
  "park/blanket": { tris: 128, parts: 2 },
  "beach/carousel": { tris: 806, parts: 5 },
  "beach/chaise": { tris: 300, parts: 2 },
  "beach/cone": { tris: 250, parts: 2 },
  "beach/ferris": { tris: 1599, parts: 1 },
  "beach/hotdog-cart": { tris: 300, parts: 8 },
  "beach/lifeguard": { tris: 500, parts: 7 },
  "beach/popcorn-cart": { tris: 500, parts: 7 },
  "beach/rail": { tris: 120, parts: 1 },
  "beach/sandcastle": { tris: 249, parts: 1 },
  "beach/towel": { tris: 60, parts: 2 },
  "beach/umbrella-blue": { tris: 214, parts: 4 },
  "beach/umbrella-red": { tris: 214, parts: 4 },
};

/** The low tier's far-twin tree model for a variant (CityTrees). */
const treeModel = (variant: number) => `nature/commontree-${variant + 1}-lo`;
/** A furniture kind's model (CityFurniture's url). */
const furnitureModel = (kind: FurnitureKind) =>
  `${MODEL_DIR[kind] ?? "street"}/${kind}`;
const growthModel = (kind: GrowthKind) => `nature/${GROWTH_MODELS[kind]}`;

/** Every model the low-tier cost reads. */
export function modelsInBudget(): string[] {
  return [
    ...Array.from({ length: TREE_VARIANTS }, (_, i) => treeModel(i)),
    ...FURNITURE_KINDS.map(furnitureModel),
    ...Object.keys(GROWTH_MODELS)
      .filter((k): k is GrowthKind => k in GROWTH_MODELS)
      .map(growthModel),
  ];
}

const GROWTH = ALL_GROWTH;

/** The El is always drawn: four merged box meshes (trestle, stone, rails,
 * roofs) and three train cars of about 1,600 triangles each. */
const EL_TRIANGLES = elBoxes([]).length * 12 + 3 * 1600;
const EL_DRAW_CALLS = 4 + 3;

/** The widest view she can have of the ground, in radians: the camera sits
 * behind her and looks ahead, so about a third of the circle is on screen. */
const VIEW_WEDGE = (2 * Math.PI) / 3;
/** Bays this near are always counted: the camera can swing round them. */
const ALWAYS_SEEN = 6;

/** The triangles of the bays in the worst view: bays are culled one by one
 * (InstancedMesh2), so only those inside the best wedge of `VIEW_WEDGE` count. */
export function worstViewBayTriangles(
  bays: readonly BayInstance[],
  at: Vec2,
): number {
  const BINS = 36;
  const bins = new Array<number>(BINS).fill(0);
  let always = 0;
  for (const bay of bays) {
    const cost = BAY_TRIANGLES[bay.kind];
    const dx = bay.x - at[0];
    const dz = bay.z - at[1];
    if (Math.hypot(dx, dz) < ALWAYS_SEEN) always += cost;
    else {
      const angle = (Math.atan2(dz, dx) + 2 * Math.PI) % (2 * Math.PI);
      bins[Math.floor((angle / (2 * Math.PI)) * BINS) % BINS] += cost;
    }
  }
  const span = Math.ceil((VIEW_WEDGE / (2 * Math.PI)) * BINS) + 1;
  let worst = 0;
  for (let start = 0; start < BINS; start++) {
    let sum = 0;
    for (let k = 0; k < span; k++) sum += bins[(start + k) % BINS];
    worst = Math.max(worst, sum);
  }
  return worst + always;
}

/** The low tier's draw calls and triangles at `at`, plus what the plan
 * alone costs and how many bays it wears. */
export function lowTierCost(at: Vec2): {
  drawCalls: number;
  triangles: number;
  planTriangles: number;
  bays: number;
} {
  const plan = planCity(
    cellsWithin(at, VIEW_RADIUS),
    POINT_LIGHTS.low,
    at,
    BAY_RANGE.low,
  );
  // instances per model; a model with any costs one draw call per part
  const counts = new Map<string, number>();
  const add = (model: string) =>
    counts.set(model, (counts.get(model) ?? 0) + 1);
  const away = (x: number, z: number) => Math.hypot(x - at[0], z - at[1]);
  for (const t of plan.trees)
    if (away(t.x, t.z) <= TREE_LOW_FAR) add(treeModel(t.variant));
  for (const f of plan.furniture)
    if (furnitureVisible(f.kind, away(f.x, f.z), true))
      add(furnitureModel(f.kind));
  const grown = new Map<GrowthKind, number>();
  for (const g of GROWTH) {
    const n = grown.get(g.kind) ?? 0;
    if (away(g.x, g.z) > GROWTH_RANGE[g.kind][0] || n >= GROWTH_CAP.low)
      continue;
    grown.set(g.kind, n + 1);
    add(growthModel(g.kind));
  }
  // houses are drawn from their models: one draw call per part, 4 at most
  const houseModels = new Set(plan.houses.map((h) => h.variant)).size;
  let drawCalls =
    EL_DRAW_CALLS +
    drawCallsOf(plan) +
    Math.min(houseModels, HOUSE_MODELS.length) * 4;
  const allBays = plan.bays.reduce((n, b) => n + BAY_TRIANGLES[b.kind], 0);
  const planTriangles = trianglesOf(plan);
  // the bays are culled per instance: count only the worst view of them
  let triangles =
    planTriangles -
    allBays +
    worstViewBayTriangles(plan.bays, at) +
    EL_TRIANGLES;
  for (const [model, n] of counts) {
    const cost = MODEL_COST[model];
    if (!cost) throw new Error(`no cost for ${model}`);
    drawCalls += cost.parts;
    triangles += cost.tris * n;
  }
  return { drawCalls, triangles, planTriangles, bays: plan.bays.length };
}

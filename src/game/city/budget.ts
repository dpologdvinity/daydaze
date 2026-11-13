// What the low tier's streamed city costs to draw from where she stands: the
// city plan with the New York bays the low tier wears, plus the instanced
// downloads drawn over it (street trees, street and park furniture, the
// park's undergrowth), each costed from its GLB. Pure; budget.test.ts holds
// it to the low tier's 250 draw calls and 300k triangles and checks every
// model cost below against the shipped file.

import { FOOD_CARTS, FOOD_DRAW_RANGE, VENDOR_RANGE } from "./vendors.ts";
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
import { RESIDENTS, dogParkNear } from "./dogPark.ts";
import { AUDIENCE_DRAWN, BAND, CHAIRS, shellNear } from "./bandShell.ts";
import { PEDESTRIANS } from "./pedestrians.ts";
import { WILDLIFE, wildlifeNear } from "./parkWildlife.ts";
import { QUEUE_NEAR_LOW, QUEUE_PERSON_TRIS, QUEUE_SPOTS } from "./queues.ts";
import {
  bats,
  facadeCord,
  facadeLights,
  lanternStrings,
  pumpkins,
  treeLights,
  WARM_LIGHTS,
} from "./seasonSpots.ts";
import { CITY_FLEET, shipModel } from "../ships.ts";
import { BAY_TRIANGLES, HOUSE_MODELS, type BayInstance } from "./nyc.ts";
import { LOT_NEAR, LOT_SPECS, type LotInstance } from "./districts.ts";
import { ALL_GROWTH } from "./growth.ts";
import {
  TREE_VARIANTS,
  drawCallsOf,
  planCity,
  trianglesOf,
  type CityPlan,
} from "./plan.ts";
import {
  BAY_RANGE,
  CROWD_CAP,
  CROWD_RADIUS,
  PEDESTRIAN_DOLLS,
  PEDESTRIAN_DOLL_RADIUS,
  POINT_LIGHTS,
  TREE_LOW_FAR,
  VIEW_RADIUS,
} from "./tuning.ts";
import { BODY_KEYS, ROSTER_BODY } from "../driving/bodies.ts";
import { PARKED_CARS, PARKED_RANGE } from "./dressing.ts";
import { GLOW_DRAWS, GLOW_TRIS_PER_CAR } from "../driving/lamps.ts";
import {
  CAR_SLOT,
  TRAFFIC_COUNT,
  TRAFFIC_SEED,
  createTraffic,
  laneMetersWithin,
} from "./traffic.ts";
import type { Vec2 } from "../walk.ts";

/** Triangles and primitives (one instanced mesh each) per model, by its
 * path under public/models/ without ".glb". */
export const MODEL_COST: Readonly<
  Record<string, { tris: number; parts: number }>
> = {
  "doll/body-lo": { tris: 3168, parts: 1 },
  "doll/hair-bob-lo": { tris: 2053, parts: 2 },
  "doll/outfit-jeans-lo": { tris: 847, parts: 1 },
  "doll/shoes-platforms-lo": { tris: 1286, parts: 1 },
  "vendors/truck": { tris: 3360, parts: 1 },
  "vendors/cart": { tris: 1054, parts: 1 },
  "doll/body": { tris: 31056, parts: 4 },
  "doll/hair-bob": { tris: 8572, parts: 2 },
  "doll/outfit-jeans": { tris: 4236, parts: 1 },
  "doll/shoes-platforms": { tris: 6436, parts: 1 },
  "nature/street-tree-1-lo": { tris: 493, parts: 2 },
  "nature/street-tree-2-lo": { tris: 509, parts: 2 },
  "nature/street-tree-3-lo": { tris: 396, parts: 2 },
  "nature/street-tree-4-lo": { tris: 525, parts: 2 },
  "nature/street-tree-5-lo": { tris: 353, parts: 2 },
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
  "street/bench": { tris: 350, parts: 2 },
  "street/boardbench": { tris: 350, parts: 2 },
  "street/mailbox": { tris: 240, parts: 1 },
  "street/newsbox": { tris: 700, parts: 2 },
  "street/meter": { tris: 164, parts: 3 },
  "street/bikerack": { tris: 800, parts: 1 },
  "street/planter": { tris: 622, parts: 3 },
  "street/palm": { tris: 472, parts: 2 },
  "street/palm-2": { tris: 344, parts: 2 },
  "street/trafficlight": { tris: 956, parts: 1 },
  "street/busstop": { tris: 300, parts: 2 },
  "street/sign-stop": { tris: 300, parts: 3 },
  "street/sign-noparking": { tris: 244, parts: 4 },
  "park/fountain": { tris: 899, parts: 1 },
  "park/gazebo": { tris: 358, parts: 1 },
  "park/rowboat": { tris: 350, parts: 1 },
  "park/duck": { tris: 250, parts: 7 },
  "park/band-shell": { tris: 2208, parts: 1 },
  "park/lawn-chair": { tris: 216, parts: 1 },
  "park/band-trumpet": { tris: 1840, parts: 1 },
  "park/band-sax": { tris: 894, parts: 2 },
  "park/band-drum": { tris: 1964, parts: 2 },
  "park/band-stand": { tris: 1046, parts: 2 },
  "animals/rabbit": { tris: 2463, parts: 1 },
  "animals/deer": { tris: 2098, parts: 1 },
  "animals/fox": { tris: 1848, parts: 1 },
  "animals/labrador": { tris: 2367, parts: 2 },
  "animals/husky": { tris: 1920, parts: 1 },
  "animals/shibainu": { tris: 1950, parts: 1 },
  "park/picnic-table": { tris: 449, parts: 3 },
  "park/basket": { tris: 200, parts: 1 },
  "park/blanket": { tris: 128, parts: 2 },
  "beach/carousel": { tris: 806, parts: 5 },
  "beach/chaise": { tris: 300, parts: 2 },
  // the offshore fleet's far twins (src/game/ships.ts): the liner is two parts
  // (hull, windows)
  "ships/cruise": { tris: 742, parts: 2 },
  "ships/sail-lo": { tris: 1072, parts: 1 },
  "ships/viking": { tris: 1638, parts: 1 },
  "beach/cone": { tris: 250, parts: 2 },
  "beach/hotdog-cart": { tris: 300, parts: 8 },
  "beach/lifeguard": { tris: 500, parts: 7 },
  "beach/popcorn-cart": { tris: 500, parts: 7 },
  "beach/kiosk-market": { tris: 700, parts: 4 },
  "beach/kiosk-vendor": { tris: 900, parts: 13 },
  "beach/kiosk-booth": { tris: 700, parts: 4 },
  "beach/rail": { tris: 120, parts: 1 },
  "beach/sandcastle": { tris: 249, parts: 1 },
  "beach/towel": { tris: 60, parts: 2 },
  "beach/umbrella-blue": { tris: 214, parts: 4 },
  "beach/umbrella-red": { tris: 214, parts: 4 },
  // the downloaded car bodies (src/game/driving/bodies.ts): near for the
  // player's own car, -lo for traffic on the low tier. Each file holds ONE
  // wheel, drawn four times (WHEEL_TRIS adds the other three).
  "cars/sedan": { tris: 1694, parts: 6 },
  "cars/hatch": { tris: 1864, parts: 6 },
  "cars/suv": { tris: 2034, parts: 6 },
  "cars/coupe": { tris: 1818, parts: 6 },
  "cars/sports": { tris: 1888, parts: 6 },
  "cars/cop": { tris: 1972, parts: 6 },
  "cars/taxi": { tris: 2018, parts: 6 },
  "cars/ambulance": { tris: 1118, parts: 5 },
  "cars/schoolbus": { tris: 1254, parts: 5 },
  "cars/sedan-lo": { tris: 724, parts: 5 },
  "cars/hatch-lo": { tris: 726, parts: 5 },
  "cars/suv-lo": { tris: 724, parts: 5 },
  "cars/coupe-lo": { tris: 726, parts: 5 },
  "cars/sports-lo": { tris: 724, parts: 5 },
  "cars/cop-lo": { tris: 724, parts: 5 },
  "cars/taxi-lo": { tris: 722, parts: 5 },
  "cars/ambulance-lo": { tris: 725, parts: 5 },
  "cars/schoolbus-lo": { tris: 725, parts: 5 },
};

/** The low tier's far-twin tree model for a variant (CityTrees). */
const treeModel = (variant: number) => `nature/street-tree-${variant + 1}-lo`;
/** A furniture kind's model (CityFurniture's url). */
const furnitureModel = (kind: FurnitureKind) =>
  `${MODEL_DIR[kind] ?? "street"}/${kind}`;
const growthModel = (kind: GrowthKind) => `nature/${GROWTH_MODELS[kind]}`;

/** Every model the low-tier cost reads. */
export function modelsInBudget(): string[] {
  return [
    "doll/body-lo",
    "doll/hair-bob-lo",
    "doll/outfit-jeans-lo",
    "doll/shoes-platforms-lo",
    "vendors/truck",
    "vendors/cart",
    "doll/body",
    "doll/hair-bob",
    "doll/outfit-jeans",
    "doll/shoes-platforms",
    ...Array.from({ length: TREE_VARIANTS }, (_, i) => treeModel(i)),
    ...Object.keys(MODEL_COST).filter(
      (k) =>
        k.startsWith("cars/") ||
        k.startsWith("animals/") ||
        k.startsWith("park/band-") ||
        k === "park/lawn-chair",
    ),
    ...FURNITURE_KINDS.map(furnitureModel),
    ...CITY_FLEET.map((s) => shipModel(s.kind, true)),
    ...Object.keys(GROWTH_MODELS)
      .filter((k): k is GrowthKind => k in GROWTH_MODELS)
      .map(growthModel),
  ];
}

const GROWTH = ALL_GROWTH;

/** What a car's wheels cost beyond the one wheel in its GLB: the file has one
 * wheel at the origin and the client draws it at all four axles. A distance
 * twin's wheel is a 10-sided disc (36 triangles); a near body's is its tyre and
 * hub (420 for the dearest, the sedan's, which traffic and parked cars share).
 * carBodies.test.ts holds both to the shipped files. */
export const WHEEL_TRIS = { near: 420, lo: 36 } as const;
const EXTRA_WHEELS = 3;

/** A procedural jeepney as Traffic draws it: shell 156, trim 60, chrome 380 and
 * dark 36 triangles, plus four 12-sided wheels and four lamp boxes. Six draws. */
const JEEPNEY_TRIS = 880;
const JEEPNEY_DRAWS = 6;
/** Draws for the player's own car on top of its model's parts: the underglow
 * pool and the two headlight beams. */
const OWN_CAR_EXTRAS = 3;

/** Meters from her within which the offshore fleet counts: the world camera's
 * far plane is 600 and the camera trails her by a few more. */
const SHIP_RANGE = 640;

/** Traffic.tsx draws vehicles out to this many meters on the low tier. */
const LOW_TRAFFIC_RANGE = 80;
/** Within this many meters of a road center she may be at the wheel. */
const AT_THE_WHEEL = 6;
/** Margin over the vehicles expected in range: they queue at lights and
 * follow one another, so a bound taken at the busiest instant would never be
 * seen (as CROWD_MARGIN does for the walkers). */
const TRAFFIC_MARGIN = 2.5;
/** Every lane the city has, in meters, for the share of it that is in range. */
const CITY_LANE_METERS = laneMetersWithin([0, 0], 1e6);

/**
 * Traffic and the player's own car on the low tier, priced from where she
 * stands. The low fleet is fixed (TRAFFIC_COUNT.low vehicles from
 * TRAFFIC_SEED, plus a hailed taxi) and roams every lane evenly, so the
 * vehicles in range number the fleet times the share of the city's lanes
 * within 80 m (a park lawn's few; a crossing's more), with a margin and never
 * more than fit bumper to bumper. The dearest vehicles are the ones priced,
 * each as a jeepney or a body's distance twin (the low tier never draws the
 * near models), with one merged draw per body model. On a road she may be at
 * the wheel of the dearest road car: its near model (six draws: paint,
 * glass, trim, tyres, rims, lamps; the wheels instanced four to a car) with
 * underglow and beams.
 */
export function trafficCost(at: Vec2): {
  drawCalls: number;
  triangles: number;
} {
  const fleet = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED).cars.map((c) =>
    c.body ? loCarTris(c.body) : JEEPNEY_TRIS,
  );
  fleet.push(loCarTris("taxi"));
  fleet.sort((a, b) => b - a);
  const lanes = laneMetersWithin(at, LOW_TRAFFIC_RANGE);
  const expected = Math.ceil(
    (fleet.length * lanes * TRAFFIC_MARGIN) / CITY_LANE_METERS,
  );
  const drawn = fleet.slice(0, Math.min(expected, Math.ceil(lanes / CAR_SLOT)));
  // one draw per body model, the jeepneys' six, and the cars' shared wheels
  // plus the night glow of the lit cars (carGlow.ts), priced as if it were night
  let drawCalls =
    drawn.length > 0
      ? Math.min(drawn.length, BODY_KEYS.length) +
        JEEPNEY_DRAWS +
        1 +
        GLOW_DRAWS
      : 0;
  let triangles =
    drawn.reduce((n, t) => n + t, 0) + drawn.length * GLOW_TRIS_PER_CAR;
  if (laneMetersWithin(at, AT_THE_WHEEL) > 0) {
    const own = Object.values(ROSTER_BODY).map((k) => costOf(`cars/${k}`));
    const dearest = own.reduce((a, b) => (b.tris > a.tris ? b : a));
    drawCalls += dearest.parts + OWN_CAR_EXTRAS;
    triangles += dearest.tris + EXTRA_WHEELS * WHEEL_TRIS.near;
  }
  return { drawCalls, triangles };
}

/**
 * The kerb-parked cars within range of `at` on the low tier, each as its
 * body's distance twin, one merged draw per body in range (their own meshes,
 * apart from the traffic's). Exact: the spots are fixed.
 */
export function parkedCost(at: Vec2): { drawCalls: number; triangles: number } {
  const bodies = new Set<string>();
  let triangles = 0;
  for (const car of PARKED_CARS) {
    if (Math.hypot(car.x - at[0], car.z - at[1]) > PARKED_RANGE.low) continue;
    bodies.add(car.body);
    triangles += loCarTris(car.body);
  }
  // plus the one draw of their wheels
  return { drawCalls: bodies.size > 0 ? bodies.size + 1 : 0, triangles };
}

/** A body's distance twin as drawn: its file's wheel drawn four times. */
function loCarTris(body: string): number {
  return costOf(`cars/${body}-lo`).tris + EXTRA_WHEELS * WHEEL_TRIS.lo;
}

function costOf(model: string): { tris: number; parts: number } {
  const cost = MODEL_COST[model];
  if (!cost) throw new Error(`no cost for ${model}`);
  return cost;
}

/** The El is always drawn: four merged box meshes (trestle, stone, rails,
 * roofs) and three train cars of about 1,600 triangles each. */
const EL_TRIANGLES = elBoxes([]).length * 12 + 3 * 1600;
const EL_DRAW_CALLS = 4 + 3;

/** The seasonal dressings' models (public/models/seasons/): shown only near
 * the player (NEAR_LOW in SeasonalDressing.tsx), at most 160 of each. */
export const SEASON_MODEL: Readonly<
  Record<string, { tris: number; parts: number }>
> = {
  "seasons/tree": { tris: 3504, parts: 6 },
  "seasons/pumpkin": { tris: 644, parts: 2 },
  "seasons/bat": { tris: 1046, parts: 5 },
  "seasons/lantern": { tris: 354, parts: 2 },
};
const SEASON_NEAR_LOW = 60;
const SEASON_CAP = 160;
/** An icosahedron bulb and a tetrahedron cord speck. */
const BULB_TRIS = 20;
const SPECK_TRIS = 4;

/** The dearest season at `at` on the low tier: the avenue's light swags (bulbs
 * and cord, always drawn) plus the Plaza tree, or the pumpkins and bats near
 * her, or the lanterns near her. June's rainbow swags equal the winter ones
 * minus the tree. Overlapping seasons never stack models of the same kind. */
export function seasonalCost(at: Vec2): {
  drawCalls: number;
  triangles: number;
} {
  const near = (p: { at: readonly [number, number, number] }) =>
    Math.hypot(p.at[0] - at[0], p.at[2] - at[1]) <= SEASON_NEAR_LOW;
  const model = (name: string, count: number) => {
    const m = SEASON_MODEL[name];
    if (!m) throw new Error(`no cost for ${name}`);
    return count === 0
      ? { drawCalls: 0, triangles: 0 }
      : { drawCalls: m.parts, triangles: m.tris * Math.min(count, SEASON_CAP) };
  };
  const swags = {
    drawCalls: 2,
    triangles:
      facadeLights(WARM_LIGHTS).length * BULB_TRIS +
      facadeCord().length * SPECK_TRIS,
  };
  const sum = (...parts: { drawCalls: number; triangles: number }[]) =>
    parts.reduce(
      (a, p) => ({
        drawCalls: a.drawCalls + p.drawCalls,
        triangles: a.triangles + p.triangles,
      }),
      { drawCalls: 0, triangles: 0 },
    );
  const winter = sum(swags, model("seasons/tree", 1), {
    drawCalls: 0,
    triangles: treeLights().length * BULB_TRIS,
  });
  const halloween = sum(
    swags,
    model("seasons/pumpkin", pumpkins().filter(near).length),
    model("seasons/bat", bats().filter(near).length),
  );
  const lanterns = lanternStrings();
  const lunar = sum(
    {
      drawCalls: 1,
      triangles: lanterns.cord.length * SPECK_TRIS,
    },
    model("seasons/lantern", lanterns.lanterns.filter(near).length),
  );
  return [winter, halloween, lunar].reduce((a, b) =>
    b.triangles > a.triangles ? b : a,
  );
}

/** A far NPC's doll on the low tier: the far body (3,168) in the dearest
 * far twins of hair (2,844), outfit (837) and shoes (1,286), which any doll
 * past 4.6 m wears. Its eyes hide with the far body (HumanDoll). About six
 * draw calls a doll. */
export const NPC_DOLL_TRIS = 8_300;
const NPC_DOLL_CALLS = 6;
/** A crowd figure: the dearest of Kenney's four walkers (street/walker-*). */
export const CROWD_FIGURE_TRIS = 880;

/** The share of a walker's strip within `radius` of `at`, sampled at nine
 * points: she paces it end to end, so it is how long she spends in range. */
function shareInRange(
  p: (typeof PEDESTRIANS)[number],
  at: Vec2,
  radius: number,
) {
  let inside = 0;
  for (let i = 0; i <= 8; i++) {
    const x = p.a[0] + ((p.b[0] - p.a[0]) * i) / 8;
    const z = p.a[1] + ((p.b[1] - p.a[1]) * i) / 8;
    if (Math.hypot(x - at[0], z - at[1]) <= radius) inside++;
  }
  return inside / 9;
}

/** Margin over the walkers' expected count in range: they are spread along
 * their strips, so a bound taken at the busiest instant would never be seen. */
const CROWD_MARGIN = 1.35;

/** The live people and animals around `at` on the low tier, priced for the
 * worst hour: the nearest walkers as dolls (and their dogs), the crowd past
 * them as instanced figures, the park's wandering wildlife and the dog yard's
 * residents. Each animal calls `add` with its model; the rest is returned. */
export function liveCost(
  at: Vec2,
  add: (model: string) => void,
): { drawCalls: number; triangles: number } {
  const walkers = PEDESTRIANS.filter((p) => !p.bike);
  const expected = (radius: number) =>
    walkers.reduce((n, p) => n + shareInRange(p, at, radius), 0);
  const dolls = Math.min(
    PEDESTRIAN_DOLLS.low,
    Math.ceil(expected(PEDESTRIAN_DOLL_RADIUS.low) * CROWD_MARGIN),
  );
  // the dog walkers among them each bring a dog
  for (const p of walkers.filter((w) => w.dog).slice(0, dolls))
    if (p.dog && shareInRange(p, at, PEDESTRIAN_DOLL_RADIUS.low) > 0)
      add(`animals/${p.dog}`);
  const crowd = Math.min(
    CROWD_CAP * 4,
    Math.max(0, Math.ceil(expected(CROWD_RADIUS.low) * CROWD_MARGIN) - dolls),
  );
  // the band shell, while the park band is on (10:00 to 17:30): the stage,
  // chairs and instruments, the whole band and a few of the audience as dolls
  let bandDolls = 0;
  if (shellNear(at[0], at[1])) {
    add("park/band-shell");
    for (const _ of CHAIRS) add("park/lawn-chair");
    for (const m of BAND) {
      if (m.instrument === "baton") continue;
      add(`park/band-${m.instrument}`);
      add("park/band-stand");
    }
    bandDolls = BAND.length + AUDIENCE_DRAWN.low;
  }
  if (wildlifeNear(at[0], at[1]))
    for (const w of WILDLIFE) if (!w.highOnly) add(`animals/${w.kind}`);
  if (dogParkNear(at[0], at[1]))
    for (const r of RESIDENTS) add(`animals/${r.kind}`);
  return {
    // one instanced draw per look and stride in use
    drawCalls: (dolls + bandDolls) * NPC_DOLL_CALLS + (crowd > 0 ? 8 : 0),
    triangles: (dolls + bandDolls) * NPC_DOLL_TRIS + crowd * CROWD_FIGURE_TRIS,
  };
}

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
  return worstView(
    bays.map((bay) => ({ x: bay.x, z: bay.z, cost: BAY_TRIANGLES[bay.kind] })),
    at,
  );
}

/** How far behind her the camera can sit: a lot this much farther than
 * LOT_NEAR from her can still be near the camera. */
const CAMERA_TRAIL = 12;

/** The same for the district lots (also culled one by one); those past the
 * camera's LOT_NEAR draw their far twin. */
export function worstViewLotTriangles(
  lots: readonly LotInstance[],
  at: Vec2,
): number {
  return worstView(
    lots.map((lot) => ({
      x: lot.x,
      z: lot.z,
      cost:
        Math.hypot(lot.x - at[0], lot.z - at[1]) < LOT_NEAR + CAMERA_TRAIL
          ? LOT_SPECS[lot.model].tris
          : LOT_SPECS[lot.model].lo,
    })),
    at,
  );
}

/** The most triangles of per-instance-culled `items` in any wedge of view. */
function worstView(
  items: readonly { x: number; z: number; cost: number }[],
  at: Vec2,
): number {
  const BINS = 36;
  const bins = new Array<number>(BINS).fill(0);
  let always = 0;
  for (const { x, z, cost } of items) {
    const dx = x - at[0];
    const dz = z - at[1];
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

/** The streamed city plan from where she stands on a tier: what CityScene
 * draws and what lowTierCost prices, so the two cannot drift apart.
 * `bays: false` is the `?bays=0` comparison view. */
export function planView(
  at: Vec2,
  tier: "low" | "high",
  bays = true,
): CityPlan {
  return planCity(
    cellsWithin(at, VIEW_RADIUS),
    POINT_LIGHTS[tier],
    at,
    bays ? BAY_RANGE[tier] : 0,
  );
}

/** The low tier's draw calls and triangles at `at`, plus what the plan
 * alone costs and how many bays it wears. */
export function lowTierCost(at: Vec2): {
  drawCalls: number;
  triangles: number;
  planTriangles: number;
  bays: number;
  lots: number;
} {
  const plan = planView(at, "low");
  // instances per model; a model with any costs one draw call per part
  const counts = new Map<string, number>();
  const add = (model: string) =>
    counts.set(model, (counts.get(model) ?? 0) + 1);
  const away = (x: number, z: number) => Math.hypot(x - at[0], z - at[1]);
  // Worst case: truck in range. Repeated cart instances share one draw.
  add("vendors/truck");
  for (const cart of FOOD_CARTS)
    if (away(cart.at[0], cart.at[1]) <= FOOD_DRAW_RANGE) add("vendors/cart");
  // Vendors stand at least 16 m apart. At most one can wear a full costume
  // within HumanDoll's 4.6 m low-tier LOD range; neighbors wear low twins.
  if (FOOD_CARTS.some((cart) => away(cart.at[0], cart.at[1]) < VENDOR_RANGE)) {
    for (const model of [
      "doll/body",
      "doll/hair-bob",
      "doll/outfit-jeans",
      "doll/shoes-platforms",
    ])
      add(model);
  }
  const nearbyVendors = FOOD_CARTS.filter(
    (cart) => away(cart.at[0], cart.at[1]) < VENDOR_RANGE,
  ).length;
  for (let i = 1; i < nearbyVendors; i++) {
    for (const model of [
      "doll/body-lo",
      "doll/hair-bob-lo",
      "doll/outfit-jeans-lo",
      "doll/shoes-platforms-lo",
    ])
      add(model);
  }
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
  const allLots = plan.lots.reduce((n, l) => n + LOT_SPECS[l.model].tris, 0);
  const planTriangles = trianglesOf(plan);
  // the bays are culled per instance: count only the worst view of them
  let triangles =
    planTriangles -
    allBays -
    allLots +
    worstViewBayTriangles(plan.bays, at) +
    worstViewLotTriangles(plan.lots, at) +
    EL_TRIANGLES;
  for (const [model, n] of counts) {
    const cost = MODEL_COST[model];
    if (!cost) throw new Error(`no cost for ${model}`);
    drawCalls += cost.parts;
    triangles += cost.tris * n;
  }
  // the horizon's ships are separate meshes (they rock), so each one costs its
  // model's parts; drawn out to the camera's far plane (600 m) however she is
  // looking, buildings or no, so counted wherever they are in range
  for (const ship of CITY_FLEET) {
    if (away(ship.at[0], ship.at[1]) > SHIP_RANGE) continue;
    const cost = costOf(shipModel(ship.kind, true));
    drawCalls += cost.parts;
    triangles += cost.tris;
  }
  // the club queues: one draw call per look present, each person as dear as the dearest
  const queued = QUEUE_SPOTS.filter(
    (s) => Math.hypot(s.x - at[0], s.z - at[1]) <= QUEUE_NEAR_LOW,
  );
  drawCalls += new Set(queued.map((s) => s.look)).size;
  triangles += queued.length * QUEUE_PERSON_TRIS;
  const live = liveCost(at, (model) => {
    const cost = MODEL_COST[model];
    if (!cost) throw new Error(`no cost for ${model}`);
    drawCalls += cost.parts;
    triangles += cost.tris;
  });
  drawCalls += live.drawCalls;
  triangles += live.triangles;
  const season = seasonalCost(at);
  drawCalls += season.drawCalls;
  triangles += season.triangles;
  const traffic = trafficCost(at);
  drawCalls += traffic.drawCalls;
  triangles += traffic.triangles;
  const kerb = parkedCost(at);
  drawCalls += kerb.drawCalls;
  triangles += kerb.triangles;
  return {
    drawCalls,
    triangles,
    planTriangles,
    bays: plan.bays.length,
    lots: plan.lots.length,
  };
}

/**
 * Camera distances (meters from her) where the New York bays come and go.
 * Pulled out to the overview, the bays near her are a few pixels each yet
 * cost about a third of the frame under a software renderer, so the plan
 * drops them and the walls wear their painted windows; zooming back in
 * brings them back. Two edges, so a camera resting near one doesn't flicker.
 */
export const BAYS_CAMERA = { on: 90, off: 120 } as const;

/** Whether the plan should wear bays with the camera `distance` out, given
 * whether it wears them now. */
export function baysWanted(distance: number, wearing: boolean): boolean {
  if (distance <= BAYS_CAMERA.on) return true;
  if (distance >= BAYS_CAMERA.off) return false;
  return wearing;
}

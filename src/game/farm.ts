// Sunny Acres Farm: crop plots, growth stages, watering, harvesting, farm stand sales, and animal pens.
import type { Vec2 } from "./walk.ts";
import { rectFenceSpots } from "./zoo.ts";

export type CropId = "carrot" | "tomato" | "corn" | "wheat";

export type CropDef = {
  readonly id: CropId;
  readonly name: string;
  readonly seedPrice: number;
  readonly sellPrice: number;
  readonly growthDurationMs: number;
  readonly yieldMin: number;
  readonly yieldMax: number;
};

/** All four farm crops with prices and growth timers (~2 minutes real time). */
export const CROPS: Record<CropId, CropDef> = {
  carrot: {
    id: "carrot",
    name: "Carrot",
    seedPrice: 4,
    sellPrice: 12,
    growthDurationMs: 90_000,
    yieldMin: 2,
    yieldMax: 4,
  },
  tomato: {
    id: "tomato",
    name: "Tomato",
    seedPrice: 6,
    sellPrice: 18,
    growthDurationMs: 120_000,
    yieldMin: 2,
    yieldMax: 3,
  },
  corn: {
    id: "corn",
    name: "Corn",
    seedPrice: 10,
    sellPrice: 30,
    growthDurationMs: 150_000,
    yieldMin: 1,
    yieldMax: 3,
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    seedPrice: 5,
    sellPrice: 15,
    growthDurationMs: 100_000,
    yieldMin: 3,
    yieldMax: 5,
  },
};

export const CROP_IDS = Object.keys(CROPS) as readonly CropId[];

export function isCropId(value: unknown): value is CropId {
  return typeof value === "string" && Object.hasOwn(CROPS, value);
}

export type PlotState = {
  crop: CropId | null;
  plantedAt: number;
  wateredAt: number | null;
};

export type FarmSave = {
  plots: PlotState[];
  groceries: Record<CropId, number>;
  animalsFedAt: Record<string, number>;
};

export const PLOT_COUNT = 6;

/** Creates a fresh farm with 6 empty soil plots and empty harvest inventory. */
export function createDefaultFarm(): FarmSave {
  const plots: PlotState[] = [];
  for (let i = 0; i < PLOT_COUNT; i++) {
    plots.push({ crop: null, plantedAt: 0, wateredAt: null });
  }
  return {
    plots,
    groceries: {
      carrot: 0,
      tomato: 0,
      corn: 0,
      wheat: 0,
    },
    animalsFedAt: {},
  };
}

/** The own fields of a stored object (empty for anything else). */
function fieldsOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/**
 * Validates and salvages stored farm state from localStorage JSON.
 */
export function cleanFarm(raw: unknown): FarmSave {
  const fallback = createDefaultFarm();
  if (typeof raw !== "object" || raw === null) return fallback;

  const data = fieldsOf(raw);
  const plots: PlotState[] = [];
  const stored = data.plots;
  if (Array.isArray(stored)) {
    for (let i = 0; i < PLOT_COUNT; i++) {
      const p = fieldsOf(stored[i]);
      if (stored[i] && typeof stored[i] === "object") {
        const crop = isCropId(p.crop) ? p.crop : null;
        const plantedAt =
          typeof p.plantedAt === "number" && p.plantedAt > 0 ? p.plantedAt : 0;
        const wateredAt =
          typeof p.wateredAt === "number" && p.wateredAt > 0
            ? p.wateredAt
            : null;
        plots.push({ crop, plantedAt, wateredAt });
      } else {
        plots.push({ crop: null, plantedAt: 0, wateredAt: null });
      }
    }
  } else {
    plots.push(...fallback.plots);
  }

  const groceries: Record<CropId, number> = {
    carrot: 0,
    tomato: 0,
    corn: 0,
    wheat: 0,
  };
  const g = fieldsOf(data.groceries);
  for (const id of CROP_IDS) {
    const n = g[id];
    if (typeof n === "number" && n > 0) groceries[id] = Math.floor(n);
  }

  const animalsFedAt: Record<string, number> = {};
  for (const [k, v] of Object.entries(fieldsOf(data.animalsFedAt))) {
    if (typeof v === "number" && v > 0) animalsFedAt[k] = v;
  }

  return { plots, groceries, animalsFedAt };
}

/** Plants a seed on a designated empty plot. */
export function plantSeed(
  farm: FarmSave,
  plotIndex: number,
  crop: CropId,
  now: number,
): { farm: FarmSave; cost: number } | null {
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return null;
  const plot = farm.plots[plotIndex];
  if (plot.crop !== null) return null;

  const def = CROPS[crop];
  if (!def) return null;

  const nextPlots = farm.plots.map((p, i) =>
    i === plotIndex ? { crop, plantedAt: now, wateredAt: null } : { ...p },
  );

  return {
    farm: { ...farm, plots: nextPlots },
    cost: def.seedPrice,
  };
}

/** Waters an unwatered planted plot, beginning its growth stage progression. */
export function waterPlot(
  farm: FarmSave,
  plotIndex: number,
  now: number,
): FarmSave | null {
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return null;
  const plot = farm.plots[plotIndex];
  if (plot.crop === null) return null;
  if (plot.wateredAt !== null) return null;

  const nextPlots = farm.plots.map((p, i) =>
    i === plotIndex ? { ...p, wateredAt: now } : { ...p },
  );

  return { ...farm, plots: nextPlots };
}

export type CropGrowth = {
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  ready: boolean;
};

/**
 * Calculates growth progress and current visual model stage:
 * stage 0: dry/unwatered or empty
 * stage 1: early sprout (0% - 33%)
 * stage 2: vegetative growth (33% - 66%)
 * stage 3: flowering / mature (66% - 100%)
 * stage 4: ripe & harvestable (100%+)
 */
export function plotGrowth(plot: PlotState, now: number): CropGrowth {
  if (!plot.crop || plot.wateredAt === null) {
    return { stage: 0, progress: 0, ready: false };
  }

  const def = CROPS[plot.crop];
  const elapsed = Math.max(0, now - plot.wateredAt);
  const progress = Math.min(1, elapsed / def.growthDurationMs);

  if (progress >= 1) {
    return { stage: 4, progress: 1, ready: true };
  }
  if (progress >= 0.66) {
    return { stage: 3, progress, ready: false };
  }
  if (progress >= 0.33) {
    return { stage: 2, progress, ready: false };
  }
  return { stage: 1, progress, ready: false };
}

/** Harvests a ready crop plot, adding yields to inventory and resetting the soil. */
export function harvestPlot(
  farm: FarmSave,
  plotIndex: number,
  now: number,
  random: () => number = Math.random,
): { farm: FarmSave; crop: CropId; yieldCount: number } | null {
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return null;
  const plot = farm.plots[plotIndex];
  if (plot.crop === null) return null;

  const growth = plotGrowth(plot, now);
  if (!growth.ready) return null;

  const crop = plot.crop;
  const def = CROPS[crop];
  const yieldCount =
    def.yieldMin + Math.floor(random() * (def.yieldMax - def.yieldMin + 1));

  const nextPlots = farm.plots.map((p, i) =>
    i === plotIndex ? { crop: null, plantedAt: 0, wateredAt: null } : { ...p },
  );

  const nextGroceries = {
    ...farm.groceries,
    [crop]: (farm.groceries[crop] || 0) + yieldCount,
  };

  return {
    farm: { ...farm, plots: nextPlots, groceries: nextGroceries },
    crop,
    yieldCount,
  };
}

/** Sells harvested produce at the farm stand for coins. */
export function sellProduce(
  farm: FarmSave,
  crop: CropId,
  count: number,
): { farm: FarmSave; coinsEarned: number } | null {
  if (count <= 0) return null;
  const available = farm.groceries[crop] || 0;
  if (available < count) return null;

  const def = CROPS[crop];
  const coinsEarned = count * def.sellPrice;
  const nextGroceries = {
    ...farm.groceries,
    [crop]: available - count,
  };

  return {
    farm: { ...farm, groceries: nextGroceries },
    coinsEarned,
  };
}

/** Feed animals in their pasture pens. */
export function feedAnimal(
  farm: FarmSave,
  animalId: string,
  now: number,
): { farm: FarmSave; heart: boolean } {
  return {
    farm: {
      ...farm,
      animalsFedAt: { ...farm.animalsFedAt, [animalId]: now },
    },
    heart: true,
  };
}

/** Fast forwards all planted/watered plots by ms (useful in tests and debug). */
export function fastForwardFarm(farm: FarmSave, ms: number): FarmSave {
  const nextPlots = farm.plots.map((p) => ({
    ...p,
    plantedAt: p.plantedAt > 0 ? p.plantedAt - ms : 0,
    wateredAt: p.wateredAt !== null ? p.wateredAt - ms : null,
  }));
  return { ...farm, plots: nextPlots };
}

// ---------------------------------------------------------------------------
// Room layout for Sunny Acres Farm: bounds, walkable floor, blockers, and portals.
// ---------------------------------------------------------------------------

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export type Rect = { x0: number; z0: number; x1: number; z1: number };

export const BOUNDS = { x0: -24, x1: 24, z0: -20, z1: 20 } as const;
export const SPAWN: Vec2 = [0, 16.5];
export const EXIT: Vec2 = [0, 18.5];

/** City gate connecting from Suburbia's western sidewalk out to Sunny Acres Farm. */
export const FARM_GATE_DOOR = {
  position: [-445, -266] as const,
  landing: [-445, -262] as const,
};

/** Key building positions on the farm. */
export const BARN_POS: Vec2 = [-13, -8];
export const SILO_POS: Vec2 = [-19, -8];
export const STAND_POS: Vec2 = [10, 12];
export const TRACTOR_POS: Vec2 = [14, -8];
export const SCARECROW_POS: Vec2 = [0, -4];

/** Crop field: 6 plots in two rows of 3. */
export const PLOTS: readonly { id: number; position: Vec2 }[] = [
  { id: 0, position: [-4.5, -4] },
  { id: 1, position: [0, -4] },
  { id: 2, position: [4.5, -4] },
  { id: 3, position: [-4.5, 1] },
  { id: 4, position: [0, 1] },
  { id: 5, position: [4.5, 1] },
];

/** Animal pastures: north-east pasture for horses/cows, south-east for alpacas/donkeys. */
export const PASTURES: Record<"pastureNorth" | "pastureSouth", Rect> = {
  pastureNorth: { x0: 6, z0: -18, x1: 22, z1: -3 },
  pastureSouth: { x0: -22, z0: 5, x1: -8, z1: 17 },
};

/** The chickens' yard between the field and the farm stand: open ground, no fence. */
export const CHICKEN_YARD: Rect = { x0: -5, z0: 6, x1: 5, z1: 13 };

export type FarmAnimalKind =
  "cow" | "horse" | "alpaca" | "donkey" | "pig" | "sheep" | "chicken";

/** Every animal wandering its pen (WanderingCreature): kind, pen, meters per second, start angle, direction. */
export const FARM_ANIMALS: readonly {
  kind: FarmAnimalKind;
  pen: Rect;
  speed: number;
  phase: number;
  dir: 1 | -1;
}[] = [
  { kind: "cow", pen: PASTURES.pastureNorth, speed: 0.5, phase: 0, dir: 1 },
  {
    kind: "horse",
    pen: PASTURES.pastureNorth,
    speed: 0.8,
    phase: 3.14,
    dir: -1,
  },
  { kind: "pig", pen: PASTURES.pastureNorth, speed: 0.5, phase: 1.6, dir: 1 },
  { kind: "pig", pen: PASTURES.pastureNorth, speed: 0.45, phase: 4.8, dir: -1 },
  {
    kind: "alpaca",
    pen: PASTURES.pastureSouth,
    speed: 0.6,
    phase: 1.2,
    dir: 1,
  },
  {
    kind: "donkey",
    pen: PASTURES.pastureSouth,
    speed: 0.6,
    phase: 4.2,
    dir: -1,
  },
  { kind: "sheep", pen: PASTURES.pastureSouth, speed: 0.5, phase: 2.6, dir: 1 },
  {
    kind: "sheep",
    pen: PASTURES.pastureSouth,
    speed: 0.45,
    phase: 5.5,
    dir: -1,
  },
  { kind: "chicken", pen: CHICKEN_YARD, speed: 0.35, phase: 0, dir: 1 },
  { kind: "chicken", pen: CHICKEN_YARD, speed: 0.3, phase: 1.6, dir: -1 },
  { kind: "chicken", pen: CHICKEN_YARD, speed: 0.35, phase: 3.2, dir: 1 },
  { kind: "chicken", pen: CHICKEN_YARD, speed: 0.3, phase: 4.8, dir: -1 },
];

/** The kinds you can feed at the pasture, each once in the list. */
export const FARM_SPECIES: readonly FarmAnimalKind[] = [
  ...new Set(FARM_ANIMALS.map((a) => a.kind)),
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

/** Solid structures the player walks around (barn, pastures, farm stand). */
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // Barn
  box(-18, -14, -8, -2),
  // Silo
  box(-22, -11, -16, -5),
  // Pasture North fence
  box(
    PASTURES.pastureNorth.x0,
    PASTURES.pastureNorth.z0,
    PASTURES.pastureNorth.x1,
    PASTURES.pastureNorth.z1,
  ),
  // Pasture South fence
  box(
    PASTURES.pastureSouth.x0,
    PASTURES.pastureSouth.z0,
    PASTURES.pastureSouth.x1,
    PASTURES.pastureSouth.z1,
  ),
  // Farm stand
  box(8, 10, 13, 14),
];

/** Pasture fence panels (the Quaternius fence is 5.9 m long and 1.2 m tall; 0.7 brings it to a farm fence). */
export const PASTURE_FENCE_SPOTS = rectFenceSpots(
  Object.values(PASTURES),
  5.89,
  0.7,
  3.4,
);

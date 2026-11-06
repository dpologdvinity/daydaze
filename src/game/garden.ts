// Suburbia Community Garden: raised beds, seed planting, watering,
// wilting and recovery over real days, crop harvesting into grocery inventory,
// and neighbor gardener interactions.
import type { Vec2 } from "./walk.ts";

export type GardenCropId =
  | "tomato"
  | "strawberry"
  | "sunflower"
  | "pepper"
  | "herb";

export type GardenCropDef = {
  readonly id: GardenCropId;
  readonly name: string;
  readonly seedPrice: number;
  readonly coinsReward: number;
  readonly growthDurationMs: number;
  readonly yieldMin: number;
  readonly yieldMax: number;
};

/** All 5 community garden crops with pricing, growth timers and yields. */
export const GARDEN_CROPS: Record<GardenCropId, GardenCropDef> = {
  tomato: {
    id: "tomato",
    name: "Heirloom Tomato",
    seedPrice: 5,
    coinsReward: 12,
    growthDurationMs: 120_000,
    yieldMin: 2,
    yieldMax: 4,
  },
  strawberry: {
    id: "strawberry",
    name: "Sweet Strawberry",
    seedPrice: 6,
    coinsReward: 15,
    growthDurationMs: 90_000,
    yieldMin: 3,
    yieldMax: 5,
  },
  sunflower: {
    id: "sunflower",
    name: "Giant Sunflower",
    seedPrice: 8,
    coinsReward: 20,
    growthDurationMs: 150_000,
    yieldMin: 1,
    yieldMax: 3,
  },
  pepper: {
    id: "pepper",
    name: "Bell Pepper",
    seedPrice: 5,
    coinsReward: 14,
    growthDurationMs: 100_000,
    yieldMin: 2,
    yieldMax: 4,
  },
  herb: {
    id: "herb",
    name: "Sweet Basil & Herbs",
    seedPrice: 4,
    coinsReward: 10,
    growthDurationMs: 60_000,
    yieldMin: 3,
    yieldMax: 6,
  },
};

export const GARDEN_CROP_IDS = Object.keys(
  GARDEN_CROPS,
) as readonly GardenCropId[];

export function isGardenCropId(value: unknown): value is GardenCropId {
  return typeof value === "string" && Object.hasOwn(GARDEN_CROPS, value);
}

/** Soil remains moist and enables active crop growth for 12 hours after watering. */
export const SOIL_DRY_MS = 12 * 60 * 60 * 1000;

/** If left unwatered for 24 hours after soil dries out, the plant wilts. */
export const WILTING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type GardenPlotState = {
  claimed: boolean;
  crop: GardenCropId | null;
  plantedAt: number;
  wateredAt: number | null;
  growthMs: number;
};

export type GardenSave = {
  plots: GardenPlotState[];
  produce: Record<GardenCropId, number>;
};

export const GARDEN_PLOT_COUNT = 8;

/** Creates a fresh community garden state with 8 raised bed plots (plot 0 claimed). */
export function createDefaultGarden(): GardenSave {
  const plots: GardenPlotState[] = [];
  for (let i = 0; i < GARDEN_PLOT_COUNT; i++) {
    plots.push({
      claimed: i === 0,
      crop: null,
      plantedAt: 0,
      wateredAt: null,
      growthMs: 0,
    });
  }
  return {
    plots,
    produce: {
      tomato: 0,
      strawberry: 0,
      sunflower: 0,
      pepper: 0,
      herb: 0,
    },
  };
}

/** Extracts the own properties of an object cleanly. */
function fieldsOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

/** Validates and salvages garden state from localStorage or network JSON. */
export function cleanGarden(raw: unknown): GardenSave {
  const fallback = createDefaultGarden();
  if (typeof raw !== "object" || raw === null) return fallback;

  const data = fieldsOf(raw);
  const plots: GardenPlotState[] = [];
  const stored = data.plots;

  if (Array.isArray(stored)) {
    for (let i = 0; i < GARDEN_PLOT_COUNT; i++) {
      const p = fieldsOf(stored[i]);
      if (stored[i] && typeof stored[i] === "object") {
        const claimed = typeof p.claimed === "boolean" ? p.claimed : i === 0;
        const crop = isGardenCropId(p.crop) ? p.crop : null;
        const plantedAt =
          typeof p.plantedAt === "number" && p.plantedAt > 0 ? p.plantedAt : 0;
        const wateredAt =
          typeof p.wateredAt === "number" && p.wateredAt > 0
            ? p.wateredAt
            : null;
        const growthMs =
          typeof p.growthMs === "number" && p.growthMs > 0 ? p.growthMs : 0;
        plots.push({ claimed, crop, plantedAt, wateredAt, growthMs });
      } else {
        plots.push({
          claimed: i === 0,
          crop: null,
          plantedAt: 0,
          wateredAt: null,
          growthMs: 0,
        });
      }
    }
  } else {
    plots.push(...fallback.plots);
  }

  const produce: Record<GardenCropId, number> = {
    tomato: 0,
    strawberry: 0,
    sunflower: 0,
    pepper: 0,
    herb: 0,
  };
  const prod = fieldsOf(data.produce);
  for (const id of GARDEN_CROP_IDS) {
    const val = prod[id];
    if (typeof val === "number" && val > 0) {
      produce[id] = Math.floor(val);
    }
  }

  return { plots, produce };
}

/** Claims an unclaimed raised bed plot in the community garden. */
export function claimPlot(
  garden: GardenSave,
  plotIndex: number,
): GardenSave | null {
  if (plotIndex < 0 || plotIndex >= garden.plots.length) return null;
  const target = garden.plots[plotIndex];
  if (target.claimed) return null;

  const nextPlots = garden.plots.map((p, i) =>
    i === plotIndex ? { ...p, claimed: true } : { ...p },
  );
  return { ...garden, plots: nextPlots };
}

/** Plants a selected crop seed on a claimed, empty plot. */
export function plantSeed(
  garden: GardenSave,
  plotIndex: number,
  crop: GardenCropId,
  now: number,
): { garden: GardenSave; cost: number } | null {
  if (plotIndex < 0 || plotIndex >= garden.plots.length) return null;
  const plot = garden.plots[plotIndex];
  if (!plot.claimed || plot.crop !== null) return null;

  const def = GARDEN_CROPS[crop];
  if (!def) return null;

  const nextPlots = garden.plots.map((p, i) =>
    i === plotIndex
      ? {
          claimed: true,
          crop,
          plantedAt: now,
          wateredAt: null,
          growthMs: 0,
        }
      : { ...p },
  );

  return {
    garden: { ...garden, plots: nextPlots },
    cost: def.seedPrice,
  };
}

export type CropGrowth = {
  stage: 0 | 1 | 2 | 3 | 4;
  progress: number;
  ready: boolean;
  wilted: boolean;
  dry: boolean;
};

/**
 * Calculates current growth progress, stage, and wilting state:
 * - Stage 0: unwatered or empty soil
 * - Stage 1: sprout (0% - 25%)
 * - Stage 2: vegetative growth (25% - 60%)
 * - Stage 3: flowering / budding (60% - 99%)
 * - Stage 4: ripe & harvestable (100%+)
 * - Wilted: soil dried out and exceeded wilting threshold without water.
 */
export function plotGrowth(plot: GardenPlotState, now: number): CropGrowth {
  if (!plot.crop) {
    return { stage: 0, progress: 0, ready: false, wilted: false, dry: true };
  }

  const def = GARDEN_CROPS[plot.crop];
  let accrued = plot.growthMs;
  let isDry = true;
  let isWilted = false;

  if (plot.wateredAt === null) {
    // Never watered since planting
    const unwateredTime = Math.max(0, now - plot.plantedAt);
    isDry = true;
    isWilted = unwateredTime > WILTING_THRESHOLD_MS;
  } else {
    const elapsedSinceWater = Math.max(0, now - plot.wateredAt);
    if (elapsedSinceWater <= SOIL_DRY_MS) {
      // Soil is currently moist and actively growing
      accrued += elapsedSinceWater;
      isDry = false;
      isWilted = false;
    } else {
      // Soil has dried out
      accrued += SOIL_DRY_MS;
      isDry = true;
      const dryTime = elapsedSinceWater - SOIL_DRY_MS;
      isWilted = dryTime > WILTING_THRESHOLD_MS;
    }
  }

  const progress = Math.min(1, Math.max(0, accrued / def.growthDurationMs));
  if (progress >= 1) {
    return { stage: 4, progress: 1, ready: true, wilted: isWilted, dry: isDry };
  }
  if (progress >= 0.6) {
    return {
      stage: 3,
      progress,
      ready: false,
      wilted: isWilted,
      dry: isDry,
    };
  }
  if (progress >= 0.25) {
    return {
      stage: 2,
      progress,
      ready: false,
      wilted: isWilted,
      dry: isDry,
    };
  }
  if (accrued > 0) {
    return {
      stage: 1,
      progress,
      ready: false,
      wilted: isWilted,
      dry: isDry,
    };
  }
  return { stage: 0, progress: 0, ready: false, wilted: isWilted, dry: isDry };
}

/** Waters a plot, advancing accrued growth and recovering any wilted plant. */
export function waterPlot(
  garden: GardenSave,
  plotIndex: number,
  now: number,
): GardenSave | null {
  if (plotIndex < 0 || plotIndex >= garden.plots.length) return null;
  const plot = garden.plots[plotIndex];
  if (!plot.claimed || plot.crop === null) return null;

  // Calculate accumulated growth up to now before resetting watered timestamp
  let updatedGrowth = plot.growthMs;
  if (plot.wateredAt !== null) {
    const elapsed = Math.max(0, now - plot.wateredAt);
    updatedGrowth += Math.min(elapsed, SOIL_DRY_MS);
  }

  const def = GARDEN_CROPS[plot.crop];
  updatedGrowth = Math.min(updatedGrowth, def.growthDurationMs);

  const nextPlots = garden.plots.map((p, i) =>
    i === plotIndex
      ? {
          ...p,
          wateredAt: now,
          growthMs: updatedGrowth,
        }
      : { ...p },
  );

  return { ...garden, plots: nextPlots };
}

/** Harvests a ripe crop, adding produce to storage and rewarding coins. */
export function harvestPlot(
  garden: GardenSave,
  plotIndex: number,
  now: number,
  random: () => number = Math.random,
): {
  garden: GardenSave;
  crop: GardenCropId;
  yieldCount: number;
  coins: number;
} | null {
  if (plotIndex < 0 || plotIndex >= garden.plots.length) return null;
  const plot = garden.plots[plotIndex];
  if (!plot.claimed || plot.crop === null) return null;

  const growth = plotGrowth(plot, now);
  if (!growth.ready) return null;

  const crop = plot.crop;
  const def = GARDEN_CROPS[crop];
  const yieldCount =
    def.yieldMin + Math.floor(random() * (def.yieldMax - def.yieldMin + 1));

  const nextProduce: Record<GardenCropId, number> = {
    ...garden.produce,
    [crop]: (garden.produce[crop] || 0) + yieldCount,
  };

  const nextPlots = garden.plots.map((p, i) =>
    i === plotIndex
      ? {
          claimed: true,
          crop: null,
          plantedAt: 0,
          wateredAt: null,
          growthMs: 0,
        }
      : { ...p },
  );

  return {
    garden: {
      ...garden,
      plots: nextPlots,
      produce: nextProduce,
    },
    crop,
    yieldCount,
    coins: def.coinsReward,
  };
}

// -----------------------------------------------------------------------------
// Layout & Geometry Constants
// -----------------------------------------------------------------------------

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -18, x1: 18, z0: -15, z1: 15 } as const;
export const SPAWN: Vec2 = [0, 11];
export const EXIT: Vec2 = [0, 13.5];

/** Suburbia gate door connecting Maple Drive sidewalk into the Community Garden. */
export const GARDEN_GATE_DOOR = {
  position: [-315, -266] as const,
  landing: [-315, -262] as const,
};

export type RaisedBedDef = {
  readonly id: number;
  readonly position: Vec2;
  readonly size: Vec2;
};

/** 8 raised wooden garden beds laid out in two rows of four. */
export const RAISED_BEDS: readonly RaisedBedDef[] = [
  // North row (z = -3)
  { id: 0, position: [-10.5, -3], size: [3.2, 2.2] },
  { id: 1, position: [-3.5, -3], size: [3.2, 2.2] },
  { id: 2, position: [3.5, -3], size: [3.2, 2.2] },
  { id: 3, position: [10.5, -3], size: [3.2, 2.2] },
  // South row (z = 4)
  { id: 4, position: [-10.5, 4], size: [3.2, 2.2] },
  { id: 5, position: [-3.5, 4], size: [3.2, 2.2] },
  { id: 6, position: [3.5, 4], size: [3.2, 2.2] },
  { id: 7, position: [10.5, 4], size: [3.2, 2.2] },
];

/** Tool shed, compost bins, and water spigot positions. */
export const SHED_POS: Vec2 = [-12.5, -10.5];
export const COMPOST_POS: Vec2 = [11.5, -10.5];
export const WATER_POS: Vec2 = [0, -11];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // Tool shed footprint
  box(SHED_POS[0] - 2.5, SHED_POS[1] - 2.5, SHED_POS[0] + 2.5, SHED_POS[1] + 2.5),
  // Compost bays footprint
  box(
    COMPOST_POS[0] - 2.8,
    COMPOST_POS[1] - 2,
    COMPOST_POS[0] + 2.8,
    COMPOST_POS[1] + 2,
  ),
  // Water spigot basin
  box(WATER_POS[0] - 1, WATER_POS[1] - 1, WATER_POS[0] + 1, WATER_POS[1] + 1),
  // Raised bed boxes (player walks on paths around the beds)
  ...RAISED_BEDS.map((b) =>
    box(
      b.position[0] - b.size[0] / 2,
      b.position[1] - b.size[1] / 2,
      b.position[0] + b.size[0] / 2,
      b.position[1] + b.size[1] / 2,
    ),
  ),
];

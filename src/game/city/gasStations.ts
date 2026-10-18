// Gas stations: a forecourt off a cross street with a canopy over two pump
// islands and a mini-mart at the back. Cars run on gas: a full tank drives
// TANK_RANGE meters, and you fill up at a pump for coins. One layout, shared
// by the city's walk area (layout.ts), the car (drive.ts) and the renderer.
import type { Vec2 } from "../walk.ts";

/** Meters a full tank drives. */
export const TANK_RANGE = 3000;
/** Coins for a full tank from empty. */
export const FULL_TANK_COINS = 40;

export type GasStation = {
  id: string;
  name: string;
  /** The street-side edge of the lot runs along x = `street`; the lot opens
   * east (+1) or west (-1) of it. */
  street: number;
  side: 1 | -1;
  /** The lot's span along the street. */
  z0: number;
  z1: number;
  color: string;
};

/** Sidewalk, forecourt and mini-mart depths, meters from the curb. */
export const SIDEWALK = 4;
export const APRON = 12;
export const MART = 6;

export const GAS_STATIONS: readonly GasStation[] = [
  {
    id: "glow-gas",
    name: "GLOW GAS",
    street: -69,
    side: -1,
    z0: -128,
    z1: -102,
    color: "#ff4fb3",
  },
  {
    id: "night-owl-fuel",
    name: "NIGHT OWL FUEL",
    street: 69,
    side: 1,
    z0: 54,
    z1: 80,
    color: "#4fe3ff",
  },
  {
    id: "lucky-pump",
    name: "LUCKY PUMP",
    street: 325,
    side: 1,
    z0: -138,
    z1: -112,
    color: "#ffd84f",
  },
];

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
  return [
    [a, z0],
    [b, z0],
    [b, z1],
    [a, z1],
  ];
}

/** x this many meters out from the curb, on the station's side. */
export const outX = (s: GasStation, d: number) => s.street + s.side * d;

/** The drivable concrete: the driveway across the sidewalk and the forecourt. */
export function apronOf(s: GasStation): Vec2[] {
  return box(outX(s, 0), s.z0, outX(s, SIDEWALK + APRON), s.z1);
}

/** The mini-mart's footprint at the back of the lot. */
export function martOf(s: GasStation): Vec2[] {
  return box(
    outX(s, SIDEWALK + APRON),
    s.z0 + 2,
    outX(s, SIDEWALK + APRON + MART),
    s.z1 - 2,
  );
}

/** The two pump islands, each a curb 1 m wide and 5 m long, along the street. */
export function islandsOf(s: GasStation): Vec2[][] {
  const x = outX(s, SIDEWALK + APRON / 2);
  const mid = (s.z0 + s.z1) / 2;
  return [mid - 6, mid + 6].map((z) => box(x - 0.5, z - 2.5, x + 0.5, z + 2.5));
}

/** Where a car stops to fill up: either side of each island. */
export function pumpBays(s: GasStation): Vec2[] {
  const x = outX(s, SIDEWALK + APRON / 2);
  const mid = (s.z0 + s.z1) / 2;
  return [mid - 6, mid + 6].flatMap((z): Vec2[] => [
    [x - 2.2, z],
    [x + 2.2, z],
  ]);
}

/** The station a point is filling up at: within 3 m of a pump bay. */
export function stationAt(p: Vec2): GasStation | null {
  for (const s of GAS_STATIONS)
    for (const [x, z] of pumpBays(s))
      if (Math.hypot(p[0] - x, p[1] - z) <= 3) return s;
  return null;
}

/** Coins to fill a tank that's `fuel` (0..1) full, at least 1. */
export function fillCost(fuel: number): number {
  const f = Number.isFinite(fuel) ? Math.min(1, Math.max(0, fuel)) : 0;
  return Math.max(1, Math.ceil((1 - f) * FULL_TANK_COINS));
}

export const GAS_SURFACES: readonly Vec2[][] = GAS_STATIONS.map(apronOf);
export const GAS_BLOCKERS: readonly Vec2[][] = GAS_STATIONS.flatMap((s) => [
  martOf(s),
  ...islandsOf(s),
]);

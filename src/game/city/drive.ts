// Driving your own car on the city's streets. The car keeps to the asphalt:
// a step that would cross a curb slides along it, or stops. Traffic is solid:
// running into a car bounces you back. Pure and deterministic.
import {
  stepCar,
  type CarInput,
  type CarSpec,
  type CarState,
} from "../driving/car.ts";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { ROAD_EDGES, roadRect, rect } from "./layout.ts";
import { GAS_STATIONS, islandsOf, apronOf, SIDEWALK } from "./gasStations.ts";

/** The player's car waits here until it's first driven: the avenue's curb by
 * Downtown's square, nose east. */
export const HOME_PARKING: { at: Vec2; yaw: number } = {
  at: [14, 5.4],
  yaw: Math.PI / 2,
};

/** How near (meters) you must stand to get in. */
export const REACH = 4;

/** Each road's asphalt, kept a car's half width inside the curbs (but not
 * shortened at its ends, so junctions stay joined). */
function driveRects(halfWidth: number): Vec2[][] {
  const roads = ROAD_EDGES.map((edge) => {
    const r = roadRect(edge);
    const xs = r.map((p) => p[0]);
    const zs = r.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const z0 = Math.min(...zs);
    const z1 = Math.max(...zs);
    // a road runs along its longer side
    return x1 - x0 >= z1 - z0
      ? rect(x0, z0 + halfWidth, x1, z1 - halfWidth)
      : rect(x0 + halfWidth, z0, x1 - halfWidth, z1);
  });
  // a gas station's forecourt, from the curb in, a car's half width clear of
  // the mini-mart and the lot's ends
  const stations = GAS_STATIONS.map((s) => {
    const r = apronOf(s);
    const xs = r.map((p) => p[0]);
    const zs = r.map((p) => p[1]);
    const inner = s.side > 0 ? Math.max(...xs) : Math.min(...xs);
    // reaching back into the street, so the driveway joins the lane
    const street = s.street - s.side * SIDEWALK;
    return rect(
      Math.min(street, inner - s.side * halfWidth),
      Math.min(...zs) + halfWidth,
      Math.max(street, inner - s.side * halfWidth),
      Math.max(...zs) - halfWidth,
    );
  });
  return [...roads, ...stations];
}

/** The pump islands a car can't drive through. */
const ISLANDS: readonly Vec2[][] = GAS_STATIONS.flatMap(islandsOf);

const rectsFor = new Map<number, Vec2[][]>();

/** Whether a car `halfWidth` wide centered at `p` is on the road. */
export function onRoad(p: Vec2, halfWidth: number): boolean {
  let rects = rectsFor.get(halfWidth);
  if (!rects) {
    rects = driveRects(halfWidth);
    rectsFor.set(halfWidth, rects);
  }
  return rects.some((r) => pointInPolygon(r, p));
}

/** Traffic cars count as circles this wide (meters) around their centers. */
const TRAFFIC_RADIUS = 2.2;

/**
 * One fixed tick on the city streets. `traffic` is every other car's center.
 * Off the asphalt, the move slides along the curb or stops dead.
 */
export function stepCityCar(
  spec: CarSpec,
  state: CarState,
  input: CarInput,
  traffic: readonly Vec2[] = [],
): CarState {
  const half = spec.width / 2;
  const next = stepCar(spec, state, input, ISLANDS);
  let out: CarState;
  if (onRoad(next.position, half)) out = next;
  else {
    const [x0, z0] = state.position;
    const [x1, z1] = next.position;
    const alongX: Vec2 = [x1, z0];
    const alongZ: Vec2 = [x0, z1];
    if (x1 !== x0 && onRoad(alongX, half))
      out = { ...next, position: alongX, speed: next.speed * 0.7 };
    else if (z1 !== z0 && onRoad(alongZ, half))
      out = { ...next, position: alongZ, speed: next.speed * 0.7 };
    else out = { ...next, position: state.position, speed: 0 };
  }
  const reach = half + TRAFFIC_RADIUS;
  for (const [tx, tz] of traffic) {
    const dx = out.position[0] - tx;
    const dz = out.position[1] - tz;
    const d = Math.hypot(dx, dz);
    if (d >= reach || d < 1e-6) continue;
    // pushed back out to touching, and the hit soaks up most of the speed
    out = {
      ...out,
      position: [tx + (dx / d) * reach, tz + (dz / d) * reach],
      speed: -out.speed * 0.25,
    };
  }
  return out;
}

/** Where you step out: a couple of meters off the car's left side. */
export function exitPoint(state: CarState): Vec2 {
  const [x, z] = state.position;
  // left of heading (sin yaw, cos yaw) is (cos yaw, -sin yaw)
  return [x + Math.cos(state.yaw) * 2.2, z - Math.sin(state.yaw) * 2.2];
}

export type ParkedCar = {
  id: string;
  color: string;
  at: Vec2;
  yaw: number;
  /** The tank, 0 (empty) to 1 (full). */
  fuel: number;
};

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** A saved parked car, or null to park at home. Saves are untrusted. */
export function cleanParkedCar(
  value: unknown,
  known: (id: string) => boolean,
): ParkedCar | null {
  if (typeof value !== "object" || value === null) return null;
  const f = new Map<string, unknown>(Object.entries(value));
  const id = f.get("id");
  const color = f.get("color");
  const at = f.get("at");
  const yaw = f.get("yaw");
  const fuel = f.get("fuel");
  if (typeof id !== "string" || !known(id)) return null;
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  if (!Array.isArray(at) || at.length !== 2) return null;
  const [x, z] = at;
  if (!isNum(x) || !isNum(z) || !isNum(yaw)) return null;
  // a car saved off the asphalt (an old layout) goes back home
  if (!onRoad([x, z], 0.5)) return null;
  // saves from before gas stations have a full tank
  const tank = isNum(fuel) ? Math.min(1, Math.max(0, fuel)) : 1;
  return { id, color, at: [x, z], yaw, fuel: tank };
}

/** Your car as saved, or the starter sedan waiting at the home spot. */
export function parkedOrHome(car: ParkedCar | null): ParkedCar {
  return (
    car ?? {
      id: "quill-lite",
      color: "#ff4fb3",
      at: HOME_PARKING.at,
      yaw: HOME_PARKING.yaw,
      fuel: 1,
    }
  );
}

/** Paint colors on offer for your car. */
export const CAR_PAINTS: readonly { id: string; label: string }[] = [
  { id: "#ff4fb3", label: "Bubblegum pink" },
  { id: "#141018", label: "Midnight black" },
  { id: "#f4f4f8", label: "Pearl white" },
  { id: "#c8102e", label: "Candy red" },
  { id: "#3a6bff", label: "Electric blue" },
  { id: "#9b5cff", label: "Grape" },
  { id: "#3fe0d0", label: "Teal" },
  { id: "#ffd84f", label: "Sunshine yellow" },
  { id: "#c0c0c8", label: "Silver" },
  { id: "#ff8a3d", label: "Tangerine" },
];

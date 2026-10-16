import type { Vec2 } from "../walk.ts";
import { hash } from "./hash.ts";
import { ROAD_EDGES, ROAD_NODES, type RoadEdge } from "./layout.ts";

/**
 * City traffic: cars drive one lane each way on every road edge, keep right,
 * follow the car ahead, stop at red lights, yield to the player, and pick a
 * turn at every junction (a U-turn at the map edge). Pure and allocation-free
 * per step, so the client can run it at the fixed walking rate.
 */

// ------------------------------------------------------------------ signals

export type Signal = "green" | "yellow" | "red";

/** Seconds per phase: avenue green, avenue yellow, cross green, cross yellow. */
export const SIGNAL_PHASES = [14, 3, 10, 3] as const;
const CYCLE = SIGNAL_PHASES.reduce((a, b) => a + b, 0);

/** The light for the avenue (east-west) or the cross streets at time t. */
export function signalAt(t: number, axis: "ew" | "ns"): Signal {
  let p = ((t % CYCLE) + CYCLE) % CYCLE;
  const [ewGreen, ewYellow, nsGreen] = SIGNAL_PHASES;
  const phase =
    p < ewGreen
      ? 0
      : (p -= ewGreen) < ewYellow
        ? 1
        : (p -= ewYellow) < nsGreen
          ? 2
          : 3;
  if (axis === "ew")
    return phase === 0 ? "green" : phase === 1 ? "yellow" : "red";
  return phase === 2 ? "green" : phase === 3 ? "yellow" : "red";
}

// -------------------------------------------------------------------- roads

type Edge = {
  from: Vec2;
  to: Vec2;
  fromId: string;
  toId: string;
  length: number;
  dir: Vec2;
  /** Metres from the centre line to each lane's centre. */
  laneOffset: number;
  speedLimit: number;
  axis: "ew" | "ns";
  width: number;
};

/** The kerb strip on each side is for parked cars. */
const PARKING = 2.4;

const nodeAt = new Map(ROAD_NODES.map((n) => [n.id, n.position]));

function edgeOf(e: RoadEdge): Edge {
  const from = nodeAt.get(e.from) ?? [0, 0];
  const to = nodeAt.get(e.to) ?? [0, 0];
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  return {
    from,
    to,
    fromId: e.from,
    toId: e.to,
    length,
    dir: [dx / length, dz / length],
    laneOffset: (e.width / 2 - PARKING) / 2,
    speedLimit: e.speedLimit,
    axis: Math.abs(dx) > Math.abs(dz) ? "ew" : "ns",
    width: e.width,
  };
}

export const EDGES: readonly Edge[] = ROAD_EDGES.map(edgeOf);

/** Edges meeting at each node. */
const AT_NODE = new Map<string, number[]>();
EDGES.forEach((e, i) => {
  for (const id of [e.fromId, e.toId]) {
    const list = AT_NODE.get(id) ?? [];
    list.push(i);
    AT_NODE.set(id, list);
  }
});

/** Junctions with lights: where a cross street meets the avenue. */
const SIGNALLED = new Set(
  [...AT_NODE].filter(([, edges]) => edges.length >= 3).map(([id]) => id),
);

/** Where the signalled junctions are, for drawing their lights. */
export function signalledJunctions(): Vec2[] {
  return [...SIGNALLED].map((id) => nodeAt.get(id) ?? [0, 0]);
}

/** Widest road meeting a node other than `edge`, for the stop line. */
function crossingHalfWidth(node: string, edge: number): number {
  let w = 0;
  for (const i of AT_NODE.get(node) ?? [])
    if (i !== edge) w = Math.max(w, EDGES[i].width / 2);
  return w;
}

// --------------------------------------------------------------------- cars

/** Where a lane runs: an edge and which way along it (1 from -> to). */
type Lane = { edge: number; way: 1 | -1 };

export type TrafficCar = {
  lane: Lane;
  /** Metres travelled along the lane from its start node. */
  s: number;
  speed: number;
  colour: string;
  /** Picks the next turn; advances at every junction. */
  turns: number;
  id: number;
  /** Set while crossing a junction: the lane the car is turning into. */
  next: Lane | null;
};

export type Traffic = { cars: TrafficCar[]; time: number };

export const CAR_COLOURS = [
  "#ff2f9a",
  "#3fe0d0",
  "#ffb02e",
  "#9b5cff",
  "#e8e2ff",
  "#2a2440",
  "#ff6b3d",
  "#7dff6b",
] as const;

const CAR_LENGTH = 4.2;
const GAP = 2.5;
/** Junction radius: the curve between lanes starts this far from the node. */
const TURN = 6;
const ACCEL = 3;
const BRAKE = 7;

function laneLength(l: Lane) {
  return EDGES[l.edge].length;
}
function endNode(l: Lane) {
  const e = EDGES[l.edge];
  return l.way === 1 ? e.toId : e.fromId;
}

/** Cars spread over the lanes, none near a junction. */
export function createTraffic(count: number, seed = 1): Traffic {
  const cars: TrafficCar[] = [];
  const lanes: Lane[] = EDGES.flatMap((_, edge) => [
    { edge, way: 1 as const },
    { edge, way: -1 as const },
  ]);
  for (let i = 0; i < count; i++) {
    const lane = lanes[i % lanes.length];
    const round = Math.floor(i / lanes.length);
    const len = laneLength(lane);
    const s =
      TURN + 12 + ((round * 37 + hash(i, seed) * 20) % (len - 2 * TURN - 24));
    cars.push({
      lane: { ...lane },
      s,
      speed: 0,
      colour: CAR_COLOURS[Math.floor(hash(seed, i) * CAR_COLOURS.length)],
      turns: Math.floor(hash(i * 3, seed) * 1000),
      id: i,
      next: null,
    });
  }
  return { cars, time: 0 };
}

function chooseNext(car: TrafficCar): Lane {
  const node = endNode(car.lane);
  const options = (AT_NODE.get(node) ?? []).filter((i) => i !== car.lane.edge);
  // dead end: turn around into the other lane of the same edge
  if (!options.length)
    return { edge: car.lane.edge, way: car.lane.way === 1 ? -1 : 1 };
  const edge = options[car.turns % options.length];
  car.turns += 1;
  return { edge, way: EDGES[edge].fromId === node ? 1 : -1 };
}

/** Lane centre at distance s along a lane, written into out. */
function lanePoint(
  l: Lane,
  s: number,
  out: { x: number; z: number; yaw: number },
) {
  const e = EDGES[l.edge];
  const start = l.way === 1 ? e.from : e.to;
  const dx = e.dir[0] * l.way;
  const dz = e.dir[1] * l.way;
  // keep right: the right-hand normal of (dx, dz) with +z south is (-dz, dx)
  out.x = start[0] + dx * s - dz * e.laneOffset;
  out.z = start[1] + dz * s + dx * e.laneOffset;
  out.yaw = Math.atan2(-dz, dx);
}

const a = { x: 0, z: 0, yaw: 0 };
const b = { x: 0, z: 0, yaw: 0 };

/**
 * A car's position and heading: on its lane, or on the curve across a
 * junction from its lane's last TURN metres into the next lane's first.
 */
export function carPose(
  car: TrafficCar,
  out: { x: number; z: number; yaw: number },
) {
  const len = laneLength(car.lane);
  if (!car.next || car.s < len - TURN) {
    lanePoint(car.lane, Math.min(car.s, len), out);
    return;
  }
  // quadratic curve: end of this lane, the junction, start of the next
  const t = Math.min(1, (car.s - (len - TURN)) / (2 * TURN));
  lanePoint(car.lane, len - TURN, a);
  lanePoint(car.next, TURN, b);
  const node = nodeAt.get(endNode(car.lane)) ?? [0, 0];
  // control point: where the two lane lines would cross near the node
  const cx = (a.x + b.x) / 2 + (node[0] - (a.x + b.x) / 2) * 0.6;
  const cz = (a.z + b.z) / 2 + (node[1] - (a.z + b.z) / 2) * 0.6;
  const u = 1 - t;
  out.x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
  out.z = u * u * a.z + 2 * u * t * cz + t * t * b.z;
  const tx = 2 * u * (cx - a.x) + 2 * t * (b.x - cx);
  const tz = 2 * u * (cz - a.z) + 2 * t * (b.z - cz);
  out.yaw = Math.atan2(-tz, tx);
}

const pose = { x: 0, z: 0, yaw: 0 };

/** Free road ahead of a car, in metres, up to `look`. */
function headroom(t: Traffic, car: TrafficCar, look: number): number {
  let room = look;
  for (const other of t.cars) {
    if (other === car) continue;
    let ahead = Infinity;
    if (other.lane.edge === car.lane.edge && other.lane.way === car.lane.way)
      ahead = other.s - car.s;
    else if (
      car.next &&
      other.lane.edge === car.next.edge &&
      other.lane.way === car.next.way
    )
      ahead = laneLength(car.lane) - car.s + other.s;
    if (ahead > 0) room = Math.min(room, ahead - CAR_LENGTH - GAP);
  }
  return room;
}

/** Stopping distance to the red light ahead, or Infinity. */
function lightRoom(t: Traffic, car: TrafficCar): number {
  const node = endNode(car.lane);
  if (!SIGNALLED.has(node)) return Infinity;
  const e = EDGES[car.lane.edge];
  const light = signalAt(t.time, e.axis);
  const stopAt =
    laneLength(car.lane) - crossingHalfWidth(node, car.lane.edge) - 1.5;
  const room = stopAt - car.s;
  if (room < -0.5) return Infinity; // already over the line: clear the junction
  // yellow: stop only if there is room to stop comfortably
  if (light === "green") return Infinity;
  if (
    light === "yellow" &&
    car.speed * car.speed > 2 * BRAKE * 0.6 * Math.max(room, 0)
  )
    return Infinity;
  return room;
}

/** Room before the player, if they stand in the car's path. */
function playerRoom(car: TrafficCar, player: Vec2 | null): number {
  if (!player) return Infinity;
  carPose(car, pose);
  const fx = Math.cos(pose.yaw);
  const fz = -Math.sin(pose.yaw);
  const px = player[0] - pose.x;
  const pz = player[1] - pose.z;
  const along = px * fx + pz * fz;
  const across = Math.abs(-px * fz + pz * fx);
  if (along < 0 || along > 14 || across > 1.8) return Infinity;
  return along - CAR_LENGTH / 2 - 1.5;
}

/** Advances every car by dt seconds at simulation time t.time + dt. */
export function stepTraffic(t: Traffic, dt: number, player: Vec2 | null): void {
  t.time += dt;
  for (const car of t.cars) {
    const len = laneLength(car.lane);
    if (!car.next && car.s > len - TURN - 20) car.next = chooseNext(car);
    const limit = EDGES[car.lane.edge].speedLimit;
    const room = Math.min(
      headroom(t, car, 60),
      lightRoom(t, car),
      playerRoom(car, player),
    );
    // the speed from which the car can still stop within `room`
    const safe = room <= 0 ? 0 : Math.sqrt(2 * BRAKE * room * 0.8);
    const target = Math.min(limit, safe);
    car.speed =
      car.speed < target
        ? Math.min(target, car.speed + ACCEL * dt)
        : Math.max(target, car.speed - BRAKE * dt);
    car.s += car.speed * dt;
    // past the junction curve: now on the next lane
    if (car.next && car.s >= len + TURN) {
      car.s = car.s - len;
      car.lane = car.next;
      car.next = null;
    }
  }
}

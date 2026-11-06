// Uptown's dog park: a fenced yard east of the park's north-south path, with
// a gate on the path side, benches, a water bowl and three agility pieces (a
// tunnel, a ramp and a seesaw). Off-leash dogs live here: they trot to random
// spots, sniff the grass, chase each other, take a drink at the bowl, sit,
// and one of them fetches a tennis ball a bench-sitter throws. Pure and
// deterministic given the `roll` source; DogPark.tsx draws it, and your own
// pet runs on the same rules when you let it off the leash (stepDog).
import { turnToward } from "../creature.ts";
import type { LandKind } from "../creatures.ts";
import type { Vec2 } from "../walk.ts";
import { DOG_PARK, GROUND, type ParkBox } from "./park.ts";

/** The gap in the south fence, on the path side. */
export const GATE = { x: 265, width: 2.6 } as const;
/** Length (m) of the fence panel model (public/models/farm/fence.glb). */
export const FENCE_PANEL = 5.89;
/** The fence's half thickness for the walk (the model is 0.17 m thick). */
const FENCE_HALF = 0.12;

/** One fence panel to draw: its middle, yaw (0 runs along x) and length scale. */
export type FenceSpot = { x: number; z: number; yaw: number; scale: number };

/** The straight runs of fence (each is a line, axis aligned). */
export const FENCE_RUNS: readonly ParkBox[] = [
  { x0: DOG_PARK.x0, x1: DOG_PARK.x1, z0: DOG_PARK.z0, z1: DOG_PARK.z0 },
  { x0: DOG_PARK.x0, x1: DOG_PARK.x0, z0: DOG_PARK.z0, z1: DOG_PARK.z1 },
  { x0: DOG_PARK.x1, x1: DOG_PARK.x1, z0: DOG_PARK.z0, z1: DOG_PARK.z1 },
  {
    x0: DOG_PARK.x0,
    x1: GATE.x - GATE.width / 2,
    z0: DOG_PARK.z1,
    z1: DOG_PARK.z1,
  },
  {
    x0: GATE.x + GATE.width / 2,
    x1: DOG_PARK.x1,
    z0: DOG_PARK.z1,
    z1: DOG_PARK.z1,
  },
];

/** The fence panels along every run, stretched a little to meet the corners. */
export function fenceSpots(): FenceSpot[] {
  return FENCE_RUNS.flatMap((run) => {
    const alongX = run.x1 - run.x0 >= run.z1 - run.z0;
    const length = alongX ? run.x1 - run.x0 : run.z1 - run.z0;
    const n = Math.max(1, Math.round(length / FENCE_PANEL));
    const scale = length / n / FENCE_PANEL;
    return Array.from({ length: n }, (_, i): FenceSpot => {
      const t = ((i + 0.5) / n) * length;
      return alongX
        ? { x: run.x0 + t, z: run.z0, yaw: 0, scale }
        : { x: run.x0, z: run.z0 + t, yaw: Math.PI / 2, scale };
    });
  });
}

export type GearKind =
  "agility-tunnel" | "agility-ramp" | "agility-seesaw" | "dog-bowl";

/** Footprint (x by z, at yaw 0) of each piece, from its model. */
const GEAR_SIZE: Record<GearKind, readonly [number, number]> = {
  "agility-tunnel": [5, 1.4],
  "agility-ramp": [1.6, 2.6],
  "agility-seesaw": [0.8, 3],
  "dog-bowl": [0.7, 0.7],
};

export type Gear = {
  kind: GearKind;
  x: number;
  z: number;
  yaw: number;
  /** The world footprint. */
  box: ParkBox;
};

function gear(kind: GearKind, x: number, z: number, yaw = 0): Gear {
  const [w, d] = GEAR_SIZE[kind];
  const turned = Math.abs(Math.sin(yaw)) > 0.5;
  const hx = (turned ? d : w) / 2;
  const hz = (turned ? w : d) / 2;
  return {
    kind,
    x,
    z,
    yaw,
    box: { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz },
  };
}

/** The bowl, by the south-east corner, clear of the gate's lane. */
export const BOWL = gear("dog-bowl", 270.6, -296.4);
/** The agility pieces and the bowl. */
export const GEAR: readonly Gear[] = [
  gear("agility-tunnel", 265, -306.5),
  gear("agility-seesaw", 260.4, -302),
  gear("agility-ramp", 270, -309),
  BOWL,
];

/** Where the bench-sitter throws the ball from, and where it is brought back. */
export const THROW_FROM: Vec2 = [260.6, -297.4];

const rect = (b: ParkBox): Vec2[] => [
  [b.x0, b.z0],
  [b.x1, b.z0],
  [b.x1, b.z1],
  [b.x0, b.z1],
];

/** What the walk cannot cross: the fence and the agility pieces (not the bowl). */
export const DOG_PARK_BLOCKERS: readonly (readonly Vec2[])[] = [
  ...FENCE_RUNS.map((r) =>
    rect({
      x0: r.x0 - FENCE_HALF,
      x1: r.x1 + FENCE_HALF,
      z0: r.z0 - FENCE_HALF,
      z1: r.z1 + FENCE_HALF,
    }),
  ),
  ...GEAR.filter((g) => g !== BOWL).map((g) => rect(g.box)),
];

/** Whether (x, z) is inside the fence. */
export const inDogPark = (x: number, z: number, pad = 0): boolean =>
  x > DOG_PARK.x0 - pad &&
  x < DOG_PARK.x1 + pad &&
  z > DOG_PARK.z0 - pad &&
  z < DOG_PARK.z1 + pad;

// ---- the dogs --------------------------------------------------------------

export type DogMode =
  "roam" | "sniff" | "chase" | "drink" | "rest" | "fetch" | "return";
export type DogClip = "idle" | "walk" | "run" | "graze" | "sit";

export type Dog = {
  kind: LandKind;
  x: number;
  z: number;
  yaw: number;
  clip: DogClip;
  mode: DogMode;
  /** Seconds left in a timed mode. */
  timer: number;
  /** Where it is heading (roam, drink, return). */
  tx: number;
  tz: number;
  /** Plays fetch with the ball; the others do not. */
  fetcher: boolean;
  /** Whom it chases. */
  chasing: Dog | null;
  /** Seconds it has made almost no headway; at STUCK it picks something else. */
  stuck: number;
};

export type Ball = {
  x: number;
  y: number;
  z: number;
  state: "rest" | "air" | "carried";
  /** Seconds into a throw. */
  t: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
};

export type World = {
  dogs: Dog[];
  ball: Ball;
  /** Balls brought back so far. */
  fetches: number;
};

/** A 0..1 random source, like Math.random. */
export type Roll = () => number;

export const WALK = 1.3;
export const RUN = 4.2;
const TURN = 7;
const STUCK = 1.2;
const THROW_SECONDS = 1;
/** How far inside the fence (m) a dog stays, and how far from gear. */
const EDGE = 0.8;
const GEAR_PAD = 0.55;

export const newDog = (
  kind: LandKind,
  x: number,
  z: number,
  fetcher = false,
): Dog => ({
  kind,
  x,
  z,
  yaw: 0,
  clip: "idle",
  mode: "sniff",
  timer: 1,
  tx: x,
  tz: z,
  fetcher,
  chasing: null,
  stuck: 0,
});

/** The dogs that live in the yard: a fetching labrador and three friends. */
export const RESIDENTS: readonly {
  kind: LandKind;
  at: Vec2;
  fetcher: boolean;
}[] = [
  { kind: "labrador", at: [262, -298], fetcher: true },
  { kind: "husky", at: [268, -303], fetcher: false },
  { kind: "shibainu", at: [263, -309], fetcher: false },
  { kind: "labrador", at: [270, -300], fetcher: false },
];

export function newWorld(): World {
  const dogs = RESIDENTS.map((r, i) => {
    const d = newDog(r.kind, r.at[0], r.at[1], r.fetcher);
    d.timer = 0.5 + i * 0.7;
    return d;
  });
  return {
    dogs,
    ball: {
      x: THROW_FROM[0],
      y: 0.1,
      z: THROW_FROM[1],
      state: "rest",
      t: 0,
      fromX: 0,
      fromZ: 0,
      toX: 0,
      toZ: 0,
    },
    fetches: 0,
  };
}

const span = (lo: number, hi: number, r: number) => lo + (hi - lo) * r;

/** Whether (x, z) is inside a piece of gear, `pad` meters out. */
function inGear(x: number, z: number, pad: number): boolean {
  return GEAR.some(
    (g) =>
      x > g.box.x0 - pad &&
      x < g.box.x1 + pad &&
      z > g.box.z0 - pad &&
      z < g.box.z1 + pad,
  );
}

/** A spot in the yard clear of the gear, at least `far` from (ax, az). */
function freeSpot(roll: Roll, ax: number, az: number, far: number): Vec2 {
  let x = THROW_FROM[0];
  let z = THROW_FROM[1];
  for (let i = 0; i < 30; i++) {
    x = span(DOG_PARK.x0 + EDGE, DOG_PARK.x1 - EDGE, roll());
    z = span(DOG_PARK.z0 + EDGE, DOG_PARK.z1 - EDGE, roll());
    if (!inGear(x, z, GEAR_PAD + 0.2) && Math.hypot(x - ax, z - az) >= far)
      return [x, z];
  }
  return [x, z];
}

/** Keeps (x, z) inside the fence and out of the gear (slides along an edge). */
function keepIn(d: Dog): void {
  d.x = Math.min(DOG_PARK.x1 - EDGE, Math.max(DOG_PARK.x0 + EDGE, d.x));
  d.z = Math.min(DOG_PARK.z1 - EDGE, Math.max(DOG_PARK.z0 + EDGE, d.z));
  for (const g of GEAR) {
    const x0 = g.box.x0 - GEAR_PAD;
    const x1 = g.box.x1 + GEAR_PAD;
    const z0 = g.box.z0 - GEAR_PAD;
    const z1 = g.box.z1 + GEAR_PAD;
    if (d.x <= x0 || d.x >= x1 || d.z <= z0 || d.z >= z1) continue;
    // out through the nearest face
    const out = [d.x - x0, x1 - d.x, d.z - z0, z1 - d.z];
    const face = out.indexOf(Math.min(...out));
    if (face === 0) d.x = x0;
    else if (face === 1) d.x = x1;
    else if (face === 2) d.z = z0;
    else d.z = z1;
  }
}

/** Whether the segment (ax, az)-(bx, bz) passes through `box` (slab test). */
function crosses(
  box: ParkBox,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const slab = (a: number, b: number, lo: number, hi: number) => {
    const dv = b - a;
    if (Math.abs(dv) < 1e-9) return a > lo && a < hi;
    const u = (lo - a) / dv;
    const v = (hi - a) / dv;
    t0 = Math.max(t0, Math.min(u, v));
    t1 = Math.min(t1, Math.max(u, v));
    return t0 < t1;
  };
  return slab(ax, bx, box.x0, box.x1) && slab(az, bz, box.z0, box.z1);
}

/** Where to head for (tx, tz): the target, or the corner round gear in the way. */
function aim(d: Dog, tx: number, tz: number, out: [number, number]): void {
  out[0] = tx;
  out[1] = tz;
  for (const g of GEAR) {
    const b = g.box;
    // a hair inside the keep-out edge, so skirting it does not count
    if (
      !crosses(
        {
          x0: b.x0 - GEAR_PAD + 0.05,
          x1: b.x1 + GEAR_PAD - 0.05,
          z0: b.z0 - GEAR_PAD + 0.05,
          z1: b.z1 + GEAR_PAD - 0.05,
        },
        d.x,
        d.z,
        tx,
        tz,
      )
    )
      continue;
    const r = GEAR_PAD + 0.25;
    let best = Infinity;
    for (const cx of [b.x0 - r, b.x1 + r])
      for (const cz of [b.z0 - r, b.z1 + r]) {
        if (
          cx < DOG_PARK.x0 + EDGE ||
          cx > DOG_PARK.x1 - EDGE ||
          cz < DOG_PARK.z0 + EDGE ||
          cz > DOG_PARK.z1 - EDGE
        )
          continue;
        // the corner it already stands on is no way forward
        if (Math.hypot(cx - d.x, cz - d.z) < 0.4) continue;
        const len =
          Math.hypot(cx - d.x, cz - d.z) + Math.hypot(tx - cx, tz - cz);
        if (len < best) {
          best = len;
          out[0] = cx;
          out[1] = cz;
        }
      }
    return;
  }
}

const heading: [number, number] = [0, 0];

/** Turns toward (tx, tz) and walks at `speed`; true once it has arrived. */
function goTo(d: Dog, tx: number, tz: number, speed: number, dt: number) {
  if (Math.hypot(tx - d.x, tz - d.z) < 0.35) return true;
  aim(d, tx, tz, heading);
  const dx = heading[0] - d.x;
  const dz = heading[1] - d.z;
  const dist = Math.hypot(dx, dz);
  d.yaw = turnToward(d.yaw, Math.atan2(dx, dz), TURN * dt);
  const off = Math.abs(
    Math.atan2(
      Math.sin(Math.atan2(dx, dz) - d.yaw),
      Math.cos(Math.atan2(dx, dz) - d.yaw),
    ),
  );
  // turn on the spot first, then go
  const step = off > 0.9 ? 0 : Math.min(speed * dt, dist);
  const bx = d.x;
  const bz = d.z;
  d.x += Math.sin(d.yaw) * step;
  d.z += Math.cos(d.yaw) * step;
  keepIn(d);
  const moved = Math.hypot(d.x - bx, d.z - bz);
  d.stuck = moved < 0.25 * speed * dt && off <= 0.9 ? d.stuck + dt : 0;
  d.clip = speed > WALK ? "run" : "walk";
  return false;
}

function throwBall(world: World, roll: Roll): void {
  const b = world.ball;
  const [x, z] = freeSpot(roll, THROW_FROM[0], THROW_FROM[1], 6);
  b.state = "air";
  b.t = 0;
  b.fromX = b.x;
  b.fromZ = b.z;
  b.toX = x;
  b.toZ = z;
}

/** Chooses what `d` does next. */
function pickMode(d: Dog, world: World, roll: Roll): void {
  d.stuck = 0;
  d.chasing = null;
  const r = roll();
  if (d.fetcher && r > 0.12) {
    const b = world.ball;
    if (
      b.state === "rest" &&
      Math.hypot(b.x - THROW_FROM[0], b.z - THROW_FROM[1]) < 0.6
    )
      throwBall(world, roll);
    d.mode = "fetch";
    d.timer = 0;
    return;
  }
  if (r < 0.35) {
    d.mode = "roam";
    [d.tx, d.tz] = freeSpot(roll, d.x, d.z, 3);
  } else if (r < 0.55) {
    d.mode = "sniff";
    d.timer = span(2, 4, roll());
  } else if (r < 0.7 && world.dogs.some((o) => o !== d)) {
    const others = world.dogs.filter((o) => o !== d);
    d.mode = "chase";
    d.chasing =
      others[Math.min(others.length - 1, Math.floor(roll() * others.length))];
    d.timer = span(4, 7, roll());
  } else if (r < 0.84) {
    d.mode = "drink";
    d.tx = BOWL.x - 0.9;
    d.tz = BOWL.z + 0.2;
    d.timer = 0;
  } else {
    d.mode = "rest";
    d.timer = span(3, 6, roll());
  }
}

/**
 * Advances one dog by `dt` seconds. `world` holds the park's dogs and the
 * ball; your own pet steps with the same call (it is never the fetcher).
 * Allocation-free apart from the occasional chase pick.
 */
export function stepDog(d: Dog, dt: number, world: World, roll: Roll): void {
  switch (d.mode) {
    case "roam":
      if (goTo(d, d.tx, d.tz, WALK, dt) || d.stuck > STUCK)
        pickMode(d, world, roll);
      break;
    case "sniff":
    case "rest":
      d.clip = d.mode === "rest" ? "sit" : "graze";
      d.timer -= dt;
      if (d.timer <= 0) pickMode(d, world, roll);
      break;
    case "drink":
      if (d.timer > 0) {
        d.clip = "graze";
        d.timer -= dt;
        if (d.timer <= 0) pickMode(d, world, roll);
      } else if (goTo(d, d.tx, d.tz, WALK, dt)) {
        // face the bowl and lap
        d.yaw = turnToward(d.yaw, Math.PI / 2, 0.5);
        d.timer = span(2, 3.5, roll());
      } else if (d.stuck > STUCK) pickMode(d, world, roll);
      break;
    case "chase": {
      const t = d.chasing;
      d.timer -= dt;
      if (!t || d.timer <= 0) pickMode(d, world, roll);
      else if (Math.hypot(t.x - d.x, t.z - d.z) > 1.4)
        goTo(d, t.x, t.z, RUN, dt);
      else d.clip = "idle";
      break;
    }
    case "fetch": {
      const b = world.ball;
      if (b.state !== "rest") {
        // watch the throw
        d.clip = "idle";
        d.yaw = turnToward(d.yaw, Math.atan2(b.x - d.x, b.z - d.z), 4 * dt);
      } else if (goTo(d, b.x, b.z, RUN, dt)) {
        b.state = "carried";
        d.mode = "return";
        d.tx = THROW_FROM[0];
        d.tz = THROW_FROM[1];
      } else if (d.stuck > STUCK) pickMode(d, world, roll);
      break;
    }
    case "return":
      if (goTo(d, d.tx, d.tz, WALK * 2, dt)) {
        const b = world.ball;
        b.state = "rest";
        b.x = THROW_FROM[0] + 0.5;
        b.z = THROW_FROM[1];
        b.y = 0.1;
        world.fetches += 1;
        d.mode = "rest";
        d.timer = 1.5;
      } else if (d.stuck > STUCK) {
        // dropped it where it stands
        const b = world.ball;
        b.state = "rest";
        b.x = d.x;
        b.z = d.z;
        b.y = 0.1;
        pickMode(d, world, roll);
      }
      break;
  }
}

/** Advances the ball in flight, or in the fetcher's mouth. */
export function stepBall(world: World, dt: number): void {
  const b = world.ball;
  if (b.state === "air") {
    b.t += dt;
    const u = Math.min(1, b.t / THROW_SECONDS);
    b.x = b.fromX + (b.toX - b.fromX) * u;
    b.z = b.fromZ + (b.toZ - b.fromZ) * u;
    b.y = 0.1 + 4 * 2.2 * u * (1 - u);
    if (u >= 1) {
      b.state = "rest";
      b.y = 0.1;
    }
  } else if (b.state === "carried") {
    const d = world.dogs.find((o) => o.mode === "return");
    if (d) {
      b.x = d.x + Math.sin(d.yaw) * 0.4;
      b.z = d.z + Math.cos(d.yaw) * 0.4;
      b.y = 0.35;
    }
  }
}

/** Advances the whole yard. */
export function stepWorld(world: World, dt: number, roll: Roll): void {
  for (const d of world.dogs) stepDog(d, dt, world, roll);
  stepBall(world, dt);
}

/** Ground level for the dogs' feet. */
export const DOG_Y = GROUND;

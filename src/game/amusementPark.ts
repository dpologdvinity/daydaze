// Amusement Park: ride tuning, ride motion and state, string-light spacing.
// Pure math and data; the 3D scene samples these every frame.

import type { DialogueRole } from "./dialogue/types.ts";

export type Vec3 = readonly [x: number, y: number, z: number];

export const RIDE_IDS = [
  "ferris-wheel",
  "coaster",
  "starlight",
  "carousel",
  "teacups",
  "swings",
  "drop-tower",
  "pirate-ship",
  "log-flume",
] as const;
export type RideId = (typeof RIDE_IDS)[number];

// Where the turning rides stand on the fairground (x, z).
export const CAROUSEL_AT: readonly [number, number] = [-4.5, -20];
export const TEACUPS_AT: readonly [number, number] = [-11.5, -20];
export const SWING_AT: readonly [number, number] = [9, -30];
export const DROP_TOWER_AT: readonly [number, number] = [-11.5, -28];
/** The pirate ship's pivot (x, z); it swings along z. */
export const PIRATE_AT: readonly [number, number] = [14.5, -31];
export const PIRATE_PIVOT = 7;
export const PIRATE_ARM = 5.4;

// Ride tuning. Calm (reduced motion) rides take longer, so the same motion reads
// slower. `seated` rides sit the doll down (a horse, a cup, a chair, a
// coaster car); in the wheel's gondola she stands.
export const RIDES: Record<
  RideId,
  {
    label: string;
    spot: readonly [number, number];
    seconds: { normal: number; calm: number };
    seated: boolean;
  }
> = {
  "ferris-wheel": {
    label: "Ferris wheel",
    spot: [-6.5, -7],
    seconds: { normal: 24, calm: 40 },
    seated: false,
  },
  coaster: {
    label: "Comet coaster",
    spot: [6.5, -7],
    seconds: { normal: 22, calm: 36 },
    seated: true,
  },
  starlight: {
    label: "Starlight hyper coaster",
    spot: [-3, -34],
    seconds: { normal: 30, calm: 48 },
    seated: true,
  },
  carousel: {
    label: "Carousel",
    spot: [-4.5, -15.3],
    seconds: { normal: 20, calm: 30 },
    seated: true,
  },
  teacups: {
    label: "Teacups",
    spot: [-11.5, -16.3],
    seconds: { normal: 18, calm: 28 },
    seated: true,
  },
  swings: {
    label: "Swing ride",
    spot: [9, -25.6],
    seconds: { normal: 20, calm: 30 },
    seated: true,
  },
  "drop-tower": {
    label: "Drop tower",
    spot: [-11.5, -25.4],
    seconds: { normal: 16, calm: 27 },
    seated: true,
  },
  "log-flume": {
    label: "Log flume",
    spot: [-18.2, -12],
    seconds: { normal: 26, calm: 40 },
    seated: true,
  },
  "pirate-ship": {
    label: "Pirate ship",
    spot: [12, -26],
    seconds: { normal: 20, calm: 30 },
    seated: true,
  },
};

/** Seconds for the doll to step off a ride back onto its boarding spot. */
export const EXIT_SECONDS = 1.2;

export type FerrisWheel = { hub: Vec3; radius: number };

export const FERRIS: FerrisWheel = { hub: [-6.5, 7.6, -10], radius: 6 };

// Control points of the coaster loop; the station is the first point.
export const COASTER_CONTROLS: readonly Vec3[] = [
  [6.5, 1.4, -10.5],
  [11.5, 3.8, -12],
  [14.5, 9.5, -16.5],
  [12.5, 13.5, -21],
  [7, 10, -23.5],
  [2.5, 5, -20],
  [3.5, 1.4, -14],
];

export function rideSeconds(ride: RideId, calm: boolean): number {
  const seconds = RIDES[ride].seconds;
  return calm ? seconds.calm : seconds.normal;
}

/** The ride named by a `?ride=` value, or null. */
export function parseRide(value: string | null): RideId | null {
  return RIDE_IDS.find((id) => id === value) ?? null;
}

/** 0 at boarding, 1 at the end of the ride; bad input counts as 0. */
export function rideProgress(elapsed: number, seconds: number): number {
  if (!Number.isFinite(elapsed) || !(seconds > 0)) return 0;
  return Math.min(1, Math.max(0, elapsed / seconds));
}

/**
 * A position and facing. Motion functions write into a Pose the caller owns,
 * so a frame loop can reuse one scratch object and allocate nothing.
 */
export type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Nose up (+) or down along a track, radians; 0 off a track. */
  pitch: number;
};

export function newPose(): Pose {
  return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
}

/** A gondola on the rim after `progress` of one full turn, starting at the bottom. */
export function ferrisPose(
  wheel: FerrisWheel,
  progress: number,
  out: Pose = newPose(),
): Pose {
  const angle = progress * Math.PI * 2;
  const [hx, hy, hz] = wheel.hub;
  out.x = hx + wheel.radius * Math.sin(angle);
  out.y = hy - wheel.radius * Math.cos(angle);
  out.z = hz;
  // gondolas stay upright and the rider faces the camera side
  out.yaw = 0;
  out.pitch = 0;
  return out;
}

export type Track = {
  samples: readonly Vec3[];
  /** Distance along the track to the start of each sample. */
  distances: readonly number[];
  length: number;
};

// Uniform Catmull-Rom (tension 0.5) on a closed loop of control points.
function hermite(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const m1 = (p2[k] - p0[k]) / 2;
    const m2 = (p3[k] - p1[k]) / 2;
    out[k] = h00 * p1[k] + h10 * m1 + h01 * p2[k] + h11 * m2;
  }
  return out;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Samples a closed spline through `controls` and measures its length. */
export function buildTrack(controls: readonly Vec3[], steps = 16): Track {
  const n = controls.length;
  const samples: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = controls[(i + n - 1) % n];
    const p1 = controls[i];
    const p2 = controls[(i + 1) % n];
    const p3 = controls[(i + 2) % n];
    for (let k = 0; k < steps; k++) {
      samples.push(hermite(p0, p1, p2, p3, k / steps));
    }
  }
  const distances: number[] = [];
  let length = 0;
  samples.forEach((p, i) => {
    distances.push(length);
    length += distance(p, samples[(i + 1) % samples.length]);
  });
  return { samples, distances, length };
}

export const COASTER_TRACK = buildTrack(COASTER_CONTROLS);

// The Starlight: a hyper coaster in the back lot, through the carnival arch.
// Out of the station along +x, up a 20 m lift, a steep first drop, a camelback
// and a turning valley home. It never inverts: the rider's seat only turns.
export const STARLIGHT_CONTROLS: readonly Vec3[] = [
  [-3, 1.4, -37],
  [3, 2.6, -37],
  [11, 20, -37.6],
  [15, 21, -41],
  [14, 3.2, -46.5],
  [6, 2, -50],
  [-2, 11, -50.5],
  [-9, 2.6, -49.5],
  [-14.5, 6, -45.5],
  [-13, 4, -40.5],
  [-8, 1.6, -37.4],
];
export const STARLIGHT_TRACK = buildTrack(STARLIGHT_CONTROLS, 24);

// The log flume, in the water-ride lot left of the fairground: out of the
// station along -z, up a 9 m lift, round the top, a steep chute into the
// splash pool and a lazy float home. The trough's water follows this line.
export const FLUME_CONTROLS: readonly Vec3[] = [
  [-20, 0.6, -12],
  [-20, 0.6, -19],
  [-21, 4.5, -27],
  [-22.5, 9, -33.5],
  [-25.5, 9.2, -38],
  [-28.5, 9, -34],
  [-28.5, 7.8, -30.5],
  [-28.5, 3, -26],
  [-28.4, 0.8, -21.5],
  [-28, 0.7, -15],
  [-24.5, 0.6, -10.5],
];
export const FLUME_TRACK = buildTrack(FLUME_CONTROLS, 20);
/** The splash pool at the foot of the chute (x, z) and its radius. */
export const SPLASH_POOL = { at: [-28.5, -20] as const, radius: 2.6 };

// How the turning rides turn, by scene time in seconds. The scenery and the
// rider's seat both read these, so she stays on her horse, cup or chair.
export function carouselTurn(t: number, calm: boolean): number {
  return t * (calm ? 0.2 : 0.55);
}
export function swingTurn(t: number, calm: boolean): number {
  return t * (calm ? 0.25 : 0.9);
}
/** The teacup plate's turn and each cup's own spin on it. */
export function teacupTurns(t: number, calm: boolean) {
  const s = t * (calm ? 0.5 : 1);
  return { plate: s * 0.35, cup: -s * 0.9 };
}
export function dropClock(t: number, calm: boolean): number {
  return t * (calm ? 0.6 : 1);
}
/** The pirate ship's swing about its pivot, radians (a 6 s pendulum). */
export function shipSwing(t: number, calm: boolean): number {
  return (calm ? 0.3 : 0.95) * Math.sin((t * Math.PI * 2) / 6);
}

export const CAROUSEL_RADIUS = 2.6;
export const SWING_RADIUS = 2.8;
export const SWING_TOP = 6.4;
export const CUP_RADIUS = 1.7;
export const TOWER_TOP = 17;
export const TOWER_BASE = 1.4;

// Hips above the doll's feet when she sits (src/client/avatar/pose.ts).
const SIT_HIPS = 0.59;
/** A coaster car's seat above the track line. */
export const CAR_SEAT = 0.42;
/** A flume log's seat above the water line. */
export const LOG_SEAT = 0.3;

/** A point on a turning ride: `radius` out at angle 0 once the ride has
 * turned `turn` (three.js y rotation), about `at`. */
function onTurn(
  at: readonly [number, number],
  radius: number,
  turn: number,
  out: Pose,
) {
  out.x = at[0] + radius * Math.cos(-turn);
  out.z = at[1] + radius * Math.sin(-turn);
}

/** The seat on a turning ride at scene time `now`. */
function turningPose(
  ride: "carousel" | "teacups" | "swings" | "drop-tower" | "pirate-ship",
  now: number,
  calm: boolean,
  out: Pose,
): Pose {
  out.pitch = 0;
  switch (ride) {
    case "carousel": {
      const turn = carouselTurn(now, calm);
      onTurn(CAROUSEL_AT, CAROUSEL_RADIUS, turn, out);
      // astride the first horse's saddle
      out.y = 1.25 - SIT_HIPS;
      out.yaw = turn;
      return out;
    }
    case "swings": {
      const turn = swingTurn(now, calm);
      onTurn(SWING_AT, SWING_RADIUS, turn, out);
      out.y = SWING_TOP - 1.94 - SIT_HIPS;
      out.yaw = turn;
      return out;
    }
    case "teacups": {
      const { plate, cup } = teacupTurns(now, calm);
      onTurn(TEACUPS_AT, CUP_RADIUS, plate, out);
      out.y = 0.42 - SIT_HIPS;
      out.yaw = plate + cup;
      return out;
    }
    case "pirate-ship": {
      // on the middle bench, facing across the boat towards the midway side
      const a = shipSwing(now, calm);
      const r = PIRATE_ARM - 0.46;
      out.x = PIRATE_AT[0] + 0.4;
      out.y = PIRATE_PIVOT - r * Math.cos(a) - SIT_HIPS;
      out.z = PIRATE_AT[1] + r * Math.sin(a);
      out.yaw = -Math.PI / 2;
      return out;
    }
    case "drop-tower": {
      // on the car's front edge, legs over the side, facing the midway
      const car = dropTowerHeight(dropClock(now, calm), TOWER_BASE, TOWER_TOP);
      out.x = DROP_TOWER_AT[0];
      out.z = DROP_TOWER_AT[1] + 0.95;
      out.y = car + 0.25 - SIT_HIPS;
      out.yaw = 0;
      return out;
    }
  }
}

/** The point and facing `at` meters along the track, wrapping around the loop. */
export function trackPose(
  track: Track,
  at: number,
  out: Pose = newPose(),
): Pose {
  const { samples, distances, length } = track;
  const d = ((at % length) + length) % length;
  let i = 0;
  while (i + 1 < distances.length && distances[i + 1] <= d) i++;
  const next = (i + 1) % samples.length;
  const span = (distances[next] || length) - distances[i];
  const f = span > 0 ? (d - distances[i]) / span : 0;
  const a = samples[i];
  const b = samples[next];
  out.x = a[0] + (b[0] - a[0]) * f;
  out.y = a[1] + (b[1] - a[1]) * f;
  out.z = a[2] + (b[2] - a[2]) * f;
  out.yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  out.pitch = Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2]));
  return out;
}

export type TrackRide = "coaster" | "starlight" | "log-flume";

export function isTrackRide(ride: RideId): ride is TrackRide {
  return ride === "coaster" || ride === "starlight" || ride === "log-flume";
}

/** The track a coaster or the flume runs on. */
export function trackOf(ride: TrackRide): Track {
  return ride === "coaster"
    ? COASTER_TRACK
    : ride === "starlight"
      ? STARLIGHT_TRACK
      : FLUME_TRACK;
}

/**
 * The seat on a ride `elapsed` seconds after boarding. Pure function of time:
 * the wheel and coasters run from boarding, the turning rides by scene time
 * `now` (they never stop for a rider).
 */
export function ridePose(
  ride: RideId,
  elapsed: number,
  calm: boolean,
  out: Pose = newPose(),
  now = elapsed,
): Pose {
  const progress = rideProgress(elapsed, rideSeconds(ride, calm));
  switch (ride) {
    case "ferris-wheel":
      return ferrisPose(FERRIS, progress, out);
    case "coaster":
    case "starlight":
    case "log-flume": {
      // seated in the lead car or log (the scene puts it there too)
      const track = trackOf(ride);
      trackPose(track, progress * track.length, out);
      out.y += (ride === "log-flume" ? LOG_SEAT : CAR_SEAT) - SIT_HIPS;
      return out;
    }
    default:
      return turningPose(ride, now, calm, out);
  }
}

export type RideState =
  | { phase: "idle" }
  | { phase: "boarding"; ride: RideId }
  | { phase: "riding"; ride: RideId; start: number; seconds: number }
  | { phase: "exiting"; ride: RideId; start: number };

export type RideEvent =
  | { type: "board"; ride: RideId }
  /** The doll reached the boarding spot. */
  | { type: "arrive"; now: number; calm: boolean }
  /** The doll walked away before reaching the spot. */
  | { type: "cancel" }
  | { type: "tick"; now: number };

/**
 * idle -> boarding -> riding -> exiting -> idle. Events that do not apply to the
 * current phase are ignored, so a stray click mid-ride changes nothing.
 */
export function rideStep(state: RideState, event: RideEvent): RideState {
  switch (state.phase) {
    case "idle":
      return event.type === "board"
        ? { phase: "boarding", ride: event.ride }
        : state;
    case "boarding":
      if (event.type === "arrive") {
        return {
          phase: "riding",
          ride: state.ride,
          start: event.now,
          seconds: rideSeconds(state.ride, event.calm),
        };
      }
      return event.type === "cancel" ? { phase: "idle" } : state;
    case "riding":
      if (event.type === "tick" && event.now - state.start >= state.seconds) {
        // the step-off starts when the ride really ended, not when we noticed
        return {
          phase: "exiting",
          ride: state.ride,
          start: state.start + state.seconds,
        };
      }
      return state;
    case "exiting":
      if (event.type === "tick" && event.now - state.start >= EXIT_SECONDS) {
        return { phase: "idle" };
      }
      return state;
  }
}

const RIDE_END = newPose();

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Where the doll is while seated: on the ride, stepping off, or null when it
 * walks freely. The step-off eases from the last seat to the boarding spot.
 */
export function seatPose(
  state: RideState,
  now: number,
  calm: boolean,
  out: Pose = newPose(),
): Pose | null {
  switch (state.phase) {
    case "idle":
    case "boarding":
      return null;
    case "riding":
      return ridePose(state.ride, now - state.start, calm, out, now);
    case "exiting": {
      const end = ridePose(
        state.ride,
        rideSeconds(state.ride, calm),
        calm,
        RIDE_END,
        state.start,
      );
      const t = smoothstep(rideProgress(now - state.start, EXIT_SECONDS));
      const [sx, sz] = RIDES[state.ride].spot;
      out.x = end.x + (sx - end.x) * t;
      out.y = end.y * (1 - t);
      out.z = end.z + (sz - end.z) * t;
      out.yaw = end.yaw;
      out.pitch = 0;
      return out;
    }
  }
}

// Drop tower cycle: lift, hold at the top, fall, rest on the ground.
const DROP = { rise: 4, hold: 1.5, fall: 1.1, rest: 1.4 };
const DROP_CYCLE = DROP.rise + DROP.hold + DROP.fall + DROP.rest;

/** Height of the drop car at `time` seconds into its repeating cycle. */
export function dropTowerHeight(time: number, bottom: number, top: number) {
  const t = ((time % DROP_CYCLE) + DROP_CYCLE) % DROP_CYCLE;
  if (t < DROP.rise) {
    const e = t / DROP.rise;
    const eased = e * e * (3 - 2 * e);
    return bottom + (top - bottom) * eased;
  }
  if (t < DROP.rise + DROP.hold) return top;
  const fall = t - DROP.rise - DROP.hold;
  if (fall < DROP.fall) return top - (top - bottom) * (fall / DROP.fall) ** 2;
  return bottom;
}

/** Evenly spaced bulbs along a string that sags between two anchors. */
export function stringPoints(
  a: Vec3,
  b: Vec3,
  gap: number,
  sag: number,
): Vec3[] {
  const mid: Vec3 = [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2 - sag,
    (a[2] + b[2]) / 2,
  ];
  const length = distance(a, mid) + distance(mid, b);
  const count = Math.max(1, Math.floor(length / gap));
  const out: Vec3[] = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * mid[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * mid[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * mid[2] + t * t * b[2],
    ]);
  }
  return out;
}

export type ParkNpcId =
  "tamsin" | "gus" | "mabel" | "dex" | "sunny" | "rafe" | "ayo";

/** Which dialogue role speaks for each park NPC. Lines live in src/game/dialogue/. */
export const PARK_NPC_ROLES = {
  tamsin: "ticket-cashier",
  gus: "ride-operator",
  mabel: "cotton-candy-vendor",
  dex: "carnival-barker",
  sunny: "regular",
  rafe: "regular",
  ayo: "regular",
} as const satisfies Record<ParkNpcId, DialogueRole>;

/** The neighborhood context that unlocks the park's own tapped lines. */
export const PARK_CONTEXT = { neighborhood: "fairground" } as const;

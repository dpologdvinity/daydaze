// Amusement Park: ride tuning, ride motion and state, string-light spacing.
// Pure math and data; the 3D scene samples these every frame.

import type { DialogueRole } from "./dialogue/types.ts";

export type Vec3 = readonly [x: number, y: number, z: number];

export const RIDE_IDS = ["ferris-wheel", "coaster"] as const;
export type RideId = (typeof RIDE_IDS)[number];

// Ride tuning. Calm (reduced motion) rides take longer, so the same motion reads slower.
export const RIDES: Record<
  RideId,
  { spot: readonly [number, number]; seconds: { normal: number; calm: number } }
> = {
  "ferris-wheel": { spot: [-6.5, -7], seconds: { normal: 24, calm: 40 } },
  coaster: { spot: [6.5, -7], seconds: { normal: 22, calm: 36 } },
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
export type Pose = { x: number; y: number; z: number; yaw: number };

export function newPose(): Pose {
  return { x: 0, y: 0, z: 0, yaw: 0 };
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

/** The point and facing `at` metres along the track, wrapping around the loop. */
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
  return out;
}

/** The seat on a ride `elapsed` seconds after boarding. Pure function of time. */
export function ridePose(
  ride: RideId,
  elapsed: number,
  calm: boolean,
  out: Pose = newPose(),
): Pose {
  const progress = rideProgress(elapsed, rideSeconds(ride, calm));
  if (ride === "ferris-wheel") return ferrisPose(FERRIS, progress, out);
  return trackPose(COASTER_TRACK, progress * COASTER_TRACK.length, out);
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
      return ridePose(state.ride, now - state.start, calm, out);
    case "exiting": {
      const end = ridePose(
        state.ride,
        rideSeconds(state.ride, calm),
        calm,
        RIDE_END,
      );
      const t = smoothstep(rideProgress(now - state.start, EXIT_SECONDS));
      const [sx, sz] = RIDES[state.ride].spot;
      out.x = end.x + (sx - end.x) * t;
      out.y = end.y * (1 - t);
      out.z = end.z + (sz - end.z) * t;
      out.yaw = end.yaw;
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

/** The neighbourhood context that unlocks the park's own tapped lines. */
export const PARK_CONTEXT = { neighborhood: "fairground" } as const;

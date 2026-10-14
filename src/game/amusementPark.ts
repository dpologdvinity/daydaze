// Amusement Park: ride paths, string-light spacing and the NPC line banks.
// Pure math and data; the 3D scene reads these and draws them.

export type Vec3 = readonly [x: number, y: number, z: number];

export const RIDE_IDS = ["ferris-wheel", "coaster"] as const;
export type RideId = (typeof RIDE_IDS)[number];

// Calm rides take longer, so the same motion reads slower.
const RIDE_SECONDS: Record<RideId, { normal: number; calm: number }> = {
  "ferris-wheel": { normal: 24, calm: 40 },
  coaster: { normal: 22, calm: 36 },
};

/** The ride named by a `?ride=` value, or null. */
export function parseRide(value: string | null): RideId | null {
  return RIDE_IDS.find((id) => id === value) ?? null;
}

export function rideSeconds(ride: RideId, calm: boolean): number {
  const seconds = RIDE_SECONDS[ride];
  return calm ? seconds.calm : seconds.normal;
}

/** 0 at boarding, 1 at the end of the ride; bad input counts as 0. */
export function rideProgress(elapsed: number, seconds: number): number {
  if (!Number.isFinite(elapsed) || !(seconds > 0)) return 0;
  return Math.min(1, Math.max(0, elapsed / seconds));
}

export type Seat = { position: Vec3; yaw: number };

export type FerrisWheel = { hub: Vec3; radius: number };

/** A gondola on the rim after `progress` of one full turn, starting at the bottom. */
export function ferrisSeat(wheel: FerrisWheel, progress: number): Seat {
  const angle = progress * Math.PI * 2;
  const [x, y, z] = wheel.hub;
  return {
    position: [
      x + wheel.radius * Math.sin(angle),
      y - wheel.radius * Math.cos(angle),
      z,
    ],
    // gondolas stay upright and the rider faces the camera side
    yaw: 0,
  };
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

/** The point and facing direction `distance` metres along the track, wrapping. */
export function trackPose(
  track: Track,
  at: number,
): { position: Vec3; yaw: number } {
  const { samples, distances, length } = track;
  const d = ((at % length) + length) % length;
  let i = 0;
  while (i + 1 < distances.length && distances[i + 1] <= d) i++;
  const next = (i + 1) % samples.length;
  const span = (distances[next] || length) - distances[i];
  const f = span > 0 ? (d - distances[i]) / span : 0;
  const a = samples[i];
  const b = samples[next];
  const position: Vec3 = [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
  return { position, yaw: Math.atan2(b[0] - a[0], b[2] - a[2]) };
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

/** Handwritten tap lines. Each NPC cycles through their own bank in order. */
export const PARK_LINES: Record<ParkNpcId, readonly string[]> = {
  tamsin: [
    "Passes are on the counter. The wristband is sticky on purpose, that's the glitter.",
    "Wristband first, then the wheel. Don't lean on the gate, it's older than both of us.",
    "You look like a coaster person. Don't argue, I've sold tickets here for nine summers.",
    "Keep the sticker. It makes the operators nicer to you, I've tested it.",
    "We close at eleven. The last lap is the best one, everybody goes quiet.",
    "The swing ride's shut since the storm. Ask Gus, he's the one who fixes things.",
    "Hello, come in out of the dark. I take coins and compliments at this booth.",
  ],
  gus: [
    "Hold the rail and keep your hands inside the car. I say that to everyone, me included.",
    "The brake is a lever, not a dare. Leave it alone while we're moving.",
    "Every car gets checked before the lap. Yours passed. I looked twice.",
    "The wheel turns slow on purpose. The view has to earn its height.",
    "Waving at the top works. Your friends on the midway will see it from the ground.",
    "The coaster hill is nine metres. It feels like twice that, I promise.",
    "If the lights stutter, that's the generator sulking, not the ride. Stay seated.",
  ],
  mabel: [
    "Hold the cone by the stick and keep it out of your hair. Trust me on that one.",
    "Pink or blue? Pink if you're thinking about someone, blue if you're thinking about nothing.",
    "That's my own recipe. Don't ask for the sugar ratio, I'd only lie.",
    "Tell me a secret and the second cone's on me. Keep it small, I'm working.",
    "Fluff goes everywhere on windy nights. Look, I've got sugar in my eyebrows.",
    "I've been spinning since opening and my arm has opinions. Tip the jar, it's appreciated.",
    "Come back after midnight. The sugar's crisper and I'm in a better mood.",
  ],
  dex: [
    "Step right up! Nobody leaves this midway with a dry pocket and a dull heart!",
    "Ring toss! Three rings, one prize, and a seventy percent chance I'm telling the truth!",
    "You! Yes, you with the look! The shooting gallery has been asking for you all night!",
    "Winners take the big plush. Everybody else takes a small plush and a good story.",
    "The whack-a-mole has been waiting all night for someone with your reflexes.",
    "Don't pretend you're just looking. Everybody who walks past this stand is a player.",
    "Hold on, my voice needs a sip. Then step right up, friend, step right up!",
  ],
  sunny: [
    "I came for the coaster and stayed for the lights. The lights were the plan.",
    "My feet hurt and I won't go home until I've eaten something fried.",
    "Did you see the wheel go past the moon? I'm waiting for it to come back round.",
    "First night here? You've got the face of someone about to scream on purpose.",
    "I'm saving my last ride for the end of the night. It's a tradition I just made up.",
    "Lost my friend by the teacups. She's fine. She's probably ahead, doing something brave.",
    "If you see a pink tote bag near the gallery, that's me. Come say hello.",
  ],
  rafe: [
    "Ten minutes in line and I'd queue again. The line is half the fun with good company.",
    "My dad taught me the ring toss. He cheated. I forgive him, mostly.",
    "You're standing on my chalk square. It's for hopscotch. It's a long story.",
    "The carousel music gets in your head and stays there for a week. Worth it.",
    "I've ridden every ride twice and I'm still scared of the drop tower. Respect it.",
    "Give me a second, I'm deciding between the fried dough and the other fried dough.",
    "Nice night for it. Everybody here looks like they've got a plan and no regrets.",
  ],
  ayo: [
    "The carousel horses have names on their saddles. I've decided mine is Gerald.",
    "Nice shoes for a midway. Mine hurt already, but it's the good kind of hurting.",
    "I'm not scared of the coaster. I'm scared of the gap between the cars.",
    "Lights on the wheel look like a slow fireworks show. Nobody told me it'd be this pretty.",
    "Keep your change. I'm saving it for the teacups, they spin the coins right out of you.",
    "Everyone says it's only a little bit of a drop. It's a lot of a drop. Enjoy it.",
    "I came alone and I'm leaving with a plush shark. The night is going well.",
  ],
};

/** The line at position `n` in a bank, wrapping, so tapped lines come in order. */
export function lineAt(lines: readonly string[], n: number): string {
  if (lines.length === 0) return "";
  const i = ((n % lines.length) + lines.length) % lines.length;
  return lines[i];
}

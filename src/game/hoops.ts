// Hot Shots: a timed basketball shootout. Shots are thrown from spots round
// one hoop, the ball flying under gravity, off the board and the rim and
// (when it's good) down through the net. Pure and deterministic.
//
// Court space: the rim's centre is above the origin at RIM_Y, the board
// behind it towards -z, the spots out in front (+z). Metres and seconds.

export type Vec3 = readonly [x: number, y: number, z: number];
export type Vec2 = readonly [x: number, z: number];

export const RIM_Y = 3.05;
export const RIM_RADIUS = 0.23;
export const BALL_RADIUS = 0.12;
/** The board's face, behind the rim. */
export const BOARD = { z: -0.38, x: 0.9, y0: 2.9, y1: 3.95 } as const;
const RELEASE_Y = 2.15;
const LAUNCH = (52 * Math.PI) / 180;
const G = 9.81;
const DT = 1 / 240;
const SAMPLE_RATE = 30;
const MAX_TIME = 3;

/** Where shots are taken from, and what each is worth. */
export const SPOTS: readonly { at: Vec2; points: number }[] = [
  { at: [-4, 1.4], points: 2 },
  { at: [-2.8, 3.5], points: 2 },
  { at: [0, 4.4], points: 2 },
  { at: [2.8, 3.5], points: 2 },
  { at: [4, 1.4], points: 2 },
  // the money ball, from way out
  { at: [0, 6.75], points: 3 },
];

export const AIM_LIMIT = 0.08;
export const GAME_SECONDS = 60;

export type Shot = {
  /** Sideways error off the line to the rim, radians. */
  aim: number;
  /** 0..1; 0.5 is the right touch for the distance. */
  power: number;
};

export type ShotKind = "swish" | "rim-in" | "bank" | "rim-out" | "miss";

export type ShotResult = {
  made: boolean;
  kind: ShotKind;
  frames: readonly Vec3[];
};

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/** The launch speed that drops the ball through the rim's centre. */
export function idealSpeed(from: Vec2): number {
  const d = Math.hypot(from[0], from[1]);
  const h = RIM_Y - RELEASE_Y;
  const c = Math.cos(LAUNCH);
  return Math.sqrt((G * d * d) / (2 * c * c * (d * Math.tan(LAUNCH) - h)));
}

/** Throws one shot from `from`. */
export function shoot(from: Vec2, input: Shot): ShotResult {
  const aim = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, finite(input.aim)));
  const power = Math.max(0, Math.min(1, finite(input.power)));
  const speed = idealSpeed(from) * (0.9 + 0.2 * power);
  // straight at the rim, turned by the aim
  const heading = Math.atan2(-from[0], -from[1]) + aim;
  const flat = Math.cos(LAUNCH) * speed;
  const b = {
    x: from[0],
    y: RELEASE_Y,
    z: from[1],
    vx: Math.sin(heading) * flat,
    vy: Math.sin(LAUNCH) * speed,
    vz: Math.cos(heading) * flat,
  };
  const frames: Vec3[] = [];
  let next = 0;
  let banked = false;
  let rimmed = false;
  for (let t = 0; t <= MAX_TIME; t += DT) {
    if (t >= next) {
      next += 1 / SAMPLE_RATE;
      frames.push([b.x, b.y, b.z]);
    }
    const y0 = b.y;
    b.vy -= G * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.z += b.vz * DT;
    // the board: bounce back off its face
    if (
      b.vz < 0 &&
      b.z - BALL_RADIUS < BOARD.z &&
      b.z > BOARD.z - 0.1 &&
      Math.abs(b.x) < BOARD.x &&
      b.y > BOARD.y0 &&
      b.y < BOARD.y1
    ) {
      b.z = BOARD.z + BALL_RADIUS;
      b.vz = -b.vz * 0.55;
      banked = true;
    }
    // coming down through the rim's height
    if (y0 >= RIM_Y && b.y < RIM_Y && b.vy < 0) {
      const off = Math.hypot(b.x, b.z);
      if (off < RIM_RADIUS - BALL_RADIUS * 0.4) {
        // through the net: drop it below the rim and finish
        for (let k = 1; k <= 12; k++)
          frames.push([
            b.x * (1 - k / 12),
            RIM_Y - k * 0.12,
            b.z * (1 - k / 12),
          ]);
        return {
          made: true,
          kind: banked ? "bank" : rimmed ? "rim-in" : "swish",
          frames,
        };
      }
      if (off < RIM_RADIUS + BALL_RADIUS) {
        // off the iron: kicked up and away from the middle
        rimmed = true;
        const nx = b.x / (off || 1);
        const nz = b.z / (off || 1);
        const out = off < RIM_RADIUS ? 0.6 : 1.6;
        b.vx = nx * out;
        b.vz = nz * out;
        b.vy = 1.4;
        b.y = RIM_Y + 0.01;
      }
    }
    if (b.y < BALL_RADIUS) break;
  }
  frames.push([b.x, Math.max(BALL_RADIUS, b.y), b.z]);
  return { made: false, kind: rimmed ? "rim-out" : "miss", frames };
}

// --- a game ------------------------------------------------------------------

export type Shootout = {
  /** Shots taken; the next is from SPOTS[shots % SPOTS.length]. */
  shots: number;
  made: number;
  points: number;
};

export const NEW_SHOOTOUT: Shootout = { shots: 0, made: 0, points: 0 };

export function spotFor(game: Shootout): (typeof SPOTS)[number] {
  return SPOTS[game.shots % SPOTS.length];
}

export function scoreShot(game: Shootout, result: ShotResult): Shootout {
  const spot = spotFor(game);
  return {
    shots: game.shots + 1,
    made: game.made + (result.made ? 1 : 0),
    points: game.points + (result.made ? spot.points : 0),
  };
}

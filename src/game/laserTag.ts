// Laser tag at Photon Zone: a 60-second round in a black-lit arena of neon
// cover. Four rival players duck behind cover and pop out to take shots;
// tap one while she's out in the open, with a clear line, to tag her (+100).
// Each time one pops out with a clear line to you she fires back, and some
// shots land (-50, and your blaster is out for a moment). Pure and
// deterministic: the seed fixes every rival's timing and every shot.
import type { Vec2 } from "./walk.ts";

export const ROUND_SECONDS = 60;
export const TAG_POINTS = 100;
export const HIT_POINTS = 50;
/** Seconds a tagged rival stays down, your blaster's recharge, and the
 * stun after you're hit. */
export const DOWN_SECONDS = 3;
export const RECHARGE = 0.4;
export const STUN = 1.5;

export const ARENA = { x0: -10, x1: 10, z0: -8, z1: 8 } as const;
export const SPAWN: Vec2 = [0, 6.6];
export const EXIT: Vec2 = [0, 7.6];
export const PHOTON_DOOR = {
  position: [146, -266.4] as const,
  landing: [146, -263] as const,
};

export type Box = { x0: number; z0: number; x1: number; z1: number };

/** Neon pillars and low walls: cover for you and for them. */
export const COVER: readonly Box[] = [
  { x0: -6.4, z0: -4.4, x1: -4.6, z1: -2.6 },
  { x0: 4.6, z0: -4.4, x1: 6.4, z1: -2.6 },
  { x0: -1.4, z0: -1.4, x1: 1.4, z1: -0.2 },
  { x0: -7.4, z0: 1.4, x1: -5, z1: 2.4 },
  { x0: 5, z0: 1.4, x1: 7.4, z1: 2.4 },
  { x0: -3.4, z0: -6.6, x1: -1, z1: -6 },
  { x0: 1, z0: -6.6, x1: 3.4, z1: -6 },
  { x0: -3.6, z0: 3.4, x1: -2.4, z1: 4.6 },
  { x0: 2.4, z0: 3.4, x1: 3.6, z1: 4.6 },
];

/** Each rival's hiding spot behind cover and where she pops out to shoot. */
export const RIVALS: readonly { hide: Vec2; peek: Vec2 }[] = [
  { hide: [-5.5, -5], peek: [-3.8, -3.5] },
  { hide: [5.5, -5], peek: [3.8, -3.5] },
  { hide: [-2.2, -7.4], peek: [-0.2, -5.2] },
  { hide: [-6.2, 0.6], peek: [-4.4, 1.1] },
];

function rand(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** How often each rival pops out, and for how long. */
const EXPOSED = 1.3;
function period(seed: number, i: number) {
  return 2.6 + rand(seed + i * 7.1) * 1.4;
}
function offset(seed: number, i: number) {
  return rand(seed + i * 3.3) * 2;
}

/** Which of rival `i`'s pop-outs `t` falls in (or -1 before the first),
 * and whether she's out in the open then. */
export function popOut(seed: number, i: number, t: number) {
  const p = period(seed, i);
  const local = t - offset(seed, i);
  if (local < 0) return { window: -1, out: false };
  const window = Math.floor(local / p);
  return { window, out: local - window * p < EXPOSED };
}

/** Whether the straight line from `a` to `b` clears every piece of cover. */
export function clearLine(a: Vec2, b: Vec2): boolean {
  for (const c of COVER) {
    // slab test of the segment against the box
    let lo = 0;
    let hi = 1;
    for (const [p, d, min, max] of [
      [a[0], b[0] - a[0], c.x0, c.x1],
      [a[1], b[1] - a[1], c.z0, c.z1],
    ] as const) {
      if (Math.abs(d) < 1e-9) {
        if (p < min || p > max) {
          lo = 2;
          break;
        }
        continue;
      }
      const t1 = (min - p) / d;
      const t2 = (max - p) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
    }
    if (lo <= hi) return false;
  }
  return true;
}

export type Round = {
  seed: number;
  t: number;
  tags: number;
  hits: number;
  /** When each rival is back up after a tag. */
  downUntil: number[];
  /** Each rival's last pop-out that already fired at you. */
  fired: number[];
  nextShot: number;
  stunUntil: number;
};

export function newRound(seed: number): Round {
  return {
    seed,
    t: 0,
    tags: 0,
    hits: 0,
    downUntil: RIVALS.map(() => 0),
    fired: RIVALS.map(() => -1),
    nextShot: 0,
    stunUntil: 0,
  };
}

export const roundOver = (r: Round) => r.t >= ROUND_SECONDS;

/** Where rival `i` stands now, and whether she's out and up. */
export function rivalAt(r: Round, i: number): { at: Vec2; open: boolean } {
  const spot = RIVALS[i];
  if (!spot) return { at: [0, 0], open: false };
  const { out } = popOut(r.seed, i, r.t);
  const up = r.t >= (r.downUntil[i] ?? 0);
  const open = out && up;
  return { at: open ? spot.peek : spot.hide, open };
}

/** Advances the round by `dt` seconds with you at `you`: each rival that's
 * out with a clear line fires once per pop-out, and about two in five land. */
export function stepRound(r: Round, dt: number, you: Vec2): Round {
  if (roundOver(r)) return r;
  const t = Math.min(ROUND_SECONDS, r.t + Math.max(0, dt));
  let next: Round = { ...r, t };
  RIVALS.forEach((_, i) => {
    const { window, out } = popOut(r.seed, i, t);
    if (!out || window <= (next.fired[i] ?? -1)) return;
    const { at, open } = rivalAt(next, i);
    if (!open || !clearLine(at, you)) return;
    const fired = [...next.fired];
    fired[i] = window;
    const lands = rand(r.seed + i * 13.7 + window * 1.9) < 0.4;
    next = lands
      ? { ...next, fired, hits: next.hits + 1, stunUntil: t + STUN }
      : { ...next, fired };
  });
  return next;
}

export type Shot = "tag" | "miss" | "blocked" | "recharging";

/** You fire at rival `i` from `you`. */
export function shoot(
  r: Round,
  i: number,
  you: Vec2,
): { round: Round; shot: Shot } {
  if (roundOver(r) || r.t < r.nextShot || r.t < r.stunUntil)
    return { round: r, shot: "recharging" };
  const fired = { ...r, nextShot: r.t + RECHARGE };
  const { at, open } = rivalAt(r, i);
  if (!open) return { round: fired, shot: "miss" };
  if (!clearLine(you, at)) return { round: fired, shot: "blocked" };
  const downUntil = [...r.downUntil];
  downUntil[i] = r.t + DOWN_SECONDS;
  return { round: { ...fired, tags: r.tags + 1, downUntil }, shot: "tag" };
}

export function roundScore(r: Round): number {
  return Math.max(0, r.tags * TAG_POINTS - r.hits * HIT_POINTS);
}

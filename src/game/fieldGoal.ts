// Field goals: five kicks from further out each time, at uprights with a
// crossbar, with a crosswind to aim into. Pure and deterministic.
//
// Field space: x across (the posts at ±UPRIGHT_X), y up, z out from the
// goal line towards the kicker. Meters and seconds.

export type Vec3 = readonly [x: number, y: number, z: number];

export const CROSSBAR_Y = 3.05;
export const UPRIGHT_X = 2.82;
export const UPRIGHT_TOP = 9;
const LAUNCH = (38 * Math.PI) / 180;
const G = 9.81;
const DT = 1 / 120;
export const SPEED = [14, 30] as const;
export const AIM_LIMIT = 0.14;

/** The five kicks: how far out (m) and the wind across (m/s, + to +x). */
export const KICKS: readonly { distance: number; wind: number }[] = [
  { distance: 18, wind: 0 },
  { distance: 27, wind: 1.5 },
  { distance: 34, wind: -2 },
  { distance: 41, wind: 2.5 },
  { distance: 46, wind: -3 },
];

export type Kick = { aim: number; power: number };
export type Result = "good" | "wide-left" | "wide-right" | "short";

export type KickResult = { result: Result; frames: readonly Vec3[] };

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/** Kicks from `distance` out with `wind` across. */
export function kick(distance: number, wind: number, input: Kick): KickResult {
  const aim = Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, finite(input.aim)));
  const power = Math.max(0, Math.min(1, finite(input.power)));
  const speed = SPEED[0] + (SPEED[1] - SPEED[0]) * power;
  const flat = Math.cos(LAUNCH) * speed;
  const b = {
    x: 0,
    y: 0,
    z: distance,
    vx: Math.sin(aim) * flat,
    vy: Math.sin(LAUNCH) * speed,
    vz: -Math.cos(aim) * flat,
  };
  const frames: Vec3[] = [];
  let k = 0;
  let result: Result | null = null;
  for (let t = 0; t < 6 && b.y >= 0; t += DT, k++) {
    if (k % 4 === 0) frames.push([b.x, b.y, b.z]);
    const z0 = b.z;
    // the wind pushes it across the longer it's in the air
    b.vx += wind * 0.6 * DT;
    b.vy -= G * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.z += b.vz * DT;
    if (result === null && z0 > 0 && b.z <= 0) {
      if (b.y < CROSSBAR_Y) result = "short";
      else if (b.x < -UPRIGHT_X) result = "wide-left";
      else if (b.x > UPRIGHT_X) result = "wide-right";
      else result = "good";
    }
  }
  frames.push([b.x, Math.max(0, b.y), b.z]);
  return { result: result ?? "short", frames };
}

export type Series = { results: readonly Result[] };
export const NEW_SERIES: Series = { results: [] };

export function seriesOver(s: Series): boolean {
  return s.results.length >= KICKS.length;
}

export function made(s: Series): number {
  return s.results.filter((r) => r === "good").length;
}

export function scoreKick(s: Series, r: KickResult): Series {
  return seriesOver(s) ? s : { results: [...s.results, r.result] };
}

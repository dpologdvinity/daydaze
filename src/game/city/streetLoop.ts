// Shared arc-length street loops: rounded corners, fixed dwell, pooled poses.
import type { Vec2 } from "../walk.ts";
export type StreetPose = {
  x: number;
  z: number;
  yaw: number;
  stop: number;
  next: number;
};
export type StreetStop = { name: string; at: Vec2; road: Vec2; yaw: number };
export function streetLoop(
  stops: readonly StreetStop[],
  corners: readonly (readonly Vec2[])[],
  dwell: number,
  speed: number,
) {
  function leg(i: number) {
    const points: Vec2[] = [stops[i].road];
    const end = stops[(i + 1) % stops.length].road;
    for (let k = 0; k < corners[i].length; k++) {
      const corner = corners[i][k];
      const next = corners[i][k + 1] ?? end;
      const start = k === 0 ? stops[i].road : corners[i][k - 1];
      const a = Math.hypot(corner[0] - start[0], corner[1] - start[1]);
      const b = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
      const r = 7;
      const before: Vec2 = [
        corner[0] + ((start[0] - corner[0]) * r) / a,
        corner[1] + ((start[1] - corner[1]) * r) / a,
      ];
      const after: Vec2 = [
        corner[0] + ((next[0] - corner[0]) * r) / b,
        corner[1] + ((next[1] - corner[1]) * r) / b,
      ];
      points.push(before);
      for (let j = 1; j <= 16; j++) {
        const t = j / 16,
          u = 1 - t;
        points.push([
          u * u * before[0] + 2 * u * t * corner[0] + t * t * after[0],
          u * u * before[1] + 2 * u * t * corner[1] + t * t * after[1],
        ]);
      }
    }
    points.push(end);
    const distances = [0];
    for (let j = 1; j < points.length; j++)
      distances.push(
        distances[j - 1] +
          Math.hypot(
            points[j][0] - points[j - 1][0],
            points[j][1] - points[j - 1][1],
          ),
      );
    return {
      points,
      distances,
      seconds: distances[distances.length - 1] / speed,
    };
  }
  const LEGS = stops.map((_, i) => leg(i));
  const ARRIVALS: number[] = [];
  let duration = 0;
  for (const l of LEGS) {
    ARRIVALS.push(duration);
    duration += dwell + l.seconds;
  }
  const cycle = duration;
  const phase = (seconds: number) => ((seconds % cycle) + cycle) % cycle;

  /** Writes into a pooled pose; no frame-rate dependence and no per-frame objects. */
  function at(seconds: number, out: StreetPose): void {
    const t = phase(seconds);
    let i = stops.length - 1;
    while (i > 0 && t < ARRIVALS[i]) i--;
    const elapsed = t - ARRIVALS[i];
    const stop = stops[i];
    out.next = (i + 1) % stops.length;
    if (elapsed < dwell) {
      out.x = stop.road[0];
      out.z = stop.road[1];
      out.yaw = stop.yaw;
      out.stop = i;
      return;
    }
    out.stop = -1;
    const l = LEGS[i],
      d = (elapsed - dwell) * speed;
    let j = 1;
    while (j < l.distances.length - 1 && d >= l.distances[j]) j++;
    const a = l.points[j - 1],
      b = l.points[j];
    const f = (d - l.distances[j - 1]) / (l.distances[j] - l.distances[j - 1]);
    out.x = a[0] + (b[0] - a[0]) * f;
    out.z = a[1] + (b[1] - a[1]) * f;
    out.yaw = Math.atan2(a[1] - b[1], b[0] - a[0]);
  }

  return { cycle, at, phase, arrivals: ARRIVALS };
}

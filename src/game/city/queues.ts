// The people waiting outside the clubs: three in the queue, four behind them
// and a bouncer at each end of the door (buildings with `queue: true`). Pure
// positions and looks; src/client/city/QueueCrowd.tsx draws them as Kenney
// Mini Characters (CC0), one instanced mesh per look. They stand facing the door.

import { BUILDINGS } from "./layout.ts";
import { frontOf } from "./dressing.ts";
import { hash } from "./hash.ts";

/** The baked looks (public/models/speedway/people-<look>-idle.glb). */
export const QUEUE_LOOKS = [
  "male-a",
  "female-c",
  "male-d",
  "female-a",
  "male-c",
  "male-e",
  "female-b",
  "female-d",
] as const;
/** Queues farther than this (meters, from where the plan was cut) are not drawn: on the low tier, and elsewhere. */
export const QUEUE_NEAR_LOW = 80;
export const QUEUE_NEAR = 130;
/** The dearest baked person's triangles (public/models/speedway/people-*-idle.glb; budget.test.ts checks). */
export const QUEUE_PERSON_TRIS = 880;
export type QueueLook = (typeof QUEUE_LOOKS)[number];
/** The bouncers are always these two. */
const BOUNCERS: readonly QueueLook[] = ["male-d", "male-e"];

export type QueueSpot = { x: number; z: number; yaw: number; look: QueueLook };

function queueSpots(): QueueSpot[] {
  const spots: QueueSpot[] = [];
  for (const b of BUILDINGS) {
    if (!b.queue) continue;
    const f = frontOf(b);
    // forward is +z at yaw 0: face the wall, against the way out of the front
    const toDoor = f.out1 > 0 ? Math.PI : 0;
    const add = (x: number, out: number, look: QueueLook, seed: number) =>
      spots.push({
        x,
        z: f.faceZ + f.out1 * out,
        yaw: toDoor + (hash(x, seed, 11) - 0.5) * 0.5,
        look,
      });
    const pick = (x: number, seed: number) =>
      QUEUE_LOOKS[Math.floor(hash(x, seed, 3) * QUEUE_LOOKS.length)] ??
      QUEUE_LOOKS[0];
    for (let i = 0; i < 3; i++)
      add(f.x0 + 4 + i * 5, 1.5, pick(f.x0 + i, 1), i);
    for (let i = 0; i < 4; i++)
      add(f.x0 + 6.5 + i * 5, 3.6, pick(f.x0 + i, 2), 7 + i);
    [f.x0 + 1.2, f.x1 - 1.2].forEach((x, i) =>
      add(x, 1.1, BOUNCERS[i] ?? "male-d", 20 + i),
    );
  }
  return spots;
}

export const QUEUE_SPOTS: readonly QueueSpot[] = queueSpots();

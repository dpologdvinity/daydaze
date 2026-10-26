// A creature that wanders the loop round its pen (zoo.ts loopAt): it idles,
// walks a stretch, grazes, and stops to look at a visitor who comes close
// (creature.ts decides the moods). `player` is optional; without one the
// animal never turns alert.

import { useMemo, type JSX } from "react";
import {
  ALERT_RANGE,
  newWanderer,
  stepWanderer,
  turnToward,
} from "../../game/creature.ts";
import { MOOD_CLIP, type LandKind } from "../../game/creatures.ts";
import { loopAt, type Rect } from "../../game/zoo.ts";
import type { Player } from "../world/PlayerController.tsx";
import { Creature, type CreaturePose } from "./Creature.tsx";

/** How fast (rad/s) an animal turns to face its way or a visitor. */
const TURN = 2.5;

export function WanderingCreature({
  kind,
  pen,
  speed,
  phase,
  dir = 1,
  player,
}: {
  kind: LandKind;
  pen: Rect;
  /** Meters per second while walking. */
  speed: number;
  /** Starting angle round the loop. */
  phase: number;
  /** 1 walks the loop one way, -1 the other. */
  dir?: 1 | -1;
  player?: Player;
}): JSX.Element {
  const w = useMemo(() => newWanderer(phase, 1 + (phase % 3)), [phase]);
  const yaw = useMemo(
    () => ({ v: loopAt(pen, 0, 1, phase).yaw }),
    [pen, phase],
  );
  const radius = Math.max(pen.x1 - pen.x0, pen.z1 - pen.z0) / 2 - 1.6;
  const drive = (dt: number, pose: CreaturePose) => {
    const here = loopAt(pen, 0, 1, w.a);
    pose.x = here.at[0];
    pose.z = here.at[1];
    const near =
      player !== undefined &&
      Math.hypot(player.pos.x - pose.x, player.pos.z - pose.z) < ALERT_RANGE;
    stepWanderer(w, dt, near, (dir * speed) / radius, Math.random);
    // face along the loop, or at the visitor when alert
    const heading =
      near && player
        ? Math.atan2(player.pos.x - pose.x, player.pos.z - pose.z)
        : here.yaw + (dir < 0 ? Math.PI : 0);
    yaw.v = turnToward(yaw.v, heading, TURN * dt);
    pose.yaw = yaw.v;
    pose.clip = MOOD_CLIP[w.mood];
  };
  return <Creature kind={kind} drive={drive} />;
}

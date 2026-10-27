import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import {
  PEDESTRIANS,
  nearestPedestrians,
  pedestrianAt,
  type PedestrianPose,
} from "../../game/city/pedestrians.ts";
import { Doll } from "../avatar/Doll.tsx";
import { Creature, type CreaturePose } from "../creatures/Creature.tsx";
import type { Player } from "../world/PlayerController.tsx";

/** At most this many walkers are drawn: each is a full doll. */
const DRAWN = 4;
const RADIUS = 55;
/** Seconds between re-picking who is nearest. */
const REPICK = 0.75;

function Walker({ index }: { index: number }) {
  const g = useRef<THREE.Group>(null);
  const pose = useRef<PedestrianPose>({ x: 0, z: 0, yaw: 0 });
  const p = PEDESTRIANS[index];
  // her own pace over the ground, so her legs keep up with it
  const walking = useMemo(() => ({ current: { speed: p.speed } }), [p]);
  useFrame(({ clock }) => {
    if (!g.current) return;
    pedestrianAt(p, clock.elapsedTime, pose.current);
    g.current.position.set(pose.current.x, 0, pose.current.z);
    g.current.rotation.y = pose.current.yaw;
  });
  // a dog walker's dog trots at her right hand, a little ahead
  const dog = p.dog;
  const drive = (_dt: number, out: CreaturePose) => {
    const { x, z, yaw } = pose.current;
    out.x = x + Math.cos(yaw) * 1.0 + Math.sin(yaw) * 0.5;
    out.z = z - Math.sin(yaw) * 1.0 + Math.cos(yaw) * 0.5;
    out.yaw = yaw;
    out.clip = "walk";
  };
  return (
    <>
      <group ref={g}>
        <Doll look={p.look} mood="idle" walk={walking} seed={100 + index} />
      </group>
      {dog && <Creature kind={dog} drive={drive} />}
    </>
  );
}

/**
 * People walking the sidewalks: the nearest few to the player, re-picked
 * every moment as everyone moves. Their paths are pure functions of time
 * (src/game/city/pedestrians.ts), so a walker carries on where she was when
 * she comes back into range.
 */
export function Pedestrians({ player }: { player: Player }) {
  const [shown, setShown] = useState<readonly number[]>([]);
  const last = useRef(-Infinity);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < REPICK) return;
    last.current = t;
    const next = nearestPedestrians(
      [player.pos.x, player.pos.z],
      t,
      DRAWN,
      RADIUS,
    );
    // only re-render when the set changes, not when the order does
    const same =
      next.length === shown.length && next.every((i) => shown.includes(i));
    if (!same) setShown(next);
  });
  return (
    <>
      {shown.map((i) => (
        <Walker key={i} index={i} />
      ))}
    </>
  );
}

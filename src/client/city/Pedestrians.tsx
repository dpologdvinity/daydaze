import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  PEDESTRIANS,
  nearestPedestrians,
  pedestrianAt,
  type PedestrianPose,
} from "../../game/city/pedestrians.ts";
import { Doll } from "../avatar/Doll.tsx";
import { Creature, type CreaturePose } from "../creatures/Creature.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { cityHour } from "./daylight.ts";

/** At most this many walkers are drawn: each is a full doll. */
const DRAWN = 6;
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
  // a dog walker's dog trots at her left hand (+x at yaw 0, facing +z), a
  // little ahead
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

/** Beyond the dolls: the rest of the crowd within this far, as small figures. */
const CROWD_RADIUS = 130;
const CROWD_MAX = 80;
const CROWD_COLORS = [
  "#ff6fa8",
  "#4fb8ff",
  "#ffd23f",
  "#3fcf7a",
  "#b06bff",
  "#ff8a3d",
  "#f2f2f2",
  "#2fd0c0",
];

/**
 * The crowd past the nearest dolls: one instanced mesh of capsule-and-head
 * figures (about 100 triangles each) walking the same paths, so the deck
 * reads as busy from a distance. Allocates nothing per frame.
 */
function CrowdFigures({
  player,
  dolls,
}: {
  player: Player;
  dolls: React.RefObject<readonly number[]>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const picked = useRef<readonly number[]>([]);
  const last = useRef(-Infinity);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pose = useRef<PedestrianPose>({ x: 0, z: 0, yaw: 0 });
  const geometry = useMemo(() => {
    const body = new THREE.CapsuleGeometry(0.22, 0.85, 2, 6).translate(
      0,
      0.85,
      0,
    );
    const head = new THREE.SphereGeometry(0.15, 6, 4).translate(0, 1.62, 0);
    const merged = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()]);
    body.dispose();
    head.dispose();
    return merged;
  }, []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < CROWD_MAX; i += 1)
      m.setColorAt(i, new THREE.Color(CROWD_COLORS[i % CROWD_COLORS.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    if (t - last.current >= REPICK) {
      last.current = t;
      const all = nearestPedestrians(
        [player.pos.x, player.pos.z],
        t,
        CROWD_MAX + DRAWN,
        CROWD_RADIUS,
        cityHour(),
      );
      picked.current = all.filter((i) => !dolls.current.includes(i));
    }
    const n = Math.min(picked.current.length, CROWD_MAX);
    for (let k = 0; k < n; k += 1) {
      const p = PEDESTRIANS[picked.current[k]];
      pedestrianAt(p, t, pose.current);
      dummy.position.set(pose.current.x, 0.14, pose.current.z);
      dummy.rotation.y = pose.current.yaw;
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, CROWD_MAX]}
      frustumCulled={false}
    >
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
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
  const dolls = useRef<readonly number[]>([]);
  dolls.current = shown;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < REPICK) return;
    last.current = t;
    const next = nearestPedestrians(
      [player.pos.x, player.pos.z],
      t,
      DRAWN,
      RADIUS,
      cityHour(),
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
      <CrowdFigures player={player} dolls={dolls} />
    </>
  );
}

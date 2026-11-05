import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
import { PERSON_SCALE, usePersonAt } from "../rooms/speedway/peopleModel.ts";

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

/** Beyond the dolls: the rest of the crowd within this far, as small people. */
const CROWD_RADIUS = 110;
/** Per look and stride: 4 looks x 2 strides, each its own instanced mesh. */
const CROWD_CAP = 24;
const LOOKS = ["male-a", "female-c", "male-d", "female-a"] as const;
const STRIDES = ["walk-a", "walk-b"] as const;
const walkerUrl = (look: string, stride: string) =>
  `/models/street/walker-${look}-${stride}.glb`;
for (const l of LOOKS)
  for (const s of STRIDES) useGLTF.preload(walkerUrl(l, s));
/** Steps per second of the far crowd's two-pose walk. */
const STEP_RATE = 2.2;

/** One look in one stride: an instanced mesh holding whoever is in it now. */
function WalkerMesh({
  look,
  stride,
  mesh,
}: {
  look: string;
  stride: string;
  mesh: (m: THREE.InstancedMesh | null) => void;
}) {
  const person = usePersonAt(walkerUrl(look, stride));
  if (!person) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[person.geometry, person.material, CROWD_CAP]}
      frustumCulled={false}
    />
  );
}

const BIKE_URL = "/models/street/bicycle.glb";
const rideUrl = (look: string) => `/models/street/walker-${look}-ride.glb`;
useGLTF.preload(BIKE_URL);
useGLTF.preload(rideUrl("male-a"));
useGLTF.preload(rideUrl("female-c"));

/** One cyclist: a downloaded bicycle with a posed Kenney rider, riding the deck. */
function Cyclist({
  slot,
  bikers,
}: {
  slot: number;
  bikers: React.RefObject<readonly number[]>;
}) {
  const group = useRef<THREE.Group>(null);
  const pose = useRef<PedestrianPose>({ x: 0, z: 0, yaw: 0 });
  const bike = useGLTF(BIKE_URL).scene;
  const male = useGLTF(rideUrl("male-a")).scene;
  const female = useGLTF(rideUrl("female-c")).scene;
  const parts = useMemo(
    () => ({
      bike: bike.clone(true),
      male: male.clone(true),
      female: female.clone(true),
    }),
    [bike, male, female],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const i = bikers.current[slot];
    g.visible = i !== undefined;
    if (i === undefined) return;
    pedestrianAt(PEDESTRIANS[i], clock.elapsedTime, pose.current);
    g.position.set(pose.current.x, 0.14, pose.current.z);
    g.rotation.y = pose.current.yaw;
    // the rider is the one this walker's number picks
    parts.male.visible = i % 2 === 0;
    parts.female.visible = i % 2 === 1;
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.bike} />
      <group position={[0, 0.02, -0.05]} scale={PERSON_SCALE}>
        <primitive object={parts.male} />
        <primitive object={parts.female} />
      </group>
    </group>
  );
}

/**
 * The crowd past the nearest dolls: Kenney Mini Characters (CC0) baked in two
 * stride poses (art/speedway/build_people.py), instanced per look and pose.
 * Each walker swaps between the two poses as she goes, so the far deck reads
 * as people walking. Allocates nothing per frame.
 */
function CrowdFigures({
  player,
  dolls,
}: {
  player: Player;
  dolls: React.RefObject<readonly number[]>;
}) {
  const bikers = useRef<readonly number[]>([]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const picked = useRef<readonly number[]>([]);
  const last = useRef(-Infinity);
  const dummy = useMemo(() => {
    const d = new THREE.Object3D();
    d.scale.setScalar(PERSON_SCALE);
    return d;
  }, []);
  const pose = useRef<PedestrianPose>({ x: 0, z: 0, yaw: 0 });
  const counts = useRef<number[]>(
    new Array(LOOKS.length * STRIDES.length).fill(0),
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current >= REPICK) {
      last.current = t;
      const all = nearestPedestrians(
        [player.pos.x, player.pos.z],
        t,
        CROWD_CAP * LOOKS.length + DRAWN,
        CROWD_RADIUS,
        cityHour(),
        true,
      );
      const rest = all.filter((i) => !dolls.current.includes(i));
      picked.current = rest.filter((i) => !PEDESTRIANS[i].bike);
      bikers.current = rest.filter((i) => PEDESTRIANS[i].bike);
    }
    counts.current.fill(0);
    for (const i of picked.current) {
      const look = i % LOOKS.length;
      const stride = (t * STEP_RATE + i * 0.37) % 1 < 0.5 ? 0 : 1;
      const slot = look * STRIDES.length + stride;
      const m = meshes.current[slot];
      if (!m || counts.current[slot] >= CROWD_CAP) continue;
      pedestrianAt(PEDESTRIANS[i], t, pose.current);
      dummy.position.set(pose.current.x, 0.14, pose.current.z);
      dummy.rotation.y = pose.current.yaw;
      dummy.updateMatrix();
      m.setMatrixAt(counts.current[slot]++, dummy.matrix);
    }
    meshes.current.forEach((m, slot) => {
      if (!m) return;
      m.count = counts.current[slot];
      m.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {[0, 1, 2].map((slot) => (
        <Cyclist key={slot} slot={slot} bikers={bikers} />
      ))}
      {LOOKS.flatMap((look, l) =>
        STRIDES.map((stride, s) => (
          <WalkerMesh
            key={`${look}-${stride}`}
            look={look}
            stride={stride}
            mesh={(m) => {
              meshes.current[l * STRIDES.length + s] = m;
            }}
          />
        )),
      )}
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

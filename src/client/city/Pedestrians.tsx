// The city's pedestrians and pets: every walker follows its scripted path (or
// where a car has put her: knocked down, dodging, staring; streetHits.ts),
// and only the ones nearest the player are full dolls or creatures.
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
import {
  CROWD_CAP,
  CROWD_RADIUS,
  PEDESTRIAN_DOLLS,
  PEDESTRIAN_DOLL_RADIUS,
} from "../../game/city/tuning.ts";
import { streetPose, type StreetPose } from "../../game/city/streetKnocks.ts";
import { reactionClip, type ReactionId } from "../../game/reactions.ts";
import { useDetail } from "../world/quality.ts";
import { Doll, type WalkState } from "../avatar/Doll.tsx";
import { Creature, type CreaturePose } from "../creatures/Creature.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { cityHour } from "./daylight.ts";
import { usePersonAt } from "../rooms/speedway/peopleModel.ts";
import { FAN_LOOKS, RIDER_LOOKS, crowdUrl } from "../../game/crowd.ts";
import { streetHits, streetSeconds } from "./streetHits.ts";

/** Walker `i` at `time`: on her path, or where a car has put her. */
function walkerAt(i: number, time: number, out: StreetPose): StreetPose {
  const s = streetHits.walkers.get(i);
  if (s) return streetPose(PEDESTRIANS[i], s, time, out);
  pedestrianAt(PEDESTRIANS[i], time, out);
  out.held = false;
  out.reaction = null;
  return out;
}

const standing = (): StreetPose => ({
  x: 0,
  z: 0,
  yaw: 0,
  held: false,
  reaction: null,
});

/** Seconds between re-picking who is nearest. */
const REPICK = 0.75;

function Walker({ index }: { index: number }) {
  const g = useRef<THREE.Group>(null);
  const pose = useRef<StreetPose>(standing());
  const shown = useRef<ReactionId | null>(null);
  const p = PEDESTRIANS[index];
  // her own pace over the ground, so her legs keep up with it
  const walking = useMemo<{ current: WalkState }>(
    () => ({ current: { speed: p.speed } }),
    [p],
  );
  useFrame(() => {
    if (!g.current) return;
    const now = walkerAt(index, streetSeconds(), pose.current);
    g.current.position.set(now.x, 0, now.z);
    g.current.rotation.y = now.yaw;
    // knocked down, frozen or staring, she stands; a reaction plays once
    walking.current.speed = now.held ? 0 : p.speed;
    if (now.reaction !== shown.current) {
      shown.current = now.reaction;
      if (now.reaction)
        walking.current.react = {
          id: reactionClip(now.reaction),
          n: (walking.current.react?.n ?? 0) + 1,
        };
    }
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

/** Per look and stride: 4 looks x 2 strides, each its own instanced mesh. */
// the stands' four looks walk the street too
const LOOKS = FAN_LOOKS;
const STRIDES = ["walk-a", "walk-b"] as const;
const walkerUrl = (
  look: (typeof LOOKS)[number],
  stride: (typeof STRIDES)[number],
) => crowdUrl(look, stride, "far");
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
  look: (typeof LOOKS)[number];
  stride: (typeof STRIDES)[number];
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
// a cyclist's number picks the first rider when even, the second when odd
const [RIDER_A, RIDER_B] = RIDER_LOOKS.map((look) =>
  crowdUrl(look, "ride", "far"),
);
useGLTF.preload(BIKE_URL);
useGLTF.preload(RIDER_A);
useGLTF.preload(RIDER_B);
/** Where the baked rider's feet go so they sit on the saddle (meters, bike
 * space: the saddle is 1.04 m up at x -0.41, a seated rider's hips 0.47 m
 * over their feet), and the turn that faces them along the bike (+x). */
const SADDLE: readonly [number, number, number] = [-0.41, 0.57, 0];
const ALONG_BIKE = Math.PI / 2;

/** One cyclist: a downloaded bicycle with a baked doll rider, riding the deck. */
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
  const riderA = useGLTF(RIDER_A).scene;
  const riderB = useGLTF(RIDER_B).scene;
  const parts = useMemo(
    () => ({
      bike: bike.clone(true),
      a: riderA.clone(true),
      b: riderB.clone(true),
    }),
    [bike, riderA, riderB],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const i = bikers.current[slot];
    g.visible = i !== undefined;
    if (i === undefined) return;
    pedestrianAt(PEDESTRIANS[i], streetSeconds(), pose.current);
    g.position.set(pose.current.x, 0.14, pose.current.z);
    g.rotation.y = pose.current.yaw;
    // the rider is the one this walker's number picks
    parts.a.visible = i % 2 === 0;
    parts.b.visible = i % 2 === 1;
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.bike} />
      <group position={SADDLE} rotation-y={ALONG_BIKE}>
        <primitive object={parts.a} />
        <primitive object={parts.b} />
      </group>
    </group>
  );
}

/**
 * The crowd past the nearest dolls: doll people baked in two stride poses
 * (art/crowd/, the far tier), instanced per look and pose.
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
  const tier = useDetail();
  const drawn = PEDESTRIAN_DOLLS[tier];
  const bikers = useRef<readonly number[]>([]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const picked = useRef<readonly number[]>([]);
  const last = useRef(-Infinity);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pose = useRef<StreetPose>(standing());
  const counts = useRef<number[]>(
    new Array<number>(LOOKS.length * STRIDES.length).fill(0),
  );
  useFrame(({ clock }) => {
    const t = streetSeconds();
    // repick on the monotonic frame clock: a device clock set back must not stall it
    if (clock.elapsedTime - last.current >= REPICK) {
      last.current = clock.elapsedTime;
      const all = nearestPedestrians(
        [player.pos.x, player.pos.z],
        t,
        CROWD_CAP * LOOKS.length + drawn,
        CROWD_RADIUS[tier],
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
      walkerAt(i, t, pose.current);
      // standing still (stopped by a car, staring): one pose, not a stride
      // shortcut: a far walker knocked down stays upright; she is a doll
      // when the car that hit her is near, so this shows only past the dolls
      const stride =
        pose.current.held || (t * STEP_RATE + i * 0.37) % 1 < 0.5 ? 0 : 1;
      const slot = look * STRIDES.length + stride;
      const m = meshes.current[slot];
      if (!m || counts.current[slot] >= CROWD_CAP) continue;
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
  const tier = useDetail();
  const drawn = PEDESTRIAN_DOLLS[tier];
  const radius = PEDESTRIAN_DOLL_RADIUS[tier];
  const [shown, setShown] = useState<readonly number[]>([]);
  const last = useRef(-Infinity);
  const dolls = useRef<readonly number[]>([]);
  dolls.current = shown;
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < REPICK) return;
    last.current = clock.elapsedTime;
    const next = nearestPedestrians(
      [player.pos.x, player.pos.z],
      streetSeconds(),
      drawn,
      radius,
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

// Kiddie Land: the toy train's oval east of the fairground. A candy-colored
// steam engine, its tender and two open wagons (Quaternius' Train Pack, CC0,
// cut down by art/fair/build_train.py) run round a loop of rails and ties
// behind a glowing fence, stopping at nothing: while the player rides, the
// first wagon is the one carrying her (src/game/amusementPark.ts keeps the
// seat, `coasterRiders` moves the train under it).

import { useMemo } from "react";
import * as THREE from "three";
import {
  KIDDIE,
  KIDDIE_CARS,
  KIDDIE_RAIL,
  KIDDIE_SCALE,
  KIDDIE_SEAT_BACK,
  KIDDIE_TRACK,
  newPose,
  trackPose,
} from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { MARQUEE, Neon, NeonText } from "../shared/Neon.tsx";
import { Boxes, Segments, type Box, type Segment } from "./Instanced.tsx";
import { InstancedModel, type PlaceCopy } from "./InstancedModel.tsx";
import { coasterRiders } from "./Rides.tsx";

/** Rails sit this far apart (meters, toy gauge). */
const GAUGE = 0.7;
/** Half the distance between a car's two axles: its heading comes from them. */
const AXLE = 1.5;
const WAGON_TINTS = ["#ff6ac8", "#ffd84f"];
const RAIL = new THREE.MeshStandardMaterial({
  color: "#c9c3dc",
  metalness: 0.8,
  roughness: 0.35,
});

// per-frame scratch, so the train allocates nothing
const front = newPose();
const back = newPose();
const mid = newPose();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scale = new THREE.Vector3(KIDDIE_SCALE, KIDDIE_SCALE, KIDDIE_SCALE);
const matrix = new THREE.Matrix4();

/** Cars run `meters` per second round the loop: a lap in `seconds`. */
const SECONDS = { normal: 28, calm: 42 };

/** One group of cars of the same model, each `KIDDIE_CARS[index]` behind the engine. */
function Cars({
  url,
  indexes,
  tints,
}: {
  url: string;
  indexes: readonly number[];
  tints?: readonly string[];
}) {
  const calm = useReducedMotion();
  const update = (place: PlaceCopy, elapsed: number) => {
    const speed = KIDDIE_TRACK.length / (calm ? SECONDS.calm : SECONDS.normal);
    // the rider's wagon is where the ride's clock says; the engine is ahead of it
    const rider = coasterRiders["kiddie-train"];
    const lead =
      rider === undefined ? elapsed * speed : rider + KIDDIE_SEAT_BACK;
    indexes.forEach((car, k) => {
      const at = lead - KIDDIE_CARS[car];
      trackPose(KIDDIE_TRACK, at + AXLE, front);
      trackPose(KIDDIE_TRACK, at - AXLE, back);
      mid.x = (front.x + back.x) / 2;
      mid.z = (front.z + back.z) / 2;
      position.set(mid.x, KIDDIE_RAIL, mid.z);
      euler.set(0, Math.atan2(front.x - back.x, front.z - back.z), 0);
      quaternion.setFromEuler(euler);
      place(k, matrix.compose(position, quaternion, scale));
    });
  };
  return (
    <InstancedModel
      url={url}
      count={indexes.length}
      update={update}
      tints={tints}
    />
  );
}

/** The rails (two tubes), the ties, the fence round them and the station. */
export function KiddieLand() {
  const parts = useMemo(() => {
    const rails: THREE.TubeGeometry[] = [];
    const samples = KIDDIE_TRACK.samples;
    for (const side of [-1, 1]) {
      const pts = samples.map((p, i) => {
        const next = samples[(i + 1) % samples.length];
        const prev = samples[(i + samples.length - 1) % samples.length];
        // the track's normal in the ground plane
        const dx = next[0] - prev[0];
        const dz = next[2] - prev[2];
        const len = Math.hypot(dx, dz) || 1;
        return new THREE.Vector3(
          p[0] + (-dz / len) * side * (GAUGE / 2),
          p[1] + 0.06,
          p[2] + (dx / len) * side * (GAUGE / 2),
        );
      });
      rails.push(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts, true),
          samples.length * 2,
          0.028,
          5,
          true,
        ),
      );
    }
    const ties: Box[] = [];
    const pose = newPose();
    for (let d = 0; d < KIDDIE_TRACK.length; d += 0.75) {
      trackPose(KIDDIE_TRACK, d, pose);
      ties.push({
        position: [pose.x, pose.y + 0.02, pose.z],
        size: [GAUGE + 0.3, 0.05, 0.14],
        yaw: pose.yaw + Math.PI / 2,
        color: "#6b4a3a",
      });
    }
    // fence: posts and a glowing rail on an oval a meter out from the track
    const fence: THREE.Vector3[] = [];
    const posts: Segment[] = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = KIDDIE.cx + (KIDDIE.a + 1.2) * Math.cos(t);
      const z = KIDDIE.cz + (KIDDIE.b + 1.2) * Math.sin(t);
      fence.push(new THREE.Vector3(x, 0.8, z));
      posts.push({ from: [x, 0, z], to: [x, 0.85, z], radius: 0.04 });
    }
    return { rails, ties, fence, posts };
  }, []);
  const platformX = KIDDIE.cx - KIDDIE.a - 1.1;
  return (
    <group>
      {/* the ground: a dark plaza under the loop, a lawn inside it */}
      <mesh
        position={[KIDDIE.cx, 0.002, KIDDIE.cz]}
        rotation-x={-Math.PI / 2}
        scale={[KIDDIE.a + 3.4, KIDDIE.b + 3.4, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#2a1648" roughness={0.95} />
      </mesh>
      <mesh
        position={[KIDDIE.cx, 0.01, KIDDIE.cz]}
        rotation-x={-Math.PI / 2}
        scale={[KIDDIE.a - 1.3, KIDDIE.b - 1.3, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#1c5a52" roughness={0.95} />
      </mesh>
      {parts.rails.map((g, i) => (
        <mesh key={i} geometry={g} material={RAIL} />
      ))}
      <Boxes items={parts.ties} />
      <Segments items={parts.posts} />
      <Neon points={parts.fence} color="#ff6ac8" k={3} radius={0.03} closed />
      {/* the station: a low platform and a striped roof on four posts */}
      <mesh position={[platformX, 0.12, KIDDIE.cz]}>
        <boxGeometry args={[0.9, 0.24, 7]} />
        <meshStandardMaterial color="#ffd84f" roughness={0.7} />
      </mesh>
      <mesh position={[platformX - 0.1, 2.75, KIDDIE.cz]}>
        <boxGeometry args={[1.9, 0.14, 7.6]} />
        <meshStandardMaterial
          color="#ff2f9a"
          emissive="#ff2f9a"
          emissiveIntensity={0.35}
        />
      </mesh>
      {[-3.2, 3.2].flatMap((dz) =>
        [-0.8, 0.45].map((dx) => (
          <mesh
            key={`${dz}${dx}`}
            position={[platformX + dx, 1.4, KIDDIE.cz + dz]}
          >
            <cylinderGeometry args={[0.06, 0.06, 2.7, 6]} />
            <meshStandardMaterial color="#e8f6ff" metalness={0.5} />
          </mesh>
        )),
      )}
      <NeonText
        text="KIDDIE EXPRESS"
        color="#3fe0d0"
        font={MARQUEE}
        width={4.4}
        k={3}
        position={[platformX - 1.16, 2.75, KIDDIE.cz]}
        rotation-y={-Math.PI / 2}
      />
      <Cars url="/models/fair/kiddie-engine.glb" indexes={[0]} />
      <Cars url="/models/fair/kiddie-tender.glb" indexes={[1]} />
      <Cars
        url="/models/fair/kiddie-wagon.glb"
        indexes={[2, 3]}
        tints={WAGON_TINTS}
      />
    </group>
  );
}

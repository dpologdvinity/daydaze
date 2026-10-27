// Seaside Swim's wildlife (src/game/openWater.ts): schools of fish circling
// under the swimmers, a dolphin pod leaping offshore, gulls on the sand and
// wheeling overhead, crabs scuttling along the waterline. All creature paths
// are pure functions of time; none allocate inside a frame.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  CRABS,
  DOLPHINS,
  FLYING_GULLS,
  GULLS,
  SCHOOLS,
  type School,
} from "../../../game/openWater.ts";
import { Creature, type CreaturePose } from "../../creatures/Creature.tsx";
import { SwimmingCreature } from "../../creatures/Swimmer.tsx";
import { useReducedMotion } from "../../motion.ts";

const GULLS_URL = "/models/ocean/gulls.glb";

function Fish({ school, i }: { school: School; i: number }): JSX.Element {
  const path = useMemo(
    () => (t: number, pose: CreaturePose) => {
      const a = t * 0.6 + (i / school.count) * Math.PI * 2;
      const r = school.radius * (1 + 0.15 * Math.sin(t * 0.5 + i));
      pose.x = school.at[0] + Math.cos(a) * r;
      pose.z = school.at[1] + Math.sin(a) * r;
      pose.y = -school.below + Math.sin(t * 0.9 + i * 2) * 0.12;
      pose.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    },
    [school, i],
  );
  return <SwimmingCreature kind={school.kind} path={path} />;
}

function Dolphin({
  center,
  radius,
  phase,
}: (typeof DOLPHINS)[number]): JSX.Element {
  const path = useMemo(
    () => (t: number, pose: CreaturePose) => {
      const a = t * 0.32 + phase;
      pose.x = center[0] + Math.cos(a) * radius;
      pose.z = center[1] + Math.sin(a) * radius;
      // a breath's leap every lap: up out of the water and back in
      const leap = Math.sin(t * 1.4 + phase * 2);
      pose.y = leap > 0.2 ? (leap - 0.2) * 1.8 - 0.4 : -0.6 + leap * 0.5;
      pose.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    },
    [center, radius, phase],
  );
  return <SwimmingCreature kind="dolphin" path={path} scale={1.1} />;
}

function Crab({ at, i }: { at: readonly [number, number]; i: number }) {
  return (
    <Creature
      kind="crab"
      drive={(_, pose) => {
        const t = performance.now() / 1000 + i * 9;
        // scuttle sideways along the sand a few meters, pausing at each end
        const k = Math.sin(t * 0.35);
        pose.x = at[0] + k * 2.2;
        pose.z = at[1];
        pose.y = 0;
        pose.yaw = Math.cos(t * 0.35) > 0 ? Math.PI / 2 : -Math.PI / 2;
        pose.clip = Math.abs(Math.cos(t * 0.35)) > 0.25 ? "walk" : "idle";
      }}
    />
  );
}

function useGull(name: string): THREE.Mesh | null {
  const gltf = useGLTF(GULLS_URL);
  return useMemo(() => {
    let found: THREE.Mesh | null = null;
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === name) found = o;
    });
    return found;
  }, [gltf, name]);
}

function PerchedGulls(): JSX.Element | null {
  const gull = useGull("gull");
  if (!gull) return null;
  return (
    <>
      {GULLS.map((g, i) => (
        <mesh
          key={i}
          geometry={gull.geometry}
          material={gull.material}
          position={[g.at[0], 0.02, g.at[1]]}
          rotation-y={g.yaw}
          scale={0.75}
        />
      ))}
    </>
  );
}

function FlyingGull({
  center,
  radius,
  i,
}: (typeof FLYING_GULLS)[number] & { i: number }): JSX.Element | null {
  const gull = useGull("gull-fly");
  const calm = useReducedMotion();
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = (calm ? 0 : clock.elapsedTime) * 0.35 + i * 2.4;
    g.position.set(
      center[0] + Math.cos(t) * radius,
      6.5 + Math.sin(t * 2.1) * 0.6,
      center[1] + Math.sin(t) * radius,
    );
    g.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t)) + Math.PI / 2;
    // a wing-beat as a roll, and the bank into the turn
    g.rotation.z = Math.sin(clock.elapsedTime * 5 + i) * 0.18 - 0.25;
  });
  if (!gull) return null;
  return (
    <group ref={group}>
      <mesh geometry={gull.geometry} material={gull.material} scale={1.1} />
    </group>
  );
}

/** Everything alive at Seaside Swim. */
export function SeaLife(): JSX.Element {
  return (
    <>
      {SCHOOLS.flatMap((school, si) =>
        Array.from({ length: school.count }, (_, i) => (
          <Fish key={`${si}-${i}`} school={school} i={i} />
        )),
      )}
      {DOLPHINS.map((d, i) => (
        <Dolphin key={i} {...d} />
      ))}
      {CRABS.map((at, i) => (
        <Crab key={i} at={at} i={i} />
      ))}
      <PerchedGulls />
      {FLYING_GULLS.map((g, i) => (
        <FlyingGull key={i} {...g} i={i} />
      ))}
    </>
  );
}

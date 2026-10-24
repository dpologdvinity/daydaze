// The Speedway's bumper-car arena: a glowing floor with a neon grid,
// neon-topped walls, a dark beam-and-pole ceiling and falling sparks. Solid and
// glowing boxes are one draw call each; the sparks are one instanced mesh.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ARENA } from "../../../game/speedway/bumper.ts";
import { ARENA_ORIGIN } from "../../../game/speedway/layout.ts";
import { Boxes } from "./Boxes.tsx";
import { seeded } from "./canvasTextures.ts";
import { NEON, neonCycle } from "./neon.ts";
import { quadBoxes, type Box } from "./strips.ts";

const CEILING = 8.5;
const DARK = new THREE.Color("#15122b");
const WALL = new THREE.Color("#1a1530");
const BEAM = 0.14;
const SPARKS = 48;
const SPARK_COLORS = [NEON.gold, NEON.pink, NEON.cyan];

/** A glowing floor with neon grid lines, neon-topped walls and a pole grid ceiling with sparks. */
export function BumperArena() {
  const parts = useMemo(() => {
    const [w, d] = ARENA.size;
    const grid: Box[] = [];
    for (let x = -w / 2 + 3; x < w / 2; x += 4) {
      grid.push({
        x,
        y: 0.02,
        z: 0,
        yaw: 0,
        length: 0.08,
        height: 0.02,
        depth: d,
        color: NEON.cyan,
      });
    }
    for (let z = -d / 2 + 2; z < d / 2; z += 4) {
      grid.push({
        x: 0,
        y: 0.02,
        z,
        yaw: 0,
        length: w,
        height: 0.02,
        depth: 0.08,
        color: NEON.pink,
      });
    }
    // the ceiling: beams one way and the other, and poles up the walls
    const ceiling: Box[] = [];
    for (let x = -w / 2; x <= w / 2; x += 4) {
      ceiling.push({
        x,
        y: CEILING,
        z: 0,
        yaw: 0,
        length: BEAM,
        height: BEAM,
        depth: d,
        color: undefined,
      });
    }
    for (let z = -d / 2; z <= d / 2; z += 4) {
      ceiling.push({
        x: 0,
        y: CEILING,
        z,
        yaw: 0,
        length: w,
        height: BEAM,
        depth: BEAM,
        color: undefined,
      });
    }
    const poles: Box[] = [];
    const along = (x0: number, z0: number, x1: number, z1: number) => {
      const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 4));
      for (let s = 0; s <= steps; s++) {
        poles.push({
          x: x0 + ((x1 - x0) * s) / steps,
          y: 0,
          z: z0 + ((z1 - z0) * s) / steps,
          yaw: 0,
          length: BEAM,
          height: CEILING,
          depth: BEAM,
          color: undefined,
        });
      }
    };
    along(-w / 2, -d / 2, w / 2, -d / 2);
    along(-w / 2, d / 2, w / 2, d / 2);
    along(-w / 2, -d / 2, -w / 2, d / 2);
    along(w / 2, -d / 2, w / 2, d / 2);
    // solid boxes share one draw call, so each one carries its color
    const solid = [
      ...ceiling.map((b) => ({ ...b, color: DARK })),
      ...poles.map((b) => ({ ...b, color: DARK })),
      ...quadBoxes(ARENA.walls, 0, 1.0, () => WALL),
    ];
    const glow = [...grid, ...quadBoxes(ARENA.walls, 1.0, 0.12, neonCycle)];
    return { solid, glow };
  }, []);
  const [w, d] = ARENA.size;
  return (
    <group position={[ARENA_ORIGIN[0], 0, ARENA_ORIGIN[1]]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color="#1d0b3a"
          emissive="#6a22ff"
          emissiveIntensity={0.7}
          roughness={0.5}
        />
      </mesh>
      <Boxes boxes={parts.solid} />
      <Boxes boxes={parts.glow} glow />
      <Sparks />
    </group>
  );
}

/**
 * Falling sparks from the ceiling beams. The matrices are rewritten each frame
 * in preallocated buffers; nothing is created inside the frame loop.
 */
function Sparks() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [w, d] = ARENA.size;
  const motion = useMemo(() => {
    const rand = seeded(91);
    const x = new Float32Array(SPARKS);
    const z = new Float32Array(SPARKS);
    const phase = new Float32Array(SPARKS);
    const speed = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i++) {
      x[i] = (rand() - 0.5) * (w - 1);
      z[i] = (rand() - 0.5) * (d - 1);
      phase[i] = rand();
      speed[i] = 0.25 + rand() * 0.35;
    }
    return { x, z, phase, speed, dummy: new THREE.Object3D() };
  }, [w, d]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < SPARKS; i++) {
      m.setColorAt(i, SPARK_COLORS[i % SPARK_COLORS.length]);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const { x, z, phase, speed, dummy } = motion;
    for (let i = 0; i < SPARKS; i++) {
      // each spark falls from the ceiling, loops, and flickers as it goes
      const fall = (phase[i] + t * speed[i]) % 1;
      dummy.position.set(x[i], CEILING - fall * (CEILING - 0.3), z[i]);
      dummy.scale.setScalar(0.5 + 0.5 * Math.abs(Math.sin(t * 17 + i)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, SPARKS]}
      frustumCulled={false}
    >
      <octahedronGeometry args={[0.12, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

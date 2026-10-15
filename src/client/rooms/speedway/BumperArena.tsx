import { useMemo } from "react";
import { ARENA } from "../../../game/speedway/bumper.ts";
import { ARENA_ORIGIN } from "../../../game/speedway/layout.ts";
import { Boxes } from "./Boxes.tsx";
import { NEON, neonCycle } from "./neon.ts";
import { quadBoxes, type Box } from "./strips.ts";

/** A glowing floor with neon grid lines, and neon-topped walls. */
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
    return {
      grid,
      walls: quadBoxes(ARENA.walls, 0, 1.0),
      neon: quadBoxes(ARENA.walls, 1.0, 0.12, neonCycle),
    };
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
      <Boxes boxes={parts.grid} glow />
      <Boxes boxes={parts.walls} color="#1a1530" />
      <Boxes boxes={parts.neon} glow />
    </group>
  );
}

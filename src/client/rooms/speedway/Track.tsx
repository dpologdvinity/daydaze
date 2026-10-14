import { useMemo } from "react";
import * as THREE from "three";
import { trackWalls, type Track } from "../../../game/speedway/track.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { quadBoxes, quadsGeometry, strips } from "./strips.ts";
import { neonCycle, NEON } from "./neon.ts";

const BARRIER_HEIGHT = 1.1;
const KERB = 0.8;

/**
 * A race track at `origin`: asphalt, kerbs striped in red and white, solid
 * barriers, and neon strips along each barrier top.
 */
export function RaceTrack({ track, origin }: { track: Track; origin: Vec2 }) {
  const parts = useMemo(() => {
    const half = track.width / 2;
    const line = track.centerline;
    const walls = trackWalls(track);
    return {
      road: quadsGeometry(
        [...strips(line, 1, 0, half), ...strips(line, -1, 0, half)],
        0.01,
      ),
      kerbs: quadBoxes(
        [
          ...strips(line, 1, half - KERB, half),
          ...strips(line, -1, half - KERB, half),
        ],
        0.02,
        0.06,
        (i) => (i % 2 ? NEON.red : NEON.white),
      ),
      barriers: quadBoxes(walls, 0, BARRIER_HEIGHT),
      neon: quadBoxes(walls, BARRIER_HEIGHT, 0.12, neonCycle),
    };
  }, [track]);
  return (
    <group position={[origin[0], 0, origin[1]]}>
      <mesh geometry={parts.road}>
        <meshStandardMaterial
          color="#1b1830"
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Boxes boxes={parts.kerbs} glow />
      <Boxes boxes={parts.barriers} color="#1a1530" />
      <Boxes boxes={parts.neon} glow />
    </group>
  );
}

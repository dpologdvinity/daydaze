// A Speedway race track mesh: asphalt road with painted lines, red and white
// kerbs, barriers with neon tops, and tyre walls found by measuring how sharply
// the centerline bends. Built once per track.

import { useMemo } from "react";
import * as THREE from "three";
import { trackWalls, type Track } from "../../../game/speedway/track.ts";
import type { Vec2 } from "../../../game/walk.ts";
import { Boxes } from "./Boxes.tsx";
import { useCanvasTexture } from "./canvasTextures.ts";
import { neonCycle, NEON } from "./neon.ts";
import { offsetAt, quadBoxes, ribbonGeometry, strips } from "./strips.ts";
import { Tyres, type Tyre } from "./Tyres.tsx";
import { asphaltPaint } from "./speedwayArt.ts";

const BARRIER_HEIGHT = 1.1;
const ROAD = new THREE.Color("#3a3560");
const PAINT = new THREE.Color("#e9e4ff");
const KERB = 0.8;
// Turn over five points, in radians, that counts as a corner for tyre walls.
const CORNER_TURN = 0.3;
// Points between tyre stacks along a corner.
const STACK_EVERY = 3;

/** Heading change at point `i`, signed: positive bends towards the left normal. */
function turnAt(pts: readonly Vec2[], i: number): number {
  const n = pts.length;
  const a = pts[(i - 1 + n) % n];
  const b = pts[i % n];
  const c = pts[(i + 1) % n];
  const ax = b[0] - a[0];
  const az = b[1] - a[1];
  const bx = c[0] - b[0];
  const bz = c[1] - b[1];
  return Math.atan2(ax * bz - az * bx, ax * bx + az * bz);
}

/**
 * Tyre walls on the outside of each corner: a stack of two flat tyres just past
 * the barrier, every few points round the bend.
 */
function tyreWalls(track: Track): Tyre[] {
  const pts = track.centerline;
  const reach = track.width / 2 + 3.4;
  const out: Tyre[] = [];
  for (let i = 0; i < pts.length; i += STACK_EVERY) {
    let bend = 0;
    for (let k = -2; k <= 2; k++) bend += turnAt(pts, i + k + pts.length);
    if (Math.abs(bend) < CORNER_TURN) continue;
    // the outer side of a bend is the side the centerline bends away from
    const side = bend > 0 ? -1 : 1;
    const [x, z] = offsetAt(pts, i, side * reach);
    out.push({ at: [x, z], y: 0.16 }, { at: [x, z], y: 0.48 });
  }
  return out;
}

/**
 * A race track at `origin`: grained asphalt with white edge and dashed center
 * lines, kerbs striped in red and white, solid barriers with neon along their
 * tops, and tyre walls on the outside of the corners. Road and glow are one
 * draw call each.
 */
export function RaceTrack({ track, origin }: { track: Track; origin: Vec2 }) {
  const asphalt = useCanvasTexture("asphalt", 256, 256, asphaltPaint, true);
  const parts = useMemo(() => {
    const half = track.width / 2;
    const line = track.centerline;
    const walls = trackWalls(track);
    const inner = half - KERB;
    const bank = track.banking ?? 0;

    // Banking height for any track point: raises outer edge in turns
    const bankAt = (p: Vec2, base: number) => {
      if (bank <= 0) return base;
      const corner = Math.min(1, Math.max(0, (Math.abs(p[0]) - 50) / 25));
      if (corner <= 0) return base;
      const turnCenter = p[0] > 0 ? 60 : -60;
      const rad = Math.hypot(p[0] - turnCenter, p[1]);
      const outerShare = Math.min(
        1,
        Math.max(0, (rad - (40 - half)) / track.width),
      );
      return base + outerShare * Math.sin(bank) * track.width * corner;
    };

    // dashed center line: three segments on, three off
    const dashes = strips(line, 1, -0.12, 0.12).filter((_, i) => i % 6 < 3);
    const edges = [
      ...strips(line, 1, inner - 0.2, inner - 0.12),
      ...strips(line, -1, inner - 0.2, inner - 0.12),
    ];
    const kerbs = [
      ...strips(line, 1, inner, half),
      ...strips(line, -1, inner, half),
    ];
    return {
      road: ribbonGeometry([
        {
          quads: [...strips(line, 1, 0, half), ...strips(line, -1, 0, half)],
          y: (p) => bankAt(p, 0.01),
          colorOf: () => ROAD,
        },
        {
          quads: [...dashes, ...edges],
          y: (p) => bankAt(p, 0.014),
          colorOf: () => PAINT,
        },
      ]),
      // kerbs on the ground and neon on the barrier tops share one glow draw
      glow: ribbonGeometry([
        {
          quads: kerbs,
          y: (p) => bankAt(p, 0.02),
          colorOf: (i) => (i % 2 ? NEON.red : NEON.white),
        },
        {
          quads: walls,
          y: (p) => bankAt(p, BARRIER_HEIGHT),
          colorOf: neonCycle,
        },
      ]),
      barriers: quadBoxes(walls, 0, BARRIER_HEIGHT).map((b) => ({
        ...b,
        y: bankAt([b.x, b.z], b.y),
      })),
      tyres: tyreWalls(track).map((t) => ({
        ...t,
        y: bankAt(t.at, t.y),
      })),
    };
  }, [track]);
  return (
    <group position={[origin[0], 0, origin[1]]}>
      <mesh geometry={parts.road}>
        <meshStandardMaterial
          vertexColors
          map={asphalt}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={parts.glow}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <Boxes boxes={parts.barriers} color="#1a1530" />
      <Tyres tyres={parts.tyres} />
    </group>
  );
}

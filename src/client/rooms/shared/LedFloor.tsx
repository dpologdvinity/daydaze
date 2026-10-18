import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";

/** Tiles are split into four phase groups; each group peaks a quarter beat after the last. */
const GROUPS = 4;
/** 120 beats a minute. */
const BEATS_PER_SECOND = 2;
const TILE = 0.62;
const TILE_GEO = new THREE.PlaneGeometry(TILE * 0.9, TILE * 0.9);
TILE_GEO.rotateX(-Math.PI / 2);

/** The tiles on a checkerboard of four phase groups, as floor positions. */
function tilesOf(
  group: number,
  center: readonly [number, number],
  cols: number,
  rows: number,
): [number, number][] {
  const tiles: [number, number][] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if ((r + c) % GROUPS !== group) continue;
      tiles.push([
        center[0] + (c - (cols - 1) / 2) * TILE,
        center[1] + (r - (rows - 1) / 2) * TILE,
      ]);
    }
  return tiles;
}

/**
 * One phase group of LED tiles. Its brightness is a single material color
 * that moves every frame, so the whole floor costs four draw calls.
 */
function LedGroup({
  group,
  color,
  center,
  cols,
  rows,
}: {
  group: number;
  color: string;
  center: readonly [number, number];
  cols: number;
  rows: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const calm = useReducedMotion();
  const base = useMemo(() => new THREE.Color(color), [color]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    [],
  );
  const tiles = useMemo(
    () => tilesOf(group, center, cols, rows),
    [group, center, cols, rows],
  );
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    tiles.forEach(([x, z], i) => {
      o.position.set(x, 0.012, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [tiles]);
  useFrame(({ clock }) => {
    // a calm floor holds at a middling glow; motion makes the beat
    const beat = calm
      ? 0.5
      : 0.5 +
        0.5 *
          Math.cos(
            2 *
              Math.PI *
              (clock.elapsedTime * BEATS_PER_SECOND - group / GROUPS),
          );
    // HDR multiplier so the bright tiles bloom
    mat.color.copy(base).multiplyScalar(0.3 + 1.3 * beat ** 4);
  });
  return <instancedMesh ref={ref} args={[TILE_GEO, mat, tiles.length]} />;
}

/**
 * A grid of glowing LED tiles on the floor, pulsing on the beat. `colors`
 * gives the four phase groups their colors.
 */
export function LedFloor({
  center,
  cols = 8,
  rows = 6,
  colors,
}: {
  center: readonly [number, number];
  cols?: number;
  rows?: number;
  colors: readonly [string, string, string, string];
}) {
  return (
    <group>
      {colors.map((color, g) => (
        <LedGroup
          key={g}
          group={g}
          color={color}
          center={center}
          cols={cols}
          rows={rows}
        />
      ))}
    </group>
  );
}

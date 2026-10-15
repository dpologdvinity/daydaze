import * as THREE from "three";
import type { Vec2 } from "../../../game/walk.ts";

/** One instanced box: its base centre, heading, and size in metres. */
export type Box = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  length: number;
  height: number;
  depth: number;
  color?: THREE.Color;
};

/** Point `d` metres left of centreline point `i` (negative is right). */
function offsetAt(pts: readonly Vec2[], i: number, d: number): Vec2 {
  const n = pts.length;
  const a = pts[(i - 1 + n) % n];
  const b = pts[(i + 1) % n];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / len;
  const tz = (b[1] - a[1]) / len;
  return [pts[i][0] - tz * d, pts[i][1] + tx * d];
}

/** Quads along one side of a closed centreline, from `r0` to `r1` metres out. */
export function strips(
  pts: readonly Vec2[],
  side: 1 | -1,
  r0: number,
  r1: number,
): Vec2[][] {
  return pts.map((_, i) => {
    const j = (i + 1) % pts.length;
    return [
      offsetAt(pts, i, side * r0),
      offsetAt(pts, j, side * r0),
      offsetAt(pts, j, side * r1),
      offsetAt(pts, i, side * r1),
    ];
  });
}

/** One box per quad, lying along its first edge and standing `depth` across. */
export function quadBoxes(
  quads: readonly (readonly Vec2[])[],
  y: number,
  height: number,
  colorOf?: (i: number) => THREE.Color,
): Box[] {
  return quads.map((q, i) => {
    const [v0, v1, , v3] = q;
    const dx = v1[0] - v0[0];
    const dz = v1[1] - v0[1];
    return {
      x: (v0[0] + v1[0] + q[2][0] + v3[0]) / 4,
      y,
      z: (v0[1] + v1[1] + q[2][1] + v3[1]) / 4,
      yaw: Math.atan2(-dz, dx),
      length: Math.hypot(dx, dz),
      height,
      depth: Math.hypot(v3[0] - v0[0], v3[1] - v0[1]),
      color: colorOf?.(i),
    };
  });
}

/** A flat, double-sided mesh of the quads, at height `y`. */
export function quadsGeometry(
  quads: readonly (readonly Vec2[])[],
  y = 0,
): THREE.BufferGeometry {
  const positions = new Float32Array(quads.length * 18);
  let k = 0;
  const put = (p: Vec2) => {
    positions[k++] = p[0];
    positions[k++] = y;
    positions[k++] = p[1];
  };
  for (const [a, b, c, d] of quads) {
    put(a);
    put(b);
    put(c);
    put(a);
    put(c);
    put(d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Merged geometry for the amusement park: gondolas, coaster cars, flume logs,
// carousel horses and poles, plus the rails, ties, trough and lattice towers
// built from the tracks in src/game/amusementPark.ts. Gotcha: `merged` applies
// each part's matrix to its geometry in place, so always pass a fresh geometry
// per part.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  COASTER_CONTROLS,
  COASTER_TRACK,
  FLUME_CONTROLS,
  STARLIGHT_CONTROLS,
  STARLIGHT_TRACK,
  type Track,
  FERRIS,
  trackPose,
  type Vec3,
} from "../../../game/amusementPark.ts";
import type { Box, Segment } from "./Instanced.tsx";

const ORIGIN: Vec3 = [0, 0, 0];
const ONE: Vec3 = [1, 1, 1];
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

/** A unit primitive, scaled, turned and moved into place before merging. */
export type Part = {
  g: THREE.BufferGeometry;
  size?: Vec3;
  rot?: Vec3;
  at?: Vec3;
};

/** One geometry from many parts, so each material costs a single draw call. */
export function merged(parts: readonly Part[]): THREE.BufferGeometry {
  const list = parts.map(({ g, size = ONE, rot = ORIGIN, at = ORIGIN }) =>
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
        new THREE.Vector3(...size),
      ),
    ),
  );
  const out = mergeGeometries(list);
  if (!out) throw new Error("amusement park parts do not merge");
  return out;
}

/** A fresh 1 by 1 by 1 box, for scaling with a Part's `size`. */
export const cube = () => new THREE.BoxGeometry(1, 1, 1);
/** A fresh unit cylinder (radius 1, height 1) with `sides` around. */
export const cylinder = (sides: number) =>
  new THREE.CylinderGeometry(1, 1, 1, sides);
/** A fresh unit sphere with `w` by `h` segments. */
export const ball = (w: number, h: number) => new THREE.SphereGeometry(1, w, h);

// Gondola parts in the cabin's own frame. The origin is the rim point it hangs
// from, and the gondola never turns, so each part is a translated copy.

/** Six-spoke lattice in the rim frame: radial spokes, an inner ring and zigzag bracing. */
export function rimLattice(radius: number): Segment[] {
  const SPOKES = 12;
  const inner = radius * 0.42;
  const at = (a: number, r: number): Vec3 => [
    Math.cos(a) * r,
    Math.sin(a) * r,
    0,
  ];
  const out: Segment[] = [];
  for (let k = 0; k < SPOKES; k++) {
    const a = (k / SPOKES) * TAU;
    const next = a + TAU / SPOKES;
    const mid = a + TAU / (2 * SPOKES);
    out.push({ from: [0, 0, 0], to: at(a, radius), radius: 0.03 });
    out.push({ from: at(a, inner), to: at(next, inner), radius: 0.025 });
    out.push({ from: at(a, inner), to: at(mid, radius), radius: 0.02 });
    out.push({ from: at(mid, radius), to: at(next, inner), radius: 0.02 });
  }
  return out;
}

/** A ring of bulbs just outside the rim, in the rim frame. */
export function rimBulbs(radius: number): Vec3[] {
  return Array.from({ length: 24 }, (_, i): Vec3 => {
    const a = (i / 24) * TAU;
    return [Math.cos(a) * (radius + 0.08), Math.sin(a) * (radius + 0.08), 0];
  });
}

/** The A-frame legs with a cross brace at mid height. */
export const FERRIS_FRAME: readonly Segment[] = (() => {
  const [hx, hy, hz] = FERRIS.hub;
  return [
    { from: [hx - 2.4, 0, hz], to: [hx, hy, hz], radius: 0.12 },
    { from: [hx + 2.4, 0, hz], to: [hx, hy, hz], radius: 0.12 },
    { from: [hx - 2.4, 0, hz], to: [hx - 0.9, 0, hz], radius: 0.1 },
    { from: [hx + 2.4, 0, hz], to: [hx + 0.9, 0, hz], radius: 0.1 },
    { from: [hx - 1.2, hy / 2, hz], to: [hx + 1.2, hy / 2, hz], radius: 0.06 },
  ];
})();

/** A square lattice tower from the ground to (x, y, z), four legs with bays and diagonals. */
export function latticeTower(x: number, y: number, z: number): Segment[] {
  const BAYS = 3;
  const half = 0.35;
  const corners: Vec3[] = [
    [x - half, 0, z - half],
    [x + half, 0, z - half],
    [x + half, 0, z + half],
    [x - half, 0, z + half],
  ];
  const top = (c: Vec3, h: number): Vec3 => [c[0], h, c[2]];
  const out: Segment[] = corners.map((c) => ({
    from: c,
    to: top(c, y),
    radius: 0.05,
  }));
  for (let b = 1; b <= BAYS; b++) {
    const h = (y * b) / BAYS;
    corners.forEach((c, i) => {
      out.push({
        from: top(c, h),
        to: top(corners[(i + 1) % 4], h),
        radius: 0.03,
      });
    });
  }
  for (let b = 0; b < BAYS; b++) {
    const h0 = (y * b) / BAYS;
    const h1 = (y * (b + 1)) / BAYS;
    corners.forEach((c, i) => {
      out.push({
        from: top(c, h0),
        to: top(corners[(i + 1) % 4], h1),
        radius: 0.025,
      });
    });
  }
  return out;
}

// Coasters: the neon line is the track; rails, ties and towers are built here.
export type CoasterParts = {
  curve: THREE.CatmullRomCurve3;
  rails: THREE.BufferGeometry;
  ties: readonly Box[];
  supports: readonly Segment[];
};

/** Rails, ties and lattice towers for the closed track through `controls`. */
export function coasterParts(
  controls: readonly Vec3[],
  track: Track,
  tieCount = 64,
): CoasterParts {
  const curve = new THREE.CatmullRomCurve3(
    controls.map((p) => new THREE.Vector3(...p)),
    true,
    "catmullrom",
    0.5,
  );
  const N = 240;
  // two steel rails either side of the neon line, a little below it
  const rails = [-0.5, 0.5].map((offset) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const side = new THREE.Vector3()
        .crossVectors(curve.getTangentAt(t), UP)
        .normalize()
        .multiplyScalar(offset);
      pts.push(
        curve
          .getPointAt(t)
          .add(side)
          .add(new THREE.Vector3(0, -0.1, 0)),
      );
    }
    return {
      g: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts, true),
        N,
        0.035,
        5,
        true,
      ),
    };
  });
  // wooden-looking sleepers under the rails, evenly spaced along the loop
  const ties = Array.from({ length: tieCount }, (_, i): Box => {
    const p = trackPose(track, (i / tieCount) * track.length);
    return {
      position: [p.x, p.y - 0.12, p.z],
      size: [1.1, 0.05, 0.14],
      yaw: p.yaw,
      color: "#4a2d5c",
    };
  });
  // a lattice tower under every raised control point
  const supports = controls
    .filter(([, y]) => y > 2.5)
    .flatMap(([x, y, z]) => latticeTower(x, y, z));
  return { curve, rails: merged(rails), ties, supports };
}

/** An open trough along `curve`: a floor `width` wide and two walls `wall`
 * high, the water line at the floor's top. One strip of quads per side. */
export function trough(
  curve: THREE.CatmullRomCurve3,
  width: number,
  wall: number,
  segments: number,
): THREE.BufferGeometry {
  // the cross-section, left to right: wall top, wall foot, floor, wall foot, wall top
  const h = width / 2;
  const section: [number, number][] = [
    [-h, wall],
    [-h, -0.15],
    [h, -0.15],
    [h, wall],
  ];
  const pos: number[] = [];
  const idx: number[] = [];
  const side = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = (i % segments) / segments;
    const p = curve.getPointAt(t);
    side.crossVectors(curve.getTangentAt(t), UP).normalize();
    for (const [x, y] of section) {
      pos.push(p.x + side.x * x, p.y + y, p.z + side.z * x);
    }
  }
  const n = section.length;
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < n - 1; k++) {
      const a = i * n + k;
      const b = (i + 1) * n + k;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The flume: its trough (drawn as the "rails") on lattice towers, no ties. */
export function flumeParts(controls: readonly Vec3[]): CoasterParts {
  const curve = new THREE.CatmullRomCurve3(
    controls.map((p) => new THREE.Vector3(...p)),
    true,
    "catmullrom",
    0.5,
  );
  return {
    curve,
    rails: trough(curve, 1.5, 0.45, 360),
    ties: [],
    supports: controls
      .filter(([, y]) => y > 2.5)
      .flatMap(([x, y, z]) => latticeTower(x, y - 0.2, z)),
  };
}

/** Built parts for the Comet, the midway coaster. */
export const COMET = coasterParts(COASTER_CONTROLS, COASTER_TRACK);
/** Built parts for the log flume: trough and towers, no ties. */
export const FLUME = flumeParts(FLUME_CONTROLS);
/** Built parts for the Starlight hyper coaster, with 120 ties. */
export const STARLIGHT = coasterParts(STARLIGHT_CONTROLS, STARLIGHT_TRACK, 120);

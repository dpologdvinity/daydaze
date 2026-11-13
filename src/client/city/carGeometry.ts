import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The jeepney's procedural geometry for the instanced traffic (Traffic.tsx).
 * Cars are the downloaded bodies now (src/game/driving/bodies.ts).
 */

// ---------------------------------------------------------------- jeepneys

/** A box in meters, from its min to its max corner, unindexed for merging. */
function slab(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
) {
  return new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
    .translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    .toNonIndexed();
}

/** Both sides of the jeepney: the same box at +z and mirrored to -z. */
function pair(x0: number, y0: number, z0: number, x1: number, y1: number) {
  return [
    slab(x0, y0, z0, x1, y1, z0 + 0.06),
    slab(x0, y0, -z0 - 0.06, x1, y1, -z0),
  ];
}

/** A side profile in meters, extruded to `width` and centered across it. */
function extrudeSide(points: [number, number][], width: number) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  return new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    curveSegments: 1,
  }).translate(0, 0, -width / 2);
}

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

/** A rearing horse in profile, for the bonnet: nose at +x, hooves at y 0. */
function horse() {
  const shape = new THREE.Shape(
    (
      [
        [-0.1, 0],
        [-0.06, 0.12],
        [-0.1, 0.16],
        [-0.04, 0.2],
        [0.04, 0.3],
        [0.1, 0.34],
        [0.13, 0.31],
        [0.08, 0.26],
        [0.1, 0.2],
        [0.14, 0.22],
        [0.12, 0.16],
        [0.05, 0.16],
        [0.0, 0.08],
        [0.02, 0],
      ] as const
    ).map(([x, y]) => new THREE.Vector2(x, y)),
  );
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: false,
  }).translate(0, 0, -0.02);
}

/**
 * Jeepney parts, full-size in meters with the nose at +x and the road at y 0:
 * 5.6 m long, the open passenger bay under a long flat roof behind a bonnet.
 * Each is merged into one geometry, so every jeepney part is one draw.
 */
const BODY_TOP = 1.2;
const ROOF = 2.3;

/** Painted shell: the body with its bonnet, the roof and its posts. */
export const JEEPNEY_SHELL = merge([
  extrudeSide(
    [
      [-2.8, 0.42],
      [2.75, 0.42],
      [2.75, 0.98],
      [2.55, 1.1],
      [1.25, 1.14],
      [1.25, BODY_TOP],
      [-2.8, BODY_TOP],
    ],
    1.9,
  ),
  slab(-2.95, ROOF, -1.0, 1.4, ROOF + 0.12, 1.0),
  // posts down both sides, open between them
  ...[-2.75, -1.6, -0.45, 0.7, 1.2].flatMap((x) =>
    pair(x - 0.05, BODY_TOP, 0.88, x + 0.05, ROOF),
  ),
]);

/** Contrast trim: two pinstripes down each side and the roof's edge. */
export const JEEPNEY_TRIM = merge([
  ...pair(-2.8, 0.74, 0.95, 2.6, 0.82),
  ...pair(-2.8, 1.0, 0.95, 1.25, 1.06),
  slab(-2.97, ROOF - 0.1, -1.02, 1.42, ROOF, 1.02),
]);

/** Chrome: grille and bars, bumpers, bonnet strip, two horses, roof rack. */
export const JEEPNEY_CHROME = merge([
  slab(2.73, 0.5, -0.5, 2.82, 1.0, 0.5),
  ...[-0.4, -0.2, 0, 0.2, 0.4].map((z) =>
    slab(2.8, 0.52, z - 0.03, 2.86, 0.98, z + 0.03),
  ),
  slab(2.82, 0.36, -1.0, 2.98, 0.52, 1.0),
  slab(-2.95, 0.4, -0.95, -2.8, 0.54, 0.95),
  slab(1.3, 1.1, -0.06, 2.6, 1.17, 0.06),
  horse().translate(2.45, 1.1, 0.4),
  horse().translate(2.45, 1.1, -0.4),
  // the rack: rails, cross bars and the posts they stand on
  ...[-0.85, 0.85].map((z) =>
    slab(-2.8, ROOF + 0.32, z - 0.03, 1.2, ROOF + 0.38, z + 0.03),
  ),
  ...[-2.7, -1.4, -0.1, 1.1].flatMap((x) => [
    slab(x - 0.03, ROOF + 0.32, -0.85, x + 0.03, ROOF + 0.38, 0.85),
    ...[-0.85, 0.85].map((z) =>
      slab(
        x - 0.025,
        ROOF + 0.12,
        z - 0.025,
        x + 0.025,
        ROOF + 0.32,
        z + 0.025,
      ),
    ),
  ]),
]);

/** Dark parts: the windscreen and the long benches inside the bay. */
export const JEEPNEY_DARK = merge([
  slab(1.2, BODY_TOP, -0.85, 1.26, ROOF, 0.85),
  slab(-2.7, BODY_TOP, 0.45, 0.9, BODY_TOP + 0.3, 0.85),
  slab(-2.7, BODY_TOP, -0.85, 0.9, BODY_TOP + 0.3, -0.45),
]);

/**
 * A jeepney's wheel at the origin, its axle along x (wheelPlacement.ts turns it
 * onto the car): a dark 12-sided tyre, a chrome rim a little wider than it, and
 * five dark spokes and a hub cap on each face, so a rolling wheel is seen to
 * roll. 132 triangles; vertex colors keep it one draw with the single wheel
 * material.
 */
export const JEEPNEY_WHEEL = (() => {
  const R = 0.36;
  const W = 0.26;
  const tint = (g: THREE.BufferGeometry, r: number, gr: number, b: number) => {
    const flat = g.index ? g.toNonIndexed() : g;
    const n = flat.getAttribute("position").count;
    const rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) rgb.set([r, gr, b], i * 3);
    flat.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
    return flat;
  };
  const parts: THREE.BufferGeometry[] = [
    tint(
      new THREE.CylinderGeometry(R, R, W, 12).rotateZ(Math.PI / 2),
      0.07,
      0.05,
      0.09,
    ),
    tint(
      new THREE.CylinderGeometry(R * 0.62, R * 0.62, W + 0.02, 12).rotateZ(
        Math.PI / 2,
      ),
      0.82,
      0.84,
      0.9,
    ),
  ];
  for (const face of [-1, 1]) {
    const x = face * (W / 2 + 0.012);
    for (let i = 0; i < 5; i++)
      parts.push(
        tint(
          // a spoke: a thin quad from the hub outward, turned about the axle
          new THREE.PlaneGeometry(0.06, R * 0.5)
            .rotateY((face * Math.PI) / 2)
            .translate(x, R * 0.3, 0)
            .applyMatrix4(
              new THREE.Matrix4().makeRotationX((i / 5) * Math.PI * 2),
            ),
          0.1,
          0.1,
          0.14,
        ),
      );
    parts.push(
      tint(
        new THREE.CircleGeometry(0.06, 8)
          .rotateY((face * Math.PI) / 2)
          .translate(x + face * 0.003, 0, 0),
        0.95,
        0.95,
        1,
      ),
    );
  }
  return merge(parts);
})();

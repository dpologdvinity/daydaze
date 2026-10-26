import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loftBody } from "../../game/driving/carBody.ts";

/**
 * Car shapes for the instanced city: unit-sized (-0.5..0.5 on every axis), so
 * instances scale them to a car's size, with the nose at +x. Lofted from side
 * profiles (src/game/driving/carBody.ts) at low resolution: rounded sides
 * that lean in toward the roof, a hundred cars still cheap to draw.
 */

function loftProfile(
  points: [number, number][],
  shape: { sections: number; ring: number; tumble: number; taper: number },
) {
  const { positions, indices } = loftBody(points, {
    length: 1,
    width: 1,
    round: 4,
    ...shape,
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(Array.from(indices));
  // the loft's nose is at +z; the city's cars point along +x
  g.rotateY(Math.PI / 2);
  // squash everything back into the unit cube
  g.computeBoundingBox();
  const box = g.boundingBox ?? new THREE.Box3();
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  g.translate(-mid.x, -mid.y, -mid.z);
  g.scale(1 / size.x, 1 / size.y, 1 / size.z);
  g.computeVertexNormals();
  return g;
}

/** Lower body: bumpers, a sloped bonnet and boot. */
export const CAR_BODY = loftProfile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, -0.05],
    [0.42, 0.35],
    [0.2, 0.5],
    [-0.3, 0.5],
    [-0.47, 0.3],
    [-0.5, 0.0],
  ],
  { sections: 6, ring: 8, tumble: 0.12, taper: 0.2 },
);

/** Cabin glass: raked windscreen and rear window. */
export const CAR_CABIN = loftProfile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.18, 0.5],
    [-0.32, 0.5],
  ],
  { sections: 4, ring: 6, tumble: 0.3, taper: 0.25 },
);

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

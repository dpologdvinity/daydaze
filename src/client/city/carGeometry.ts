import * as THREE from "three";

/**
 * Car shapes for the instanced city: unit-sized (-0.5..0.5 on every axis), so
 * instances scale them to a car's size, with the nose at +x. Extruded from
 * side profiles, so they read as cars rather than stacked boxes.
 */

function extrudeProfile(points: [number, number][]) {
  const shape = new THREE.Shape(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    // no bevel: a hundred parked cars share the low tier's triangle budget
    bevelEnabled: false,
    curveSegments: 1,
  });
  // centre the depth and squash everything back into the unit cube
  g.translate(0, 0, -0.5);
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
export const CAR_BODY = extrudeProfile(
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
);

/** Cabin glass: raked windscreen and rear window. */
export const CAR_CABIN = extrudeProfile(
  [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.18, 0.5],
    [-0.32, 0.5],
  ],
);

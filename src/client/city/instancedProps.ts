// Placing a downloaded model at a handful of spots as instanced meshes, for
// the park's dog yard and farmers market (a few of each prop: a fence, the
// stalls, produce piles). A thin layer over `partsOf` (CityFurniture.tsx):
// one InstancedMesh per model part with each spot's matrix written once, and
// an optional per-spot color for the parts whose material `tinted` picks
// (the stalls' awnings). The meshes own their materials, so the night's
// dimming (`dimMeshes`) never touches a shared one.

import * as THREE from "three";
import { partsOf } from "./CityFurniture.tsx";

/** Where one copy of a prop stands. */
export type PropSpot = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Uniform size, or per axis [x, y, z] (a fence panel stretched along its run). */
  scale: number | readonly [number, number, number];
  /** Tints the parts `tinted` accepts (multiplies the material's white). */
  color?: THREE.Color;
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/**
 * The instanced parts of `scene`, one copy at every spot. Parts whose
 * material `tinted` accepts are whitened and take the spot's color.
 */
export function propParts(
  scene: THREE.Object3D,
  spots: readonly PropSpot[],
  tinted?: (material: THREE.Material) => boolean,
): THREE.InstancedMesh[] {
  const parts = partsOf(scene, null, Math.max(1, spots.length));
  for (const mesh of parts) {
    const color =
      tinted?.(mesh.material as THREE.Material) === true &&
      mesh.material instanceof THREE.MeshStandardMaterial;
    if (color && mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.color.set("#ffffff");
      mesh.material.userData.base = mesh.material.color.clone();
    }
    spots.forEach((spot, i) => {
      q.setFromAxisAngle(up, spot.yaw);
      p.set(spot.x, spot.y, spot.z);
      if (typeof spot.scale === "number") s.setScalar(spot.scale);
      else s.set(...spot.scale);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (color && spot.color) mesh.setColorAt(i, spot.color);
    });
    mesh.count = spots.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return parts;
}

/**
 * A model's bounds, to size it by hand: its longest side and where its
 * lowest point is (the food props sit below their own origin).
 */
export function fitOf(scene: THREE.Object3D): {
  longest: number;
  floor: number;
  center: THREE.Vector3;
} {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  return {
    longest: Math.max(size.x, size.y, size.z, 1e-3),
    floor: box.min.y,
    center: box.getCenter(new THREE.Vector3()),
  };
}

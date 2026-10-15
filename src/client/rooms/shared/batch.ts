import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Pose = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

/**
 * Collects static pieces and merges them into one mesh per material, so a
 * room full of trim, brass and lacquer costs a handful of draw calls.
 * Build once in `useMemo`; the result renders through `<primitive>`.
 */
export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geometry: THREE.BufferGeometry, material: THREE.Material, pose?: Pose) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (pose) g.applyMatrix4(poseMatrix(pose));
    const list = this.parts.get(material) ?? [];
    list.push(g);
    this.parts.set(material, list);
    return this;
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    for (const [material, geoms] of this.parts) {
      const merged = mergeGeometries(geoms, false);
      if (!merged) throw new Error("Batch: geometries differ in attributes");
      group.add(new THREE.Mesh(merged, material));
    }
    return group;
  }
}

const scratch = new THREE.Object3D();

function poseMatrix({ position, rotation, scale = 1 }: Pose) {
  scratch.position.set(...(position ?? [0, 0, 0]));
  scratch.rotation.set(...(rotation ?? [0, 0, 0]));
  if (typeof scale === "number") scratch.scale.setScalar(scale);
  else scratch.scale.set(...scale);
  scratch.updateMatrix();
  return scratch.matrix;
}

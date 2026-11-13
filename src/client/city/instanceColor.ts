// Gives an instanced mesh an all-white `instanceColor`. A material with and
// without per-instance color are two different shader programs (three.js keys
// the program on USE_INSTANCING_COLOR), so city props that never tint and
// those that sometimes do used to compile twice. White leaves the picture
// unchanged and puts them all on the one program.
import * as THREE from "three";

/** `mesh` with a white instance color on every instance; returns it. */
export function whiteInstances<T extends THREE.InstancedMesh>(mesh: T): T {
  if (!mesh.instanceColor)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(mesh.instanceMatrix.count * 3).fill(1),
      3,
    );
  return mesh;
}

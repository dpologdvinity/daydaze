// Bake downloaded glTF node transforms without overflowing quantized positions.
import * as THREE from "three";

export function modelGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const geometry = mesh.geometry.clone();
  const source = geometry.getAttribute("position");
  // Meshopt glTF uses normalized integers; meter-sized writes would wrap them.
  const position = new THREE.Float32BufferAttribute(
    new Float32Array(source.count * 3),
    3,
  );
  for (let i = 0; i < source.count; i++)
    position.setXYZ(i, source.getX(i), source.getY(i), source.getZ(i));
  geometry.setAttribute("position", position);
  return geometry.applyMatrix4(mesh.matrixWorld);
}

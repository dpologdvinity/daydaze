// Teardown for the instanced layers drawn from downloaded models: each copies
// the model's geometry (and often its materials) per mount, so the copies and
// the instance buffers are freed when the layer unmounts (leaving the city or
// the zoo), not left on the GPU for every later visit.
import type * as THREE from "three";

/**
 * Frees instanced meshes built from a downloaded model (CityTrees,
 * CityFurniture, CityPark, NycFacades, the zoo's Scatter): the geometry each
 * copied, its instance buffers and, when `ownMaterials`, the material copies
 * it made. A shared material (drei's cached one, the bays') stays.
 */
export function disposeInstanced(
  meshes: readonly THREE.InstancedMesh[],
  ownMaterials: boolean,
) {
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    if (ownMaterials) [mesh.material].flat().forEach((m) => m.dispose());
    mesh.dispose();
  }
}

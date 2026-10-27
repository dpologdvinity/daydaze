// Kenney's Mini Characters, baked into static posed people by
// art/speedway/build_people.py (public/models/speedway/people-*.glb): one
// joined, textured mesh each, so a crowd of them is a few InstancedMeshes.

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/** Fans: four looks, standing with arms folded or cheering. */
export const FAN_MODELS = [
  "male-a-idle",
  "male-a-cheer",
  "female-c-idle",
  "female-c-cheer",
  "male-d-idle",
  "male-d-cheer",
  "female-a-idle",
  "female-a-cheer",
] as const;
export const CREW_MODEL = "male-b-crouch";

/** Kenney's characters are 0.67 m tall: this makes a person 1.7 m. */
export const PERSON_SCALE = 2.5;

const url = (name: string) => `/models/speedway/people-${name}.glb`;
for (const m of [...FAN_MODELS, CREW_MODEL]) useGLTF.preload(url(m));

/** The mesh and material of one baked person. */
export function usePerson(name: string): {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
} | null {
  const { scene } = useGLTF(url(name));
  return useMemo(() => {
    let found: {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
    } | null = null;
    // the optimized files quantize positions and keep the real size in the
    // node's transform: bake it into a copy of the geometry, so a person is
    // really 0.67 m tall here
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !Array.isArray(o.material) && !found)
        found = {
          geometry: o.geometry.clone().applyMatrix4(o.matrixWorld),
          material: o.material,
        };
    });
    return found;
  }, [scene]);
}

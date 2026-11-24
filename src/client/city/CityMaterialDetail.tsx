// Realistic-only surface scans and shared reflection maps for city glass.
import { useEnvironment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect } from "react";
import * as THREE from "three";
import type { KindMeshes } from "./meshes.ts";
import { groundDetailMaps, groundOcclusion } from "./worldTexture.ts";

const SCANS: readonly (readonly [keyof KindMeshes, string])[] = [
  ["road", "asphalt_02"],
  ["sidewalk", "concrete_pavement"],
  ["planks", "wood_floor_deck"],
];

function Glass({ meshes, night }: { meshes: KindMeshes; night: boolean }) {
  const envMap = useEnvironment({
    files: night
      ? "/hdri/cobblestone_street_night.hdr"
      : "/hdri/wide_street_01.hdr",
  });

  useLayoutEffect(() => {
    const curtain = meshes.curtain.material;
    if (!(curtain instanceof THREE.MeshStandardMaterial)) return;

    const baked = meshes.glass.material;
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#9ab6cf",
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMap,
      envMapIntensity: night ? 1.2 : 0.35,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    meshes.glass.material = glass;
    curtain.envMap = envMap;
    curtain.envMapIntensity = night ? 1.2 : 0.45;
    curtain.needsUpdate = true;
    return () => {
      meshes.glass.material = baked;
      glass.dispose();
      curtain.envMap = null;
      curtain.envMapIntensity = 1;
      curtain.needsUpdate = true;
    };
  }, [envMap, meshes, night]);

  return null;
}

export default function CityMaterialDetail({
  meshes,
  ground,
  reflections,
  night,
}: {
  meshes: KindMeshes;
  ground: THREE.MeshStandardMaterial;
  reflections: boolean;
  night: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const maps = new Map<string, THREE.Texture>();
    const restore: (() => void)[] = [];
    const apply = (material: THREE.Material | THREE.Material[], id: string) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      let map = maps.get(id);
      if (!map) {
        map = groundOcclusion(id, invalidate);
        maps.set(id, map);
      }
      material.aoMap = map;
      material.aoMapIntensity = 0.65;
      material.needsUpdate = true;
      const { normalMap, roughnessMap } = material;
      // A visit that booted on Performance started with one-pixel stand-ins.
      // Bring the full scans back when the player changes the preset in game.
      if (
        normalMap instanceof THREE.DataTexture &&
        roughnessMap instanceof THREE.DataTexture
      ) {
        const detail = groundDetailMaps(id, true);
        material.normalMap = detail.normalMap;
        material.roughnessMap = detail.roughnessMap;
        restore.push(() => {
          material.normalMap = normalMap;
          material.roughnessMap = roughnessMap;
          detail.normalMap.dispose();
          detail.roughnessMap.dispose();
        });
      }
      restore.push(() => {
        material.aoMap = null;
        material.needsUpdate = true;
      });
    };
    for (const [kind, id] of SCANS) apply(meshes[kind].material, id);
    apply(ground, "concrete_pavement");
    return () => {
      for (const reset of restore) reset();
      for (const map of maps.values()) map.dispose();
    };
  }, [ground, meshes, invalidate]);

  return reflections ? (
    <Suspense fallback={null}>
      <Glass meshes={meshes} night={night} />
    </Suspense>
  ) : null;
}

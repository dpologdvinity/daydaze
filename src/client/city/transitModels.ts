// Downloaded, merged transport meshes. One draw per model/LOD, pooled transforms;
// low quality uses only simplified geometry and culls past 80 meters.
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { modelGeometry } from "./modelGeometry.ts";
import { boxMapped } from "./worldTexture.ts";
import { useDaylight } from "./daylight.ts";

export type TransitModel = "taxi" | "sedan" | "van" | "bus" | "stop";
const ALL: readonly TransitModel[] = ["taxi", "sedan", "van", "bus", "stop"];
const URLS = ALL.flatMap((kind) =>
  [false, true].map((lo) => `/models/transit/${kind}${lo ? "-lo" : ""}.glb`),
);
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.needsUpdate = true;
const matrix = new THREE.Matrix4(),
  p = new THREE.Vector3(),
  q = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1),
  up = new THREE.Vector3(0, 1, 0);

export function useTransitModels(
  kinds: readonly TransitModel[],
  capacity: number,
) {
  const gltfs = useGLTF(URLS);
  const day = useDaylight();
  const models = useMemo(
    () =>
      kinds.map((kind) =>
        [false, true].map((lo) => {
          const scene = gltfs[ALL.indexOf(kind) * 2 + Number(lo)].scene;
          scene.updateMatrixWorld(true);
          let geometry: THREE.BufferGeometry | undefined;
          scene.traverse((o) => {
            if (o instanceof THREE.Mesh) geometry = modelGeometry(o);
          });
          if (!geometry) throw new Error(`Empty transit model: ${kind}`);
          const mat = boxMapped(
            new THREE.MeshStandardMaterial({
              vertexColors: true,
              map: white,
              roughness: 0.72,
              emissive: "#64788c",
            }),
            0.5,
            { weather: true },
          );
          const mesh = new THREE.InstancedMesh(geometry, mat, capacity);
          mesh.frustumCulled = false;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.count = 0;
          return mesh;
        }),
      ),
    [gltfs, kinds, capacity],
  );
  const all = useMemo(() => models.flat(), [models]);
  useEffect(() => {
    for (const mesh of all)
      if (mesh.material instanceof THREE.MeshStandardMaterial)
        mesh.material.emissiveIntensity = 0.06 + 0.22 * day.neon;
  }, [all, day.neon]);
  useEffect(
    () => () => {
      for (const mesh of all) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) mesh.material.dispose();
        mesh.dispose();
      }
    },
    [all],
  );
  return { models, all };
}

export function resetTransit(all: readonly THREE.InstancedMesh[]) {
  for (const mesh of all) mesh.count = 0;
}
export function placeTransit(
  models: THREE.InstancedMesh[][],
  model: number,
  x: number,
  z: number,
  yaw: number,
  distance: number,
  low: boolean,
) {
  if (distance > (low ? 80 : 180)) return;
  const mesh = models[model][Number(low || distance > 35)];
  if (mesh.count >= mesh.instanceMatrix.count) return;
  matrix.compose(p.set(x, 0, z), q.setFromAxisAngle(up, yaw), scale);
  mesh.setMatrixAt(mesh.count++, matrix);
}
export function updateTransit(all: readonly THREE.InstancedMesh[]) {
  for (const mesh of all) mesh.instanceMatrix.needsUpdate = true;
}

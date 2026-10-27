// Suburbia's houses near the player: Kenney's City Kit Suburban models (CC0,
// imported by scripts/import-nyc.sh into public/models/suburbia/), drawn as
// instanced meshes at the spots the city plan gives (HouseSpot in
// src/game/city/nyc.ts). One InstancedMesh per model part; CityScene hands
// over the spots on every plan reload (`cityHouses`).

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { HOUSE_MODELS, type HouseSpot } from "../../game/city/nyc.ts";
import { createStore } from "../rooms/shared/store.ts";

const URLS = HOUSE_MODELS.map((m) => `/models/suburbia/house-${m}.glb`);
/** The most houses of one model in view. */
const CAPACITY = 16;

/** The houses in view; set by CityScene. */
export const cityHouses = createStore({ spots: [] as readonly HouseSpot[] });

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export function CityHouses(): JSX.Element {
  const gltfs = useGLTF(URLS);
  const models = useMemo(
    () =>
      gltfs.map((g) => {
        g.scene.updateMatrixWorld(true);
        const parts: THREE.InstancedMesh[] = [];
        g.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          const geometry = (o.geometry as THREE.BufferGeometry).clone();
          geometry.applyMatrix4(o.matrixWorld);
          const material = Array.isArray(o.material)
            ? o.material[0]
            : o.material;
          const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
          mesh.count = 0;
          mesh.frustumCulled = false;
          parts.push(mesh);
        });
        return parts;
      }),
    [gltfs],
  );
  const { spots } = cityHouses.use();
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const counts = models.map(() => 0);
    for (const spot of spots) {
      const i = counts[spot.variant] ?? CAPACITY;
      if (i >= CAPACITY) continue;
      q.setFromAxisAngle(up, spot.yaw);
      m4.compose(
        p.set(spot.x, 0, spot.z),
        q,
        s.set(spot.scale, spot.scale, spot.scale),
      );
      for (const mesh of models[spot.variant] ?? []) mesh.setMatrixAt(i, m4);
      counts[spot.variant] = i + 1;
    }
    models.forEach((parts, v) => {
      for (const mesh of parts) {
        mesh.count = counts[v] ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
    invalidate();
    // read by the screenshot script: the houses are in and placed
    if (spots.length > 0) canvas.dataset.houses = "ready";
  }, [models, spots, invalidate, canvas]);
  const all = useMemo(() => models.flat(), [models]);
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

useGLTF.preload(URLS);

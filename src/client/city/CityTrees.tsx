// The city's street trees: Quaternius' Stylized Nature MegaKit trees (CC0,
// imported by scripts/import-nature.sh into public/models/nature/), drawn as
// instanced meshes at the spots the city plan gives (TreeSpot in
// src/game/city/plan.ts). Each model is one instanced mesh per part (bark,
// leaves) at two levels of detail: the full tree near the player, the
// simplified `-lo` twin farther out and everywhere on the low tier, which
// also leaves out trees past LOW_FAR. CityScene
// hands over the spots on every plan reload (`cityTrees`).

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { TREE_VARIANTS, type TreeSpot } from "../../game/city/plan.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useQuality } from "../world/quality.ts";
import { floated } from "./floated.ts";

const MODELS = "/models/nature";
/** Trees nearer than this (meters, from where the plan was cut) get full detail. */
const NEAR = 45;
/** On the low tier, trees past this are left out (the triangle budget). */
const LOW_FAR = 70;
/** The most trees of one model at one detail level. */
const CAPACITY = 160;
/** The models stand 7-9 m; city trees are a little smaller. */
const BASE_SCALE = 0.8;

const urls = (lo: boolean) =>
  Array.from(
    { length: TREE_VARIANTS },
    (_, i) => `${MODELS}/commontree-${i + 1}${lo ? "-lo" : ""}.glb`,
  );

/** The trees in view and where the plan was cut; set by CityScene. */
export const cityTrees = createStore({
  spots: [] as readonly TreeSpot[],
  at: [0, 0] as readonly [number, number],
});

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material };

/** A model's meshes, each with its node transform baked into the geometry. */
function partsOf(scene: THREE.Object3D): Part[] {
  scene.updateMatrixWorld(true);
  const parts: Part[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = floated(o.geometry as THREE.BufferGeometry);
    geometry.applyMatrix4(o.matrixWorld);
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (material) parts.push({ geometry, material });
  });
  return parts;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/** One level of detail: an instanced mesh per model part. */
function useLevel(lo: boolean) {
  const gltfs = useGLTF(urls(lo));
  return useMemo(
    () =>
      gltfs.map((g) =>
        partsOf(g.scene).map(({ geometry, material }) => {
          const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
          mesh.count = 0;
          mesh.frustumCulled = false;
          return mesh;
        }),
      ),
    [gltfs],
  );
}

function place(
  levels: { near: THREE.InstancedMesh[][]; far: THREE.InstancedMesh[][] },
  spots: readonly TreeSpot[],
  at: readonly [number, number],
  allFar: boolean,
) {
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const t of spots) {
    const d = Math.hypot(t.x - at[0], t.z - at[1]);
    if (allFar && d > LOW_FAR) continue;
    const near = !allFar && d < NEAR;
    const parts = (near ? levels.near : levels.far)[t.variant] ?? [];
    q.setFromAxisAngle(up, t.yaw);
    p.set(t.x, 0, t.z);
    const k = BASE_SCALE * t.scale;
    s.set(k, k, k);
    m.compose(p, q, s);
    for (const mesh of parts) {
      const i = counts.get(mesh) ?? 0;
      if (i >= CAPACITY) continue;
      mesh.setMatrixAt(i, m);
      counts.set(mesh, i + 1);
    }
  }
  for (const set of [levels.near, levels.far])
    for (const parts of set)
      for (const mesh of parts) {
        mesh.count = counts.get(mesh) ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
}

export function CityTrees(): JSX.Element {
  const low = useQuality() === "low";
  const far = useLevel(true);
  const near = useLevel(false);
  const { spots, at } = cityTrees.use();
  useEffect(() => {
    place({ near, far }, spots, at, low);
  }, [near, far, spots, at, low]);
  const all = useMemo(() => [...near.flat(), ...far.flat()], [near, far]);
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

useGLTF.preload(urls(true));

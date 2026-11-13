// The city's street trees: Quaternius' Textured Stylized Trees (CC0, built by
// art/nature/build_trees.py and scripts/import-trees.sh into
// public/models/nature/street-tree-*), drawn as instanced meshes at the spots
// the city plan gives (TreeSpot in src/game/city/plan.ts). Each model is one
// instanced mesh per part (bark, leaves) at two levels of detail: the full
// tree near the player, the simplified `-lo` twin farther out and everywhere
// on the low tier, which also leaves out trees past TREE_LOW_FAR. CityScene
// hands over the spots on every plan reload (`cityTrees`).
//
// The leaves are alpha-tested cards: their edges are smoothed by MSAA
// (alpha to coverage) so a crown doesn't shimmer, their normals point away
// from the crown (art/nature/build_trees.py) and are never flipped on a
// card's back, so no card goes dark, and each tree's leaves wear their own
// color (src/game/city/treeLook.ts): shades of green, a few turned in autumn.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import { TREE_VARIANTS, type TreeSpot } from "../../game/city/plan.ts";
import { TREE_LOW_FAR } from "../../game/city/tuning.ts";
import { leafTint } from "../../game/city/treeLook.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useQuality } from "../world/quality.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";
import { disposeInstanced } from "./dispose.ts";

const MODELS = "/models/nature";
/** Trees nearer than this (meters, from where the plan was cut) get full detail. */
const NEAR = 45;
/** The most trees of one model at one detail level. */
const CAPACITY = 160;
/** The models stand 4-8 m; a street tree grows a quarter taller. */
const BASE_SCALE = 1.25;
/** Leaf cards cut out where the texture is under this opaque. */
const LEAF_CUTOFF = 0.5;

const urls = (lo: boolean) =>
  Array.from(
    { length: TREE_VARIANTS },
    (_, i) => `${MODELS}/street-tree-${i + 1}${lo ? "-lo" : ""}.glb`,
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
    const geometry = bakedGeometry(o);
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (material) parts.push({ geometry, material });
  });
  return parts;
}

/**
 * A leaf material that suits a crown: cutout edges softened by MSAA, double
 * sided, and lit by the normal the model gives it on both sides of a card
 * (three flips the normal on a back face, which would turn every card's back
 * dark under crown-shaped normals).
 */
function leafMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  material.transparent = false;
  material.alphaTest = LEAF_CUTOFF;
  material.alphaToCoverage = true;
  material.side = THREE.DoubleSide;
  material.customProgramCacheKey = () => "city-tree-leaves";
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      THREE.ShaderChunk.normal_fragment_begin.replace(
        "gl_FrontFacing ? 1.0 : - 1.0",
        "1.0",
      ),
    );
  };
  return material;
}

const isLeaves = (material: THREE.Material) => material.name.includes("Leaves");

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const tint = new THREE.Color();

/** One level of detail: an instanced mesh per model part. */
function useLevel(lo: boolean) {
  const gltfs = useGLTF(urls(lo));
  const levels = useMemo(
    () =>
      gltfs.map((g) =>
        partsOf(g.scene).map(({ geometry, material }) => {
          const leaves = isLeaves(material);
          const mesh = new THREE.InstancedMesh(
            geometry,
            leaves ? leafMaterial(material) : material.clone(),
            CAPACITY,
          );
          mesh.count = 0;
          mesh.frustumCulled = false;
          // the leaves carry a color per tree; allocated now so the program
          // is built with instance colors from the first frame
          if (leaves) mesh.setColorAt(0, tint.set(1, 1, 1));
          return mesh;
        }),
      ),
    [gltfs],
  );
  // The geometry and material copies go with the city.
  useEffect(() => () => disposeInstanced(levels.flat(), true), [levels]);
  return levels;
}

function place(
  levels: { near: THREE.InstancedMesh[][]; far: THREE.InstancedMesh[][] },
  spots: readonly TreeSpot[],
  at: readonly [number, number],
  allFar: boolean,
  autumn: boolean,
) {
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const t of spots) {
    const d = Math.hypot(t.x - at[0], t.z - at[1]);
    if (allFar && d > TREE_LOW_FAR) continue;
    const near = !allFar && d < NEAR;
    const parts = (near ? levels.near : levels.far)[t.variant] ?? [];
    q.setFromAxisAngle(up, t.yaw);
    p.set(t.x, 0, t.z);
    const k = BASE_SCALE * t.scale;
    s.set(k, k, k);
    m.compose(p, q, s);
    const [r, g, b] = leafTint(t.x, t.z, autumn);
    for (const mesh of parts) {
      const i = counts.get(mesh) ?? 0;
      if (i >= CAPACITY) continue;
      mesh.setMatrixAt(i, m);
      if (mesh.instanceColor) mesh.setColorAt(i, tint.setRGB(r, g, b));
      counts.set(mesh, i + 1);
    }
  }
  for (const set of [levels.near, levels.far])
    for (const parts of set)
      for (const mesh of parts) {
        mesh.count = counts.get(mesh) ?? 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
}

export function CityTrees({ autumn }: { autumn: boolean }): JSX.Element {
  const low = useQuality() === "low";
  const far = useLevel(true);
  // the low tier draws every tree far off, so its near level is the cached
  // far models (never filled): the full-detail files are never fetched
  const near = useLevel(low);
  const { spots, at } = cityTrees.use();
  useEffect(() => {
    place({ near, far }, spots, at, low, autumn);
  }, [near, far, spots, at, low, autumn]);
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

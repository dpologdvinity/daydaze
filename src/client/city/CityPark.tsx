// The park's undergrowth and pond (src/game/city/park.ts): tufts of grass,
// ferns, hedge bushes, flower beds and the pond's rocks, drawn as instanced
// meshes from the Stylized Nature MegaKit's far-twin models
// (public/models/nature/*-lo.glb), only those near the player, and the
// pond's water. The furniture in the park (fountain, bandstand, boat, ducks,
// benches, blankets) goes through CityFurniture like the street's. Nothing
// here is allocated per frame.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  GROUND,
  parkGrowth,
  POND,
  type Growth,
  type GrowthKind,
} from "../../game/city/park.ts";
import { useQuality } from "../world/quality.ts";
import { cityFurniture, dimMeshes, partsOf } from "./CityFurniture.tsx";
import { useDaylight } from "./daylight.ts";

const MODELS: Record<GrowthKind, string> = {
  grass: "grass-common-tall-lo",
  wispy: "grass-wispy-short-lo",
  fern: "fern-1-lo",
  bush: "bush-common-lo",
  flowers3: "flower-3-group-lo",
  flowers4: "flower-4-group-lo",
  rock: "rock-medium-1-lo",
};
const KINDS = Object.keys(MODELS).filter((k): k is GrowthKind => k in MODELS);
const url = (kind: GrowthKind) => `/models/nature/${MODELS[kind]}.glb`;

/** How far (m) from the player each kind is drawn on the low and high tiers. */
const RANGE: Record<GrowthKind, readonly [low: number, high: number]> = {
  grass: [24, 48],
  wispy: [24, 48],
  fern: [40, 80],
  bush: [60, 110],
  flowers3: [45, 90],
  flowers4: [45, 90],
  rock: [50, 100],
};
/** The kit's plants are sized for its 8 m trees; the undergrowth shrinks to a park's. */
const SCALE: Record<GrowthKind, number> = {
  grass: 0.3,
  wispy: 0.4,
  fern: 0.5,
  bush: 0.55,
  flowers3: 0.4,
  flowers4: 0.4,
  rock: 0.45,
};
/** The most of one kind drawn at once (low tier keeps it small). */
const CAPACITY = 1400;
const LOW_CAP = 220;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

const GROWTH = parkGrowth();

function place(
  meshes: ReadonlyMap<GrowthKind, THREE.InstancedMesh[]>,
  growth: readonly Growth[],
  at: readonly [number, number],
  low: boolean,
) {
  const counts = new Map<GrowthKind, number>();
  for (const g of growth) {
    const d = Math.hypot(g.x - at[0], g.z - at[1]);
    if (d > RANGE[g.kind][low ? 0 : 1]) continue;
    const n = counts.get(g.kind) ?? 0;
    if (n >= (low ? LOW_CAP : CAPACITY)) continue;
    q.setFromAxisAngle(up, g.yaw);
    p.set(g.x, GROUND, g.z);
    s.setScalar(g.scale * SCALE[g.kind]);
    m.compose(p, q, s);
    for (const mesh of meshes.get(g.kind) ?? []) mesh.setMatrixAt(n, m);
    counts.set(g.kind, n + 1);
  }
  for (const [kind, parts] of meshes)
    for (const mesh of parts) {
      mesh.count = counts.get(kind) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
}

const WATER = new THREE.Color("#3f94bd");

export function CityPark(): JSX.Element {
  const low = useQuality() === "low";
  const gltfs = useGLTF(KINDS.map(url));
  const meshes = useMemo(() => {
    const byKind = new Map<GrowthKind, THREE.InstancedMesh[]>();
    KINDS.forEach((kind, i) => {
      const gltf = gltfs[i];
      if (gltf) byKind.set(kind, partsOf(gltf.scene, null, CAPACITY));
    });
    return byKind;
  }, [gltfs]);
  const { at } = cityFurniture.use();
  useEffect(() => {
    place(meshes, GROWTH, at, low);
  }, [meshes, at, low]);
  const { neon } = useDaylight();
  const all = useMemo(() => [...meshes.values()].flat(), [meshes]);
  useEffect(() => dimMeshes(all, 1 - 0.55 * neon), [all, neon]);
  const water = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WATER,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );
  useEffect(() => {
    water.color.copy(WATER).multiplyScalar(1 - 0.6 * neon);
  }, [water, neon]);
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      <mesh
        position={[POND.x, GROUND + 0.01, POND.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={water}
      >
        <circleGeometry args={[POND.r, 28]} />
      </mesh>
    </>
  );
}

useGLTF.preload(KINDS.map(url));

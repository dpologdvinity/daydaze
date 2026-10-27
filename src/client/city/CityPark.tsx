// The park's undergrowth and pond (src/game/city/park.ts): tufts of grass,
// ferns, hedge bushes, flower beds and the pond's rocks, drawn as instanced
// meshes from the Stylized Nature MegaKit's far-twin models
// (public/models/nature/*-lo.glb), only those near the player, and the
// pond's water. The furniture in the park (fountain, bandstand, boat, ducks,
// benches, blankets) goes through CityFurniture like the street's. Nothing
// here is allocated per frame.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  GROUND,
  PARK_FOUNTAIN,
  parkGrowth,
  POND,
  type Growth,
  type GrowthKind,
} from "../../game/city/park.ts";
import { useQuality } from "../world/quality.ts";
import { cityFurniture, dimMeshes, partsOf } from "./CityFurniture.tsx";
import { useDaylight } from "./daylight.ts";
import { useReducedMotion } from "../motion.ts";

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
  grass: [20, 48],
  // the dearer tuft: high tier only
  wispy: [0, 48],
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
const LOW_CAP = 420;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

const GROWTH = parkGrowth();

/** Growth within range, nearest first, so a full cap drops the far tufts. */
function nearby(
  growth: readonly Growth[],
  at: readonly [number, number],
  low: boolean,
): Growth[] {
  return growth
    .map((g) => ({ g, d: Math.hypot(g.x - at[0], g.z - at[1]) }))
    .filter(({ g, d }) => d <= RANGE[g.kind][low ? 0 : 1])
    .sort((a, b) => a.d - b.d)
    .map(({ g }) => g);
}

function place(
  meshes: ReadonlyMap<GrowthKind, THREE.InstancedMesh[]>,
  growth: readonly Growth[],
  at: readonly [number, number],
  low: boolean,
) {
  const counts = new Map<GrowthKind, number>();
  for (const g of nearby(growth, at, low)) {
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
      <FountainWater />
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

// ---- the fountain's water and spray -------------------------------------
// The model (public/models/park/fountain.glb) is bare stone: its lower pool
// rim stands 0.38 m high and r 3 m, its upper bowl 1.0 m high and r 2.7 m,
// and the spout tops out at 2.3 m. Water discs fill both, and a few dozen
// droplets arc from the spout into the bowl.
const DROPS = 48;
const FLIGHT = 0.95;
const SPOUT_Y = 2.3;
const FOUNTAIN_WATER = new THREE.Color("#7cc4e6");

/** The fountain's water and spray; dims at night, rests when motion is reduced. */
export function FountainWater(): JSX.Element {
  const { neon } = useDaylight();
  const reduced = useReducedMotion();
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FOUNTAIN_WATER,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(DROPS * 3), 3),
    );
    return g;
  }, []);
  const spray = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#e6f7ff",
        size: 0.16,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => {
    material.color.copy(FOUNTAIN_WATER).multiplyScalar(1 - 0.6 * neon);
    spray.color.set("#e6f7ff").multiplyScalar(1 - 0.5 * neon);
  }, [material, spray, neon]);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < DROPS; i++) {
      const phase = (i * 0.6180339) % 1;
      const age = (t * 0.8 + phase) % 1;
      const u = age * FLIGHT;
      const a = i * 2.399963;
      const out = 0.9 + ((i * 7) % 5) * 0.25;
      pos.setXYZ(
        i,
        Math.cos(a) * out * u,
        SPOUT_Y + 3.1 * u - 4.9 * u * u,
        Math.sin(a) * out * u,
      );
    }
    pos.needsUpdate = true;
  });
  return (
    <group position={[PARK_FOUNTAIN.x, GROUND, PARK_FOUNTAIN.z]}>
      <mesh
        position={[0, 0.34, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={material}
      >
        <circleGeometry args={[2.95, 28]} />
      </mesh>
      <mesh
        position={[0, 0.98, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={material}
      >
        <circleGeometry args={[2.35, 24]} />
      </mesh>
      <points geometry={geometry} material={spray} frustumCulled={false} />
    </group>
  );
}

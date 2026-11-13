// The city's street furniture: lamp posts, hydrants, bins, benches, mailboxes,
// newspaper boxes, parking meters, bike racks, bus shelters and signs, drawn as
// instanced meshes at the spots the city plan gives (FurnitureSpot in
// src/game/city/furniture.ts). Models come from art/street/build_street.py
// (Quaternius Street Pack and Poly Haven, CC0, plus a few originals), one GLB
// per kind in public/models/street/, one instanced mesh per model part. Each
// kind is drawn out to its own range (FURNITURE_RANGE), shorter on the low
// tier, so the pieces cost almost nothing there. CityScene hands over the
// spots on every plan reload (`cityFurniture`).

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  FURNITURE_KINDS,
  MODEL_DIR,
  furnitureVisible,
  type FurnitureKind,
  type FurnitureSpot,
} from "../../game/city/furniture.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useQuality } from "../world/quality.ts";
import { useDaylight } from "./daylight.ts";
import { boxMapped, surface } from "./worldTexture.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";
import { disposeInstanced } from "./dispose.ts";

const MODELS = "/models/street";
/** The most pieces of one kind in view at once. */
const CAPACITY = 256;
/** `?debug=1` also reports how many of each kind are drawn (data-furniture-kinds). */
const DEBUG = new URLSearchParams(location.search).get("debug") === "1";

const url = (kind: FurnitureKind) => {
  const dir = MODEL_DIR[kind];
  return `${dir ? `/models/${dir}` : MODELS}/${kind}.glb`;
};

/** The furniture in view and where the plan was cut; set by CityScene. */
export const cityFurniture = createStore({
  spots: [] as readonly FurnitureSpot[],
  at: [0, 0] as readonly [number, number],
});

/** A model's meshes, each with its node transform baked into the geometry. */
export function partsOf(
  scene: THREE.Object3D,
  tint: THREE.Color | null,
  capacity: number = CAPACITY,
  /** Swaps a part's material for a tiling one, by the part's material name. */
  retexture?: (name: string) => THREE.MeshStandardMaterial | undefined,
): THREE.InstancedMesh[] {
  scene.updateMatrixWorld(true);
  const parts: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = bakedGeometry(o);
    const found = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!found) return;
    // own copy, so the daylight dimming below never touches a shared material
    const material = retexture?.(found.name) ?? found.clone();
    if (material instanceof THREE.MeshStandardMaterial) {
      if (tint) material.color.multiply(tint);
      material.userData.base = material.color.clone();
    }
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    parts.push(mesh);
  });
  return parts;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/**
 * The benches' two parts ("slats" and "ends", split in art/street/build_street.py)
 * wear the city's tiling surfaces: park-green painted boards on dark iron, and
 * bleached weathered planks on the deck. Each call builds its own materials
 * (own onBeforeCompile and daylight color) over the shared photo maps.
 */
const BENCH_SURFACES: Partial<
  Record<FurnitureKind, Record<string, Parameters<typeof surface>>>
> = {
  bench: {
    slats: ["wood_floor_deck", { scale: 1.2, color: "#9af5b8" }],
    ends: ["rusty_metal", { scale: 1.5, color: "#8a9490", metalness: 0.5 }],
  },
  boardbench: {
    slats: ["wood_floor_deck", { scale: 1.2, color: "#f4f0e6" }],
    ends: ["wood_floor_deck", { scale: 1.2, color: "#c9c2b4" }],
  },
};

const TINT: Partial<Record<FurnitureKind, THREE.Color>> = {
  // the fountain's grey stone, warmed to sandstone
  fountain: new THREE.Color(1.1, 0.95, 0.76),
};

/** Scales the (own-copy) materials of `meshes` to `k` of their base color: the night dims them. */
export function dimMeshes(meshes: readonly THREE.InstancedMesh[], k: number) {
  for (const mesh of meshes) {
    const m = mesh.material;
    const base: unknown =
      m instanceof THREE.MeshStandardMaterial && m.userData.base;
    if (m instanceof THREE.MeshStandardMaterial && base instanceof THREE.Color)
      m.color.copy(base).multiplyScalar(k);
  }
}

type Meshes = ReadonlyMap<FurnitureKind, THREE.InstancedMesh[]>;

function place(
  meshes: Meshes,
  spots: readonly FurnitureSpot[],
  at: readonly [number, number],
  low: boolean,
  summer: boolean,
) {
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const f of spots) {
    if (
      !summer &&
      (f.kind === "umbrella-red" ||
        f.kind === "umbrella-blue" ||
        f.kind === "towel")
    )
      continue;
    if (!furnitureVisible(f.kind, Math.hypot(f.x - at[0], f.z - at[1]), low))
      continue;
    q.setFromAxisAngle(up, f.yaw);
    p.set(f.x, f.y ?? 0, f.z);
    s.setScalar(f.scale);
    m.compose(p, q, s);
    for (const mesh of meshes.get(f.kind) ?? []) {
      const i = counts.get(mesh) ?? 0;
      if (i >= CAPACITY) continue;
      mesh.setMatrixAt(i, m);
      counts.set(mesh, i + 1);
    }
  }
  for (const parts of meshes.values())
    for (const mesh of parts) {
      mesh.count = counts.get(mesh) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  // how many of each kind are drawn (the first part's count), for browser tests
  return Object.fromEntries(
    [...meshes].map(([kind, parts]) => [kind, parts[0]?.count ?? 0]),
  );
}

export function CityFurniture({ summer }: { summer: boolean }): JSX.Element {
  const low = useQuality() === "low";
  const gltfs = useGLTF(FURNITURE_KINDS.map(url));
  const meshes = useMemo(() => {
    const byKind = new Map<FurnitureKind, THREE.InstancedMesh[]>();
    FURNITURE_KINDS.forEach((kind, i) => {
      const gltf = gltfs[i];
      const bench = BENCH_SURFACES[kind];
      if (gltf)
        byKind.set(
          kind,
          partsOf(
            gltf.scene,
            TINT[kind] ?? null,
            undefined,
            bench &&
              ((name) => {
                const spec = bench[name];
                return (
                  spec &&
                  boxMapped(surface(...spec).clone(), spec[1]?.scale ?? 1)
                );
              }),
          ),
        );
    });
    return byKind;
  }, [gltfs]);
  const { spots, at } = cityFurniture.use();
  // dim with the night like the rest of the city (dimForDay in meshes.ts)
  const { neon } = useDaylight();
  useEffect(
    () => dimMeshes([...meshes.values()].flat(), 1 - 0.55 * neon),
    [meshes, neon],
  );
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const drawn = place(meshes, spots, at, low, summer);
    // read by the screenshot script and tests: the models are in and placed
    if (DEBUG) canvas.dataset.furnitureKinds = JSON.stringify(drawn);
    if (spots.length > 0) canvas.dataset.furniture = "ready";
  }, [meshes, spots, at, low, summer, canvas]);
  const all = useMemo(() => [...meshes.values()].flat(), [meshes]);
  useEffect(() => () => disposeInstanced(all, true), [all]);
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

useGLTF.preload(FURNITURE_KINDS.map(url));

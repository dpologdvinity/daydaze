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
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  FURNITURE_KINDS,
  furnitureVisible,
  type FurnitureKind,
  type FurnitureSpot,
} from "../../game/city/furniture.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useQuality } from "../world/quality.ts";

const MODELS = "/models/street";
/** The most pieces of one kind in view at once. */
const CAPACITY = 256;

const url = (kind: FurnitureKind) => `${MODELS}/${kind}.glb`;

/** The furniture in view and where the plan was cut; set by CityScene. */
export const cityFurniture = createStore({
  spots: [] as readonly FurnitureSpot[],
  at: [0, 0] as readonly [number, number],
});

/**
 * A copy with float positions and normals. The optimized GLBs store them
 * quantized (normalized integers whose node transform restores the scale), and
 * baking a transform into a normalized attribute would clamp it to +-1.
 */
function floated(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.clone();
  for (const name of ["position", "normal"]) {
    const a = geometry.getAttribute(name);
    if (!a || a instanceof THREE.InterleavedBufferAttribute) {
      if (a) geometry.setAttribute(name, floatCopy(a));
      continue;
    }
    if (a.normalized || !(a.array instanceof Float32Array))
      geometry.setAttribute(name, floatCopy(a));
  }
  return geometry;
}

function floatCopy(
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) {
  const out = new THREE.BufferAttribute(new Float32Array(a.count * 3), 3);
  for (let i = 0; i < a.count; i++)
    out.setXYZ(i, a.getX(i), a.getY(i), a.getZ(i));
  return out;
}

/** A model's meshes, each with its node transform baked into the geometry. */
function partsOf(scene: THREE.Object3D): THREE.InstancedMesh[] {
  scene.updateMatrixWorld(true);
  const parts: THREE.InstancedMesh[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = floated(o.geometry as THREE.BufferGeometry);
    geometry.applyMatrix4(o.matrixWorld);
    const material = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!material) return;
    const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
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

type Meshes = Record<FurnitureKind, THREE.InstancedMesh[]>;

function place(
  meshes: Meshes,
  spots: readonly FurnitureSpot[],
  at: readonly [number, number],
  low: boolean,
) {
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const f of spots) {
    if (!furnitureVisible(f.kind, Math.hypot(f.x - at[0], f.z - at[1]), low))
      continue;
    q.setFromAxisAngle(up, f.yaw);
    p.set(f.x, 0, f.z);
    s.setScalar(f.scale);
    m.compose(p, q, s);
    for (const mesh of meshes[f.kind]) {
      const i = counts.get(mesh) ?? 0;
      if (i >= CAPACITY) continue;
      mesh.setMatrixAt(i, m);
      counts.set(mesh, i + 1);
    }
  }
  for (const parts of Object.values(meshes))
    for (const mesh of parts) {
      mesh.count = counts.get(mesh) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
}

export function CityFurniture(): JSX.Element {
  const low = useQuality() === "low";
  const gltfs = useGLTF(FURNITURE_KINDS.map(url));
  const meshes = useMemo(
    () =>
      Object.fromEntries(
        FURNITURE_KINDS.map((kind, i) => [kind, partsOf(gltfs[i]!.scene)]),
      ) as Meshes,
    [gltfs],
  );
  const { spots, at } = cityFurniture.use();
  useEffect(() => {
    place(meshes, spots, at, low);
  }, [meshes, spots, at, low]);
  const all = useMemo(() => Object.values(meshes).flat(), [meshes]);
  return (
    <>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

useGLTF.preload(FURNITURE_KINDS.map(url));

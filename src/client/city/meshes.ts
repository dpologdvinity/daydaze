import * as THREE from "three";
import { KINDS, type Instance, type Kind } from "../../game/city/plan.ts";

// Kinds that glow: their colours run past 1.0 so bloom picks them up on high.
const GLOW: ReadonlySet<Kind> = new Set<Kind>(["band", "sign", "tube", "lamp"]);
const GLOW_SCALE = 2.5;

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const SPHERE = new THREE.SphereGeometry(0.5, 10, 8);
const CONE = new THREE.ConeGeometry(0.5, 1, 6);
const CAPSULE = new THREE.CapsuleGeometry(0.5, 1, 2, 8);

// Shared across mounts, so a mesh that is torn down never frees them.
const GEOMETRY: Record<Kind, THREE.BufferGeometry> = {
  road: BOX,
  sidewalk: BOX,
  lane: BOX,
  body: BOX,
  band: BOX,
  roof: BOX,
  glow: BOX,
  awning: BOX,
  sign: BOX,
  tube: BOX,
  queue: CAPSULE,
  pole: CYLINDER,
  lamp: SPHERE,
  palmTrunk: CYLINDER,
  palmFrond: CONE,
  treeTrunk: CYLINDER,
  treeCanopy: SPHERE,
};

const MATERIAL: Record<Kind, THREE.Material> = {
  road: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
  sidewalk: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
  lane: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // the faint emissive keeps facades readable on the night side of the street
  body: new THREE.MeshStandardMaterial({
    roughness: 0.4,
    metalness: 0.25,
    emissive: "#2a1f55",
    emissiveIntensity: 0.9,
  }),
  band: new THREE.MeshBasicMaterial({ toneMapped: false }),
  roof: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
  awning: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
  sign: new THREE.MeshBasicMaterial({ toneMapped: false }),
  tube: new THREE.MeshBasicMaterial({ toneMapped: false }),
  queue: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  pole: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 }),
  lamp: new THREE.MeshBasicMaterial({ toneMapped: false }),
  palmTrunk: new THREE.MeshStandardMaterial({
    color: "#6b4a2b",
    roughness: 0.9,
  }),
  palmFrond: new THREE.MeshStandardMaterial({
    color: "#1f7a4f",
    roughness: 0.6,
    side: THREE.DoubleSide,
  }),
  treeTrunk: new THREE.MeshStandardMaterial({
    color: "#4a3524",
    roughness: 0.9,
  }),
  treeCanopy: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
};

export type KindMeshes = Record<Kind, THREE.InstancedMesh>;

/** One InstancedMesh per kind, each able to hold `capacity` instances. */
export function createKindMeshes(capacity: number): KindMeshes {
  const make = (kind: Kind) => {
    const mesh = new THREE.InstancedMesh(
      GEOMETRY[kind],
      MATERIAL[kind],
      capacity,
    );
    mesh.count = 0;
    // the city streams, so the bounds of each mesh change; culling would lie
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  };
  return {
    road: make("road"),
    sidewalk: make("sidewalk"),
    lane: make("lane"),
    body: make("body"),
    band: make("band"),
    roof: make("roof"),
    glow: make("glow"),
    awning: make("awning"),
    sign: make("sign"),
    tube: make("tube"),
    queue: make("queue"),
    pole: make("pole"),
    lamp: make("lamp"),
    palmTrunk: make("palmTrunk"),
    palmFrond: make("palmFrond"),
    treeTrunk: make("treeTrunk"),
    treeCanopy: make("treeCanopy"),
  };
}

export function disposeKindMeshes(meshes: KindMeshes) {
  for (const kind of KINDS) meshes[kind].dispose();
}

const euler = new THREE.Euler();
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const color = new THREE.Color();

/** Overwrites a mesh's instances; the mesh draws only what it was given. */
export function writeKind(
  mesh: THREE.InstancedMesh,
  kind: Kind,
  items: readonly Instance[],
) {
  mesh.count = items.length;
  items.forEach((item, i) => {
    const [rx = 0, ry = 0, rz = 0] = item.rot ?? [];
    euler.set(rx, ry, rz, "YXZ");
    quaternion.setFromEuler(euler);
    matrix.compose(
      position.set(item.x, item.y, item.z),
      quaternion,
      scale.set(item.sx, item.sy, item.sz),
    );
    mesh.setMatrixAt(i, matrix);
    if (item.color) {
      color.set(item.color);
      if (GLOW.has(kind)) color.multiplyScalar(GLOW_SCALE);
      mesh.setColorAt(i, color);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

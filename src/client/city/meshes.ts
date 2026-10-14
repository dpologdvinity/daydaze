import * as THREE from "three";
import { KINDS, type Instance, type Kind } from "../../game/city/plan.ts";
import { animate } from "./shaders.ts";

// Kinds that glow: their colours run past 1.0 so bloom picks them up on high.
const GLOW: ReadonlySet<Kind> = new Set<Kind>([
  "band",
  "sign",
  "panel",
  "tube",
  "lamp",
  "arch",
  "bulb",
]);
const GLOW_SCALE = 2.5;

// The label kind gets its own geometry and material, because each mount
// owns the atlas its names are drawn on.
type Shared = Exclude<Kind, "label">;

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const SPHERE = new THREE.SphereGeometry(0.5, 10, 8);
const CONE = new THREE.ConeGeometry(0.5, 1, 6);
const CAPSULE = new THREE.CapsuleGeometry(0.5, 1, 2, 8);
const PLANE = new THREE.PlaneGeometry(1, 1);
const CIRCLE = new THREE.CircleGeometry(0.5, 12);
const PUFF = new THREE.SphereGeometry(0.5, 6, 4);

// Shared across mounts, so a mesh that is torn down never frees them.
const GEOMETRY: Record<Shared, THREE.BufferGeometry> = {
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
  window: PLANE,
  panel: BOX,
  arch: BOX,
  bulb: BOX,
  car: BOX,
  carGlass: BOX,
  furniture: BOX,
  glass: BOX,
  crowd: CAPSULE,
  head: SPHERE,
  hair: SPHERE,
  puddle: CIRCLE,
  steam: PUFF,
};

const MATERIAL: Record<Shared, THREE.Material> = {
  // wet asphalt: low roughness catches the neon as a soft sheen
  road: new THREE.MeshStandardMaterial({
    roughness: 0.28,
    metalness: 0.15,
    emissive: "#1a1036",
  }),
  sidewalk: new THREE.MeshStandardMaterial({
    roughness: 0.6,
    emissive: "#2a1d52",
    emissiveIntensity: 0.8,
  }),
  lane: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // the faint emissive keeps facades readable on the night side of the street
  body: new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.3,
    emissive: "#3b2b7a",
    emissiveIntensity: 1,
  }),
  band: new THREE.MeshBasicMaterial({ toneMapped: false }),
  roof: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // flat-lit, so the striped colours read at night without a lamp on them
  awning: new THREE.MeshBasicMaterial({ toneMapped: false }),
  sign: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
  }),
  tube: new THREE.MeshBasicMaterial({ toneMapped: false }),
  queue: animate(new THREE.MeshStandardMaterial({ roughness: 0.6 }), {
    bob: true,
  }),
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
  window: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    flicker: true,
  }),
  panel: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
  }),
  arch: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
  }),
  bulb: new THREE.MeshBasicMaterial({ toneMapped: false }),
  car: new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.2,
    emissive: "#202030",
    emissiveIntensity: 0.6,
  }),
  carGlass: new THREE.MeshStandardMaterial({ roughness: 0.1, metalness: 0.6 }),
  furniture: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  glass: new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }),
  crowd: animate(new THREE.MeshStandardMaterial({ roughness: 0.5 }), {
    bob: true,
  }),
  head: animate(new THREE.MeshStandardMaterial({ roughness: 0.5 }), {
    bob: true,
  }),
  hair: animate(new THREE.MeshStandardMaterial({ roughness: 0.4 }), {
    bob: true,
  }),
  puddle: new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    toneMapped: false,
  }),
  steam: animate(
    new THREE.MeshBasicMaterial({
      color: "#e8e0ff",
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
    { drift: true, fade: true },
  ),
};

export type KindMeshes = Record<Kind, THREE.InstancedMesh>;

function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  capacity: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

/**
 * One InstancedMesh per kind, each able to hold its own capacity. The label
 * kind draws its names from `atlas`, so the mount owns that texture's material.
 */
export function createKindMeshes(
  capacity: Record<Kind, number>,
  atlas: THREE.Texture,
): KindMeshes {
  const make = (kind: Shared) =>
    instanced(GEOMETRY[kind], MATERIAL[kind], capacity[kind]);
  const labels = new THREE.PlaneGeometry(1, 1);
  labels.setAttribute(
    "aUv",
    new THREE.InstancedBufferAttribute(new Float32Array(capacity.label * 4), 4),
  );
  const labelMaterial = animate(
    new THREE.MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
    { atlas: true },
  );
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
    window: make("window"),
    label: instanced(labels, labelMaterial, capacity.label),
    panel: make("panel"),
    arch: make("arch"),
    bulb: make("bulb"),
    car: make("car"),
    carGlass: make("carGlass"),
    furniture: make("furniture"),
    glass: make("glass"),
    crowd: make("crowd"),
    head: make("head"),
    hair: make("hair"),
    puddle: make("puddle"),
    steam: make("steam"),
  };
}

export function disposeKindMeshes(meshes: KindMeshes) {
  for (const kind of KINDS) meshes[kind].dispose();
  meshes.label.geometry.dispose();
  [meshes.label.material].flat().forEach((m) => m.dispose());
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
  // only the label kind carries a per-instance atlas rectangle
  const names = kind === "label" ? mesh.geometry.getAttribute("aUv") : null;
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
    if (names && item.uv) names.setXYZW(i, ...item.uv);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (names) names.needsUpdate = true;
  // the bounds follow the instances, so frustum culling stays correct
  mesh.computeBoundingSphere();
}

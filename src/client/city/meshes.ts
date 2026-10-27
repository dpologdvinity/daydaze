import * as THREE from "three";
import { CAR_BODY, CAR_CABIN } from "./carGeometry.ts";
import { boxMapped, groundMaps, worldMapped } from "./worldTexture.ts";
import {
  FACADE_KINDS,
  KINDS,
  type FacadeKind,
  type Instance,
  type Kind,
} from "../../game/city/plan.ts";
import { facadeMaterials } from "./facades.ts";
import { animate } from "./shaders.ts";
import { laneTint } from "../../game/city/daylight.ts";

// Kinds that glow: their colors run past 1.0 so bloom picks them up on high.
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
const CAPSULE = new THREE.CapsuleGeometry(0.5, 1, 2, 8);
const PLANE = new THREE.PlaneGeometry(1, 1);
const CIRCLE = new THREE.CircleGeometry(0.5, 12);
const PUFF = new THREE.SphereGeometry(0.5, 6, 4);
// tree crowns: a couple of hundred in view, so a lighter sphere than SPHERE
const CANOPY = new THREE.SphereGeometry(0.5, 8, 6);

/**
 * A window: a dark frame round two panes, a mullion and a transom, with blinds
 * across the top pane. Instance colors multiply through it, so the frame stays
 * dark on every lit window and the glass takes the window's color.
 */
function windowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 72;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the window texture");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 72);
  const glass = g.createLinearGradient(0, 6, 0, 66);
  glass.addColorStop(0, "#ffffff");
  glass.addColorStop(1, "#b8b6d0");
  g.fillStyle = glass;
  g.fillRect(6, 6, 52, 60);
  g.fillStyle = "#000";
  g.fillRect(31, 6, 2, 60);
  g.fillRect(6, 34, 52, 2);
  g.fillStyle = "rgba(0, 0, 0, 0.25)";
  for (let y = 9; y < 30; y += 4) g.fillRect(8, y, 48, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A palm leaf on an alpha card: a rib up the middle with leaflets off it, and
 * nothing between them, so the sky shows through the frond.
 */
function leafTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the leaf texture");
  g.strokeStyle = "#ffffff";
  g.lineCap = "round";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(32, 0);
  g.lineTo(32, 256);
  g.stroke();
  g.lineWidth = 2.5;
  for (let y = 8; y < 236; y += 8) {
    // leaflets are longest in the middle of the frond and short at both ends
    const reach = 12 + 22 * Math.sin(Math.PI * (y / 256));
    g.beginPath();
    g.moveTo(32, y);
    g.lineTo(32 - reach, y + 22);
    g.moveTo(32, y);
    g.lineTo(32 + reach, y + 22);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Shared across mounts, so a mesh that is torn down never frees them.
const GEOMETRY: Record<Shared, THREE.BufferGeometry> = {
  road: BOX,
  sidewalk: BOX,
  ground: BOX,
  lawn: BOX,
  planks: BOX,
  lane: BOX,
  brick: BOX,
  stucco: BOX,
  concrete: BOX,
  siding: BOX,
  curtain: BOX,
  band: BOX,
  roof: BOX,
  ledge: BOX,
  glow: BOX,
  awning: BOX,
  sign: BOX,
  tube: BOX,
  queue: CAPSULE,
  pole: CYLINDER,
  lamp: SPHERE,
  palmTrunk: CYLINDER,
  palmFrond: PLANE,
  treeTrunk: CYLINDER,
  treeCanopy: CANOPY,
  window: PLANE,
  panel: BOX,
  arch: BOX,
  bulb: BOX,
  car: CAR_BODY,
  carGlass: CAR_CABIN,
  furniture: BOX,
  glass: BOX,
  crowd: CAPSULE,
  head: SPHERE,
  hair: SPHERE,
  puddle: CIRCLE,
  steam: PUFF,
};

const FACADES: ReadonlySet<Kind> = new Set(FACADE_KINDS);
const isFacade = (kind: Kind): kind is FacadeKind => FACADES.has(kind);

// building walls come from facades.ts, built on first mount
const MATERIAL: Record<Exclude<Shared, FacadeKind>, THREE.Material> = {
  // wet asphalt: low roughness catches the neon as a soft sheen
  // wet asphalt (Poly Haven CC0), mapped by world position
  road: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("asphalt_02"),
      roughness: 0.55,
      metalness: 0.15,
      emissive: "#1a1036",
      emissiveIntensity: 0.5,
    }),
    0.25,
  ),
  sidewalk: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("brushed_concrete"),
      roughness: 0.6,
      emissive: "#2a1d52",
      emissiveIntensity: 0.45,
    }),
    0.35,
  ),
  // sand, lawns and the boardwalk: CC0 scans by world position, tinted per
  // instance
  ground: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("coast_sand_01"),
      roughness: 0.95,
      emissive: "#2a1d3a",
      emissiveIntensity: 0.35,
    }),
    0.3,
  ),
  lawn: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("leafy_grass"),
      roughness: 0.95,
      emissive: "#10241a",
      emissiveIntensity: 0.35,
    }),
    0.3,
  ),
  planks: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("wood_floor"),
      roughness: 0.8,
      emissive: "#2a1d3a",
      emissiveIntensity: 0.3,
    }),
    0.4,
  ),
  lane: new THREE.MeshBasicMaterial({ toneMapped: false }),
  band: new THREE.MeshBasicMaterial({ toneMapped: false }),
  roof: boxMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("concrete_wall_008"),
      roughness: 0.8,
    }),
    0.25,
  ),
  ledge: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 }),
  glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // flat-lit, so the striped colors read at night without a lamp on them
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
  // the leaf color comes from each frond's instance color, the shape from the alpha card
  palmFrond: animate(
    new THREE.MeshStandardMaterial({
      roughness: 0.6,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    }),
    { sway: true },
  ),
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
  const walls = facadeMaterials();
  const make = (kind: Shared) =>
    instanced(
      GEOMETRY[kind],
      isFacade(kind) ? walls[kind] : MATERIAL[kind],
      capacity[kind],
    );
  // the card and frame textures are drawn once, on first mount
  const windowMaterial = MATERIAL.window as THREE.MeshBasicMaterial;
  windowMaterial.map ??= windowTexture();
  const frond = MATERIAL.palmFrond as THREE.MeshStandardMaterial;
  frond.map ??= leafTexture();
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
    ground: make("ground"),
    lawn: make("lawn"),
    planks: make("planks"),
    lane: make("lane"),
    brick: make("brick"),
    stucco: make("stucco"),
    concrete: make("concrete"),
    siding: make("siding"),
    curtain: make("curtain"),
    band: make("band"),
    roof: make("roof"),
    ledge: make("ledge"),
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

// the kinds that are lit at night: neon, signs, lamps, bulbs and windows
const NIGHT_LIT: readonly Kind[] = [
  "band",
  "sign",
  "tube",
  "lamp",
  "panel",
  "arch",
  "bulb",
  "glow",
  "window",
];
// ground and walls carry a faint violet night glow so the dark side of the
// street still reads; by day the sun does that
const NIGHT_GLOW: readonly Kind[] = [
  "road",
  "sidewalk",
  "ground",
  "lawn",
  "planks",
];

/**
 * Dims the night for daylight (`night` 1 at night, 0 by day, from
 * src/game/city/daylight.ts): unlit neon is still colored glass, windows show
 * the sky instead of lamps, and the walls' and ground's night glow fades.
 */
export function dimForDay(meshes: KindMeshes, night: number): void {
  // street paint is flat-lit: white by day, dusky violet at night
  const lane = meshes.lane.material;
  if (lane instanceof THREE.MeshBasicMaterial)
    lane.color.setRGB(...laneTint(night));
  for (const kind of NIGHT_LIT) {
    const m = meshes[kind].material;
    if (m instanceof THREE.MeshBasicMaterial)
      m.color.setScalar(
        kind === "window" ? 0.4 + 0.6 * night : 0.3 + 0.7 * night,
      );
  }
  const glows: THREE.MeshStandardMaterial[] = [
    ...Object.values(facadeMaterials()),
    ...NIGHT_GLOW.map((k) => meshes[k].material).filter(
      (m): m is THREE.MeshStandardMaterial =>
        m instanceof THREE.MeshStandardMaterial,
    ),
  ];
  for (const m of glows) {
    const base: unknown = m.userData.nightGlow;
    const full = typeof base === "number" ? base : m.emissiveIntensity;
    m.userData.nightGlow = full;
    m.emissiveIntensity = full * (0.1 + 0.9 * night);
  }
}

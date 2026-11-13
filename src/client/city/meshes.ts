import * as THREE from "three";
import { whiteInstances } from "./instanceColor.ts";
import { sidewalkMaterial } from "./sidewalkLook.ts";
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
import { bakeShapes } from "./bake.ts";
import { laneTint } from "../../game/city/daylight.ts";
import { BAY_NIGHT, bayMaterial } from "./NycFacades.tsx";
import { LOT_NIGHT } from "./DistrictLots.tsx";

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

// Kinds drawn as one merged mesh, rebuilt on each reload (bake.ts), rather
// than instanced: software WebGL (SwiftShader) pays about as much for each
// instance as for a separate draw, and these are the static kinds with
// hundreds or thousands of pieces in view (window panes, sills, poles,
// bulbs, parked cars...). Their materials read the pieces' colors from vertex
// colors; animated ones take their phase from `aOrigin` (Motion.baked).
// Left instanced: the box- and world-mapped kinds (their shaders read the
// instance matrix), the facades, the labels, motion that needs the piece's
// own frame (sway, bob, drift), and the gate arches, whose posts stand out
// from the wall and stay clickable as walk targets (baked meshes skip
// raycasts).
type Baked = Exclude<Shared, FacadeKind>;
const BAKED: ReadonlySet<Kind> = new Set<Baked>([
  "lane",
  "band",
  "ledge",
  "glow",
  "awning",
  "sign",
  "tube",
  "pole",
  "lamp",
  "palmTrunk",
  "treeTrunk",
  "treeCanopy",
  "window",
  "panel",
  "bulb",
  "furniture",
  "glass",
  "puddle",
]);

// The label kind gets its own geometry and material, because each mount
// owns the atlas its names are drawn on.
type Shared = Exclude<Kind, "label">;

const BOX = new THREE.BoxGeometry(1, 1, 1);
// walls, trim and signs never show their undersides: BoxGeometry's faces run
// +x, -x, +y, -y, +z, -z (six indices each), so drop the -y face (ten triangles)
const BOX5 = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const index = g.getIndex();
  if (!index) throw new Error("BoxGeometry is indexed");
  const all = Array.from(index.array);
  g.setIndex([...all.slice(0, 18), ...all.slice(24)]);
  return g;
})();
const CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
// ground marks lie flat: only the top of the box is ever seen, so a plane
// (its top at y + sy / 2, where the box's top was) saves ten triangles each
const MARK = new THREE.PlaneGeometry(1, 1)
  .rotateX(-Math.PI / 2)
  .translate(0, 0.5, 0);
const SPHERE = new THREE.SphereGeometry(0.5, 10, 8);
// string-light bulbs and headlights: a low round blob (20 triangles), not a cube
const BULB = new THREE.IcosahedronGeometry(0.5, 0);
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

/** A soft round glow, white in the middle fading to nothing at the edge. */
function glowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d context for the glow texture");
  const fade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  fade.addColorStop(0, "#ffffff");
  fade.addColorStop(1, "#000000");
  g.fillStyle = fade;
  g.fillRect(0, 0, 64, 64);
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
  lane: MARK,
  brick: BOX5,
  stucco: BOX5,
  concrete: BOX5,
  siding: BOX5,
  curtain: BOX5,
  band: BOX5,
  roof: BOX5,
  roofGravel: BOX5,
  roofSkin: BOX5,
  ledge: BOX5,
  glow: BOX5,
  awning: BOX,
  sign: BOX5,
  tube: BOX5,
  pole: CYLINDER,
  lamp: SPHERE,
  palmTrunk: CYLINDER,
  palmFrond: PLANE,
  treeTrunk: CYLINDER,
  treeCanopy: CANOPY,
  window: PLANE,
  panel: BOX5,
  arch: BOX,
  bulb: BULB,
  furniture: BOX,
  glass: BOX,
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
    false,
    // patched, worn and darkened by tires across its length, so a far road
    // keeps some texture once the photo has blurred out
    0.6,
  ),
  sidewalk: sidewalkMaterial(),
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
    0.5,
  ),
  planks: worldMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("wood_floor_deck"),
      roughness: 0.85,
      emissive: "#2a1d3a",
      emissiveIntensity: 0.3,
    }),
    // weathered boards, laid crosswise to the way people walk the deck
    0.3,
    true,
  ),
  lane: new THREE.MeshBasicMaterial({ toneMapped: false }),
  band: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // three kinds of flat roof, each a CC0 Poly Haven set box-mapped by world
  // position (so a roof's size never stretches it): tar paper, tarred gravel
  // and a smooth membrane. The plan picks one and a color per building.
  roof: boxMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("bitumen"),
      roughness: 0.9,
    }),
    0.3,
  ),
  roofGravel: boxMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("tarred_gravel"),
      roughness: 0.95,
    }),
    0.5,
  ),
  roofSkin: boxMapped(
    new THREE.MeshStandardMaterial({
      ...groundMaps("white_plaster_02"),
      roughness: 0.6,
    }),
    0.2,
  ),
  ledge: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 }),
  glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
  // flat-lit, so the striped colors read at night without a lamp on them
  awning: new THREE.MeshBasicMaterial({ toneMapped: false }),
  sign: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
    baked: true,
  }),
  tube: new THREE.MeshBasicMaterial({ toneMapped: false }),
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
    baked: true,
  }),
  panel: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
    baked: true,
  }),
  arch: animate(new THREE.MeshBasicMaterial({ toneMapped: false }), {
    blink: true,
  }),
  bulb: new THREE.MeshBasicMaterial({ toneMapped: false }),
  furniture: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  glass: new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }),
  // neon spilling on the street: a soft additive pool that dimForDay fades
  // out by day (an opaque disk reads as a paint spot)
  puddle: new THREE.MeshBasicMaterial({
    map: glowTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0,
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

// the baked kinds carry their pieces' colors per vertex
for (const kind of BAKED)
  if (kind !== "label" && !isFacade(kind)) MATERIAL[kind].vertexColors = true;

export type KindMeshes = Record<Kind, THREE.InstancedMesh>;

function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  capacity: number,
): THREE.InstancedMesh {
  const mesh = whiteInstances(
    new THREE.InstancedMesh(geometry, material, capacity),
  );
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
  const make = (kind: Shared) => {
    const material = isFacade(kind) ? walls[kind] : MATERIAL[kind];
    if (!BAKED.has(kind))
      return instanced(GEOMETRY[kind], material, capacity[kind]);
    // one identity instance over its own merged geometry; clicks fall
    // through to the wall or road just behind, so its tens of thousands of
    // triangles are never raycast
    const mesh = instanced(new THREE.BufferGeometry(), material, 1);
    mesh.raycast = () => undefined;
    return mesh;
  };
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
    roofGravel: make("roofGravel"),
    roofSkin: make("roofSkin"),
    ledge: make("ledge"),
    glow: make("glow"),
    awning: make("awning"),
    sign: make("sign"),
    tube: make("tube"),
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
    furniture: make("furniture"),
    glass: make("glass"),
    puddle: make("puddle"),
    steam: make("steam"),
  };
}

export function disposeKindMeshes(meshes: KindMeshes) {
  for (const kind of KINDS) {
    meshes[kind].dispose();
    if (BAKED.has(kind)) meshes[kind].geometry.dispose();
  }
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
  if (kind !== "label" && BAKED.has(kind)) {
    mesh.geometry = bakeShapes(
      mesh.geometry,
      GEOMETRY[kind],
      items.length,
      (i, m, c) => place(items[i], kind, m, c),
    );
    mesh.count = items.length > 0 ? 1 : 0;
    mesh.computeBoundingSphere();
    return;
  }
  mesh.count = items.length;
  // only the label kind carries a per-instance atlas rectangle
  const names = kind === "label" ? mesh.geometry.getAttribute("aUv") : null;
  items.forEach((item, i) => {
    if (place(item, kind, matrix, color)) mesh.setColorAt(i, color);
    mesh.setMatrixAt(i, matrix);
    if (names && item.uv) names.setXYZW(i, ...item.uv);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (names) names.needsUpdate = true;
  // the bounds follow the instances, so frustum culling stays correct
  mesh.computeBoundingSphere();
}

/** Sets `m` to where `item` goes; sets `c` and returns true if it has a color. */
function place(
  item: Instance,
  kind: Kind,
  m: THREE.Matrix4,
  c: THREE.Color,
): boolean {
  const [rx = 0, ry = 0, rz = 0] = item.rot ?? [];
  euler.set(rx, ry, rz, "YXZ");
  quaternion.setFromEuler(euler);
  m.compose(
    position.set(item.x, item.y, item.z),
    quaternion,
    scale.set(item.sx, item.sy, item.sz),
  );
  if (!item.color) return false;
  c.set(item.color);
  if (GLOW.has(kind)) c.multiplyScalar(GLOW_SCALE);
  return true;
}

// the kinds that are lit at night: neon, signs, lamps, bulbs and windows
const NIGHT_LIT: readonly Kind[] = [
  "band",
  "sign",
  "tube",
  "lamp",
  "panel",
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
  BAY_NIGHT.value = night;
  LOT_NIGHT.value = night;
  const pool = meshes.puddle.material;
  if (pool instanceof THREE.MeshBasicMaterial) {
    pool.opacity = 0.55 * night;
    pool.visible = night > 0.02;
  }
  for (const kind of NIGHT_LIT) {
    const m = meshes[kind].material;
    if (m instanceof THREE.MeshBasicMaterial)
      m.color.setScalar(
        kind === "window" ? 0.4 + 0.6 * night : 0.3 + 0.7 * night,
      );
  }
  const glows: THREE.MeshStandardMaterial[] = [
    ...Object.values(facadeMaterials()),
    bayMaterial(),
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

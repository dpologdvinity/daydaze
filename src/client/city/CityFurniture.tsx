// The city's street furniture: lamp posts, hydrants, bins, benches, mailboxes,
// newspaper boxes, parking meters, bike racks, bus shelters and signs, drawn as
// instanced meshes at the spots the city plan gives (FurnitureSpot in
// src/game/city/furniture.ts). Models come from art/street/build_street.py
// (Quaternius Street Pack and Poly Haven, CC0, plus a few originals), one GLB
// per kind in public/models/street/, one instanced mesh per model part. Each
// kind is drawn out to its own range (FURNITURE_RANGE), shorter on the low
// tier, so the pieces cost almost nothing there. CityScene hands over the
// spots on every plan reload (`cityFurniture`). A kind's model is fetched when
// the plan first has a spot of that kind (the beach's umbrellas and the park's
// fountain stay unfetched until she is near), each in its own Suspense, so a
// late model never hides the ones already drawn.

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import * as THREE from "three";
import {
  MODEL_DIR,
  furnitureVisible,
  type FurnitureKind,
  type FurnitureSpot,
} from "../../game/city/furniture.ts";
import { machineColor } from "../../game/vending.ts";
import { paintVending } from "../vending/vendingLook.ts";
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
  /** The camera is pulled out to the overview: small props near her are not drawn. */
  overview: false,
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

/** The vending machine's lit front: its stock glows softly at night. */
export function glowVending(meshes: readonly THREE.InstancedMesh[], k: number) {
  for (const mesh of meshes) {
    const m = mesh.material;
    if (
      m instanceof THREE.MeshStandardMaterial &&
      m.name === "Vending_Machine"
    ) {
      // the glTF's emission map is the stock window: it lights up at night
      m.emissiveIntensity = 1.4 * k;
    }
  }
}

/** A vending machine's candy paint, one shared color per brand. */
const PAINT = new Map<string, THREE.Color>();
function paintOf(spot: FurnitureSpot): THREE.Color {
  const hex = machineColor(spot);
  let color = PAINT.get(hex);
  if (!color) PAINT.set(hex, (color = new THREE.Color(hex)));
  return color;
}

type Meshes = ReadonlyMap<FurnitureKind, THREE.InstancedMesh[]>;
const NO_MESHES: Meshes = new Map();

/** Beach gear is put away outside summer. */
const inSeason = (kind: FurnitureKind, summer: boolean): boolean =>
  summer ||
  !(kind === "umbrella-red" || kind === "umbrella-blue" || kind === "towel");

function place(
  meshes: Meshes,
  spots: readonly FurnitureSpot[],
  at: readonly [number, number],
  low: boolean,
  summer: boolean,
  overview: boolean,
) {
  const counts = new Map<THREE.InstancedMesh, number>();
  for (const f of spots) {
    if (!inSeason(f.kind, summer)) continue;
    if (
      !furnitureVisible(
        f.kind,
        Math.hypot(f.x - at[0], f.z - at[1]),
        low,
        overview,
      )
    )
      continue;
    q.setFromAxisAngle(up, f.yaw);
    p.set(f.x, f.y ?? 0, f.z);
    s.setScalar(f.scale);
    m.compose(p, q, s);
    for (const mesh of meshes.get(f.kind) ?? []) {
      const i = counts.get(mesh) ?? 0;
      if (i >= CAPACITY) continue;
      mesh.setMatrixAt(i, m);
      if (f.kind === "vending") mesh.setColorAt(i, paintOf(f));
      counts.set(mesh, i + 1);
    }
  }
  for (const parts of meshes.values())
    for (const mesh of parts) {
      mesh.count = counts.get(mesh) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  // how many of each kind are drawn (the first part's count), for browser tests
  return Object.fromEntries(
    [...meshes].map(([kind, parts]) => [kind, parts[0]?.count ?? 0]),
  );
}

/** One kind's instanced parts, with its look applied (bench boards, cut-out fence, candy paint). */
function buildKind(
  kind: FurnitureKind,
  scene: THREE.Object3D,
): THREE.InstancedMesh[] {
  const bench = BENCH_SURFACES[kind];
  const parts = partsOf(
    scene,
    TINT[kind] ?? null,
    undefined,
    bench &&
      ((name) => {
        const spec = bench[name];
        return spec && boxMapped(surface(...spec).clone(), spec[1]?.scale ?? 1);
      }),
  );
  // the chain fence's mesh is a cutout texture: cut, never blend, so a
  // row of panels never sorts wrongly against itself
  if (kind === "fence-chain")
    for (const mesh of parts)
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.transparent = false;
        mesh.material.alphaTest = 0.5;
        mesh.material.side = THREE.DoubleSide;
      }
  if (kind === "vending")
    for (const mesh of parts)
      if (mesh.material instanceof THREE.MeshStandardMaterial)
        paintVending(mesh.material, null);
  return parts;
}

/**
 * A kind's model, drawn from its parts: suspends while its file downloads (in
 * its own boundary) and reports the parts to CityFurniture, which places them.
 */
function FurnitureModel({
  kind,
  report,
}: {
  kind: FurnitureKind;
  report: (kind: FurnitureKind, parts: THREE.InstancedMesh[] | null) => void;
}): JSX.Element {
  const gltf = useGLTF(url(kind));
  const parts = useMemo(() => buildKind(kind, gltf.scene), [kind, gltf]);
  useEffect(() => {
    report(kind, parts);
    return () => {
      report(kind, null);
      disposeInstanced(parts, true);
    };
  }, [kind, parts, report]);
  return (
    <>
      {parts.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

export function CityFurniture({ summer }: { summer: boolean }): JSX.Element {
  const low = useQuality() === "low";
  const { spots, at, overview } = cityFurniture.use();
  const [meshes, setMeshes] = useState<Meshes>(NO_MESHES);
  const report = useCallback(
    (kind: FurnitureKind, parts: THREE.InstancedMesh[] | null) =>
      setMeshes((prev) => {
        const next = new Map(prev);
        if (parts) next.set(kind, parts);
        else next.delete(kind);
        return next;
      }),
    [],
  );
  // the kinds the plan has spots of now, and every kind it has had since
  const wanted = useMemo(() => {
    const kinds = new Set<FurnitureKind>();
    for (const f of spots) if (inSeason(f.kind, summer)) kinds.add(f.kind);
    return kinds;
  }, [spots, summer]);
  const seen = useRef(new Set<FurnitureKind>());
  for (const kind of wanted) seen.current.add(kind);
  // dim with the night like the rest of the city (dimForDay in meshes.ts)
  const { neon } = useDaylight();
  useEffect(() => {
    dimMeshes([...meshes.values()].flat(), 1 - 0.55 * neon);
    glowVending(meshes.get("vending") ?? [], neon);
  }, [meshes, neon]);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const drawn = place(meshes, spots, at, low, summer, overview);
    // read by the screenshot script and tests: the models are in and placed
    if (DEBUG) canvas.dataset.furnitureKinds = JSON.stringify(drawn);
    if (spots.length > 0 && [...wanted].every((kind) => meshes.has(kind)))
      canvas.dataset.furniture = "ready";
  }, [meshes, wanted, spots, at, low, summer, overview, canvas]);
  return (
    <>
      {[...seen.current].map((kind) => (
        <Suspense key={kind} fallback={null}>
          <FurnitureModel kind={kind} report={report} />
        </Suspense>
      ))}
    </>
  );
}

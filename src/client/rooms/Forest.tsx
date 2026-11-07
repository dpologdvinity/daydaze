// The Larkspur Forest Trail (game/forest.ts): a dirt path winding north
// through the woods from the trailhead, a creek under a plank bridge, benches,
// clearings with deer, a fox and rabbits, and a lookout deck. The trees,
// undergrowth and props are instanced downloads (Quaternius' Ultimate Nature
// Pack and Textured Stylized Trees, the park's picnic table), one
// InstancedMesh per kind; the low tier keeps half the trees. The soft-edged
// path, the rippling creek, the slatted benches and the decks are small merged
// meshes; rocks and bushes are smooth-shaded.

import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  BENCH_SPOTS,
  BOUNDS,
  BRIDGE,
  CREEK,
  CREEK_STONES,
  LOOKOUT,
  LOOKOUT_RAIL,
  LOW_TREE_SHARE,
  PATH,
  PATH_WIDTH,
  PICNIC_SPOT,
  PLANTS_SPOTS,
  TREES,
  WILDLIFE,
  creekZ,
  type PlantId,
  type TreeId,
} from "../../game/forest.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { Vec2 } from "../../game/walk.ts";
import { surface } from "../city/worldTexture.ts";
import { WanderingCreature } from "../creatures/Wanderer.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useReducedMotion } from "../motion.ts";
import { useQuality } from "../world/quality.ts";
import { Batch } from "./shared/batch.ts";
import type { PickHandler } from "./shared/Floor.tsx";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Hikers } from "./forest/Hikers.tsx";
import { Scatter } from "./zoo/Scatter.tsx";

const { x0, x1, z0, z1 } = BOUNDS;

/** The textured trees' leaves are cut out; the rest are vertex-colored. */
const TEXTURED: ReadonlySet<TreeId> = new Set([
  "tree-3",
  "tbirch-4",
  "tpine-2",
]);
const model = (id: string) => `/models/forest/${id}.glb`;

/** Cross-section of a ribbon: offsets across it (-1 left edge .. 1 right edge)
 * and the RGBA each carries, so a path or creek fades into the ground. */
type Section = readonly (readonly [number, number, number, number, number])[];
const PATH_SECTION: Section = [
  [-1, 1, 1, 1, 0],
  [-0.62, 1, 1, 1, 1],
  [0.62, 1, 1, 1, 1],
  [1, 1, 1, 1, 0],
];
/** Shallow edges are pale and see-through, the middle deep and darker. */
const CREEK_SECTION: Section = [
  [-1, 0.3, 0.5, 0.42, 0.3],
  [-0.55, 0.1, 0.3, 0.38, 0.88],
  [0.55, 0.1, 0.3, 0.38, 0.88],
  [1, 0.3, 0.5, 0.42, 0.3],
];

/** A flat ribbon along `line`, `width` wide, `y` above the ground, with UVs
 * running along its length (a meter is one repeat) and the section's vertex
 * colors, so its edges blend into the ground instead of cutting off. */
function ribbon(
  line: readonly Vec2[],
  width: number,
  y: number,
  section: Section,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const cols = section.length;
  let run = 0;
  line.forEach(([x, z], i) => {
    const a = line[Math.max(0, i - 1)] as Vec2;
    const b = line[Math.min(line.length - 1, i + 1)] as Vec2;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    // the left-hand normal, in the ground plane
    const nx = -dz / len;
    const nz = dx / len;
    if (i > 0) {
      const p = line[i - 1] as Vec2;
      run += Math.hypot(x - p[0], z - p[1]);
    }
    for (const [off, r, g, bl, al] of section) {
      pos.push(x + (nx * width * off) / 2, y, z + (nz * width * off) / 2);
      uv.push((off + 1) / 2, run / width);
      col.push(r, g, bl, al);
    }
    if (i > 0) {
      for (let c = 0; c < cols - 1; c++) {
        const k = i * cols + c;
        const q = k - cols;
        idx.push(q, q + 1, k, q + 1, k + 1, k);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the winding above faces down on some bends: normals point up regardless
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

/** The soft-edged ribbons: vertex alpha fades them into the grass. */
const soft = (m: THREE.MeshStandardMaterial) => {
  const c = m.clone();
  c.vertexColors = true;
  c.transparent = true;
  c.depthWrite = false;
  c.polygonOffset = true;
  c.polygonOffsetFactor = -1;
  return c;
};
/** The ground: the city's CC0 grass with its tiling breakup and weathering. */
const GRASS = surface("leafy_grass", { scale: 0.25, color: "#6a9a4c" });

/** Soft dark patches (leaf litter and shade under the trees) laid over the
 * grass: one value-noise texture, stretched over the whole floor. */
const LITTER = (() => {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  const cells = 12;
  const grid = Array.from({ length: cells * cells }, (_, i) => {
    const h = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return h - Math.floor(h);
  });
  if (g) {
    const img = g.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        // bilinear value noise on a wrapping grid, two octaves
        let v = 0;
        for (const [o, w] of [
          [1, 0.65],
          [2, 0.35],
        ] as const) {
          const fx = ((x / n) * cells * o) % cells;
          const fy = ((y / n) * cells * o) % cells;
          const x0 = Math.floor(fx);
          const y0 = Math.floor(fy);
          const tx = fx - x0;
          const ty = fy - y0;
          const at = (i: number, j: number) =>
            grid[(j % cells) * cells + (i % cells)] ?? 0;
          const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
          const bot = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
          v += (top * (1 - ty) + bot * ty) * w;
        }
        const i = (y * n + x) * 4;
        img.data[i] = 46;
        img.data[i + 1] = 34;
        img.data[i + 2] = 18;
        img.data[i + 3] = Math.max(0, Math.min(1, (v - 0.35) * 2.2)) * 150;
      }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2.5);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({
    map: t,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
})();

const DIRT = soft(surface("park_sand", { scale: 0.45, color: "#c9a574" }));
const MUD = soft(surface("park_sand", { scale: 0.3, color: "#5f4630" }));
const time = { value: 0 };
/** Creek water: scrolling ripple normals and glints over a depth tint. */
const WATER = (() => {
  const m = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    roughness: 0.12,
    metalness: 0.05,
    emissive: "#0b4660",
    emissiveIntensity: 0.12,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec2 vCreek;\nvoid main() {")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvCreek = (modelMatrix * vec4(transformed, 1.0)).xz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uTime;\nvarying vec2 vCreek;\nvoid main() {",
      )
      .replace(
        "#include <normal_fragment_maps>",
        [
          "#include <normal_fragment_maps>",
          // two crossing ripple trains tilt the normal; the creek flows toward +x
          "vec2 rp = vCreek * vec2(2.4, 3.1);",
          "float r1 = sin(rp.x * 2.0 - uTime * 1.6 + sin(rp.y * 1.7) * 1.3);",
          "float r2 = sin(rp.y * 2.3 + rp.x * 0.8 - uTime * 1.1);",
          "normal = normalize(normal + vec3(r1 * 0.09, 0.0, r2 * 0.09));",
        ].join("\n"),
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          "float glint = pow(max(0.0, sin(vCreek.x * 3.7 - uTime * 2.2) * sin(vCreek.y * 4.3 + uTime)), 18.0);",
          "totalEmissiveRadiance += vec3(0.5, 0.7, 0.8) * glint * 0.7;",
        ].join("\n"),
      );
  };
  return m;
})();
const PLANK = surface("oak_wood_planks", { scale: 1, color: "#e0cba6" });
const IRON = surface("metal_plate", {
  scale: 1,
  color: "#2b2f2e",
  metalness: 0.4,
  roughness: 0.6,
});
const POST = surface("oak_wood_planks", { scale: 1, color: "#6e5233" });
const HILL = new THREE.MeshBasicMaterial({ color: "#7ea58f", fog: true });
const HILL_FAR = new THREE.MeshBasicMaterial({ color: "#9bbfb0", fog: true });

/** The path, the creek and its banks, the bridge, the lookout deck and the hills beyond it. */
function useGrounds() {
  return useMemo(() => {
    const b = new Batch();
    const creek: Vec2[] = [];
    for (let x = x0; x <= x1; x += 1) creek.push([x, creekZ(x)]);
    b.add(ribbon(creek, CREEK.halfWidth * 2 + 2, 0.02, PATH_SECTION), MUD);
    b.add(ribbon(creek, CREEK.halfWidth * 2.3, 0.05, CREEK_SECTION), WATER);
    b.add(ribbon(PATH, PATH_WIDTH * 1.5, 0.03, PATH_SECTION), DIRT);
    // the bridge: a low plank deck with a rail each side, over the creek
    const bz = creekZ(BRIDGE.x);
    b.add(new THREE.BoxGeometry(BRIDGE.width, 0.08, BRIDGE.length), PLANK, {
      position: [BRIDGE.x, 0.1, bz],
    });
    for (const side of [-1, 1]) {
      const rx = BRIDGE.x + (side * BRIDGE.width) / 2;
      b.add(new THREE.BoxGeometry(0.1, 0.1, BRIDGE.length), POST, {
        position: [rx, 0.95, bz],
      });
      for (const end of [-1, 0, 1])
        b.add(new THREE.BoxGeometry(0.14, 1, 0.14), POST, {
          position: [rx, 0.5, bz + (end * BRIDGE.length) / 2.2],
        });
    }
    // park benches: three slats and a two-slat back on iron legs
    for (const { x, z, yaw } of BENCH_SPOTS) {
      const at = (
        lx: number,
        ly: number,
        lz: number,
      ): [number, number, number] => [
        x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
        ly,
        z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
      ];
      const rot: [number, number, number] = [0, yaw, 0];
      for (const lz of [-0.18, 0, 0.18])
        b.add(new THREE.BoxGeometry(1.7, 0.05, 0.14), PLANK, {
          position: at(0, 0.5, lz),
          rotation: rot,
        });
      for (const ly of [0.72, 0.9])
        b.add(new THREE.BoxGeometry(1.7, 0.12, 0.04), PLANK, {
          position: at(0, ly, -0.3),
          rotation: rot,
        });
      for (const lx of [-0.8, 0.8]) {
        b.add(new THREE.BoxGeometry(0.06, 0.5, 0.5), IRON, {
          position: at(lx, 0.25, 0),
          rotation: rot,
        });
        b.add(new THREE.BoxGeometry(0.06, 0.45, 0.06), IRON, {
          position: at(lx, 0.72, -0.3),
          rotation: rot,
        });
      }
    }
    // the lookout deck
    b.add(
      new THREE.BoxGeometry(
        LOOKOUT.x1 - LOOKOUT.x0,
        0.1,
        LOOKOUT.z1 - LOOKOUT.z0,
      ),
      PLANK,
      {
        position: [
          (LOOKOUT.x0 + LOOKOUT.x1) / 2,
          0.08,
          (LOOKOUT.z0 + LOOKOUT.z1) / 2,
        ],
      },
    );
    // hills far beyond the rail: flat-shaded, fading into the fog
    [
      [-30, -92, 30, 16],
      [6, -100, 38, 22],
      [40, -90, 28, 14],
      [-6, -118, 50, 26],
    ].forEach(([hx, hz, r, h], i) => {
      const g = new THREE.SphereGeometry(
        1,
        10,
        6,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      b.add(g, i === 3 ? HILL_FAR : HILL, {
        position: [hx as number, -1, hz as number],
        scale: [r as number, h as number, (r as number) * 0.8],
      });
    });
    return b.build();
  }, []);
}

/** The woods: each tree kind is one InstancedMesh; the low tier thins them. */
function Woods({ share }: { share: number }): JSX.Element {
  const byKind = useMemo(() => {
    const map = new Map<TreeId, (typeof TREES)[number][]>();
    for (const t of TREES) {
      if (t.rank > share) continue;
      const list = map.get(t.id) ?? [];
      list.push(t);
      map.set(t.id, list);
    }
    return [...map];
  }, [share]);
  return (
    <>
      {byKind.map(([id, spots]) => (
        <Scatter
          key={id}
          url={model(id)}
          spots={spots}
          cutout={TEXTURED.has(id)}
        />
      ))}
    </>
  );
}

/** Undergrowth: grass, flowers, bushes, rocks, logs and stumps. */
function Undergrowth({ share }: { share: number }): JSX.Element {
  const byKind = useMemo(() => {
    const map = new Map<PlantId, (typeof PLANTS_SPOTS)[number][]>();
    PLANTS_SPOTS.forEach((p, i) => {
      if (i / PLANTS_SPOTS.length > share) return;
      const list = map.get(p.id) ?? [];
      list.push(p);
      map.set(p.id, list);
    });
    return [...map];
  }, [share]);
  return (
    <>
      {byKind.map(([id, spots]) => (
        <Scatter
          key={id}
          url={model(id)}
          spots={spots}
          smooth={/^(rock|bush)/.test(id)}
        />
      ))}
    </>
  );
}

/**
 * The Forest Trail scene. `player` is read by the wandering animals, which
 * turn to look at a visitor who comes near.
 */
export function Forest({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const tier = useQuality();
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (!calm) time.value = clock.elapsedTime;
  });
  const grounds = useGrounds();
  const share = tier === "low" ? LOW_TREE_SHARE : 1;
  return (
    <>
      <color attach="background" args={["#a9d6e8"]} />
      <fog attach="fog" args={["#bfe0d0", 28, 95]} />
      <hemisphereLight args={["#fff8e0", "#3d6b34", 1.9]} />
      <directionalLight
        position={[-12, 22, 10]}
        intensity={1.7}
        color="#fff1cf"
      />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, (z0 + z1) / 2]}
        onClick={(e) => {
          // a drag is an orbit, not a walk order
          if (e.delta > 6) return;
          e.stopPropagation();
          onPick([e.point.x, e.point.z]);
        }}
        name="floor"
      >
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <primitive object={GRASS} attach="material" />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.012, (z0 + z1) / 2]}
        raycast={() => null}
      >
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <primitive object={LITTER} attach="material" />
      </mesh>
      <PortalPads room={ROOMS.forest} color="#b7e4c7" />
      <primitive object={grounds} />
      <NeonText
        text="LARKSPUR TRAIL"
        color="#2d6a4f"
        font={MARQUEE}
        width={5}
        k={1.2}
        position={[0, 3.2, z1 - 0.5]}
        rotation-y={Math.PI}
      />
      <Suspense fallback={null}>
        <Woods share={share} />
        <Undergrowth share={tier === "low" ? 0.6 : 1} />
        <Scatter
          url="/models/park/picnic-table.glb"
          spots={[{ ...PICNIC_SPOT, sx: 0.85, sy: 0.85, sz: 0.85 }]}
          color="#b89870"
        />
        {(["rock-moss-1", "rock-moss-3", "rock-5"] as const).map((id) => (
          <Scatter
            key={id}
            url={model(id)}
            spots={CREEK_STONES.filter((r) => r.id === id)}
            smooth
          />
        ))}
        <Scatter
          url="/models/zoo/fence_planks.glb"
          spots={LOOKOUT_RAIL.map((s) => ({ ...s, y: 0.1 }))}
          color="#7a5232"
        />
        {WILDLIFE.filter((w) => !(w.highOnly && tier === "low")).map((w, i) => (
          <WanderingCreature
            key={i}
            kind={w.kind}
            pen={w.pen}
            speed={w.speed}
            phase={w.phase}
            dir={w.dir}
            player={player}
          />
        ))}
        <Hikers />
      </Suspense>
    </>
  );
}

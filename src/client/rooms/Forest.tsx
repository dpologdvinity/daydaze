// The Larkspur Forest Trail (game/forest.ts): a dirt path winding north
// through the woods from the trailhead, a creek under a plank bridge, benches,
// clearings with deer, a fox and rabbits, and a lookout deck. The trees,
// undergrowth and props are instanced downloads (Quaternius' Ultimate Nature
// Pack and Textured Stylized Trees, the park's duck and picnic table, the
// street bench), one InstancedMesh per kind; the low tier keeps 60% of the
// trees. The path, creek and decks are small merged meshes.

import { Suspense, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  BENCH_SPOTS,
  BOUNDS,
  BRIDGE,
  CREEK,
  DUCK_SPOTS,
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
import { useQuality } from "../world/quality.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
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

/** A flat ribbon along `line`, `width` wide, `y` above the ground, with UVs
 * running along its length (a meter of path is one repeat). */
function ribbon(
  line: readonly Vec2[],
  width: number,
  y: number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
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
    pos.push(
      x + (nx * width) / 2,
      y,
      z + (nz * width) / 2,
      x - (nx * width) / 2,
      y,
      z - (nz * width) / 2,
    );
    uv.push(0, run / width, 1, run / width);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the winding above faces down on some bends: normals point up regardless
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

const DIRT = surface("park_sand", { scale: 0.45, color: "#d2b585" });
const MUD = surface("park_sand", { scale: 0.3, color: "#5f4630" });
const WATER = new THREE.MeshStandardMaterial({
  color: "#4aa3c9",
  emissive: "#0d4f6e",
  emissiveIntensity: 0.35,
  roughness: 0.15,
  metalness: 0.1,
});
const PLANK = surface("oak_wood_planks", { scale: 1, color: "#e0cba6" });
const POST = surface("oak_wood_planks", { scale: 1, color: "#6e5233" });
const HILL = new THREE.MeshBasicMaterial({ color: "#7ea58f", fog: true });
const HILL_FAR = new THREE.MeshBasicMaterial({ color: "#9bbfb0", fog: true });

/** The path, the creek and its banks, the bridge, the lookout deck and the hills beyond it. */
function useGrounds() {
  return useMemo(() => {
    const b = new Batch();
    b.add(ribbon(PATH, PATH_WIDTH, 0.03), DIRT);
    const creek: Vec2[] = [];
    for (let x = x0; x <= x1; x += 1) creek.push([x, creekZ(x)]);
    b.add(ribbon(creek, CREEK.halfWidth * 2 + 1.2, 0.02), MUD);
    b.add(ribbon(creek, CREEK.halfWidth * 2, 0.05), WATER);
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
        <Scatter key={id} url={model(id)} spots={spots} />
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
      <Floor
        width={x1 - x0}
        depth={z1 - z0}
        center={[0, (z0 + z1) / 2]}
        color="#5d8f45"
        texture={{ id: "leafy_grass", scale: 0.25 }}
        low={{ metalness: 0, roughness: 0.9 }}
        mirror={0}
        onPick={onPick}
      />
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
          url="/models/street/bench.glb"
          spots={BENCH_SPOTS.map((s) => ({ ...s, sx: 0.8, sy: 0.8, sz: 0.8 }))}
          color="#b89870"
        />
        <Scatter
          url="/models/park/picnic-table.glb"
          spots={[{ ...PICNIC_SPOT, sx: 0.85, sy: 0.85, sz: 0.85 }]}
          color="#b89870"
        />
        <Scatter
          url="/models/park/duck.glb"
          spots={DUCK_SPOTS.map((s) => ({
            ...s,
            y: 0.05,
            sx: 1.8,
            sy: 1.8,
            sz: 1.8,
          }))}
        />
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

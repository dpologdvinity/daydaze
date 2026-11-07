// Dressing for the Suburbia Community Garden: the brick paths, the picket fence
// with its rose arch, the neighbors' beds already growing, tomato cages, flower
// borders, a greenhouse and cold frames, the bench, scarecrow and tool rack, and
// a few butterflies. Everything repeated is instanced (zoo/Scatter) or merged
// into one mesh per material (shared/batch), so the whole lot costs a few
// dozen draw calls on the low tier.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BENCH_POS,
  BOUNDS,
  COLD_FRAMES,
  GARDEN_FENCE_SPOTS,
  GARDEN_PATHS,
  GATE_HALF,
  GREENHOUSE_POS,
  NEIGHBOR_BEDS,
  RAISED_BEDS,
  SCARECROW_POS,
  TOOL_RACK_POS,
  type GardenPlotState,
} from "../../../game/garden.ts";
import type { Spot } from "../../../game/zoo.ts";
import { surface } from "../../city/worldTexture.ts";
import { Batch } from "../shared/batch.ts";
import { Scatter } from "../zoo/Scatter.tsx";

/** How big each crop model stands in a bed (shared with the player's own crops). */
export const CROP_SCALE = {
  sunflower: 0.95,
  tomato: 0.88,
  pepper: 0.82,
  strawberry: 0.76,
  herb: 0.84,
} as const;

/** Where the four plants of a bed stand, relative to the bed's center. */
export const BED_OFFSETS: readonly (readonly [number, number])[] = [
  [-0.7, -0.4],
  [0.7, -0.4],
  [-0.7, 0.4],
  [0.7, 0.4],
];

const WOOD_WHITE = new THREE.MeshStandardMaterial({
  color: "#f4efe4",
  roughness: 0.7,
});
const WOOD = new THREE.MeshStandardMaterial({
  color: "#9a6a43",
  roughness: 0.85,
});
const WIRE = new THREE.MeshStandardMaterial({
  color: "#8d949a",
  roughness: 0.45,
  metalness: 0.6,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#dff3ee",
  transparent: true,
  opacity: 0.28,
  roughness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const ROSE = new THREE.MeshStandardMaterial({
  color: "#e8557f",
  roughness: 0.6,
});
const ROSE_PALE = new THREE.MeshStandardMaterial({
  color: "#ffb3cb",
  roughness: 0.6,
});
const LEAF = new THREE.MeshStandardMaterial({
  color: "#3f8a3a",
  roughness: 0.8,
});
const PATH = surface("red_sandstone_pavement", {
  scale: 1.2,
  color: "#d7b79a",
  roughness: 0.9,
});

/** Cheap deterministic 0..1 noise from an integer, so scatters look the same every visit. */
function noise(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A brick path rectangle lying just above the lawn. */
function Paths(): JSX.Element {
  return (
    <>
      {GARDEN_PATHS.map((p, i) => (
        <mesh
          key={i}
          position={[(p.x0 + p.x1) / 2, 0.02, (p.z0 + p.z1) / 2]}
          material={PATH}
          receiveShadow
        >
          <boxGeometry args={[p.x1 - p.x0, 0.04, p.z1 - p.z0]} />
        </mesh>
      ))}
    </>
  );
}

/** Continuous white pickets round the lot. */
function Fence(): JSX.Element {
  return (
    <Scatter
      url="/models/garden/picket.glb"
      spots={GARDEN_FENCE_SPOTS}
      color="#f6f0e4"
    />
  );
}

/** The gate: two white posts and an arch smothered in climbing roses. */
function GateArch(): JSX.Element {
  const group = useMemo(() => {
    const b = new Batch();
    const z = BOUNDS.z1;
    const r = GATE_HALF + 0.1;
    for (const x of [-r, r]) {
      b.add(new THREE.BoxGeometry(0.3, 2.8, 0.3), WOOD_WHITE, {
        position: [x, 1.4, z],
      });
      b.add(new THREE.BoxGeometry(0.4, 0.12, 0.4), WOOD_WHITE, {
        position: [x, 2.86, z],
      });
    }
    b.add(new THREE.TorusGeometry(r, 0.07, 8, 28, Math.PI), WOOD_WHITE, {
      position: [0, 2.8, z],
    });
    // roses and leaves climbing the arch and both posts
    const bloom = new THREE.SphereGeometry(0.13, 8, 6);
    const leaf = new THREE.SphereGeometry(0.17, 7, 5);
    for (let i = 0; i < 34; i++) {
      const a = (i / 33) * Math.PI;
      const jx = (noise(i) - 0.5) * 0.25;
      const jz = (noise(i + 50) - 0.5) * 0.3;
      const x = Math.cos(a) * r + jx;
      const y = 2.8 + Math.sin(a) * r;
      b.add(leaf, LEAF, { position: [x, y, z + jz], scale: [1, 0.8, 1.2] });
      if (i % 2 === 0)
        b.add(bloom, i % 4 === 0 ? ROSE : ROSE_PALE, {
          position: [x * 0.99, y + 0.06, z + jz + 0.12],
        });
    }
    for (const side of [-1, 1])
      for (let k = 0; k < 8; k++) {
        const y = 0.4 + k * 0.3;
        const x = side * r + (noise(k + side * 9) - 0.5) * 0.2;
        b.add(leaf, LEAF, { position: [x, y, z], scale: [1, 1.1, 1.2] });
        if (k % 2)
          b.add(bloom, k % 4 === 1 ? ROSE : ROSE_PALE, {
            position: [x, y + 0.05, z + 0.17],
          });
      }
    return b.build();
  }, []);
  useEffect(
    () => () => {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
    [group],
  );
  return <primitive object={group} />;
}

/** The neighbors' crops in every bed that is not yours yet, with tomato cages. */
function NeighborBeds({
  plots,
}: {
  plots: readonly GardenPlotState[];
}): JSX.Element {
  const key = plots.map((p) => (p.claimed ? 1 : 0)).join("");
  const groups = useMemo(() => {
    const byModel = new Map<string, Spot[]>();
    for (const n of NEIGHBOR_BEDS) {
      if (plots[n.bed]?.claimed) continue;
      const [bx, bz] = RAISED_BEDS[n.bed].position;
      const url = `/models/garden/${n.crop}-${n.stage}.glb`;
      const list = byModel.get(url) ?? [];
      const s = CROP_SCALE[n.crop];
      BED_OFFSETS.forEach(([dx, dz], i) =>
        list.push({
          x: bx + dx,
          y: 0.4,
          z: bz + dz,
          yaw: noise(n.bed * 7 + i) * 6.28,
          sx: s,
          sy: s,
          sz: s,
        }),
      );
      byModel.set(url, list);
    }
    return [...byModel.entries()];
    // plots are read through their claimed flags only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const cages = useMemo(() => {
    const b = new Batch();
    const rod = new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5);
    const ring = new THREE.TorusGeometry(0.2, 0.01, 4, 14);
    for (const n of NEIGHBOR_BEDS) {
      if (n.crop !== "tomato" || plots[n.bed]?.claimed) continue;
      const [bx, bz] = RAISED_BEDS[n.bed].position;
      for (const [dx, dz] of BED_OFFSETS) {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          b.add(rod, WIRE, {
            position: [
              bx + dx + Math.cos(a) * 0.2,
              0.95,
              bz + dz + Math.sin(a) * 0.2,
            ],
          });
        }
        for (const y of [0.6, 0.95, 1.3])
          b.add(ring, WIRE, {
            position: [bx + dx, y, bz + dz],
            rotation: [Math.PI / 2, 0, 0],
          });
      }
    }
    return b.build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(
    () => () => {
      cages.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
    [cages],
  );
  return (
    <>
      {groups.map(([url, spots]) => (
        <Scatter key={url} url={url} spots={spots} />
      ))}
      <primitive object={cages} />
    </>
  );
}

/** Flower borders along the fence and either side of the gate, and hedges by the arch. */
function Borders(): JSX.Element {
  const sets = useMemo(() => {
    const three: Spot[] = [];
    const four: Spot[] = [];
    const bush: Spot[] = [];
    const add = (x: number, z: number, i: number) => {
      const s = 0.55 + noise(i) * 0.35;
      const spot = {
        x,
        y: 0,
        z,
        yaw: noise(i + 9) * 6.28,
        sx: s,
        sy: s,
        sz: s,
      };
      (i % 3 === 0 ? three : i % 3 === 1 ? four : bush).push(spot);
    };
    let i = 0;
    for (let x = BOUNDS.x0 + 1.2; x <= BOUNDS.x1 - 1.2; x += 1.5)
      add(x, BOUNDS.z0 + 0.9, i++);
    for (let z = BOUNDS.z0 + 2.4; z <= BOUNDS.z1 - 1.5; z += 1.9) {
      add(BOUNDS.x0 + 0.9, z, i++);
      add(BOUNDS.x1 - 0.9, z, i++);
    }
    for (let x = GATE_HALF + 1.5; x <= BOUNDS.x1 - 1.5; x += 1.6) {
      add(x, BOUNDS.z1 - 0.9, i++);
      add(-x, BOUNDS.z1 - 0.9, i++);
    }
    return { three, four, bush };
  }, []);
  const hedges = useMemo<Spot[]>(
    () =>
      [-1, 1].map((side) => ({
        x: side * (GATE_HALF + 2.3),
        y: 0,
        z: BOUNDS.z1 - 0.5,
        yaw: 0,
        sx: 1.1,
        sy: 0.9,
        sz: 0.5,
      })),
    [],
  );
  return (
    <>
      <Scatter url="/models/nature/flower-3-group-lo.glb" spots={sets.three} />
      <Scatter url="/models/nature/flower-4-group-lo.glb" spots={sets.four} />
      <Scatter
        url="/models/nature/bush-common-flowers-lo.glb"
        spots={sets.bush}
      />
      <Scatter url="/models/garden/hedge.glb" spots={hedges} />
    </>
  );
}

/** A small greenhouse (white frame, glass walls, gabled roof, a bench of plants) and two cold frames. */
function Greenhouse(): JSX.Element {
  const group = useMemo(() => {
    const b = new Batch();
    const [gx, gz] = GREENHOUSE_POS;
    const w = 4.2;
    const d = 3.2;
    const h = 2.1;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        b.add(new THREE.BoxGeometry(0.1, h, 0.1), WOOD_WHITE, {
          position: [gx + sx * (w / 2), h / 2, gz + sz * (d / 2)],
        });
    for (const y of [0.05, h])
      for (const sz of [-1, 1])
        b.add(new THREE.BoxGeometry(w, 0.1, 0.1), WOOD_WHITE, {
          position: [gx, y, gz + sz * (d / 2)],
        });
    for (const y of [0.05, h])
      for (const sx of [-1, 1])
        b.add(new THREE.BoxGeometry(0.1, 0.1, d), WOOD_WHITE, {
          position: [gx + sx * (w / 2), y, gz],
        });
    // gabled roof: two slopes of glass and a ridge
    const slope = Math.atan2(0.9, d / 2);
    const panel = Math.hypot(0.9, d / 2);
    for (const sz of [-1, 1])
      b.add(new THREE.BoxGeometry(w, 0.03, panel), GLASS, {
        position: [gx, h + 0.45, gz + sz * (d / 4)],
        rotation: [-sz * slope, 0, 0],
      });
    b.add(new THREE.BoxGeometry(w + 0.1, 0.08, 0.08), WOOD_WHITE, {
      position: [gx, h + 0.9, gz],
    });
    // glass walls
    for (const sz of [-1, 1])
      b.add(new THREE.BoxGeometry(w, h, 0.03), GLASS, {
        position: [gx, h / 2, gz + sz * (d / 2)],
      });
    for (const sx of [-1, 1])
      b.add(new THREE.BoxGeometry(0.03, h, d), GLASS, {
        position: [gx + sx * (w / 2), h / 2, gz],
      });
    // the potting bench inside
    b.add(new THREE.BoxGeometry(w - 0.8, 0.08, 0.9), WOOD, {
      position: [gx, 0.8, gz - 0.7],
    });
    for (const sx of [-1, 1])
      b.add(new THREE.BoxGeometry(0.08, 0.8, 0.8), WOOD, {
        position: [gx + sx * (w / 2 - 0.5), 0.4, gz - 0.7],
      });
    // cold frames: a low timber box with a sloped glass lid
    for (const [fx, fz] of COLD_FRAMES) {
      b.add(new THREE.BoxGeometry(2.6, 0.4, 0.08), WOOD, {
        position: [fx, 0.2, fz - 0.6],
      });
      b.add(new THREE.BoxGeometry(2.6, 0.7, 0.08), WOOD, {
        position: [fx, 0.35, fz + 0.6],
        scale: [1, 0.6, 1],
      });
      for (const sx of [-1, 1])
        b.add(new THREE.BoxGeometry(0.08, 0.4, 1.28), WOOD, {
          position: [fx + sx * 1.3, 0.2, fz],
        });
      b.add(new THREE.BoxGeometry(2.6, 0.03, 1.3), GLASS, {
        position: [fx, 0.5, fz],
        rotation: [-0.28, 0, 0],
      });
    }
    return b.build();
  }, []);
  useEffect(
    () => () => {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
    [group],
  );
  const [gx, gz] = GREENHOUSE_POS;
  const pots = useMemo<Spot[]>(
    () =>
      [-1.2, -0.4, 0.4, 1.2].map((dx, i) => ({
        x: gx + dx,
        y: 0.85,
        z: gz - 0.7,
        yaw: i,
        sx: 0.4,
        sy: 0.4,
        sz: 0.4,
      })),
    [gx, gz],
  );
  const seedlings = useMemo<Spot[]>(
    () =>
      COLD_FRAMES.flatMap(([fx, fz]) =>
        [-0.8, 0, 0.8].map((dx, i) => ({
          x: fx + dx,
          y: 0.05,
          z: fz,
          yaw: i * 2,
          sx: 0.4,
          sy: 0.4,
          sz: 0.4,
        })),
      ),
    [],
  );
  return (
    <>
      <primitive object={group} />
      <Scatter url="/models/nature/flower-4-group-lo.glb" spots={pots} />
      <Scatter url="/models/nature/flower-3-group-lo.glb" spots={seedlings} />
    </>
  );
}

/** The bench, scarecrow, tool rack with its shovel and rake, and a few watering cans. */
function Furniture(): JSX.Element {
  const bench = useMemo<Spot[]>(
    () => [
      {
        x: BENCH_POS[0],
        y: 0,
        z: BENCH_POS[1],
        yaw: Math.PI,
        sx: 2.6,
        sy: 2.6,
        sz: 2.6,
      },
    ],
    [],
  );
  const scarecrow = useMemo<Spot[]>(
    () => [
      {
        x: SCARECROW_POS[0],
        y: 0,
        z: SCARECROW_POS[1],
        yaw: -Math.PI / 2,
        sx: 1.1,
        sy: 1.1,
        sz: 1.1,
      },
    ],
    [],
  );
  const shovels = useMemo<Spot[]>(
    () =>
      [-0.7, 0.9].map((dz, i) => ({
        x: TOOL_RACK_POS[0] + 0.25,
        y: 0,
        z: TOOL_RACK_POS[1] + dz,
        yaw: i * 0.3,
        sx: 0.42,
        sy: 0.42,
        sz: 0.42,
      })),
    [],
  );
  const rakes = useMemo<Spot[]>(
    () => [
      {
        x: TOOL_RACK_POS[0] + 0.25,
        y: 1.2,
        z: TOOL_RACK_POS[1] + 0.1,
        yaw: Math.PI / 2,
        sx: 0.9,
        sy: 0.9,
        sz: 0.9,
      },
    ],
    [],
  );
  const cans = useMemo<Spot[]>(
    () =>
      (
        [
          [-12.6, 2.1],
          [6.3, 2.2],
          [-0.1, -9.2],
        ] as const
      ).map(([x, z], i) => ({
        x,
        y: 0,
        z,
        yaw: i * 2,
        sx: 0.7,
        sy: 0.7,
        sz: 0.7,
      })),
    [],
  );
  const rack = useMemo(() => {
    const b = new Batch();
    b.add(new THREE.BoxGeometry(0.12, 1.8, 2.6), WOOD, {
      position: [TOOL_RACK_POS[0] - 0.05, 0.9, TOOL_RACK_POS[1]],
    });
    b.add(new THREE.BoxGeometry(0.2, 0.08, 2.8), WOOD, {
      position: [TOOL_RACK_POS[0] - 0.05, 1.85, TOOL_RACK_POS[1]],
    });
    return b.build();
  }, []);
  useEffect(
    () => () => {
      rack.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
    [rack],
  );
  return (
    <>
      <primitive object={rack} />
      <Scatter url="/models/garden/bench.glb" spots={bench} />
      <Scatter url="/models/farm/scarecrow.glb" spots={scarecrow} />
      <Scatter url="/models/garden/shovel.glb" spots={shovels} />
      <Scatter url="/models/garden/rake.glb" spots={rakes} />
      <Scatter url="/models/garden/watering-can.glb" spots={cans} />
    </>
  );
}

const BUTTERFLIES = 7;
const WING_COLORS = [
  "#ffd166",
  "#ff8fab",
  "#a0c4ff",
  "#fff3b0",
  "#ffadad",
  "#caffbf",
  "#d0a2ff",
];

/** A handful of butterflies drifting over the beds: one instanced mesh, matrices rewritten in place. */
function Butterflies(): JSX.Element {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ o: new THREE.Object3D() }), []);
  const geometry = useMemo(() => {
    // two wings meeting at the body: a flat bow-tie in the xz plane
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      0, 0, 0, 0.09, 0, 0.07, 0.09, 0, -0.07, 0, 0, 0, -0.09, 0, -0.07, -0.09,
      0, 0.07,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    [],
  );
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    WING_COLORS.forEach((hex, i) => m.setColorAt(i, c.set(hex)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const o = scratch.o;
    for (let i = 0; i < BUTTERFLIES; i++) {
      const phase = i * 1.9;
      const cx = (noise(i) - 0.5) * 24;
      const cz = (noise(i + 20) - 0.5) * 16 - 1;
      const a = t * (0.18 + 0.03 * i) + phase;
      o.position.set(
        cx + Math.cos(a) * 3.2,
        1.2 + Math.sin(t * 0.9 + phase) * 0.3,
        cz + Math.sin(a * 1.3) * 2.4,
      );
      o.rotation.set(0, -a + Math.PI / 2, Math.sin(t * 16 + phase) * 0.9);
      o.scale.setScalar(1.3);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, BUTTERFLIES]}
      frustumCulled={false}
    />
  );
}

/** Everything that makes the lot a garden, besides the beds, shed, compost and trees. */
export function GardenDressing({
  plots,
}: {
  plots: readonly GardenPlotState[];
}): JSX.Element {
  return (
    <>
      <Paths />
      <Fence />
      <GateArch />
      <NeighborBeds plots={plots} />
      <Borders />
      <Greenhouse />
      <Furniture />
      <Butterflies />
    </>
  );
}

// The Uptown farmers market (src/game/city/farmersMarket.ts), drawn on the
// green west of the park's north-south path. The eight timber stalls (the
// Quaternius Farm Buildings market stand, instanced, each with its own awning
// color) stand all week on a gravel lane; on weekends on the player's clock
// (or with `?market=1`) they open: crates of produce (Quaternius Ultimate
// Food Pack) piled on the shelves, painted signs, bunting across the lane and
// a vendor behind the nearest counters. Mounted only near the green, so the
// rest of the city never pays for it; the low tier piles fewer items. The
// canvas carries `data-market` (open or closed) and `data-market-items` (the
// produce drawn) for the browser tests, and `parkDesk.stall` tells the
// overlay which open stall is within reach.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import * as THREE from "three";
import { hash } from "../../game/city/hash.ts";
import {
  LANE_X,
  PRODUCE,
  PRODUCE_SIZE,
  SHELF_HALF,
  SHELF_Y,
  STALLS,
  STALL_DEPTH,
  STALL_SCALE,
  marketFlag,
  marketOpen,
  stallNear,
  vendorSpot,
  type Produce,
} from "../../game/city/farmersMarket.ts";
import { GROUND, MARKET_GREEN } from "../../game/city/park.ts";
import { Doll } from "../avatar/Doll.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { dimMeshes } from "./CityFurniture.tsx";
import { cityHour, useDaylight } from "./daylight.ts";
import { disposeInstanced } from "./dispose.ts";
import { fitOf, propParts, type PropSpot } from "./instancedProps.ts";
import { parkDesk } from "./parkDesk.ts";

/** The market is drawn within this many meters of its green. */
const RANGE = 70;
/** Vendors drawn at once (the nearest), and how often they are re-picked. */
const DRAWN = 3;
const VENDOR_RADIUS = 30;
const REPICK = 0.75;

const STAND = "/models/farm/market-stand.glb";
const foodUrl = (p: Produce) => `/models/props/food-${p}.glb`;
/** The produce crate (Fruit Crate, public/models/park/produce-crate.glb) is the last model. */
const CRATE = "/models/park/produce-crate.glb";
const PATHS = [STAND, ...PRODUCE.map(foodUrl), CRATE];

const GRAVEL = new THREE.Color("#9d9078");
const BUNTING = [
  "#e8782a",
  "#c8362f",
  "#e2b32f",
  "#4f9a56",
  "#2f8f83",
  "#d9a5b8",
];

/** Whether the market is open now: `?market=1|0`, else a weekend morning on the clock. */
const readOpen = () =>
  marketFlag(location.search) ?? marketOpen(new Date().getDay(), cityHour());

/** The market's open state, refreshed every 30 s like the daylight. */
export function useMarketOpen(): boolean {
  const [open, setOpen] = useState(readOpen);
  useEffect(() => {
    const id = window.setInterval(() => setOpen(readOpen()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return open;
}

const nearGreen = (x: number, z: number): boolean =>
  Math.hypot(
    Math.max(MARKET_GREEN.x0 - x, 0, x - MARKET_GREEN.x1),
    Math.max(MARKET_GREEN.z0 - z, 0, z - MARKET_GREEN.z1),
  ) < RANGE;

export function FarmersMarket({
  player,
}: {
  player: Player;
}): JSX.Element | null {
  const [near, setNear] = useState(false);
  useFrame(() => {
    const now = nearGreen(player.pos.x, player.pos.z);
    if (now !== near) setNear(now);
  });
  return near ? <Market player={player} /> : null;
}

/** Local (lx, lz) on a stall's shelf as a world position. */
function onStall(
  stall: (typeof STALLS)[number],
  lx: number,
  lz: number,
): [number, number] {
  const c = Math.cos(stall.yaw);
  const s = Math.sin(stall.yaw);
  return [stall.at[0] + lx * c + lz * s, stall.at[1] - lx * s + lz * c];
}

/** The crates on every shelf, and the produce piled in them, by kind. */
function shelfSpots(low: boolean): {
  crates: PropSpot[];
  piles: Map<Produce, { x: number; y: number; z: number; yaw: number }[]>;
} {
  const crates: PropSpot[] = [];
  const piles = new Map<
    Produce,
    { x: number; y: number; z: number; yaw: number }[]
  >();
  STALLS.forEach((stall, si) => {
    stall.display.forEach((kind, ci) => {
      const lz = (ci - 1) * (SHELF_HALF[1] * 0.68);
      const [cx, cz] = onStall(stall, 0, lz);
      crates.push({
        x: cx,
        y: GROUND + SHELF_Y,
        z: cz,
        yaw: stall.yaw,
        scale: 1,
      });
      const size = PRODUCE_SIZE[kind];
      const gap = Math.min(0.25, Math.max(size * 1.15, 0.17));
      // a bottom layer of 2 x 3 (2 x 2 on the low tier) and two on top
      const layer: [number, number][] = [];
      for (const gx of [-0.5, 0.5])
        for (const gz of low ? [-0.5, 0.5] : [-1, 0, 1])
          layer.push([gx * gap, gz * gap]);
      const top: [number, number][] = low
        ? []
        : [
            [0, -0.5 * gap],
            [0, 0.5 * gap],
          ];
      const list = piles.get(kind) ?? [];
      [
        ...layer.map((p) => ({ p, up: 0 })),
        ...top.map((p) => ({ p, up: 0.7 })),
      ].forEach(({ p: [px, pz], up }, k) => {
        const [wx, wz] = onStall(
          stall,
          px + (hash(si, ci, k) - 0.5) * 0.04,
          lz + pz,
        );
        list.push({
          x: wx,
          // the produce sits down in the crate, its top peeking over the slats
          y: GROUND + SHELF_Y + 0.12 + up * size,
          z: wz,
          yaw: hash(si, ci, k + 40) * Math.PI * 2,
        });
      });
      piles.set(kind, list);
    });
  });
  return { crates, piles };
}

const STRING_Y = 2.45;
const SAG = 0.55;
const FLAGS = 12;

/** The bunting strung across the lane between each pair of stalls. */
function buntingSpots(): {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}[] {
  const out: { x: number; y: number; z: number; color: THREE.Color }[] = [];
  const half = 3.6 - STALL_DEPTH / 2;
  for (let r = 0; r < 4; r++) {
    const z = STALLS[r].at[1];
    for (let i = 0; i < FLAGS; i++) {
      const t = (i + 0.5) / FLAGS;
      out.push({
        x: LANE_X - half + 2 * half * t,
        y: STRING_Y - SAG * 4 * t * (1 - t),
        z,
        color: new THREE.Color(BUNTING[(r + i) % BUNTING.length]),
      });
    }
  }
  return out;
}

// the signs: one atlas, a row per stall
const CELL_W = 512;
const CELL_H = 128;

function signAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W;
  canvas.height = CELL_H * STALLS.length;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas for the market's signs");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  STALLS.forEach((stall, i) => {
    const y = i * CELL_H;
    ctx.fillStyle = "#2f2a26";
    ctx.fillRect(0, y, CELL_W, CELL_H);
    ctx.strokeStyle = "#f2e6c9";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, y + 8, CELL_W - 16, CELL_H - 16);
    let size = 58;
    const font = () => `700 ${size}px "Georgia", serif`;
    ctx.font = font();
    while (ctx.measureText(stall.name).width > CELL_W * 0.86 && size > 20) {
      size -= 3;
      ctx.font = font();
    }
    ctx.fillStyle = "#f6edd6";
    ctx.fillText(stall.name, CELL_W / 2, y + CELL_H / 2 + 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** One sign plane per stall, hung on its lane side, UVs on its atlas row. */
function signGeometry(): THREE.BufferGeometry {
  const parts = STALLS.map((stall, i) => {
    const g = new THREE.PlaneGeometry(1.7, 0.42);
    const uv = g.getAttribute("uv");
    for (let k = 0; k < uv.count; k++)
      uv.setY(k, 1 - (i + 1 - uv.getY(k)) / STALLS.length);
    const face = stall.yaw === 0 ? Math.PI / 2 : -Math.PI / 2;
    g.rotateY(face);
    g.translate(
      stall.at[0] + Math.cos(stall.yaw) * (STALL_DEPTH / 2 + 0.04),
      GROUND + 2.0,
      stall.at[1],
    );
    return g;
  });
  const merged = new THREE.BufferGeometry();
  const count = parts.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const index: number[] = [];
  let at = 0;
  for (const g of parts) {
    const n = g.getAttribute("position").count;
    pos.set(g.getAttribute("position").array, at * 3);
    nor.set(g.getAttribute("normal").array, at * 3);
    uvs.set(g.getAttribute("uv").array, at * 2);
    for (const i of g.getIndex()?.array ?? []) index.push(i + at);
    at += n;
    g.dispose();
  }
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(index);
  return merged;
}

const m4 = new THREE.Matrix4();
const q4 = new THREE.Quaternion();
const p3 = new THREE.Vector3();
const s3 = new THREE.Vector3();

function Market({ player }: { player: Player }): JSX.Element {
  const open = useMarketOpen();
  const low = useQuality() === "low";
  const canvas = useThree((s) => s.gl.domElement);
  const gltfs = useGLTF(PATHS);
  const { neon } = useDaylight();

  // the stalls stand all week, each in its awning's color
  const stalls = useMemo(() => {
    const scene = gltfs[0]?.scene;
    if (!scene) return [];
    return propParts(
      scene,
      STALLS.map((s) => ({
        x: s.at[0],
        y: GROUND,
        z: s.at[1],
        yaw: s.yaw,
        scale: STALL_SCALE,
        color: new THREE.Color(s.awning),
      })),
      (mat) => mat.name.startsWith("RoofTiles"),
    );
  }, [gltfs]);

  // everything that only exists while it is open
  const wares = useMemo(() => {
    if (!open) return { meshes: [] as THREE.InstancedMesh[], items: 0 };
    const meshes: THREE.InstancedMesh[] = [];
    const { crates, piles } = shelfSpots(low);
    const crate = gltfs[1 + PRODUCE.length]?.scene;
    if (crate) meshes.push(...propParts(crate, crates));
    let items = 0;
    PRODUCE.forEach((kind, i) => {
      const spots = piles.get(kind);
      const scene = gltfs[1 + i]?.scene;
      if (!spots || !scene) return;
      const { longest, floor } = fitOf(scene);
      const k = PRODUCE_SIZE[kind] / longest;
      items += spots.length;
      meshes.push(
        ...propParts(
          scene,
          spots.map((s) => ({ ...s, y: s.y - floor * k, scale: k })),
        ),
      );
    });
    // bunting: a cord and a row of flags across the lane at each stall pair
    const flags = buntingSpots();
    const flag = new THREE.BufferGeometry();
    flag.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-0.12, 0, 0, 0.12, 0, 0, 0, -0.3, 0],
        3,
      ),
    );
    flag.computeVertexNormals();
    const bunting = new THREE.InstancedMesh(
      flag,
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.8,
      }),
      flags.length,
    );
    bunting.material.userData.base = new THREE.Color("#ffffff");
    flags.forEach((f, i) => {
      m4.compose(
        p3.set(f.x, GROUND + f.y, f.z),
        q4.identity(),
        s3.setScalar(1),
      );
      bunting.setMatrixAt(i, m4);
      bunting.setColorAt(i, f.color);
    });
    bunting.frustumCulled = false;
    meshes.push(bunting);
    return { meshes, items };
  }, [open, low, gltfs]);

  const cords = useMemo(() => {
    const pts: number[] = [];
    const half = 3.6 - STALL_DEPTH / 2;
    const SEG = 10;
    for (let r = 0; r < 4; r++) {
      const z = STALLS[r].at[1];
      for (let i = 0; i < SEG; i++) {
        for (const t of [i / SEG, (i + 1) / SEG])
          pts.push(
            LANE_X - half + 2 * half * t,
            GROUND + STRING_Y - SAG * 4 * t * (1 - t),
            z,
          );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const atlas = useMemo(() => signAtlas(), []);
  const signs = useMemo(() => signGeometry(), []);
  const gravel = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: GRAVEL,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.9 }),
    [atlas],
  );

  const all = useMemo(() => [...stalls, ...wares.meshes], [stalls, wares]);
  useEffect(() => () => disposeInstanced(all, true), [all]);
  useEffect(
    () => () => {
      cords.dispose();
      signs.dispose();
      atlas.dispose();
      gravel.dispose();
      signMat.dispose();
    },
    [cords, signs, atlas, gravel, signMat],
  );
  useEffect(() => {
    const k = 1 - 0.55 * neon;
    dimMeshes(all, k);
    gravel.color.copy(GRAVEL).multiplyScalar(k);
    signMat.color.setScalar(k);
  }, [all, neon, gravel, signMat]);
  useEffect(() => {
    canvas.dataset.market = open ? "open" : "closed";
    canvas.dataset.marketItems = String(wares.items);
    return () => {
      delete canvas.dataset.market;
      delete canvas.dataset.marketItems;
      parkDesk.set({ stall: null });
    };
  }, [canvas, open, wares.items]);

  // the vendors nearest the player, and the stall in reach
  const [shown, setShown] = useState<readonly number[]>([]);
  const last = useRef(-Infinity);
  const frames = useRef(0);
  useFrame(({ clock }) => {
    if (!open) return;
    frames.current += 1;
    if (frames.current % 6 === 0) {
      const id = stallNear([player.pos.x, player.pos.z])?.id ?? null;
      if (id !== parkDesk.get().stall) parkDesk.set({ stall: id });
    }
    const t = clock.elapsedTime;
    if (t - last.current < REPICK) return;
    last.current = t;
    const next = STALLS.map((s, i) => ({
      i,
      d: Math.hypot(s.at[0] - player.pos.x, s.at[1] - player.pos.z),
    }))
      .filter((n) => n.d <= VENDOR_RADIUS)
      .sort((a, b) => a.d - b.d)
      .slice(0, DRAWN)
      .map((n) => n.i);
    if (next.length !== shown.length || next.some((i) => !shown.includes(i)))
      setShown(next);
  });

  return (
    <>
      <mesh
        position={[
          (MARKET_GREEN.x0 + MARKET_GREEN.x1) / 2,
          GROUND + 0.03,
          (MARKET_GREEN.z0 + MARKET_GREEN.z1) / 2,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={gravel}
      >
        <planeGeometry
          args={[
            MARKET_GREEN.x1 - MARKET_GREEN.x0,
            MARKET_GREEN.z1 - MARKET_GREEN.z0,
          ]}
        />
      </mesh>
      {all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {open && (
        <>
          <lineSegments geometry={cords}>
            <lineBasicMaterial color="#3a2a20" />
          </lineSegments>
          <mesh geometry={signs} material={signMat} />
          {shown.map((i) => {
            const stall = STALLS[i];
            const { at, yaw } = vendorSpot(stall);
            return (
              <group key={i} position={[at[0], GROUND, at[1]]} rotation-y={yaw}>
                <Doll look={stall.vendor.look} mood="idle" seed={500 + i} />
              </group>
            );
          })}
        </>
      )}
    </>
  );
}

useGLTF.preload(PATHS);

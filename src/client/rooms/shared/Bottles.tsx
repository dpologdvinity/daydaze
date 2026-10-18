import { useEffect, useState } from "react";
import * as THREE from "three";
import { canvasTex } from "./materials.ts";

// A back bar's collection: six bottle shapes in glass, the liquor inside,
// caps and corks, and printed labels, in four draw calls (one BatchedMesh
// per material). Each profile is [height, radius] in meters from the base.
type Shape = {
  profile: readonly (readonly [number, number])[];
  /** The body's radius and the shoulder height, where the label ends. */
  r: number;
  body: number;
  /** The neck's radius at the top and the full height, for the cap. */
  neck: number;
  h: number;
};

const SHAPES: readonly Shape[] = [
  // wine: tall shoulders, long neck, a lip at the top
  {
    profile: [
      [0, 0],
      [0.003, 0.034],
      [0.012, 0.037],
      [0.19, 0.037],
      [0.215, 0.03],
      [0.235, 0.016],
      [0.255, 0.013],
      [0.288, 0.013],
      [0.29, 0.015],
      [0.3, 0.015],
      [0.301, 0],
    ],
    r: 0.037,
    body: 0.19,
    neck: 0.015,
    h: 0.3,
  },
  // whiskey: squat and wide, a short neck
  {
    profile: [
      [0, 0],
      [0.004, 0.047],
      [0.012, 0.05],
      [0.15, 0.05],
      [0.168, 0.042],
      [0.183, 0.02],
      [0.2, 0.017],
      [0.214, 0.017],
      [0.217, 0.02],
      [0.226, 0.02],
      [0.227, 0],
    ],
    r: 0.05,
    body: 0.15,
    neck: 0.02,
    h: 0.226,
  },
  // vodka: tall and straight
  {
    profile: [
      [0, 0],
      [0.004, 0.033],
      [0.01, 0.036],
      [0.22, 0.036],
      [0.258, 0.022],
      [0.28, 0.014],
      [0.31, 0.013],
      [0.313, 0.016],
      [0.33, 0.016],
      [0.331, 0],
    ],
    r: 0.036,
    body: 0.22,
    neck: 0.016,
    h: 0.33,
  },
  // champagne: a punt base, sloping shoulders, foil-wrapped neck
  {
    profile: [
      [0.012, 0],
      [0.004, 0.03],
      [0.012, 0.042],
      [0.03, 0.044],
      [0.15, 0.044],
      [0.21, 0.03],
      [0.25, 0.016],
      [0.3, 0.015],
      [0.31, 0.017],
      [0.311, 0],
    ],
    r: 0.044,
    body: 0.15,
    neck: 0.017,
    h: 0.31,
  },
  // liqueur: a round flask
  {
    profile: [
      [0, 0],
      [0.005, 0.04],
      [0.03, 0.055],
      [0.08, 0.058],
      [0.12, 0.045],
      [0.14, 0.02],
      [0.17, 0.015],
      [0.19, 0.015],
      [0.191, 0],
    ],
    r: 0.058,
    body: 0.1,
    neck: 0.015,
    h: 0.19,
  },
  // gin: broad shoulders, a stubby neck
  {
    profile: [
      [0, 0],
      [0.004, 0.04],
      [0.01, 0.042],
      [0.17, 0.042],
      [0.185, 0.035],
      [0.2, 0.016],
      [0.25, 0.014],
      [0.252, 0.017],
      [0.27, 0.017],
      [0.271, 0],
    ],
    r: 0.042,
    body: 0.17,
    neck: 0.017,
    h: 0.27,
  },
];

const SEGMENTS = 10;
const lathe = (pts: readonly (readonly [number, number])[]) =>
  new THREE.LatheGeometry(
    pts.map(([y, r]) => new THREE.Vector2(Math.max(r, 0.0001), y)),
    SEGMENTS,
  );

/** Label designs in a 4 by 2 atlas: [paper, ink, name, small print]. */
const LABELS = [
  ["#f4ead2", "#3a1a0a", "OAKHART", "AGED 12 YEARS"],
  ["#141018", "#f6c46a", "No. 7", "LONDON DRY"],
  ["#c8102e", "#fff3d6", "REINA", "BLANCO"],
  ["#ffffff", "#1a2a6a", "LUNA", "CITRUS VODKA"],
  ["#1f4a2e", "#f4e6b0", "VERDE", "BOTANICAL GIN"],
  ["#f6c46a", "#2a0a0a", "XO", "GRANDE RÉSERVE"],
  ["#2a0a3a", "#ff8ad8", "VELVET", "BERRY LIQUEUR"],
  ["#d9c7a0", "#5a1a1a", "CASA ROJA", "TINTO 2019"],
] as const;
const ATLAS = [4, 2] as const;

function labelAtlas() {
  const W = 256;
  const H = 128;
  return canvasTex(W * ATLAS[0], H * ATLAS[1], (ctx) => {
    LABELS.forEach(([paper, ink, name, small], i) => {
      const x = (i % ATLAS[0]) * W;
      const y = Math.floor(i / ATLAS[0]) * H;
      ctx.fillStyle = paper;
      ctx.fillRect(x, y, W, H);
      // paper grain
      for (let k = 0; k < 220; k++) {
        ctx.fillStyle = `rgba(0,0,0,${0.03 + ((k * 37) % 7) / 200})`;
        ctx.fillRect(x + ((k * 53) % W), y + ((k * 29) % H), 2, 1);
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 10, y + 8, W - 20, H - 16);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 16, y + 14, W - 32, H - 28);
      // a crest above the name
      ctx.beginPath();
      ctx.arc(x + W / 2, y + 34, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.font = "bold 13px serif";
      ctx.fillText("★", x + W / 2, y + 39);
      ctx.font = `bold ${name.length > 6 ? 26 : 32}px serif`;
      ctx.fillText(name, x + W / 2, y + 80);
      ctx.font = "11px sans-serif";
      ctx.fillText(small, x + W / 2, y + 100);
      ctx.fillText("EST. 1998", x + W / 2, y + 114);
    });
  });
}

/** One label band for a shape, its UVs pointed at atlas cell `design`. */
function labelBand(s: Shape, design: number) {
  const top = s.body * 0.85;
  const bottom = s.body * 0.25;
  const g = new THREE.CylinderGeometry(
    s.r + 0.0012,
    s.r + 0.0012,
    top - bottom,
    SEGMENTS,
    1,
    true,
    -Math.PI * 0.45,
    Math.PI * 0.9,
  ).translate(0, (top + bottom) / 2, 0);
  const uv = g.attributes.uv;
  const col = design % ATLAS[0];
  const row = Math.floor(design / ATLAS[0]);
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (col + uv.getX(i)) / ATLAS[0],
      1 - (row + 1 - uv.getY(i)) / ATLAS[1],
    );
  return g;
}

/** The liquor: a column inside the body, filled to `level` of it. */
const liquid = (s: Shape, level: number) =>
  lathe([
    [0.006, 0],
    [0.006, s.r * 0.88],
    [s.body * level, s.r * 0.88],
    [s.body * level + 0.0005, 0],
  ]);

const cap = (s: Shape, tall: boolean) =>
  new THREE.CylinderGeometry(
    s.neck + 0.002,
    s.neck + 0.002,
    tall ? 0.045 : 0.022,
    8,
  ).translate(0, s.h - (tall ? 0.018 : 0.006), 0);

const GLASS_TINTS = ["#ffffff", "#2f6b3a", "#8a4a12", "#3a5aa8", "#e8f0ff"];
const LIQUORS = [
  "#ffb02e",
  "#c8641e",
  "#ff2f6a",
  "#3dff9a",
  "#5ab0ff",
  "#ffe6a0",
  "#c04dff",
  "#7a0a1a",
];
const CAPS = ["#f6c46a", "#141018", "#d8d8e0", "#a8102a", "#8a5a2e"];

export type ShelfRow = {
  /** From `x0` to `x1` along the row, at shelf height `y`, depth `z`. */
  x0: number;
  x1: number;
  y: number;
  z: number;
  /** How many bottles stand on it. */
  count: number;
};

function rand(n: number) {
  const v = Math.sin(n * 91.7 + 13.1) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Bottles on shelves facing +z (rotate the group for other walls): glass,
 * liquor, caps and labels, each bottle's shape, label and fill from `seed`.
 */
export function Bottles({
  rows,
  seed = 1,
}: {
  rows: readonly ShelfRow[];
  seed?: number;
}) {
  const [meshes, setMeshes] = useState<THREE.BatchedMesh[]>([]);
  // built in an effect, so a remount (StrictMode included) never draws a
  // disposed mesh
  useEffect(() => {
    const atlas = labelAtlas();
    const total = rows.reduce((n, r) => n + r.count, 0);
    const glassMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.04,
      metalness: 0.15,
      transparent: true,
      opacity: 0.3,
      envMapIntensity: 2.5,
    });
    const liquidMat = new THREE.MeshBasicMaterial({
      color: "#e8e8e8",
      toneMapped: false,
    });
    const capMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.7,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      map: atlas,
      roughness: 0.65,
    });
    const glassGeo = SHAPES.map((s) => lathe(s.profile));
    const labelGeo = SHAPES.map((s) => LABELS.map((_, d) => labelBand(s, d)));
    const capGeo = SHAPES.map((s, i) => cap(s, i === 3));
    const levels = [0.35, 0.6, 0.85];
    const liquidGeo = SHAPES.map((s) => levels.map((l) => liquid(s, l)));
    const sizeOf = (gs: THREE.BufferGeometry[]) => ({
      v: gs.reduce((n, g) => n + g.attributes.position.count, 0),
      i: gs.reduce((n, g) => n + (g.index?.count ?? 0), 0),
    });
    const batch = (
      gs: THREE.BufferGeometry[],
      material: THREE.Material,
    ): [THREE.BatchedMesh, number[]] => {
      const { v, i } = sizeOf(gs);
      const mesh = new THREE.BatchedMesh(total, v, i, material);
      return [mesh, gs.map((g) => mesh.addGeometry(g))];
    };
    const [glass, glassIds] = batch(glassGeo, glassMat);
    const [labels, labelIds] = batch(labelGeo.flat(), labelMat);
    const [caps, capIds] = batch(capGeo, capMat);
    const [liquor, liquidIds] = batch(liquidGeo.flat(), liquidMat);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let n = seed * 17;
    for (const row of rows) {
      for (let k = 0; k < row.count; k++) {
        n++;
        const shape = Math.floor(rand(n) * SHAPES.length);
        const design = Math.floor(rand(n + 0.3) * LABELS.length);
        const level = Math.floor(rand(n + 0.6) * levels.length);
        const s = 0.9 + rand(n + 0.9) * 0.25;
        const x = row.x0 + ((row.x1 - row.x0) * (k + 0.5)) / row.count;
        const z = row.z + (k % 2) * 0.05;
        // a little turn so the labels don't all line up
        m.makeRotationY((rand(n + 1.2) - 0.5) * 0.5)
          .scale(new THREE.Vector3(s, s, s))
          .setPosition(x, row.y, z);
        const add = (mesh: THREE.BatchedMesh, geo: number, hex: string) => {
          const id = mesh.addInstance(geo);
          mesh.setMatrixAt(id, m);
          mesh.setColorAt(id, c.set(hex));
        };
        add(
          glass,
          glassIds[shape] ?? 0,
          GLASS_TINTS[Math.floor(rand(n + 1.5) * GLASS_TINTS.length)] ??
            "#ffffff",
        );
        add(
          liquor,
          liquidIds[shape * levels.length + level] ?? 0,
          LIQUORS[Math.floor(rand(n + 1.8) * LIQUORS.length)] ?? "#ffb02e",
        );
        add(
          caps,
          capIds[shape] ?? 0,
          shape === 3
            ? "#f6c46a"
            : (CAPS[Math.floor(rand(n + 2.1) * CAPS.length)] ?? "#141018"),
        );
        add(labels, labelIds[shape * LABELS.length + design] ?? 0, "#ffffff");
      }
    }
    // the liquor draws first, so the glass blends over it
    liquor.renderOrder = 0;
    glass.renderOrder = 1;
    const built = [liquor, caps, labels, glass];
    setMeshes(built);
    return () => {
      for (const mesh of built) {
        mesh.dispose();
        const mat = mesh.material;
        if (mat instanceof THREE.Material) mat.dispose();
      }
      atlas.dispose();
    };
  }, [rows, seed]);
  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

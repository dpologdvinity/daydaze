import { useMemo } from "react";
import * as THREE from "three";
import { POOL } from "../../../game/waterPark.ts";
import { Floor, type PickHandler } from "../shared/Floor.tsx";
import { canvasTex } from "../shared/materials.ts";
import { Props } from "./build.ts";
import { Palms, type PalmSpec } from "./Palms.tsx";
import { PROPS, stripes, SUNSET_FLAG } from "./materials.ts";

// Sun-bleached sandstone: a 4x4 atlas of tiles with pale grout, bevels and chips.
const TILES = canvasTex(
  256,
  256,
  (ctx) => {
    ctx.fillStyle = "#fff4e2";
    ctx.fillRect(0, 0, 256, 256);
    const tones = ["#f7d7ae", "#f3cda0", "#f9dfbd", "#f5d2a8"];
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const px = x * 64 + 3;
        const py = y * 64 + 3;
        ctx.fillStyle = tones[(x + y * 2) % tones.length];
        ctx.fillRect(px, py, 58, 58);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(px, py, 58, 3);
        ctx.fillRect(px, py, 3, 58);
        ctx.fillStyle = "rgba(160,100,50,0.18)";
        ctx.fillRect(px, py + 55, 58, 3);
        ctx.fillRect(px + 55, py, 3, 58);
      }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle =
        rand() < 0.5 ? "rgba(140,90,50,0.12)" : "rgba(255,255,255,0.3)";
      ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 2, 1 + rand());
    }
  },
  [8, 7],
);

const AWNING = stripes(["#3fc2ff", "#ffffff"], 6);

/** A painted wooden sign; text in the hand-lettered script. */
export function Sign({
  text,
  width,
  bg,
  fg,
  ...rest
}: {
  text: string;
  width: number;
  bg: string;
  fg: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const tex = useMemo(
    () =>
      canvasTex(512, 160, (ctx) => {
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(4, 4, 504, 152, 40);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.font =
          "italic 700 104px 'Z003', 'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = fg;
        ctx.fillText(text, 256, 86, 470);
      }),
    [text, bg, fg],
  );
  return (
    <mesh {...rest}>
      <planeGeometry args={[width, (width * 160) / 512]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

const LOUNGERS: readonly {
  at: [number, number, number];
  rot: number;
  towel: readonly string[];
}[] = [
  { at: [-1.6, 0, 5.6], rot: Math.PI, towel: ["#ffd23f", "#ffffff"] },
  { at: [0.2, 0, 5.6], rot: Math.PI, towel: SUNSET_FLAG },
  { at: [2.0, 0, 5.6], rot: Math.PI, towel: ["#3fc2ff", "#7cf0c8"] },
  { at: [4.4, 0, 5.4], rot: Math.PI - 0.3, towel: ["#ff5fb4", "#ffffff"] },
  { at: [-8.4, 0, 6.0], rot: Math.PI + 0.25, towel: ["#ff9a56", "#fff1dc"] },
];

const UMBRELLAS: readonly {
  at: [number, number, number];
  colors: readonly string[];
}[] = [
  { at: [-0.7, 0, 6.3], colors: ["#ff3f9e", "#ffffff"] },
  { at: [3.2, 0, 6.2], colors: ["#3fc2ff", "#ffd23f"] },
  { at: [-9.4, 0, 6.6], colors: ["#7cf0c8", "#ff9a56"] },
];

const CABANAS: readonly [number, number, number][] = [
  [-6.2, 0, 9.4],
  [8.2, 0, 9.0],
];

/** The palm-leaf gate back to the Plaza, on the east edge of the deck. */
const GATE: [number, number, number] = [11.6, 0, 2.5];
/** The snack shack off the west edge, counter facing the deck. */
const SNACK: [number, number, number] = [-11.4, 0, 2.6];
/** The wave pool sign on the west coping, facing the deck. */
const POOL_SIGN: [number, number, number] = [POOL.x0 - 0.9, 0, -5.5];

const PALMS: readonly PalmSpec[] = [
  { position: [-10.9, 0, -1.0], scale: 1.7 },
  { position: [-10.6, 0, 6.6], scale: 1.5 },
  { position: [11.2, 0, -2.6], scale: 1.8 },
  { position: [11.4, 0, 6.6], scale: 1.4 },
  { position: [4.4, 0, -10.6], scale: 1.9 },
  { position: [-9.6, 0, -10.6], scale: 1.6 },
  { position: [1.6, 0, -10.6], scale: 1.3 },
];

/** A tall lifeguard chair across the pool, facing the deck. */
export const LIFEGUARD_SEAT: [number, number, number] = [
  -4,
  1.95,
  POOL.z0 - 0.95,
];

function loungerFrame(p: Props) {
  p.add(new THREE.BoxGeometry(0.7, 0.08, 1.4), "#ffffff", [0, 0.3, 0.15]);
  p.add(
    new THREE.BoxGeometry(0.7, 0.08, 0.8),
    "#ffffff",
    [0, 0.55, -0.7],
    [-0.65, 0, 0],
  );
  for (const x of [-0.3, 0.3]) {
    for (const z of [-0.45, 0.75]) {
      p.add(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), "#d9d9e0", [
        x,
        0.14,
        z,
      ]);
    }
  }
}

function umbrellaPole(p: Props) {
  p.add(
    new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8),
    "#ffffff",
    [0, 1.2, 0],
  );
  p.add(new THREE.SphereGeometry(0.07, 10, 8), "#ffffff", [0, 2.62, 0]);
}

function cabanaFrame(p: Props) {
  p.add(new THREE.BoxGeometry(3.2, 0.12, 2.6), "#fff1dc", [0, 0.06, 0]);
  p.add(new THREE.BoxGeometry(3.0, 1.9, 0.08), "#ff9a56", [0, 1.0, -1.2]);
  for (const x of [-1.5, 1.5]) {
    p.add(new THREE.BoxGeometry(0.08, 1.9, 2.6), "#ff9a56", [x, 1.0, 0]);
    p.add(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), "#ffffff", [
      x,
      1.15,
      1.25,
    ]);
  }
  p.add(new THREE.BoxGeometry(3.4, 0.1, 2.9), "#ffd23f", [0, 2.05, 0]);
}

function snackFrame(p: Props) {
  p.add(new THREE.BoxGeometry(4.2, 3, 0.3), "#7cf0c8", [0, 1.5, -0.9]);
  for (const x of [-2, 2])
    p.add(new THREE.BoxGeometry(0.25, 3, 2), "#7cf0c8", [x, 1.5, 0]);
  p.add(new THREE.BoxGeometry(3.8, 1.1, 0.5), "#ff5fb4", [0, 0.55, 0.85]);
  p.add(new THREE.BoxGeometry(4, 0.08, 0.65), "#ffffff", [0, 1.13, 0.9]);
  p.add(new THREE.BoxGeometry(4.6, 0.2, 2.4), "#ffd23f", [0, 3.1, 0]);
  p.add(new THREE.BoxGeometry(2.4, 1, 0.04), "#1b2a4a", [0, 2.0, -0.74]);
  for (const [x, c] of [
    [-0.9, "#ff9a56"],
    [-0.5, "#7cf0c8"],
    [0.6, "#ff5fb4"],
  ] as const) {
    p.add(new THREE.CylinderGeometry(0.07, 0.05, 0.22, 10), c, [x, 1.28, 0.9]);
  }
  // a giant ice cream on the roof
  p.add(
    new THREE.ConeGeometry(0.35, 0.9, 12),
    "#e0a35c",
    [1.6, 3.65, 0],
    [Math.PI, 0, 0],
  );
  p.add(new THREE.SphereGeometry(0.4, 16, 12), "#ffb6dd", [1.6, 4.22, 0]);
  p.add(new THREE.SphereGeometry(0.32, 16, 12), "#fff6e8", [1.6, 4.65, 0]);
  p.add(new THREE.SphereGeometry(0.1, 10, 8), "#ff2f5a", [1.6, 5.0, 0]);
}

function lifeguardFrame(p: Props) {
  const [, y] = LIFEGUARD_SEAT;
  for (const sx of [-0.4, 0.4]) {
    for (const sz of [-0.35, 0.35]) {
      p.add(
        new THREE.BoxGeometry(0.1, y, 0.1),
        "#ffffff",
        [sx, y / 2, sz],
        [sz * 0.15, 0, 0],
      );
    }
  }
  for (const h of [0.5, 1.0, 1.5]) {
    p.add(new THREE.BoxGeometry(0.8, 0.06, 0.06), "#ffffff", [0, h, 0.37]);
  }
  // ladder on the left, rungs every 0.3 m
  for (const x of [-0.5, -0.2]) {
    p.add(new THREE.BoxGeometry(0.04, y, 0.04), "#ffffff", [x, y / 2, 0.55]);
  }
  for (let i = 0; i < 6; i++) {
    p.add(new THREE.BoxGeometry(0.34, 0.04, 0.04), "#ffffff", [
      -0.35,
      0.3 + i * 0.3,
      0.55,
    ]);
  }
  p.add(new THREE.BoxGeometry(0.95, 0.1, 0.7), "#ff4a3d", [0, y, 0]);
  p.add(new THREE.BoxGeometry(0.95, 0.8, 0.08), "#ff4a3d", [
    0,
    y + 0.45,
    -0.35,
  ]);
  p.add(
    new THREE.TorusGeometry(0.24, 0.07, 8, 20),
    "#ff7a1f",
    [0.6, y - 0.4, 0.2],
    [0, Math.PI / 2, 0],
  );
  p.add(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), "#ffffff", [
    0,
    y + 1.4,
    -0.3,
  ]);
  p.add(new THREE.ConeGeometry(1.0, 0.4, 10, 1, true), "#ff4a3d", [
    0,
    y + 2.35,
    -0.3,
  ]);
}

function gateFrame(p: Props) {
  for (const x of [-1.1, 1.1]) {
    p.add(new THREE.CylinderGeometry(0.16, 0.2, 3, 10), "#ff9a56", [x, 1.5, 0]);
  }
  p.add(
    new THREE.TorusGeometry(1.1, 0.14, 8, 20, Math.PI),
    "#ff5fb4",
    [0, 3.0, 0],
    [0, 0, Math.PI / 2],
  );
}

function poolSignFrame(p: Props) {
  for (const x of [-1.0, 1.0]) {
    p.add(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), "#ffffff", [
      x,
      1.2,
      0,
    ]);
  }
}

const TOWELS = LOUNGERS.map((l) => {
  const tex = stripes(l.towel);
  tex.rotation = Math.PI / 2;
  return tex;
});
const CANOPIES = UMBRELLAS.map((u) => stripes(u.colors, 2));

/** Every colored prop on the deck, merged into one mesh. */
function buildProps() {
  const root = new Props();
  LOUNGERS.forEach((l) =>
    loungerFrame(root.within(l.at[0], l.at[1], l.at[2], l.rot)),
  );
  UMBRELLAS.forEach((u) =>
    umbrellaPole(root.within(u.at[0], u.at[1], u.at[2])),
  );
  CABANAS.forEach((c) => cabanaFrame(root.within(c[0], c[1], c[2])));
  snackFrame(root.within(SNACK[0], SNACK[1], SNACK[2], Math.PI / 2));
  lifeguardFrame(root.within(LIFEGUARD_SEAT[0], 0, LIFEGUARD_SEAT[2]));
  gateFrame(root.within(GATE[0], GATE[1], GATE[2], -Math.PI / 2));
  poolSignFrame(
    root.within(POOL_SIGN[0], POOL_SIGN[1], POOL_SIGN[2], -Math.PI / 2),
  );
  return root.geometry();
}

/** The deck around the pool: tiles, loungers, shade, snacks and palms. */
export function Deck({ onPick }: { onPick: PickHandler }) {
  const props = useMemo(buildProps, []);
  return (
    <>
      <Floor
        width={30}
        depth={26}
        center={[0, -1.5]}
        color="#ffffff"
        map={TILES}
        mirror={0.25}
        mixStrength={1.2}
        roughness={0.7}
        envMapIntensity={0.4}
        low={{ metalness: 0, roughness: 0.85 }}
        onPick={onPick}
      />
      <mesh geometry={props} material={PROPS} />
      {LOUNGERS.map((l, i) => (
        <group key={i} position={l.at} rotation-y={l.rot}>
          <mesh position={[0, 0.345, 0.2]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.62, 1.3]} />
            <meshToonMaterial map={TOWELS[i]} />
          </mesh>
        </group>
      ))}
      {UMBRELLAS.map((u, i) => (
        <group key={i} position={u.at}>
          <mesh position-y={2.35}>
            <coneGeometry args={[1.3, 0.5, 16, 1, true]} />
            <meshToonMaterial map={CANOPIES[i]} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {CABANAS.map((c, i) => (
        <group key={i} position={c}>
          <mesh position={[0, 2.2, 0.2]} rotation-x={-0.3}>
            <planeGeometry args={[3.4, 2.0]} />
            <meshToonMaterial map={AWNING} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <group position={SNACK} rotation-y={Math.PI / 2}>
        <mesh position={[0, 2.7, 1.55]} rotation-x={0.45}>
          <planeGeometry args={[4.4, 1.1]} />
          <meshToonMaterial map={AWNING} side={THREE.DoubleSide} />
        </mesh>
        <Sign
          text="Splash Snacks"
          width={3.2}
          bg="#ff3f9e"
          fg="#fff6c8"
          position={[0, 3.75, 0.2]}
        />
      </group>
      <group position={GATE} rotation-y={-Math.PI / 2}>
        <Sign
          text="to the plaza"
          width={2.3}
          bg="#3fc2ff"
          fg="#ffffff"
          position={[0, 3.55, 0.05]}
        />
      </group>
      <group position={POOL_SIGN} rotation-y={-Math.PI / 2}>
        <Sign
          text="Wave Pool"
          width={2.4}
          bg="#1b9fd0"
          fg="#ffffff"
          position={[0, 2.2, 0.05]}
        />
      </group>
      <Palms palms={PALMS} />
    </>
  );
}

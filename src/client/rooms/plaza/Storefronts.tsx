import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "../../../game/look.ts";
import { useReducedMotion } from "../../motion.ts";
import { Batch } from "../shared/batch.ts";
import { Cocktail } from "../shared/Cocktail.tsx";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { canvasTex, GOLD, hdr, LACQUER, neonMat } from "../shared/materials.ts";
import {
  DECO,
  RingNeon,
  MARQUEE,
  Neon,
  NeonText,
  SCRIPT,
} from "../shared/Neon.tsx";
import { HALF_WIDTH, SHOP_HEIGHT, SHOP_Z, SHOPS, type Shop } from "./layout.ts";

const DEPTH = 0.5;
const DOOR_H = 2.6;

// Glazed tile facade: dark lacquered bricks with a faint sheen per course.
const BRICK = canvasTex(
  256,
  256,
  (ctx) => {
    ctx.fillStyle = "#0b0610";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 32 : 0;
      for (let col = -1; col < 4; col++) {
        const x = col * 64 + off + 2;
        const y = row * 32 + 2;
        const g = ctx.createLinearGradient(0, y, 0, y + 28);
        const l = 26 + ((row * 7 + col * 13) % 9) * 2;
        g.addColorStop(0, `rgb(${l + 18},${l},${l + 26})`);
        g.addColorStop(1, `rgb(${l - 8},${l - 14},${l - 2})`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 60, 28);
      }
    }
  },
  [3, 5],
);

// Corrugated roll-down shutter for the shops that have not opened yet.
const SHUTTER = new THREE.MeshStandardMaterial({
  map: canvasTex(
    64,
    256,
    (ctx) => {
      for (let y = 0; y < 256; y += 8) {
        const g = ctx.createLinearGradient(0, y, 0, y + 8);
        g.addColorStop(0, "#5a5266");
        g.addColorStop(0.5, "#2a2432");
        g.addColorStop(1, "#14101a");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, 64, 8);
      }
    },
    [1, 1],
  ),
  metalness: 0.7,
  roughness: 0.4,
});

const DOORWAY = new THREE.MeshBasicMaterial({
  map: canvasTex(64, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#ff2f9a");
    g.addColorStop(0.45, "#ffb02e");
    g.addColorStop(1, "#fff1c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
  }),
  color: hdr("#ffffff", 1.6),
  toneMapped: false,
});

const ROPE = new THREE.MeshPhysicalMaterial({
  color: "#7a0b4f",
  sheen: 1,
  sheenColor: "#ff7ad0",
  roughness: 0.6,
});

const PIXEL_MATS = [
  neonMat("#ff2f9a", 3),
  neonMat("#7b4dff", 3),
  neonMat("#3fe0d0", 3),
];

// Arcade heart, one lit square per cell.
const HEART = [
  ".XX.XX.",
  "XXXXXXX",
  "XXXXXXX",
  ".XXXXX.",
  "..XXX..",
  "...X...",
];

// Velvet ropes: [shop, x0, x1, z], x relative to the shop centre.
const ROPES = [
  ["velvet-room", -1.9, -1.0, 0.55],
  ["velvet-room", 1.0, 1.9, 0.55],
  ["club", -2.6, -1.1, 0.7],
  ["club", 1.1, 2.6, 0.7],
] as const;

const SIDE_FACADE = new THREE.MeshStandardMaterial({
  map: BRICK,
  color: "#c8b8e0",
  roughness: 0.45,
  metalness: 0.25,
});

const MANNEQUIN: Look = {
  skin: "#94603f",
  hairStyle: "ponytail",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-fox-snatched",
  outfit: "fur",
  outfitColor: "#9b5cff",
  shadow: "#ff2f9a",
};

/** A lit shop window: colour wash, ceiling glow and blind slats. */
function windowTex(color: string) {
  return canvasTex(256, 160, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, color);
    g.addColorStop(0.55, "#2a0b2e");
    g.addColorStop(1, "#07020b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 160);
    const r = ctx.createRadialGradient(128, 0, 4, 128, 0, 150);
    r.addColorStop(0, "rgba(255,240,230,0.45)");
    r.addColorStop(1, "rgba(255,240,230,0)");
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = "rgba(7,2,11,0.35)";
    for (let y = 10; y < 70; y += 12) ctx.fillRect(0, y, 256, 3);
  });
}

/** Striped canvas awning in the shop colour and cream. */
function awningTex(color: string) {
  return canvasTex(256, 32, (ctx) => {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = x % 64 ? "#f7e7c6" : color;
      ctx.fillRect(x, 0, 32, 32);
    }
  });
}

function edge(x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.3);
  return Array.from(
    { length: n },
    (_, i) =>
      new THREE.Vector3(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 0),
  );
}

function shopAt(id: string) {
  const found = SHOPS.find((s) => s.id === id);
  if (!found) throw new Error(`No shop called ${id}`);
  return found;
}

/** Facade, windows, awning or shutter, and door, for one shop. */
function addShop(b: Batch, s: Shop) {
  const { x, width: w, color, accent } = s;
  const z = SHOP_Z;
  const facade = new THREE.MeshStandardMaterial({
    map: BRICK,
    color: new THREE.Color(accent).lerp(new THREE.Color("#ffffff"), 0.6),
    roughness: 0.42,
    metalness: 0.25,
  });
  const glass = new THREE.MeshBasicMaterial({
    map: windowTex(color),
    color: hdr("#ffffff", s.open ? 1.1 : 0.7),
    toneMapped: false,
  });
  b.add(new THREE.BoxGeometry(w, SHOP_HEIGHT, DEPTH), facade, {
    position: [x, SHOP_HEIGHT / 2, z - DEPTH / 2],
  })
    .add(new THREE.BoxGeometry(w + 0.1, 0.12, 0.16), GOLD, {
      position: [x, SHOP_HEIGHT + 0.06, z + 0.02],
    })
    .add(new THREE.BoxGeometry(w, 0.24, 0.12), LACQUER, {
      position: [x, 0.12, z + 0.02],
    });
  const paneW = (w - 1.9) / 2;
  for (const side of [-1, 1]) {
    const px = x + side * (0.95 + paneW / 2);
    b.add(new THREE.PlaneGeometry(paneW, 2.2), glass, {
      position: [px, 1.55, z + 0.02],
    })
      .add(new THREE.BoxGeometry(paneW + 0.08, 0.05, 0.04), GOLD, {
        position: [px, 1.55, z + 0.03],
      })
      .add(new THREE.BoxGeometry(paneW + 0.08, 0.05, 0.04), GOLD, {
        position: [px, 2.67, z + 0.03],
      });
  }
  if (s.open) {
    // the one open door: warm light spilling out, gold frame
    b.add(new THREE.PlaneGeometry(1.7, DOOR_H), DOORWAY, {
      position: [x, DOOR_H / 2 + 0.12, z + 0.02],
    });
    for (const dx of [-0.9, 0.9]) {
      b.add(new THREE.BoxGeometry(0.1, DOOR_H + 0.1, 0.1), GOLD, {
        position: [x + dx, DOOR_H / 2 + 0.12, z + 0.06],
      });
    }
    b.add(new THREE.BoxGeometry(1.9, 0.1, 0.1), GOLD, {
      position: [x, DOOR_H + 0.2, z + 0.06],
    });
  } else {
    b.add(new THREE.PlaneGeometry(1.7, DOOR_H), SHUTTER, {
      position: [x, DOOR_H / 2 + 0.12, z + 0.02],
    }).add(new THREE.BoxGeometry(1.86, 0.22, 0.16), LACQUER, {
      position: [x, DOOR_H + 0.2, z + 0.02],
    });
    const awning = new THREE.MeshStandardMaterial({
      map: awningTex(color),
      roughness: 0.6,
    });
    b.add(new THREE.PlaneGeometry(w - 0.5, 0.45), awning, {
      position: [x, 3.1, z + 0.12],
      rotation: [-0.25, 0, 0],
    });
  }
}

/** A brass-posted velvet rope between two shop-front stanchions. */
function addRope(b: Batch, x: number, x0: number, x1: number, z: number) {
  const zz = SHOP_Z + z;
  const mid = (x0 + x1) / 2;
  for (const px of [x0, mid, x1]) {
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.94, 10), GOLD, {
      position: [x + px, 0.47, zz],
    })
      .add(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 18), GOLD, {
        position: [x + px, 0.03, zz],
      })
      .add(new THREE.SphereGeometry(0.055, 12, 8), GOLD, {
        position: [x + px, 0.97, zz],
      });
  }
  for (const [a, c] of [
    [x0, mid],
    [mid, x1],
  ]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a, 0.92, 0),
      new THREE.Vector3((a + c) / 2, 0.7, 0),
      new THREE.Vector3(c, 0.92, 0),
    ]);
    b.add(new THREE.TubeGeometry(curve, 16, 0.025, 6), ROPE, {
      position: [x, 0, zz],
    });
  }
}

/** Blade signs and plain walls closing the street at both ends. */
function addSideBlocks(b: Batch) {
  const z0 = SHOP_Z - 0.5;
  const z1 = 3.5;
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  for (const side of [-1, 1]) {
    const cx = side * (HALF_WIDTH + 2);
    b.add(new THREE.BoxGeometry(4, 8, len), SIDE_FACADE, {
      position: [cx, 4, zc],
    })
      .add(new THREE.BoxGeometry(0.08, 0.1, len), GOLD, {
        position: [cx - side * 2.02, 8.02, zc],
      })
      .add(new THREE.BoxGeometry(0.9, 3.8, 0.12), LACQUER, {
        position: [cx - side * 2.6, 5, z1 - 1.6],
      });
  }
}

/** Every static shop-front piece, one mesh per material. */
function buildStatics() {
  const b = new Batch();
  for (const s of SHOPS) addShop(b, s);
  for (const [id, x0, x1, z] of ROPES) addRope(b, shopAt(id).x, x0, x1, z);
  addSideBlocks(b);
  const arcade = shopAt("arcade");
  const cells = HEART.flatMap((r, j) =>
    [...r].flatMap((ch, i) => (ch === "X" ? [[i - 3, 2.5 - j] as const] : [])),
  );
  cells.forEach(([i, j], n) =>
    b.add(
      new THREE.PlaneGeometry(0.13, 0.13),
      PIXEL_MATS[(n * 5) % PIXEL_MATS.length],
      {
        position: [arcade.x + i * 0.16, 3.05 + j * 0.16, SHOP_Z + 0.08],
      },
    ),
  );
  const boutique = shopAt("boutique");
  b.add(new THREE.CylinderGeometry(0.32, 0.36, 0.24, 28), GOLD, {
    position: [boutique.x - 1.55, 0.12, SHOP_Z + 0.38],
  });
  return b.build();
}

/** A neon martini glass for the bar. */
function MartiniNeon(props: { position: [number, number, number] }) {
  const glass = useMemo(
    () =>
      [
        [-0.42, 0.42],
        [0, -0.05],
        [0.42, 0.42],
        [-0.42, 0.42],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    [],
  );
  const stem = useMemo(
    () =>
      [
        [0, -0.05],
        [0, -0.5],
        [-0.22, -0.56],
        [0.22, -0.56],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    [],
  );
  return (
    <group {...props}>
      <Neon points={glass} color="#3dff9a" k={3.4} radius={0.022} />
      <Neon points={stem} color="#3dff9a" k={3.4} radius={0.02} />
      <mesh position={[0.18, 0.36, 0]} material={neonMat("#ffb02e", 4)}>
        <circleGeometry args={[0.1, 20]} />
      </mesh>
    </group>
  );
}

/** Chasing marquee bulbs around the club sign. */
function Marquee({ w, h, y }: { w: number; h: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    const step = 0.24;
    for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) {
      out.push([x, h / 2], [x, -h / 2]);
    }
    for (let yy = -h / 2 + step; yy < h / 2 - 1e-6; yy += step) {
      out.push([-w / 2, yy], [w / 2, yy]);
    }
    return out;
  }, [w, h]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach(([x, yy], i) => {
      o.position.set(x, yy, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  const calm = useReducedMotion();
  const on = useMemo(() => hdr("#ffe6a0", 5), []);
  const shown = useRef(-1);
  const off = useMemo(() => hdr("#ffb02e", 0.8), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const step = calm ? 0 : Math.floor(clock.elapsedTime * 6);
    // the chase steps six times a second: upload only when it moves
    if (step === shown.current) return;
    shown.current = step;
    spots.forEach((_, i) => m.setColorAt(i, (i + step) % 3 ? on : off));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, spots.length]}
      position-y={y}
    >
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Name sign, outline and the open or coming-soon card for one shop. */
function ShopSigns({ shop }: { shop: Shop }) {
  const { width: w, color, accent } = shop;
  const outline = useMemo(() => {
    const t = SHOP_HEIGHT - 0.12;
    const s = w / 2 - 0.12;
    // dense points keep the spline straight along each edge
    return [
      ...edge(-s, 0.15, -s, t),
      ...edge(-s, t, s, t),
      ...edge(s, t, s, 0.15),
      new THREE.Vector3(s, 0.15, 0),
    ];
  }, [w]);
  return (
    <group position={[shop.x, 0, SHOP_Z]}>
      <group position-z={0.04}>
        <Neon points={outline} color={accent} k={3} radius={0.02} />
      </group>
      <NeonText
        text={shop.name}
        color={color}
        font={shop.id === "bar" || shop.open ? SCRIPT : DECO}
        width={w * 0.9}
        k={3.4}
        flicker={shop.id === "bar"}
        position={[0, 4.15, 0.08]}
      />
      {shop.open ? (
        <NeonText
          text="open"
          color={color}
          font={SCRIPT}
          width={0.9}
          k={3}
          position={[0, DOOR_H + 0.48, 0.06]}
        />
      ) : (
        <NeonText
          text="coming soon"
          color="#e8e2ff"
          font={SCRIPT}
          width={1.7}
          k={2.2}
          flicker
          position={[0, 1.55, 0.06]}
        />
      )}
    </group>
  );
}

export function Storefronts() {
  const statics = useMemo(buildStatics, []);
  const club = shopAt("club");
  const velvet = shopAt("velvet-room");
  const boutique = shopAt("boutique");
  const bar = shopAt("bar");
  return (
    <>
      <primitive object={statics} />
      {SHOPS.map((s) => (
        <ShopSigns key={s.id} shop={s} />
      ))}
      <group position={[velvet.x, 0, SHOP_Z]}>
        <RingNeon position={[0, 6.6, 0.1]} scale={1.5} />
      </group>
      {SHOPS.filter((s) => s.id !== "velvet-room").map((s) => (
        <group key={s.id} position={[s.x, 0, SHOP_Z]}>
          <Marquee w={s.width * 0.92} h={1.3} y={4.15} />
        </group>
      ))}
      <group position={[bar.x, 0, SHOP_Z]}>
        <MartiniNeon position={[1.55, 3.0, 0.08]} />
        <Cocktail position={[-1.6, 0.46, 0.12]} scale={1.3} />
        <Cocktail position={[-1.2, 0.46, 0.12]} scale={1.1} />
      </group>
      {/* a dressed mannequin on a plinth in front of the window */}
      <group
        position={[boutique.x - 1.55, 0.24, SHOP_Z + 0.38]}
        rotation-y={0.3}
      >
        <CrowdFigure look={MANNEQUIN} seed={7} />
      </group>
      <NeonText
        text="Daydaze"
        color="#ff2f9a"
        font={SCRIPT}
        width={4.2}
        k={3.6}
        position={[club.x, 6.55, SHOP_Z - 0.3]}
      />
      <NeonText
        text="plaza"
        color="#3fe0d0"
        font={MARQUEE}
        width={1.6}
        k={3}
        position={[club.x + 1.6, 6.0, SHOP_Z - 0.3]}
      />
      <SideSigns />
      <pointLight
        position={[velvet.x, 2.2, SHOP_Z + 1.2]}
        color="#ffb02e"
        intensity={7}
        distance={6}
      />
      <pointLight
        position={[boutique.x, 2.2, SHOP_Z + 1.2]}
        color="#ff6ac8"
        intensity={5}
        distance={6}
      />
      <pointLight
        position={[club.x, 3.2, SHOP_Z + 1.4]}
        color="#ff2f9a"
        intensity={8}
        distance={7}
      />
    </>
  );
}

/** Neon labels on the blade signs at each end of the street. */
function SideSigns() {
  const z1 = 3.5;
  return (
    <>
      {(
        [
          [-1, "KARAOKE", "#3fe0d0"],
          [1, "HOTEL", "#ff2f9a"],
        ] as const
      ).map(([side, label, color]) => (
        <group
          key={side}
          position={[side * (HALF_WIDTH + 2) - side * 2.6, 5, z1 - 1.6]}
        >
          <NeonText
            text={label}
            color={color}
            font={MARQUEE}
            width={3.6}
            k={3.4}
            flicker={side === 1}
            position-z={0.08}
            rotation-z={Math.PI / 2}
          />
        </group>
      ))}
    </>
  );
}

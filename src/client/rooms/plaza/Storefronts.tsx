import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Look } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";
import { MangoCocktail } from "../shared/Cocktail.tsx";
import { canvasTex, GOLD, hdr, LACQUER, neonMat } from "../shared/materials.ts";
import {
  DECO,
  MangoNeon,
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
const SHUTTER = canvasTex(
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
);

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

function edge(x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.3);
  return Array.from(
    { length: n },
    (_, i) =>
      new THREE.Vector3(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 0),
  );
}

function Storefront({ shop, children }: { shop: Shop; children?: ReactNode }) {
  const { x, width: w, color, accent } = shop;
  const glass = useMemo(() => windowTex(color), [color]);
  const facade = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: BRICK,
        color: new THREE.Color(accent).lerp(new THREE.Color("#ffffff"), 0.6),
        roughness: 0.42,
        metalness: 0.25,
      }),
    [accent],
  );
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
  const paneW = (w - 1.9) / 2;
  return (
    <group position={[x, 0, SHOP_Z]}>
      <mesh position={[0, SHOP_HEIGHT / 2, -DEPTH / 2]} material={facade}>
        <boxGeometry args={[w, SHOP_HEIGHT, DEPTH]} />
      </mesh>
      {/* gold cornice and plinth */}
      <mesh position={[0, SHOP_HEIGHT + 0.06, 0.02]} material={GOLD}>
        <boxGeometry args={[w + 0.1, 0.12, 0.16]} />
      </mesh>
      <mesh position={[0, 0.12, 0.02]} material={LACQUER}>
        <boxGeometry args={[w, 0.24, 0.12]} />
      </mesh>
      <group position-z={0.04}>
        <Neon points={outline} color={accent} k={3} radius={0.02} />
      </group>
      {/* shop windows either side of the door */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (0.95 + paneW / 2), 1.55, 0.02]}>
          <mesh>
            <planeGeometry args={[paneW, 2.2]} />
            <meshBasicMaterial
              map={glass}
              color={hdr("#ffffff", shop.open ? 1.1 : 0.7)}
              toneMapped={false}
            />
          </mesh>
          <mesh position-z={0.01} material={GOLD}>
            <boxGeometry args={[paneW + 0.08, 0.05, 0.04]} />
          </mesh>
          <mesh position={[0, 1.12, 0.01]} material={GOLD}>
            <boxGeometry args={[paneW + 0.08, 0.05, 0.04]} />
          </mesh>
        </group>
      ))}
      {shop.open ? <OpenDoor color={color} /> : <Shutter />}
      <NeonText
        text={shop.name}
        color={color}
        font={shop.id === "bar" || shop.open ? SCRIPT : DECO}
        width={w * 0.9}
        k={3.4}
        flicker={shop.id === "bar"}
        position={[0, 4.15, 0.08]}
      />
      {!shop.open && (
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
      {children}
    </group>
  );
}

function Shutter() {
  return (
    <group position={[0, 0, 0.02]}>
      <mesh position-y={DOOR_H / 2 + 0.12}>
        <planeGeometry args={[1.7, DOOR_H]} />
        <meshStandardMaterial map={SHUTTER} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position-y={DOOR_H + 0.2} material={LACQUER}>
        <boxGeometry args={[1.86, 0.22, 0.16]} />
      </mesh>
    </group>
  );
}

const DOORWAY = canvasTex(64, 256, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#ff2f9a");
  g.addColorStop(0.45, "#ffb02e");
  g.addColorStop(1, "#fff1c8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
});

/** The one open door: warm light spilling out, ropes and a gold frame. */
function OpenDoor({ color }: { color: string }) {
  return (
    <group position={[0, 0, 0.02]}>
      <mesh position-y={DOOR_H / 2 + 0.12}>
        <planeGeometry args={[1.7, DOOR_H]} />
        <meshBasicMaterial
          map={DOORWAY}
          color={hdr("#ffffff", 1.6)}
          toneMapped={false}
        />
      </mesh>
      {[-0.9, 0.9].map((dx) => (
        <mesh key={dx} position={[dx, DOOR_H / 2 + 0.12, 0.04]} material={GOLD}>
          <boxGeometry args={[0.1, DOOR_H + 0.1, 0.1]} />
        </mesh>
      ))}
      <mesh position={[0, DOOR_H + 0.2, 0.04]} material={GOLD}>
        <boxGeometry args={[1.9, 0.1, 0.1]} />
      </mesh>
      <NeonText
        text="open"
        color={color}
        font={SCRIPT}
        width={0.9}
        k={3}
        position={[0, DOOR_H + 0.48, 0.06]}
      />
    </group>
  );
}

/** Brass posts and velvet rope along the front of a door. */
function Ropes({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  const posts = [x0, (x0 + x1) / 2, x1];
  const rope = useMemo(() => {
    const mid = (x0 + x1) / 2;
    const curve = (a: number, b: number) =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(a, 0.92, 0),
        new THREE.Vector3((a + b) / 2, 0.7, 0),
        new THREE.Vector3(b, 0.92, 0),
      ]);
    return [curve(x0, mid), curve(mid, x1)].map(
      (c) => new THREE.TubeGeometry(c, 16, 0.025, 6),
    );
  }, [x0, x1]);
  return (
    <group position-z={z}>
      {posts.map((px) => (
        <group key={px} position-x={px}>
          <mesh position-y={0.47} material={GOLD}>
            <cylinderGeometry args={[0.03, 0.03, 0.94, 10]} />
          </mesh>
          <mesh position-y={0.03} material={GOLD}>
            <cylinderGeometry args={[0.16, 0.18, 0.05, 18]} />
          </mesh>
          <mesh position-y={0.97} material={GOLD}>
            <sphereGeometry args={[0.055, 12, 8]} />
          </mesh>
        </group>
      ))}
      {rope.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial
            color="#7a0b4f"
            sheen={1}
            sheenColor="#ff7ad0"
            roughness={0.6}
          />
        </mesh>
      ))}
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
  const off = useMemo(() => hdr("#ffb02e", 0.8), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const step = calm ? 0 : Math.floor(clock.elapsedTime * 6);
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

/** A pixel heart for the arcade, one lit square per cell. */
function PixelHeart(props: { position: [number, number, number] }) {
  const rows = [
    ".XX.XX.",
    "XXXXXXX",
    "XXXXXXX",
    ".XXXXX.",
    "..XXX..",
    "...X...",
  ];
  const cells = rows.flatMap((r, j) =>
    [...r].flatMap((ch, i) => (ch === "X" ? [[i - 3, 2.5 - j] as const] : [])),
  );
  const mats = useMemo(
    () => [neonMat("#ff2f9a", 3), neonMat("#7b4dff", 3), neonMat("#3fe0d0", 3)],
    [],
  );
  return (
    <group {...props}>
      {cells.map(([i, j], n) => (
        <mesh
          key={n}
          position={[i * 0.16, j * 0.16, 0]}
          material={mats[(n * 5) % mats.length]}
        >
          <planeGeometry args={[0.13, 0.13]} />
        </mesh>
      ))}
    </group>
  );
}

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

/** Taller blocks closing the street at both ends, each with a blade sign. */
function SideBlocks() {
  const facade = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: BRICK,
        color: "#c8b8e0",
        roughness: 0.45,
        metalness: 0.25,
      }),
    [],
  );
  const z0 = SHOP_Z - 0.5;
  const z1 = 3.5;
  return (
    <>
      {(
        [
          [-1, "KARAOKE", "#3fe0d0"],
          [1, "HOTEL", "#ff2f9a"],
        ] as const
      ).map(([side, label, color]) => (
        <group key={side} position-x={side * (HALF_WIDTH + 2)}>
          <mesh position={[0, 4, (z0 + z1) / 2]} material={facade}>
            <boxGeometry args={[4, 8, z1 - z0]} />
          </mesh>
          <mesh position={[-side * 2.02, 8.02, (z0 + z1) / 2]} material={GOLD}>
            <boxGeometry args={[0.08, 0.1, z1 - z0]} />
          </mesh>
          {/* blade sign standing out from the wall */}
          <group position={[-side * 2.6, 5, z1 - 1.6]}>
            <mesh material={LACQUER}>
              <boxGeometry args={[0.9, 3.8, 0.12]} />
            </mesh>
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
        </group>
      ))}
    </>
  );
}

export function Storefronts() {
  const shop = (id: string) => {
    const found = SHOPS.find((s) => s.id === id);
    if (!found) throw new Error(`No shop called ${id}`);
    return found;
  };
  const club = shop("club");
  const mango = shop("mango-room");
  const boutique = shop("boutique");
  return (
    <>
      <SideBlocks />
      <Storefront shop={shop("arcade")}>
        <PixelHeart position={[0, 3.05, 0.08]} />
      </Storefront>
      <Storefront shop={mango}>
        <MangoNeon position={[0, 6.6, 0.1]} scale={1.5} />
        <Ropes x0={-1.9} x1={-1.0} z={0.55} />
        <Ropes x0={1.0} x1={1.9} z={0.55} />
      </Storefront>
      <Storefront shop={club}>
        <Marquee w={club.width * 0.92} h={1.3} y={4.15} />
        <Ropes x0={-2.6} x1={-1.1} z={0.7} />
        <Ropes x0={1.1} x1={2.6} z={0.7} />
      </Storefront>
      <Storefront shop={shop("bar")}>
        <MartiniNeon position={[1.55, 3.0, 0.08]} />
        <MangoCocktail position={[-1.6, 0.46, 0.12]} scale={1.3} />
        <MangoCocktail position={[-1.2, 0.46, 0.12]} scale={1.1} />
      </Storefront>
      <Storefront shop={boutique}>
        {/* a dressed mannequin on a plinth in front of the window */}
        <mesh position={[-1.55, 0.12, 0.38]} material={GOLD}>
          <cylinderGeometry args={[0.32, 0.36, 0.24, 28]} />
        </mesh>
        <Doll
          look={MANNEQUIN}
          mood="pose"
          seed={7}
          position={[-1.55, 0.24, 0.38]}
          rotation-y={0.3}
        />
      </Storefront>
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
      <pointLight
        position={[mango.x, 2.2, SHOP_Z + 1.2]}
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

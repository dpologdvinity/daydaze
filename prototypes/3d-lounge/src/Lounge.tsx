import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  Sparkles,
} from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lathe, lumpy } from "./dollGeometry";
import { OFF } from "./flags";
import { gradientMap } from "./toon";

export const ROOM = 6;
export const BOOTH = new THREE.Vector3(4.2, 0, 0.7);
export const DANCE = new THREE.Vector3(-2.4, 0, 1.5);

const hdr = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

const GOLD = new THREE.MeshStandardMaterial({
  color: "#f6c46a",
  metalness: 1,
  roughness: 0.25,
  envMapIntensity: 1.5,
});
const LACQUER = new THREE.MeshStandardMaterial({
  color: "#0d0610",
  metalness: 0.3,
  roughness: 0.3,
  envMapIntensity: 0.6,
});
const neonMat = (hex: string, k = 4) =>
  new THREE.MeshBasicMaterial({ color: hdr(hex, k), toneMapped: false });

function gradientTex(stops: [number, string][], w = 4, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}

const SHELF_GLOW = new THREE.MeshBasicMaterial({
  color: hdr("#ff8a30", 1.5),
  map: gradientTex([
    [0, "#000"],
    [0.55, "#3a1a0a"],
    [1, "#fff"],
  ]),
  toneMapped: false,
});

// dark glass tile with a lit rim, tinted per-instance
const TILE_TEX = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 64, 64);
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 40);
  g.addColorStop(0, "rgb(70,70,70)");
  g.addColorStop(0.65, "rgb(30,30,30)");
  g.addColorStop(0.8, "rgb(120,120,120)");
  g.addColorStop(1, "rgb(255,255,255)");
  ctx.fillStyle = g;
  ctx.fillRect(3, 3, 58, 58);
  return new THREE.CanvasTexture(c);
})();

const DISCO_TEX = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  for (let x = 0; x < 64; x += 2)
    for (let y = 0; y < 32; y += 2) {
      const v = Math.random();
      const l = v > 0.93 ? 255 : v > 0.8 ? 120 : 18;
      ctx.fillStyle = `rgb(${l},${l * 0.85},${l})`;
      ctx.fillRect(x, y, 2, 2);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
})();

function canvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat?: [number, number],
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// ---------------------------------------------------------------- walls

function Walls() {
  const tufted = useMemo(
    () =>
      canvasTex(
        256,
        256,
        (ctx) => {
          ctx.fillStyle = "#4a1046";
          ctx.fillRect(0, 0, 256, 256);
          // quilted diamonds: highlight top-left, shade bottom-right
          for (const [cx, cy] of [
            [128, 128],
            [0, 0],
            [256, 0],
            [0, 256],
            [256, 256],
          ]) {
            const g = ctx.createRadialGradient(
              cx - 30,
              cy - 30,
              6,
              cx,
              cy,
              130,
            );
            g.addColorStop(0, "rgba(255,140,220,0.30)");
            g.addColorStop(0.6, "rgba(120,20,100,0.0)");
            g.addColorStop(1, "rgba(10,0,15,0.55)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 128);
            ctx.lineTo(cx + 128, cy);
            ctx.lineTo(cx, cy + 128);
            ctx.lineTo(cx - 128, cy);
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(20,0,20,0.8)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 128);
          ctx.lineTo(128, 0);
          ctx.lineTo(256, 128);
          ctx.lineTo(128, 256);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = "#f6c46a";
          for (const [x, y] of [
            [0, 128],
            [128, 0],
            [256, 128],
            [128, 256],
          ]) {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        [14, 6],
      ),
    [],
  );
  const velvet = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tufted,
        roughness: 0.75,
        metalness: 0.05,
      }),
    [tufted],
  );
  const H = 4.6;
  const wall = (pos: [number, number, number], ry: number) => (
    <group position={pos} rotation-y={ry}>
      <mesh position-y={H / 2} material={velvet}>
        <planeGeometry args={[12, H]} />
      </mesh>
      {/* black lacquer wainscot with gold rail */}
      <mesh position={[0, 0.5, 0.02]} material={LACQUER}>
        <boxGeometry args={[12, 1, 0.04]} />
      </mesh>
      <mesh position={[0, 1.02, 0.05]} material={GOLD}>
        <boxGeometry args={[12, 0.05, 0.06]} />
      </mesh>
      {[-5, -3, -1, 1, 3, 5].map((x) => (
        <mesh key={x} position={[x, H / 2, 0.03]} material={GOLD}>
          <boxGeometry args={[0.04, H, 0.04]} />
        </mesh>
      ))}
      {/* cornice neon */}
      <mesh position={[0, H - 0.25, 0.06]} material={neonMat("#b14dff", 3)}>
        <boxGeometry args={[12, 0.025, 0.025]} />
      </mesh>
      <mesh position={[0, 0.06, 0.06]} material={neonMat("#ff2f9a", 2.2)}>
        <boxGeometry args={[12, 0.02, 0.02]} />
      </mesh>
    </group>
  );
  return (
    <>
      {wall([0, 0, -ROOM], 0)}
      {wall([-ROOM, 0, 0], Math.PI / 2)}
      {wall([ROOM, 0, 0], -Math.PI / 2)}
    </>
  );
}

// ---------------------------------------------------------------- floor

function Floor({ onPick }: { onPick: (p: THREE.Vector3) => void }) {
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick(e.point.clone());
  };
  return (
    <mesh rotation-x={-Math.PI / 2} onClick={click} name="floor">
      <planeGeometry args={[ROOM * 2, ROOM * 2]} />
      {OFF.has("reflector") ? (
        <meshStandardMaterial color="#120814" metalness={0.6} roughness={0.3} />
      ) : (
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={3.2}
          mixContrast={1.1}
          roughness={0.55}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#120814"
          metalness={0.6}
          mirror={0.7}
        />
      )}
    </mesh>
  );
}

// ---------------------------------------------------------------- neon

function Neon({
  points,
  color,
  k = 4,
  radius = 0.022,
  closed = false,
}: {
  points: THREE.Vector3[];
  color: string;
  k?: number;
  radius?: number;
  closed?: boolean;
}) {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points, closed, "centripetal"),
        points.length * 12,
        radius,
        8,
        closed,
      ),
    [points, closed, radius],
  );
  const mat = useMemo(() => neonMat(color, k), [color, k]);
  return <mesh geometry={geo} material={mat} />;
}

function NeonText({
  text,
  color,
  font,
  width,
  k = 3.2,
  ...rest
}: {
  text: string;
  color: string;
  font: string;
  width: number;
  k?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const tex = useMemo(
    () =>
      canvasTex(1024, 320, (ctx) => {
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 16;
        ctx.strokeText(text, 512, 170);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 7;
        ctx.strokeText(text, 512, 170);
      }),
    [text, font],
  );
  return (
    <mesh {...rest}>
      <planeGeometry args={[width, (width * 320) / 1024]} />
      <meshBasicMaterial
        map={tex}
        color={hdr(color, k)}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

const SCRIPT =
  "italic 700 200px 'Z003', 'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive";
const DECO =
  "700 170px 'Didot', 'Bodoni 72', 'TeX Gyre Bonum', 'URW Bookman', Georgia, serif";

function MangoNeon(props: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const mango = useMemo(() => {
    // kidney-shaped mango outline
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = 0.55 + 0.12 * Math.cos(a) - 0.08 * Math.sin(2 * a);
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * r * 0.82 + 0.08 * Math.sin(a) ** 2,
          Math.sin(a) * r,
          0,
        ),
      );
    }
    return pts;
  }, []);
  const leaf = useMemo(
    () =>
      [
        [0.05, 0.58],
        [0.22, 0.82],
        [0.48, 0.9],
        [0.36, 0.72],
        [0.05, 0.58],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    [],
  );
  const stem = useMemo(
    () =>
      [
        [0.0, 0.52],
        [-0.04, 0.7],
        [-0.1, 0.82],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    [],
  );
  const blush = useMemo(
    () =>
      [
        [-0.25, -0.12],
        [-0.3, 0.1],
        [-0.18, 0.3],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    [],
  );
  return (
    <group {...props}>
      <Neon points={mango} color="#ff9a1f" k={4.5} radius={0.028} closed />
      <Neon points={blush} color="#ff3d6e" k={4} radius={0.02} />
      <Neon points={leaf} color="#3dff9a" k={3.2} radius={0.02} />
      <Neon points={stem} color="#3dff9a" k={3.2} radius={0.018} />
      <NeonText
        text="mango hour"
        color="#ff4fb3"
        font={SCRIPT}
        width={2.4}
        position={[0, -0.95, 0]}
      />
    </group>
  );
}

function LionCrest(props: { position: [number, number, number] }) {
  const tex = useMemo(
    () =>
      canvasTex(512, 512, (ctx) => {
        const g = ctx.createRadialGradient(200, 180, 20, 256, 256, 260);
        g.addColorStop(0, "#fff1b8");
        g.addColorStop(0.5, "#e7a93f");
        g.addColorStop(1, "#7a4a12");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "#3a1030";
        ctx.font =
          "320px 'DejaVu Sans', 'Segoe UI Symbol', 'Apple Symbols', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♌", 256, 270);
      }),
    [],
  );
  const rays = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);
  return (
    <group {...props}>
      {rays.map((i) => {
        const a = (i / 20) * Math.PI * 2;
        const L = i % 2 ? 0.55 : 0.85;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * (0.55 + L / 2),
              Math.sin(a) * (0.55 + L / 2),
              -0.02,
            ]}
            rotation-z={a}
            material={GOLD}
          >
            <boxGeometry args={[L, 0.035, 0.02]} />
          </mesh>
        );
      })}
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.46, 0.46, 0.05, 48]} />
        <meshStandardMaterial
          attach="material"
          color="#ffffff"
          metalness={0.9}
          roughness={0.3}
          map={tex}
        />
      </mesh>
      <mesh material={GOLD}>
        <torusGeometry args={[0.5, 0.045, 12, 64]} />
      </mesh>
      <mesh material={neonMat("#ffb02e", 3.5)}>
        <torusGeometry args={[0.6, 0.012, 8, 64]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- bar

const BOTTLE = lathe(
  [
    [0, 0],
    [0.005, 0.038],
    [0.2, 0.04],
    [0.235, 0.022],
    [0.27, 0.012],
    [0.33, 0.012],
    [0.335, 0],
  ],
  12,
);

function Bottles({
  x0,
  x1,
  y,
  z,
}: {
  x0: number;
  x1: number;
  y: number[];
  z: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = 16;
  const count = per * y.length;
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const palette = [
      "#ffb02e",
      "#ff2f6a",
      "#3dff9a",
      "#5ab0ff",
      "#ffe6a0",
      "#c04dff",
      "#ff7a1f",
    ];
    const c = new THREE.Color();
    let i = 0;
    y.forEach((yy, row) => {
      for (let k = 0; k < per; k++) {
        const s = 0.75 + ((k * 7 + row * 3) % 5) * 0.09;
        o.position.set(
          x0 + ((x1 - x0) * (k + 0.5)) / per,
          yy,
          z + (k % 2) * 0.06,
        );
        o.scale.set(1, s, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        c.set(palette[(k * 3 + row * 2) % palette.length]).multiplyScalar(0.85);
        m.setColorAt(i, c);
        i++;
      }
    });
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
  }, [x0, x1, y, z]);
  return (
    <instancedMesh ref={ref} args={[BOTTLE, undefined, count]}>
      <meshBasicMaterial transparent opacity={0.92} />
    </instancedMesh>
  );
}

function MangoCocktail(props: {
  position: [number, number, number];
  scale?: number;
}) {
  const { glass, drink } = useMemo(() => {
    const glass = lathe(
      [
        [0, 0.05],
        [0.01, 0.05],
        [0.012, 0.008],
        [0.09, 0.006],
        [0.11, 0.03],
        [0.17, 0.05],
        [0.24, 0.042],
        [0.3, 0.056],
      ],
      24,
    );
    const drink = lathe(
      [
        [0.1, 0],
        [0.11, 0.026],
        [0.17, 0.045],
        [0.24, 0.037],
        [0.27, 0.044],
        [0.27, 0],
      ],
      24,
    );
    const p = drink.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const a = new THREE.Color("#ff2f4a"),
      b = new THREE.Color("#ffc21f"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.lerpColors(a, b, THREE.MathUtils.smoothstep(p.getY(i), 0.12, 0.25));
      col.set([c.r * 1.8, c.g * 1.8, c.b * 1.8], i * 3);
    }
    drink.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { glass, drink };
  }, []);
  return (
    <group {...props}>
      <mesh geometry={drink}>
        <meshBasicMaterial vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial
          color="#ffe8f5"
          metalness={0.1}
          roughness={0.02}
          transparent
          opacity={0.3}
          envMapIntensity={2}
        />
      </mesh>
      {/* mango wedge, straw, umbrella */}
      <mesh
        position={[0.05, 0.29, 0]}
        rotation-z={-0.5}
        scale={[0.05, 0.03, 0.025]}
      >
        <sphereGeometry args={[1, 16, 10, 0, Math.PI]} />
        <meshToonMaterial color="#ffa21f" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.02, 0.32, 0.01]} rotation-z={0.25}>
        <cylinderGeometry args={[0.005, 0.005, 0.22, 8]} />
        <meshToonMaterial color="#ff2f9a" gradientMap={gradientMap} />
      </mesh>
      <mesh position={[-0.05, 0.42, -0.01]} rotation={[0.3, 0, 0.45]}>
        <coneGeometry args={[0.07, 0.035, 12, 1, true]} />
        <meshToonMaterial
          color="#ff5fc1"
          gradientMap={gradientMap}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Mangoes({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      // kidney bulge + red/orange/green blush
      p.setX(i, x + 0.25 * (1 - p.getY(i) ** 2) * (x > 0 ? 0.3 : -0.1));
      c.set(x > 0.3 ? "#ff4a2a" : x < -0.5 ? "#9bd43a" : "#ffa21f");
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.computeVertexNormals();
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <group position={position}>
      <mesh material={GOLD} position-y={0.03}>
        <cylinderGeometry args={[0.2, 0.1, 0.07, 24, 1, true]} />
      </mesh>
      {[
        [0, 0.09, 0, 0.3],
        [0.1, 0.08, 0.05, 1.8],
        [-0.08, 0.08, 0.07, 3.6],
        [0.02, 0.15, -0.02, 5],
      ].map(([x, y, z, r], i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[x, y, z]}
          rotation-y={r}
          scale={[0.075, 0.06, 0.06]}
        >
          <meshToonMaterial vertexColors gradientMap={gradientMap} />
        </mesh>
      ))}
    </group>
  );
}

function Bar() {
  const fluted = useMemo(
    () =>
      canvasTex(
        128,
        16,
        (ctx) => {
          const g = ctx.createLinearGradient(0, 0, 128, 0);
          g.addColorStop(0, "#2a0420");
          g.addColorStop(0.45, "#c2187a");
          g.addColorStop(0.55, "#ff6ac8");
          g.addColorStop(1, "#2a0420");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 128, 16);
        },
        [44, 1],
      ),
    [],
  );
  const cx = -0.8,
    len = 6.2,
    z = -4.7;
  return (
    <group>
      {/* counter */}
      <mesh position={[cx, 0.5, z]}>
        <boxGeometry args={[len, 1, 0.62]} />
        <meshStandardMaterial map={fluted} roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[cx, 1.03, z]} material={LACQUER}>
        <boxGeometry args={[len + 0.2, 0.06, 0.78]} />
      </mesh>
      <mesh position={[cx, 1.0, z + 0.39]} material={GOLD}>
        <boxGeometry args={[len + 0.2, 0.03, 0.03]} />
      </mesh>
      <mesh position={[cx, 0.96, z + 0.36]} material={neonMat("#ffb02e", 4)}>
        <boxGeometry args={[len, 0.018, 0.018]} />
      </mesh>
      <mesh position={[cx, 0.08, z + 0.33]} material={neonMat("#ff2f9a", 3)}>
        <boxGeometry args={[len, 0.02, 0.02]} />
      </mesh>
      {/* back bar */}
      <mesh position={[cx, 2.15, -5.96]}>
        <planeGeometry args={[len, 2.1]} />
        <meshStandardMaterial color="#2a1a30" metalness={1} roughness={0.12} />
      </mesh>
      {[1.4, 1.95, 2.5].map((y) => (
        <group key={y}>
          <mesh position={[cx, y - 0.02, -5.8]}>
            <boxGeometry args={[len, 0.025, 0.3]} />
            <meshStandardMaterial
              color="#ffd7f0"
              transparent
              opacity={0.35}
              roughness={0.05}
            />
          </mesh>
          <mesh position={[cx, y - 0.04, -5.66]} material={GOLD}>
            <boxGeometry args={[len, 0.02, 0.02]} />
          </mesh>
          <mesh position={[cx, y + 0.18, -5.94]} material={SHELF_GLOW}>
            <planeGeometry args={[len, 0.34]} />
          </mesh>
        </group>
      ))}
      <Bottles
        x0={cx - len / 2 + 0.1}
        x1={cx + len / 2 - 0.1}
        y={[1.39, 1.94, 2.49]}
        z={-5.84}
      />
      <mesh position={[cx, 3.25, -5.9]} material={GOLD}>
        <boxGeometry args={[len + 0.3, 0.06, 0.12]} />
      </mesh>
      {/* stools */}
      {[-3.2, -2.3, -0.5, 0.5, 1.4].map((x) => (
        <group key={x} position={[x, 0, -4.05]}>
          <mesh position-y={0.36} material={GOLD}>
            <cylinderGeometry args={[0.025, 0.025, 0.72, 10]} />
          </mesh>
          <mesh position-y={0.02} material={GOLD}>
            <cylinderGeometry args={[0.18, 0.2, 0.03, 20]} />
          </mesh>
          <mesh position-y={0.76}>
            <cylinderGeometry args={[0.21, 0.19, 0.09, 24]} />
            <meshPhysicalMaterial
              color="#7a0b4f"
              sheen={1}
              sheenColor="#ff7ad0"
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
      <MangoCocktail position={[0.35, 1.06, -4.55]} />
      <MangoCocktail position={[-2.6, 1.06, -4.6]} scale={0.9} />
      <Mangoes position={[-0.2, 1.06, -4.62]} />
    </group>
  );
}

// ---------------------------------------------------------------- booth

function sectorShape(r0: number, r1: number, a0: number, a1: number) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r1, a0, a1, false);
  s.absarc(0, 0, r0, a1, a0, true);
  s.closePath();
  return s;
}

function Booth() {
  const velvet = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#5c0b3f",
        sheen: 1,
        sheenColor: new THREE.Color("#ff6ac8"),
        sheenRoughness: 0.35,
        roughness: 0.65,
      }),
    [],
  );
  const { seat, backs } = useMemo(() => {
    const span = 1.85;
    const ext = (shape: THREE.Shape, depth: number, bevel: number) => {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        curveSegments: 32,
      });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const seat = ext(sectorShape(0.95, 1.5, -span, span), 0.36, 0.05);
    const n = 11;
    const backs = Array.from({ length: n }, (_, i) => {
      const a0 = -span + (i * 2 * span) / n + 0.012;
      const a1 = -span + ((i + 1) * 2 * span) / n - 0.012;
      return ext(sectorShape(1.5, 1.68, a0, a1), 0.95, 0.055);
    });
    return { seat, backs };
  }, []);
  return (
    <group position={BOOTH}>
      <mesh geometry={seat} material={velvet} position-y={0.06} />
      {backs.map((g, i) => (
        <mesh key={i} geometry={g} material={velvet} position-y={0.06} />
      ))}
      <mesh position-y={0.04} rotation-x={-Math.PI / 2} material={GOLD}>
        <ringGeometry args={[1.48, 1.74, 64, 1, -1.9, 3.8]} />
      </mesh>
      {/* table */}
      <group position={[-0.25, 0, 0]}>
        <mesh position-y={0.36} material={GOLD}>
          <cylinderGeometry args={[0.05, 0.16, 0.72, 16]} />
        </mesh>
        <mesh position-y={0.73} material={LACQUER}>
          <cylinderGeometry args={[0.5, 0.5, 0.04, 40]} />
        </mesh>
        <mesh position-y={0.73} rotation-x={Math.PI / 2} material={GOLD}>
          <torusGeometry args={[0.5, 0.018, 8, 48]} />
        </mesh>
        <MangoCocktail position={[0.15, 0.75, 0.18]} scale={0.85} />
        <MangoCocktail position={[0.1, 0.75, -0.22]} scale={0.85} />
        {[
          [-0.18, 0.05],
          [-0.05, -0.05],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.75, z]}>
            <mesh position-y={0.04}>
              <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
              <meshStandardMaterial color="#ff3d8a" transparent opacity={0.6} />
            </mesh>
            <mesh position-y={0.07} material={neonMat("#ffc46a", 5)}>
              <sphereGeometry args={[0.012, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- dance floor

function DanceFloor() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 5,
    size = 0.64;
  const cols = useMemo(
    () =>
      ["#ff2f9a", "#9b5cff", "#ffb02e", "#3fe0d0"].map(
        (h) => new THREE.Color(h),
      ),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    for (let i = 0; i < n * n; i++) {
      o.position.set(
        ((i % n) - 2) * size,
        0.012,
        (Math.floor(i / n) - 2) * size,
      );
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, cols[0]);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [cols]);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const step = Math.floor(t / 2.2);
    for (let i = 0; i < n * n; i++) {
      const x = (i % n) - 2,
        z = Math.floor(i / n) - 2;
      const d = Math.hypot(x, z);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 - d * 1.4);
      c.copy(cols[(i + step + (x + z + 8)) % cols.length]).multiplyScalar(
        0.35 + pulse * 2.2,
      );
      m.setColorAt(i, c);
    }
    m.instanceColor!.needsUpdate = true;
  });
  return (
    <group position={DANCE}>
      <instancedMesh ref={ref} args={[undefined, undefined, n * n]}>
        <boxGeometry args={[size - 0.04, 0.024, size - 0.04]} />
        <meshBasicMaterial toneMapped={false} map={TILE_TEX} />
      </instancedMesh>
      <mesh position-y={0.012} rotation-x={-Math.PI / 2} material={GOLD}>
        <ringGeometry
          args={[
            size * 2.6 * Math.SQRT2,
            size * 2.78 * Math.SQRT2,
            4,
            1,
            Math.PI / 4,
          ]}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- fixtures

function DiscoBall() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
  });
  return (
    <group position={[DANCE.x, 3.55, DANCE.z]}>
      <mesh position-y={0.6} material={GOLD}>
        <cylinderGeometry args={[0.008, 0.008, 1.0, 6]} />
      </mesh>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.34, 28, 18]} />
          <meshStandardMaterial
            color="#e8e0ff"
            metalness={0.9}
            roughness={0.18}
            flatShading
            envMapIntensity={2.4}
            emissive={hdr("#ffe6ff", 2.5)}
            emissiveMap={DISCO_TEX}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function Chandelier({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tiers = [
    { r: 0.75, y: 0, n: 30 },
    { r: 0.55, y: -0.28, n: 24 },
    { r: 0.32, y: -0.52, n: 16 },
  ];
  const count = tiers.reduce((a, t) => a + t.n, 0);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    let i = 0;
    for (const t of tiers)
      for (let k = 0; k < t.n; k++) {
        const a = (k / t.n) * Math.PI * 2;
        o.position.set(
          Math.cos(a) * t.r,
          t.y - 0.12 - (k % 2) * 0.06,
          Math.sin(a) * t.r,
        );
        o.scale.set(0.028, 0.075, 0.028);
        o.rotation.set(0, a, 0);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    m.instanceMatrix.needsUpdate = true;
  });
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current)
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.15;
  });
  return (
    <group position={position} ref={g}>
      <mesh position-y={0.6} material={GOLD}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 6]} />
      </mesh>
      {tiers.map((t) => (
        <mesh
          key={t.r}
          position-y={t.y}
          rotation-x={Math.PI / 2}
          material={GOLD}
        >
          <torusGeometry args={[t.r, 0.018, 8, 48]} />
        </mesh>
      ))}
      {tiers.map((t) => (
        <mesh
          key={`b${t.r}`}
          position-y={t.y + 0.06}
          material={neonMat("#ffd6a0", 3)}
        >
          <torusGeometry args={[t.r * 0.92, 0.01, 6, 48]} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#ffe8ff"
          emissive="#ff8ad8"
          emissiveIntensity={0.5}
          metalness={0.2}
          roughness={0}
          envMapIntensity={3}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

function Drape({
  position,
  color = "#2a0a4a",
}: {
  position: [number, number, number];
  color?: string;
}) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.5, 4.4, 60, 6);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      // gathered at the tie-back, falling into folds
      const gather = 1 - 0.35 * Math.exp(-Math.pow((y + 0.6) / 0.5, 2));
      p.setX(i, x * gather);
      p.setZ(i, Math.sin(x * 15) * 0.07 + Math.sin(x * 6.5 + 1) * 0.04);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <mesh geometry={geo} position-y={2.2}>
        <meshPhysicalMaterial
          color={color}
          sheen={1}
          sheenColor="#c77dff"
          sheenRoughness={0.3}
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.6, 0.1]} material={GOLD}>
        <torusGeometry args={[0.55, 0.02, 8, 24, Math.PI]} />
      </mesh>
    </group>
  );
}

function Palm({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { trunk, frond } = useMemo(() => {
    const trunk = lumpy(
      lathe(
        [
          [0, 0.07],
          [0.6, 0.055],
          [1.2, 0.045],
          [1.7, 0.04],
          [1.75, 0],
        ],
        10,
      ),
      0.008,
      40,
    );
    const frond = new THREE.PlaneGeometry(0.34, 1.1, 1, 12);
    const p = frond.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = (p.getY(i) + 0.55) / 1.1;
      p.setX(
        i,
        p.getX(i) * Math.sin(Math.PI * Math.min(1, y * 1.1)) * (1 - y * 0.4),
      );
      p.setY(i, y * 1.1);
      p.setZ(i, -0.6 * y * y);
    }
    frond.computeVertexNormals();
    return { trunk, frond };
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.25} material={GOLD}>
        <cylinderGeometry args={[0.26, 0.2, 0.5, 20]} />
      </mesh>
      <mesh geometry={trunk} position-y={0.45}>
        <meshToonMaterial color="#3a2418" gradientMap={gradientMap} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          geometry={frond}
          position-y={2.15}
          rotation={[-0.5 - (i % 3) * 0.25, (i / 10) * Math.PI * 2, 0, "YXZ"]}
        >
          <meshToonMaterial
            color={i % 2 ? "#1f5a34" : "#2a7240"}
            gradientMap={gradientMap}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- lights

// Fake volumetric beams: additive cones, no real lights (forward-shaded
// lights are the main per-pixel cost here).
const BEAM_GEO = (() => {
  const g = new THREE.ConeGeometry(0.85, 6.5, 32, 1, true);
  g.translate(0, -3.25, 0);
  g.rotateX(-Math.PI / 2);
  return g;
})();

function beamMat(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: hdr(color, 0.9) } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.5);
        gl_FragColor = vec4(uColor * core * pow(vY, 1.3) * 0.32, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function Beams() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const beams = useMemo(
    () => [
      { pos: [-5.2, 4.4, 4.5] as const, mat: beamMat("#ff2f9a"), ph: 0 },
      { pos: [0.5, 4.4, 5] as const, mat: beamMat("#9b5cff"), ph: 2 },
      { pos: [-5.2, 4.4, -2.5] as const, mat: beamMat("#ffb02e"), ph: 4 },
    ],
    [],
  );
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const ph = beams[i].ph;
      target.set(
        DANCE.x + Math.sin(t * 0.5 + ph) * 2.2,
        0,
        DANCE.z + Math.cos(t * 0.37 + ph) * 1.8,
      );
      m.lookAt(target);
    });
  });
  return (
    <>
      {beams.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={b.pos}
          geometry={BEAM_GEO}
          material={b.mat}
        />
      ))}
    </>
  );
}

function Lights() {
  const dance = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (dance.current)
      dance.current.intensity = 3 + Math.sin(clock.elapsedTime * 2.2) * 1.5;
  });
  return (
    <>
      <ambientLight color="#4a2468" intensity={0.25} />
      <hemisphereLight args={["#6b3cff", "#ff2f9a", 0.25]} />
      <directionalLight position={[2, 5, 6]} color="#fff1f4" intensity={2.2} />
      <directionalLight
        position={[-6, 3, -4]}
        color="#3fe0d0"
        intensity={0.5}
      />
      <pointLight
        position={[-0.8, 2.0, -4.0]}
        color="#ffa040"
        intensity={10}
        distance={7}
      />
      <pointLight
        position={[BOOTH.x - 0.5, 2.4, BOOTH.z]}
        color="#ff2fa8"
        intensity={9}
        distance={6}
      />
      <pointLight
        ref={dance}
        position={[DANCE.x, 2.4, DANCE.z]}
        color="#9b5cff"
        intensity={6}
        distance={5}
      />
      <pointLight
        position={[-5.2, 2.6, -1.4]}
        color="#c03cff"
        intensity={8}
        distance={6}
      />
      <Beams />
    </>
  );
}

// ---------------------------------------------------------------- room

export function Lounge({ onPick }: { onPick: (p: THREE.Vector3) => void }) {
  const arch = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 0.1, -0.9),
      new THREE.Vector3(0, 2.2, -0.9),
    ];
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI;
      pts.push(
        new THREE.Vector3(0, 2.2 + Math.sin(a) * 0.9, Math.cos(a) * 0.9),
      );
    }
    pts.push(new THREE.Vector3(0, 2.2, 0.9), new THREE.Vector3(0, 0.1, 0.9));
    return pts;
  }, []);
  return (
    <>
      <color attach="background" args={["#07020b"]} />
      <fog attach="fog" args={["#12041c", 9, 26]} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="ring"
          color="#ff2f9a"
          intensity={3}
          position={[0, 3, 4]}
          scale={4}
        />
        <Lightformer
          form="rect"
          color="#ffb02e"
          intensity={3}
          position={[0, 2, -6]}
          scale={[10, 2, 1]}
        />
        <Lightformer
          form="rect"
          color="#9b5cff"
          intensity={2.5}
          position={[-6, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[10, 3, 1]}
        />
        <Lightformer
          form="rect"
          color="#ffffff"
          intensity={1.5}
          position={[3, 5, 3]}
          scale={[3, 3, 1]}
        />
      </Environment>
      <Lights />
      <Floor onPick={onPick} />
      <Walls />
      <Bar />
      <LionCrest position={[-0.8, 3.75, -5.9]} />
      <NeonText
        text="Daydaze"
        color="#ff2f9a"
        font={SCRIPT}
        width={3.4}
        position={[3.9, 2.9, -5.9]}
      />
      <NeonText
        text="VIP"
        color="#b14dff"
        font={DECO}
        width={1.6}
        k={3.6}
        position={[-5.9, 3.55, -1.5]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <MangoNeon
        position={[5.92, 2.95, BOOTH.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <group position={[-5.9, 0, -1.5]}>
        <Neon points={arch} color="#ff2f9a" k={4} radius={0.025} />
        <mesh position={[0.01, 1.6, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[1.7, 3.1]} />
          <meshStandardMaterial
            color="#1a0c24"
            metalness={1}
            roughness={0.08}
          />
        </mesh>
      </group>
      <Drape position={[-5.85, 0, -3.4]} />
      <Drape position={[-5.85, 0, 0.4]} />
      <Drape position={[-5.85, 0, 3.6]} color="#3a0a2e" />
      <Booth />
      <DanceFloor />
      <DiscoBall />
      <Chandelier position={[2.2, 3.5, -1.0]} />
      <Palm position={[-5.1, 0, -5.1]} />
      <Palm position={[-5.0, 0, -1.5]} scale={0.85} />
      <Palm position={[5.0, 0, 4.6]} scale={1.1} />
      <Palm position={[5.1, 0, -4.9]} scale={0.9} />
      {!OFF.has("sparkles") && (
        <Sparkles
          count={140}
          scale={[11, 3.8, 11]}
          position={[0, 2.1, 0]}
          size={2.2}
          speed={0.25}
          color="#ffc8f0"
          opacity={0.7}
        />
      )}
    </>
  );
}

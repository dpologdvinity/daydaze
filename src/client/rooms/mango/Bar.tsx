import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lathe } from "../../avatar/dollGeometry.ts";
import { gradientMap } from "../../avatar/toon.ts";
import { MangoCocktail } from "../shared/Cocktail.tsx";
import {
  canvasTex,
  GOLD,
  gradientTex,
  hdr,
  LACQUER,
  neonMat,
} from "../shared/materials.ts";

const SHELF_GLOW = new THREE.MeshBasicMaterial({
  color: hdr("#ff8a30", 1.5),
  map: gradientTex([
    [0, "#000"],
    [0.55, "#3a1a0a"],
    [1, "#fff"],
  ]),
  toneMapped: false,
});

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
    const m = ref.current;
    if (!m) return;
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
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [x0, x1, y, z]);
  return (
    <instancedMesh ref={ref} args={[BOTTLE, undefined, count]}>
      <meshBasicMaterial transparent opacity={0.92} />
    </instancedMesh>
  );
}

function Mangoes({ position }: { position: [number, number, number] }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    const p = g.attributes.position;
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

export function Bar() {
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

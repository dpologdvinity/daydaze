import { useMemo } from "react";
import * as THREE from "three";
import { useQuality } from "../../world/quality.ts";
import { Floor, type PickHandler } from "../shared/Floor.tsx";
import { canvasTex, GOLD, hdr, LACQUER } from "../shared/materials.ts";
import { Palm } from "../shared/Palm.tsx";
import { CURB_Z, LAMP_TOP, LAMPS, PLANTERS, SHOP_Z, SHOPS } from "./layout.ts";

// The ground plane spans the sidewalk and the road beyond the curb.
const X0 = -15;
const X1 = 15;
const Z0 = SHOP_Z - 1;
const Z1 = 17;
const PX_PER_M = 36;

/** Wet paving: square slabs up to the curb, then asphalt with lane paint. */
function groundTex() {
  const w = Math.round((X1 - X0) * PX_PER_M);
  const h = Math.round((Z1 - Z0) * PX_PER_M);
  const px = (x: number) => (x - X0) * PX_PER_M;
  const pz = (z: number) => (z - Z0) * PX_PER_M;
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = "#0c0814";
    ctx.fillRect(0, 0, w, h);
    // slabs, each a slightly different wet sheen
    for (let z = Math.floor(Z0); z < CURB_Z; z++) {
      for (let x = X0; x < X1; x++) {
        const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        const l = 22 + Math.floor((n - Math.floor(n)) * 14);
        ctx.fillStyle = `rgb(${l},${l - 6},${l + 12})`;
        ctx.fillRect(px(x) + 1, pz(z) + 1, PX_PER_M - 2, PX_PER_M - 2);
      }
    }
    // asphalt
    ctx.fillStyle = "#08060c";
    ctx.fillRect(0, pz(CURB_Z), w, h - pz(CURB_Z));
    ctx.fillStyle = "rgba(255,214,160,0.55)";
    for (let x = X0; x < X1; x += 3) {
      ctx.fillRect(px(x), pz(CURB_Z + 4.8), PX_PER_M * 1.6, 5);
    }
    // a zebra crossing in front of the club
    ctx.fillStyle = "rgba(240,232,255,0.5)";
    for (let x = -2; x < 2; x += 0.8) {
      ctx.fillRect(px(x), pz(CURB_Z + 0.6), PX_PER_M * 0.45, PX_PER_M * 3.4);
    }
  });
}

/** Additive smears under each sign that read as reflections on wet ground. */
function FakeReflections() {
  const tex = useMemo(
    () =>
      canvasTex(16, 128, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(0.35, "rgba(255,255,255,0.35)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 16, 128);
      }),
    [],
  );
  return (
    <>
      {SHOPS.map((s) => (
        <mesh
          key={s.id}
          position={[s.x, 0.012, SHOP_Z + 3.2]}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[s.width * 0.75, 6.4]} />
          <meshBasicMaterial
            map={tex}
            color={hdr(s.color, s.open ? 0.75 : 0.45)}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function Planter({ x0, x1, z0 }: { x0: number; x1: number; z0: number }) {
  const w = x1 - x0;
  const d = CURB_Z - z0 + 0.25;
  const cx = (x0 + x1) / 2;
  const cz = z0 + d / 2;
  return (
    <group>
      <mesh position={[cx, 0.3, cz]} material={LACQUER}>
        <boxGeometry args={[w, 0.6, d]} />
      </mesh>
      <mesh position={[cx, 0.61, cz]} material={GOLD}>
        <boxGeometry args={[w + 0.06, 0.04, d + 0.06]} />
      </mesh>
      <mesh position={[cx, 0.62, cz]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w - 0.12, d - 0.12]} />
        <meshStandardMaterial color="#1a0f0c" roughness={1} />
      </mesh>
      <mesh position={[cx, 0.06, z0 - 0.01]} material={neonStrip}>
        <boxGeometry args={[w, 0.03, 0.02]} />
      </mesh>
      <Palm position={[cx - w / 4, 0.4, cz]} scale={1.15} />
      <Palm position={[cx + w / 4, 0.4, cz]} scale={0.95} />
    </group>
  );
}

const neonStrip = new THREE.MeshBasicMaterial({
  color: hdr("#ff2f9a", 3),
  toneMapped: false,
});

function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={LAMP_TOP / 2} material={LACQUER}>
        <cylinderGeometry args={[0.05, 0.08, LAMP_TOP, 12]} />
      </mesh>
      <mesh position-y={0.4} material={GOLD}>
        <cylinderGeometry args={[0.14, 0.18, 0.8, 16]} />
      </mesh>
      <mesh position-y={LAMP_TOP + 0.18}>
        <sphereGeometry args={[0.22, 20, 14]} />
        <meshBasicMaterial color={hdr("#ffe0f0", 1.5)} toneMapped={false} />
      </mesh>
      <mesh position-y={LAMP_TOP} material={GOLD}>
        <torusGeometry args={[0.2, 0.025, 8, 24]} />
      </mesh>
    </group>
  );
}

export function Street({ onPick }: { onPick: PickHandler }) {
  const quality = useQuality();
  const ground = useMemo(groundTex, []);
  return (
    <>
      <Floor
        width={X1 - X0}
        depth={Z1 - Z0}
        center={[(X0 + X1) / 2, (Z0 + Z1) / 2]}
        color="#ffffff"
        map={ground}
        mirror={0.85}
        mixStrength={4}
        roughness={0.35}
        envMapIntensity={0.3}
        low={{ metalness: 0.2, roughness: 0.75 }}
        onPick={onPick}
      />
      {quality === "low" && <FakeReflections />}
      {/* curb */}
      <mesh position={[0, 0.07, CURB_Z + 0.12]} material={LACQUER}>
        <boxGeometry args={[X1 - X0, 0.14, 0.24]} />
      </mesh>
      <mesh position={[0, 0.145, CURB_Z + 0.01]} material={GOLD}>
        <boxGeometry args={[X1 - X0, 0.012, 0.03]} />
      </mesh>
      {PLANTERS.map((p) => (
        <Planter key={p.x0} {...p} />
      ))}
      {LAMPS.map(([x, z]) => (
        <Lamp key={x} x={x} z={z} />
      ))}
      <Palm position={[-12.6, 0, SHOP_Z + 0.9]} scale={1.2} />
      <Palm position={[12.6, 0, SHOP_Z + 0.9]} scale={1.2} />
    </>
  );
}

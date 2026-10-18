import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { useQuality } from "../../world/quality.ts";
import { Batch } from "../shared/batch.ts";
import { Floor, type PickHandler } from "../shared/Floor.tsx";
import { canvasTex, GOLD, hdr, LACQUER } from "../shared/materials.ts";
import { addPalm } from "./Palms.tsx";
import { CURB_Z, LAMP_TOP, LAMPS, PLANTERS, SHOP_Z, SHOPS } from "./layout.ts";

// The ground plane spans the sidewalk and the road beyond the curb.
const X0 = -15;
const X1 = 15;
const Z0 = SHOP_Z - 1;
const Z1 = 17;
const PX_PER_M = 36;

// Benches on the sidewalk, clear of the planters.
const BENCHES = [-8.6, 9.2];
const BENCH_Z = 5.9;

const NEON_STRIP = new THREE.MeshBasicMaterial({
  color: hdr("#ff2f9a", 3),
  toneMapped: false,
});
const SOIL = new THREE.MeshStandardMaterial({ color: "#1a0f0c", roughness: 1 });
// The lamp globes breathe: the color is rewritten each frame, never the material.
const LAMP_BASE = hdr("#ffe0f0", 1.5);
const LAMP_GLOW = new THREE.MeshBasicMaterial({
  color: LAMP_BASE.clone(),
  toneMapped: false,
});

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

function addPlanter(
  b: Batch,
  { x0, x1, z0 }: { x0: number; x1: number; z0: number },
) {
  const w = x1 - x0;
  const d = CURB_Z - z0 + 0.25;
  const cx = (x0 + x1) / 2;
  const cz = z0 + d / 2;
  b.add(new THREE.BoxGeometry(w, 0.6, d), LACQUER, { position: [cx, 0.3, cz] })
    .add(new THREE.BoxGeometry(w + 0.06, 0.04, d + 0.06), GOLD, {
      position: [cx, 0.61, cz],
    })
    .add(new THREE.PlaneGeometry(w - 0.12, d - 0.12), SOIL, {
      position: [cx, 0.62, cz],
      rotation: [-Math.PI / 2, 0, 0],
    })
    .add(new THREE.BoxGeometry(w, 0.03, 0.02), NEON_STRIP, {
      position: [cx, 0.06, z0 - 0.01],
    });
  addPalm(b, cx - w / 4, 0.4, cz, 1.15);
  addPalm(b, cx + w / 4, 0.4, cz, 0.95);
}

function addLamp(b: Batch, x: number, z: number) {
  b.add(new THREE.CylinderGeometry(0.05, 0.08, LAMP_TOP, 12), LACQUER, {
    position: [x, LAMP_TOP / 2, z],
  })
    .add(new THREE.CylinderGeometry(0.14, 0.18, 0.8, 16), GOLD, {
      position: [x, 0.4, z],
    })
    .add(new THREE.SphereGeometry(0.22, 20, 14), LAMP_GLOW, {
      position: [x, LAMP_TOP + 0.18, z],
    })
    .add(new THREE.TorusGeometry(0.2, 0.025, 8, 24), GOLD, {
      position: [x, LAMP_TOP, z],
    });
}

function addBench(b: Batch, x: number) {
  const z = BENCH_Z;
  b.add(new THREE.BoxGeometry(1.6, 0.07, 0.42), LACQUER, {
    position: [x, 0.44, z],
  })
    .add(new THREE.BoxGeometry(1.6, 0.42, 0.05), LACQUER, {
      position: [x, 0.7, z - 0.2],
    })
    .add(new THREE.BoxGeometry(0.06, 0.44, 0.4), GOLD, {
      position: [x - 0.7, 0.22, z],
    })
    .add(new THREE.BoxGeometry(0.06, 0.44, 0.4), GOLD, {
      position: [x + 0.7, 0.22, z],
    });
}

/** Every static street prop, one mesh per material. */
function buildStreet() {
  const b = new Batch();
  b.add(new THREE.BoxGeometry(X1 - X0, 0.14, 0.24), LACQUER, {
    position: [0, 0.07, CURB_Z + 0.12],
  }).add(new THREE.BoxGeometry(X1 - X0, 0.012, 0.03), GOLD, {
    position: [0, 0.145, CURB_Z + 0.01],
  });
  PLANTERS.forEach((p) => addPlanter(b, p));
  LAMPS.forEach(([x, z]) => addLamp(b, x, z));
  BENCHES.forEach((x) => addBench(b, x));
  addPalm(b, -12.6, 0, SHOP_Z + 0.9, 1.2);
  addPalm(b, 12.6, 0, SHOP_Z + 0.9, 1.2);
  return b.build();
}

export function Street({ onPick }: { onPick: PickHandler }) {
  const quality = useQuality();
  const ground = useMemo(groundTex, []);
  const street = useMemo(buildStreet, []);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (calm) return;
    LAMP_GLOW.color
      .copy(LAMP_BASE)
      .multiplyScalar(0.9 + 0.1 * Math.sin(clock.elapsedTime * 1.3));
  });
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
      <primitive object={street} />
    </>
  );
}

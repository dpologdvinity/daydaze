import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lathe } from "../../avatar/dollGeometry.ts";
import { Batch } from "../shared/batch.ts";
import { canvasTex, GOLD, gradientTex, LACQUER } from "../shared/materials.ts";
import { MIRROR, NEON_AMBER, NEON_PINK } from "./materials.ts";
import { Cocktails } from "./Props.tsx";
import { BarStools } from "../shared/BarStools.tsx";

const CX = -0.8;
const LEN = 6.2;
const Z = -4.7;
const SHELVES = [1.4, 1.95, 2.5];

const GLOW = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#ff8a30").multiplyScalar(1.5),
  map: gradientTex([
    [0, "#000"],
    [0.55, "#3a1a0a"],
    [1, "#fff"],
  ]),
  toneMapped: false,
});

const SHELF_GLASS = new THREE.MeshStandardMaterial({
  color: "#ffd7f0",
  transparent: true,
  opacity: 0.35,
  roughness: 0.05,
});

// Three bottle silhouettes, so the back bar reads as a real collection.
const SHAPES = [
  lathe(
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
  ),
  lathe(
    [
      [0, 0],
      [0.005, 0.06],
      [0.12, 0.07],
      [0.2, 0.06],
      [0.24, 0.02],
      [0.25, 0],
    ],
    12,
  ),
  lathe(
    [
      [0, 0],
      [0.005, 0.04],
      [0.1, 0.05],
      [0.14, 0.02],
      [0.16, 0.02],
      [0.3, 0.012],
      [0.3, 0],
    ],
    12,
  ),
];

const PALETTE = [
  "#ffb02e",
  "#ff2f6a",
  "#3dff9a",
  "#5ab0ff",
  "#ffe6a0",
  "#c04dff",
  "#ff7a1f",
];

type Bottle = {
  shape: number;
  x: number;
  y: number;
  z: number;
  s: number;
  c: THREE.Color;
};

// Bottles on every shelf: shape and color cycle so neighbours differ.
function bottlesFor(x0: number, x1: number, per = 16): Bottle[] {
  const out: Bottle[] = [];
  SHELVES.forEach((y, row) => {
    for (let k = 0; k < per; k++) {
      out.push({
        shape: (k + row) % SHAPES.length,
        x: x0 + ((x1 - x0) * (k + 0.5)) / per,
        y,
        z: -5.84 + (k % 2) * 0.06,
        s: 0.75 + ((k * 7 + row * 3) % 5) * 0.09,
        c: new THREE.Color(
          PALETTE[(k * 3 + row * 2) % PALETTE.length],
        ).multiplyScalar(1.35),
      });
    }
  });
  return out;
}

// Glowing bottles: one instanced mesh per silhouette.
function Bottles() {
  const bottles = useMemo(
    () => bottlesFor(CX - LEN / 2 + 0.1, CX + LEN / 2 - 0.1),
    [],
  );
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    SHAPES.forEach((_, shape) => {
      const m = refs.current[shape];
      if (!m) return;
      let i = 0;
      for (const b of bottles) {
        if (b.shape !== shape) continue;
        o.position.set(b.x, b.y, b.z);
        o.scale.set(1, b.s, 1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, b.c);
        i++;
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [bottles]);
  return (
    <>
      {SHAPES.map((geo, shape) => {
        const count = bottles.filter((b) => b.shape === shape).length;
        return (
          <instancedMesh
            key={shape}
            ref={(m) => {
              refs.current[shape] = m;
            }}
            args={[geo, undefined, count]}
          >
            <meshBasicMaterial transparent opacity={0.92} toneMapped={false} />
          </instancedMesh>
        );
      })}
    </>
  );
}

// bar stools along the bar (see the velvet-stool seats in seats.ts)
const STOOLS = [-3.2, -2.3, -0.5, 0.5, 1.4].map(
  (x) => [x, 0, -4.05, Math.PI] as const,
);

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
  const parts = useMemo(() => {
    const counter = new THREE.MeshStandardMaterial({
      map: fluted,
      roughness: 0.45,
      metalness: 0.2,
    });
    const batch = new Batch();
    // counter, brass rail and neon strips along its front
    batch.add(new THREE.BoxGeometry(LEN, 1, 0.62), counter, {
      position: [CX, 0.5, Z],
    });
    batch.add(new THREE.BoxGeometry(LEN + 0.2, 0.06, 0.78), LACQUER, {
      position: [CX, 1.03, Z],
    });
    batch.add(new THREE.BoxGeometry(LEN + 0.2, 0.03, 0.03), GOLD, {
      position: [CX, 1.0, Z + 0.39],
    });
    batch.add(new THREE.CylinderGeometry(0.025, 0.025, LEN, 10), GOLD, {
      position: [CX, 0.22, Z + 0.36],
      rotation: [0, 0, Math.PI / 2],
    });
    batch.add(new THREE.BoxGeometry(LEN, 0.018, 0.018), NEON_AMBER, {
      position: [CX, 0.96, Z + 0.36],
    });
    batch.add(new THREE.BoxGeometry(LEN, 0.02, 0.02), NEON_PINK, {
      position: [CX, 0.08, Z + 0.33],
    });
    // back bar: mirror, glass shelves, glowing backlight, gold rails
    batch.add(new THREE.PlaneGeometry(LEN, 2.1), MIRROR, {
      position: [CX, 2.15, -5.96],
    });
    for (const y of SHELVES) {
      batch.add(new THREE.BoxGeometry(LEN, 0.025, 0.3), SHELF_GLASS, {
        position: [CX, y - 0.02, -5.8],
      });
      batch.add(new THREE.BoxGeometry(LEN, 0.02, 0.02), GOLD, {
        position: [CX, y - 0.04, -5.66],
      });
      batch.add(new THREE.PlaneGeometry(LEN, 0.34), GLOW, {
        position: [CX, y + 0.18, -5.94],
      });
    }
    batch.add(new THREE.BoxGeometry(LEN + 0.3, 0.06, 0.12), GOLD, {
      position: [CX, 3.25, -5.9],
    });
    return batch.build();
  }, [fluted]);

  return (
    <group>
      <primitive object={parts} />
      <BarStools at={STOOLS} color="#b0123a" />
      <Bottles />
      <Cocktails
        items={[
          { position: [0.35, 1.06 + 0.0, -4.55], color: "#ff2f4a" },
          { position: [-2.6, 1.06, -4.6], color: "#ffc21f", scale: 0.9 },
        ]}
      />
    </group>
  );
}

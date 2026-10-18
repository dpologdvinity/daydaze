import { useMemo } from "react";
import * as THREE from "three";
import { surface } from "../../city/worldTexture.ts";
import { Batch } from "../shared/batch.ts";
import { canvasTex, GOLD, gradientTex } from "../shared/materials.ts";
import { MIRROR, NEON_AMBER, NEON_PINK } from "./materials.ts";
import { Cocktails } from "./Props.tsx";
import { BarStools } from "../shared/BarStools.tsx";
import { Bottles } from "../shared/Bottles.tsx";

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

// the back bar's three shelves of bottles
const ROWS = SHELVES.map((y) => ({
  x0: CX - LEN / 2 + 0.1,
  x1: CX + LEN / 2 - 0.1,
  y,
  z: -5.86,
  count: 26,
}));

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
    // a black marble bar top
    const marble = surface("marble_01", {
      scale: 0.8,
      color: "#3a2a36",
      roughness: 0.35,
    });
    const batch = new Batch();
    // counter, brass rail and neon strips along its front
    batch.add(new THREE.BoxGeometry(LEN, 1, 0.62), counter, {
      position: [CX, 0.5, Z],
    });
    batch.add(new THREE.BoxGeometry(LEN + 0.2, 0.06, 0.78), marble, {
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
      <Bottles rows={ROWS} seed={3} />
      <Cocktails
        items={[
          { position: [0.35, 1.06 + 0.0, -4.55], color: "#ff2f4a" },
          { position: [-2.6, 1.06, -4.6], color: "#ffc21f", scale: 0.9 },
        ]}
      />
    </group>
  );
}

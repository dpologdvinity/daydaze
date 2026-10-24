// Skyline Supply grocery scene: shelving aisles, freezer wall, produce and
// checkouts, with all stock drawn as three instanced meshes. Box labels come
// from one 8-slot atlas texture; a patched shader picks each box's slot from
// its aLabel instance attribute.

import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import {
  AISLES,
  BOUNDS,
  CASHIER,
  CHECKOUTS,
  FREEZERS,
  GUARD,
  PRODUCE,
  SHELF_DEPTH,
} from "../../game/market.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.6;
const SHELF_LEVELS = [0.25, 0.75, 1.25, 1.75];
const SHELF_H = 2.1;

const WALL = surface("white_plaster_02", { scale: 0.6, color: "#ffffff" });
const STEEL = surface("plastic", {
  scale: 1,
  color: "#f4f6fa",
  roughness: 0.5,
});
const WOOD = surface("wood_veneer", { scale: 1, color: "#c89a6a" });
const COUNTER = surface("granite_tile", { scale: 1, color: "#d8d4e8" });
const BELT = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.8,
});
const LIGHT = new THREE.MeshBasicMaterial({
  color: hdr("#ffffff", 1.6),
  toneMapped: false,
});
const FREEZER_GLOW = new THREE.MeshStandardMaterial({
  color: "#cfe9ff",
  emissive: "#9fd8ff",
  emissiveIntensity: 0.9,
  transparent: true,
  opacity: 0.6,
  roughness: 0.05,
});

const CASHIER_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "low-pony",
  hairColor: "#1b1014",
  lips: "lips-90s-caramel-ombre",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};
const GUARD_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "top-knot",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-fox-snatched",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#2e7dff",
};
const SHOPPERS: readonly {
  at: [number, number, number];
  rot: number;
  look: Look;
}[] = [
  {
    at: [-4.3, 0, -2.4],
    rot: Math.PI / 2,
    look: {
      ...CASHIER_LOOK,
      skin: "#f3d4c4",
      hairStyle: "waves",
      hairColor: "#f1d78f",
      outfit: "flares",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
  },
  {
    at: [2.5, 0, -6.4],
    rot: Math.PI,
    look: {
      ...CASHIER_LOOK,
      skin: "#94603f",
      hairStyle: "afro",
      outfit: "mini",
      outfitColor: "#ffb02e",
      shadow: "#ffb02e",
    },
  },
];

/** Brand-ish labels for the product boxes: a color band and a name. */
function productTex() {
  const names = [
    "CRUNCH",
    "FIZZ",
    "OATY",
    "PUFFS",
    "CHOCO",
    "MANGO",
    "RAMEN",
    "SALSA",
  ];
  const colors = [
    "#e63946",
    "#3fe0d0",
    "#ffd84f",
    "#ff8a3d",
    "#7b4dff",
    "#ff4fb3",
    "#2e7dff",
    "#7dff6b",
  ];
  return canvasTex(512, 128, (ctx) => {
    names.forEach((n, i) => {
      const x = i * 64;
      ctx.fillStyle = colors[i] ?? "#ffffff";
      ctx.fillRect(x, 0, 64, 128);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 6, 46, 52, 30);
      ctx.fillStyle = "#141018";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n, x + 32, 66);
    });
  });
}

/** The store's shell and fixtures, merged per material. */
function useShell() {
  return useMemo(() => {
    const b = new Batch();
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // shelving units: uprights, back panel and shelves
    for (const a of AISLES) {
      const len = a.z1 - a.z0;
      const cz = (a.z0 + a.z1) / 2;
      b.add(new THREE.BoxGeometry(0.06, SHELF_H, len), STEEL, {
        position: [a.x, SHELF_H / 2, cz],
      });
      for (const y of SHELF_LEVELS)
        b.add(new THREE.BoxGeometry(SHELF_DEPTH, 0.04, len), STEEL, {
          position: [a.x, y - 0.02, cz],
        });
      b.add(new THREE.BoxGeometry(SHELF_DEPTH, 0.5, 0.06), STEEL, {
        position: [a.x, SHELF_H + 0.25, a.z1],
      });
    }
    // the freezer wall: steel frame, glowing glass doors
    const fw = FREEZERS.x1 - FREEZERS.x0;
    b.add(new THREE.BoxGeometry(fw, 2.4, 0.8), STEEL, {
      position: [0, 1.2, (FREEZERS.z0 + FREEZERS.z1) / 2],
    });
    for (let x = FREEZERS.x0 + 0.7; x < FREEZERS.x1; x += 1.4)
      b.add(new THREE.PlaneGeometry(1.25, 2), FREEZER_GLOW, {
        position: [x, 1.2, FREEZERS.z1 + 0.01],
      });
    // produce bins: wooden crates on a stand
    const pw = PRODUCE.x1 - PRODUCE.x0;
    b.add(new THREE.BoxGeometry(pw, 0.7, PRODUCE.z1 - PRODUCE.z0), WOOD, {
      position: [
        (PRODUCE.x0 + PRODUCE.x1) / 2,
        0.35,
        (PRODUCE.z0 + PRODUCE.z1) / 2,
      ],
    });
    // checkouts: counter, belt, register and a candy rack
    for (const c of CHECKOUTS) {
      const len = c.z1 - c.z0;
      const cz = (c.z0 + c.z1) / 2;
      b.add(new THREE.BoxGeometry(0.8, 0.9, len), COUNTER, {
        position: [c.x, 0.45, cz],
      });
      b.add(new THREE.BoxGeometry(0.5, 0.02, len - 0.6), BELT, {
        position: [c.x, 0.91, cz - 0.2],
      });
      b.add(new THREE.BoxGeometry(0.35, 0.3, 0.3), BELT, {
        position: [c.x + 0.2, 1.05, c.z1 - 0.4],
      });
      b.add(new THREE.BoxGeometry(0.3, 1.3, 0.8), STEEL, {
        position: [c.x - 0.6, 0.65, c.z1 - 0.3],
      });
    }
    // ceiling light panels in rows
    for (let x = x0 + 2; x < x1; x += 4)
      for (let z = z0 + 2; z < z1; z += 4)
        b.add(new THREE.PlaneGeometry(1.6, 0.5), LIGHT, {
          position: [x, H - 0.02, z],
          rotation: [Math.PI / 2, 0, 0],
        });
    return b.build();
  }, []);
}

/** Products on every shelf, produce in the bins, candy on the racks. */
function Goods() {
  const boxes = useRef<THREE.InstancedMesh>(null);
  const cans = useRef<THREE.InstancedMesh>(null);
  const fruit = useRef<THREE.InstancedMesh>(null);
  const label = useMemo(productTex, []);
  const mats = useMemo(() => {
    const box = new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 });
    // each box shows one of the eight labels on its faces
    box.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "attribute float aLabel;\nvoid main() {")
        .replace(
          "#include <uv_vertex>",
          "#include <uv_vertex>\nvMapUv.x = (vMapUv.x + aLabel) / 8.0;",
        );
    };
    return {
      box,
      can: new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }),
      fruit: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    };
  }, [label]);
  useEffect(
    () => () => {
      label.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [label, mats],
  );
  const geo = useMemo(
    () => ({
      box: new THREE.BoxGeometry(0.22, 0.3, 0.14),
      can: new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10),
      fruit: new THREE.SphereGeometry(0.065, 8, 6),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
    },
    [geo],
  );
  const per = 16;
  const BOXES = AISLES.length * 2 * 2 * per;
  const CANS = AISLES.length * 2 * 2 * per;
  const FRUIT = 90;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const labels = new Float32Array(BOXES);
    let nb = 0;
    let nc = 0;
    for (const a of AISLES) {
      for (const side of [-1, 1])
        SHELF_LEVELS.forEach((y, level) => {
          for (let k = 0; k < per; k++) {
            const z = a.z0 + 0.2 + (k * (a.z1 - a.z0 - 0.4)) / (per - 1);
            const x = a.x + side * 0.24;
            if (level % 2 === 0) {
              m.makeTranslation(x, y + 0.15, z);
              if (side < 0)
                m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
              boxes.current?.setMatrixAt(nb, m);
              labels[nb] = (k * 3 + level + (a.x > 0 ? 4 : 0)) % 8;
              nb++;
            } else {
              cans.current?.setMatrixAt(nc, m.makeTranslation(x, y + 0.07, z));
              cans.current?.setColorAt(
                nc,
                c.setHSL(((k * 37 + level * 11) % 100) / 100, 0.7, 0.5),
              );
              nc++;
            }
          }
        });
    }
    boxes.current?.geometry.setAttribute(
      "aLabel",
      new THREE.InstancedBufferAttribute(labels, 1),
    );
    const fruitColors = ["#e63946", "#ff8a3d", "#7dff6b", "#ffd84f", "#7b2d8a"];
    for (let i = 0; i < FRUIT; i++) {
      const bin = i % 5;
      const bx = PRODUCE.x0 + 0.4 + bin * ((PRODUCE.x1 - PRODUCE.x0 - 0.8) / 4);
      const j = Math.floor(i / 5);
      fruit.current?.setMatrixAt(
        i,
        m.makeTranslation(
          bx + ((j % 4) - 1.5) * 0.13,
          0.76 + Math.floor(j / 8) * 0.08,
          PRODUCE.z0 + 0.3 + (Math.floor(j / 4) % 2) * 0.6 + (j % 3) * 0.12,
        ),
      );
      fruit.current?.setColorAt(i, c.set(fruitColors[bin] ?? "#e63946"));
    }
    for (const r of [boxes, cans, fruit])
      if (r.current) {
        r.current.instanceMatrix.needsUpdate = true;
        if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
        r.current.computeBoundingSphere();
      }
  }, [BOXES]);
  return (
    <>
      <instancedMesh ref={boxes} args={[geo.box, mats.box, BOXES]} />
      <instancedMesh ref={cans} args={[geo.can, mats.can, CANS]} />
      <instancedMesh ref={fruit} args={[geo.fruit, mats.fruit, FRUIT]} />
    </>
  );
}

/**
 * Skyline Supply, Downtown's grocery store: bright aisles of labeled boxes
 * and cans, produce in crates by the door, a glowing freezer wall, two
 * checkouts with Rosa at the till and a guard by the door. Buy a snack or a
 * water from the dock.
 */
export function Market({ onPick }: { onPick: PickHandler }): JSX.Element {
  const shell = useShell();
  return (
    <>
      <color attach="background" args={["#e8e4f4"]} />
      <hemisphereLight args={["#ffffff", "#c8c0d8", 1.6]} />
      <pointLight
        position={[0, 4, 0]}
        color="#fff8f0"
        intensity={8}
        distance={20}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#f4f0f8"
        texture={{ id: "long_white_tiles", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.4 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.market} color="#ff4fb3" />
      <primitive object={shell} />
      <Goods />
      <NeonText
        text="SKYLINE SUPPLY"
        color="#ff4fb3"
        font={MARQUEE}
        width={5.6}
        k={2.6}
        position={[0, 3.6, z0 + 0.05]}
      />
      <TalkingNpc
        name="Rosa"
        role="cashier"
        look={CASHIER_LOOK}
        mood="idle"
        at={[CASHIER[0], 0, CASHIER[1]]}
        rot={-Math.PI / 2}
        seed={421}
        greet
        context={{ venue: "market", neighborhood: "downtown" }}
      />
      <TalkingNpc
        name="Dre"
        role="guard"
        look={GUARD_LOOK}
        mood="idle"
        at={[GUARD[0], 0, GUARD[1]]}
        rot={Math.PI}
        seed={422}
        context={{ venue: "market", neighborhood: "downtown" }}
      />
      {SHOPPERS.map((s, i) => (
        <group key={i} position={s.at} rotation-y={s.rot}>
          <CrowdFigure look={s.look} seed={423 + i} />
        </group>
      ))}
    </>
  );
}

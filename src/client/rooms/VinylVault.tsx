import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  BOOTH,
  BOUNDS,
  CLERK,
  COUNTER,
  CRATES,
} from "../../game/vinylVault.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4;

const WALL = surface("painted_plaster_wall", { scale: 0.5, color: "#e8c87a" });
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#8a5a3a",
  roughness: 0.6,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.3,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#cfe9ff",
  transparent: true,
  opacity: 0.25,
  roughness: 0.05,
});

const CLERK_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "shag",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-y2k-thin",
  outfit: "jeans",
  outfitColor: "#141018",
  shadow: "#ff2f9a",
};
const DIGGER: Look = {
  ...CLERK_LOOK,
  skin: "#f3d4c4",
  hairStyle: "pigtails",
  hairColor: "#ff4fb3",
  outfit: "baby-tee-mini",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Sixteen made-up album covers in a 4 by 4 atlas: color fields, circles,
 * stripes and a title. */
function coversTex() {
  const titles = [
    "NEON TIDE",
    "VELVET",
    "SLOW JAM",
    "AFTER 2",
    "PALM FM",
    "HEARTBEAT",
    "STARCHILD",
    "DISCO SUN",
    "MOONLIGHT",
    "LO-FI",
    "SUGAR",
    "GLITTER",
    "ROLLER",
    "SALSA",
    "CHIPTUNE",
    "TWILIGHT",
  ];
  const colors = [
    "#ff4fb3",
    "#3fe0d0",
    "#ffd84f",
    "#9b5cff",
    "#ff8a3d",
    "#2e7dff",
    "#7dff6b",
    "#e63946",
  ];
  return canvasTex(512, 512, (ctx) => {
    titles.forEach((t, i) => {
      const x = (i % 4) * 128;
      const y = Math.floor(i / 4) * 128;
      const a = colors[i % colors.length] ?? "#ff4fb3";
      const b = colors[(i * 3 + 2) % colors.length] ?? "#3fe0d0";
      ctx.fillStyle = a;
      ctx.fillRect(x, y, 128, 128);
      ctx.fillStyle = b;
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x + 64, y + 56, 34, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 3 === 1) {
        for (let k = 0; k < 6; k++) ctx.fillRect(x, y + 10 + k * 18, 128, 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 100);
        ctx.lineTo(x + 64, y + 16);
        ctx.lineTo(x + 108, y + 100);
        ctx.fill();
      }
      ctx.fillStyle = "#141018";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t, x + 64, y + 118);
    });
  });
}

/** A plane's UVs pointed at atlas cell `i` of a 4 by 4 grid. */
function cover(i: number, size: number) {
  const g = new THREE.PlaneGeometry(size, size);
  const uv = g.attributes.uv;
  const col = i % 4;
  const row = Math.floor(i / 4);
  for (let k = 0; k < uv.count; k++)
    uv.setXY(k, (col + uv.getX(k)) / 4, 1 - (row + 1 - uv.getY(k)) / 4);
  return g;
}

function useShop(covers: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const ART = new THREE.MeshBasicMaterial({ map: covers });
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, 0],
      });
    // framed covers up the back and side walls
    let n = 0;
    for (let x = x0 + 1; x < 4; x += 1.1)
      for (const y of [2.2, 3.2]) {
        b.add(new THREE.BoxGeometry(0.86, 0.86, 0.03), BLACK, {
          position: [x, y, z0 + 0.02],
        });
        b.add(cover(n++ % 16, 0.78), ART, { position: [x, y, z0 + 0.04] });
      }
    for (let z = z0 + 1; z < z1 - 1; z += 1.1)
      for (const y of [2.2, 3.2]) {
        b.add(cover(n++ % 16, 0.78), ART, {
          position: [x0 + 0.02, y, z],
          rotation: [0, Math.PI / 2, 0],
        });
      }
    // crate tables
    for (const c of CRATES) {
      const len = c.z1 - c.z0;
      b.add(new THREE.BoxGeometry(1, 0.8, len), WOOD, {
        position: [c.x, 0.4, (c.z0 + c.z1) / 2],
      });
    }
    // the counter with two turntables and a mixer, and the listening booth
    b.add(
      new THREE.BoxGeometry(
        COUNTER.x1 - COUNTER.x0,
        1,
        COUNTER.z1 - COUNTER.z0,
      ),
      WOOD,
      {
        position: [
          (COUNTER.x0 + COUNTER.x1) / 2,
          0.5,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ],
      },
    );
    for (const dx of [-0.9, 0.9]) {
      b.add(new THREE.BoxGeometry(0.6, 0.08, 0.5), BLACK, {
        position: [
          (COUNTER.x0 + COUNTER.x1) / 2 + dx,
          1.04,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ],
      });
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), BLACK, {
        position: [
          (COUNTER.x0 + COUNTER.x1) / 2 + dx,
          1.09,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ],
      });
    }
    const bw = BOOTH.x1 - BOOTH.x0;
    const bd = BOOTH.z1 - BOOTH.z0;
    b.add(new THREE.BoxGeometry(bw, 2.4, 0.05), GLASS, {
      position: [(BOOTH.x0 + BOOTH.x1) / 2, 1.2, BOOTH.z1],
    });
    b.add(new THREE.BoxGeometry(0.05, 2.4, bd), GLASS, {
      position: [BOOTH.x0, 1.2, (BOOTH.z0 + BOOTH.z1) / 2],
    });
    b.add(new THREE.TorusGeometry(0.14, 0.03, 6, 16, Math.PI), GOLD, {
      position: [BOOTH.x0 + 1.5, 1.6, BOOTH.z0 + 1],
    });
    return b.build();
  }, [covers]);
}

/** Records standing in the crates, their sleeves in every color. */
function Sleeves() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = 22;
  const count = CRATES.length * per * 2;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let i = 0;
    for (const crate of CRATES)
      for (const side of [-0.22, 0.22])
        for (let k = 0; k < per; k++) {
          o.position.set(
            crate.x + side,
            0.95,
            crate.z0 + 0.2 + (k * (crate.z1 - crate.z0 - 0.4)) / (per - 1),
          );
          o.rotation.set(-0.25, 0, 0);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
          m.setColorAt(i, c.setHSL(((k * 47 + i * 13) % 100) / 100, 0.7, 0.55));
          i++;
        }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.32, 0.32, 0.01]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

/**
 * Vinyl Vault on Gallery Row: mustard walls hung with framed covers, crates
 * of records to dig through, a counter with two turntables spinning, a
 * listening booth and Nico behind the counter.
 */
export function VinylVault({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const covers = useMemo(coversTex, []);
  useEffect(() => () => covers.dispose(), [covers]);
  const shop = useShop(covers);
  const platter = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (platter.current && !calm) platter.current.rotation.y += dt * 3.5;
  });
  return (
    <>
      <color attach="background" args={["#1a1208"]} />
      <hemisphereLight args={["#fff0d0", "#4a3020", 1.5]} />
      <pointLight
        position={[0, 3.4, 0]}
        color="#ffe0b0"
        intensity={7}
        distance={14}
      />
      <Floor
        width={W}
        depth={D}
        color="#b89a7a"
        texture={{ id: "oak_wood_planks", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["vinyl-vault"]} color="#ffe066" />
      <primitive object={shop} />
      <Sleeves />
      {/* a record spinning on the left deck */}
      <mesh
        ref={platter}
        position={[
          (COUNTER.x0 + COUNTER.x1) / 2 - 0.9,
          1.11,
          (COUNTER.z0 + COUNTER.z1) / 2,
        ]}
      >
        <cylinderGeometry args={[0.18, 0.18, 0.012, 32]} />
        <meshStandardMaterial
          color="#141018"
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>
      <NeonText
        text="VINYL VAULT"
        color="#ffe066"
        font={MARQUEE}
        width={4}
        k={2.6}
        position={[1.2, 3.55, z0 + 0.06]}
      />
      <TalkingNpc
        name="Nico"
        role="cashier"
        look={CLERK_LOOK}
        mood="idle"
        at={[CLERK[0], 0, CLERK[1]]}
        rot={0}
        seed={471}
        greet
        context={{ venue: "vinyl-vault", neighborhood: "arts-district" }}
      />
      <group position={[-3, 0, -1]} rotation-y={Math.PI / 2}>
        <CrowdFigure look={DIGGER} move="chatting" seed={472} />
      </group>
    </>
  );
}

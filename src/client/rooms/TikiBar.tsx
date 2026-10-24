// The Coconut Grove tiki bar on Beachside: a thatched bamboo bar, torches,
// glass floats, lounges round a fire bowl and a painted sunset out the open
// back. FLAME is a module-level material shared by every torch and fire flame,
// so its flicker in useFrame moves them all at once. Layout comes from
// src/game/tikiBar.ts.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  BAR,
  BARTENDER,
  BOUNDS,
  FIRE,
  LOUNGES,
  STOOL_XS,
  STOOL_Z,
} from "../../game/tikiBar.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles } from "./shared/Bottles.tsx";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted, plant, stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.8;

const BAMBOO = surface("bamboo_wall", { scale: 0.7, color: "#e8c890" });
const PLANKS = surface("wood_plank_wall", {
  scale: 0.6,
  color: "#8a5a3a",
  roughness: 0.7,
});
const TOP = surface("wood_veneer", {
  scale: 1.2,
  color: "#7a4a2a",
  roughness: 0.4,
});
const RATTAN = surface("fabric_pattern_05", {
  scale: 2,
  color: "#c89a5a",
  roughness: 0.8,
});
const CUSHION = surface("fabric_leather_02", {
  scale: 1,
  color: "#2fb8a8",
  roughness: 0.7,
});
const POLE = new THREE.MeshStandardMaterial({
  color: "#a87a3a",
  roughness: 0.6,
});
const IRON = new THREE.MeshStandardMaterial({
  color: "#2a2420",
  roughness: 0.5,
  metalness: 0.6,
});
const CORD = new THREE.MeshBasicMaterial({ color: "#2a1a10" });
/** Torch and fire flames share one material; its glow breathes in useFrame. */
const FLAME = new THREE.MeshBasicMaterial({
  color: hdr("#ff9a2e", 3),
  toneMapped: false,
});
const FLOATS = ["#3fe0d0", "#7dff6b", "#ffb02e", "#ff4fb3", "#4fa8ff"].map(
  (c) => new THREE.MeshBasicMaterial({ color: hdr(c, 1.6), toneMapped: false }),
);

const BARTENDER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "mermaid",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "sundress",
  outfitColor: "#ffb02e",
  shadow: "#3fe0d0",
};
const REGULARS: readonly Look[] = [
  {
    ...BARTENDER_LOOK,
    skin: "#f3d4c4",
    hairStyle: "waves",
    hairColor: "#f1d78f",
    outfit: "cargo-crop",
    outfitColor: "#ff2f9a",
  },
  {
    ...BARTENDER_LOOK,
    skin: "#c48d68",
    hairStyle: "coils",
    hairColor: "#4a2a1c",
    outfit: "hoodie-bikers",
    outfitColor: "#3fe0d0",
  },
];

/** A sunset over the water, for the open back of the bar. */
function sunsetTex() {
  return canvasTex(512, 256, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, "#3a1a6a");
    sky.addColorStop(0.5, "#ff5a8a");
    sky.addColorStop(1, "#ffb24a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = "#fff0a0";
    ctx.beginPath();
    ctx.arc(300, 160, 46, Math.PI, 0);
    ctx.fill();
    const sea = ctx.createLinearGradient(0, 160, 0, 256);
    sea.addColorStop(0, "#ff7a6a");
    sea.addColorStop(0.15, "#2a4a8a");
    sea.addColorStop(1, "#0a1a3a");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 160, 512, 96);
    // the sun's road across the water
    ctx.fillStyle = "rgba(255,220,140,0.55)";
    for (let y = 164; y < 256; y += 6) {
      const w = 60 - (y - 160) * 0.3 + ((y * 7) % 13);
      ctx.fillRect(300 - w / 2, y, w, 2);
    }
  });
}

/** Thatch for the ceiling and the bar's canopy: dry straw strokes. */
function thatchTex() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#8a6a3a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = (i * 97) % 256;
      const y = (i * 61) % 256;
      const l = 30 + ((i * 13) % 40);
      ctx.strokeStyle = ["#c8a060", "#a8803a", "#e0c080", "#6a4a20"][i % 4];
      ctx.lineWidth = 1 + (i % 2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ((i % 5) - 2), y + l);
      ctx.stroke();
    }
  });
}

/** A carved tiki face for the totems by the door. */
function tikiTex() {
  return canvasTex(128, 256, (ctx) => {
    ctx.fillStyle = "#6a4020";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "#3a2010";
    // brow, eyes, a wide grin, and carved bands
    ctx.fillRect(14, 40, 100, 12);
    ctx.beginPath();
    ctx.ellipse(40, 80, 16, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(88, 80, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0d8a0";
    ctx.beginPath();
    ctx.arc(40, 82, 6, 0, Math.PI * 2);
    ctx.arc(88, 82, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2010";
    ctx.fillRect(56, 96, 16, 40);
    ctx.fillRect(20, 150, 88, 34);
    ctx.fillStyle = "#f0d8a0";
    for (let x = 26; x < 104; x += 12) ctx.fillRect(x, 156, 8, 10);
    ctx.fillStyle = "#3a2010";
    for (const y of [12, 210, 236]) ctx.fillRect(0, y, 128, 6);
  });
}

const SHELF_ROWS = [1.3, 1.75].map((y) => ({
  x0: BAR.x0 + 0.3,
  x1: BAR.x1 - 0.3,
  y,
  z: -5.15,
  count: 16,
}));

function useRoom(tex: {
  sunset: THREE.Texture;
  thatch: THREE.Texture;
  tiki: THREE.Texture;
}) {
  return useMemo(() => {
    const b = new Batch();
    const SUNSET = new THREE.MeshBasicMaterial({ map: tex.sunset, fog: false });
    const THATCH = new THREE.MeshStandardMaterial({
      map: tex.thatch,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
    // the ceiling faces down only, so the camera above sees in through it
    const CEILING = new THREE.MeshStandardMaterial({
      map: tex.thatch,
      roughness: 0.95,
    });
    const TIKI = new THREE.MeshStandardMaterial({
      map: tex.tiki,
      roughness: 0.8,
    });
    // bamboo side walls (the camera looks in from the open front)
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), BAMBOO, {
        position: [x, H / 2, 0],
      });
    // the open back: posts, a low railing and the sunset beyond
    for (let x = x0; x <= x1; x += W / 4)
      b.add(new THREE.CylinderGeometry(0.12, 0.14, H, 10), POLE, {
        position: [x, H / 2, z0],
      });
    b.add(new THREE.BoxGeometry(W, 0.1, 0.14), POLE, {
      position: [0, 0.95, z0],
    });
    for (let x = x0 + 0.5; x < x1; x += 0.5)
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), POLE, {
        position: [x, 0.45, z0],
      });
    b.add(new THREE.PlaneGeometry(W * 2.4, W * 1.2), SUNSET, {
      position: [0, 3, z0 - 9],
    });
    // the thatched ceiling, with bamboo beams under it
    b.add(new THREE.PlaneGeometry(W + 0.6, D + 0.6), CEILING, {
      position: [0, H, 0],
      rotation: [Math.PI / 2, 0, 0],
    });
    // (none over the front: they'd cross the camera's view)
    for (let z = z0 + 1; z < 2; z += 2.4)
      b.add(new THREE.CylinderGeometry(0.09, 0.09, W, 8), POLE, {
        position: [0, H - 0.12, z],
        rotation: [0, 0, Math.PI / 2],
      });
    // the bar: a bamboo front, a polished top, a thatched canopy on posts
    const bw = BAR.x1 - BAR.x0;
    const bx = (BAR.x0 + BAR.x1) / 2;
    const bz = (BAR.z0 + BAR.z1) / 2;
    b.add(new THREE.BoxGeometry(bw, 1.02, BAR.z1 - BAR.z0), BAMBOO, {
      position: [bx, 0.51, bz],
    });
    b.add(new THREE.BoxGeometry(bw + 0.2, 0.07, 1), TOP, {
      position: [bx, 1.06, bz],
    });
    b.add(new THREE.BoxGeometry(bw, 0.95, 0.5), PLANKS, {
      position: [bx, 0.475, -5.15],
    });
    b.add(new THREE.BoxGeometry(bw, 0.04, 0.4), TOP, {
      position: [bx, 1.68, -5.2],
    });
    b.add(new THREE.BoxGeometry(bw, 2.6, 0.1), PLANKS, {
      position: [bx, 1.3, -5.45],
    });
    for (const x of [BAR.x0 - 0.2, BAR.x1 + 0.2])
      for (const z of [BAR.z1 + 0.1, -5.3])
        b.add(new THREE.CylinderGeometry(0.1, 0.12, 3, 10), POLE, {
          position: [x, 1.5, z],
        });
    const canopy = new THREE.ConeGeometry(1, 1, 4, 1, true).rotateY(
      Math.PI / 4,
    );
    b.add(canopy, THATCH, {
      position: [bx, 3.35, -4.1],
      scale: [bw * 0.85, 0.9, 2.4],
    });
    // tiki totems either side of the door
    for (const x of [-1.8, 1.8]) {
      b.add(new THREE.CylinderGeometry(0.32, 0.36, 2.4, 14), TIKI, {
        position: [x, 1.2, z1 - 0.5],
        rotation: [0, Math.PI, 0],
      });
      b.add(new THREE.CylinderGeometry(0.42, 0.34, 0.16, 14), POLE, {
        position: [x, 2.48, z1 - 0.5],
      });
    }
    // torches round the walls, flames on top
    const torches: [number, number][] = [
      [x0 + 0.4, -4],
      [x0 + 0.4, 0],
      [x0 + 0.4, 4],
      [x1 - 0.4, -4],
      [x1 - 0.4, 5.5],
      [x0 + 0.6, z0 + 0.4],
      [x1 - 0.6, z0 + 0.4],
    ];
    for (const [x, z] of torches) {
      b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), POLE, {
        position: [x, 0.95, z],
      });
      b.add(new THREE.CylinderGeometry(0.09, 0.06, 0.22, 8), IRON, {
        position: [x, 1.98, z],
      });
      b.add(new THREE.ConeGeometry(0.08, 0.3, 8), FLAME, {
        position: [x, 2.24, z],
      });
    }
    // glass fishing floats hanging on cords over the floor
    let k = 0;
    for (let x = x0 + 2; x < x1 - 1; x += 2.6)
      for (const z of [-0.6, 3]) {
        const drop = 0.8 + ((k * 37) % 5) * 0.12;
        b.add(new THREE.CylinderGeometry(0.006, 0.006, drop, 4), CORD, {
          position: [x, H - drop / 2, z],
        });
        b.add(
          new THREE.SphereGeometry(0.12, 12, 10),
          FLOATS[k % FLOATS.length] ?? FLAME,
          { position: [x, H - drop - 0.14, z] },
        );
        k++;
      }
    // surfboards on the west wall
    const board = new THREE.SphereGeometry(1, 16, 10);
    ["#ff4fb3", "#3fe0d0", "#ffd84f", "#ff8a3d"].forEach((c, i) =>
      b.add(painted(board, c), GLOSS, {
        position: [x0 + 0.12, 1.9, -2.6 + i * 1.6],
        rotation: [0, 0, 0.12 * (i % 2 ? 1 : -1)],
        scale: [0.05, 1.15, 0.3],
      }),
    );
    // rattan lounges with teal cushions round the fire bowl
    for (const {
      at: [x, z],
      yaw,
    } of LOUNGES) {
      const back = yaw === 0 ? -1 : 1;
      b.add(new THREE.BoxGeometry(2.2, 0.36, 0.9), RATTAN, {
        position: [x, 0.18, z + back * 0.05],
      });
      b.add(new THREE.BoxGeometry(2.1, 0.1, 0.8), CUSHION, {
        position: [x, 0.41, z + back * 0.05],
      });
      b.add(new THREE.BoxGeometry(2.2, 0.8, 0.14), RATTAN, {
        position: [x, 0.6, z + back * 0.45],
        rotation: [back * 0.2, 0, 0],
      });
    }
    b.add(new THREE.CylinderGeometry(0.55, 0.35, 0.45, 16), IRON, {
      position: [FIRE[0], 0.22, FIRE[1]],
    });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      b.add(new THREE.ConeGeometry(0.14, 0.5 + (i % 2) * 0.2, 6), FLAME, {
        position: [
          FIRE[0] + Math.cos(a) * 0.18,
          0.65,
          FIRE[1] + Math.sin(a) * 0.18,
        ],
      });
    }
    // plants along the front wall, string lights over the lounges
    for (const x of [-5, 5]) plant(b, { x, z: z1 - 0.5 }, 1.6);
    stringLights(b, [x1 - 0.2, 3.4, z0 + 0.5], [x1 - 0.2, 3.4, z1 - 0.5], 14);
    stringLights(b, [3.5, 3.6, -1], [x1 - 0.2, 3.6, -1], 8, "#ff8ad8");
    stringLights(b, [3.5, 3.6, 5], [x1 - 0.2, 3.6, 5], 8, "#8adfff");
    return b.build();
  }, [tex]);
}

/**
 * The Coconut Grove on Shore Boulevard: a bamboo bar under a thatched
 * canopy, tiki torches and totems, glass floats glowing overhead,
 * surfboards on the wall, rattan lounges round a fire bowl and the open
 * back looking out at the sunset. Malia pours.
 */
export function TikiBar({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const tex = useMemo(
    () => ({ sunset: sunsetTex(), thatch: thatchTex(), tiki: tikiTex() }),
    [],
  );
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);
  const room = useRoom(tex);
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (calm) return;
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
    FLAME.color.setRGB(3 * f, 1.8 * f, 0.5 * f);
    if (fire.current) fire.current.intensity = 7 * f;
  });
  const stools = useMemo(
    () => STOOL_XS.map((x) => [x, 0, STOOL_Z, 0] as const),
    [],
  );
  return (
    <>
      <color attach="background" args={["#2a1240"]} />
      <fog attach="fog" args={["#3a1a40", 18, 40]} />
      <hemisphereLight args={["#ffd0a0", "#3a2040", 1.8]} />
      <pointLight
        position={[-1, 2.9, -3.6]}
        color="#ffb24a"
        intensity={8}
        distance={11}
      />
      <pointLight
        ref={fire}
        position={[FIRE[0], 1.2, FIRE[1]]}
        color="#ff8a3d"
        intensity={7}
        distance={8}
      />
      <Floor
        width={W}
        depth={D}
        color="#c8a07a"
        texture={{ id: "oak_wood_planks", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.7 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["tiki-bar"]} color="#ffb02e" />
      <primitive object={room} />
      <BarStools at={stools} color="#a8703a" />
      <Bottles rows={SHELF_ROWS} seed={33} />
      <Palm position={[x0 + 1, 0, z1 - 1.4]} scale={1.3} />
      <Palm position={[x1 - 1, 0, z1 - 1.4]} scale={1.2} />
      <NeonText
        text="coconut grove"
        color="#ffb02e"
        font={SCRIPT}
        width={3.4}
        k={2.4}
        position={[(BAR.x0 + BAR.x1) / 2, 2.35, -5.38]}
        flicker
      />
      <TalkingNpc
        name="Malia"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[BARTENDER[0], 0, BARTENDER[1]]}
        rot={0}
        seed={491}
        greet
        context={{ venue: "tiki-bar", neighborhood: "beachside" }}
      />
      <group position={[-7, 0, -5.4]} rotation-y={0.6}>
        <CrowdFigure
          look={REGULARS[0] ?? BARTENDER_LOOK}
          move="salsa"
          seed={492}
        />
      </group>
      <group position={[-6.2, 0, -4.4]} rotation-y={-2.5}>
        <CrowdFigure
          look={REGULARS[1] ?? BARTENDER_LOOK}
          move="chatting"
          seed={493}
        />
      </group>
    </>
  );
}

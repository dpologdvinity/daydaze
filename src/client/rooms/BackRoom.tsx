import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  BAR,
  BARTENDER,
  BOOTHS,
  BOUNDS,
  PIANO,
  STOOL_XS,
  STOOL_Z,
} from "../../game/backRoom.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles } from "./shared/Bottles.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, GOLD, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 3.8;

const PANELING = surface("wood_plank_wall", {
  scale: 0.6,
  color: "#5a3a2a",
  roughness: 0.6,
});
const WALLPAPER = surface("quatrefoil_jacquard_fabric", {
  scale: 0.8,
  color: "#4a1a22",
});
const LEATHER = surface("fabric_leather_02", {
  scale: 1,
  color: "#6a1a1a",
  roughness: 0.5,
});
const WALNUT = surface("wood_veneer", {
  scale: 1.2,
  color: "#4a2a1a",
  roughness: 0.45,
});
const RUG = surface("carpet_red", { scale: 0.6, color: "#e08a6a" });
const MIRROR = new THREE.MeshStandardMaterial({
  color: "#2a2020",
  metalness: 1,
  roughness: 0.1,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#0c0a10",
  roughness: 0.2,
  metalness: 0.3,
});
const BULB = new THREE.MeshBasicMaterial({
  color: hdr("#ffb24a", 2.6),
  toneMapped: false,
});
const CORD = new THREE.MeshBasicMaterial({ color: "#141018" });

const BARTENDER_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "low-pony",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#141018",
  shadow: "#ffb02e",
};

/** Book spines for the bookcase by the door (the door it hides). */
function spinesTex() {
  return canvasTex(256, 256, (ctx) => {
    const colors = [
      "#6a1a1a",
      "#1a3a2a",
      "#2a2a5a",
      "#5a4a1a",
      "#3a1a3a",
      "#1a1a1a",
    ];
    for (let row = 0; row < 4; row++) {
      let x = 0;
      let k = row * 7;
      while (x < 256) {
        const w = 8 + ((k * 7) % 9);
        ctx.fillStyle = colors[k % colors.length] ?? "#1a1a1a";
        ctx.fillRect(x, row * 64 + 6, w - 1, 56 - ((k * 3) % 10));
        ctx.fillStyle = "#c8a050";
        ctx.fillRect(x + 2, row * 64 + 18, w - 5, 2);
        x += w;
        k++;
      }
    }
  });
}

/** The back-bar's shelves of bottles, in front of the mirror. */
const SHELF_ROWS = [1.35, 1.9, 2.45].map((y) => ({
  x0: BAR.x0 + 0.2,
  x1: BAR.x1 - 0.2,
  y,
  z: z0 + 0.3,
  count: 18,
}));

function useRoom(spines: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const BOOKS = new THREE.MeshStandardMaterial({
      map: spines,
      roughness: 0.8,
    });
    // wallpaper over dark paneling on every wall
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALLPAPER, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALLPAPER, {
        position: [x, H / 2, 0],
      });
    b.add(new THREE.BoxGeometry(W, 1.1, 0.06), PANELING, {
      position: [0, 0.55, z0 + 0.03],
    });
    for (const x of [x0 + 0.03, x1 - 0.03])
      b.add(new THREE.BoxGeometry(0.06, 1.1, D), PANELING, {
        position: [x, 0.55, 0],
      });
    // the mirrored back bar and its shelves
    const bw = BAR.x1 - BAR.x0;
    const bx = (BAR.x0 + BAR.x1) / 2;
    b.add(new THREE.PlaneGeometry(bw, 2), MIRROR, {
      position: [bx, 2, z0 + 0.04],
    });
    for (const { y } of SHELF_ROWS)
      b.add(new THREE.BoxGeometry(bw, 0.04, 0.3), WALNUT, {
        position: [bx, y - 0.02, z0 + 0.25],
      });
    // the bar: walnut front, leather bumper, brass foot rail
    b.add(new THREE.BoxGeometry(bw, 1.05, BAR.z1 - BAR.z0), WALNUT, {
      position: [bx, 0.525, (BAR.z0 + BAR.z1) / 2],
    });
    b.add(new THREE.BoxGeometry(bw + 0.1, 0.08, 0.2), LEATHER, {
      position: [bx, 1.07, BAR.z1 - 0.05],
    });
    b.add(new THREE.CylinderGeometry(0.025, 0.025, bw, 8), GOLD, {
      position: [bx, 0.2, BAR.z1 + 0.15],
      rotation: [0, 0, Math.PI / 2],
    });
    // booths: a high-backed leather bench, a table and a candle
    for (const {
      table: [tx, tz],
    } of BOOTHS) {
      b.add(new THREE.BoxGeometry(0.9, 0.45, 1.8), LEATHER, {
        position: [tx + 1.1, 0.23, tz],
      });
      b.add(new THREE.BoxGeometry(0.2, 1.3, 1.8), LEATHER, {
        position: [tx + 1.5, 0.65, tz],
      });
      b.add(new THREE.BoxGeometry(1, 0.06, 1.2), WALNUT, {
        position: [tx, 0.74, tz],
      });
      b.add(new THREE.CylinderGeometry(0.05, 0.08, 0.72, 8), GOLD, {
        position: [tx, 0.36, tz],
      });
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), BULB, {
        position: [tx, 0.82, tz],
      });
    }
    // the upright piano in the corner, a rug, the bookcase by the door
    b.add(
      new THREE.BoxGeometry(PIANO.x1 - PIANO.x0, 1.3, PIANO.z1 - PIANO.z0),
      BLACK,
      {
        position: [(PIANO.x0 + PIANO.x1) / 2, 0.65, (PIANO.z0 + PIANO.z1) / 2],
      },
    );
    b.add(new THREE.BoxGeometry(4.6, 0.02, 3.4), RUG, {
      position: [-1, 0.01, 0.4],
    });
    b.add(new THREE.BoxGeometry(2.2, 2.6, 0.4), WALNUT, {
      position: [-3.6, 1.3, z1 - 0.2],
    });
    b.add(new THREE.PlaneGeometry(2, 2.4), BOOKS, {
      position: [-3.6, 1.3, z1 - 0.41],
      rotation: [0, Math.PI, 0],
    });
    // Edison bulbs hanging on cords over the bar and the room
    for (let x = BAR.x0 + 0.6; x < BAR.x1; x += 1.6) {
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 1.2, 4), CORD, {
        position: [x, H - 0.6, -3.6],
      });
      b.add(new THREE.SphereGeometry(0.06, 10, 8), BULB, {
        position: [x, H - 1.25, -3.6],
      });
    }
    return b.build();
  }, [spines]);
}

/**
 * The Back Room, behind an unmarked door on Nightlife Row: jacquard
 * wallpaper over dark paneling, a mirrored back bar of bottles, oxblood
 * leather booths, Edison bulbs, a piano in the corner and Odette mixing.
 */
export function BackRoom({ onPick }: { onPick: PickHandler }): JSX.Element {
  const calm = useReducedMotion();
  const spines = useMemo(spinesTex, []);
  useEffect(() => () => spines.dispose(), [spines]);
  const room = useRoom(spines);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (glow.current && !calm)
      glow.current.intensity = 9 + Math.sin(clock.elapsedTime * 1.7) * 0.6;
  });
  const stools = useMemo(
    () => STOOL_XS.map((x) => [x, 0, STOOL_Z, 0] as const),
    [],
  );
  return (
    <>
      <color attach="background" args={["#0c0606"]} />
      <fog attach="fog" args={["#140808", 12, 30]} />
      <hemisphereLight args={["#ffd8b0", "#3a1a1a", 1.8]} />
      <pointLight
        ref={glow}
        position={[-1, 2.6, -3]}
        color="#ffb24a"
        intensity={9}
        distance={12}
      />
      <pointLight
        position={[5.5, 2.2, 0]}
        color="#ff8a5a"
        intensity={6}
        distance={9}
      />
      <Floor
        width={W}
        depth={D}
        color="#c09a7a"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.55 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["back-room"]} color="#ff8a3d" />
      <primitive object={room} />
      <BarStools at={stools} color="#6a1a1a" />
      <Bottles rows={SHELF_ROWS} seed={21} />
      <NeonText
        text="the back room"
        color="#ff8a3d"
        font={SCRIPT}
        width={3}
        k={2.4}
        position={[4.6, 2.9, z0 + 0.05]}
        flicker
      />
      <TalkingNpc
        name="Odette"
        role="bartender"
        look={BARTENDER_LOOK}
        mood="idle"
        at={[BARTENDER[0], 0, BARTENDER[1]]}
        rot={0}
        seed={481}
        greet
        context={{ venue: "back-room", neighborhood: "nightlife-row" }}
      />
    </>
  );
}

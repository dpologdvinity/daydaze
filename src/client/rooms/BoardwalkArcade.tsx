import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import {
  ATTENDANT,
  BOUNDS,
  CLAW,
  COUNTER,
  LANE,
  LANES,
  PINBALL_Z,
  PINBALLS,
  SHELVES,
} from "../../game/boardwalkArcade.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { GLOSS, painted } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr, neonMat } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { ROLL_TIME, skee, tick } from "./boardwalk/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 4.4;
/** The lane rises from the foul line to the ring board at the back. */
const RISE = 0.9;
const BOARD_Z = LANE.z0 + 0.9;
/** Where each ring sits on the board, as offsets from its center. */
const RING_SPOTS: Record<number, [number, number]> = {
  0: [0, -0.7],
  10: [0, -0.35],
  20: [0, -0.1],
  30: [0, 0.12],
  40: [0, 0.32],
  50: [0, 0.5],
  100: [0.55, 0.62],
};

const WALL = surface("concrete_wall_008", { scale: 0.6, color: "#2a2040" });
const WOOD = surface("wood_veneer", {
  scale: 1.2,
  color: "#c8904a",
  roughness: 0.4,
});
const BLACK = new THREE.MeshStandardMaterial({
  color: "#141018",
  roughness: 0.4,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#cfe9ff",
  transparent: true,
  opacity: 0.2,
  roughness: 0.05,
});
const PINK = neonMat("#ff2f9a", 2.4);
const CYAN = neonMat("#4fe3ff", 2.4);
const YELLOW = neonMat("#ffd84f", 2.2);

const ATTENDANT_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "pigtails",
  hairColor: "#ff4fb3",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "baby-tee-mini",
  outfitColor: "#3fe0d0",
  shadow: "#ff2f9a",
};
const PLAYER_2: Look = {
  ...ATTENDANT_LOOK,
  skin: "#633c29",
  hairStyle: "afro",
  hairColor: "#1b1014",
  outfit: "tracksuit-y2k",
  outfitColor: "#9b5cff",
  shadow: "#3fe0d0",
};

/** The ring board's face: concentric rings with their numbers. */
function boardTex() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#1a1438";
    ctx.fillRect(0, 0, 256, 256);
    const rings: [number, string, string][] = [
      [118, "#2e7dff", "10"],
      [92, "#9b5cff", "20"],
      [68, "#ff2f9a", "30"],
      [46, "#ff8a3d", "40"],
      [24, "#ffd84f", "50"],
    ];
    for (const [r, c] of rings) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(128, 150, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1438";
      ctx.beginPath();
      ctx.arc(128, 150, r - 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    for (const [r, , label] of rings) ctx.fillText(label, 128, 150 - r + 22);
    for (const x of [26, 230]) {
      ctx.fillStyle = "#7dff6b";
      ctx.beginPath();
      ctx.arc(x, 26, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#141018";
      ctx.fillText("100", x, 32);
    }
  });
}

/** Confetti carpet, the arcade classic. */
function carpetTex() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#1a1030";
    ctx.fillRect(0, 0, 256, 256);
    const colors = ["#ff2f9a", "#4fe3ff", "#ffd84f", "#7dff6b", "#9b5cff"];
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = colors[i % colors.length] ?? "#fff";
      const x = (i * 97) % 256;
      const y = (i * 61 + (i % 7) * 13) % 256;
      if (i % 3 === 0) ctx.fillRect(x, y, 10, 3);
      else {
        ctx.beginPath();
        ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function useRoom(board: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const FACE = new THREE.MeshBasicMaterial({
      map: board,
      color: hdr("#ffffff", 1.2),
      toneMapped: false,
    });
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), WALL, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), WALL, {
        position: [x, H / 2, (z0 + z1) / 2],
      });
    // neon stripes along the walls
    b.add(new THREE.BoxGeometry(W, 0.05, 0.05), PINK, {
      position: [0, 3.6, z0 + 0.05],
    });
    for (const x of [x0 + 0.05, x1 - 0.05]) {
      b.add(new THREE.BoxGeometry(0.05, 0.05, D), CYAN, {
        position: [x, 3.6, (z0 + z1) / 2],
      });
      b.add(new THREE.BoxGeometry(0.05, 0.05, D), YELLOW, {
        position: [x, 0.4, (z0 + z1) / 2],
      });
    }
    // the Skee-Ball lanes: a ramp, side rails, the ring board in a cage
    const len = LANE.z1 - BOARD_Z;
    const slope = Math.atan2(RISE, len);
    for (const x of LANES) {
      b.add(
        new THREE.BoxGeometry(LANE.width - 0.3, 0.06, Math.hypot(len, RISE)),
        WOOD,
        {
          position: [x, 0.55 + RISE / 2, (LANE.z1 + BOARD_Z) / 2],
          rotation: [slope, 0, 0],
        },
      );
      for (const side of [-1, 1]) {
        b.add(new THREE.BoxGeometry(0.15, 1.1, LANE.z1 - LANE.z0), BLACK, {
          position: [
            x + side * (LANE.width / 2 - 0.075),
            0.55,
            (LANE.z0 + LANE.z1) / 2,
          ],
        });
        b.add(new THREE.BoxGeometry(0.04, 0.04, LANE.z1 - LANE.z0), CYAN, {
          position: [
            x + side * (LANE.width / 2 - 0.075),
            1.12,
            (LANE.z0 + LANE.z1) / 2,
          ],
        });
      }
      b.add(new THREE.BoxGeometry(LANE.width, 0.55, 0.5), BLACK, {
        position: [x, 0.28, LANE.z1 - 0.25],
      });
      b.add(new THREE.PlaneGeometry(LANE.width - 0.3, LANE.width - 0.3), FACE, {
        position: [x, 1.45 + RISE * 0.6, BOARD_Z - 0.25],
        rotation: [-0.5, 0, 0],
      });
      b.add(new THREE.BoxGeometry(LANE.width, 2.6, 0.1), BLACK, {
        position: [x, 1.3, LANE.z0],
      });
      b.add(new THREE.BoxGeometry(LANE.width, 0.5, 0.1), PINK, {
        position: [x, 2.85, LANE.z0 + 0.1],
      });
      b.add(new THREE.BoxGeometry(LANE.width - 0.3, 1.2, 0.02), GLASS, {
        position: [x, 2.1, BOARD_Z - 0.6],
      });
    }
    // the claw machine: a cabinet, a glass box of plush, the claw
    const cx = (CLAW.x0 + CLAW.x1) / 2;
    const cz = (CLAW.z0 + CLAW.z1) / 2;
    b.add(
      new THREE.BoxGeometry(CLAW.x1 - CLAW.x0, 1, CLAW.z1 - CLAW.z0),
      PINK,
      {
        position: [cx, 0.5, cz],
      },
    );
    b.add(
      new THREE.BoxGeometry(CLAW.x1 - CLAW.x0, 1.2, CLAW.z1 - CLAW.z0),
      GLASS,
      { position: [cx, 1.6, cz] },
    );
    for (let i = 0; i < 12; i++)
      b.add(
        painted(
          new THREE.SphereGeometry(0.12, 10, 8),
          ["#ffb3d9", "#b8f0d8", "#fff0a8", "#d8c0ff"][i % 4] ?? "#fff",
        ),
        GLOSS,
        {
          position: [
            CLAW.x0 + 0.25 + (i % 4) * 0.3,
            1.12 + Math.floor(i / 4) * 0.1,
            CLAW.z0 + 0.3 + Math.floor(i / 4) * 0.35,
          ],
        },
      );
    b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), BLACK, {
      position: [cx, 2, cz],
    });
    b.add(new THREE.ConeGeometry(0.1, 0.15, 3, 1, true), YELLOW, {
      position: [cx, 1.75, cz],
      rotation: [Math.PI, 0, 0],
    });
    // pinball tables: a cabinet, a glowing playfield, a backbox
    for (const x of PINBALLS) {
      b.add(
        new THREE.BoxGeometry(0.8, 0.9, PINBALL_Z.z1 - PINBALL_Z.z0),
        BLACK,
        {
          position: [x, 0.45, (PINBALL_Z.z0 + PINBALL_Z.z1) / 2],
        },
      );
      b.add(new THREE.BoxGeometry(0.7, 0.04, 1.2), x < -5 ? CYAN : YELLOW, {
        position: [x, 0.95, (PINBALL_Z.z0 + PINBALL_Z.z1) / 2],
        rotation: [-0.12, 0, 0],
      });
      b.add(new THREE.BoxGeometry(0.8, 0.7, 0.15), PINK, {
        position: [x, 1.4, PINBALL_Z.z0 + 0.08],
      });
    }
    // the prize counter: glass case, shelves of plush behind
    const kx = (COUNTER.x0 + COUNTER.x1) / 2;
    b.add(new THREE.BoxGeometry(COUNTER.x1 - COUNTER.x0, 0.9, 1), BLACK, {
      position: [kx, 0.45, (COUNTER.z0 + COUNTER.z1) / 2],
    });
    b.add(new THREE.BoxGeometry(COUNTER.x1 - COUNTER.x0, 0.3, 1), GLASS, {
      position: [kx, 1.05, (COUNTER.z0 + COUNTER.z1) / 2],
    });
    // the prize shelves behind her, stacked with plush
    const sx = (SHELVES.x0 + SHELVES.x1) / 2;
    const sz = (SHELVES.z0 + SHELVES.z1) / 2;
    for (const y of [0.9, 1.6, 2.3])
      b.add(new THREE.BoxGeometry(SHELVES.x1 - SHELVES.x0, 0.05, 0.5), WOOD, {
        position: [sx, y, sz],
      });
    b.add(new THREE.BoxGeometry(SHELVES.x1 - SHELVES.x0, 2.6, 0.05), BLACK, {
      position: [sx, 1.3, SHELVES.z0],
    });
    const plush = ["#ff2f9a", "#4fe3ff", "#ffd84f", "#7dff6b", "#9b5cff"];
    for (let i = 0; i < 15; i++)
      b.add(
        painted(
          new THREE.SphereGeometry(0.16 + (i % 3) * 0.03, 12, 10),
          plush[i % plush.length] ?? "#fff",
        ),
        GLOSS,
        {
          position: [
            SHELVES.x0 + 0.3 + (i % 5) * 0.6,
            1.08 + Math.floor(i / 5) * 0.7,
            sz,
          ],
        },
      );
    return b.build();
  }, [board]);
}

/** The ball up the middle lane, and where it drops in. */
function Ball() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const now = performance.now();
    tick(now);
    const m = ref.current;
    if (!m) return;
    const s = skee.get();
    m.visible = s.phase === "rolling";
    if (!m.visible) return;
    const f = calm ? 1 : Math.min(1, (now - s.since) / 1000 / ROLL_TIME);
    const [dx, up] = RING_SPOTS[s.last ?? 0] ?? [0, 0];
    const side = s.aim < 0 ? -1 : 1;
    const x = (s.last === 100 ? dx * side : s.aim * 0.3) * f;
    if (f < 0.75) {
      const g = f / 0.75;
      m.position.set(
        x,
        0.62 + g * RISE,
        LANE.z1 - 0.3 - g * (LANE.z1 - BOARD_Z - 0.3),
      );
    } else {
      // the hop up the ring board into its ring
      const g = (f - 0.75) / 0.25;
      m.position.set(
        x,
        0.62 + RISE + Math.sin(g * Math.PI) * 0.3 + g * up,
        BOARD_Z - g * 0.3,
      );
    }
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.1, 16, 12]} />
      <meshStandardMaterial color="#f4e8c8" roughness={0.3} />
    </mesh>
  );
}

/**
 * The Boardwalk Arcade on Shore Boulevard: confetti carpet under neon, three
 * Skee-Ball lanes with glowing ring boards (play the middle one), a claw
 * machine full of plush, two pinball tables and Pia at the prize counter.
 */
export function BoardwalkArcade({
  onPick,
}: {
  onPick: PickHandler;
}): JSX.Element {
  const board = useMemo(boardTex, []);
  const carpet = useMemo(() => {
    const t = carpetTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / 3, D / 3);
    return t;
  }, []);
  useEffect(
    () => () => {
      board.dispose();
      carpet.dispose();
    },
    [board, carpet],
  );
  const room = useRoom(board);
  return (
    <>
      <color attach="background" args={["#0c0818"]} />
      <hemisphereLight args={["#d8c8ff", "#2a1840", 1.6]} />
      <pointLight
        position={[0, 3.4, -3]}
        color="#ff8ad8"
        intensity={8}
        distance={12}
      />
      <pointLight
        position={[5, 3, 3]}
        color="#8adfff"
        intensity={6}
        distance={10}
      />
      <Floor width={W} depth={D} color="#ffffff" map={carpet} onPick={onPick} />
      <PortalPads room={ROOMS["boardwalk-arcade"]} color="#4fe3ff" />
      <primitive object={room} />
      <group position={[LANES[1] ?? 0, 0, 0]}>
        <Ball />
      </group>
      <NeonText
        text="BOARDWALK ARCADE"
        color="#4fe3ff"
        font={MARQUEE}
        width={5}
        k={2}
        position={[0, 3.95, z0 + 0.05]}
      />
      <TalkingNpc
        name="Pia"
        role="ticket-cashier"
        look={ATTENDANT_LOOK}
        mood="idle"
        at={[ATTENDANT[0], 0, ATTENDANT[1]]}
        rot={0}
        seed={581}
        greet
        context={{ venue: "boardwalk-arcade", neighborhood: "beachside" }}
      />
      <group position={[-5.6, 0, 3.4]} rotation-y={Math.PI}>
        <CrowdFigure look={PLAYER_2} move="cheer" seed={582} />
      </group>
    </>
  );
}

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  BAR,
  BARRELS,
  BOUNDS,
  SOMMELIER,
  STOOL_XS,
  STOOL_Z,
} from "../../game/wineBar.ts";
import { WINES } from "../../game/winePour.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles } from "./shared/Bottles.tsx";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { cellar, levelNow } from "./cellar/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
const H = 3.6;

const BRICK = surface("brick_wall_02", { scale: 0.5, color: "#c88a6a" });
const OAK = surface("wood_veneer", {
  scale: 1.2,
  color: "#5a3420",
  roughness: 0.5,
});
const STAVES = surface("wood_plank_wall", {
  scale: 0.8,
  color: "#8a5a3a",
  roughness: 0.7,
});
const IRON = new THREE.MeshStandardMaterial({
  color: "#2a2420",
  roughness: 0.5,
  metalness: 0.5,
});
const FLAME = new THREE.MeshBasicMaterial({
  color: hdr("#ffb24a", 2.6),
  toneMapped: false,
});
const WAX = new THREE.MeshStandardMaterial({
  color: "#f4ecd8",
  roughness: 0.6,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#eef6ff",
  transparent: true,
  opacity: 0.28,
  roughness: 0.05,
  side: THREE.DoubleSide,
});

const SOMM_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "corset-maxi",
  outfitColor: "#6a1a2a",
  shadow: "#8a5a3c",
};
const GUESTS: readonly {
  look: Look;
  at: [number, number, number];
  rot: number;
}[] = [
  {
    look: {
      ...SOMM_LOOK,
      skin: "#f3d4c4",
      hairStyle: "waves",
      hairColor: "#b77a3e",
      outfit: "sequin-slip",
      outfitColor: "#e8e2ff",
    },
    at: [5.4, 0, -2.25],
    rot: 0,
  },
  {
    look: {
      ...SOMM_LOOK,
      skin: "#633c29",
      hairStyle: "coils",
      outfit: "blouse",
      outfitColor: "#3a5a8a",
    },
    at: [5.4, 0, -0.55],
    rot: Math.PI,
  },
];

/** The back wall's racks: bottles lying in rows, as Bottles shelves. */
const RACK_ROWS = [0.9, 1.35, 1.8, 2.25, 2.7].map((y) => ({
  x0: BAR.x0 + 0.2,
  x1: BAR.x1 - 0.2,
  y,
  z: z0 + 0.3,
  count: 22,
}));

function useCellar() {
  return useMemo(() => {
    const b = new Batch();
    // brick walls (open overhead, where the camera looks in)
    b.add(new THREE.BoxGeometry(W + 0.4, H, 0.3), BRICK, {
      position: [0, H / 2, z0 - 0.15],
    });
    for (const x of [x0 - 0.15, x1 + 0.15])
      b.add(new THREE.BoxGeometry(0.3, H, D), BRICK, {
        position: [x, H / 2, 0],
      });
    // the bar: oak, a brass-less iron foot rail
    const bw = BAR.x1 - BAR.x0;
    const bx = (BAR.x0 + BAR.x1) / 2;
    b.add(new THREE.BoxGeometry(bw, 1.05, BAR.z1 - BAR.z0), STAVES, {
      position: [bx, 0.525, (BAR.z0 + BAR.z1) / 2],
    });
    b.add(new THREE.BoxGeometry(bw + 0.15, 0.07, 1), OAK, {
      position: [bx, 1.08, (BAR.z0 + BAR.z1) / 2],
    });
    b.add(new THREE.CylinderGeometry(0.02, 0.02, bw, 8), IRON, {
      position: [bx, 0.2, BAR.z1 + 0.15],
      rotation: [0, 0, Math.PI / 2],
    });
    // the racks behind it: oak frames round the bottles
    for (const { y } of RACK_ROWS)
      b.add(new THREE.BoxGeometry(bw, 0.03, 0.4), OAK, {
        position: [bx, y - 0.02, z0 + 0.3],
      });
    for (let x = BAR.x0; x <= BAR.x1 + 0.01; x += bw / 4)
      b.add(new THREE.BoxGeometry(0.06, 2.4, 0.4), OAK, {
        position: [x, 1.8, z0 + 0.3],
      });
    // barrel tables: staves, iron hoops, a round oak top, a candle
    for (const [x, z] of BARRELS) {
      b.add(new THREE.CylinderGeometry(0.42, 0.42, 1, 18), STAVES, {
        position: [x, 0.5, z],
      });
      for (const y of [0.2, 0.8])
        b.add(new THREE.TorusGeometry(0.43, 0.02, 6, 24), IRON, {
          position: [x, y, z],
          rotation: [Math.PI / 2, 0, 0],
        });
      b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24), OAK, {
        position: [x, 1.03, z],
      });
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), WAX, {
        position: [x, 1.12, z],
      });
      b.add(new THREE.ConeGeometry(0.015, 0.04, 6), FLAME, {
        position: [x, 1.2, z],
      });
      // high stools either side
      for (const side of [-1, 1]) {
        b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), OAK, {
          position: [x + side * 0.85, 0.78, z],
        });
        b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.76, 8), IRON, {
          position: [x + side * 0.85, 0.38, z],
        });
      }
    }
    // candles along the bar, and stacked barrels in the west corner
    for (let x = BAR.x0 + 0.4; x < BAR.x1; x += 1.8) {
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), WAX, {
        position: [x, 1.17, BAR.z1 - 0.15],
      });
      b.add(new THREE.ConeGeometry(0.015, 0.04, 6), FLAME, {
        position: [x, 1.24, BAR.z1 - 0.15],
      });
    }
    for (const [x, y, z] of [
      [x0 + 0.6, 0.45, -1.2],
      [x0 + 0.6, 0.45, -0.2],
      [x0 + 0.6, 1.3, -0.7],
    ] as const)
      b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 18), STAVES, {
        position: [x, y, z],
        rotation: [Math.PI / 2, 0, 0],
      });
    return b.build();
  }, []);
}

/** The glass on the bar for the flight, filling as she pours. */
function PouringGlass() {
  const calm = useReducedMotion();
  const wine = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.2 }),
    [],
  );
  useFrame(() => {
    const m = wine.current;
    if (!m) return;
    const s = cellar.get();
    if (m.parent) m.parent.visible = s.on;
    if (!s.on) return;
    const glass = s.flight.pours.length;
    const level =
      s.pouring !== null
        ? levelNow(performance.now())
        : (s.flight.pours[glass - 1]?.level ?? 0);
    const shown = calm ? level : Math.min(1, level);
    // the wine rises from the bottom of the bowl
    m.scale.set(1, Math.max(0.001, shown), 1);
    m.position.y = 0.12 * shown;
    mat.color.set(
      WINES[
        (s.pouring !== null ? glass : Math.max(0, glass - 1)) % WINES.length
      ]?.color ?? "#6a0a1a",
    );
  });
  return (
    <group position={[SOMMELIER[0] + 0.6, 1.11, BAR.z1 - 0.25]} visible={false}>
      <mesh material={GLASS} position-y={0.12}>
        <cylinderGeometry args={[0.06, 0.04, 0.24, 16, 1, true]} />
      </mesh>
      <mesh ref={wine} material={mat} position-y={0}>
        <cylinderGeometry args={[0.055, 0.04, 0.24, 16]} />
      </mesh>
      {/* the line, a thin gold ring */}
      <mesh position-y={0.24 * 0.6} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.055, 0.003, 4, 24]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
    </group>
  );
}

/**
 * Cellar 214, down a stair off Park Avenue: a vaulted brick cellar, an oak
 * bar before a wall of bottles in racks, barrel tables lit by candles,
 * stacked casks in the corner, and Inès the sommelier, who'll let you pour
 * a flight.
 */
export function WineBar({ onPick }: { onPick: PickHandler }): JSX.Element {
  const room = useCellar();
  const stools = useMemo(
    () => STOOL_XS.map((x) => [x, 0, STOOL_Z, 0] as const),
    [],
  );
  return (
    <>
      <color attach="background" args={["#0e0806"]} />
      <hemisphereLight args={["#ffd8b0", "#3a1a10", 1.5]} />
      <pointLight
        position={[-1, 2.6, -3]}
        color="#ffb070"
        intensity={8}
        distance={11}
      />
      <pointLight
        position={[5.4, 2.2, 0.3]}
        color="#ff9a5a"
        intensity={5}
        distance={8}
      />
      <Floor
        width={W}
        depth={D}
        color="#b08a6a"
        texture={{ id: "cobblestone_floor_04", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["wine-bar"]} color="#ffd6a5" />
      <primitive object={room} />
      <Bottles rows={RACK_ROWS} seed={61} />
      <BarStools at={stools} color="#5a3420" />
      <PouringGlass />
      <NeonText
        text="cellar 214"
        color="#ffd6a5"
        font={SCRIPT}
        width={2.6}
        k={2}
        position={[4.4, 2.6, z0 + 0.06]}
      />
      <TalkingNpc
        name="Inès"
        role="bartender"
        look={SOMM_LOOK}
        mood="idle"
        at={[SOMMELIER[0], 0, SOMMELIER[1]]}
        rot={0}
        seed={601}
        greet
        context={{ venue: "wine-bar", neighborhood: "uptown" }}
      />
      {GUESTS.map((g, i) => (
        <group key={i} position={g.at} rotation-y={g.rot}>
          <CrowdFigure look={g.look} move="chatting" seed={602 + i} />
        </group>
      ))}
    </>
  );
}

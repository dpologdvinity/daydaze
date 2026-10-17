import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import {
  BAR,
  CABINET_XS,
  CABINET_Z,
  HOCKEY,
  PINBALL,
  PLAYABLE,
  STOOL_X,
  STOOL_ZS,
} from "../../game/arcadeBar.ts";
import { hotspotsIn, type MinigameId } from "../../game/hotspots.ts";
import { ROOMS } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { ArcadeNpcs } from "./arcadebar/Npcs.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GamePad } from "./shared/GamePad.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { PropSet } from "./shared/Prop.tsx";

const WALL_X0 = -6.2;
const WALL_X1 = 6.2;
const BACK_Z = -6;
const FRONT_Z = 6;
const HEIGHT = 4;
const GREEN = "#7dff6b";
const PINK = "#ff4fb3";
const CYAN = "#4fe3ff";
const MARQUEES = [
  PINK,
  CYAN,
  "#ffd84f",
  GREEN,
  "#b06bff",
  "#ff8a3d",
  CYAN,
  PINK,
];

// arcade carpet: squiggles, triangles and rings in neon on near-black
const CARPET = canvasTex(
  256,
  256,
  (ctx) => {
    ctx.fillStyle = "#0b0718";
    ctx.fillRect(0, 0, 256, 256);
    const colors = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff"];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    ctx.lineWidth = 4;
    for (let i = 0; i < 46; i++) {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.fillStyle = colors[(i + 2) % colors.length];
      const x = rand() * 256;
      const y = rand() * 256;
      const kind = i % 3;
      ctx.beginPath();
      if (kind === 0) {
        ctx.moveTo(x, y);
        for (let k = 1; k < 5; k++) ctx.lineTo(x + k * 7, y + (k % 2 ? 8 : -8));
        ctx.stroke();
      } else if (kind === 1) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 16);
        ctx.lineTo(x - 10, y + 16);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
  [3, 3],
);

/** Attract-mode screens: one per playable cabinet, and one shared by the
 * rest (tinted per cabinet). No logos: each draws its own game's look. */
function screen(game: MinigameId | "attract") {
  return canvasTex(128, 160, (ctx) => {
    ctx.fillStyle = "#05030c";
    ctx.fillRect(0, 0, 128, 160);
    ctx.textAlign = "center";
    ctx.font = "700 14px sans-serif";
    if (game === "gem-glam") {
      const gems = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff"];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          ctx.fillStyle = gems[(r * 7 + c * 3) % gems.length];
          ctx.beginPath();
          const x = 19 + c * 18;
          const y = 46 + r * 18;
          ctx.moveTo(x, y - 7);
          ctx.lineTo(x + 7, y);
          ctx.lineTo(x, y + 7);
          ctx.lineTo(x - 7, y);
          ctx.fill();
        }
      ctx.fillStyle = "#ffd1f0";
      ctx.fillText("GEM GLAM", 64, 22);
    } else if (game === "bassline") {
      const bars = [40, 80, 60, 100, 70, 50, 90, 30];
      bars.forEach((h, i) => {
        ctx.fillStyle = i % 2 ? "#4fe3ff" : "#ff4fb3";
        ctx.fillRect(10 + i * 14, 150 - h, 10, h);
      });
      ctx.fillStyle = "#e8e2ff";
      ctx.fillText("BASSLINE", 64, 22);
    } else if (game === "trivia") {
      ctx.fillStyle = "#ffd84f";
      ctx.font = "900 56px sans-serif";
      ctx.fillText("?", 64, 100);
      ctx.font = "700 14px sans-serif";
      ctx.fillStyle = "#4fe3ff";
      ctx.fillText("THROWBACK", 64, 22);
      ctx.fillText("TRIVIA", 64, 40);
    } else if (game === "star-siege") {
      // the fleet in rows, and a ship at the bottom
      const rows = ["#ff4fb3", "#b06bff", "#4fe3ff", "#7dff6b"];
      rows.forEach((color, r) => {
        ctx.fillStyle = color;
        for (let c = 0; c < 5; c++)
          ctx.fillRect(20 + c * 20, 40 + r * 16, 10, 7);
      });
      ctx.fillStyle = "#ffd84f";
      ctx.beginPath();
      ctx.moveTo(64, 128);
      ctx.lineTo(74, 144);
      ctx.lineTo(54, 144);
      ctx.fill();
      ctx.fillText("STAR SIEGE", 64, 22);
    } else if (game === "midway") {
      for (let r = 5; r > 0; r--) {
        ctx.fillStyle = r % 2 ? "#ff2f4f" : "#fff1d6";
        ctx.beginPath();
        ctx.arc(64, 92, r * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd84f";
      ctx.fillText("STEP RIGHT UP", 64, 22);
    } else {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 30; i++)
        ctx.fillRect((i * 37) % 128, (i * 53) % 160, 3, 3);
      ctx.fillText("INSERT COIN", 64, 84);
    }
  });
}

type Box = readonly [
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
];

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
};

/** Boxes of one material in one draw call, each tinted if `colors` is set. */
function Boxes({
  boxes,
  colors,
  children,
}: {
  boxes: readonly Box[];
  colors?: readonly THREE.Color[];
  children: ReactNode;
}) {
  return (
    <instancedMesh
      ref={(mesh) => {
        if (!mesh) return;
        const { m, q, p, s } = scratch;
        boxes.forEach(([x, y, z, w, h, d], i) => {
          mesh.setMatrixAt(
            i,
            m.compose(p.set(x, y, z), q.identity(), s.set(w, h, d)),
          );
          if (colors) mesh.setColorAt(i, colors[i % colors.length]);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }}
      args={[undefined, undefined, boxes.length]}
    >
      <boxGeometry />
      {children}
    </instancedMesh>
  );
}

const PLAYABLE_GAMES: Partial<Record<number, MinigameId>> = {
  [PLAYABLE.gemGlam]: "gem-glam",
  [PLAYABLE.bassline]: "bassline",
  [PLAYABLE.midway]: "midway",
  [PLAYABLE.starSiege]: "star-siege",
  [PLAYABLE.trivia]: "trivia",
};

/** The cabinets down the back wall: bodies, lit marquees, control decks
 * and screens tilted up at the player. */
function Cabinets() {
  const screens = useMemo((): Record<MinigameId | "attract", THREE.Texture> => {
    const attract = screen("attract");
    return {
      "gem-glam": screen("gem-glam"),
      bassline: screen("bassline"),
      midway: screen("midway"),
      "star-siege": screen("star-siege"),
      trivia: screen("trivia"),
      "last-call": attract,
      attract,
    };
  }, []);
  const z = CABINET_Z;
  return (
    <>
      <Boxes boxes={CABINET_XS.map((x): Box => [x, 0.9, z, 0.78, 1.8, 0.8])}>
        <meshStandardMaterial color="#14102a" roughness={0.6} />
      </Boxes>
      <Boxes
        boxes={CABINET_XS.map((x): Box => [x, 1.95, z + 0.12, 0.78, 0.3, 0.56])}
        colors={MARQUEES.map((c) => hdr(c, 1.8))}
      >
        <meshBasicMaterial toneMapped={false} />
      </Boxes>
      <Boxes
        boxes={CABINET_XS.map((x): Box => [x, 0.98, z + 0.48, 0.74, 0.08, 0.3])}
      >
        <meshStandardMaterial color="#2a2440" roughness={0.5} />
      </Boxes>
      {CABINET_XS.map((x, i) => {
        const game = PLAYABLE_GAMES[i];
        return (
          <mesh key={x} position={[x, 1.42, z + 0.41]} rotation-x={-0.25}>
            <planeGeometry args={[0.6, 0.62]} />
            <meshBasicMaterial
              map={screens[game ?? "attract"]}
              color={game ? "#ffffff" : MARQUEES[i]}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      <NeonText
        text="PLAYER 2"
        color={GREEN}
        font={MARQUEE}
        width={4.6}
        k={3.8}
        flicker
        position={[0, 3.2, BACK_Z + 0.16]}
      />
    </>
  );
}

/** Pinball machines down the left wall: a cabinet on legs with a dim lit
 * playfield under glass, and an upright backbox at the wall end whose art
 * glows towards the room. */
function Pinball() {
  const zs = [-1.6, -0.2, 1.2, 2.6];
  const x = (PINBALL.x0 + PINBALL.x1) / 2;
  const art = [PINK, CYAN, "#ffd84f", GREEN];
  return (
    <>
      <Boxes
        boxes={zs.flatMap((z): Box[] => [
          [x, 0.75, z, 1, 0.3, 0.62],
          // the backbox standing at the wall end
          [PINBALL.x0 + 0.1, 1.4, z, 0.2, 0.9, 0.62],
        ])}
      >
        <meshStandardMaterial color="#1c1430" roughness={0.5} />
      </Boxes>
      <Boxes
        boxes={zs.map((z): Box => [x + 0.02, 0.905, z, 0.9, 0.01, 0.52])}
        colors={art.map((c) => hdr(c, 0.45))}
      >
        <meshBasicMaterial toneMapped={false} />
      </Boxes>
      <Boxes
        boxes={zs.map((z): Box => [
          PINBALL.x0 + 0.205,
          1.45,
          z,
          0.01,
          0.7,
          0.54,
        ])}
        colors={["#b06bff", PINK, CYAN, "#ff8a3d"].map((c) => hdr(c, 1.5))}
      >
        <meshBasicMaterial toneMapped={false} />
      </Boxes>
      <Boxes
        boxes={zs.flatMap((z): Box[] => [
          [x - 0.42, 0.3, z - 0.25, 0.06, 0.6, 0.06],
          [x - 0.42, 0.3, z + 0.25, 0.06, 0.6, 0.06],
          [x + 0.42, 0.3, z - 0.25, 0.06, 0.6, 0.06],
          [x + 0.42, 0.3, z + 0.25, 0.06, 0.6, 0.06],
        ])}
      >
        <meshStandardMaterial color="#c9c9d4" metalness={0.9} roughness={0.3} />
      </Boxes>
    </>
  );
}

/** Air hockey: a white table rimmed in neon, a puck sliding end to end. */
function AirHockey() {
  const calm = useReducedMotion();
  const puck = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const p = puck.current;
    if (!p || calm) return;
    const t = clock.elapsedTime;
    // bouncing between the ends and off the rails
    const tri = (v: number) => 1 - Math.abs((((v % 2) + 2) % 2) - 1) * 2;
    p.position.z = HOCKEY[1] + tri(t * 0.9) * 0.82;
    p.position.x = HOCKEY[0] + tri(t * 0.63 + 0.3) * 0.38;
  });
  return (
    <group>
      <mesh position={[HOCKEY[0], 0.4, HOCKEY[1]]}>
        <boxGeometry args={[1, 0.8, 2]} />
        <meshStandardMaterial color="#1c1430" roughness={0.6} />
      </mesh>
      <mesh position={[HOCKEY[0], 0.81, HOCKEY[1]]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.92, 1.92]} />
        <meshStandardMaterial color="#f4f0ff" roughness={0.15} />
      </mesh>
      <mesh position={[HOCKEY[0], 0.84, HOCKEY[1]]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.18, 0.2, 24]} />
        <meshBasicMaterial color={hdr(PINK, 2)} toneMapped={false} />
      </mesh>
      <mesh ref={puck} position={[HOCKEY[0], 0.83, HOCKEY[1]]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshBasicMaterial color={hdr(CYAN, 2.4)} toneMapped={false} />
      </mesh>
      {[-1, 1].map((end) => (
        <mesh key={end} position={[HOCKEY[0], 0.86, HOCKEY[1] + end * 0.8]}>
          <cylinderGeometry args={[0.07, 0.08, 0.06, 16]} />
          <meshStandardMaterial color={end < 0 ? PINK : GREEN} />
        </mesh>
      ))}
    </group>
  );
}

function Bar() {
  const length = BAR.z1 - BAR.z0;
  const cz = (BAR.z0 + BAR.z1) / 2;
  const cx = (BAR.front + BAR.back) / 2;
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, Math.PI / 2] as const),
    [],
  );
  return (
    <>
      <mesh position={[cx, 0.52, cz]}>
        <boxGeometry args={[BAR.back - BAR.front, 1.04, length]} />
        <meshStandardMaterial color="#1c1430" roughness={0.5} />
      </mesh>
      <mesh position={[BAR.front - 0.01, 0.6, cz]}>
        <boxGeometry args={[0.02, 0.04, length]} />
        <meshBasicMaterial color={hdr(GREEN, 2.4)} toneMapped={false} />
      </mesh>
      <mesh position={[cx - 0.05, 1.07, cz]}>
        <boxGeometry args={[BAR.back - BAR.front + 0.1, 0.05, length + 0.1]} />
        <meshStandardMaterial color="#2a2440" metalness={0.6} roughness={0.3} />
      </mesh>
      <Suspense fallback={null}>
        <PropSet
          model="bar-stool"
          width={0.42}
          depth={0.42}
          height={0.82}
          at={stools}
        />
      </Suspense>
    </>
  );
}

function Shell() {
  const wall = <meshStandardMaterial color="#120c24" roughness={0.9} />;
  const depth = FRONT_Z - BACK_Z;
  return (
    <>
      <mesh position={[0, HEIGHT / 2, BACK_Z]}>
        <boxGeometry args={[WALL_X1 - WALL_X0, HEIGHT, 0.2]} />
        {wall}
      </mesh>
      {[WALL_X0, WALL_X1].map((x) => (
        <mesh key={x} position={[x, HEIGHT / 2, (FRONT_Z + BACK_Z) / 2]}>
          <boxGeometry args={[0.2, HEIGHT, depth]} />
          {wall}
        </mesh>
      ))}
      {/* a pink neon band round the walls at the ceiling */}
      {[WALL_X0 + 0.12, WALL_X1 - 0.12].map((x) => (
        <mesh key={x} position={[x, HEIGHT - 0.3, (FRONT_Z + BACK_Z) / 2]}>
          <boxGeometry args={[0.03, 0.04, depth]} />
          <meshBasicMaterial color={hdr(PINK, 2.4)} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Player 2, the Arts District's arcade bar: neon carpet, a row of cabinets
 * down the back wall (Gem Glam, Bassline and the midway games play), pinball
 * along the left, air hockey on the floor and a bar on the right where Last
 * Call is played. The bartender pours.
 */
export function ArcadeBar({
  onPick,
  onGame,
}: {
  onPick: PickHandler;
  onGame: (game: MinigameId) => void;
}) {
  return (
    <>
      <color attach="background" args={["#06030f"]} />
      <fog attach="fog" args={["#120828", 9, 26]} />
      <hemisphereLight args={["#7a4dff", "#1a0a30", 0.55]} />
      <pointLight
        position={[0, 3.2, -3.4]}
        color={CYAN}
        intensity={3.5}
        distance={9}
      />
      <pointLight
        position={[4.4, 2.6, 1]}
        color="#ffc8a0"
        intensity={2.5}
        distance={6}
      />
      <Floor
        width={WALL_X1 - WALL_X0}
        depth={FRONT_Z - BACK_Z}
        center={[(WALL_X0 + WALL_X1) / 2, 0]}
        color="#ffffff"
        map={CARPET}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["arcade-bar"]} color={GREEN} />
      {hotspotsIn("arcade-bar").map((spot) => (
        <GamePad key={spot.id} spot={spot} onGame={onGame} />
      ))}
      <Shell />
      <Cabinets />
      <Pinball />
      <AirHockey />
      <Bar />
      <ArcadeNpcs onDrink={orderCocktail} />
    </>
  );
}

const orderCocktail = () => drink("cocktail");

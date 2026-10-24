// Swell Surf Co. scene: the beach shack, board rack and chairs, and the break
// where you ride a wave. While a ride is on, Break seats the player on the
// board and holds the camera through cameraHold; when it ends it frees the seat
// and puts her back on the sand.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { inPocket, pocketAt } from "../../game/surf.ts";
import {
  BOUNDS,
  BREAK_Z,
  CHAIRS,
  FACE_SCALE,
  RACK,
  RENTER,
  SHACK,
} from "../../game/surfShack.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { cameraHold } from "../world/cameraHold.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { gradientTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { surfing, tick } from "./surf/session.ts";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;
/** The wave: its width along the shore, and its face's height. */
const WAVE_W = 40;
const WAVE_H = 2.2;
const BOARD_COLORS = ["#ff2f9a", "#3fe0d0", "#ffd84f", "#ff8a3d", "#9b5cff"];

const PLANKS = surface("wood_floor", {
  scale: 0.6,
  color: "#c8a07a",
  roughness: 0.7,
});
const SHACK_WALL = surface("wood_plank_wall", {
  scale: 0.6,
  color: "#7ad0d8",
  roughness: 0.7,
});
const ROOF = surface("corrugated_iron", { scale: 0.8, color: "#ff9ec2" });
const SKY = gradientTex([
  [0, "#ffe0b0"],
  [0.4, "#bfe8ff"],
  [1, "#3a9ae8"],
]);

const RENTER_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "waves",
  hairColor: "#f1d78f",
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  outfit: "cargo-crop",
  outfitColor: "#3fe0d0",
  shadow: "#ffb02e",
};

/** The wave's face: a strip bent up into a curl, deep blue at the trough
 * to turquoise near the lip and foam on the crest. Faces the shore (+z). */
function waveGeometry() {
  const g = new THREE.PlaneGeometry(WAVE_W, 1, 80, 24);
  const pos = g.attributes.position;
  const color = new Float32Array(pos.count * 3);
  const deep = new THREE.Color("#0a5a9a");
  const face = new THREE.Color("#35d0e0");
  const foam = new THREE.Color("#f4ffff");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // w runs 0 at the trough to 1 at the lip
    const w = pos.getY(i) + 0.5;
    const a = w * Math.PI * 0.85;
    const y = Math.sin(a) * WAVE_H * 0.55 + w * WAVE_H * 0.45;
    const z = -Math.sin(a * 0.5) * 2.4 + Math.max(0, w - 0.75) * 3.2;
    pos.setXYZ(i, pos.getX(i), y, z);
    c.copy(deep).lerp(face, Math.min(1, w * 1.4));
    if (w > 0.82) c.lerp(foam, (w - 0.82) / 0.18);
    color.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(color, 3));
  g.computeVertexNormals();
  return g;
}

function useBeach() {
  return useMemo(() => {
    const b = new Batch();
    // the shack: a deck, teal plank walls, a pink tin roof, the counter
    const sw = SHACK.x1 - SHACK.x0;
    const sd = SHACK.z1 - SHACK.z0;
    const sx = (SHACK.x0 + SHACK.x1) / 2;
    const sz = (SHACK.z0 + SHACK.z1) / 2;
    b.add(new THREE.BoxGeometry(sw + 1, 0.2, sd + 1), PLANKS, {
      position: [sx - 0.5, 0.1, sz],
    });
    b.add(new THREE.BoxGeometry(0.2, 2.8, sd), SHACK_WALL, {
      position: [SHACK.x1, 1.6, sz],
    });
    b.add(new THREE.BoxGeometry(sw, 2.8, 0.2), SHACK_WALL, {
      position: [sx, 1.6, SHACK.z0],
    });
    b.add(new THREE.BoxGeometry(sw + 1.2, 0.12, sd + 1.2), ROOF, {
      position: [sx - 0.3, 3.1, sz],
      rotation: [0, 0, 0.12],
    });
    b.add(new THREE.BoxGeometry(0.6, 1.1, sd - 0.8), PLANKS, {
      position: [SHACK.x0 + 0.3, 0.75, sz + 0.2],
    });
    // surfboards standing in the shack and the rack
    const board = new THREE.SphereGeometry(1, 16, 10);
    for (let i = 0; i < 6; i++)
      b.add(
        painted(board, BOARD_COLORS[i % BOARD_COLORS.length] ?? "#fff"),
        GLOSS,
        {
          position: [SHACK.x1 - 0.3, 1.3, SHACK.z0 + 0.6 + i * 0.7],
          rotation: [0, 0, 0.1],
          scale: [0.04, 1.1, 0.26],
        },
      );
    for (let i = 0; i < 6; i++)
      b.add(
        painted(board, BOARD_COLORS[(i + 2) % BOARD_COLORS.length] ?? "#fff"),
        GLOSS,
        {
          position: [RACK.x0 + 0.3 + i * 0.55, 1.15, (RACK.z0 + RACK.z1) / 2],
          rotation: [0.1, 0, 0],
          scale: [0.26, 1.1, 0.04],
        },
      );
    b.add(new THREE.BoxGeometry(RACK.x1 - RACK.x0, 0.08, 0.5), PLANKS, {
      position: [(RACK.x0 + RACK.x1) / 2, 0.2, (RACK.z0 + RACK.z1) / 2],
    });
    // beach chairs: striped canvas on a low frame, a towel, an umbrella
    for (const [i, [x, z]] of CHAIRS.entries()) {
      b.add(
        painted(
          new THREE.BoxGeometry(0.6, 0.05, 0.6),
          BOARD_COLORS[i] ?? "#fff",
        ),
        GLOSS,
        { position: [x, 0.33, z + 0.15] },
      );
      b.add(
        painted(
          new THREE.BoxGeometry(0.6, 0.7, 0.05),
          BOARD_COLORS[i] ?? "#fff",
        ),
        GLOSS,
        { position: [x, 0.6, z + 0.5], rotation: [-0.4, 0, 0] },
      );
    }
    b.add(
      painted(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), "#f4f0e8"),
      GLOSS,
      {
        position: [-3.65, 1.2, 0.1],
      },
    );
    b.add(
      painted(new THREE.ConeGeometry(1.3, 0.5, 12, 1, true), "#ff8a3d"),
      GLOSS,
      { position: [-3.65, 2.4, 0.1] },
    );
    stringLights(
      b,
      [SHACK.x0, 2.9, z1 - 0.2],
      [SHACK.x0 - 4, 2.6, z1 - 0.2],
      10,
    );
    return b.build();
  }, []);
}

/** The ocean, the wave, the board, and the ride: while riding, the board
 * carries her along the face and the camera rides alongside. */
function Break({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const wave = useMemo(waveGeometry, []);
  useEffect(() => () => wave.dispose(), [wave]);
  const waveRef = useRef<THREE.Mesh>(null);
  const board = useRef<THREE.Mesh>(null);
  const pocket = useRef<THREE.Mesh>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      player.seat = null;
      if (cameraHold.by === "surf-shack") cameraHold.by = null;
    },
    [player],
  );
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (waveRef.current && !calm)
      waveRef.current.position.y = -0.3 + Math.sin(t * 0.8) * 0.12;
    tick(dt);
    const s = surfing.get();
    const riding = s.on;
    cameraHold.by = riding ? "surf-shack" : null;
    if (board.current) board.current.visible = riding;
    if (pocket.current)
      pocket.current.visible = riding && s.surf.state === "riding";
    if (!riding) {
      if (player.seat) {
        player.seat = null;
        placePlayer(player, 0, z0 + 0.6);
      }
      return;
    }
    const x = s.surf.x * FACE_SCALE;
    // high on the face in the pocket, sliding down it when out
    const up = inPocket(s.surf) ? 1.1 : 0.6;
    const y = -0.3 + up + (calm ? 0 : Math.sin(t * 2.2) * 0.06);
    const z = BREAK_Z + 1.4;
    const lean = s.surf.v * 0.08;
    const wiped = s.surf.state === "wiped";
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(x, wiped ? -1.4 : y + 0.08, z);
    player.seat.yaw = s.surf.v >= 0 ? Math.PI / 2 : -Math.PI / 2;
    player.seat.sit = false;
    if (board.current) {
      board.current.position.set(x, wiped ? -0.2 : y, z);
      board.current.rotation.set(0, s.surf.v >= 0 ? 0 : Math.PI, lean);
    }
    if (pocket.current)
      pocket.current.position.set(
        pocketAt(s.surf.seed, s.surf.t) * FACE_SCALE,
        y - 0.02,
        z + 0.2,
      );
    eye.set(x * 0.6, 3.2, z + 9);
    look.set(x, 0.8, z);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.25, (z0 + BREAK_Z) / 2 - 10]}
      >
        <planeGeometry args={[200, 60]} />
        <meshStandardMaterial
          color="#1a8ac0"
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.24, z0 - 1.2]}>
        <planeGeometry args={[200, 2.4]} />
        <meshStandardMaterial
          color="#bff4ff"
          transparent
          opacity={0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={waveRef} geometry={wave} position={[0, -0.3, BREAK_Z]}>
        <meshStandardMaterial
          vertexColors
          roughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={board} visible={false} scale={[1.1, 0.05, 0.28]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color="#ff2f9a" roughness={0.25} />
      </mesh>
      <mesh ref={pocket} visible={false} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9 * FACE_SCALE - 0.08, 0.9 * FACE_SCALE, 32]} />
        <meshBasicMaterial
          color={hdr("#ffffff", 1.4)}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/**
 * Swell Surf Co. on Shore Boulevard: a teal plank shack with a pink tin
 * roof and boards stacked inside, a rack of rentals, beach chairs under an
 * umbrella, and the break beyond, where you paddle out and ride a wave.
 * Kai rents the boards. Swimsuits on.
 */
export function SurfShack({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const beach = useBeach();
  return (
    <>
      <mesh scale={[300, 300, 300]}>
        <sphereGeometry args={[1, 24, 12]} />
        <meshBasicMaterial map={SKY} side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh position={[-40, 30, -180]}>
        <circleGeometry args={[10, 40]} />
        <meshBasicMaterial
          color={hdr("#fff2c8", 1.8)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <fog attach="fog" args={["#cfeeff", 60, 260]} />
      <hemisphereLight args={["#fff4e0", "#c8a888", 2.2]} />
      <directionalLight
        position={[-10, 14, -12]}
        color="#fff0d8"
        intensity={2}
      />
      <Floor
        width={W}
        depth={D}
        center={[(x0 + x1) / 2, (z0 + z1) / 2]}
        color="#f4e0b8"
        texture={{ id: "coast_sand_01", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["surf-shack"]} color="#3fe0d0" />
      <primitive object={beach} />
      <Break player={player} />
      <Palm position={[-8.6, 0, 1]} scale={1.4} />
      <Palm position={[3.2, 0, 6]} scale={1.2} />
      <NeonText
        text="SWELL SURF CO."
        color="#3fe0d0"
        font={MARQUEE}
        width={3.6}
        k={1.6}
        position={[(SHACK.x0 + SHACK.x1) / 2, 3.6, SHACK.z0 - 0.15]}
      />
      <TalkingNpc
        name="Kai"
        role="lifeguard"
        look={RENTER_LOOK}
        mood="idle"
        at={[RENTER[0] + 0.9, 0.2, RENTER[1]]}
        rot={-Math.PI / 2}
        seed={571}
        greet
        context={{ venue: "surf-shack", neighborhood: "beachside" }}
      />
    </>
  );
}

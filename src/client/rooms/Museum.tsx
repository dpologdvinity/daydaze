import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import {
  EXHIBITS,
  FLOOR_BOUNDS,
  viewpoint,
  type ExhibitKind,
} from "../../game/museum.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  JEEPNEY_CHROME,
  JEEPNEY_DARK,
  JEEPNEY_SHELL,
  JEEPNEY_TRIM,
} from "../city/carGeometry.ts";
import { parolGeometry } from "../city/Parols.tsx";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { placePlayer } from "../world/PlayerController.tsx";
import { cameraHold } from "../world/cameraHold.ts";
import { look as lookAt, tour } from "./museum/tour.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { plant, poster, rug } from "./shared/details.ts";
import { GOLD as GILT } from "./shared/materials.ts";
import { surface } from "../city/worldTexture.ts";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const GOLD = "#ffd166";
const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - FLOOR_BOUNDS.z0;

// cream plaster over a narra wainscot, plinths in dark wood
const PLASTER = surface("painted_plaster_wall", {
  scale: 0.5,
  color: "#f4ead5",
});
const NARRA = surface("wood_veneer", {
  scale: 1.2,
  color: "#8a5232",
  roughness: 0.5,
});
const LEATHER = surface("brown_leather", { scale: 2, color: "#c08a6a" });

/** Wainscot, a gallery of framed pictures, a viewing bench, rugs, plants. */
function buildDressing() {
  const b = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  b.add(box, NARRA, {
    position: [0, 0.5, FLOOR_BOUNDS.z0 + 0.01],
    scale: [W, 1, 0.02],
  });
  for (const x of [FLOOR_BOUNDS.x0 + 0.01, FLOOR_BOUNDS.x1 - 0.01])
    b.add(box, NARRA, { position: [x, 0.5, 0], scale: [0.02, 1, D] });
  for (const [x, z, ry] of [
    [0, FLOOR_BOUNDS.z0 + 0.02, 0],
    [FLOOR_BOUNDS.x0 + 0.02, 0, Math.PI / 2],
    [FLOOR_BOUNDS.x1 - 0.02, 0, -Math.PI / 2],
  ] as const)
    b.add(box, GILT, {
      position: [x, 1.02, z],
      rotation: [0, ry, 0],
      scale: [ry ? D : W, 0.04, 0.03],
    });
  // pictures between the exhibits, hung salon-style
  for (const [z, y, d, s] of [
    [-2, 2.2, 1, 0.9],
    [1.6, 2.4, 7, 0.7],
    [4.6, 2.1, 3, 0.8],
  ] as const) {
    poster(
      b,
      { x: FLOOR_BOUNDS.x0 + 0.03, y, z, ry: Math.PI / 2 },
      d,
      s,
      s * 1.25,
      GILT,
    );
    poster(
      b,
      { x: FLOOR_BOUNDS.x1 - 0.03, y, z: -z, ry: -Math.PI / 2 },
      d + 1,
      s,
      s * 1.25,
      GILT,
    );
  }
  for (const x of [-3.8, 3.8])
    poster(
      b,
      { x, y: 2.3, z: FLOOR_BOUNDS.z0 + 0.03 },
      x < 0 ? 5 : 4,
      0.9,
      1.1,
      GILT,
    );
  // a viewing bench mid-gallery: leather on narra legs
  b.add(box, LEATHER, { position: [0, 0.45, -0.8], scale: [2, 0.12, 0.6] });
  for (const x of [-0.85, 0.85])
    b.add(box, NARRA, { position: [x, 0.2, -0.8], scale: [0.12, 0.4, 0.5] });
  rug(b, { x: 0, z: -0.8 }, 4.4, 2.6, "#e8b080");
  plant(b, { x: -7.4, z: 5.4 }, 1.5);
  plant(b, { x: 7.4, z: 5.4 }, 1.5);
  plant(b, { x: 0, z: -5.4 }, 1.2);
  return b.build();
}

/** A woven banig: bright bands plaited in a diamond pattern. */
function banigTexture() {
  return canvasTex(256, 256, (ctx) => {
    const colors = ["#e63946", "#ffd166", "#2a9d8f", "#9b5cff", "#f4a261"];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.abs((x % 8) - 4) + Math.abs((y % 8) - 4);
        ctx.fillStyle = colors[(d + Math.floor(y / 8)) % colors.length];
        ctx.fillRect(x * 16, y * 16, 16, 16);
        ctx.fillStyle = "rgb(0 0 0 / 0.12)";
        ctx.fillRect(x * 16 + ((x + y) % 2 ? 0 : 8), y * 16, 8, 16);
      }
  });
}

/** The islands: Luzon, the Visayas and Mindanao as green shapes on blue. */
function islandsTexture() {
  return canvasTex(256, 320, (ctx) => {
    ctx.fillStyle = "#1d4e89";
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = "#7ee8a2";
    const blob = (x: number, y: number, rx: number, ry: number, r = 0) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(110, 80, 30, 62, 0.25);
    blob(90, 150, 18, 10, 0.4);
    for (let i = 0; i < 14; i++)
      blob(100 + ((i * 37) % 70), 170 + ((i * 23) % 50), 6 + (i % 4) * 2, 4, i);
    blob(150, 250, 44, 34, -0.3);
    blob(60, 200, 8, 30, 0.6);
    ctx.fillStyle = "#fff4dc";
    ctx.font = "700 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("7,000+ ISLANDS", 128, 306);
  });
}

/** Baybayin-style brush strokes: a wall of characters in the script's
 * rounded hand (drawn as strokes, not a font). */
function scriptTexture() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#f4ead5";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#3a2418";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const x = 32 + col * 60;
        const y = 34 + row * 60;
        const k = row * 4 + col;
        ctx.beginPath();
        ctx.moveTo(x - 16, y + 6);
        ctx.quadraticCurveTo(x - 4, y - 18 + (k % 3) * 6, x + 4, y + 2);
        ctx.quadraticCurveTo(x + 12, y + 18, x + 18, y - 6 + (k % 2) * 8);
        ctx.stroke();
        if (k % 3 === 0) {
          ctx.beginPath();
          ctx.arc(x, y - 22, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
  });
}

const MANNEQUIN: Look = {
  skin: "#c48d68",
  hairStyle: "sleek-bob",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffd1f0",
};

const TERNO: Look = {
  ...MANNEQUIN,
  hairStyle: "top-knot",
  outfit: "sequin-slip",
  outfitColor: "#ff2f9a",
};

/** The piece on an exhibit's plinth, built from simple shapes. */
function Piece({ kind }: { kind: ExhibitKind }) {
  const banig = useMemo(banigTexture, []);
  const islands = useMemo(islandsTexture, []);
  const script = useMemo(scriptTexture, []);
  const parol = useMemo(parolGeometry, []);
  switch (kind) {
    case "bahay-kubo":
      return (
        <group position-y={0.9} scale={0.7}>
          {[-0.5, 0.5].flatMap((x) =>
            [-0.4, 0.4].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.3, z]}>
                <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
                <meshStandardMaterial color="#8a6a3a" />
              </mesh>
            )),
          )}
          <mesh position-y={0.85}>
            <boxGeometry args={[1.2, 0.5, 1]} />
            <meshStandardMaterial color="#d9b36a" roughness={0.9} />
          </mesh>
          <mesh position-y={1.45} rotation-y={Math.PI / 4}>
            <coneGeometry args={[1.05, 0.8, 4]} />
            <meshStandardMaterial color="#8a6a3a" roughness={1} />
          </mesh>
        </group>
      );
    case "jeepney":
      return (
        <group position-y={0.9} scale={0.28} rotation-y={0.5}>
          <mesh geometry={JEEPNEY_SHELL}>
            <meshStandardMaterial
              color="#e63946"
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          <mesh geometry={JEEPNEY_TRIM}>
            <meshStandardMaterial color="#ffd166" />
          </mesh>
          <mesh geometry={JEEPNEY_CHROME}>
            <meshStandardMaterial
              color="#e8e8f0"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <mesh geometry={JEEPNEY_DARK}>
            <meshStandardMaterial color="#141018" />
          </mesh>
        </group>
      );
    case "parol":
      return (
        <mesh
          geometry={parol}
          position-y={1.9}
          rotation-y={Math.PI / 2}
          scale={1.2}
        >
          <meshBasicMaterial color={hdr("#ffd84f", 1.6)} toneMapped={false} />
        </mesh>
      );
    case "baybayin":
      return (
        <mesh position-y={1.6}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial map={script} />
        </mesh>
      );
    case "banig":
      return (
        <mesh position-y={1.6}>
          <planeGeometry args={[1.3, 1.6]} />
          <meshStandardMaterial map={banig} roughness={1} />
        </mesh>
      );
    case "islands":
      return (
        <mesh position-y={1.7}>
          <planeGeometry args={[1.2, 1.5]} />
          <meshStandardMaterial map={islands} />
        </mesh>
      );
    case "barong":
      return (
        <>
          <group position={[-0.3, 0.8, 0]}>
            <CrowdFigure look={MANNEQUIN} seed={331} />
          </group>
          <group position={[0.3, 0.8, 0]}>
            <CrowdFigure look={TERNO} seed={332} />
          </group>
        </>
      );
    case "sari-sari":
      return (
        <group position-y={0.8}>
          <mesh position-y={0.55}>
            <boxGeometry args={[1.2, 1.1, 0.6]} />
            <meshStandardMaterial color="#2a9d8f" />
          </mesh>
          <mesh position={[0, 0.7, 0.31]}>
            <planeGeometry args={[0.8, 0.45]} />
            <meshBasicMaterial color={hdr("#fff1d6", 1.1)} />
          </mesh>
          {[-0.25, 0, 0.25].map((x, i) => (
            <mesh key={x} position={[x, 0.62, 0.36]}>
              <cylinderGeometry args={[0.07, 0.07, 0.18, 10]} />
              <meshStandardMaterial
                color={["#ff4fb3", "#ffd166", "#7ee8a2"][i]}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
          <mesh position={[0, 1.2, 0.1]}>
            <boxGeometry args={[1.4, 0.06, 0.9]} />
            <meshStandardMaterial color="#8a6a3a" />
          </mesh>
        </group>
      );
  }
}

/** Frames the exhibit the guide has picked, walking her to its viewpoint. */
function Guide({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      lookAt(null);
      if (cameraHold.by === "museum") cameraHold.by = null;
    },
    [],
  );
  useFrame((_, dt) => {
    const { focus } = tour.get();
    const was = cameraHold.by === "museum";
    cameraHold.by = focus === null ? null : "museum";
    if (focus === null) return;
    const e = EXHIBITS[focus];
    const [vx, vz] = viewpoint(e);
    if (!was || player.pos.distanceTo(at.set(vx, 0, vz)) > 3)
      placePlayer(player, vx, vz);
    // over her shoulder, at the piece
    eye.set(vx + Math.sin(e.yaw) * 1.6 + 0.6, 2.2, vz + Math.cos(e.yaw) * 1.6);
    at.set(e.at[0], 1.4, e.at[1]);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(at);
  });
  return null;
}

/**
 * Museo ng Little Manila: a cream hall with warm wood, capiz-shell lamps
 * and a gold MUSEO sign; eight exhibits round the walls (a bahay kubo, a
 * jeepney, a parol, Baybayin, a banig, the islands, a barong and terno, a
 * sari-sari store), each on a plinth with a plaque you read from the guide.
 */
export function Museum({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <color attach="background" args={["#1a120c"]} />
      <fog attach="fog" args={["#2a1c12", 14, 34]} />
      <hemisphereLight args={["#fff1d6", "#4a2a18", 1.1]} />
      <pointLight
        position={[0, 4, 0]}
        color="#ffe3b0"
        intensity={8}
        distance={16}
      />
      <Floor
        width={W}
        depth={D}
        color="#8a5a3a"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        low={{ metalness: 0, roughness: 0.6 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.museum} color={GOLD} />
      {/* the walls */}
      {(
        [
          [0, FLOOR_BOUNDS.z0 - 0.1, W + 0.4, 0.2],
          [FLOOR_BOUNDS.x0 - 0.1, 0, 0.2, D],
          [FLOOR_BOUNDS.x1 + 0.1, 0, 0.2, D],
        ] as const
      ).map(([x, z, w, d]) => (
        <mesh key={`${x}${z}`} position={[x, 2.2, z]} material={PLASTER}>
          <boxGeometry args={[w, 4.4, d]} />
        </mesh>
      ))}
      <primitive object={dressing} />
      {/* capiz-shell pendant lamps */}
      {[-4, 0, 4].map((x) => (
        <mesh key={x} position={[x, 3.6, -1]}>
          <sphereGeometry args={[0.3, 12, 8]} />
          <meshBasicMaterial color={hdr("#fff1d6", 1.4)} toneMapped={false} />
        </mesh>
      ))}
      <NeonText
        text="MUSEO"
        color={GOLD}
        font={MARQUEE}
        width={3}
        k={3.2}
        position={[0, 3.4, FLOOR_BOUNDS.z0 + 0.02]}
      />
      {EXHIBITS.map((e, i) => (
        <group key={e.kind} position={[e.at[0], 0, e.at[1]]} rotation-y={e.yaw}>
          <mesh position-y={0.4} material={NARRA}>
            <boxGeometry args={[1.3, 0.8, 1.3]} />
          </mesh>
          {/* the plaque on the plinth's front, tappable */}
          <mesh
            position={[0, 0.55, 0.66]}
            rotation-x={-0.3}
            onClick={(ev) => {
              ev.stopPropagation();
              lookAt(i);
            }}
          >
            <planeGeometry args={[0.6, 0.3]} />
            <meshStandardMaterial
              color="#c9a227"
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <Piece kind={e.kind} />
        </group>
      ))}
      <TalkingNpc
        name="Ate Rosa"
        role="ticket-cashier"
        look={{
          skin: "#94603f",
          hairStyle: "low-pony",
          hairColor: "#1b1014",
          lips: "lips-nude-pink-gloss",
          brows: "brows-feathered-honey",
          outfit: "blouse",
          outfitColor: "#e8e2ff",
          shadow: "#ffd1f0",
        }}
        mood="idle"
        at={[2.4, 0, 4.4]}
        rot={-Math.PI / 2}
        seed={333}
        greet
        context={{ venue: "museum", neighborhood: "little-manila" }}
      />
      <Guide player={player} />
    </>
  );
}

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import {
  BOOTH_SEAT_X,
  BOOTH_WALL_X,
  BOOTH_ZS,
  MIC,
  STAGE,
} from "../../game/karaoke.ts";
import { ROOMS } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { KaraokeNpcs } from "./karaoke/Npcs.tsx";
import { type Beam, Beams } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";

const WALL_X = 5.8;
const BACK_Z = -6;
const HEIGHT = 4.4;
const VIOLET = "#b06bff";
const PINK = "#ff6ac8";
const SCREEN = { w: 4.4, h: 2.3, y: 2.6 } as const;

const BEAMS: readonly Beam[] = [
  { position: [-2.4, 4.2, -1.5], color: PINK, phase: 0, length: 1.1 },
  { position: [2.4, 4.2, -1.5], color: VIOLET, phase: 2, length: 1.1 },
];

// the lyric screen: a dusk gradient, a stave of notes for the ball to
// bounce along and a title band. No words: you sing your own.
const SCREEN_TEX = canvasTex(512, 256, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#2a0a4a");
  g.addColorStop(1, "#ff4f8a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let y = 120; y <= 200; y += 20) ctx.fillRect(40, y, 432, 2);
  ctx.fillStyle = "#fff1fb";
  ctx.font = "700 64px serif";
  ctx.textAlign = "center";
  const notes = ["♪", "♫", "♪", "♩", "♫", "♪"];
  notes.forEach((n, i) => ctx.fillText(n, 80 + i * 70, 150 + ((i * 37) % 50)));
  ctx.font = "700 34px sans-serif";
  ctx.fillText("♥  KARAOKE LOFT  ♥", 256, 60);
});

/** The ball hops note to note across the screen, and the progress bar
 * fills under it. */
function Screen() {
  const calm = useReducedMotion();
  const ball = useRef<THREE.Mesh>(null);
  const bar = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    const beat = (t * 1.6) % 6;
    const hop = beat % 1;
    if (ball.current) {
      ball.current.position.x =
        -SCREEN.w * 0.34 + Math.floor(beat) * SCREEN.w * 0.137 + hop * 0.6;
      ball.current.position.y = 0.15 + Math.sin(hop * Math.PI) * 0.35;
    }
    if (bar.current) bar.current.scale.x = Math.max(0.001, (t * 0.05) % 1);
  });
  return (
    <group position={[0, SCREEN.y, BACK_Z + 0.08]}>
      <mesh position-z={-0.03}>
        <boxGeometry args={[SCREEN.w + 0.2, SCREEN.h + 0.2, 0.05]} />
        <meshStandardMaterial color="#0a0610" roughness={0.4} />
      </mesh>
      <mesh>
        <planeGeometry args={[SCREEN.w, SCREEN.h]} />
        <meshBasicMaterial map={SCREEN_TEX} toneMapped={false} />
      </mesh>
      <mesh ref={ball} position-z={0.05}>
        <sphereGeometry args={[0.08, 16, 10]} />
        <meshBasicMaterial color={hdr("#ffe28a", 2.4)} toneMapped={false} />
      </mesh>
      {/* the progress bar grows from its left end, the group's pivot */}
      <group
        ref={bar}
        position={[-SCREEN.w * 0.4, -SCREEN.h * 0.4, 0.03]}
        scale-x={0.001}
      >
        <mesh position-x={SCREEN.w * 0.4}>
          <boxGeometry args={[SCREEN.w * 0.8, 0.05, 0.01]} />
          <meshBasicMaterial color={hdr(PINK, 2)} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Stage() {
  const w = STAGE.x1 - STAGE.x0;
  const d = STAGE.z1 - STAGE.z0;
  const cz = (STAGE.z0 + STAGE.z1) / 2;
  const lights = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  return (
    <>
      <mesh position={[0, STAGE.height / 2, cz]}>
        <boxGeometry args={[w, STAGE.height, d]} />
        <meshStandardMaterial
          color="#120a18"
          metalness={0.3}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, STAGE.height, STAGE.z1]}>
        <boxGeometry args={[w, 0.025, 0.04]} />
        <meshBasicMaterial color={hdr(PINK, 3)} toneMapped={false} />
      </mesh>
      {/* footlights along the stage's front edge */}
      {lights.map((x) => (
        <mesh
          key={x}
          position={[x, STAGE.height + 0.01, STAGE.z1 - 0.12]}
          rotation-x={-Math.PI / 2}
        >
          <circleGeometry args={[0.07, 12]} />
          <meshBasicMaterial color={hdr("#ffe2b0", 2.2)} toneMapped={false} />
        </mesh>
      ))}
      {/* the mic stand, just behind where the singer stands */}
      <group position={[MIC[0], STAGE.height, MIC[1] - 0.35]}>
        <mesh position-y={0.75}>
          <cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
          <meshStandardMaterial
            color="#c9c9d4"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.5, 0.08]} rotation-x={0.6}>
          <capsuleGeometry args={[0.025, 0.1, 4, 8]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.16, 16]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </>
  );
}

function Walls() {
  const velvet = <meshStandardMaterial color="#3a1650" roughness={0.9} />;
  return (
    <>
      <mesh position={[0, HEIGHT / 2, BACK_Z]}>
        <planeGeometry args={[WALL_X * 2, HEIGHT]} />
        {velvet}
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * WALL_X, HEIGHT / 2, -0.1]}
            rotation-y={-side * (Math.PI / 2)}
          >
            <planeGeometry args={[11.8, HEIGHT]} />
            {velvet}
          </mesh>
          {/* the drinks ledge over the booths, glasses lit from below */}
          <mesh position={[side * (WALL_X - 0.1), 1.15, 0.6]}>
            <boxGeometry args={[0.2, 0.04, 6]} />
            <meshStandardMaterial
              color="#c9a26a"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          {BOOTH_ZS.flatMap((z) => [z - 0.5, z + 0.3]).map((z) => (
            <mesh key={z} position={[side * (WALL_X - 0.1), 1.24, z]}>
              <cylinderGeometry args={[0.035, 0.03, 0.14, 8]} />
              <meshBasicMaterial
                color={hdr(side < 0 ? PINK : "#ffb070", 1.3)}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
      <NeonText
        text="Karaoke"
        color={VIOLET}
        font={SCRIPT}
        width={3.2}
        k={3.6}
        flicker
        position={[-WALL_X + 0.06, 2.9, -2.4]}
        rotation-y={Math.PI / 2}
      />
    </>
  );
}

function Booths() {
  return (
    <Suspense fallback={null}>
      {BOOTH_ZS.flatMap((z) =>
        [-1, 1].map((side) => (
          <Prop
            key={`${side}${z}`}
            model="banquette"
            width={1.9}
            depth={0.7}
            height={0.95}
            yaw={side < 0 ? Math.PI / 2 : -Math.PI / 2}
            position={[side * ((BOOTH_WALL_X + BOOTH_SEAT_X) / 2 + 0.05), 0, z]}
          />
        )),
      )}
    </Suspense>
  );
}

function Lights() {
  const calm = useReducedMotion();
  const spot = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (spot.current)
      spot.current.intensity =
        4 + (calm ? 0 : Math.sin(clock.elapsedTime * 1.7) * 0.8);
  });
  return (
    <>
      <hemisphereLight args={["#8a5cff", "#ff8fb0", 0.45]} />
      <pointLight
        ref={spot}
        position={[MIC[0], 3.2, MIC[1] + 1]}
        color={PINK}
        intensity={4}
        distance={7}
      />
      <pointLight
        position={[0, 2.6, 2.2]}
        color="#ffb070"
        intensity={2.2}
        distance={7}
      />
    </>
  );
}

/**
 * The Karaoke Loft, up the stair off Bassline Alley: violet velvet walls,
 * a herringbone floor, a stage with footlights and a mic stand under a pink
 * spot, a big screen where a ball hops along the notes, and banquettes
 * with a drinks ledge down both walls.
 */
export function Karaoke({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#0c0418"]} />
      <fog attach="fog" args={["#1c0a2a", 10, 26]} />
      <Lights />
      <Beams beams={BEAMS} aim={MIC} />
      <Floor
        width={WALL_X * 2}
        depth={11.8}
        center={[0, -0.1]}
        color="#7a5a6a"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        mirror={0.25}
        low={{ metalness: 0, roughness: 0.75 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.karaoke} color={VIOLET} />
      <Walls />
      <Stage />
      <Screen />
      <Booths />
      <KaraokeNpcs onDrink={orderCocktail} />
    </>
  );
}

const orderCocktail = () => drink("cocktail");
